import Vue from 'vue';
import VTooltip from 'v-tooltip'
import { ipcRenderer, remote } from "electron";
import theme from "./utils/theme";

// vue.js plugins
import component_titleBar from './components/titleBar.vue';
import component_inputText from './components/popupInputText.vue';
import component_about from './components/popupAbout.vue';

export default function() {
	
	Vue.use(VTooltip);

	// electron things
	
	const { Menu, MenuItem } = remote;

	// not to accept image dropping and so on.
	// electron will show local images without this.
	document.addEventListener('dragover', (e) => {
		e.preventDefault();
	});
	document.addEventListener('drop', (e) => {
		e.preventDefault();
		e.stopPropagation();
	});

	var appVue = new Vue({
		el: '#app',
		template: require('../html/popup.html'),
		data: {
			currentTheme     : "",
			type             : "",
			title            : "",
			message          : "",
			libraryPath      : "",
			menuBar          : false,
			inputPlaceholder : "",
			inputDefault     : "",
			inputRequired    : true,
			inputButtons     : [],
			reduceToTray     : true,
			alphanumericOnly : false,
			closingCallback  : null
		},
		components: {
			'titleBar'      : component_titleBar,
			'inputText'     : component_inputText,
			'about'         : component_about
		},
		computed: { },
		created() { },
		mounted() {
			var self = this;

			ipcRenderer.on('open-popup', (event, data) => {
				if (!data) {
					self.closeWindow();
				}

				self.currentTheme = data.theme;
				self.type = data.type;
				self.title = data.title;
				self.message = data.message ? data.message : "";
				self.closingCallback = null;

				self.libraryPath = data.library ? data.library : "";

				switch(data.type) {
					case "input-text":
						switch(data.form) {
							case "note-url":
								self.inputRequired = true;
								self.inputPlaceholder = "https://...";
								self.inputDefault = "";
								self.inputButtons = [{
									label: "Cancel",
									type: "close"
								}, {
									label: "Ok",
									type: "submit",
									validate(data) {
										var expression = /[-a-zA-Z0-9@:%_+.~#?&=]{2,256}(\.[a-z]{2,4}|:\d+)\b(\/[-a-zA-Z0-9@:%_+.~#?&/=]*)?/gi;
										var regex = new RegExp(expression);
										if (data.input_data.match(regex)) {
											return false;
										}
										return 'input_data';
									},
									callback(data) {
										ipcRenderer.send('load-page', {
											url           : data.input_data,
											mode          : 'note-from-url',
											webpreferences: 'images=no',
											style         : { height: '10000px' }
										});
									},
								}];
								break;
							case "bucket-name":
								self.inputRequired = true;
								self.inputPlaceholder = "Bucket Name";
								self.inputDefault = data.bucket;
								self.alphanumericOnly = true;

								self.closingCallback = function() {
									ipcRenderer.send('bucket-rename', {
										name       : null,
										bucket_uid : data.bucket_uid
									});
								};

								self.inputButtons = [{
									label: "Cancel",
									type: "close"
								}, {
									label: "Ok",
									type: "submit",
									validate(form) {
										if (form.input_data.length > 0 && form.input_data.length < 128 && /^[\w\s]+$/.test(form.input_data)) {
											return false;
										}
										return 'input_data';
									},
									callback(form) {
										ipcRenderer.send('bucket-rename', {
											name       : form.input_data,
											bucket_uid : data.bucket_uid
										});
									},
								}];
								break;
							default:
								self.closeWindow();
						}
						break;
				}
			});
		},
		methods: {
			closingWindow(quit) {
				if (quit) {
					remote.app.quit();
				} else {
					if (this.closingCallback && typeof this.closingCallback == "function") {
						this.closingCallback();
					}
					this.closeWindow();
				}
			},
			inputSubmit(input_text) {
				this.closeWindow();
			},
			closeWindow() {
				var win = remote.getCurrentWindow();
				win.close();
			}
		},
		watch: {
			currentTheme() {
				if (this.currentTheme) theme.load(this.currentTheme);
			}
		}
	});
	global.appVue = appVue;
}
