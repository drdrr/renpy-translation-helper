# RenPy 翻訳ヘルパー

**言語 / Language / 语言:** [日本語](README.jp.md) | [English](README.md) | [简体中文](README.zh-cn.md)

RenPy ゲームスクリプト内のテキストに翻訳マーカーを付与する作業を効率化する Visual Studio Code 拡張機能です。

> Ren'Py ゲームでは、`_()` で囲まれたテキストのみが翻訳文字列として生成されます——囲まれていない文字列は翻訳システムによって暗黙的に無視されます。

## 機能

* **高速な文字列選択**：カーソルを文字列内に置くだけで素早く選択
* **簡単な翻訳マーク付け**：ショートカット一つで文字列に翻訳マーカーを付与
* **バッチ処理**：複数の文字列を一括処理
* **安全なバッチフィルター**：バッチ操作ではセリフ、選択肢、コメント、アセットパス、カラーコードを変更しない
* **変更のプレビュー**：適用前に変更内容を確認
* **スマート検出**：すでにマーク済みの文字列を自動検出
* **マルチカーソル対応**：バッチ操作でマルチカーソルをサポート

## はじめに

### インストール

1. VS Code を開く
2. 拡張機能ビューを開く（Ctrl+Shift+X）
3. "RenPy Translation Helper" を検索
4. "インストール" をクリック

### 基本的な使い方

1. **文字列を選択する**：
   * 文字列内（引用符 `"` または `'` の間のテキスト）にカーソルを置く
   * `Ctrl+Alt+R` の後に `S`（Mac では `Ctrl+Option+R` の後に `S`）を押す
   * 文字列全体が選択される

2. **文字列に翻訳マーカーを付与する**：
   * 文字列内にカーソルを置くか、文字列を選択する
   * `Ctrl+Alt+R` の後に `T`（Mac では `Ctrl+Option+R` の後に `T`）を押す
   * 文字列が `_()` 翻訳マーカーで囲まれる

3. **複数の文字列をバッチ処理する**：
   * 複数の文字列を含む大きなテキストブロックを選択する
   * 右クリックして「RenPy: Batch Wrap All Strings In Selection」を選択するか、`Ctrl+Alt+R` の後に `B`（Mac では `Ctrl+Option+R` の後に `B`）を押す
   * 選択範囲内の未マーク文字列すべてに翻訳マーカーが付与される

4. **バッチ変更をプレビューする**：
   * 複数の文字列を含む大きなテキストブロックを選択する
   * 右クリックして「RenPy: Preview Translation Changes」を選択するか、`Ctrl+Alt+R` の後に `P`（Mac では `Ctrl+Option+R` の後に `P`）を押す
   * 差分ビューで変更内容を確認する
   * `Ctrl+Alt+R` の後に `Enter` で適用、`Esc`（または `Ctrl+Alt+R` の後に `Esc`）でキャンセル。Mac では `Ctrl+Option+R` を使用。ステータスバーやエディタのタイトルバーにある適用/拒否ボタンも使用可能

## キーボードショートカット

| 操作 | Windows/Linux | Mac |
| --- | --- | --- |
| カーソル位置の文字列を選択 | `Ctrl+Alt+R` の後に `S` | `Ctrl+Option+R` の後に `S` |
| 翻訳マーカーを付与 | `Ctrl+Alt+R` の後に `T` | `Ctrl+Option+R` の後に `T` |
| 選択範囲の文字列を一括マーク | `Ctrl+Alt+R` の後に `B` | `Ctrl+Option+R` の後に `B` |
| 変更をプレビュー | `Ctrl+Alt+R` の後に `P` | `Ctrl+Option+R` の後に `P` |
| プレビュー変更を適用 | `Ctrl+Alt+R` の後に `Enter` | `Ctrl+Option+R` の後に `Enter` |
| プレビュー変更を拒否 | `Ctrl+Alt+R` の後に `Esc`（またはプレビュー中に `Esc`） | `Ctrl+Option+R` の後に `Esc`（またはプレビュー中に `Esc`） |

すべてのショートカットは 2 段階のコードです：`Ctrl+Alt+R`（Mac では `Ctrl+Option+R`）を押して離し、続けて 2 つ目のキーを押します。以前のバージョンの `Ctrl/Cmd+Shift+S/T/B/P`、`Alt+Enter`、`Esc` は VS Code の「名前を付けて保存」「閉じたエディターを開く」「ビルド タスクの実行」「コマンド パレット」を上書きしていました。

これらのショートカットはキーボードショートカット設定でカスタマイズできます（ファイル > ユーザー設定 > キーボードショートカット）。

## 設定

* `renpyTranslationHelper.languageIds`：Ren'Py ファイルとして扱う言語モード（既定：`["renpy"]`）。
* `renpyTranslationHelper.fileExtensions`：Ren'Py ファイルとして扱うファイル拡張子。大文字と小文字は区別しません（既定：`[".rpy", ".rpym"]`）。

  この 2 つの設定で、コマンド、右クリックメニュー、ショートカット、ステータスバーの「RenPy Keys」が使えるファイルが決まります。
* `renpyTranslationHelper.translationFunction`：ラップに使う関数名（既定：`"_"`）。例：`"tr"`、`"i18n.t"`。この関数、または Ren'Py の `_`、`__`、`_p` ですでにラップされた文字列は再度ラップされません。無効な名前の場合は警告を表示して `_` を使用します。

`renpyTranslationHelper.batch.*` の設定については[バッチフィルター](#バッチフィルター)を参照してください。

## バッチフィルター

一括マークとプレビューは、`_()` が必要な文字列だけをラップします。次のものはラップしません：

* **コメント**：引用符の外にある `#` 以降のすべて（常にスキップ）。
* **セリフと選択肢**：`e "Hello."`、`e happy "Hello."`、`"Narration."`、`"Eileen" "Hello."` などのセリフ文と、`"Go left":` などの選択肢。Ren'Py はこれらを自動的に翻訳し、`e _("Hello.")` は有効なセリフ文ではありません。
* **アセットパス**：`"bg room.png"`、`"audio/theme.ogg"`、`"fonts/x.ttf"` のようにファイル拡張子で終わる文字列。
* **独自のパターン**：内容が `renpyTranslationHelper.batch.skipPatterns` に一致する文字列。既定では `"#ff8800"` のようなカラーコードをスキップします。

実行後の通知に、各フィルターがスキップした文字列の数が表示されます。それでもラップしたい場合は、文字列内にカーソルを置いて**翻訳マーカーを付与**（`Ctrl+Alt+R` の後に `T`）を使ってください。こちらはフィルターを適用しません。

| 設定 | 既定値 | 効果 |
| --- | --- | --- |
| `renpyTranslationHelper.batch.skipDialogue` | `true` | セリフと選択肢をスキップ |
| `renpyTranslationHelper.batch.skipAssetPaths` | `true` | アセットのファイル拡張子で終わる文字列をスキップ |
| `renpyTranslationHelper.batch.skipPatterns` | `["^#[0-9a-fA-F]{3,8}$"]` | 正規表現（JavaScript 構文）。引用符を除いた文字列の内容と照合 |

セリフは行の形から判定するため、特殊な書き方のコードでは誤判定することがあります。大量に一括処理する前に**プレビュー**で結果を確認してください。

## 使用例

### 単一の文字列をマークする

処理前：
```renpy
define e = Character("Eileen")
```

処理後：
```renpy
define e = Character(_("Eileen"))
```

### バッチ操作で複数の文字列をマークする

処理前：
```renpy
define e = Character("Eileen")
define l = Character("Lucy")
```

処理後：
```renpy
define e = Character(_("Eileen"))
define l = Character(_("Lucy"))
```

## 動作要件

* Visual Studio Code 1.99.0 以降

## 既知の問題

* 複数行の文字列が正しく検出されない場合がある
* 複雑な Python 式内の文字列が正しくラップされない場合がある

## リリースノート

前回のリリース以降の変更点は [CHANGELOG.md](CHANGELOG.md) をご覧ください。

### 0.0.1

* 初期リリース
* カーソル位置の文字列選択をサポート
* 翻訳マーカーによる文字列のラップをサポート
* バッチ処理をサポート
* 変更適用前のプレビューをサポート

---

## 開発者向け

### 拡張機能のビルド

Node.js 22 以降が必要です。

1. リポジトリをクローンする
2. `npm install` で依存関係をインストールする
3. `npm run watch` でウォッチモードでコンパイルする
4. `F5` でデバッグを開始する
5. `npm run test:unit` で高速な単体テスト（Node のみ）を、`npm test` で VS Code 上の全テストを実行する

### 拡張機能のパッケージ化

`npm run vsix` を実行して VSIX パッケージを作成します。プロジェクト内の `@vscode/vsce` を使うため、グローバルインストールは不要です。

## ライセンス

この拡張機能は GNU 一般公衆利用許諾書 v3.0（GPLv3）のもとで提供されています。詳細は [LICENSE](LICENSE) をご覧ください。

## 謝辞

* フィードバックや提案をいただいた RenPy コミュニティの皆様
* [Visual Studio Code Extension API](https://code.visualstudio.com/api) ドキュメント
