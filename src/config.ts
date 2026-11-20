import * as vscode from 'vscode';
import { BatchFilters, compileSkipPatterns } from './filters';
import { hasRenpyExtension, isValidTranslationFunctionName } from './util';

/** Filters for Batch Wrap and Preview, from the `renpyTranslationHelper.batch.*` settings. Invalid patterns are ignored. */
export function getBatchFilters(): BatchFilters {
    const config = vscode.workspace.getConfiguration('renpyTranslationHelper.batch');
    const patterns = config.get<unknown[]>('skipPatterns', []);
    return {
        skipDialogue: config.get<boolean>('skipDialogue', true),
        skipAssetPaths: config.get<boolean>('skipAssetPaths', true),
        skipPatterns: compileSkipPatterns(Array.isArray(patterns) ? patterns : []).patterns,
    };
}

/** The configured translation function, or `_` when the setting is empty or invalid. */
export function getTranslationFunction(): string {
    const fn = vscode.workspace
        .getConfiguration('renpyTranslationHelper')
        .get<string>('translationFunction', '_')
        ?.trim();
    return fn && isValidTranslationFunctionName(fn) ? fn : '_';
}

/**
 * Validates runtime settings and warns about invalid configuration values.
 */
export function updateExtensionSettings(): void {
    const fn = vscode.workspace
        .getConfiguration('renpyTranslationHelper')
        .get<string>('translationFunction', '_')
        ?.trim();
    if (!fn) {
        vscode.window.showWarningMessage(
            'RenPy Translation Helper: translationFunction setting is empty. Defaulting to "_".'
        );
    } else if (!isValidTranslationFunctionName(fn)) {
        vscode.window.showWarningMessage(
            `RenPy Translation Helper: translationFunction "${fn}" is not a valid function name. Defaulting to "_".`
        );
    }

    const patterns = vscode.workspace
        .getConfiguration('renpyTranslationHelper.batch')
        .get<unknown[]>('skipPatterns', []);
    const { invalid } = compileSkipPatterns(Array.isArray(patterns) ? patterns : []);
    if (invalid.length > 0) {
        vscode.window.showWarningMessage(
            `RenPy Translation Helper: ignoring invalid batch.skipPatterns entries: ${invalid.map(p => JSON.stringify(p)).join(', ')}`
        );
    }
}

/**
 * Check if the document is a RenPy file based on configured language IDs and extensions
 */
export function isRenpyFile(document: vscode.TextDocument): boolean {
    const config = vscode.workspace.getConfiguration('renpyTranslationHelper');
    const languageIds: string[] = config.get('languageIds') || ['renpy'];
    if (languageIds.includes(document.languageId)) {
        return true;
    }

    const fileExtensions: string[] = config.get('fileExtensions') || ['.rpy', '.rpym'];
    return hasRenpyExtension(document.fileName, fileExtensions);
}
