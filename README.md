# Markdown Highlight Tag to HTML Style

Convert Markdown highlight syntax like `==text==` into HTML `<mark>text</mark>` while editing notes in Obsidian.

## Overview

This plugin is for people who want highlighted text to be stored as explicit HTML markup instead of Markdown highlight syntax.

When you type `==highlight==`, the plugin converts the current line to:

```html
<mark>highlight</mark>
```

## Features

- Automatically converts `==text==` to `<mark>text</mark>` after a configurable delay.
- Adds a command: `Convert ==xxx== to <mark>xxx</mark>`.
- Skips fenced code blocks.
- Skips inline code spans wrapped in backticks.
- Keeps the cursor position aligned after conversion.

## Important Behavior

This plugin rewrites the source content of your note.

- Input: `==important==`
- Output: `<mark>important</mark>`

If you want to keep native Markdown highlight syntax in your files, this plugin is not a good fit.

## Usage

1. Open a note in edit mode.
2. Type highlight syntax such as `==important==`.
3. Wait for the configured delay, or run the command manually from the command palette.

Notes:

- Automatic conversion applies to the current line being edited.
- Manual conversion also works on the current line at the cursor.
- Content inside fenced code blocks or inline code is ignored.

## Settings

The plugin currently exposes one setting:

- `Auto convert delay (ms)`: Delay before automatic conversion runs. Default: `200`.

## Installation

### Manual installation

Until the plugin is available through the Obsidian Community Plugins directory, install it manually:

1. Download the release assets for the version you want.
2. Create a folder named `markdown-highlight-html` inside your vault's `.obsidian/plugins/`.
3. Put `manifest.json` and `main.js` into that folder.
4. Reload Obsidian and enable the plugin in Community Plugins.

### Community Plugins

When the plugin is published, you will be able to install it from:

`Settings -> Community plugins -> Browse`

## Development

```bash
npm install
npm run dev
npm run build
```

`npm run build` generates the bundled `main.js` file for release packaging.

Compiled release files are intentionally not committed to the repository. Keep source files in Git, and upload release artifacts through GitHub Releases instead.

## Compatibility

- Minimum Obsidian version: `0.12.0`

## License

MIT
