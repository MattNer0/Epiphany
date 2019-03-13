(function(CodeMirror) {

	/**
	 * @function clearPlaceholder
	 * @param  {type} cm Codemirror Instance
	 * @return {type} {description}
	 */
	function clearPlaceholder(cm) {
		if (cm.state.placeholder) {
			cm.state.placeholder.parentNode.removeChild(cm.state.placeholder);
			cm.state.placeholder = null;
		}
	}

	/**
	 * @function setPlaceholder
	 * @param  {type} cm Codemirror Instance
	 * @return {type} {description}
	 */
	function setPlaceholder(cm) {
		clearPlaceholder(cm);
		var elt = cm.state.placeholder = document.createElement('pre');
		elt.style.cssText = 'height: 0; overflow: visible';
		elt.className = 'CodeMirror-placeholder';
		var placeHolder = cm.getOption('placeholder');
		if (typeof placeHolder == 'string') placeHolder = document.createTextNode(placeHolder);
		elt.appendChild(placeHolder);
		cm.display.lineSpace.insertBefore(elt, cm.display.lineSpace.firstChild);
	}

	/**
	 * @function isEmpty
	 * @param  {type} cm Codemirror Instance
	 * @return {type} {description}
	 */
	function isEmpty(cm) {
		return (cm.lineCount() === 1) && (cm.getLine(0) === '');
	}

	/**
	 * @function onChange
	 * @param  {type} cm Codemirror Instance
	 * @return {type} {description}
	 */
	function onChange(cm) {
		var wrapper = cm.getWrapperElement();
		var empty = isEmpty(cm);
		wrapper.className = wrapper.className.replace(' CodeMirror-empty', '') + (empty ? ' CodeMirror-empty' : '');

		if (empty) setPlaceholder(cm);
		else clearPlaceholder(cm);
	}

	CodeMirror.defineOption('placeholder', '', function(cm, val, old) {
		var prev = old && old != CodeMirror.Init;
		if (val && !prev) {
			cm.on('swapDoc', onChange);
			cm.on('change', onChange);
			onChange(cm);
		} else if (!val && prev) {
			cm.on('swapDoc', onChange);
			cm.off('change', onChange);
			clearPlaceholder(cm);
			var wrapper = cm.getWrapperElement();
			wrapper.className = wrapper.className.replace(' CodeMirror-empty', '');
		}
	});
})(require('codemirror'));
