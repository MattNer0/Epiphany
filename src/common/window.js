import window from 'electron-window'
import log from 'electron-log'

/**
 * There are four windows that make up the application. Each need their own renderer.
 * @enum {string}
 */
export const windowName = {
	application: 'main',
	dialog     : 'popup',
	background : 'background',
	browser    : 'bbrowser'
}

/**
 * Makes the correct uri or path to locate the auto-generated index.html file from electron-webpack.
 *
 * In development `electron-webpack dev` requires serving on http://:
 *   - makes 'dist/renderer/index.html'
 *   - starts webpack development server
 *   - servers up this file on '/'
 *
 *  In production `Auror.exe` requires a path and `electron-window` requires NO 'file://'
 *   - makes 'dist/win-unpacked/resources/app/index.html'
 *   - that is bundled up into the package
 *   - this is run as a local 'file://' that under windows is backslash '\' delimited
 *   - NOTE: `path.resolve` is not available here in the render for resolution
 *
 * WARNING: production builds are brittle. To test, make and run an unpacked version:
 *
 *   1. `electron-webpack`
 *   2. `electron-builder --dir`
 *   3. `dist\uwnin-unpacked\Auror.exe`
 *   4. Check that windows load
 *   5. Check no errors on console (Control-Shift-I)
 *
 *   NOTE: loading issues can also be related `electron-windows` uri parsing with params
 *
 * @return {string} uriOrPath
 */
export function makeUrlToHtmlFile (isDevelopment) {
	// MUST be backslashes for packaged version
	return isDevelopment && process.env.ELECTRON_WEBPACK_WDS_PORT
		? `http://localhost:${process.env.ELECTRON_WEBPACK_WDS_PORT}/`
		: `${__dirname}\\index.html`
}

export function makeRendererWindow (isDevelopment = false, options = {}) {

	// ... stripped out default options for sample
	let aWindow = window.createWindow(options.windowOptions)

	const uriOrPath = makeUrlToHtmlFile(isDevelopment)
	if (isDevelopment) log.debug(`Rendering using: '${uriOrPath}'`)

	aWindow.showURL(uriOrPath, options.data, () => {
		// most times you don't need a post-construction hook
		// but electron-window is NOT equivalent to window.loadURL
		if (typeof options.callback === 'function') {
			options.callback(aWindow)
		}
		if (isDevelopment) log.info(`Window '${options.data.windowName}' opened`)
	})

	return aWindow
}

export function makeBackgroundRendererWindow (isDevelopment = false, options = {}) {

	// ... stripped out default options for sample
	let aWindow = window.createWindow(options.windowOptions)

	const uriOrPath = makeUrlToHtmlFile(isDevelopment)
	if (isDevelopment) log.debug(`Rendering using: '${uriOrPath}'`)

	aWindow._loadURLWithArgs(uriOrPath, options.data, () => {
		// most times you don't need a post-construction hook
		// but electron-window is NOT equivalent to window.loadURL
		if (typeof options.callback === 'function') {
			options.callback(aWindow)
		}
		if (isDevelopment) log.info(`Window '${options.data.windowName}' opened`)
	})

	return aWindow
}
