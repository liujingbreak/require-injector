# require-injector
![https://travis-ci.org/](https://travis-ci.org/dr-web-house/require-injector.svg)
[Travis build](https://travis-ci.org/dr-web-house/require-injector)

Injecting and replacing require() function in both NodeJS and browser side CommonJS packing tool like Browserify.

When it is used for Node, it is a little bit like [app-module-path](https://www.npmjs.com/package/app-module-path)
> You may use it as a simple IoC container, which helps you decouple modules.

> Or if you just want to replace some third-party package's dependency without doing git-fork and create a whole new package.

- [Installation](#Installation)
- [Node project example](#dirExample)
	- [Injection for local files](#injectionLocalFile)
	- [No relative path needed in require()](#noRelativePath)
	- [Injection for Node packages](#injectionNodePackages)
- [Browserify example](#browserifyExample)
- [Webpack-like split loading module replacement: `require.ensure()`](#requireEnsure)
- [Replacement](#replacement)
- [Solution for NodeJS and browser environment](#solutions)
- [Injection for server side Swig template](#swig)
- [Injector API](#injectorApi)
- [FactoryMap API](#factorymapApi)

### <a name="installation">Installation</a>
```
npm install require-injector
```

### <a name="dirExample">Node project example</a>

Assume you have project structure like below,
```
/
├─── src
│    ├─── dir1
│    │     ├─── sub-dir
│    │     │      └─── feature1-1.js
│    │     └─── feature1.js
│    └─── dir2
│          └─── feature2.js
├─── app.js
├─── utils
│      └─── index.js
└─── node_modules
      ├─── module1/index.js, package.json, ...
      └─── module2/index.js, package.json, ...
```

#### <a name="injectionLocalFile">Injection for local files</a>
In src/dir1/some1.js, there is `require()` calling to `module1`
```js
var m1 = require('module1');
```
You can inject this `require('module1')` with the exports value from `module2`.

In your entry js file app.js:
```js
var rj = require('require-injector');

rj({basedir: __dirname});
rj.fromDir('src/dir1')
	.substitute('module1', 'module2');
```
From then on, any file `require('module1')` will actually be requiring module2 instead.

Also you can inject it with a value returned from a lazy factory function, or just give a value to it;
```js
rj.fromDir(['src/dir1', 'src/dir2'])
	.factory('module1', function(file) { return something;})
	.value('module2', 123);
```
#### <a name="noRelativePath">No relative path needed in require()</a>
You may don't need require messy relative path anymore. Image you have a common `utils` always be required by different feature folders. Same effect like [app-module-path](https://www.npmjs.com/package/app-module-path)
```js
// In app.js
var rj = require('require-injector');
rj({basedir: __dirname});
rj.fromDir(['src/dir1', 'src/dir2']).factory('_utils', function() {
	return require('./utils');
});
```
Now you have a common fake module name called `_utils` to be required from dir1,dir2
In dir1/feature1.js
```js
// var utils = require('../utils');
var utils = require('_utils');
```
In dir1/sub-dir/feature1-1.js
```js
// var utils = require('../../utils');
var utils = require('_utils');
```

#### <a name="injectionNodePackages">Injection for Node packages</a>
You can setup injection for JS file of specific packages, e.g. module1
```js
...
rj.fromPackage('module1')
	.substitute('module1-dependencyA', 'anotherPackage');
// If module1 is a Browserify package
rj.fromPackage('module1', require('browser-resolve').sync)
    .substitute('module1-dependencyA', 'anotherPackage');
```

### <a name="browserifyExample">Browserify example</a>
If you are packing files to browser side by Browserify,
```js
rj({noNode: true});
rj.fromPackage('...')
...
var browserify = require('browserify');
var b = browserify();
b.transform(rj.transform, {global: true});
```
It uses [esprima](https://www.npmjs.com/package/esprima) language recoganizer to parse each JS file and replace line of `require("matchedModule")`.
Set `noNode` to `true` to disable injection on NodeJS modules, only work as a replacer.

Browserify from command line
```shell
browserify entry.js --global-transform
 [ require-injector/transform --inject inject.js ]
```
`inject.js` is where you initialize require-injector settings
```js
var rj = require('require-injector');
rj({noNode: true});

rj.fromDir('folderA')
	.value('moduleX', 'anotherPackage')
	.factory('moduleY', function() {return something;})
	.substitute('moduleZ', 'anotherPackage');

rj.fromPackage('moduleB')
	...
```

### <a name="requireEnsure">Webpack-like split loading module replacement: `require.ensure()`</a>
`.substitute()` works for call expression like `require.ensure()`\
Injection setup in gulp script for Webpack like below,
```js
rj({noNode: true, basedir: __dirname});
rj.fromDir('dir1').substitute('replaceMe', 'module1');
```
In browser side file
```js
require.ensure(['replaceMe', 'module2'], function() {
	....
})
```
will be replaced to
```js
require.ensure(['module1', 'module2'], function() {
	....
})
```
> Webpack loader is still in progress, but if you have your own loader, this feature will be handy for you to write your own replacement function.

### <a name="replacement">Replacement</a>
You can write your own replacement function for Browserify or Webpack, just call `.injectToFile()`,
```js
var fs = require('fs');
var code = fs.readFileSync(filePath, 'utf8');
var replacedCode = rj.injectToFile(filePath, code);
fs.writeFileSync(filePath, replacedCode);
```

### <a name="solutions">Solution for NodeJS and browser environment</a>
- For NodeJS, the injector kidnaps Node's native API `Module.prototype.require()`, so that each `require()` call goes to injector's control, it returns injecting value according to callee file's id (file path).

- For browsers, if you are packing your code by any tool like Browsersify and Webpack, this module plays a role of `tranform`, `loader` or `replacer`, parsing JS code and replacing `require()` expression with stringified injecting value.

You can even create 2 instances, one for Node injection, another for browser side replacement, so they don't interfere each other.
```js
// Node injection
var rj = require('require-injector');
var rjNode = rj();
rjNode.fromPackage('feature1')
	.substitute('dependency1', 'module1');

var rjReplace = rj({noNode: true});
rjReplace.fromPackage('feature2')
	.substitute('dependency2', 'module2');

```
### <a name="swig">Injection for server side Swig template</a>
We also extend injection function to resource type other than Javascript, if you are using server side Swig template engine,
this injector can work with [swig-package-tmpl-loader injection](https://www.npmjs.com/package/swig-package-tmpl-loader#injection)


### <a name="injectorApi">Injector API</a>
- #### require('require-injector')( _{object}_ opts )<a name="api1"></a>
	Must call this function at as beginning as possible of your entry script.
	It kidnaps Node's native API `Module.prototype.require()`, so every `require()`
	call actually goes to its management.
    ##### Parameters
	`opts`: optional, global options:

	- `opts.basedir`: _{string}_ default is process.cwd(), used to resolve relative path in `.fromDir(path)`
	- `opts.resolve`: _{function(id)}_, default is[reolve](https://www.npmjs.com/package/resolve)`.sync`, you may also use Node API `require.resolve` or [browser-resolve](https://www.npmjs.com/package/browser-resole)`.sync`
	- `opts.resolveOpts`:  _{object}_  set a global [resolve](https://www.npmjs.com/package/resolve) options which is for `.fromPackage(path, opts)`
    - `noNode`: _{boolean}_  default is false, if you only use it as a replacer like Browserify's transform or Webpack's loader, you don't want injection work on NodeJS side, no kidnapping on `Module.prototype.require`, just set this property to `true`. And this will turn default `opts.resolve` to `require('browser-resolve').sync`.
	- `opts.debug`: _{boolean}_ if true, log4js will be enabled to print out logs


- #### fromPackage( _{string|array}_ nodePackageName, _{function}_ resolve, _{object}_ opts)<a name="api2"></a>
	Adding one or multiple packages to injection setting, all files under this package's directory will be injectable. This function calls `.fromDir()` internally.
	##### Parameters
	- `nodePackageName`: Node package's name or array of multiple package names
    - `resolve`: optional, if this parameter is a function, it will be used to locate package directory, default is [resolve](https://www.npmjs.com/package/resolve)`.sync`

        If the package is a Browserify package, you may use [browser-resolve](https://www.npmjs.com/package/browser-resolve)`.sync`. Or you turn on global option `{noNode: true}`, then it will by default use browser-resolve.sync.
	- `opts`: optional, options object passed to [resolve](https://www.npmjs.com/package/resolve),

	Underneath, it uses [resolve](https://www.npmjs.com/package/resolve) to locate package's root directory, which mean it could not only be a Node package, but also a _Browser_ side package which has a "`browser`" property instead of "`main`" property in package.json, you may use [browserResolve](https://www.npmjs.com/package/browser-resolve).sync instead of [resolve](https://www.npmjs.com/package/resolve).

	_returns_ chainable FactoryMap

- #### fromDir( _{string|array}_ directory)<a name="api3"></a>
	Adding one or multiple directories to injection setting, all files under this directory will be injectable.
    > The internal directory list are sorted and can be binary searched when `Module.prototype.require()` is called against each file. So the performance of dynamic injection should be not bad

	##### Parameters
	- `directory`: if this is a relative path, you must call `requireInjector({basedir: rootDir})`
		to tell a base directory
		> It doesn't not allow to add any overlap directories like a parent directory or a sub-directory of any added directories, it will throw an Error for that case.

		e.g.
		```js
		rj.fromDir('src/dir1');
		rj.fromDir('src/dir1/sub-dir'); //.fromDir() it will throw Error
		```

	_returns_ chainable FactoryMap

- #### transform(filePath)<a name="api8"></a>
    A Browserify JS file transform function to replace `require()` expression with proper injection.
	```js
	// add to Browserify as a transform
	browserify.transform(rj.transform, {global: true});
	```
	_returns_ through-stream

- #### injectToFile(_{string}_ filePath, _{string}_ code, _{object}_ ast)<a name="api7"></a>
	Here "inject" is actually "replacement".
	Parsing a matched file to Esprima AST tree, looking for matched `require(module)` expression and replacing them with proper values, expression.
	##### Parameters
	- `filePath`: file path
	- `code`: content of file
	- `ast`: optional, if you have already parsed code to[esrima](https://www.npmjs.com/package/esprima) AST tree with `{range: true}` option, pass it to this function which helps to speed up process by skip parsing again.

	_returns_ replaced source code, if there is no injectable `require()`, same source code will be returned.

- #### factoryMapForFile({string} filePath)
	Return configured FactoryMap for source code file depends on the file's location, using binary search. Later on, you can call `factoryMap.getInjector(name)` to get exact inject value.
	> Normally, you don't need to call this function directly.

	*returns* {`FactoryMap | null`} Null if there is no injector configured for current file.


- #### cleanup()<a name="api9"></a>
    Remove all packages and directories set by `.fromDir()` and `.fromPackage()`, also release `Module.prototype.require()`, injection will stop working.
### <a name="factorymapApi">FactoryMap API</a>
- #### substitute(_{string}_ requiredModule, _{string}_ newModule)<a name="api4"></a>
	Replacing a required module with requiring another module.
	> Also support `npm://package` reference in Swig template tags `include` and `import`,
	check this out [swig-package-tmpl-loader injection](https://www.npmjs.com/package/swig-package-tmpl-loader#injection)

	##### Parameters
	- `requiredModule`: the original module name which is required for, it can't be relative file path, only supports absolute path, a package name or scoped package name.
        > Package name like `lodash/throttle` also works, as long as it can be resolved to same absolute path all the time.

	- `newModule`: the new module name that is replaced with.

	_returns_ chainable FactoryMap

- #### factory(_{string}_ requiredModule, _{function}_ factory)<a name="api5"></a>
    Replacing a required module with a function returned value.
	> Not work for `require.ensure()`

    ##### Parameters
    - `requiredModule`: the original module name which is required for, it can't be a relative file path.
    - `factory`: A function invoked with 1 argument: `sourceFilePath` and returns a value which then will replace the original module of `requiredModule`.

        **Note**: In browser side replacement mode, or when `.injectToFile()` or Browserify bundling with `.transform` is called to files, it replaces entire `require('requiredModule')` expression with Immediately-Invoked Function Expression (IIFE) of the factory function`.toString()`:
		```js
		// require('requiredModule'); ->
		'(' + factory.toString() + ')(sourceFilePath)';
		```
		Thus you can not have any reference to any scope variable in factory function.


	_returns_ chainable FactoryMap

- #### value(_{string}_ requiredModule, _{*|object}_ value)<a name="api6"></a>
    Replacing a required module with any object or primitive value.
	> Not work for `require.ensure()`

    ##### Parameters
    - `requiredModule`: the original module name which is required for, it can't be a relative file path.
    - `value`: the value to replace `requiredModule` exports.

        When `.injectToFile()` is called or `.transform` is used for Browserify, meaning it is not a Node environment, the solution is actually replacing entire `require('requiredModule')` expression with result of `JSON.stringify(value)`.

        Sometimes, the value is variable reference,
		you wouldn't want `JSON.stringify` for it, you can use an object expression:
         - _{string}_ `value.replacement`: The replaced string literal as variable expression
         - _{object}_ `value.value`: Node require injection value
		```js
		rj.fromDir('dir1')
		.value('replaceMe', {
			replacement: 'window.jQuery', // for Browserify transform
			value: cheerio   // for Node require() injection
		})
		```
	_returns_ chainable FactoryMap

- #### swigTemplateDir(_{string}_ packageName, _{string}_ dir)
	Replace `npm://package` reference in Swig template tags `include` and `import`,
	check this out [swig-package-tmpl-loader injection](https://www.npmjs.com/package/swig-package-tmpl-loader#injection)

-----
Now you can require some cool fake module name in your code, and inject/replace them with the real package or value later.

All have been covered by tests.

Anyone willing to contribute for Webpack loader will be very welcome.
