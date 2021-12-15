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
import { App, Plugin, PluginSettingTab, Setting } from 'obsidian';

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

	async onload() {
		await this.loadSettings();
		this.app.workspace.on('codemirror', (cm: CodeMirror.Editor) => {
			cm.on('vim-mode-change', (modeObj: any) => {
				if (modeObj)
					this.onVimModeChanged(modeObj);
			});
		});

		// This adds a settings tab so the user can configure various aspects of the plugin
		this.addSettingTab(new SampleSettingTab(this.app, this));

		const { os } = require('os');
		this.isWinPlatform = os.type() == 'Windows_NT';

		this.currentInsertIM = this.isWinPlatform ? this.settings.windowsDefaultIM : this.settings.defaultIM;

		if (this.isWinPlatform) {
			console.log("VimIm Use Windows config");
		}
	}

	onVimModeChanged(modeObj: any) {
		const { exec } = require('child_process');
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
					exec(switchToInsert, (error: any, stdout: any, stderr: any) => {
						if (error) {
							console.error(`switch error: ${error}`);
							return;
						}
						console.log(`switch im: ${switchToInsert}`);
					});
				}

				break;
			default:
				console.log("change to noInsert");
				//[0]: Obtian im in Insert Mode
				if (typeof obtainc != 'undefined' && obtainc) {
					exec(obtainc, (error: any, stdout: any, stderr: any) => {
						if (error) {
							console.error(`obtain error: ${error}`);
							return;
						}
						this.currentInsertIM = stdout;
						console.log(`obtain im: ${this.currentInsertIM}`);
					});
				}
				//[1]: Switch to default im
				if (typeof switchFromInsert != 'undefined' && switchFromInsert) {
					exec(switchFromInsert, (error: any, stdout: any, stderr: any) => {
						if (error) {
							console.error(`switch error: ${error}`);
							return;
						}
						console.log(`switch im: ${switchFromInsert}`);
					});
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
