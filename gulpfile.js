/**
 * Build gulpfile
 */

// System
var sys   = require('util');
var exec  = require('child_process').exec;
var gulp  = require('gulp');
var https = require('https');
var fs    = require('fs');

// Variables
var specFile             = './io.js.nuspec';
var specRx               = /<version>(.+)<\/version>/g;
var installFile          = './tools/chocolateyInstall.ps1';
var installRx32          = /^$url32 = '(.+)'$/g;
var installRx64          = /^$url64 = '(.+)'$/g;
var manifestJsonLocation = 'https://iojs.org/dist/index.json';

var currentVersions = [];
var remoteVersions  = [];


/**
 * Get currently tagged versions
 */
gulp.task('getCurrentVersions', function (cb) {
	
	// Query current GIT tags
	exec('git tag', function (error, stdout, stderr) {

		if (error) {
			return cb(error);
		}

		currentVersions = stdout.match(/.+/g);
		currentVersions.sort();

		return cb();
	});

});


/**
 * Get remote versions from iojs.org server
 */
gulp.task('getRemoteVersions', function (cb) {

	// Set request to manifest file
	var request;

	request = https.get(manifestJsonLocation, function (response) {

		var body = '';
		var i    = 0;

		response.on('data', function (chunk) {

			i++;
			body += chunk;
		});

		response.on('end', function () {

			/** @type {array} */
			var versionsData;

			/** @throws {SyntaxError} Unexpected token ILLEGAL */
			versionsData = JSON.parse(body);

			versionsData.forEach(function (versionData, i) {

				// Check if windows binaries are included.
				if (versionData.files.indexOf('win-x86-msi') > -1
					&& versionData.files.indexOf('win-x64-msi') > -1
				) {
					remoteVersions.push(versionData.version);
				}
			});

			remoteVersions.sort();

			return cb();
		});
	});

	request.on('error', function (e) {
		return cb(e);
	});
});


/**
 * Default task
 */
gulp.task('update', [
	'getCurrentVersions',
	'getRemoteVersions'
], function (cb) {

	var newVersions = [];

	// Compute difference between current versions and remote ones
	remoteVersions.forEach(function (remoteVersion) {

		if (currentVersions.indexOf(remoteVersion) < 0) {
			newVersions.push(remoteVersion);
		}
	});

	// Update each version
	newVersions.forEach(function (newVersion) {

		// Replace version info in files.
		fs.readFile(specFile, 'utf8', function (error, data) {

			var replaced;

			if (error) {
				return cb(error);
			}

			replaced = data.replace(specRx, '<version>' + newVersion + '</version>');
		/*
			fs.writeFile(specFile, replaced, 'utf8', function (error) {

				if (error) {
					return cb(error);
				}

				// TODO: do the same with install file.

				exec('git tag ' + newVersion, function (error, stdout, stderr) {

					exec('choco pack ' + newVersion + '--yes', function (error, stdout, stderr) {

						exec('choco push ' + newVersion + '--yes', function (error, stdout, stderr) {

							// End of processing one version.
						});
					});
				});
			});
		*/
		});
	});
});


/**
 * Default task
 */
gulp.task('default', ['update']);
