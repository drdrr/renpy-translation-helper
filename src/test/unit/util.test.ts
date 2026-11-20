// Plain-Node unit tests: no vscode import. Run with `npm run test:unit`.
import * as assert from 'assert';
import { hasRenpyExtension, isValidTranslationFunctionName, previewPathFor } from '../../util';

suite('previewPathFor', () => {
    test('keeps the original extension', () => {
        assert.strictEqual(previewPathFor('/game/script.rpy'), '/script.proposed.rpy');
        assert.strictEqual(previewPathFor('/game/screens.rpym'), '/screens.proposed.rpym');
    });

    test('falls back to .rpy for names without an extension', () => {
        assert.strictEqual(previewPathFor('Untitled-1'), '/Untitled-1.proposed.rpy');
    });

    test('leaves special characters for Uri.from to encode', () => {
        assert.strictEqual(previewPathFor('/game/my script#1.rpy'), '/my script#1.proposed.rpy');
    });
});

suite('isValidTranslationFunctionName', () => {
    test('accepts identifiers and dotted names', () => {
        for (const name of ['_', '__', '_p', 'tr', 'i18n.t']) {
            assert.ok(isValidTranslationFunctionName(name), name);
        }
    });

    test('rejects names that would generate broken code', () => {
        for (const name of ['', '_(', '1tr', 'a b', 'a.', '.a', 'tr()']) {
            assert.ok(!isValidTranslationFunctionName(name), name);
        }
    });
});

suite('hasRenpyExtension', () => {
    const exts = ['.rpy', '.rpym'];

    test('matches case-insensitively', () => {
        assert.ok(hasRenpyExtension('/game/SCRIPT.RPY', exts));
        assert.ok(hasRenpyExtension('/game/a.rpym', exts));
    });

    test('rejects other or missing extensions', () => {
        assert.ok(!hasRenpyExtension('/game/script.py', exts));
        assert.ok(!hasRenpyExtension('/game/rpy', exts));
        assert.ok(!hasRenpyExtension('Untitled-1', exts));
    });
});
