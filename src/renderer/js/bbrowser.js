import { ipcRenderer } from "electron";

import htmlToMarkdown from "./background_tasks/htmlToMarkdown";
import log from 'electron-log';

export default function() {
	var webviewEl;

	function openData(data) {
		setWebviewData(data);
		webviewEl.title = data.mode || 'undefined';
		webviewEl.loadURL(data.url);
	}

	function setWebviewData(data) {
		if (!data) {
			ipcRenderer.send('kill-bbrowser');
			return;
		}
		
		var style;
		if (data) style = data.style;
		if (style && style.height) webviewEl.style.height = style.height;
		else webviewEl.style.height = '960px';

		if (data && data.webpreferences) webviewEl.webpreferences = data.webpreferences;
		else webviewEl.webpreferences = '';

		if (data && data.bookmark) webviewEl.bookmark = data.bookmark;
		else webviewEl.bookmark = '';

		webviewEl.src = '';
		webviewEl.title = '';
	}

	window.onload = function () {
		webviewEl = document.createElement('webview');
		webviewEl.id = 'webview';
		webviewEl.src = 'about:blank';
		webviewEl.addEventListener('dom-ready', (e) => {
			try {
				if (webviewEl.isLoading() && webviewEl.isWaitingForResponse()) {
					return;
				}
				switch (webviewEl.title) {
					case 'note-from-url':
						webviewEl.getWebContents().executeJavaScript(htmlToMarkdown.parseScript(), (result) => {
							var new_markdown = htmlToMarkdown.convert(result, webviewEl.src, webviewEl.getTitle());
							ipcRenderer.send('load-page-success', {
								url     : webviewEl.src,
								mode    : webviewEl.title,
								markdown: new_markdown
							});
							setWebviewData();
						});
						break;
					default:
						setWebviewData();
						break;
				}
			} catch(e) {
				log.error(e.message);
			}
		});
		webviewEl.addEventListener('did-fail-load', (e) => {
			if (e.isMainFrame && e.errorCode > 0) {
				log.warn('page load failed: '+webviewEl.src);
				log.warn('error '+e.errorCode+': '+e.errorDescription);
				ipcRenderer.send('load-page-fail', {
					url : webviewEl.src,
					mode: webviewEl.title
				});
				setWebviewData();
			}
		});
		document.body.appendChild(webviewEl);

		ipcRenderer.on('load-page', (event, data) => {
			if (!data.url) return log.error('load page: url missing');
			try {
				openData(data);
			} catch(e) {
				log.error('load-page failed');
				log.error(e.message);
			}
		});
	};
}