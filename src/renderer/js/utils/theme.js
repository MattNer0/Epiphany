import jss from 'jss'
import jssPresetDefault from 'jss-preset-default'

jss.setup(jssPresetDefault())

function styleObject(obj) {
	var styles = {
		'@global': {
			'html': {
				border: '1px solid '+obj['app-border']
			},
			'body': {
				background: obj['fixed-sidebar-background']
			},
			'::-webkit-scrollbar-thumb': {
				backgroundColor: obj['scrollbar-thumb'],
				border         : '1px solid '+obj['scrollbar-thumb-border']
			},
			'::-webkit-scrollbar-thumb:hover': {
				backgroundColor: obj['scrollbar-thumb']
			},
			'nav > ul': {
				'& li ul': {
					border    : '1px solid '+obj['app-border'],
					background: obj['submenu-background']
				},
				'& li > a, li > div': {
					color: obj['action-bar-color']
				},
				'li.has-sub': {
					color: obj['action-bar-color']
				},
				'& li:hover > a, li:hover > div': {
					color: obj['title-bar-color-hover']
				},
				'& li.has-sub:hover': {
					color: obj['title-bar-color-hover']
				},
				'& li hr': {
					border: '1px solid '+obj['resize-panel-handler']
				},
				'& li.has-sub > span:hover .link': {
					color: obj['title-bar-color-hover']
				}
			},
			'.outer_wrapper': {
				'& .sidebar': {
					backgroundColor: obj['sidebar-background']
				},
				'& .fixed-sidebar': {
					backgroundColor: obj['fixed-sidebar-background']
				},
				'& .my-shelf-buckets.fixed-bottom': {
					backgroundColor          : obj['fixed-sidebar-background'],
					'& .my-shelf-rack:before': {
						backgroundColor: obj['fixed-sidebar-background']
					}
				},
				'& .resize-handler': {
					background: obj['resize-panel-handler']
				},
				'& .my-editor': {
					background: obj['main-background-color']
				}
			},
			'.my-search': {
				'& i:last-child': {
					backgroundColor: obj['search-bar-background'],
					color          : obj['action-bar-color']
				},
				'& i:last-child:hover': {
					color: obj['title-bar-color-hover']
				},
				'& input': {
					backgroundColor: obj['search-bar-background'],
					border         : '1px solid '+obj['search-bar-border'],
					color          : obj['action-bar-color']
				},
				'& input::-webkit-input-placeholder': {
					color: obj['action-bar-color']
				},
				'& input:focus': {
					color: obj['title-bar-color-hover']
				}
			},
			'.my-button button': {
				backgroundColor: obj['sidebar-background-hover'],
				color          : obj['folder-selected-color']
			},
			'.my-button button:hover': {
				backgroundColor: obj['sidebar-background-selected'],
				color          : obj['folder-selected-color']
			},
			'.CodeMirror': {
				backgroundColor: obj['note-background-color']
			},
			'.CodeMirror-dialog.CodeMirror-dialog-bottom': {
				background: obj['fixed-sidebar-background']
			},
			'.main-cell-container': {
				background: obj['main-background-color']
			},
			'.main-cell-container.note-open': {
				backgroundColor: obj['note-container-background-color']
			},
			'.main-note-container': {
				backgroundColor: obj['note-background-color'],
				color          : obj['note-text-color']
			},
			'.my-editor-preview': {
				backgroundColor: obj['note-background-color']
			},
			'.my-editor-preview ul li.checkbox.checkbox-checked': {
				'& label, strong, span, a': {
					color: obj['note-checkbox-selected']
				}
			},
			'.CodeMirror span.cm-epy-header-1, .my-editor-preview h1, .my-editor-outline input.h1': {
				color: obj['note-header1-color']
			},
			'.CodeMirror span.cm-epy-strong, .my-editor-preview strong': {
				color: obj['note-bold-color']
			},
			'.CodeMirror span.cm-m-markdown.cm-epy-hr': {
				backgroundColor: obj['note-hr-background'],
				color          : obj['note-hr-color']
			},
			'.flashmessage-message': {
				borderBottom: '2px solid '+obj['ui-text-color'],
				color       : obj['ui-text-color']
			},
			'.flashmessage-message:hover a': {
				color: obj['ui-text-color-hover']
			},
			'.my-shelf': {
				color: obj['sidebar-color']
			},
			'.my-shelf-rack': {
				'& .rack-object': {
					color: obj['sidebar-color']
				},
				'& .rack-object.dragging': {
					color: obj['sidebar-color']+' !important'
				}
			},
			'.my-shelf-folders-outer': {
				color: obj['sidebar-color'],

				'& .folder-object': {
					color: obj['sidebar-color'],

					'& input': {
						color: obj['sidebar-color']
					}
				},
				'& .rack-object.dragging, .folder-object.dragging': {
					color: obj['sidebar-color']+' !important'
				},
				'& .my-shelf-folder > hr': {
					borderColor: obj['sidebar-color']
				}
			},
			'.my-shelf-banner, .my-search': {
				color          : obj['sidebar-color'],
				backgroundColor: obj['fixed-sidebar-background'],

				'& .link:hover': {
					backgroundColor: obj['sidebar-background-hover'],
					color          : obj['folder-selected-color']
				}
			},
			'.my-editor-theme': {
				color          : obj['note-text-color'],
				backgroundColor: obj['note-background-color'],

				'& input': {
					color: obj['note-hr-color']
				},
				'& .input': {
					border: '1px solid '+obj['search-bar-border']
				},
				'& .input:hover': {
					backgroundColor: obj['note-hr-background']
				},
				'& .input:hover input': {
					color: obj['note-text-color']
				}
			},
			'.my-shelf-folder-badge': {
				color: obj['folder-badge-color']
			},
			'.my-shelf-folder-badge:before': {
				backgroundColor: obj['folder-badge-background']
			},
			'.my-shelf-rack.openFolder > .my-shelf-folders': {
				borderColor: obj['folder-separator']
			},
			'.new-folder': {
				'& .my-shelf-folder': {
					border: '1px dashed '+obj['sidebar-color'],
					color : obj['sidebar-color']
				},
				'& .my-shelf-folder:hover': {
					border         : '1px dashed '+obj['sidebar-color'],
					backgroundColor: obj['sidebar-background-hover'],
					color          : obj['note-list-text-color-hover']
				}
			},
			'.my-shelf-rack:not(.noCursor) .rack-object:hover, .my-shelf-folder .folder-object:hover, .title-bar nav li:hover': {
				backgroundColor: obj['sidebar-background-hover'],
				color          : obj['folder-selected-color']
			},
			'.my-shelf-folder.sortInside > .folder-object, .my-shelf-folder.isShelfSelected > .folder-object': {
				backgroundColor: obj['sidebar-background-selected'],
				color          : obj['folder-selected-color'],
				'& input'      : {
					color: obj['folder-selected-color']
				}
			},
			'.my-shelf-rack.isShelfSelected:not(.noCursor) > .rack-object': {
				backgroundColor: obj['sidebar-background-selected'],
				color          : obj['folder-selected-color'],
				'& input'      : {
					color: obj['folder-selected-color']
				}
			},
			'.my-shelf-folder.isShelfEditing > .folder-object': {
				backgroundColor: obj['sidebar-background-hover'],
				color          : obj['folder-selected-color'],
				'& input'      : {
					color: obj['folder-selected-color']
				}
			},
			'.my-shelf-rack.sortUpper .rack-object:after, .my-shelf-folder.sortUpper:after': {
				backgroundColor: obj['sidebar-background-selected']
			},
			'.my-shelf-rack.sortLower .rack-object:after, .my-shelf-folder.sortLower:after': {
				backgroundColor: obj['sidebar-background-selected']
			},
			'.modal-mask': {
				'& .modal-container': {
					backgroundColor: obj['note-background-color']
				},
				'& .modal-field-label + input': {
					border: '0.1em solid '+obj['resize-panel-handler']
				},
				'& .modal-button': {
					backgroundColor: obj['main-background-color'],
					color          : obj['ui-text-color-hover']
				},
				'& .modal-button:hover': {
					backgroundColor: obj['ui-text-background-hover'],
					color          : obj['ui-text-color-selected']
				}
			},
			'.noteBar': {
				'& .properties-dialog, .table-dialog, .headings-dialog, .fontsize-dialog': {
					background: obj['note-background-color'],
					border    : '1px solid '+obj['note-bar-text-color']
				},
				'& .headings-dialog a': {
					color: obj['note-bar-text-color']
				},
				'& .headings-dialog a:hover': {
					color: obj['note-text-color']
				},
				'& .properties-dialog, .table-dialog': {
					'& table': {
						color: obj['note-bar-text-color']
					},
					'& table.select-table-size': {
						border: '1px solid '+obj['note-bar-text-color'],
						'& td': {
							border: '1px solid '+obj['note-bar-text-color']
						},
						'& td.selected, td:hover': {
							background: obj['ui-text-background-hover']
						}
					}
				},
				'& nav ul': {
					'& li > a, li > div': {
						color: obj['note-bar-color']
					},
					'& li.entry-separator': {
						backgroundColor: obj['note-bar-color']
					},
					'& li hr': {
						border: '1px solid '+obj['note-bar-color']
					},
					'& li ul': {
						border: '1px solid '+obj['note-bar-color']
					},
					'& li:hover > a, li:hover > div': {
						color: obj['note-bar-color-hover']
					},
					'& li:hover .dialog span': {
						color: obj['note-bar-color']
					}
				}
			},
			'.my-notes': {
				'& .my-separator-date': {
					color: obj['ui-text-color-dim']
				},
				'& .my-notes-note': {
					color     : obj['note-list-text-color'],
					background: obj['note-list-background'],

					'& .my-notes-note-date, .my-notes-note-image, .my-notes-note-body': {
						color: obj['note-list-body-color']
					}
				},
				'& .my-notes-note.sortUpper:after, .my-notes-note.sortLower:after': {
					backgroundColor: obj['sidebar-background-selected']
				},
				'& .my-notes-note:hover': {
					background: obj['note-list-background-hover'],
					color     : obj['note-list-text-color-hover'],

					'& .my-notes-note-date, .my-notes-note-image, .my-notes-note-body': {
						color: obj['note-list-body-color-hover']
					}
				},
				'& .my-notes-note.my-notes-note-selected': {
					background: obj['sidebar-background-selected'],
					color     : obj['note-list-text-color-selected'],

					'& .my-notes-note-date, .my-notes-note-image, .my-notes-note-body': {
						color: obj['note-list-body-color-selected']
					}
				},
				'& .my-notes-note.my-notes-note-selected:hover': {

					'& .my-notes-note-date, .my-notes-note-image, .my-notes-note-body': {
						color: obj['note-list-body-color-selected']
					}
				}
			},
			'.sidebar': {
				'& .sidebar-menu': {
					border: '1px dashed '+obj['sidebar-color'],
					color : obj['sidebar-color']
				},
				'& .sidebar-menu:hover': {
					border         : '1px dashed '+obj['sidebar-color'],
					backgroundColor: obj['sidebar-background-hover'],
					color          : obj['sidebar-color-hover']
				},
				'& .dialog ul': {
					border              : '1px solid '+obj['resize-panel-handler'],
					background          : obj['fixed-sidebar-background'],
					'& li > a, li > div': {
						color: obj['sidebar-color']
					},
					'& li hr': {
						border: '1px solid '+obj['resize-panel-handler']
					},
					'& li hr + span': {
						color: obj['sidebar-color']
					},
					'& li:hover > a, li:hover > div': {
						backgroundColor: obj['sidebar-background-hover']+' !important',
						color          : obj['note-list-text-color-hover']
					}
				}
			},
			'.tabs-bar': {
				'& .tab:after': {
					backgroundColor: obj['tabs-background'],
					borderColor    : obj['note-border-color']
				},
				'& .tab.selected:after, .tab:hover:after': {
					backgroundColor: obj['tab-selected-background']
				},
				'& .tab.selected:after': {
					backgroundColor: obj['tab-selected-background']
				}
			},
			'.title-bar': {
				backgroundColor: obj['fixed-sidebar-background'],
				color          : obj['title-bar-color'],

				'& .spacer.right-align > nav > ul:after': {
					borderRight: '2px solid '+obj['title-bar-color']
				},
				'& .system-icon:hover': {
					color: obj['title-bar-color-hover']
				},
				'& .system-icon.close-icon:hover i': {
					backgroundColor: obj['title-bar-close-button'],
					color          : obj['fixed-sidebar-background']
				},
				'& a.menu-icon:hover': {
					backgroundColor: obj['sidebar-background-hover'],
					color          : obj['folder-selected-color']
				}
			},
			'.popup-simple': {
				color: obj['ui-text-color-selected'],
				'& a': {
					color: obj['title-bar-color']
				},
				'& a:hover': {
					color: obj['folder-selected-color']
				}
			}
		}
	}
	return styles
}

var currentSheet

export default {
	read_file(fileName) {
		return require.context(
			'../../themes',
			false,
			/\.json$/
		)('./' + fileName + '.json')
	},
	load(themeName) {
		var themeObject
		if (typeof themeName === 'string') {
			try {
				themeObject = JSON.parse(themeName)
			} catch (e) {
				themeObject = this.read_file(themeName)
			}
		} else if (typeof themeName === 'object') {
			themeObject = themeName
		} else {
			console.warn('theme error')
			return
		}

		if (currentSheet) {
			currentSheet.detach()
			currentSheet = null
		}

		currentSheet = jss.createStyleSheet(styleObject(themeObject))
		currentSheet.attach()
	},
	keys() {
		var themeObject = require.context(
			'../../themes',
			false,
			/\.json$/
		)('./dark.json')
		return Object.keys(themeObject)
	}
}
