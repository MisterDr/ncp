var fs = require('fs'),
    path = require('path');

module.exports = ncp;
ncp.ncp = ncp;

function ncp (source, dest, options, callback) {
  var cback = callback;

  if (!callback) {
    cback = options;
    options = {};
  }

  var basePath = process.cwd(),
      currentPath = path.resolve(basePath, source),
      targetPath = path.resolve(basePath, dest),
      filter = options.filter,
      rename = options.rename,
      transform = options.transform,
      clobber = options.clobber ? options.clobber : false,
      modified = options.modified,
      dereference = options.dereference,
      flatCopy = options.flatCopy,
      errs = null,
      started = 0,
      finished = 0,
      running = 0,
      limit = options.limit || ncp.limit || 16;

  limit = (limit < 1) ? 1 : (limit > 512) ? 512 : limit;

  startCopy(currentPath);
  
  function startCopy(source) {		
	  started++;		  
    return getStats(source);
  }

  function getStats(source) {
    var stat = dereference ? fs.stat : fs.lstat;
    if (running >= limit) {
      return setImmediate(function () {
        getStats(source);
      });
    }
    running++;
    stat(source, function (err, stats) {
      var item = {};
      if (err) {
        return onError(err);
      }

      // We need to get the mode from the stats object and preserve it.
      item.name = source;
      item.mode = stats.mode;
      item.mtime = stats.mtime; //modified time
      item.atime = stats.atime; //access time

      if (stats.isDirectory()) {
        return onDir(item);
      }
      else if (stats.isFile()) {
        
        if (filter) {
          if (filter instanceof RegExp) {              
            if (!filter.test(source)) {
              return cb();
            }
            else {
              return onFile(item);
            }
          }
          else if (typeof filter === 'function') {
            if (!filter(source)) {
              return cb();
            } 
            else {
              return onFile(item);
            }
          }
        }        
      }
      else if (stats.isSymbolicLink()) {
        // Symlinks don't really need to know about the mode.
        return onLink(source);
      }
    });
  }

  function onFile(file) {
    var target = null;    
    if (flatCopy) {
      var fileName = file.name.split('\\').pop().split('/').pop();
      target = targetPath + "/" + fileName;
    } else {
      target = file.name.replace(currentPath, targetPath);
    }
    if(rename) {
      target =  rename(target);
    }
    isFileWritable(target, function (writable) {
      if (writable) {
        return copyFile(file, target);
      }
      if(clobber) {
        rmFile(target, function () {
          copyFile(file, target);
        });
      }
      if (modified) {
        var stat = dereference ? fs.stat : fs.lstat;
        stat(target, function(err, stats) {
            //if souce modified time greater to target modified time copy file
            if (file.mtime.getTime()>stats.mtime.getTime())
                copyFile(file, target);
            else return cb();
        });
      }
      else {
        return cb();
      }
    });
  }

  function copyFile(file, target) {
    var readStream = fs.createReadStream(file.name);
            
    readStream.on('error', onError);   
    
    if(transform) {      
      transform(readStream, file, target);
      cb();
    } else {
        var writeStream = fs.createWriteStream(target, { mode: file.mode });       

        writeStream.on('error', onError);

        writeStream.on('open', function() {
          readStream.pipe(writeStream);
        });

        writeStream.once('finish', function() {
          if (modified) {
              //target file modified date sync.
              fs.utimesSync(target, file.atime, file.mtime);
              cb();
          }
          else cb();
      });
    }
  }

  function rmFile(file, done) {
    fs.unlink(file, function (err) {
      if (err) {
        return onError(err);
      }
      return done();
    });
  }

  function onDir(dir) {
    var target = dir.name.replace(currentPath, targetPath);
    isWritable(target, function (writable) {
      if (writable && !flatCopy) {
        return mkDir(dir, target);
      }
      copyDir(dir.name);
    });
  }

  function mkDir(dir, target) {
    fs.mkdir(target, dir.mode, function (err) {
      if (err) {
        return onError(err);
      }
      copyDir(dir.name);
    });
  }

  function copyDir(dir) {
    fs.readdir(dir, function (err, items) {
      if (err) {
        return onError(err);
      }
      items.forEach(function (item) {        
        startCopy(path.join(dir, item), false);
      });
      return cb();
    });
  }

  function onLink(link) {
    var target = link.replace(currentPath, targetPath);
    fs.readlink(link, function (err, resolvedPath) {
      if (err) {
        return onError(err);
      }
      checkLink(resolvedPath, target);
    });
  }

  function checkLink(resolvedPath, target) {
    if (dereference) {
      resolvedPath = path.resolve(basePath, resolvedPath);
    }
    isWritable(target, function (writable) {
      if (writable) {
        return makeLink(resolvedPath, target);
      }
      fs.readlink(target, function (err, targetDest) {
        if (err) {
          return onError(err);
        }
        if (dereference) {
          targetDest = path.resolve(basePath, targetDest);
        }
        if (targetDest === resolvedPath) {
          return cb();
        }
        return rmFile(target, function () {
          makeLink(resolvedPath, target);
        });
      });
    });
  }

  function makeLink(linkPath, target) {
    fs.symlink(linkPath, target, function (err) {
      if (err) {
        return onError(err);
      }
      return cb();
    });
  }

  function isWritable(path, done) {
    fs.lstat(path, function (err) {
      if (err) {
        if (err.code === 'ENOENT') return done(true);
        return done(false);
      }
      return done(false);
    });
  }

  function isFileWritable(path, done) {
    fs.access(path, fs.W_OK, function (err, stats) {      
      if (err && err.code !== 'ENOENT') {
          return done(false);        
      } else {
        return done(true);
      }      
    });
  }

  function onError(err) {
    if (options.stopOnError) {
      return cback(err);
    }
    else if (!errs && options.errs) {
      errs = fs.createWriteStream(options.errs);
    }
    else if (!errs) {
      errs = [];
    }
    if (typeof errs.write === 'undefined') {
      errs.push(err);
    }
    else { 
      errs.write(err.stack + '\n\n');
    }
    return cb();
  }

  function cb(skipped) {
    if (!skipped) running--;
    finished++;
    if ((started === finished) && (running === 0)) {
      if (cback !== undefined ) {
        return errs ? cback(errs) : cback(null);
      }
    }
  }
}
