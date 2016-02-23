"use strict";

var gulp = require("gulp"),
		g_concat = require("gulp-concat"),
		g_cssmin = require("gulp-cssmin"),
		g_uglify = require("gulp-uglify"),
		g_rename = require('gulp-rename'),
		g_newer = require('gulp-newer'),
		g_sourcemaps = require("gulp-sourcemaps"),
		g_less = require('gulp-less'),
		del = require('del');
		
var paths = {
	baseSources: ["./node_modules/pjs/src/p.js","src/tree.js","src/cursor.js","src/controller.js","src/publicapi.js","src/services/*.util.js","src/services/*.js"],
	intro: "src/intro.js",
	outro: "src//outro.js",
	fullSources: [],
	cssSources: "src/css/*/*.less",
	cssMain: "src/css/main.less",
	fonts: "src/font/*",
	target: "build/",
	lessc: "./node_modules/.bin/lessc"
};

paths.fullSources = [paths.intro].concat( paths.baseSources.concat( ["src/commands/*.js","src/commands/*/*.js"] ) ).concat( [paths.outro] );

gulp.task( "bundle+min:mathquill-full", function( cb ) {
	gulp.src( paths.fullSources,
		{ base: "src/" } )
		.pipe(g_newer(paths.target + "mathquill.js"))
		.pipe( g_sourcemaps.init() )
		.pipe( g_concat( "mathquill.js" ) )
		.pipe( gulp.dest( paths.target ) )
		.pipe( g_rename( { extname: ".min.js" } ) )
		.pipe( g_uglify() )
		.pipe( g_sourcemaps.write( "maps" ) )
		.pipe( gulp.dest( paths.target ) );
	gulp.src( paths.cssMain,
		{ base: "src/css/" } )
		.pipe( g_sourcemaps.init() )
		.pipe( g_rename( { basename: "mathquill" } ) )
		.pipe( g_less(
			{ paths: [ __dirname + "/src/css", __dirname + "/src/css/mixins" ] }))
		.pipe( g_sourcemaps.write( "maps" ) )
		.pipe( gulp.dest( paths.target ) )
		.pipe( g_rename( { extname: ".min.css" } ) )
		.pipe( g_cssmin() )
		.pipe(gulp.dest(paths.target));
			// copie tel quel
	gulp.src( [
			paths.fonts
		],
		{ base: "src/" } )
		.pipe( g_newer( paths.target ) )
		.pipe( gulp.dest( paths.target ) );
	return cb();
} );
