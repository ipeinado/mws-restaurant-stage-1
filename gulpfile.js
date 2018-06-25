'use strict';

var gulp = require('gulp');
var critical = require('critical');
var cleanCSS = require('gulp-clean-css');

gulp.task('minify-css', function() {
	return gulp.src('css/styles.css')
		.pipe(cleanCSS({compatibility: 'ie8'}))
		.pipe(gulp.dest('css/'));
});