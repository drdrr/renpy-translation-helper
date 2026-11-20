// Pure filters deciding which bare strings Batch Wrap / Preview must leave alone.
// No vscode dependency, so they can be unit-tested in plain Node.
import { StringToken } from './tokenizer';

export interface BatchFilters {
    /** Skip say-statement dialogue (`e "Hi"`, `"Narration"`) and menu choices. */
    skipDialogue: boolean;
    /** Skip strings that end in a known asset file extension (`"bg room.png"`). */
    skipAssetPaths: boolean;
    /** Skip strings whose contents match any of these. */
    skipPatterns: RegExp[];
}

/** No filtering: every bare string is a candidate. */
export const NO_FILTERS: BatchFilters = { skipDialogue: false, skipAssetPaths: false, skipPatterns: [] };

export type SkipReason = 'dialogue' | 'asset' | 'pattern';

/**
 * Words that start a Python or Ren'Py statement. A line starting with one of
 * these is not a say statement, e.g. `text "Hello"` or `play music "a.ogg"`.
 * `old`/`new` (translate blocks) are deliberately absent: those strings must
 * never be wrapped, and treating them like dialogue keeps them untouched.
 */
const STATEMENT_KEYWORDS = new Set([
    // Python
    'and', 'as', 'assert', 'async', 'await', 'break', 'class', 'continue', 'def', 'del',
    'elif', 'else', 'except', 'finally', 'for', 'from', 'global', 'if', 'import', 'in',
    'is', 'lambda', 'nonlocal', 'not', 'or', 'pass', 'raise', 'return', 'try', 'while',
    'with', 'yield', 'print',
    // Ren'Py script and screen language
    'call', 'camera', 'default', 'define', 'hide', 'image', 'init', 'jump', 'label',
    'layeredimage', 'menu', 'nvl', 'pause', 'play', 'python', 'queue', 'scene', 'screen',
    'show', 'stop', 'style', 'testcase', 'text', 'textbutton', 'transform', 'translate',
    'use', 'voice', 'window', 'add', 'key', 'tooltip', 'input', 'timer', 'action',
]);

const STRING_LITERAL = String.raw`(?:"(?:\\.|[^"\\\n])*"|'(?:\\.|[^'\\\n])*')`;
const IDENTIFIER = String.raw`[A-Za-z_]\w*`;

/**
 * What may precede a say-statement string on its line: indentation, then an
 * optional speaker with optional image attributes (`e happy`, `e @ sad`, `e -hat`),
 * then an optional quoted speaker name (`"Eileen" "Hello"`).
 */
const SAY_PREFIX = new RegExp(
    String.raw`^\s*(?:(${IDENTIFIER})(?:\s+(?:@|-?${IDENTIFIER}))*\s+)?(?:${STRING_LITERAL}\s*)?$`
);

/**
 * What follows a string that is an expression rather than dialogue:
 * a separator/operator (`"a",`, `"a")`, `"a" + b`, `"a" % x`, `"a".format`)
 * or a dict value after a colon (`"key": value`). A colon at the end of the
 * line (`"Go left":`) is a menu choice and still counts as dialogue.
 */
const EXPRESSION_SUFFIX = /^\s*(?:[,)\]}+%*.=]|:\s*[^\s#])/;

const ASSET_EXTENSION = /\.(?:png|jpe?g|webp|gif|bmp|svg|avif|ogg|opus|mp3|wav|flac|m4a|webm|mp4|mkv|avi|ogv|mpe?g|ttf|otf|ttc|woff2?|rpym?|rpyc|py|json|txt|csv)$/i;

/** True when `token` (a string inside `text`) is say-statement dialogue or a menu choice. */
export function isDialogueString(text: string, token: StringToken): boolean {
    const lineStart = text.lastIndexOf('\n', token.start - 1) + 1;
    const match = SAY_PREFIX.exec(text.slice(lineStart, token.start));
    if (!match || (match[1] && STATEMENT_KEYWORDS.has(match[1]))) {
        return false;
    }

    const lineEnd = text.indexOf('\n', token.end);
    const after = text.slice(token.end, lineEnd < 0 ? text.length : lineEnd);
    return !EXPRESSION_SUFFIX.test(after);
}

/** The literal's contents without its quotes (handles triple quotes). */
export function stringContents(text: string, token: StringToken): string {
    const quote = text[token.quoteStart];
    const length = token.quoteEnd - token.quoteStart;
    const delimiter = length >= 6 && text.startsWith(quote.repeat(3), token.quoteStart) ? 3 : 1;
    return text.slice(token.quoteStart + delimiter, token.quoteEnd - delimiter);
}

export function isAssetPath(contents: string): boolean {
    return !contents.includes('\n') && ASSET_EXTENSION.test(contents.trim());
}

/** Why `token` (a bare string inside `text`) must not be wrapped, or undefined to wrap it. */
export function skipReason(text: string, token: StringToken, filters: BatchFilters): SkipReason | undefined {
    if (filters.skipDialogue && isDialogueString(text, token)) {
        return 'dialogue';
    }
    const contents = stringContents(text, token);
    if (filters.skipAssetPaths && isAssetPath(contents)) {
        return 'asset';
    }
    if (filters.skipPatterns.some(re => re.test(contents))) {
        return 'pattern';
    }
    return undefined;
}

/** Compiles user-supplied patterns, separating out the ones that are not valid regular expressions. */
export function compileSkipPatterns(patterns: readonly unknown[]): { patterns: RegExp[]; invalid: string[] } {
    const compiled: RegExp[] = [];
    const invalid: string[] = [];
    for (const pattern of patterns) {
        if (typeof pattern !== 'string' || pattern === '') {
            invalid.push(String(pattern));
            continue;
        }
        try {
            compiled.push(new RegExp(pattern));
        } catch {
            invalid.push(pattern);
        }
    }
    return { patterns: compiled, invalid };
}
