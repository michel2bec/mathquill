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
	baseSources: ["./node_modules/pjs/src/p.js","src/tree.js","src/cursor.js","src/controller.js","src/publicapi.js","src/services/saneKeyboardEvents.util.js", "src/services/parser.util.js","src/services/exportText.js","src/services/focusBlur.js","src/services/keystroke.js","src/services/latex.js","src/services/mouse.js","src/services/scrollHoriz.js","src/services/textarea.js"],
  commandsSources: ["src/commands/math.js","src/commands/text.js","src/commands/math/*.js"],
  coreSources: ["src/commands/math.js","src/commands/basicSymbols.js","src/commands/commands.js"],
	intro: "src/intro.js",
	outro: "src/outro.js",
	fullSources: [],
	cssSources: "src/css/*/*.less",
	cssMain: "src/css/main.less",
	fonts: "src/fonts/*",
	target: "build/",
	lessc: "./node_modules/.bin/lessc",
  unittest: "test/unit/*.test.js",
  basicTarget: "mathquill-basic.js",
  testTarget: "mathquill.test.js",
  normalTarget: "mathquill.js"
};

paths.fullSources = [paths.intro].concat( paths.baseSources ).concat( paths.commandsSources ).concat( [paths.outro] );
paths.basicSources = [paths.intro].concat( paths.baseSources ).concat( paths.coreSources ).concat( [paths.outro] );
paths.unitTestSources = [paths.intro].concat( paths.baseSources ).concat( paths.commandsSources ).concat( [paths.unittest] ).concat( [paths.outro] );

gulp.task( "fonts", function( cb ) {
			// copie tel quel
	gulp.src( [
			paths.fonts
		],
		{ base: "src/" } )
		.pipe( g_newer( paths.target ) )
		.pipe( gulp.dest( paths.target ) );
	return cb();
} );

gulp.task( "css", function( cb ) {
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
	return cb();
} );

gulp.task( "build-test", function( cb ) {
	gulp.src( paths.unitTestSources,
		{ base: "src/" } )
		.pipe(g_newer(paths.target + paths.testTarget))
		.pipe( g_sourcemaps.init() )
		.pipe( g_concat( paths.testTarget ) )
		.pipe( gulp.dest( paths.target ) )
		.pipe( g_sourcemaps.write( "maps" ) )
		.pipe( gulp.dest( paths.target ) );
	return cb();
} );

gulp.task( "build+bundle+min", function( cb ) {
	gulp.src( paths.fullSources,
		{ base: "src/" } )
		.pipe(g_newer(paths.target + paths.normalTarget))
		.pipe( g_sourcemaps.init() )
		.pipe( g_concat( paths.normalTarget ) )
		.pipe( gulp.dest( paths.target ) )
		.pipe( g_rename( { extname: ".min.js" } ) )
		.pipe( g_uglify() )
		.pipe( g_sourcemaps.write( "maps" ) )
		.pipe( gulp.dest( paths.target ) );
	return cb();
} );

gulp.task( "build+bundle+min:basic", function( cb ) {
	gulp.src( paths.basicSources,
		{ base: "src/" } )
		.pipe(g_newer(paths.target + paths.basicTarget))
		.pipe( g_sourcemaps.init() )
		.pipe( g_concat( paths.basicTarget ) )
		.pipe( gulp.dest( paths.target ) )
		.pipe( g_rename( { extname: ".min.js" } ) )
		.pipe( g_uglify() )
		.pipe( g_sourcemaps.write( "maps" ) )
		.pipe( gulp.dest( paths.target ) );
	return cb();
} );

gulp.task( "test:mathquill-full", ["fonts", "css", "build+bundle+min:basic", "build-test"] );

gulp.task( "bundle+min:mathquill-full", ["fonts", "css", "build+bundle+min"] );

gulp.task( "all", ["test:mathquill-full", "bundle+min:mathquill-full"] );
