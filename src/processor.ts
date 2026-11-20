import { BatchFilters, NO_FILTERS, SkipReason, skipReason } from './filters';
import { scanStrings } from './tokenizer';

export interface ProcessOptions {
    /**
     * Text on the selection's first line before the selection starts. Lets the
     * scanner see comments, say-statement speakers and strings that begin before
     * the selection. Never modified.
     */
    linePrefix?: string;
    /** Text on the selection's last line after the selection ends. Never modified. */
    lineSuffix?: string;
    /** Which bare strings to leave unwrapped. Defaults to {@link NO_FILTERS}. */
    filters?: BatchFilters;
}

export interface ProcessResult {
    text: string;
    /** Number of strings left unwrapped because the selection starts or ends inside them. */
    skippedUnterminated: number;
    /** Number of complete bare strings left unwrapped by each filter. */
    skipped: Record<SkipReason, number>;
}

/**
 * Processes strings for translation
 */
export class StringProcessor {
    /**
     * Wraps every bare string literal in `text` with `translationFn(...)`.
     * Already-translated calls, prefixed literals and comments are left
     * untouched, as is any string the filters exclude. A literal that is cut
     * off by either end of `text` is never partially wrapped.
     */
    public static process(text: string, translationFn = '_', options: ProcessOptions = {}): ProcessResult {
        const prefix = options.linePrefix ?? '';
        const suffix = options.lineSuffix ?? '';
        const filters = options.filters ?? NO_FILTERS;
        const full = prefix + text + suffix;
        const textStart = prefix.length;
        const textEnd = textStart + text.length;

        let result = '';
        let lastPos = 0;
        let skippedUnterminated = 0;
        const skipped: Record<SkipReason, number> = { dialogue: 0, asset: 0, pattern: 0 };

        for (const tok of scanStrings(full, translationFn)) {
            if (tok.end <= textStart || tok.start >= textEnd) {
                continue; // entirely in the read-only context
            }
            if (tok.kind === 'unterminated' || tok.start < textStart || tok.end > textEnd) {
                // Cut off by the selection. An already-translated call or a prefixed
                // literal would not be wrapped anyway, so only report the rest.
                if (tok.kind === 'bare' || tok.kind === 'unterminated') {
                    skippedUnterminated++;
                }
                continue;
            }
            if (tok.kind !== 'bare') {
                continue;
            }

            const reason = skipReason(full, tok, filters);
            if (reason) {
                skipped[reason]++;
                continue;
            }

            const start = tok.start - textStart;
            const end = tok.end - textStart;
            result += text.substring(lastPos, start) + `${translationFn}(` + text.substring(start, end) + ')';
            lastPos = end;
        }

        return { text: result + text.substring(lastPos), skippedUnterminated, skipped };
    }

    public static processStringsInText(text: string, translationFn = '_', options: ProcessOptions = {}): string {
        return this.process(text, translationFn, options).text;
    }
}
