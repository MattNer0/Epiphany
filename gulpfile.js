const gulp = require('gulp');
const packager = require('electron-packager');
const _ = require('lodash');

const path = require('path');
const fs = require('fs');

function create_library_directory(buildPath) {
	var appPath = path.join('.', buildPath, 'library');
	fs.mkdirSync(appPath);
}

var BASE_OPTION = {
	dir: '.',
	overwrite: true,
	arch: 'x64',
	//electronVersion: '1.7.6',
	ignore: '(icons|releases|.idea.*|README\.md|\.DS_Store|env|gulpfile\.js|webpack\.config\.js|\.gitignore|\.gjslintrc)',
	asar: true,
	prune: true,
	extraResource: ['./dist/icon.png','./dist/tray.png']
};

gulp.task('electron-darwin', function(done) {
	var c = _.defaults(_.clone(BASE_OPTION), {
		out: 'releases/darwin/',
		platform: 'darwin',
		icon: './icons/pilemd.icns',
		sign: process.env['PM_OSX_SIGN'],
		'helper-buldle-id': 'md.pile.helper',
		'app-bundle-id': 'md.pile'
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
		out: './releases/linux/',
		platform: 'linux'
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
		out: './releases/windows/',
		platform: 'win32',
		icon: './icons/epiphany.ico'
	});
	// c['arch'] = 'ia32';
	packager(c).then((appPaths) => {
		create_library_directory(appPaths[0]);
		done();
	}).catch((err) => {
		console.log(err);
	});
});
