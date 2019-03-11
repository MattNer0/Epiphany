const gulp     = require('gulp');
const packager = require('electron-packager');
const rebuild  = require('electron-rebuild');
const _        = require('lodash');
const path     = require('path');
const fs       = require('fs');

function create_library_directory(buildPath) {
	var appPath = path.join('.', buildPath, 'library');
	fs.mkdirSync(appPath);
}

var BASE_OPTION = {
	dir          : '.',
	overwrite    : true,
	arch         : 'x64',
	ignore       : '(icons|releases|.idea.*|README\.md|\.DS_Store|env|gulpfile\.js|webpack\.config\.js|\.gitignore|\.gjslintrc)',
	asar         : true,
	prune        : true,
	extraResource: ['./dist/icon.png','./dist/tray.png'],
	afterCopy: [
		(buildPath, electronVersion, platform, arch, callback) => {
			rebuild({ buildPath, electronVersion, arch }).then(() => callback()).catch((error) => callback(error));
		}
	],
};

gulp.task('electron-darwin', function(done) {
	var c = _.defaults(_.clone(BASE_OPTION), {
		'out'             : 'releases/darwin/',
		'platform'        : 'darwin',
		'icon'            : './icons/pilemd.icns',
		'sign'            : process.env['PM_OSX_SIGN'],
		'helper-buldle-id': 'md.pile.helper',
		'app-bundle-id'   : 'md.pile'
	});
	packager(c).then((appPaths) => {
		create_library_directory(appPaths[0]);
		done();
	}).catch((err) => {
		console.log(err);
	});
});


gulp.task('electron-linux', function(done) {
	var c = _.defaults(_.clone(BASE_OPTION), {
		'out'     : './releases/linux/',
		'platform': 'linux'
	});
	packager(c).then((appPaths) => {
		create_library_directory(appPaths[0]);
		done();
	}).catch((err) => {
		console.log(err);
	});
});


gulp.task('electron-windows', function(done) {
	var c = _.defaults(_.clone(BASE_OPTION), {
		'out'     : './releases/windows/',
		'platform': 'win32',
		'icon'    : './icons/epiphany.ico'
	});
	packager(c).then((appPaths) => {
		create_library_directory(appPaths[0]);
		done();
	}).catch((err) => {
		console.log(err);
	});
});
