# ncp - Asynchronous recursive file & directory copying

[![Build Status](https://secure.travis-ci.org/AvianFlu/ncp.png)](http://travis-ci.org/AvianFlu/ncp)

Think `cp -r`, but pure node, and asynchronous.  `ncp` can be used both as a CLI tool and programmatically.

## Command Line usage

Usage is simple: `ncp [source] [dest] [--limit=concurrency limit] [--flat]
[--filter="filter"] [--find="regex"] [--findtext="text"] [--replace="text"] --stopOnErr`

The 'filter' is a Regular Expression - matched files will be copied. It should be quoted in double qoutes eg: `--filter="\.(html|css)"`

The 'flat' is a boolean flag that will copy files at flat hierarchy, IE:
   - [source] = test
   - [dest]   = testCopy
   
   File which is found at "test/testSubdirectory/config.json" will be copied at "testCopy/config.json".

The 'concurrency limit' is an integer that represents how many pending file system requests `ncp` has at a time.

'stoponerr' is a boolean flag that will tell `ncp` to stop immediately if any
errors arise, rather than attempting to continue while logging errors. The default behavior is to complete as many copies as possible, logging errors along the way.

If there are no errors, `ncp` will output `done.` when complete.  If there are errors, the error messages will be logged to `stdout` and to `./ncp-debug.log`, and the copy operation will attempt to continue.

## Programmatic usage

Programmatic usage of `ncp` is just as simple.  The only argument to the completion callback is a possible error.  

```javascript
var ncp = require('ncp').ncp;

ncp.limit = 16;

ncp(source, destination, function (err) {
 if (err) {
   return console.error(err);
 }
 console.log('done!');
});
```

You can also call ncp like `ncp(source, destination, options, callback)`. 
`options` should be a dictionary. Currently, such options are available:

  * `options.filter` - a `RegExp` instance, against which each file name is
  tested to determine whether to copy it or not, or a function taking single
  parameter: copied file name, returning `true` or `false`, determining
  whether to copy file or not.

  * `options.transform` - a function: `function (read, write) { read.pipe(write) }`
  used to apply streaming transforms while copying.

  * `options.clobber` - boolean=true. if set to false, `ncp` will not overwrite 
  destination files that already exist.

  * `options.dereference` - boolean=false. If set to true, `ncp` will follow symbolic
  links. For example, a symlink in the source tree pointing to a regular file
  will become a regular file in the destination tree. Broken symlinks will result in
  errors.

  * `options.stopOnErr` - boolean=false.  If set to true, `ncp` will behave like `cp -r`,
  and stop on the first error it encounters. By default, `ncp` continues copying, logging all
  errors and returning an array.
  
  * `options.find` - a `RegExp` instance, against which each file name is used to find text in file using regex expression.
  
  * `options.findtext` - a `text` which is used in each file to find text.
  
  * `options.replace` - a `text` which used to replace text in file.
  
  * `options.flat` - a `boolean` which used to copy files from directory tree to single folder.

  * `options.errs` - stream. If `options.stopOnErr` is `false`, a stream can be provided, and errors will be written to this stream.

Please open an issue if any bugs arise.  As always, I accept (working) pull requests, and refunds are available at `/dev/null`.
