import { copyText, cutText, killLine } from './elutils'

const TODO_REGEXP = /^( *)((\*|-) \[( |x)] )(.*)$/
const LI_REGEXP = /^( *)((\*|-) )(.*)$/
const OL_REGEXP = /^( *)(([0-9]+)\. )(.*)$/
const QUOTE_REGEXP = /^(> )(.*)$/
const CODE_REGEXP = /^( {4,})(.*)$/
const SPACES_REGEXP = /^( +$)/

const LIST_REGEXPS = [
	(l) => {
		var m = TODO_REGEXP.exec(l)
		if (!m) {
			return null
		}
		return {
			spaces: m[1],
			syntax: m[3] + ' [ ] ',
			text  : m[5]
		}
	},
	(l) => {
		var m = LI_REGEXP.exec(l)
		if (!m) {
			return null
		}
		return {
			spaces: m[1],
			syntax: m[2],
			text  : m[4]
		}
	},
	(l) => {
		var m = OL_REGEXP.exec(l)
		if (!m) {
			return null
		}
		return {
			spaces: m[1],
			syntax: parseInt(m[3]) + 1 + '. ',
			text  : m[4]
		}
	}
]

const BLOCK_REGEXPS = [
	(l) => {
		var m = QUOTE_REGEXP.exec(l)
		if (!m) {
			return null
		}
		return {
			spaces: '',
			syntax: m[1],
			text  : m[2]
		}
	},
	(l) => {
		var m = CODE_REGEXP.exec(l)
		if (!m) {
			return null
		}
		return {
			spaces: '',
			syntax: m[1],
			text  : m[2]
		}
	}
]

/**
 * @function dedent
 * @param  {type} line {description}
 * @return {type} {description}
 */
function dedent(line) {
	/**
	 * '    text' => 4
	 * 'text' => 0
	 * '* [ ] ' => 6
	 */
	var match = (/^( +)/).exec(line)
	if (match) {
		var ch = match[1].length >= 4 ? 4 : match[1].length
		return ch
	}
	var ret
	var broken = LIST_REGEXPS.concat(BLOCK_REGEXPS).some((f) => {
		var m = f(line)
		if (!m) {
			return false
		}
		ret = m.syntax.length
		return true
	})
	if (broken) {
		return ret
	}
	return 0
}

/**
 * @function enterHandler
 * @param  {type} before {description}
 * @param  {type} after  {description}
 * @return {type} {description}
 */
function enterHandler(before, after) {
	var ret
	var broken = LIST_REGEXPS.some((f) => {
		var m = f(before)
		if (m) {
			if (m.text.length === 0 && after.length === 0) {
				// should be dedent
				ret = before.slice(dedent(before))
				return true
			}
			ret = before + '\n' + m.spaces + m.syntax
			return true
		}
		return false
	})
	if (broken) {
		return ret
	}
	broken = BLOCK_REGEXPS.some((f) => {
		var m = f(before)
		if (m) {
			if (m.text.length === 0 && after.length === 0) {
				ret = before + '\n' + before
				return true
			}
			ret = before + '\n' + m.spaces + m.syntax
			return true
		}
		return false
	})
	if (broken) {
		return ret
	}
	return null
}


(function(_, CodeMirror) {
	var map = _.cloneDeep(CodeMirror.keyMap.emacs)
	delete map['Ctrl-X Tab']
	delete map['Ctrl-X Ctrl-X']
	delete map['Ctrl-X Ctrl-S']
	delete map['Ctrl-X Ctrl-W']
	delete map['Ctrl-X S']
	delete map['Ctrl-X F']
	delete map['Ctrl-X U']
	delete map['Ctrl-X K']
	delete map['Ctrl-X Delete']
	delete map['Ctrl-X H']
	delete map['Ctrl-0']
	delete map['Ctrl-1']
	delete map['Ctrl-2']
	delete map['Ctrl-3']
	delete map['Ctrl-4']
	delete map['Ctrl-5']
	delete map['Ctrl-6']
	delete map['Ctrl-7']
	delete map['Ctrl-8']
	delete map['Ctrl-9']

	var keymapOverray = {
		'Ctrl-Right': CodeMirror.keyMap.emacs['Alt-F'],
		'Ctrl-Left' : CodeMirror.keyMap.emacs['Alt-B'],
		'End'       : 'goLineRight',
		'Home'      : 'goLineLeft',
		'Ctrl-End'  : 'goDocEnd',
		'Ctrl-Home' : 'goDocStart',
		'Ctrl-C'    : copyText,
		'Alt-W'     : copyText,
		'Ctrl-A'    : 'selectAll',
		'Ctrl-X'    : cutText,
		'Ctrl-W'    : cutText,
		'Ctrl-K'    : killLine,
		'Ctrl-Z'    : 'undo',
		'Ctrl-F'    : 'findPersistent',
		'Ctrl-R'    : 'replace',
		'Cmd-Left'  : 'goLineLeft',
		'Cmd-Right' : 'goLineRight',
		'Alt-G G'   : () => {
			// delete this behavior
		},
		'Alt-Z': (cm) => {
			cm.execCommand('redo')
		},
		'Shift-Ctrl-A': 'selectAll',
		'Backspace'   : (cm) => {
			var c = cm.getCursor()
			var lineText = cm.getRange({
				line: c.line,
				ch  : 0
			}, {
				line: c.line,
				ch  : c.ch
			})
			var m = SPACES_REGEXP.exec(lineText)
			if (m) {
				var numDelete = m[1].length < 4 ? m[1].length : 4
				return cm.replaceRange('', {
					line: c.line,
					ch  : 0
				}, {
					line: c.line,
					ch  : numDelete
				})
			}
			return CodeMirror.keyMap.emacs['Backspace'](cm)
		},
		'Enter': (cm) => {
			var selection = cm.getSelection()
			if (selection.length > 0) {
				cm.execCommand('newlineAndIndent')
				return
			}
			var c = cm.getCursor()
			var before = cm.getRange({
				line: c.line,
				ch  : 0
			}, {
				line: c.line,
				ch  : c.ch
			})
			var after = cm.getRange({
				line: c.line,
				ch  : c.ch
			}, { line: c.line })
			var line = enterHandler(before, after)
			if (line !== null) {
				cm.replaceRange(line, {
					line: c.line,
					ch  : 0
				}, {
					line: c.line,
					ch  : c.ch
				})
			} else {
				// default behavior
				cm.execCommand('newlineAndIndent')
			}
		},
		'Tab': (cm) => {
			var selection = cm.getSelection()
			if (selection.length === 0) {
				var c = cm.getCursor()
				cm.replaceRange('    ', {
					line: c.line,
					ch  : 0
				}, {
					line: c.line,
					ch  : 0
				})
			} else {
				var replaces = []
				cm.getSelections().forEach((selection) => {
					replaces.push(selection.split('\n').map((line) => {
						return '    ' + line
					}).join('\n'))
				})
				cm.replaceSelections(replaces)
			}
		},
		'Shift-Tab': (cm) => {
			var selection = cm.getSelection()
			if (selection.length === 0) {
				var c = cm.getCursor()
				var line = cm.getLine(c.line)
				cm.replaceRange('', {
					line: c.line,
					ch  : 0
				}, {
					line: c.line,
					ch  : dedent(line)
				})
			} else {
				var replaces = []
				cm.getSelections().forEach((selection) => {
					replaces.push(selection.split('\n').map((line) => {
						return line.slice(dedent(line))
					}).join('\n'))
				})
				cm.replaceSelections(replaces)
			}
		}
	}
	var updated = _.assign(map, keymapOverray)
	CodeMirror.keyMap.piledmap = updated
	CodeMirror.normalizeKeyMap(updated)
})(require('lodash'), require('codemirror'), require('codemirror/keymap/emacs'))
