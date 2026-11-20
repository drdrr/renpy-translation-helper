# RenPy Translation Helper

**Language / 语言 / 言語:** [English](README.md) | [简体中文](README.zh-cn.md) | [日本語](README.jp.md)

A Visual Studio Code extension that simplifies the process of marking text for translation in RenPy game scripts.

> In Ren'Py games, translation strings are only generated for text wrapped with `_()` — unwrapped strings are excluded from the translation process.

## Features

* **Fast String Selection**: Quickly select strings by placing the cursor inside them
* **Easy Translation Marking**: Mark strings for translation with a single shortcut
* **Batch Processing**: Process multiple strings at once with the batch operation
* **Safe Batch Filtering**: Batch operations leave dialogue, menu choices, comments, asset paths and colour codes untouched
* **Preview Changes**: Review your changes before applying them
* **Smart Detection**: Detects if strings are already marked for translation
* **Multi-cursor Support**: Works with multiple cursors for batch operations

<!-- ![Demo of RenPy Translation Helper](images/demo.gif) -->

## Getting Started

### Installation

1. Open VS Code
2. Go to the Extensions view (Ctrl+Shift+X)
3. Search for "RenPy Translation Helper"
4. Click "Install"

### Basic Usage

1. **Select a string**:
   * Place your cursor inside a string (text between quotes " or ')
   * Press `Ctrl+Alt+R` then `S` (or `Ctrl+Option+R` then `S` on Mac)
   * The entire string will be selected

2. **Wrap a string with translation markers**:
   * Place your cursor inside a string, or select a string
   * Press `Ctrl+Alt+R` then `T` (or `Ctrl+Option+R` then `T` on Mac)
   * The string will be wrapped with `_()` translation markers

3. **Batch process multiple strings**:
   * Select a larger block of text containing multiple strings
   * Right-click and select "RenPy: Batch Wrap All Strings In Selection", or press `Ctrl+Alt+R` then `B` (or `Ctrl+Option+R` then `B` on Mac)
   * All unwrapped strings within your selection will be marked for translation

4. **Preview batch changes**:
   * Select a larger block of text containing multiple strings
   * Right-click and select "RenPy: Preview Translation Changes", or press `Ctrl+Alt+R` then `P` (or `Ctrl+Option+R` then `P` on Mac)
   * Review your changes in the diff view
   * Press `Ctrl+Alt+R` then `Enter` to accept, or `Esc` (or `Ctrl+Alt+R` then `Esc`) to reject. On Mac use `Ctrl+Option+R`. The Accept/Reject buttons in the status bar and editor title bar work too

## Keyboard Shortcuts

| Action | Windows/Linux | Mac |
| --- | --- | --- |
| Select string at cursor | `Ctrl+Alt+R` then `S` | `Ctrl+Option+R` then `S` |
| Wrap with translation markers | `Ctrl+Alt+R` then `T` | `Ctrl+Option+R` then `T` |
| Batch wrap strings in selection | `Ctrl+Alt+R` then `B` | `Ctrl+Option+R` then `B` |
| Preview changes | `Ctrl+Alt+R` then `P` | `Ctrl+Option+R` then `P` |
| Accept preview changes | `Ctrl+Alt+R` then `Enter` | `Ctrl+Option+R` then `Enter` |
| Reject preview changes | `Ctrl+Alt+R` then `Esc` (or `Esc` in the preview) | `Ctrl+Option+R` then `Esc` (or `Esc` in the preview) |

All shortcuts are two-step chords: press `Ctrl+Alt+R` (`Ctrl+Option+R` on Mac), release, then press the second key. Earlier versions used `Ctrl/Cmd+Shift+S/T/B/P`, `Alt+Enter` and `Esc`, which overrode VS Code's Save As, Reopen Closed Editor, Run Build Task and Command Palette.

You can customize these shortcuts in the Keyboard Shortcuts settings (File > Preferences > Keyboard Shortcuts).

## Configuration

* `renpyTranslationHelper.languageIds`: language modes treated as Ren'Py files (default: `["renpy"]`).
* `renpyTranslationHelper.fileExtensions`: file extensions treated as Ren'Py files, matched case-insensitively (default: `[".rpy", ".rpym"]`).

  These two settings decide where the commands, context-menu entries, shortcuts and the "RenPy Keys" status bar item are available.
* `renpyTranslationHelper.translationFunction`: the function used for wrapping (default: `"_"`), e.g. `"tr"` or `"i18n.t"`. Strings already wrapped with it, or with Ren'Py's `_`, `__` or `_p`, are never wrapped again. An invalid name falls back to `_` with a warning.

The `renpyTranslationHelper.batch.*` settings are described under [Batch Filtering](#batch-filtering).

## Batch Filtering

Batch Wrap and Preview only wrap strings that need `_()`. They leave these alone:

* **Comments**: anything after an unquoted `#` (always).
* **Dialogue and menu choices**: say statements such as `e "Hello."`, `e happy "Hello."`, `"Narration."` and `"Eileen" "Hello."`, and menu choices such as `"Go left":`. Ren'Py translates these automatically, and `e _("Hello.")` is not a valid say statement.
* **Asset paths**: strings ending in a file extension, e.g. `"bg room.png"`, `"audio/theme.ogg"`, `"fonts/x.ttf"`.
* **Your own patterns**: strings whose contents match `renpyTranslationHelper.batch.skipPatterns`. By default this skips colour codes such as `"#ff8800"`.

After each run, a notification says how many strings each filter left unwrapped. To wrap one of them anyway, put the cursor in it and use **Wrap** (`Ctrl+Alt+R` then `T`), which never filters.

| Setting | Default | Effect |
| --- | --- | --- |
| `renpyTranslationHelper.batch.skipDialogue` | `true` | Skip dialogue and menu choices |
| `renpyTranslationHelper.batch.skipAssetPaths` | `true` | Skip strings ending in an asset file extension |
| `renpyTranslationHelper.batch.skipPatterns` | `["^#[0-9a-fA-F]{3,8}$"]` | Regular expressions (JavaScript syntax), matched against the string contents without quotes |

Dialogue is recognised by the shape of the line, so unusual code can still be misjudged. Check the result with **Preview** before applying a large batch.

## Examples

### Marking a single string

Before:
```renpy
define e = Character("Eileen")
```

After:
```renpy
define e = Character(_("Eileen"))
```

### Marking multiple strings in a batch operation

Before:
```renpy
define e = Character("Eileen")
define l = Character("Lucy")
```

After:
```renpy
define e = Character(_("Eileen"))
define l = Character(_("Lucy"))
```

## Requirements

* Visual Studio Code 1.99.0 or higher

## Known Issues

* Multi-line strings may not be detected correctly in all cases
* Strings inside complex Python expressions might not be wrapped correctly

## Release Notes

See [CHANGELOG.md](CHANGELOG.md) for changes since the last release.

### 0.0.1

* Initial release
* Support for selecting strings at cursor position
* Support for wrapping strings with translation markers
* Support for batch processing
* Support for preview before applying changes

---

## For Developers

### Building the Extension

Requires Node.js 22 or newer.

1. Clone the repository
2. Run `npm install` to install dependencies
3. Run `npm run watch` to compile in watch mode
4. Press `F5` to start debugging
5. Run `npm run test:unit` for the fast unit tests (plain Node), or `npm test` for the full suite in VS Code

### Packaging the Extension

Run `npm run vsix` to create a VSIX package. It uses the project's own `@vscode/vsce`, so no global install is needed.

## License

This extension is licensed under the GNU General Public License v3.0. See [LICENSE](LICENSE) for details.

## Acknowledgments

* The RenPy community for their feedback and suggestions
* [Visual Studio Code Extension API](https://code.visualstudio.com/api) documentation
