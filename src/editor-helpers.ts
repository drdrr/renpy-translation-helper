import * as vscode from 'vscode';
import { SkipReason } from './filters';
import { ProcessResult } from './processor';

export function showSkippedUnterminatedWarning(count: number): void {
    if (count > 0) {
        vscode.window.showWarningMessage(
            `${count} string(s) left unwrapped because the selection starts or ends inside them. Extend the selection to include both quotes.`
        );
    }
}

/** Running totals of what a batch run left unwrapped, across all selections. */
export interface SkipTotals {
    unterminated: number;
    filtered: Record<SkipReason, number>;
}

export function emptySkipTotals(): SkipTotals {
    return { unterminated: 0, filtered: { dialogue: 0, asset: 0, pattern: 0 } };
}

export function addSkips(totals: SkipTotals, result: ProcessResult): void {
    totals.unterminated += result.skippedUnterminated;
    for (const reason of Object.keys(totals.filtered) as SkipReason[]) {
        totals.filtered[reason] += result.skipped[reason];
    }
}

/** Reports strings left unwrapped: a warning for cut-off strings, a note for filtered ones. */
export function showSkipSummary(totals: SkipTotals): void {
    showSkippedUnterminatedWarning(totals.unterminated);

    const labels: Record<SkipReason, string> = {
        dialogue: 'dialogue/menu',
        asset: 'asset path',
        pattern: 'skipPatterns match',
    };
    const parts = (Object.keys(labels) as SkipReason[])
        .filter(reason => totals.filtered[reason] > 0)
        .map(reason => `${totals.filtered[reason]} ${labels[reason]}`);
    if (parts.length > 0) {
        vscode.window.showInformationMessage(
            `Left unwrapped by batch filters: ${parts.join(', ')}. Use Wrap (Ctrl+Alt+R T) on a single string to wrap it anyway, or change the renpyTranslationHelper.batch settings.`
        );
    }
}

/** Read-only context around `selection` on its first and last lines, for StringProcessor.process. */
export function lineContext(document: vscode.TextDocument, selection: vscode.Range): { linePrefix: string; lineSuffix: string } {
    return {
        linePrefix: document.lineAt(selection.start.line).text.slice(0, selection.start.character),
        lineSuffix: document.lineAt(selection.end.line).text.slice(selection.end.character),
    };
}

/**
 * Returns a copy of `selections` with overlapping or duplicate ranges removed.
 * Empty selections (point cursors) at the same position are also collapsed.
 * Order: stable by start position.
 */
export function dedupeOverlappingSelections(
    selections: readonly vscode.Selection[]
): vscode.Selection[] {
    const sorted = [...selections].sort((a, b) => a.start.compareTo(b.start));
    const result: vscode.Selection[] = [];
    for (const sel of sorted) {
        const last = result[result.length - 1];
        // Accept if no prior selection, or if this one starts at/after the previous one ends.
        if (!last || sel.start.compareTo(last.end) >= 0) {
            result.push(sel);
        }
        // Otherwise skip: overlaps a previously accepted selection.
    }
    return result;
}
