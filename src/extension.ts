import * as vscode from 'vscode';
import { CommandHandler } from './commands';
import { isRenpyFile, updateExtensionSettings } from './config';
import { PreviewDocumentContentProvider, PreviewManager } from './preview';

/**
 * Extension activation function
 */
export function activate(context: vscode.ExtensionContext) {
    const documentProvider = new PreviewDocumentContentProvider();
    const previewManager = new PreviewManager(documentProvider);

    context.subscriptions.push(
        vscode.workspace.registerTextDocumentContentProvider('renpy-preview', documentProvider),
        documentProvider
    );

    context.subscriptions.push(
        vscode.commands.registerCommand('renpy-translation-helper.selectString', async () => {
            const editor = vscode.window.activeTextEditor;
            if (!editor) {
                vscode.window.showInformationMessage('No editor is active');
                return;
            }
            await CommandHandler.selectString(editor);
        }),

        vscode.commands.registerCommand('renpy-translation-helper.wrapWithTranslation', async () => {
            const editor = vscode.window.activeTextEditor;
            if (!editor) {
                vscode.window.showInformationMessage('No editor is active');
                return;
            }
            await CommandHandler.wrapWithTranslation(editor);
        }),

        vscode.commands.registerCommand('renpy-translation-helper.batchWrapStrings', async () => {
            const editor = vscode.window.activeTextEditor;
            if (!editor) {
                vscode.window.showInformationMessage('No editor is active');
                return;
            }
            await CommandHandler.batchWrapStrings(editor);
        }),

        vscode.commands.registerCommand('renpy-translation-helper.previewChanges', async () => {
            const editor = vscode.window.activeTextEditor;
            if (!editor) {
                vscode.window.showInformationMessage('No editor is active');
                return;
            }

            if (editor.selections.every(s => s.isEmpty)) {
                vscode.window.showInformationMessage('Please select text first');
                return;
            }

            const success = await previewManager.showPreview(editor.document, editor.selections);
            if (!success) {
                vscode.window.showInformationMessage('No changes to preview - no unwrapped strings found');
            }
        }),

        vscode.commands.registerCommand(
            'renpy-translation-helper.openKeybindings',
            openKeybindingsSettings
        ),

        vscode.commands.registerCommand('renpy-translation-helper.acceptPreviewChanges', async () => {
            await previewManager.acceptChanges();
        }),

        vscode.commands.registerCommand('renpy-translation-helper.rejectPreviewChanges', async () => {
            await previewManager.rejectChanges();
        }),

        previewManager
    );

    const statusBarItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Right, 100);
    statusBarItem.text = "$(keyboard) RenPy Keys";
    statusBarItem.tooltip = "Configure RenPy Translation Helper keybindings";
    statusBarItem.command = 'renpy-translation-helper.openKeybindings';

    // Menus and keybindings use the `renpy-translation-helper.isRenpyFile` context
    // key, so the languageIds / fileExtensions settings decide where they appear.
    const updateRenpyContext = (editor: vscode.TextEditor | undefined): void => {
        const isRenpy = !!editor && isRenpyFile(editor.document);
        void vscode.commands.executeCommand('setContext', 'renpy-translation-helper.isRenpyFile', isRenpy);
        if (isRenpy) {
            statusBarItem.show();
        } else {
            statusBarItem.hide();
        }
    };

    context.subscriptions.push(
        statusBarItem,
        vscode.window.onDidChangeActiveTextEditor(updateRenpyContext),
        vscode.workspace.onDidOpenTextDocument(document => {
            // Fires when a document's language mode changes, too.
            if (document === vscode.window.activeTextEditor?.document) {
                updateRenpyContext(vscode.window.activeTextEditor);
            }
        }),
        vscode.workspace.onDidChangeConfiguration(e => {
            if (e.affectsConfiguration('renpyTranslationHelper')) {
                updateExtensionSettings();
                updateRenpyContext(vscode.window.activeTextEditor);
            }
        })
    );

    updateRenpyContext(vscode.window.activeTextEditor);
    updateExtensionSettings();
}

/**
 * Open VS Code keyboard shortcuts settings filtered to this extension
 */
async function openKeybindingsSettings(): Promise<void> {
    try {
        await vscode.commands.executeCommand(
            'workbench.action.openGlobalKeybindings',
            'renpy-translation-helper'
        );
    } catch (error) {
        vscode.window.showErrorMessage(`Failed to open keybindings: ${error instanceof Error ? error.message : String(error)}`);
    }
}

/**
 * Extension deactivation function
 */
export function deactivate(): void {
    // PreviewManager and the document provider are disposed through
    // context.subscriptions; disposing them here too would run cleanup twice.
}
