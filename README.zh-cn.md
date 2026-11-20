# RenPy 翻译助手

**语言 / Language / 言語:** [简体中文](README.zh-cn.md) | [English](README.md) | [日本語](README.jp.md)

一款 Visual Studio Code 扩展，用于简化在 RenPy 游戏脚本中标记待翻译文本的过程。

> 在 Ren'Py 游戏中，只有使用 `_()` 标记的文本才会生成翻译字符串——未标记的字符串会被忽略。

## 功能特性

* **快速字符串选择**：将光标置于字符串内即可快速选中
* **便捷翻译标记**：通过单个快捷键标记字符串以供翻译
* **批量处理**：通过批量操作一次性处理多个字符串
* **安全的批量过滤**：批量操作会跳过对白、菜单选项、注释、资源路径和颜色代码
* **预览更改**：在应用之前预览所有更改
* **智能检测**：自动检测字符串是否已被标记翻译
* **多光标支持**：支持多光标进行批量操作

## 快速开始

### 安装

1. 打开 VS Code
2. 进入扩展视图（Ctrl+Shift+X）
3. 搜索"RenPy Translation Helper"
4. 点击"安装"

### 基本用法

1. **选择字符串**：
   * 将光标置于字符串内（引号 `"` 或 `'` 之间的文本）
   * 按 `Ctrl+Alt+R` 然后按 `S`（Mac 上为 `Ctrl+Option+R` 然后按 `S`）
   * 整个字符串将被选中

2. **为字符串添加翻译标记**：
   * 将光标置于字符串内，或选中一段字符串
   * 按 `Ctrl+Alt+R` 然后按 `T`（Mac 上为 `Ctrl+Option+R` 然后按 `T`）
   * 字符串将被包裹上 `_()` 翻译标记

3. **批量处理多个字符串**：
   * 选中包含多个字符串的较大文本块
   * 右键并选择"RenPy: Batch Wrap All Strings In Selection"，或按 `Ctrl+Alt+R` 然后按 `B`（Mac 上为 `Ctrl+Option+R` 然后按 `B`）
   * 选中范围内所有未标记的字符串将被添加翻译标记

4. **预览批量更改**：
   * 选中包含多个字符串的较大文本块
   * 右键并选择"RenPy: Preview Translation Changes"，或按 `Ctrl+Alt+R` 然后按 `P`（Mac 上为 `Ctrl+Option+R` 然后按 `P`）
   * 在差异视图中检查更改内容
   * 按 `Ctrl+Alt+R` 然后按 `Enter` 接受，按 `Esc`（或 `Ctrl+Alt+R` 然后按 `Esc`）拒绝。Mac 上使用 `Ctrl+Option+R`。也可以点击状态栏或编辑器标题栏中的接受/拒绝按钮

## 键盘快捷键

| 操作 | Windows/Linux | Mac |
| --- | --- | --- |
| 选择光标处的字符串 | `Ctrl+Alt+R` 然后按 `S` | `Ctrl+Option+R` 然后按 `S` |
| 添加翻译标记 | `Ctrl+Alt+R` 然后按 `T` | `Ctrl+Option+R` 然后按 `T` |
| 批量标记选区内的字符串 | `Ctrl+Alt+R` 然后按 `B` | `Ctrl+Option+R` 然后按 `B` |
| 预览更改 | `Ctrl+Alt+R` 然后按 `P` | `Ctrl+Option+R` 然后按 `P` |
| 接受预览更改 | `Ctrl+Alt+R` 然后按 `Enter` | `Ctrl+Option+R` 然后按 `Enter` |
| 拒绝预览更改 | `Ctrl+Alt+R` 然后按 `Esc`（或在预览中按 `Esc`） | `Ctrl+Option+R` 然后按 `Esc`（或在预览中按 `Esc`） |

所有快捷键均为两步组合键：先按 `Ctrl+Alt+R`（Mac 上为 `Ctrl+Option+R`），松开后再按第二个键。旧版本使用的 `Ctrl/Cmd+Shift+S/T/B/P`、`Alt+Enter` 和 `Esc` 会覆盖 VS Code 的“另存为”、“重新打开已关闭的编辑器”、“运行生成任务”和“命令面板”。

可在键盘快捷键设置中自定义这些快捷键（文件 > 首选项 > 键盘快捷键）。

## 配置

* `renpyTranslationHelper.languageIds`：视为 Ren'Py 文件的语言模式（默认：`["renpy"]`）。
* `renpyTranslationHelper.fileExtensions`：视为 Ren'Py 文件的文件扩展名，不区分大小写（默认：`[".rpy", ".rpym"]`）。

  这两项设置决定命令、右键菜单项、快捷键以及状态栏中“RenPy Keys”按钮在哪些文件中可用。
* `renpyTranslationHelper.translationFunction`：用于包裹的函数名（默认：`"_"`），例如 `"tr"` 或 `"i18n.t"`。已经用该函数或 Ren'Py 的 `_`、`__`、`_p` 包裹的字符串不会被重复包裹。无效的函数名会回退为 `_` 并给出警告。

`renpyTranslationHelper.batch.*` 设置见[批量过滤](#批量过滤)。

## 批量过滤

批量标记和预览只会包裹需要 `_()` 的字符串，以下内容会被跳过：

* **注释**：未加引号的 `#` 之后的所有内容（始终跳过）。
* **对白和菜单选项**：如 `e "Hello."`、`e happy "Hello."`、`"Narration."`、`"Eileen" "Hello."` 等对白语句，以及 `"Go left":` 等菜单选项。Ren'Py 会自动翻译这些内容，而 `e _("Hello.")` 不是合法的对白语句。
* **资源路径**：以文件扩展名结尾的字符串，如 `"bg room.png"`、`"audio/theme.ogg"`、`"fonts/x.ttf"`。
* **自定义模式**：内容匹配 `renpyTranslationHelper.batch.skipPatterns` 的字符串。默认会跳过 `"#ff8800"` 这样的颜色代码。

每次执行后，通知会显示各过滤器跳过的字符串数量。如果仍要包裹其中某个字符串，请将光标置于其中并使用**添加翻译标记**（`Ctrl+Alt+R` 然后按 `T`），该操作不会进行过滤。

| 设置 | 默认值 | 作用 |
| --- | --- | --- |
| `renpyTranslationHelper.batch.skipDialogue` | `true` | 跳过对白和菜单选项 |
| `renpyTranslationHelper.batch.skipAssetPaths` | `true` | 跳过以资源文件扩展名结尾的字符串 |
| `renpyTranslationHelper.batch.skipPatterns` | `["^#[0-9a-fA-F]{3,8}$"]` | 正则表达式（JavaScript 语法），与去掉引号后的字符串内容匹配 |

对白是根据行的结构识别的，特殊写法的代码仍可能被误判。大批量操作前，请先用**预览**检查结果。

## 示例

### 标记单个字符串

处理前：
```renpy
define e = Character("Eileen")
```

处理后：
```renpy
define e = Character(_("Eileen"))
```

### 批量标记多个字符串

处理前：
```renpy
define e = Character("Eileen")
define l = Character("Lucy")
```

处理后：
```renpy
define e = Character(_("Eileen"))
define l = Character(_("Lucy"))
```

## 系统要求

* Visual Studio Code 1.99.0 或更高版本

## 已知问题

* 多行字符串在某些情况下可能无法正确检测
* 复杂 Python 表达式中的字符串可能无法正确包裹

## 发布说明

自上次发布以来的更改请参阅 [CHANGELOG.md](CHANGELOG.md)。

### 0.0.1

* 初始版本
* 支持选择光标处的字符串
* 支持为字符串添加翻译标记
* 支持批量处理
* 支持应用前预览更改

---

## 开发者文档

### 构建扩展

需要 Node.js 22 或更高版本。

1. 克隆仓库
2. 运行 `npm install` 安装依赖
3. 运行 `npm run watch` 以监视模式编译
4. 按 `F5` 开始调试
5. 运行 `npm run test:unit` 执行快速单元测试（纯 Node 环境），或运行 `npm test` 在 VS Code 中执行完整测试

### 打包扩展

运行 `npm run vsix` 创建 VSIX 安装包。它使用项目自带的 `@vscode/vsce`，无需全局安装。

## 许可证

本扩展遵循 GNU 通用公共许可证 v3.0（GPLv3）——详见 [LICENSE](LICENSE)。

## 致谢

* RenPy 社区提供的反馈与建议
* [Visual Studio Code Extension API](https://code.visualstudio.com/api) 文档
