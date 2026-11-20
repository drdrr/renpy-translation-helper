import * as vscode from 'vscode';
import { getBatchFilters, getTranslationFunction } from './config';
import { addSkips, dedupeOverlappingSelections, emptySkipTotals, lineContext, showSkipSummary } from './editor-helpers';
import { StringProcessor } from './processor';
import { previewPathFor } from './util';

/**
 * Virtual document provider for showing diffs
 */
export class PreviewDocumentContentProvider implements vscode.TextDocumentContentProvider {
    private readonly _onDidChange = new vscode.EventEmitter<vscode.Uri>();
    private readonly _content: Map<string, string> = new Map();

    public readonly onDidChange = this._onDidChange.event;

    public provideTextDocumentContent(uri: vscode.Uri): string {
        const key = uri.toString();
        return this._content.get(key) || '';
    }

    public updateContent(uri: vscode.Uri, content: string): void {
        const key = uri.toString();
        this._content.set(key, content);
        this._onDidChange.fire(uri);
    }

    public clearContent(uri: vscode.Uri): void {
        const key = uri.toString();
        this._content.delete(key);
    }

    public dispose(): void {
        this._onDidChange.dispose();
        this._content.clear();
    }
}

/**
 * Manages status bar items for preview actions
 */
class StatusBarManager {
    private acceptButton?: vscode.StatusBarItem;
    private rejectButton?: vscode.StatusBarItem;

    public show(): void {
        if (!this.acceptButton) {
            // Priority 101 avoids z-order conflict with the keybindings status bar item (priority 100)
            this.acceptButton = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Right, 101);
            this.acceptButton.text = "$(check) Accept Changes";
            this.acceptButton.command = 'renpy-translation-helper.acceptPreviewChanges';
            this.acceptButton.tooltip = "Apply the translation changes to the document";
        }

        if (!this.rejectButton) {
            this.rejectButton = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Right, 99);
            this.rejectButton.text = "$(x) Reject Changes";
            this.rejectButton.command = 'renpy-translation-helper.rejectPreviewChanges';
            this.rejectButton.tooltip = "Discard the translation changes";
        }

        this.acceptButton.show();
        this.rejectButton.show();
    }

    public hide(): void {
        if (this.acceptButton) {
            this.acceptButton.hide();
        }
        if (this.rejectButton) {
            this.rejectButton.hide();
        }
    }

    public dispose(): void {
        if (this.acceptButton) {
            this.acceptButton.dispose();
            this.acceptButton = undefined;
        }
        if (this.rejectButton) {
            this.rejectButton.dispose();
            this.rejectButton = undefined;
        }
    }
}

/** The edits a preview proposes, pinned to the document version they were computed from. */
interface PendingPreview {
    uri: vscode.Uri;
    version: number;
    edits: { range: vscode.Range; newText: string }[];
}

/**
 * Manages preview state and operations
 */
export class PreviewManager {
    private originalUri?: vscode.Uri;
    private previewUri?: vscode.Uri;
    private readonly documentProvider: PreviewDocumentContentProvider;
    private readonly statusBarManager: StatusBarManager;
    private readonly tabListener: vscode.Disposable;
    private pending?: PendingPreview;

    constructor(documentProvider: PreviewDocumentContentProvider) {
        this.documentProvider = documentProvider;
        this.statusBarManager = new StatusBarManager();

        // If the user closes the diff tab by hand, end the preview so the
        // Accept/Reject buttons and keybindings don't linger.
        this.tabListener = vscode.window.tabGroups.onDidChangeTabs(e => {
            if (this.previewUri && e.closed.some(tab => this.isPreviewTab(tab))) {
                this.resetState();
            }
        });
    }

    public async showPreview(document: vscode.TextDocument, selections: readonly vscode.Selection[]): Promise<boolean> {
        // Clean up any existing preview before starting a new one. Don't navigate
        // back to its original document: the new diff is about to open.
        if (this.previewUri) {
            await this.cleanup({ returnToOriginal: false });
        }

        try {
            const translationFn = getTranslationFunction();
            const filters = getBatchFilters();
            const skips = emptySkipTotals();
            const edits: PendingPreview['edits'] = [];
            let modifiedText = document.getText();

            // Process selections in descending offset order so back-to-front replacements
            // don't shift the positions of earlier (not-yet-processed) selections.
            const sortedSelections = dedupeOverlappingSelections(selections)
                .filter(s => !s.isEmpty)
                .sort((a, b) => document.offsetAt(b.start) - document.offsetAt(a.start));

            for (const selection of sortedSelections) {
                const selectedText = document.getText(selection);
                const processed = StringProcessor.process(selectedText, translationFn, {
                    ...lineContext(document, selection),
                    filters,
                });
                addSkips(skips, processed);

                if (selectedText !== processed.text) {
                    const startOffset = document.offsetAt(selection.start);
                    const endOffset = document.offsetAt(selection.end);
                    modifiedText =
                        modifiedText.substring(0, startOffset) +
                        processed.text +
                        modifiedText.substring(endOffset);
                    edits.push({ range: new vscode.Range(selection.start, selection.end), newText: processed.text });
                }
            }

            showSkipSummary(skips);

            if (edits.length === 0) {
                return false;
            }

            const previewUri = vscode.Uri.from({
                scheme: 'renpy-preview',
                path: previewPathFor(document.fileName),
                query: String(Date.now()),
            });

            this.originalUri = document.uri;
            this.previewUri = previewUri;
            this.pending = { uri: document.uri, version: document.version, edits };
            this.documentProvider.updateContent(previewUri, modifiedText);

            try {
                await vscode.commands.executeCommand('vscode.diff',
                    document.uri,
                    previewUri,
                    'RenPy Translation - Preview Changes',
                    { preview: true }
                );

                await vscode.commands.executeCommand('setContext', 'renpy-translation-helper.showingPreview', true);

                this.statusBarManager.show();
                return true;
            } catch (error) {
                await this.cleanup({ returnToOriginal: false });
                throw error;
            }
        } catch (error) {
            vscode.window.showErrorMessage(`Error creating preview: ${error instanceof Error ? error.message : String(error)}`);
            return false;
        }
    }

    /**
     * Applies exactly the edits shown in the preview. Refuses if the document
     * changed since, because the stored ranges would no longer line up.
     */
    public async acceptChanges(): Promise<void> {
        const pending = this.pending;
        if (!pending) {
            vscode.window.showWarningMessage('No changes to apply');
            return;
        }

        // The original document is shown below, so no need to navigate back here.
        await this.cleanup({ returnToOriginal: false });

        try {
            const document = await vscode.workspace.openTextDocument(pending.uri);
            await vscode.window.showTextDocument(document);

            if (document.version !== pending.version) {
                vscode.window.showWarningMessage(
                    'The document changed after the preview was created, so nothing was applied. Select the text and preview again.'
                );
                return;
            }

            const workspaceEdit = new vscode.WorkspaceEdit();
            for (const edit of pending.edits) {
                workspaceEdit.replace(pending.uri, edit.range, edit.newText);
            }

            if (await vscode.workspace.applyEdit(workspaceEdit)) {
                vscode.window.showInformationMessage('Translation changes applied');
            } else {
                vscode.window.showErrorMessage('Failed to apply changes: VS Code rejected the edit');
            }
        } catch (error) {
            vscode.window.showErrorMessage(`Failed to apply changes: ${error instanceof Error ? error.message : String(error)}`);
        }
    }

    public async rejectChanges(): Promise<void> {
        if (!this.pending) {
            return;
        }
        vscode.window.showInformationMessage('Translation changes discarded');
        await this.cleanup({ returnToOriginal: true });
    }

    private isPreviewTab(tab: vscode.Tab): boolean {
        return !!this.previewUri &&
            tab.input instanceof vscode.TabInputTextDiff &&
            tab.input.modified.toString() === this.previewUri.toString();
    }

    /**
     * Ends the current preview: resets state and UI, then closes the preview's
     * own diff tab (never whatever editor happens to be active).
     */
    public async cleanup(options: { returnToOriginal: boolean }): Promise<void> {
        const previewTabs = vscode.window.tabGroups.all
            .flatMap(group => group.tabs)
            .filter(tab => this.isPreviewTab(tab));
        const originalUri = this.originalUri;
        const hadPreview = !!this.previewUri;

        this.resetState();

        if (!hadPreview) {
            return;
        }

        try {
            if (previewTabs.length > 0) {
                await vscode.window.tabGroups.close(previewTabs);
            }

            if (options.returnToOriginal && originalUri) {
                await vscode.window.showTextDocument(originalUri);
            }
        } catch (err) {
            vscode.window.showWarningMessage(
                `Could not close the translation preview: ${err instanceof Error ? err.message : String(err)}`
            );
        }
    }

    /** Clears preview state, the context key and the status bar buttons. Opens or closes no editors. */
    private resetState(): void {
        void vscode.commands.executeCommand('setContext', 'renpy-translation-helper.showingPreview', false);
        this.statusBarManager.hide();

        if (this.previewUri) {
            this.documentProvider.clearContent(this.previewUri);
        }

        this.previewUri = undefined;
        this.originalUri = undefined;
        this.pending = undefined;
    }

    /** Called on extension deactivation: release resources without touching the editor layout. */
    public dispose(): void {
        this.tabListener.dispose();
        this.resetState();
        this.statusBarManager.dispose();
    }
}
