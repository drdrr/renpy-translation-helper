// Pure helpers with no vscode dependency, so they can be unit-tested in plain Node.
import * as path from 'path';

/**
 * Path for the virtual "proposed" document: `script.rpym` -> `/script.proposed.rpym`.
 * Keeping the original extension lets VS Code pick the same language mode.
 */
export function previewPathFor(fileName: string): string {
    const base = path.basename(fileName) || 'untitled';
    const ext = path.extname(base);
    const stem = ext ? base.slice(0, -ext.length) : base;
    return `/${stem}.proposed${ext || '.rpy'}`;
}

const TRANSLATION_FUNCTION_NAME = /^[A-Za-z_][A-Za-z0-9_]*(?:\.[A-Za-z_][A-Za-z0-9_]*)*$/;

/** True for a (possibly dotted) Python identifier such as `_`, `tr` or `i18n.t`. */
export function isValidTranslationFunctionName(name: string): boolean {
    return TRANSLATION_FUNCTION_NAME.test(name);
}

/** True when `fileName`'s extension is in `extensions`, ignoring case (`.RPY` matches `.rpy`). */
export function hasRenpyExtension(fileName: string, extensions: readonly string[]): boolean {
    const ext = path.extname(fileName).toLowerCase();
    return ext !== '' && extensions.some(e => e.toLowerCase() === ext);
}
