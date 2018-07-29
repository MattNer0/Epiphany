import { ipcRenderer } from "electron";

import htmlToMarkdown from "./background_tasks/htmlToMarkdown";
import downloadHelper from "./background_tasks/download";

/**
 * @function logError
 * @param  {type} message {description}
 * @return {type} {description}
 */
function logMainProcess(message) {
	ipcRenderer.send('console', message);
}

var webviewEl;
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

function compressThumbnail(thumbnail) {
	thumbnail = thumbnail.resize({ width: 150 });
	return thumbnail.toDataURL();
}

window.onload = function () {
	webviewEl = document.getElementById('webview');

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
			logMainProcess(e.message);
		}
	});
	webviewEl.addEventListener('did-fail-load', (e) => {
		if (e.isMainFrame && e.errorCode > 0) {
			logMainProcess('page load failed: '+webviewEl.src);
			logMainProcess('error '+e.errorCode+': '+e.errorDescription);
			ipcRenderer.send('load-page-fail', {
				url : webviewEl.src,
				mode: webviewEl.title
			});
			setWebviewData();
		}
	});

	ipcRenderer.on('load-page', (event, data) => {
		if (!data.url) return logMainProcess('load page: url missing');
		try {
			setWebviewData(data);
			webviewEl.title = data.mode || 'undefined';
			webviewEl.loadURL(data.url);
		} catch(e) {
			logMainProcess(e.message);
		}
	});
};
