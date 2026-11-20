import * as vscode from 'vscode';
import { scanStrings, StringToken } from './tokenizer';

/**
 * Handles string detection and selection
 */
export class StringDetector {
    private static translatedTokenAt(
        document: vscode.TextDocument,
        position: vscode.Position,
        translationFn: string
    ): StringToken | undefined {
        const line = document.lineAt(position.line).text;
        return scanStrings(line, translationFn).find(tok =>
            tok.kind === 'translated' && position.character >= tok.start && position.character <= tok.end
        );
    }

    /** Range of the whole translation call (e.g. `_("hi")`) under the cursor. */
    public static findTranslatedStringAtPosition(
        document: vscode.TextDocument,
        position: vscode.Position,
        translationFn = '_'
    ): vscode.Range | null {
        try {
            const tok = this.translatedTokenAt(document, position, translationFn);
            return tok
                ? new vscode.Range(position.line, tok.start, position.line, tok.end)
                : null;
        } catch {
            return null;
        }
    }

    /** Range of the quoted literal (quotes included) inside the translation call under the cursor. */
    public static findTranslatedStringInnerRangeAtPosition(
        document: vscode.TextDocument,
        position: vscode.Position,
        translationFn = '_'
    ): vscode.Range | null {
        try {
            const tok = this.translatedTokenAt(document, position, translationFn);
            return tok
                ? new vscode.Range(position.line, tok.quoteStart, position.line, tok.quoteEnd)
                : null;
        } catch {
            return null;
        }
    }

    /**
     * Innermost bare or translated string literal under the cursor. Prefixed
     * literals (`f"..."`) are ignored because wrapping them would corrupt code.
     */
    public static findStringAtPosition(
        document: vscode.TextDocument,
        position: vscode.Position,
        translationFn = '_'
    ): vscode.Range | null {
        try {
            const lineText = document.lineAt(position.line).text;
            const charIndex = position.character;

            // Inclusive [start, end] ranges, matching the cursor-on-closing-char behaviour.
            const stringRanges: { start: number; end: number; isTranslated: boolean }[] = [];
            for (const tok of scanStrings(lineText, translationFn)) {
                if (tok.kind === 'translated') {
                    stringRanges.push({ start: tok.start, end: tok.end - 1, isTranslated: true });
                    stringRanges.push({ start: tok.quoteStart, end: tok.quoteEnd - 1, isTranslated: true });
                } else if (tok.kind === 'bare') {
                    stringRanges.push({ start: tok.start, end: tok.end - 1, isTranslated: false });
                }
            }

            stringRanges.sort((a, b) => {
                const lengthDiff = (a.end - a.start) - (b.end - b.start);
                if (lengthDiff !== 0) {
                    return lengthDiff;
                }
                return a.isTranslated ? 1 : -1;
            });

            const hit = stringRanges.find(r => charIndex >= r.start && charIndex <= r.end);
            return hit
                ? new vscode.Range(position.line, hit.start, position.line, hit.end + 1)
                : null;
        } catch {
            return null;
        }
    }
}
