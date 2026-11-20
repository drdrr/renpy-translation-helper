// Integration tests: need the VS Code API. Run with `npm test`.
import * as assert from 'assert';
import * as vscode from 'vscode';
import { StringDetector } from '../detector';

suite('StringDetector — document-based tests', () => {
    async function makeDoc(content: string): Promise<vscode.TextDocument> {
        return vscode.workspace.openTextDocument({ content, language: 'renpy' });
    }

    test('findStringAtPosition — cursor inside a double-quoted string', async () => {
        const doc = await makeDoc('"hello"');
        const range = StringDetector.findStringAtPosition(doc, new vscode.Position(0, 3));
        assert.ok(range, 'Expected a range to be returned');
        assert.strictEqual(doc.getText(range), '"hello"');
    });

    test('findStringAtPosition — cursor on the opening quote', async () => {
        const doc = await makeDoc('"hello"');
        const range = StringDetector.findStringAtPosition(doc, new vscode.Position(0, 0));
        assert.ok(range, 'Expected a range to be returned');
        assert.strictEqual(doc.getText(range), '"hello"');
    });

    test('findStringAtPosition — cursor past end of string returns null', async () => {
        const doc = await makeDoc('"hi" extra');
        const range = StringDetector.findStringAtPosition(doc, new vscode.Position(0, 8));
        assert.strictEqual(range, null);
    });

    test('findStringAtPosition — selects a whole triple-quoted string', async () => {
        const doc = await makeDoc('m = """a "b" c"""');
        const range = StringDetector.findStringAtPosition(doc, new vscode.Position(0, 10));
        assert.ok(range, 'Expected a range to be returned');
        assert.strictEqual(doc.getText(range), '"""a "b" c"""');
    });

    test('findTranslatedStringAtPosition — cursor inside _("hi") returns full range', async () => {
        const doc = await makeDoc('_("hi")');
        const range = StringDetector.findTranslatedStringAtPosition(doc, new vscode.Position(0, 3));
        assert.ok(range, 'Expected a range to be returned');
        assert.strictEqual(doc.getText(range), '_("hi")');
    });

    test('findTranslatedStringAtPosition — cursor on bare string returns null', async () => {
        const doc = await makeDoc('"hi"');
        const range = StringDetector.findTranslatedStringAtPosition(doc, new vscode.Position(0, 1));
        assert.strictEqual(range, null);
    });

    test('findTranslatedStringAtPosition — recognises a custom function', async () => {
        const doc = await makeDoc('x = tr("hi")');
        const range = StringDetector.findTranslatedStringAtPosition(doc, new vscode.Position(0, 8), 'tr');
        assert.ok(range, 'Expected a range to be returned');
        assert.strictEqual(doc.getText(range), 'tr("hi")');
    });

    test('findTranslatedStringInnerRangeAtPosition — handles whitespace inside the call', async () => {
        const doc = await makeDoc('_( "hi" )');
        const range = StringDetector.findTranslatedStringInnerRangeAtPosition(doc, new vscode.Position(0, 4));
        assert.ok(range, 'Expected a range to be returned');
        assert.strictEqual(doc.getText(range), '"hi"');
    });

    test('findStringAtPosition — prefixed string is not selectable', async () => {
        const doc = await makeDoc('f"Hi {name}!"');
        const range = StringDetector.findStringAtPosition(doc, new vscode.Position(0, 4));
        assert.strictEqual(range, null);
    });

    test('findStringAtPosition — bare string after a prefixed one is found', async () => {
        const doc = await makeDoc('f"{a}!" + "b"');
        const range = StringDetector.findStringAtPosition(doc, new vscode.Position(0, 11));
        assert.ok(range, 'Expected a range to be returned');
        assert.strictEqual(doc.getText(range), '"b"');
    });
});
