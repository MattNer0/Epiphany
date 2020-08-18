// copied from codemirror search
// from codemirror version 5.11.0

// codeMirror, copyright (c) by Marijn Haverbeke and others
// distributed under an MIT license: http://codemirror.net/LICENSE

// define search commands. Depends on dialog.js or another
// implementation of the openDialog method.

// replace works a little oddly -- it will do the replace on the next
// ctrl-G (or whatever is bound to findNext) press. You prevent a
// replace by making sure the match is no longer selected when hitting
// ctrl-G.

(function(CodeMirror) {

	let searchDialogCloseFunction = null

	/**
	 * @function searchOverlay
	 * @param  {String} query           {description}
	 * @param  {Boolean} caseInsensitive {description}
	 * @return {type} {description}
	 */
	function searchOverlay(query, caseInsensitive) {
		if (typeof query === 'string') {
			query = new RegExp(query.replace(/[-[\]/{}()*+?.\\^$|]/g, '\\$&'), caseInsensitive ? 'gi' : 'g')
		} else if (!query.global) {
			query = new RegExp(query.source, query.ignoreCase ? 'gi' : 'g')
		}

		return {
			token: function(stream) {
				query.lastIndex = stream.pos
				var match = query.exec(stream.string)
				if (match && match.index === stream.pos) {
					stream.pos += match[0].length
					return 'searching'
				} else if (match) {
					stream.pos = match.index
				} else {
					stream.skipToEnd()
				}
			}
		}
	}

	/**
	 * @function SearchState
	 * @return {type} {description}
	 */
	function SearchState() {
		this.posFrom = this.posTo = this.lastQuery = this.query = null
		this.overlay = null
	}

	/**
	 * @function getSearchState
	 * @param  {Object} cm CodeMirror Instance
	 * @return {type} {description}
	 */
	function getSearchState(cm) {
		return cm.state.search || (cm.state.search = new SearchState())
	}

	/**
	 * @function queryCaseInsensitive
	 * @param  {String} query Query string
	 * @return {Boolean} Returns True if string is all lower case
	 */
	function queryCaseInsensitive(query) {
		return typeof query === 'string' && query === query.toLowerCase()
	}

	/**
	 * @function getSearchCursor
	 * @param  {Object} cm    CodeMirror instance
	 * @param  {String} query Query string
	 * @param  {type} pos   Cursor position
	 * @return {type} {description}
	 */
	function getSearchCursor(cm, query, pos) {
		// heuristic: if the query string is all lowercase, do a case insensitive search.
		return cm.getSearchCursor(query, pos, queryCaseInsensitive(query))
	}

	/**
	 * @function clearSearch
	 * @param  {type} cm CodeMirror Instance
	 * @return {type} {description}
	 */
	function clearSearch(cm) {
		cm.operation(function() {
			var state = getSearchState(cm)
			state.lastQuery = state.query
			if (!state.query) return
			state.query = state.queryText = null
			cm.removeOverlay(state.overlay)
			if (state.annotate) {
				state.annotate.clear()
				state.annotate = null
			}
		})
	}

	/**
	 * @function persistentDialog
	 * @param  {type} cm    CodeMirror Instance
	 * @param  {type} text  {description}
	 * @param  {type} deflt {description}
	 * @param  {type} f     {description}
	 * @return {type} {description}
	 */
	function persistentDialog(cm, text, deflt, f) {
		searchDialogCloseFunction = cm.openDialog(text, f, {
			value            : deflt,
			selectValueOnOpen: true,
			closeOnEnter     : false,
			closeOnBlur      : true,
			bottom           : true,
			onClose          : function() {
				clearSearch(cm)
			},
			onKeyDown: function(e, value, close) {
				// ctrl-G => Close
				if (e.ctrlKey && e.keyCode === 71) {
					close()
				}
				// ctrl-R, ctrl-P, ↑ => Prev
				if ((e.ctrlKey && e.keyCode === 82) ||
					(e.ctrlKey && e.keyCode === 80) ||
					(e.keyCode === 38)) {
					f(value, e, true)
				}
				// ctrl-S, ctrl-N, ↓ => Next
				if ((e.ctrlKey && e.keyCode === 83) ||
					(e.ctrlKey && e.keyCode === 78) ||
					(e.keyCode === 40)) {
					f(value, e, false)
				}
				return false
			}
		})
	}

	/**
	 * @function dialog
	 * @param  {Object} cm        CodeMirror instance
	 * @param  {String} text      {description}
	 * @param  {type} shortText {description}
	 * @param  {type} deflt     {description}
	 * @param  {type} f         {description}
	 * @return {type} {description}
	 */
	function dialog(cm, text, shortText, deflt, f) {
		if (cm.openDialog) {
			cm.openDialog(text, f, {
				value            : deflt,
				selectValueOnOpen: true,
				bottom           : true,
				onKeyDown(e, value, close) {
					if (e.ctrlKey && e.keyCode === 71) {
						close()
					}
					return false
				},
				onClose: function() {
					clearSearch(cm)
				}
			})
		} else {
			f(prompt(shortText, deflt))
		}
	}

	/**
	 * @function confirmDialog
	 * @param  {Object} cm        CodeMirror Instance
	 * @param  {String} text      {description}
	 * @param  {String} shortText {description}
	 * @param  {type} fs        {description}
	 * @return {type} {description}
	 */
	function confirmDialog(cm, text, shortText, fs) {
		if (cm.openConfirm) {
			cm.openConfirm(text, fs, { bottom: true })
		} else if (confirm(shortText)) fs[0]()
	}

	/**
	 * @function parseString
	 * @param  {String} string {description}
	 * @return {type} {description}
	 */
	function parseString(string) {
		return string.replace(/\\(.)/g, function(_, ch) {
			if (ch === 'n') return '\n'
			if (ch === 'r') return '\r'
			return ch
		})
	}

	/**
	 * @function parseQuery
	 * @param  {String} query {description}
	 * @return {type} {description}
	 */
	function parseQuery(query) {
		var isRE = query.match(/^\/(.*)\/([a-z]*)$/)
		if (isRE) {
			try {
				query = new RegExp(isRE[1], isRE[2].indexOf('i') === -1 ? '' : 'i')
			} catch (e) {
				// not a regular expression after all, do a string search
			}
		} else {
			query = parseString(query)
		}
		if (typeof query === 'string' ? query === '' : query.test('')) {
			query = ''
		}
		return query
	}

	var queryDialog = '<input type="text" placeholder="Search... /regexp/" class="CodeMirror-search-field"/>'

	/**
	 * @function startSearch
	 * @param  {Object} cm    CodeMirror instance
	 * @param  {Object} state {description}
	 * @param  {String} query {description}
	 * @return {type} {description}
	 */
	function startSearch(cm, state, query) {
		state.queryText = query
		state.query = parseQuery(query)
		cm.removeOverlay(state.overlay, queryCaseInsensitive(state.query))
		state.overlay = searchOverlay(state.query, queryCaseInsensitive(state.query))
		cm.addOverlay(state.overlay)
		if (cm.showMatchesOnScrollbar) {
			if (state.annotate) {
				state.annotate.clear()
				state.annotate = null
			}
			state.annotate = cm.showMatchesOnScrollbar(state.query, queryCaseInsensitive(state.query))
		}
	}

	/**
	 * @function setSearch
	 * @param  {Object} cm    CodeMirror instance
	 * @param  {String} query {description}
	 * @return {type} {description}
	 */
	function setSearch(cm, query) {
		var state = getSearchState(cm)
		startSearch(cm, state, query)
	}

	/**
	 * @function undoSearch
	 * @param  {Object} cm CodeMirror instance
	 * @return {type} {description}
	 */
	function undoSearch(cm) {
		var state = getSearchState(cm)
		state.query = parseQuery('')
		cm.removeOverlay(state.overlay, queryCaseInsensitive(state.query))
		if (cm.showMatchesOnScrollbar) {
			if (state.annotate) {
				state.annotate.clear()
				state.annotate = null
			}
		}
	}

	/**
	 * @function doSearch
	 * @param  {Object} cm         CodeMirror instance
	 * @param  {type} rev        {description}
	 * @param  {type} persistent {description}
	 * @return {type} {description}
	 */
	function doSearch(cm, rev, persistent) {
		if (document.querySelector('.CodeMirror-dialog')) return

		/**
		 * @function findNext
		 * @param  {Object} cm_      CodeMirror instance
		 * @param  {type} rev      {description}
		 * @param  {Function} callback {description}
		 * @param  {type} nfound   {description}
		 * @return {type} {description}
		 */
		function findNext(cm_, rev, callback, nfound) {
			cm_.operation(function() {
				var state = getSearchState(cm_)
				var cursor = getSearchCursor(cm_, state.query, rev ? state.posFrom : state.posTo)
				if (!cursor.find(rev)) {
					cursor = getSearchCursor(cm_, state.query, rev ? CodeMirror.Pos(cm_.lastLine()) : CodeMirror.Pos(cm_.firstLine(), 0))
					if (!cursor.find(rev)) {
						nfound()
						return null
					}
				}
				cm.setSelection(cursor.from(), cursor.to())
				state.posFrom = cursor.from()
				state.posTo = cursor.to()
				if (callback) {
					return callback(cursor.from(), cursor.to())
				}
			})
		}

		var state = getSearchState(cm)
		if (state.query) return findNext(cm, rev)
		var q = cm.getSelection() || state.lastQuery
		if (persistent && cm.openDialog) {
			var hiding = null
			persistentDialog(cm, queryDialog, q, function(query, event, rev_) {
				CodeMirror.e_stop(event)
				if (!query) return
				if (query !== state.queryText) startSearch(cm, state, query)
				if (hiding) hiding.style.opacity = 1
				findNext(cm, event.shiftKey || rev_, function() {
					var dialog
					if (document.querySelector) {
						dialog = cm.display.wrapper.querySelector('.CodeMirror-dialog')
						dialog.querySelector('input').style['background-color'] = '#fff'
						hiding = dialog
						hiding.style.opacity = 0.9
					}
				}, function() {
					var d
					if (document.querySelector) {
						d = cm.display.wrapper.querySelector('.CodeMirror-dialog')
						d.querySelector('input').style['background-color'] = '#fee'
					}
				})
			})
		} else {
			dialog(cm, queryDialog, 'Search for:', q, function(query) {
				if (query && !state.query) {
					cm.operation(function() {
						startSearch(cm, state, query)
						state.posFrom = state.posTo = cm.getCursor()
						findNext(cm, rev)
					})
				}
			})
		}
	}

	var replaceQueryDialog =
		' <input type="text" placeholder="Replace Search... /regexp/" class="CodeMirror-search-field"/>'
	var replacementQueryDialog = '<input type="text" placeholder="Replace with" class="CodeMirror-search-field"/>'
	var doReplaceConfirm = 'Replace? <button>Yes</button> <button>No</button> <button>All</button> <button>Done</button>'

	/**
	 * @function replaceAll
	* @param  {Object} cm    CodeMirror instance
	* @param  {String} query {description}
	* @param  {String} text  {description}
	* @return {type} {description}
	*/
	function replaceAll(cm, query, text) {
		cm.operation(function() {
			for (var cursor = getSearchCursor(cm, query); cursor.findNext();) {
				if (typeof query !== 'string') {
					var match = cm.getRange(cursor.from(), cursor.to()).match(query)
					cursor.replace(text.replace(/\$(\d)/g, function(_, i) {
						return match[i]
					}))
				} else cursor.replace(text)
			}
		})
	}

	/**
	 * @function replace
	* @param  {String} cm  CodeMirror instance
	* @param  {type} all {description}
	* @return {type} {description}
	*/
	function replace(cm, all) {
		clearSearch(cm)
		if (document.querySelector('.CodeMirror-dialog')) {
			return
		}
		if (cm.getOption('readOnly')) return
		var query = cm.getSelection() || getSearchState(cm).lastQuery
		dialog(cm, replaceQueryDialog, '', query, function(query) {
			if (!query) return
			query = parseQuery(query)
			var state = getSearchState(cm)
			startSearch(cm, state, query)
			dialog(cm, replacementQueryDialog, 'Replace with:', '', function(text) {
				text = parseString(text)
				if (all) {
					replaceAll(cm, query, text)
				} else {
					startSearch(cm, state, query)
					var cursor = getSearchCursor(cm, query, cm.getCursor())
					var doReplace
					var advance

					doReplace = function(match) {
						cursor.replace(typeof query === 'string' ? text : text.replace(/\$(\d)/g, function(_, i) {
							return match[i]
						}))
						advance()
					}
					advance = function() {
						var start = cursor.from()
						var match
						if (!(match = cursor.findNext())) {
							cursor = getSearchCursor(cm, query)
							if (!(match = cursor.findNext()) ||
								(start && cursor.from().line === start.line && cursor.from().ch === start.ch)) return
						}
						startSearch(cm, state, query)
						cm.setSelection(cursor.from(), cursor.to())
						cm.scrollIntoView({
							from: cursor.from(),
							to  : cursor.to()
						})
						startSearch(cm, state, query)
						confirmDialog(cm, doReplaceConfirm, 'Replace?', [
							function() {
								doReplace(match)
							},
							advance,
							function() {
								replaceAll(cm, query, text)
							},
							function() {
								clearSearch(cm)
							}])
					}
					advance()
				}
			})
		})
	}

	CodeMirror.commands.find = function(cm) {
		clearSearch(cm)
		doSearch(cm)
	}
	CodeMirror.commands.findPersistent = function(cm) {
		clearSearch(cm)
		doSearch(cm, false, true)
	}
	CodeMirror.commands.closePersistent = function(cm) {
		clearSearch(cm)
		if (typeof searchDialogCloseFunction === 'function') searchDialogCloseFunction()
	}
	CodeMirror.commands.findNext = doSearch
	CodeMirror.commands.setSearch = setSearch
	CodeMirror.commands.undoSearch = undoSearch
	CodeMirror.commands.findPrev = function(cm) {
		doSearch(cm, true)
	}
	CodeMirror.commands.clearSearch = clearSearch
	CodeMirror.commands.replace = replace
	CodeMirror.commands.replaceAll = function(cm) {
		replace(cm, true)
	}
})(
	require('codemirror'),
	require('codemirror/addon/search/searchcursor'),
	require('codemirror/addon/dialog/dialog')
)
