import { windowName } from '../common/window'

import { remote } from 'electron'

// loading CSSs
import './fonts/iconcoon.css'
import './scss/epiphany.scss'

import runMain from './js/main'
import runBackground from './js/background'
import runPopup from './js/popup'
import runBrowser from './js/bbrowser'

import log from 'electron-log'

/**
 * This renderer is called via 'electron-window' which passes through an object via params and
 * attaches on `window.__args__`
 *
 * @type {RendererWindowOptions}
 */
const options = window.__args__

var previousRun = ''

function runRenderer(toRun) {
	log.info('In renderer', toRun)

	// load up the correct javascript for the window. This gets around the multiple renders problem.
	switch (toRun) {
		case windowName.application:
			previousRun = toRun
			runMain()
			break
		case windowName.dialog:
			previousRun = toRun
			runPopup()
			break
		case windowName.background:
			previousRun = toRun
			runBackground()
			break
		case windowName.browser:
			previousRun = toRun
			runBrowser()
			break
		default:
			log.error(`Nothing to run, found '${toRun}'`)
			if (previousRun) {
				runRenderer(previousRun)
			} else {
				remote.app.quit()
			}
	}
}

if (options) {
	runRenderer(options.windowName)
} else {
	log.info('Renderer has been called without using \'electron-window\' see https://github.com/jprichardson/electron-window#usage')
	remote.app.quit()
}
