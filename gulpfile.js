'use strict';

const gulp = require('gulp'),
	  gulpCopy = require('gulp-copy'),
	  cleanCSS = require('gulp-clean-css'),
	  minify = require('gulp-minify'),
	  critical = require('critical'),
	  imagemin = require('gulp-imagemin'),
	  imageResize = require('gulp-image-resize'),
	  rename = require('gulp-rename'),
	  webp = require('gulp-webp'),
	  sourcemaps = require('gulp-sourcemaps');

const sourceFiles = ['src/sw.js'];

gulp.task('copy', () =>  {
	return gulp.src(sourceFiles, {base: 'src'})
    	.pipe(gulp.dest('dist/'));
});

gulp.task('minify-css', () => {
  return gulp.src('src/css/*.css')
  	.pipe(sourcemaps.init())
    .pipe(cleanCSS({compatibility: 'ie8'}))
    .pipe(sourcemaps.write())
    .pipe(gulp.dest('dist/css'));
});

gulp.task('compress', () => {
  return gulp.src('src/js/**/*.js')
  	.pipe(sourcemaps.init())
    .pipe(minify())
    .pipe(sourcemaps.write())
    .pipe(gulp.dest('dist/js'))
});

gulp.task('critical-index', (cb) => {
    critical.generate({
        inline: true,
        base: 'src/',
        src: 'index.html',
        dest: '../dist/index.html',
        minify: true,
        width: 1200,
        height: 800
    });
});

gulp.task('critical-restaurant', (cb) => {
    critical.generate({
        inline: true,
        base: 'src/',
        src: 'restaurant.html',
        dest: '../dist/restaurant.html',
        minify: true,
        width: 1200,
        height: 800
    });
});

gulp.task('images', () => {
	gulp.src('src/img/**/*.jpg')
		.pipe(imagemin({
			progressive: true
		}))
		.pipe(gulp.dest('dist/img'));

	gulp.src('src/img/**/*.jpg')
		.pipe(imageResize({
			width: 570,
			crop: false,
			upscale: false
		}))
		.pipe(imagemin({
			progressive: true
		}))
		.pipe(rename({
			suffix: '-medium'
		}))
		.pipe(gulp.dest('dist/img'));

	gulp.src('src/img/**/*.jpg')
		.pipe(imageResize({
			width: 270,
			crop: false,
			upscale: false
		}))
		.pipe(imagemin({
			progressive: true
		}))
		.pipe(rename({
			suffix: '-small'
		}))
		.pipe(gulp.dest('dist/img'));

	gulp.src('dist/img/**/*.jpg')
    	.pipe(webp({
        	quality: 80,
        	preset: 'photo',
        	method: 6
    	}))
    	.pipe(gulp.dest('dist/img'));
});

gulp.task('build', ['critical-index', 'critical-restaurant']);

gulp.task('watch', () => {
	gulp.watch('src/css/**/*.css', ['minify-css', 'critical-index', 'critical-restaurant']);
	gulp.watch(['src/js/**/*.js'], ['compress']);
	gulp.watch('src/sw.js', ['copy']);
});


gulp.task('default', ['watch']);