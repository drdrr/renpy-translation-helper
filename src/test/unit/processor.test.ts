// Plain-Node unit tests: no vscode import. Run with `npm run test:unit`.
import * as assert from 'assert';
import { StringProcessor } from '../../processor';

suite('StringProcessor.processStringsInText', () => {
    test('wraps a bare double-quoted string', () => {
        assert.strictEqual(StringProcessor.processStringsInText('"hello"'), '_("hello")');
    });

    test('wraps a bare single-quoted string', () => {
        assert.strictEqual(StringProcessor.processStringsInText("'world'"), "_('world')");
    });

    test('does not re-wrap an already translated string', () => {
        assert.strictEqual(StringProcessor.processStringsInText('_("hello")'), '_("hello")');
    });

    test('wraps multiple bare strings', () => {
        assert.strictEqual(
            StringProcessor.processStringsInText('"a" and "b"'),
            '_("a") and _("b")'
        );
    });

    test('does not wrap Python-prefix strings', () => {
        assert.strictEqual(StringProcessor.processStringsInText('b"bytes"'), 'b"bytes"');
    });

    test('handles escaped quote inside a string', () => {
        assert.strictEqual(
            StringProcessor.processStringsInText('"say \\"hi\\""'),
            '_("say \\"hi\\"")'
        );
    });

    test('uses a custom translation function name', () => {
        assert.strictEqual(StringProcessor.processStringsInText('"hello"', 'tr'), 'tr("hello")');
    });

    test('returns empty string unchanged', () => {
        assert.strictEqual(StringProcessor.processStringsInText(''), '');
    });

    test('leaves mixed translated and untranslated content correctly', () => {
        assert.strictEqual(
            StringProcessor.processStringsInText('_("a") "b"'),
            '_("a") _("b")'
        );
    });

    test('does not wrap text with no strings', () => {
        assert.strictEqual(StringProcessor.processStringsInText('no strings here'), 'no strings here');
    });

    test('wraps strings on multiple lines independently', () => {
        const input = '"line one"\n"line two"';
        const expected = '_("line one")\n_("line two")';
        assert.strictEqual(StringProcessor.processStringsInText(input), expected);
    });
});

suite('StringProcessor — prefixed strings are left intact', () => {
    const cases: [string, string][] = [
        ['f"Hi {name}"', 'f"Hi {name}"'],
        ['r"C:\\dir."', 'r"C:\\dir."'],
        ['b"x!" + "y"', 'b"x!" + _("y")'],
        ["rb'raw!'", "rb'raw!'"],
        ['Fr"{a}!"', 'Fr"{a}!"'],
        ['x = f"{a}" if ok else "no"', 'x = f"{a}" if ok else _("no")'],
    ];
    for (const [input, expected] of cases) {
        test(`${input} => ${expected}`, () => {
            assert.strictEqual(StringProcessor.processStringsInText(input), expected);
        });
    }

    test('a keyword before a quote is not a prefix', () => {
        assert.strictEqual(StringProcessor.processStringsInText('if "a"'), 'if _("a")');
    });
});

suite('StringProcessor — triple-quoted strings', () => {
    test('wraps a triple-quoted string as one literal', () => {
        assert.strictEqual(StringProcessor.processStringsInText('m = """Hello"""'), 'm = _("""Hello""")');
    });

    test("wraps a ''' string as one literal", () => {
        assert.strictEqual(StringProcessor.processStringsInText("'''Hi'''"), "_('''Hi''')");
    });

    test('keeps a multi-line triple-quoted string intact', () => {
        const input = '"""line one\n"quoted" line two"""';
        assert.strictEqual(StringProcessor.processStringsInText(input), `_(${input})`);
    });

    test('lone quotes inside a triple-quoted string do not end it', () => {
        assert.strictEqual(
            StringProcessor.processStringsInText('"""a "b" c""" "d"'),
            '_("""a "b" c""") _("d")'
        );
    });

    test('an already-wrapped triple-quoted string is not re-wrapped', () => {
        assert.strictEqual(StringProcessor.processStringsInText('_("""Hello""")'), '_("""Hello""")');
    });

    test('a prefixed triple-quoted string is left intact', () => {
        assert.strictEqual(StringProcessor.processStringsInText('f"""{a}!"""'), 'f"""{a}!"""');
    });

    test('an empty string is not mistaken for a triple quote', () => {
        assert.strictEqual(StringProcessor.processStringsInText('"" + "a"'), '_("") + _("a")');
    });

    test('an unterminated triple-quoted string is skipped, not split', () => {
        const result = StringProcessor.process('"""Hello" world');
        assert.strictEqual(result.text, '"""Hello" world');
        assert.strictEqual(result.skippedUnterminated, 1);
    });
});

suite('StringProcessor — selection ending inside a string', () => {
    test('does not emit an unclosed _(', () => {
        const result = StringProcessor.process('"abc');
        assert.strictEqual(result.text, '"abc');
        assert.strictEqual(result.skippedUnterminated, 1);
    });

    test('wraps complete strings before the unterminated one', () => {
        const result = StringProcessor.process('"a" + "b');
        assert.strictEqual(result.text, '_("a") + "b');
        assert.strictEqual(result.skippedUnterminated, 1);
    });

    test('selection ending inside a translated call is not partially wrapped', () => {
        const result = StringProcessor.process('_("abc');
        assert.strictEqual(result.text, '_("abc');
        assert.strictEqual(result.skippedUnterminated, 1);
    });

    test('complete text reports nothing skipped', () => {
        assert.strictEqual(StringProcessor.process('"a" "b"').skippedUnterminated, 0);
    });
});

suite('StringProcessor — custom translation function', () => {
    test('does not double-wrap with a custom function name', () => {
        assert.strictEqual(StringProcessor.processStringsInText('tr("x")', 'tr'), 'tr("x")');
    });

    test('is idempotent with a custom function name', () => {
        const once = StringProcessor.processStringsInText('"a" "b"', 'tr');
        assert.strictEqual(StringProcessor.processStringsInText(once, 'tr'), once);
    });

    test('still recognises Ren\'Py built-ins _, __ and _p with a custom function', () => {
        assert.strictEqual(
            StringProcessor.processStringsInText('_("a") __("b") _p("c")', 'tr'),
            '_("a") __("b") _p("c")'
        );
    });

    test('dotted custom function name is escaped correctly', () => {
        assert.strictEqual(StringProcessor.processStringsInText('i18n.t("x") "y"', 'i18n.t'), 'i18n.t("x") i18n.t("y")');
    });

    test('a different function ending in _ is not treated as translated', () => {
        assert.strictEqual(StringProcessor.processStringsInText('my_("x")'), 'my_(_("x"))');
    });

    test('whitespace inside the call is still recognised as translated', () => {
        assert.strictEqual(StringProcessor.processStringsInText('_( "x" )'), '_( "x" )');
    });

    test('a string containing _( text is wrapped as a whole', () => {
        assert.strictEqual(
            StringProcessor.processStringsInText('"see _(\'x\') here"'),
            '_("see _(\'x\') here")'
        );
    });
});
