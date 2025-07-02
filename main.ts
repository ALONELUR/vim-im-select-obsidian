/*
MIT License

Copyright (c) [2021] [Alonelur yinwenhan1998@gmail.com]

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
*/
import { App, Plugin, PluginSettingTab, Setting, MarkdownView } from 'obsidian';

import * as os from 'os';
interface VimImPluginSettings {
        defaultIM: string;
        defaultInsertIM: string;
        defaultVisualIM: string;
        defaultReplaceIM: string;
        obtainCmd: string;
        switchCmd: string;
        windowsDefaultIM: string;
        windowsDefaultInsertIM: string;
        windowsDefaultVisualIM: string;
        windowsDefaultReplaceIM: string;
        windowsObtainCmd: string;
        windowsSwitchCmd: string;
}

const DEFAULT_SETTINGS: VimImPluginSettings = {
        defaultIM: '',
        defaultInsertIM: '',
        defaultVisualIM: '',
        defaultReplaceIM: '',
        obtainCmd: '',
        switchCmd: '',
        windowsDefaultIM: '',
        windowsDefaultInsertIM: '',
        windowsDefaultVisualIM: '',
        windowsDefaultReplaceIM: '',
        windowsObtainCmd: '',
        windowsSwitchCmd: '',
}

function isEmpty(obj : any) {
  return obj && typeof obj === "object" && Object.keys(obj).length === 0;
}

export default class VimImPlugin extends Plugin {
        settings: VimImPluginSettings;
        private currentInsertIM = '';
        private currentVisualIM = '';
        private currentReplaceIM = '';
        private previousMode = '';
        private isWinPlatform = false;
        private onVimKeypress = async (key: string) => {
                if (key === "<Esc>") {
                        console.info("press esc");
                        this.switchToNormal();
                        return;
                }
                if (key === "r") {
                        console.info("press r");
                        this.switchToInsert();
                        return;
                }
        };

        async onload() {
                await this.loadSettings();
                const vaultDir = this.app.vault.adapter.getBasePath();
                process.chdir(vaultDir);

		// when open a file, to initialize current
		// editor type CodeMirror5 or CodeMirror6
		this.app.workspace.on('active-leaf-change', async () => {
			const view = this.getActiveView();
			if (view) {
				const editor = this.getCodeMirror(view);
                                if (editor) {
                                        editor.off('vim-mode-change', this.onVimModeChanged);
                                        editor.on('vim-mode-change', this.onVimModeChanged);
                                        editor.off('vim-keypress', this.onVimModeChanged);
                                        editor.on('vim-keypress', this.onVimKeypress);
                                }
			}
		});


		// This adds a settings tab so the user can configure various aspects of the plugin
		this.addSettingTab(new SampleSettingTab(this.app, this));

                console.debug("VimIm::OS type: " + os.type());
                this.isWinPlatform = os.type() == 'Windows_NT';

                this.currentInsertIM = this.isWinPlatform
                        ? (this.settings.windowsDefaultInsertIM || this.settings.windowsDefaultIM)
                        : (this.settings.defaultInsertIM || this.settings.defaultIM);
                this.currentVisualIM = this.isWinPlatform
                        ? (this.settings.windowsDefaultVisualIM || this.settings.windowsDefaultIM)
                        : (this.settings.defaultVisualIM || this.settings.defaultIM);
                this.currentReplaceIM = this.isWinPlatform
                        ? (this.settings.windowsDefaultReplaceIM || this.settings.windowsDefaultIM)
                        : (this.settings.defaultReplaceIM || this.settings.defaultIM);

		if (this.isWinPlatform) {
			console.debug("VimIm Use Windows config");
		}
	}

	private getActiveView(): MarkdownView {
		return this.app.workspace.getActiveViewOfType(MarkdownView);
	}

	private getCodeMirror(view: MarkdownView): CodeMirror.Editor {
		// For CM6 this actually returns an instance of the object named CodeMirror from cm_adapter of codemirror_vim
		return (view as any).sourceMode?.cmEditor?.cm?.cm;
	}

        async switchToInsert() {
                const { exec } = require('child_process');
                let switchToInsert: string;
                let targetIM = this.isWinPlatform ?
                        (this.settings.windowsDefaultInsertIM || this.currentInsertIM) :
                        (this.settings.defaultInsertIM || this.currentInsertIM);
                this.currentInsertIM = targetIM;
                if (targetIM) {
                        switchToInsert = this.isWinPlatform ?
                                this.settings.windowsSwitchCmd.replace(/{im}/, targetIM) :
                                this.settings.switchCmd.replace(/{im}/, targetIM);
                }

		console.debug("change to insert");
		if (typeof switchToInsert != 'undefined' && switchToInsert) {
			exec(switchToInsert, (error: any, stdout: any, stderr: any) => {
				if (error) {
					console.error(`switch error: ${error}`);
					return;
				}
				console.debug(`switch im: ${switchToInsert}`);
			});
		}

                this.previousMode = "insert"
        }

        async switchToVisual() {
                const { exec } = require('child_process');
                let switchToVisual: string;
                let targetIM = this.isWinPlatform ?
                        (this.settings.windowsDefaultVisualIM || this.currentVisualIM) :
                        (this.settings.defaultVisualIM || this.currentVisualIM);
                this.currentVisualIM = targetIM;
                if (targetIM) {
                        switchToVisual = this.isWinPlatform ?
                                this.settings.windowsSwitchCmd.replace(/{im}/, targetIM) :
                                this.settings.switchCmd.replace(/{im}/, targetIM);
                }

                console.debug("change to visual");
                if (typeof switchToVisual != 'undefined' && switchToVisual) {
                        exec(switchToVisual, (error: any, stdout: any, stderr: any) => {
                                if (error) {
                                        console.error(`switch error: ${error}`);
                                        return;
                                }
                                console.debug(`switch im: ${switchToVisual}`);
                        });
                }

                this.previousMode = "visual";
        }

        async switchToReplace() {
                const { exec } = require('child_process');
                let switchToReplace: string;
                let targetIM = this.isWinPlatform ?
                        (this.settings.windowsDefaultReplaceIM || this.currentReplaceIM) :
                        (this.settings.defaultReplaceIM || this.currentReplaceIM);
                this.currentReplaceIM = targetIM;
                if (targetIM) {
                        switchToReplace = this.isWinPlatform ?
                                this.settings.windowsSwitchCmd.replace(/{im}/, targetIM) :
                                this.settings.switchCmd.replace(/{im}/, targetIM);
                }

                console.debug("change to replace");
                if (typeof switchToReplace != 'undefined' && switchToReplace) {
                        exec(switchToReplace, (error: any, stdout: any, stderr: any) => {
                                if (error) {
                                        console.error(`switch error: ${error}`);
                                        return;
                                }
                                console.debug(`switch im: ${switchToReplace}`);
                        });
                }

                this.previousMode = "replace";
        }

        async switchToNormal() {
                const { exec } = require('child_process');
                const switchCmd = this.isWinPlatform ?
                        this.settings.windowsSwitchCmd.replace(/{im}/, this.settings.windowsDefaultIM) :
                        this.settings.switchCmd.replace(/{im}/, this.settings.defaultIM);
                const obtainc = this.isWinPlatform ? this.settings.windowsObtainCmd : this.settings.obtainCmd;
                const defaultInsert = this.isWinPlatform ? this.settings.windowsDefaultInsertIM : this.settings.defaultInsertIM;

                console.debug("change to normal");
                if (this.previousMode === "insert") {
                        if (defaultInsert) {
                                this.currentInsertIM = defaultInsert;
                        } else if (typeof obtainc != 'undefined' && obtainc) {
                                exec(obtainc, (error: any, stdout: any, stderr: any) => {
                                        if (error) {
                                                console.error(`obtain error: ${error}`);
                                                return;
                                        }
                                        this.currentInsertIM = stdout;
                                        console.debug(`obtain im: ${this.currentInsertIM}`);
                                });
                        }
                }

                if (typeof switchCmd != 'undefined' && switchCmd) {
                        exec(switchCmd, (error: any, stdout: any, stderr: any) => {
                                if (error) {
                                        console.error(`switch error: ${error}`);
                                        return;
                                }
                                console.debug(`switch im: ${switchCmd}`);
                        });
                }

                this.previousMode = "normal";
        }

        onVimModeChanged = async (modeObj: any) => {
                if (isEmpty(modeObj)) {
                        console.info("empty");
                        return;
                }
                switch (modeObj.mode) {
                        case "insert":
                                this.switchToInsert();
                                console.info("insert");
                                break;
                        case "visual":
                                this.switchToVisual();
                                console.info("visual");
                                break;
                        case "replace":
                                this.switchToReplace();
                                console.info("replace");
                                break;
                        default:
                                console.info("normal");
                                if (this.previousMode === "normal") {
                                        break;
                                }
                                this.switchToNormal();
                                break;
                }
        };

	onunload() {
		console.debug("onunload");
	}

	async loadSettings() {
		this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
	}

	async saveSettings() {
		await this.saveData(this.settings);
	}

}

class SampleSettingTab extends PluginSettingTab {
	plugin: VimImPlugin;

	constructor(app: App, plugin: VimImPlugin) {
		super(app, plugin);
		this.plugin = plugin;
	}

	display(): void {
		const { containerEl } = this;

		containerEl.empty();

		containerEl.createEl('h2', { text: 'Vim IM Select Settings.' });

		containerEl.createEl('h3', { text: 'Settings for default platform.' });
                new Setting(containerEl)
                        .setName('Default IM')
                        .setDesc('IM for normal mode')
                        .addText(text => text
                                .setPlaceholder('Default IM')
                                .setValue(this.plugin.settings.defaultIM)
                                .onChange(async (value) => {
                                        console.debug('Default IM: ' + value);
                                        this.plugin.settings.defaultIM = value;
                                        await this.plugin.saveSettings();
                                }));
                new Setting(containerEl)
                        .setName('Default Insert IM')
                        .setDesc('IM for insert mode')
                        .addText(text => text
                                .setPlaceholder('Default Insert IM')
                                .setValue(this.plugin.settings.defaultInsertIM)
                                .onChange(async (value) => {
                                        console.debug('Default Insert IM: ' + value);
                                        this.plugin.settings.defaultInsertIM = value;
                                        await this.plugin.saveSettings();
                                }));
                new Setting(containerEl)
                        .setName('Default Visual IM')
                        .setDesc('IM for visual mode')
                        .addText(text => text
                                .setPlaceholder('Default Visual IM')
                                .setValue(this.plugin.settings.defaultVisualIM)
                                .onChange(async (value) => {
                                        console.debug('Default Visual IM: ' + value);
                                        this.plugin.settings.defaultVisualIM = value;
                                        await this.plugin.saveSettings();
                                }));
                new Setting(containerEl)
                        .setName('Default Replace IM')
                        .setDesc('IM for replace mode')
                        .addText(text => text
                                .setPlaceholder('Default Replace IM')
                                .setValue(this.plugin.settings.defaultReplaceIM)
                                .onChange(async (value) => {
                                        console.debug('Default Replace IM: ' + value);
                                        this.plugin.settings.defaultReplaceIM = value;
                                        await this.plugin.saveSettings();
                                }));
		new Setting(containerEl)
			.setName('Obtaining Command')
			.setDesc('Command for obtaining current IM(must be excutable)')
			.addText(text => text
				.setPlaceholder('Obtaining Command')
				.setValue(this.plugin.settings.obtainCmd)
				.onChange(async (value) => {
					console.debug('Obtain Cmd: ' + value);
					this.plugin.settings.obtainCmd = value;
					await this.plugin.saveSettings();
				}));
		new Setting(containerEl)
			.setName('Switching Command')
			.setDesc('Command for switching to specific IM(must be excutable)')
			.addText(text => text
				.setPlaceholder('Use {im} as placeholder of IM')
				.setValue(this.plugin.settings.switchCmd)
				.onChange(async (value) => {
					console.debug('Switch Cmd: ' + value);
					this.plugin.settings.switchCmd = value;
					await this.plugin.saveSettings();
				}));

		containerEl.createEl('h3', { text: 'Settings for Windows platform.' });
                new Setting(containerEl)
                        .setName('Windows Default IM')
                        .setDesc('IM for normal mode')
                        .addText(text => text
                                .setPlaceholder('Default IM')
                                .setValue(this.plugin.settings.windowsDefaultIM)
                                .onChange(async (value) => {
                                        console.debug('Default IM: ' + value);
                                        this.plugin.settings.windowsDefaultIM = value;
                                        await this.plugin.saveSettings();
                                }));
                new Setting(containerEl)
                        .setName('Windows Default Insert IM')
                        .setDesc('IM for insert mode')
                        .addText(text => text
                                .setPlaceholder('Default Insert IM')
                                .setValue(this.plugin.settings.windowsDefaultInsertIM)
                                .onChange(async (value) => {
                                        console.debug('Default Insert IM: ' + value);
                                        this.plugin.settings.windowsDefaultInsertIM = value;
                                        await this.plugin.saveSettings();
                                }));
                new Setting(containerEl)
                        .setName('Windows Default Visual IM')
                        .setDesc('IM for visual mode')
                        .addText(text => text
                                .setPlaceholder('Default Visual IM')
                                .setValue(this.plugin.settings.windowsDefaultVisualIM)
                                .onChange(async (value) => {
                                        console.debug('Default Visual IM: ' + value);
                                        this.plugin.settings.windowsDefaultVisualIM = value;
                                        await this.plugin.saveSettings();
                                }));
                new Setting(containerEl)
                        .setName('Windows Default Replace IM')
                        .setDesc('IM for replace mode')
                        .addText(text => text
                                .setPlaceholder('Default Replace IM')
                                .setValue(this.plugin.settings.windowsDefaultReplaceIM)
                                .onChange(async (value) => {
                                        console.debug('Default Replace IM: ' + value);
                                        this.plugin.settings.windowsDefaultReplaceIM = value;
                                        await this.plugin.saveSettings();
                                }));
		new Setting(containerEl)
			.setName('Obtaining Command on Windows')
			.setDesc('Command for obtaining current IM(must be excutable)')
			.addText(text => text
				.setPlaceholder('Obtaining Command')
				.setValue(this.plugin.settings.windowsObtainCmd)
				.onChange(async (value) => {
					console.debug('Obtain Cmd: ' + value);
					this.plugin.settings.windowsObtainCmd = value;
					await this.plugin.saveSettings();
				}));
		new Setting(containerEl)
			.setName('Switching Command on Windows')
			.setDesc('Command for switching to specific IM(must be excutable)')
			.addText(text => text
				.setPlaceholder('Use {im} as placeholder of IM')
				.setValue(this.plugin.settings.windowsSwitchCmd)
				.onChange(async (value) => {
					console.debug('Switch Cmd: ' + value);
					this.plugin.settings.windowsSwitchCmd = value;
					await this.plugin.saveSettings();
				}));
	}
}
