/*
    IRCYoke
    Multi-network web interface for ZNC.
    http://github.com/Cydrobolt/IRCYoke
    @copyright [c] 2014 Chaoyi Zha
    @license MIT
    @title IRCYoke Gulpfile
    @functions:
        No arguments (`gulp`): Build files and start server
        `clean` (`gulp clean`): Clean build directory
*/

var gulp = require('gulp');
var path = require('path');
var util = require('util');
var fs = require('fs');
var nodemon = require('gulp-nodemon');

var mkdir = function(dir) {
	// making directory without exception if exists
	try {
		fs.mkdirSync(dir, 0755);
	} catch(e) {
		if(e.code != "EEXIST") {
			throw e;
		}
	}
};

var rmdir = function(dir) {
	if (fs.existsSync(dir)) {
		var list = fs.readdirSync(dir);
		for(var i = 0; i < list.length; i++) {
			var filename = path.join(dir, list[i]);
			var stat = fs.statSync(filename);

			if(filename == "." || filename == "..") {
				// pass these files
			} else if(stat.isDirectory()) {
				// rmdir recursively
				rmdir(filename);
			} else {
				// rm fiilename
				fs.unlinkSync(filename);
			}
		}
		fs.rmdirSync(dir);
	} else {
		console.warn("warn: " + dir + " not exists");
	}
};

var copyDir = function(src, dest) {
	mkdir(dest);
	var files = fs.readdirSync(src);
	for(var i = 0; i < files.length; i++) {
		var current = fs.lstatSync(path.join(src, files[i]));
		if(current.isDirectory()) {
			copyDir(path.join(src, files[i]), path.join(dest, files[i]));
		} else if(current.isSymbolicLink()) {
			var symlink = fs.readlinkSync(path.join(src, files[i]));
			fs.symlinkSync(symlink, path.join(dest, files[i]));
		} else {
			copy(path.join(src, files[i]), path.join(dest, files[i]));
		}
	}
};

var copy = function(src, dest) {
	var oldFile = fs.createReadStream(src);
	var newFile = fs.createWriteStream(dest);
	util.pump(oldFile, newFile);
};
gulp.task('default', function() {
    var uglifyJS     = require('uglify-js'),
        _            = require('lodash');
    var FILE_ENCODING = 'utf-8',
        EOL = '\n';
    // mkdir(__dirname + "/build/js");
    function concat(file_list, callback) {
        var num_files = file_list.length,
            files = [],
            loaded = 0,
            error = false;

        file_list.forEach(function (file_path, idx) {
            if (error) {
                return;
            }
            fs.readFile(file_path, { encoding: FILE_ENCODING }, function (err, data) {
                if (error) {
                    return;
                } else if (err) {
                    error = true;
                    return callback(err);
                }
                files[idx] = data + '\n\n';
                if (++loaded === num_files) {
                    callback(null, files.join(EOL));
                }
            });
        });
    }





    var source_files = [
        __dirname + "/client/src/init.js",
        __dirname + "/client/src/backbone-min.js"
    ];


    /**
     * Build JavaScript files
     */
     mkdir(__dirname + "/build/js");
    concat(source_files, function (err, src) {
        if (!err) {
            src = '(function (global, undefined) {\n\n' + src + '\n\n})(window);';
            fs.writeFile(__dirname + '/build/js/ircyoke.js', src, { encoding: FILE_ENCODING }, function (err) {
                if (!err) {
                    console.log('Built ircyoke.js');
                } else {
                    console.error('Error building ircyoke.js:', err);
                }
            });

            // Uglify can take take an array of filenames to produce minified code
            // but it's not wraped in an IIFE and produces a slightly larger file
            //src = uglifyJS.minify(source_files);

            var ast = uglifyJS.parse(src, {filename: 'ircyoke.js'});
            ast.figure_out_scope();
            ast = ast.transform(uglifyJS.Compressor({warnings: false}));
            ast.figure_out_scope();
            ast.compute_char_frequency();
            ast.mangle_names();
            src = ast.print_to_string();

            fs.writeFile(__dirname + '/build/js/ircyoke.min.js', src, { encoding: FILE_ENCODING }, function (err) {
                if (!err) {
                    console.log('Built ircyoke.min.js');
                } else {
                    console.error('Error building kiwi.min.js:', err);
                }
            });
        } else {
            console.error('Error building ircyoke.js and ircyoke.min.js:', err);
        }
        copyDir(__dirname + "/client/src/static", __dirname + "/build");
        nodemon({
          script: 'app.js',
          ext: 'js html',
          env: { 'NODE_ENV': 'development' } ,
          ignore: ['./build/**']
        }); // Start server


    });
});
gulp.task('clean', function() {
    var uglifyJS     = require('uglify-js'),
      _            = require('lodash');
    console.log("Cleaning build files...");
    var build_folder = __dirname + "/build";
    rmdir(build_folder);
    console.log("Done!");
});
