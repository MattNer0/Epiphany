/*const chokidar = require("chokidar");

var watcher;
module.exports = {
	startWatcher(path, callback) {
		watcher = chokidar.watch(path, {
			ignored: /(^|[\/\\])\../,
			ignoreInitial: true,
			useFsEvents: false, //true on osx
			followSymlinks: false,
			persistent: true
		});

		watcher
		.on('add', function(path) {
			callback(null, 'add', path);
		})
		.on('addDir', function(path) {
			callback(null, 'addDir', path);
		})
		.on('change', function(path) {
			callback(null, 'change', path);
		})
		.on('unlink', function(path) {
			callback(null, 'unlink', path);
		})
		.on('unlinkDir', function(path) {
			callback(null, 'unlinkDir', path);
		})
		.on('error', callback);
	},
	stop() {
		if (watcher) watcher.close();
	},
	ignorePath(path) {
		if (watcher) {
			watcher.unwatch(path);
		}
	}
};
*/