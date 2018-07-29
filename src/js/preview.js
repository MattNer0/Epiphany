/*
 * module to render HTML from Markdown Text for preview
 */

import _ from "lodash";
import hljs from "highlight.js";

hljs.configure({
	tabReplace: "<span class=\"hljs-tab\">    </span>"
});

import markdownIt from 'markdown-it';
import markdownItFootnote from 'markdown-it-footnote';
import markdownItCheckbox from './markdown-it/checkbox';
import markdownItImage from './markdown-it/image';
import markdownItHeadingAnchor from 'markdown-it-headinganchor';
import markdownItLinkAttributes from 'markdown-it-link-attributes';

const md = markdownIt({
	html: true,
	breaks: true,
	linkify: true,
	typographer: true,
	highlight(str, lang) {
		if (lang && hljs.getLanguage(lang)) {
			try {
				return '<pre class="hljs"><code>' + hljs.fixMarkup(hljs.highlight(lang, str, true).value) + '</code></pre>';
			} catch (__) {}
		}
		return '<pre class="hljs"><code>' + md.utils.escapeHtml(str) + '</code></pre>';
	}
});

md.use(markdownItFootnote);
md.use(markdownItCheckbox, {
	disabled: true,
	sourceMap: true,
	divWrap: true,
	divClass: 'check',
	liClass: 'checkbox',
	liClassChecked: 'checkbox-checked'
});
md.use(markdownItImage);
md.use(markdownItHeadingAnchor, { anchorClass: 'epiphany-heading' });
md.use(markdownItLinkAttributes, [{
	pattern: /^https?:\/\//,
	attrs: {
		class: "external-link",
		onclick: "require('electron').shell.openExternal(this.getAttribute('href'));return false;",
		onauxclick: "require('electron').shell.openExternal(this.getAttribute('href'));return false;",
		oncontextmenu: "appVue.contextOnPreviewLink(event, this.getAttribute('href'))"
	}
},{
	pattern: /^ftp:\/\//,
	attrs: {
		class: "ftp-link",
		onclick: "require('electron').shell.openExternal(this.getAttribute('href'));return false;",
		onauxclick: "require('electron').shell.openExternal(this.getAttribute('href'));return false;",
		oncontextmenu: "appVue.contextOnPreviewLink(event, this.getAttribute('href'))"
	}
},{
	pattern: /^coon:\/\/library\//,
	attrs: {
		class: "library-link",
		onclick: "appVue.openInternalLink(event, this.getAttribute('href'));return false;",
		onauxclick: "appVue.openInternalLink(event, this.getAttribute('href'), true);return false;",
		oncontextmenu: "appVue.contextOnInternalLink(event, this.getAttribute('href'))"
	}
}]);

md.linkify.add('coon:', 'http:');

function cleanHighlighted(value, lang) {
	value = value.replace(/\n/g, '<br/>');
	value = value.replace(/    /g, '&nbsp;&nbsp;&nbsp;&nbsp;');
	return value;
}

var forEach = function(array, callback, scope) {
	for (var i = 0; i < array.length; i++) {
		callback.call(scope, i, array[i]);
	}
};

/**
 * @function clickCheckbox
 * @param  {Object} cm    CodeMirror component
 * @param  {Object} note  Note objct
 * @param  {Number} index Checkbox index
 * @param  {Object} el    DOM element object
 * @return {Void} Void
 */
function clickCheckbox(vue, note, index, el) {
	var cm = vue.$refs.refCodeMirror;
	el.onclick = function(event) {
		event.preventDefault();
		if (event.target.tagName == 'A') return;
		var i = 0;
		var ok = note.body.replace(/[*-]\s*(\[[x ]\])/g, function(x) {
			x = x.replace(/\s/g, ' ');
			var start = x.charAt(0);
			if (i == index) {
				i++;
				if (x == start + ' [x]') {
					return start + ' [ ]';
				}
				return start + ' [x]';
			}
			i++;
			return x;
		});
		note.body = ok;
		cm.refreshNoteBody();
		vue.updatePreview(true);
	};
}

export default {
	/**
	 * @function render
	 * @param {Object} note Selected note
	 * @param {Object} vue  Vue Instance
	 * @return {String} Html version of note content
	 */
	render(note, vue) {
		var p = md.render(note.bodyWithDataURL);
		vue.$nextTick(() => {
			forEach(document.querySelectorAll('li.checkbox'), (index, el) => {
				clickCheckbox(vue, note, index, el);
			});
		});

		return p;
	}
};
