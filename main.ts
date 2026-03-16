import { App, Editor, EventRef, MarkdownView, Notice, Plugin, PluginSettingTab, Setting, TextComponent, debounce } from 'obsidian';

/**
 * Plugin settings interface.
 */
interface MarkdownHighlightTagToHtmlStyle {
    autoConvertDelay: number; // Delay before automatic conversion, in milliseconds.
}

/**
 * Default plugin settings.
 */
const DEFAULT_SETTINGS: MarkdownHighlightTagToHtmlStyle = {
    autoConvertDelay: 200
};

/**
 * Check whether the specified line is inside a fenced code block.
 * @param lines All lines in the editor.
 * @param lineNumber Current line number, zero-based.
 * @returns Whether the line is inside a fenced code block.
 */
function isLineInCodeBlock(lines: string[], lineNumber: number): boolean {
    let inCodeBlock = false;
    let codeBlockDelimiter = '';

    for (let i = 0; i <= lineNumber; i++) {
        const line = lines[i];
        const codeBlockMatch = line.match(/^(```|~~~)/);
        if (codeBlockMatch) {
            if (!inCodeBlock) {
                inCodeBlock = true;
                codeBlockDelimiter = codeBlockMatch[1];
            } else if (codeBlockMatch[1] === codeBlockDelimiter) {
                inCodeBlock = false;
                codeBlockDelimiter = '';
            }
        }
    }

    return inCodeBlock;
}

/**
 * Replace ==xxx== with <mark>xxx</mark> on a single line,
 * while ignoring inline code spans.
 * @param line Original line content.
 * @returns The updated line and whether a replacement happened.
 */
function replaceHighlightLine(line: string): { newLine: string; replaced: boolean } {
    let inInlineCode = false;
    let result = '';
    let replaced = false;

    for (let i = 0; i < line.length; i++) {
        if (line[i] === '`') {
            inInlineCode = !inInlineCode;
            result += line[i];
            continue;
        }

        if (!inInlineCode && line[i] === '=' && line[i + 1] === '=') {
            // Found the opening == marker.
            const endIdx = line.indexOf('==', i + 2);
            if (endIdx !== -1) {
                const highlightedText = line.substring(i + 2, endIdx);
                result += `<mark>${highlightedText}</mark>`;
                i = endIdx + 1; // Skip the closing == marker.
                replaced = true;
                continue;
            }
        }

        result += line[i];
    }

    return { newLine: result, replaced };
}

export default class MarkdownHighlightTagToHtmlStylePlugin extends Plugin {
    settings: MarkdownHighlightTagToHtmlStyle;
    private onEditHandler: () => void;
    private editorChangeEvent: EventRef | null = null;

    /**
     * Initialize the plugin when it loads.
     */
    async onload() {
        await this.loadSettings();

        // Add a command for manual conversion.
        this.addCommand({
            id: 'convert-highlight',
            name: 'Convert ==xxx== to <mark>xxx</mark>',
            editorCallback: (editor: Editor) => {
                this.convertHighlight(editor, true);
            }
        });

        this.registerEditorChangeHandler();

        // Add the settings tab.
        this.addSettingTab(new MarkdownHighlightTagToHtmlStyleSettingTab(this.app, this));
    }

    /**
     * Clean up when the plugin unloads.
     */
    onunload() {
        if (this.editorChangeEvent) {
            this.app.workspace.offref(this.editorChangeEvent);
            this.editorChangeEvent = null;
        }
    }

    /**
     * Load plugin settings.
     */
    async loadSettings() {
        this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
    }

    /**
     * Save plugin settings.
     */
    async saveSettings() {
        await this.saveData(this.settings);
    }

    /**
     * Update the auto-convert delay.
     * @param newDelay New delay in milliseconds.
     */
    public async updateAutoConvertDelay(newDelay: number) {
        if (this.settings.autoConvertDelay === newDelay) {
            return;
        }

        this.settings.autoConvertDelay = newDelay;
        await this.saveSettings();
        this.registerEditorChangeHandler();
    }

    private registerEditorChangeHandler() {
        if (this.editorChangeEvent) {
            this.app.workspace.offref(this.editorChangeEvent);
        }

        this.onEditHandler = debounce(() => {
            const activeView = this.app.workspace.getActiveViewOfType(MarkdownView);
            if (activeView) {
                this.convertHighlight(activeView.editor);
            }
        }, this.settings.autoConvertDelay);

        this.editorChangeEvent = this.app.workspace.on('editor-change', this.onEditHandler);
    }

    /**
     * Convert highlight syntax on the current line while preserving the cursor.
     * @param editor Active editor instance.
     */
    private convertHighlight(editor: Editor, showSuccessNotice = false) {
        const cursor = editor.getCursor(); // Preserve the current cursor position.
        const currentLineNumber = cursor.line;
        const currentLineText = editor.getLine(currentLineNumber);

        // Read the full document to detect fenced code blocks correctly.
        const allLines = editor.getValue().split('\n');

        // Skip conversion inside fenced code blocks.
        const inCodeBlock = isLineInCodeBlock(allLines, currentLineNumber);

        if (inCodeBlock) {
            return;
        }

        const { newLine, replaced } = replaceHighlightLine(currentLineText);

        if (replaced) {
            // Track the cursor based on text before the original cursor.
            const beforeCursorText = currentLineText.substring(0, cursor.ch);

            // Update the current line.
            editor.setLine(currentLineNumber, newLine);

            // Restore the cursor near the converted markup.
            const markEnd = newLine.indexOf('</mark>', beforeCursorText.length);
            if (markEnd !== -1) {
                const newCh = markEnd + '</mark>'.length;
                editor.setCursor({ line: currentLineNumber, ch: newCh });
            } else {
                // Fall back to the end of the line if the closing tag was not found.
                editor.setCursor({ line: currentLineNumber, ch: newLine.length });
            }

            if (showSuccessNotice) {
                new Notice('Markdown highlight converted.');
            }
        }
    }
}

/**
 * Plugin settings tab.
 */
class MarkdownHighlightTagToHtmlStyleSettingTab extends PluginSettingTab {
    plugin: MarkdownHighlightTagToHtmlStylePlugin;

    constructor(app: App, plugin: MarkdownHighlightTagToHtmlStylePlugin) {
        super(app, plugin);
        this.plugin = plugin;
    }

    display(): void {
        const { containerEl } = this;
        containerEl.empty();

        // Auto-convert delay setting.
        new Setting(containerEl)
            .setName('Auto convert delay (ms)')
            .setDesc('Set the delay before ==xxx== is converted automatically. Default: 200 ms.')
            .addText(text => {
                text
                    .setPlaceholder('200')
                    .setValue(this.plugin.settings.autoConvertDelay.toString());

                text.inputEl.type = 'number';
                text.inputEl.min = '0';
                text.inputEl.step = '50';

                this.plugin.registerDomEvent(text.inputEl, 'change', () => {
                    void this.handleDelayChange(text.getValue(), text);
                });
            });
    }

    private async handleDelayChange(value: string, text: TextComponent): Promise<void> {
        const parsed = Number.parseInt(value, 10);
        if (Number.isNaN(parsed) || parsed < 0) {
            new Notice('Please enter a valid non-negative delay in milliseconds.');
            text.setValue(this.plugin.settings.autoConvertDelay.toString());
            return;
        }

        await this.plugin.updateAutoConvertDelay(parsed);
        text.setValue(parsed.toString());
    }
}
