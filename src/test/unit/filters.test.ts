// Plain-Node unit tests: no vscode import. Run with `npm run test:unit`.
import * as assert from 'assert';
import { BatchFilters, compileSkipPatterns, isAssetPath, isDialogueString, NO_FILTERS, stringContents } from '../../filters';
import { StringProcessor } from '../../processor';
import { scanStrings } from '../../tokenizer';

const DEFAULTS: BatchFilters = {
    skipDialogue: true,
    skipAssetPaths: true,
    skipPatterns: compileSkipPatterns(['^#[0-9a-fA-F]{3,8}$']).patterns,
};

/** Batch-wrap `text` with the default filters on. */
function wrap(text: string, options: { linePrefix?: string; lineSuffix?: string } = {}): string {
    return StringProcessor.processStringsInText(text, '_', { ...options, filters: DEFAULTS });
}

/** isDialogueString for the first string token in `line`. */
function dialogue(line: string): boolean {
    return isDialogueString(line, scanStrings(line)[0]);
}

suite('isDialogueString — say statements and menu choices', () => {
    const sayLines = [
        '"Narration."',
        '    "Indented narration."',
        'e "Hello."',
        'e happy "Hello."',
        'e @ sad "Hello."',
        'e -hat "Hello."',
        'extend " and more."',
        '"Hello." with dissolve',
        'e "Hello." (multiple=2)',
        '    "Go left":',
        '    "Go right" if has_key:',
        '    "Go back":  # comment',
        'old "Start"',
        'new "Start"',
    ];
    for (const line of sayLines) {
        test(`dialogue: ${line}`, () => assert.ok(dialogue(line)));
    }

    test('both strings of a quoted-speaker say statement', () => {
        const line = '"Eileen" "Hello."';
        const tokens = scanStrings(line);
        assert.ok(isDialogueString(line, tokens[0]));
        assert.ok(isDialogueString(line, tokens[1]));
    });

    const notSayLines = [
        'define e = Character("Eileen")',
        '$ name = "Eileen"',
        'text "Hello"',
        'textbutton "Start" action Start()',
        'label "Settings"',
        'play music "theme.ogg"',
        'show text "Chapter 1"',
        'return "done"',
        'x = "value"',
        '    "key": "value",',
        '    "item",',
        '    "a" + b',
        '    "Hello %s" % name',
        '    "text".format(x)',
        'renpy.notify("Saved")',
    ];
    for (const line of notSayLines) {
        test(`not dialogue: ${line}`, () => assert.ok(!dialogue(line)));
    }
});

suite('isAssetPath / stringContents', () => {
    test('recognises asset extensions, case-insensitively', () => {
        for (const p of ['bg room.png', 'images/eileen happy.WEBP', 'audio/theme.ogg', 'fonts/DejaVuSans.ttf', 'movie.webm']) {
            assert.ok(isAssetPath(p), p);
        }
    });

    test('ignores ordinary text', () => {
        for (const p of ['Hello.', 'Version 1.0', 'png', 'See file.png for details!']) {
            assert.ok(!isAssetPath(p), p);
        }
    });

    test('stringContents strips single and triple quotes', () => {
        const text = 'x = "a.png" + """b.ogg"""';
        const [a, b] = scanStrings(text);
        assert.strictEqual(stringContents(text, a), 'a.png');
        assert.strictEqual(stringContents(text, b), 'b.ogg');
    });
});

suite('compileSkipPatterns', () => {
    test('keeps valid patterns and reports invalid ones', () => {
        const { patterns, invalid } = compileSkipPatterns(['^a$', '(', '', 42]);
        assert.strictEqual(patterns.length, 1);
        assert.deepStrictEqual(invalid, ['(', '', '42']);
    });
});

suite('StringProcessor with default batch filters', () => {
    test('leaves dialogue and menu choices alone, wraps the rest', () => {
        const input = [
            'define e = Character("Eileen")',
            'label start:',
            '    e "Hello."',
            '    "Narration."',
            '    menu:',
            '        "Go left":',
            '            $ notify("Went left")',
        ].join('\n');
        const expected = [
            'define e = Character(_("Eileen"))',
            'label start:',
            '    e "Hello."',
            '    "Narration."',
            '    menu:',
            '        "Go left":',
            '            $ notify(_("Went left"))',
        ].join('\n');
        assert.strictEqual(wrap(input), expected);
    });

    test('leaves asset paths and colour codes alone', () => {
        assert.strictEqual(
            wrap('show expression "bg room.png"\ndefine gui.accent_color = "#ff8800"\ndefine t = "Title"'),
            'show expression "bg room.png"\ndefine gui.accent_color = "#ff8800"\ndefine t = _("Title")'
        );
    });

    test('never wraps strings inside comments', () => {
        assert.strictEqual(
            wrap('define t = "Title"  # was "Old title"\n# "commented out"'),
            'define t = _("Title")  # was "Old title"\n# "commented out"'
        );
    });

    test('comments are skipped even with filters off', () => {
        assert.strictEqual(StringProcessor.processStringsInText('# say "hi"', '_', { filters: NO_FILTERS }), '# say "hi"');
    });

    test('counts what each filter skipped', () => {
        const result = StringProcessor.process('e "Hi"\nplay music "a.ogg"\n$ c = "#fff"\n$ t = "T"', '_', { filters: DEFAULTS });
        assert.deepStrictEqual(result.skipped, { dialogue: 1, asset: 1, pattern: 1 });
        assert.strictEqual(result.text, 'e "Hi"\nplay music "a.ogg"\n$ c = "#fff"\n$ t = _("T")');
    });

    test('custom skip patterns apply to the contents without quotes', () => {
        const filters = { ...NO_FILTERS, skipPatterns: compileSkipPatterns(['^gui\\.']).patterns };
        assert.strictEqual(
            StringProcessor.processStringsInText('x("gui.button") x("OK")', '_', { filters }),
            'x("gui.button") x(_("OK"))'
        );
    });

    test('individual filters can be switched off', () => {
        const noDialogue = { ...DEFAULTS, skipDialogue: false };
        assert.strictEqual(StringProcessor.processStringsInText('e "Hi"', '_', { filters: noDialogue }), 'e _("Hi")');
        const noAssets = { ...DEFAULTS, skipAssetPaths: false };
        assert.strictEqual(StringProcessor.processStringsInText('x("a.png")', '_', { filters: noAssets }), 'x(_("a.png"))');
    });
});

suite('StringProcessor line context', () => {
    test('a selection of just the string in Character("Eileen") is wrapped, not mistaken for narration', () => {
        assert.strictEqual(wrap('"Eileen"', { linePrefix: 'define e = Character(', lineSuffix: ')' }), '_("Eileen")');
    });

    test('a selection of just the string inside _("...") is not re-wrapped or reported as cut off', () => {
        const result = StringProcessor.process('"Eileen"', '_', { linePrefix: 'x = _(', lineSuffix: ')', filters: DEFAULTS });
        assert.strictEqual(result.text, '"Eileen"');
        assert.strictEqual(result.skippedUnterminated, 0);
    });

    test('a selection of just the dialogue string sees its speaker', () => {
        assert.strictEqual(wrap('"Hello."', { linePrefix: '    e ' }), '"Hello."');
    });

    test('a selection inside a comment is not wrapped', () => {
        assert.strictEqual(wrap('"quoted"', { linePrefix: '# a ' }), '"quoted"');
    });

    test('a selection starting inside a string is not wrapped', () => {
        const result = StringProcessor.process('llo" + "b"', '_', { linePrefix: 'x = "he' });
        assert.strictEqual(result.text, 'llo" + _("b")');
        assert.strictEqual(result.skippedUnterminated, 1);
    });

    test('a selection ending inside a string reports it with the suffix known', () => {
        const result = StringProcessor.process('x = "a" + "he', '_', { lineSuffix: 'llo"' });
        assert.strictEqual(result.text, 'x = _("a") + "he');
        assert.strictEqual(result.skippedUnterminated, 1);
    });
});
