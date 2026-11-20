// Pure string-literal scanner shared by the detector and the processor. No vscode dependency.

/**
 * Translation function names that are always treated as "already translated",
 * in addition to the configured `translationFunction`. `__` is Ren'Py's
 * immediate translation and `_p` its paragraph-reflowing variant.
 */
const BUILTIN_TRANSLATION_FUNCTIONS = ['_', '__', '_p'];

export function getKnownTranslationFunctions(translationFn = '_'): string[] {
    return Array.from(new Set([translationFn, ...BUILTIN_TRANSLATION_FUNCTIONS].filter(fn => fn)));
}

function escapeRegExp(text: string): string {
    return text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Builds an alternation of the known translation function names, longest first
 * so that e.g. `__` is preferred over `_`.
 */
function translationFnAlternation(translationFn: string): string {
    return getKnownTranslationFunctions(translationFn)
        .sort((a, b) => b.length - a.length)
        .map(escapeRegExp)
        .join('|');
}

/**
 * Returns a regex matching a translation call opening (e.g. `_(`) at the very
 * end of a string. Used to detect that a selected string is already wrapped.
 */
export function buildCallOpeningAtEndPattern(translationFn = '_'): RegExp {
    return new RegExp(`(?<![A-Za-z0-9_.])(?:${translationFnAlternation(translationFn)})\\($`);
}

export type StringTokenKind = 'bare' | 'translated' | 'prefixed' | 'unterminated';

/**
 * A string literal found by {@link scanStrings}. Offsets are into the scanned text.
 * - `start`/`end` (exclusive) span the whole token: for `translated` this is the
 *   full call `_("...")`, for `prefixed` it includes the prefix (`f"..."`).
 * - `quoteStart`/`quoteEnd` (exclusive) span just the quoted literal, quotes included.
 */
export interface StringToken {
    kind: StringTokenKind;
    start: number;
    end: number;
    quoteStart: number;
    quoteEnd: number;
}

const STRING_PREFIX_CHARS = /[rRbBuUfF]/;
const IDENTIFIER_CHAR = /[A-Za-z0-9_]/;

/**
 * Returns the offset just past the closing delimiter of the literal whose opening
 * quote is at `quoteIndex`, or -1 if the literal is not closed before the end.
 * Triple-quoted literals (`"""..."""` / `'''...'''`) are treated as one literal.
 */
function findClosingQuote(text: string, quoteIndex: number): number {
    const quote = text[quoteIndex];
    const triple = quote.repeat(3);
    const isTriple = text.startsWith(triple, quoteIndex);
    const delimiter = isTriple ? triple : quote;

    for (let j = quoteIndex + delimiter.length; j < text.length; j++) {
        const ch = text[j];
        if (ch === '\\') {
            j++;
        } else if (ch === quote && (!isTriple || text.startsWith(triple, j))) {
            return j + delimiter.length;
        }
    }
    return -1;
}

/**
 * Length of a Python string prefix (`r`, `b`, `f`, `rb`, `fr`, ...) ending right
 * before `quoteIndex`, or 0 when there is none. A prefix must not be the tail
 * of a longer identifier (`don't` has no prefix).
 */
export function stringPrefixLength(text: string, quoteIndex: number): number {
    let len = 0;
    while (len < 2 && quoteIndex - len - 1 >= 0 && STRING_PREFIX_CHARS.test(text[quoteIndex - len - 1])) {
        len++;
    }
    if (len === 0) {
        return 0;
    }
    const before = quoteIndex - len - 1;
    return before < 0 || !IDENTIFIER_CHAR.test(text[before]) ? len : 0;
}

/**
 * Single-pass scanner that finds string literals in `text` and classifies them:
 * - `translated`: a literal that is the sole argument of a known translation call
 * - `prefixed`: a literal with a Python prefix (`r"..."`, `f"..."`, ...), never wrapped
 * - `bare`: any other complete literal, a wrapping candidate
 * - `unterminated`: a literal whose closing quote is outside `text` (always last)
 *
 * A quote directly preceded by an identifier character that is not a string
 * prefix (e.g. the apostrophe in `don't`) is not treated as a string start.
 * Text from an unquoted `#` to the end of its line is a comment and yields no tokens.
 */
export function scanStrings(text: string, translationFn = '_'): StringToken[] {
    const callOpening = new RegExp(
        `(?<![A-Za-z0-9_.])(?:${translationFnAlternation(translationFn)})\\(\\s*(?=['"])`,
        'y'
    );
    const callClosing = /\s*\)/y;
    const tokens: StringToken[] = [];

    for (let i = 0; i < text.length; i++) {
        const ch = text[i];

        // An unquoted `#` starts a comment (Ren'Py and Python): skip to end of line.
        if (ch === '#') {
            const newline = text.indexOf('\n', i);
            i = newline < 0 ? text.length : newline;
            continue;
        }

        if (ch !== '"' && ch !== "'") {
            callOpening.lastIndex = i;
            const opening = callOpening.exec(text);
            if (!opening) {
                continue;
            }
            const quoteStart = i + opening[0].length;
            const quoteEnd = findClosingQuote(text, quoteStart);
            if (quoteEnd < 0) {
                tokens.push({ kind: 'unterminated', start: quoteStart, end: text.length, quoteStart, quoteEnd: text.length });
                break;
            }
            callClosing.lastIndex = quoteEnd;
            const closing = callClosing.exec(text);
            if (closing) {
                const end = quoteEnd + closing[0].length;
                tokens.push({ kind: 'translated', start: i, end, quoteStart, quoteEnd });
                i = end - 1;
            } else {
                // Not a simple `_("...")` call (e.g. `_("a" + "b")`): scan its contents normally.
                i = quoteStart - 1;
            }
            continue;
        }

        const prefixLength = stringPrefixLength(text, i);
        if (prefixLength === 0 && i > 0 && IDENTIFIER_CHAR.test(text[i - 1])) {
            continue;
        }

        const quoteEnd = findClosingQuote(text, i);
        if (quoteEnd < 0) {
            tokens.push({ kind: 'unterminated', start: i - prefixLength, end: text.length, quoteStart: i, quoteEnd: text.length });
            break;
        }

        tokens.push({
            kind: prefixLength > 0 ? 'prefixed' : 'bare',
            start: i - prefixLength,
            end: quoteEnd,
            quoteStart: i,
            quoteEnd,
        });
        i = quoteEnd - 1;
    }

    return tokens;
}
