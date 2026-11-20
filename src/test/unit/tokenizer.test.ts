// Plain-Node unit tests: no vscode import. Run with `npm run test:unit`.
import * as assert from 'assert';
import { buildCallOpeningAtEndPattern, scanStrings, stringPrefixLength } from '../../tokenizer';

suite('scanStrings', () => {
    test('classifies tokens', () => {
        const kinds = scanStrings('_("a") "b" f"c" "d').map(t => t.kind);
        assert.deepStrictEqual(kinds, ['translated', 'bare', 'prefixed', 'unterminated']);
    });

    test('apostrophe inside a word is not a string start', () => {
        assert.deepStrictEqual(scanStrings("don't stop"), []);
    });

    test('strings in comments are ignored, up to the end of the line', () => {
        const kinds = scanStrings('# "a" \'b\'\n"c" # "d"\n"e"').map(t => t.kind);
        assert.deepStrictEqual(kinds, ['bare', 'bare']);
    });

    test('a # inside a string is not a comment', () => {
        const tokens = scanStrings('"#fff" "x"');
        assert.strictEqual(tokens.length, 2);
    });

    test('reports offsets of the call and of the quoted literal', () => {
        const [tok] = scanStrings('x = _( "hi" )');
        assert.strictEqual(tok.kind, 'translated');
        assert.deepStrictEqual(
            [tok.start, tok.end, tok.quoteStart, tok.quoteEnd],
            [4, 13, 7, 11]
        );
    });

    test('a triple-quoted string is a single token', () => {
        const tokens = scanStrings('"""a "b" c"""');
        assert.strictEqual(tokens.length, 1);
        assert.deepStrictEqual([tokens[0].kind, tokens[0].start, tokens[0].end], ['bare', 0, 13]);
    });

    test('a translated triple-quoted call is recognised', () => {
        const [tok] = scanStrings("_('''x''')");
        assert.deepStrictEqual([tok.kind, tok.quoteStart, tok.quoteEnd], ['translated', 2, 9]);
    });
});

suite('stringPrefixLength', () => {
    test('detects one- and two-letter prefixes', () => {
        assert.strictEqual(stringPrefixLength('f"x"', 1), 1);
        assert.strictEqual(stringPrefixLength('rb"x"', 2), 2);
        assert.strictEqual(stringPrefixLength(' Fr"x"', 3), 2);
    });

    test('ignores prefix letters at the end of a longer identifier', () => {
        assert.strictEqual(stringPrefixLength('self"x"', 4), 0);
        assert.strictEqual(stringPrefixLength('if"x"', 2), 0);
    });

    test('returns 0 without a prefix', () => {
        assert.strictEqual(stringPrefixLength('("x")', 1), 0);
        assert.strictEqual(stringPrefixLength('"x"', 0), 0);
    });
});

suite('buildCallOpeningAtEndPattern', () => {
    test('matches configured and built-in names, not lookalikes', () => {
        const re = buildCallOpeningAtEndPattern('tr');
        assert.ok(re.test('x = tr('));
        assert.ok(re.test('x = _('));
        assert.ok(re.test('x = __('));
        assert.ok(!re.test('x = my_('));
        assert.ok(!re.test('x = Character('));
    });
});
