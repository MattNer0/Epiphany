import { windowName } from '../common/window'

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

if (options) {
	const toRun = options.windowName
	log.info('In renderer', options.windowName)

	// load up the correct javascript for the window. This gets around the multiple renders problem.
	switch (toRun) {
		case windowName.application:
			runMain()
			break
		case windowName.dialog:
			runPopup()
			break
		case windowName.background:
			runBackground()
			break
		case windowName.browser:
			runBrowser()
			break
		default:
			log.error(`Nothing to run, found '${toRun}'`)
	}

} else {
	log.info('Renderer has been called without using \'electron-window\' see https://github.com/jprichardson/electron-window#usage')
}
