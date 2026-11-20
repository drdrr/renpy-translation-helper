import * as vscode from 'vscode';
import { getBatchFilters, getTranslationFunction } from './config';
import { StringDetector } from './detector';
import { addSkips, dedupeOverlappingSelections, emptySkipTotals, lineContext, showSkipSummary } from './editor-helpers';
import { StringProcessor } from './processor';
import { buildCallOpeningAtEndPattern, stringPrefixLength } from './tokenizer';

/**
 * Handles command execution
 */
export class CommandHandler {
    public static async selectString(editor: vscode.TextEditor): Promise<boolean> {
        try {
            const originalSelections = editor.selections;
            const newSelections: vscode.Selection[] = [];
            const translationFn = getTranslationFunction();
            let anyStringFound = false;

            for (const selection of originalSelections) {
                const position = selection.active;

                // Inside an already-translated call: select just the quoted literal.
                const innerRange = StringDetector.findTranslatedStringInnerRangeAtPosition(
                    editor.document, position, translationFn
                );
                if (innerRange) {
                    newSelections.push(new vscode.Selection(innerRange.start, innerRange.end));
                    anyStringFound = true;
                    continue;
                }

                const stringRange = StringDetector.findStringAtPosition(editor.document, position, translationFn);
                if (stringRange) {
                    newSelections.push(new vscode.Selection(stringRange.start, stringRange.end));
                    anyStringFound = true;
                } else {
                    newSelections.push(selection);
                }
            }

            if (anyStringFound) {
                // Drop overlapping/duplicate selections so multiple cursors inside the
                // same string collapse to a single selection in the editor.
                editor.selections = dedupeOverlappingSelections(newSelections);
                return true;
            } else {
                vscode.window.showInformationMessage('No strings found at cursor positions');
                return false;
            }
        } catch (error) {
            vscode.window.showErrorMessage(`Failed to select string: ${error instanceof Error ? error.message : String(error)}`);
            return false;
        }
    }

    public static async wrapWithTranslation(editor: vscode.TextEditor): Promise<void> {
        try {
            if (editor.selections.some(sel => sel.isEmpty)) {
                const success = await CommandHandler.selectString(editor);
                if (!success) {
                    return;
                }
            }

            const translationFn = getTranslationFunction();
            const alreadyWrappedPattern = buildCallOpeningAtEndPattern(translationFn);

            let anyChangesApplied = false;
            let anyAlreadyWrapped = false;
            let anyPrefixed = false;

            // Multiple cursors inside the same string all expand to the same range
            // after selectString. Drop any selection that overlaps a previously
            // accepted one to avoid "Overlapping ranges are not allowed!".
            const uniqueSelections = dedupeOverlappingSelections(editor.selections);

            await editor.edit(editBuilder => {
                for (const selection of uniqueSelections) {
                    const selectedText = editor.document.getText(selection);

                    const stringQuoteRegex = /^(['"]).*\1$/s;
                    if (!stringQuoteRegex.test(selectedText)) {
                        continue;
                    }

                    const lineText = editor.document.lineAt(selection.start.line).text;
                    const prefixText = lineText.substring(0, selection.start.character);

                    if (alreadyWrappedPattern.test(prefixText.trimEnd())) {
                        anyAlreadyWrapped = true;
                        continue;
                    }

                    // Wrapping the literal of r"..."/f"..." would yield f_("..."), which is invalid.
                    if (stringPrefixLength(lineText, selection.start.character) > 0) {
                        anyPrefixed = true;
                        continue;
                    }

                    editBuilder.replace(selection, `${translationFn}(${selectedText})`);
                    anyChangesApplied = true;
                }
            });

            if (anyAlreadyWrapped) {
                vscode.window.showInformationMessage(`One or more strings are already wrapped with ${translationFn}()`);
            } else if (anyPrefixed && !anyChangesApplied) {
                vscode.window.showInformationMessage('Prefixed strings (r"...", f"...", b"...") cannot be wrapped');
            } else if (!anyChangesApplied) {
                vscode.window.showInformationMessage('No valid strings found to wrap');
            }
        } catch (error) {
            vscode.window.showErrorMessage(`Failed to wrap selection: ${error instanceof Error ? error.message : String(error)}`);
        }
    }

    public static async batchWrapStrings(editor: vscode.TextEditor): Promise<void> {
        try {
            if (editor.selections.every(s => s.isEmpty)) {
                vscode.window.showInformationMessage('Please select text first');
                return;
            }

            const translationFn = getTranslationFunction();
            const filters = getBatchFilters();
            const skips = emptySkipTotals();
            let anyChanges = false;

            // Drop overlapping selections to avoid "Overlapping ranges are not allowed!"
            const uniqueSelections = dedupeOverlappingSelections(editor.selections);

            await editor.edit(editBuilder => {
                for (const selection of uniqueSelections) {
                    if (selection.isEmpty) {
                        continue;
                    }

                    const selectedText = editor.document.getText(selection);
                    const processed = StringProcessor.process(selectedText, translationFn, {
                        ...lineContext(editor.document, selection),
                        filters,
                    });
                    addSkips(skips, processed);

                    if (selectedText !== processed.text) {
                        editBuilder.replace(selection, processed.text);
                        anyChanges = true;
                    }
                }
            });

            if (!anyChanges) {
                vscode.window.showInformationMessage('No unwrapped strings found in selection');
            } else {
                vscode.window.showInformationMessage(`Successfully wrapped strings with ${translationFn}()`);
            }
            showSkipSummary(skips);
        } catch (error) {
            vscode.window.showErrorMessage(`Failed to wrap strings: ${error instanceof Error ? error.message : String(error)}`);
        }
    }
}
