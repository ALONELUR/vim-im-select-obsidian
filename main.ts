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
import * as cprcs from 'child_process';
interface VimImPluginSettings {
	defaultIM: string;
	obtainCmd: string;
	switchCmd: string;
	windowsDefaultIM: string;
	windowsObtainCmd: string;
	windowsSwitchCmd: string;
}

const DEFAULT_SETTINGS: VimImPluginSettings = {
	defaultIM: '',
	obtainCmd: '',
	switchCmd: '',
	windowsDefaultIM: '',
	windowsObtainCmd: '',
	windowsSwitchCmd: '',
}
export default class VimImPlugin extends Plugin {
	settings: VimImPluginSettings;
	private currentInsertIM = '';
	private isWinPlatform = false;
	private isDarwinPlatform = false;
	private isReadyReadObtIm = false;

	private initialized = false;
	private editorMode: 'cm5' | 'cm6' = null;

	private childprocess: cprcs.ChildProcess = null;

	async onload() {
		await this.loadSettings();

		// when open a file, to initialize current
		// editor type CodeMirror5 or CodeMirror6
		this.app.workspace.on('file-open', async (_file) => {
			if (!this.initialized)
				await this.initialize();

			let view = this.getActiveView();
			if (view) {
				var editor = this.getCodeMirror(view);

				if (editor) {
					editor.on('vim-mode-change', (modeObj: any) => {
						if (modeObj) {
							this.onVimModeChanged(modeObj);
						}
					});
				}
			}
		});


		// This adds a settings tab so the user can configure various aspects of the plugin
		this.addSettingTab(new SampleSettingTab(this.app, this));

		console.log("VimIm::OS type: " + os.type());
		this.isWinPlatform = os.type() == 'Windows_NT';
		this.isDarwinPlatform = os.type() == 'Darwin';

		this.currentInsertIM = this.isWinPlatform ? this.settings.windowsDefaultIM : this.settings.defaultIM;

		if (this.isWinPlatform) {
			console.log("VimIm Use Windows config");
		}

		if (this.isDarwinPlatform) {
			console.log("VimIm Use Darwin config");
			this.childprocess = cprcs.spawn('/bin/zsh', ['--interactive'], { shell: true });

			this.childprocess.stdout.on("data", (data) => {
				console.log(`out:${data}`);
				if (this.isReadyReadObtIm) {
					console.log(`Obtain IM: ${data}`);
					this.isReadyReadObtIm = false;
				}
			});

			this.childprocess.stderr.on("data", (data) => {
				console.error(`err:${data}`);
				if (this.isReadyReadObtIm) {
					console.log(`Obtain IM: ${data}`);
					this.isReadyReadObtIm = false;
				}
			});

			this.childprocess.on("close", (code) => {
				console.log(`exit with code ${code}`);
			});
		}
	}

	async initialize() {
		if (this.initialized)
			return;

		// Determine if we have the legacy Obsidian editor (CM5) or the new one (CM6).
		// This is only available after Obsidian is fully loaded, so we do it as part of the `file-open` event.
		if ('editor:toggle-source' in (this.app as any).commands.editorCommands) {
			this.editorMode = 'cm6';
			console.log('Vimrc plugin: using CodeMirror 6 mode');
		} else {
			this.editorMode = 'cm5';
			console.log('Vimrc plugin: using CodeMirror 5 mode');
		}

		this.initialized = true;
	}

	private getActiveView(): MarkdownView {
		return this.app.workspace.getActiveViewOfType(MarkdownView);
	}

	private getCodeMirror(view: MarkdownView): CodeMirror.Editor {
		// For CM6 this actually returns an instance of the object named CodeMirror from cm_adapter of codemirror_vim
		if (this.editorMode == 'cm6')
			return (view as any).sourceMode?.cmEditor?.cm?.cm;
		else
			return (view as any).sourceMode?.cmEditor;
	}

	private switchToInsertImpl(command: string) {
		if (this.isDarwinPlatform) {
			this.childprocess.stdin.write(command, (error: any) => {
				if (error) {
					console.error(`switch error: ${error}`);
					return;
				}
			});
		} else {
			cprcs.exec(command, (error: any, stdout: any, stderr: any) => {
				if (error) {
					console.error(`switch error: ${error}`);
					return;
				}
				console.log(`switch im: ${command}`);
			});
		}
	}

	private obtainImImpl(command: string) {
		if (this.isDarwinPlatform) {
			this.isReadyReadObtIm = true;
			this.childprocess.stdin.write(command, (error: any) => {
				if (error) {
					console.error(`switch error: ${error}`);
					return;
				}
			});
		} else {
			cprcs.exec(command, (error: any, stdout: any, stderr: any) => {
				if (error) {
					console.error(`obtain error: ${error}`);
					return;
				}
				this.currentInsertIM = stdout;
				console.log(`obtain im: ${this.currentInsertIM}`);
			});

		}
	}

	private switchFromInsertImpl(command: string) {
		if (this.isDarwinPlatform) {
			this.childprocess.stdin.write(command, (error: any) => {
				if (error) {
					console.error(`switch error: ${error}`);
					return;
				}
			});
		} else {
			cprcs.exec(command, (error: any, stdout: any, stderr: any) => {
				if (error) {
					console.error(`switch error: ${error}`);
					return;
				}
				console.log(`switch im: ${command}`);
			});
		}
	}

	onVimModeChanged(modeObj: any) {
		let switchToInsert: string;
		if (this.currentInsertIM) {
			switchToInsert = this.isWinPlatform ?
				this.settings.windowsSwitchCmd.replace(/{im}/, this.currentInsertIM) :
				this.settings.switchCmd.replace(/{im}/, this.currentInsertIM);
		}

		const obtainc = this.isWinPlatform ?
			this.settings.windowsObtainCmd : this.settings.obtainCmd;

		const switchFromInsert = this.isWinPlatform ?
			this.settings.windowsSwitchCmd.replace(/{im}/, this.settings.windowsDefaultIM) :
			this.settings.switchCmd.replace(/{im}/, this.settings.defaultIM);

		switch (modeObj.mode) {
			case "insert":
				console.log("change to insert");
				if (typeof switchToInsert != 'undefined' && switchToInsert) {
					this.switchToInsertImpl(switchToInsert);
				}
				break;
			default:
				console.log("change to noInsert");
				//[0]: Obtian im in Insert Mode
				if (typeof obtainc != 'undefined' && obtainc) {
					this.obtainImImpl(obtainc);
				}
				//[1]: Switch to default im
				if (typeof switchFromInsert != 'undefined' && switchFromInsert) {
					this.switchFromInsertImpl(switchFromInsert);
				}

				break;
		}
		// this.vimStatusBar.setText(this.currentVimStatus);
	}

	onunload() {
		console.log("onunload");
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
					console.log('Default IM: ' + value);
					this.plugin.settings.defaultIM = value;
					await this.plugin.saveSettings();
				}));
		new Setting(containerEl)
			.setName('Obtaining Command')
			.setDesc('Command for obtaining current IM(must be excutable)')
			.addText(text => text
				.setPlaceholder('Obtaining Command')
				.setValue(this.plugin.settings.obtainCmd)
				.onChange(async (value) => {
					console.log('Obtain Cmd: ' + value);
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
					console.log('Switch Cmd: ' + value);
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
					console.log('Default IM: ' + value);
					this.plugin.settings.windowsDefaultIM = value;
					await this.plugin.saveSettings();
				}));
		new Setting(containerEl)
			.setName('Obtaining Command on Windows')
			.setDesc('Command for obtaining current IM(must be excutable)')
			.addText(text => text
				.setPlaceholder('Obtaining Command')
				.setValue(this.plugin.settings.windowsObtainCmd)
				.onChange(async (value) => {
					console.log('Obtain Cmd: ' + value);
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
					console.log('Switch Cmd: ' + value);
					this.plugin.settings.windowsSwitchCmd = value;
					await this.plugin.saveSettings();
				}));
	}
}
