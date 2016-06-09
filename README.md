# require-injector
![https://travis-ci.org/](https://travis-ci.org/dr-web-house/require-injector.svg)
[Travis build](https://travis-ci.org/dr-web-house/require-injector)

Injecting and replacing require() function in both NodeJS and browser side CommonJS packing tool like Browserify.

> You may use it as a simple IoC container, which helps you decouple modules.

> Or if you just want to replace some third-party package's dependency without doing git-fork and create a whole new package.

Updates:
 - v0.3.2 Browser command line transform is added.

### Installation
```
npm install require-injector
```

### Example

Assume you have project structure like below,
```
/
├─── src
|    ├─── dir1
|    |     └─── feature1.js
|    └─── dir2
|          └─── feature2.js
├─── app.js
└─── node_modules
      ├─── module1/index.js, package.json, ...
      └─── module2/index.js, package.json, ...
```

In src/dir1/some1.js, there is `require()` calling to `module1`
```js
var m1 = require('module1');
var m2 = require('nonexitent');
```
You can inject this `require('module1')` with the exports value from `module2`.

In your entry js file app.js:
```js
var rj = require('require-injector');

rj({basedir: __dirname});
rj.fromDir('src/dir1')
	.substitute('module1', 'module2');
```
Also you can inject it with a value returned from some factory function, or just give a value to it;
```js
rj.fromDir('src/dir1')
	.factory('module1', function(file) { return something;})
	.value('module2', 123);
```
You can setup injection for JS file of specific packages, e.g. module1
```js
...
rj.fromPackage('module1')
	.substitute('module1-dependencyA', 'anotherPackage');
// If module1 is a Browserify package
rj.fromPackage('module1', require('browser-resolve').sync)
    .substitute('module1-dependencyA', 'anotherPackage');
```
### Browserify example
If you are packing files to browser side by Browserify,
```js
var bresolve = require('browser-resolve').sync;
rj({resolve: bresolve, noNode: true});
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
	.value('moduleX', 'hellow')
	.factory('moduleY', function() {return something;})
	.substitute('moduleZ', 'moduleA');

rj.fromPackage('moduleB')
...
```


### Replacement
Or you just want to write your own replacement function for Browserify and Webpack, just call `.injectToFile`,
```js
var fs = require('fs');
var code = fs.readFileSync(filePath, 'utf8');
var replacedCode = rj.injectToFile(filePath, code);
fs.writeFileSync(filePath, replacedCode);
```

### Solution for NodeJS and browser environment
- For NodeJS, the injector kidnaps Node's native API `Module.prototype.require()`, so that each `require()` call goes to injector's control, it returns injecting value according to callee file's id (file path).

- For browsers, if you are packing your code by any tool like Browsersify and Webpack, this module plays a role of `tranform` or `replacer`, parsing JS code and replacing `require()` expression with stringified injecting value.

### Injector API
- #### require('require-injector')( _{object}_ opts )<a name="api1"></a>
	Must call this function at as beginning as possible of your entry script.
	It kidnaps Node's native API `Module.prototype.require()`, so every `require()`
	call actually goes to its management.
    ##### Parameters
	`opts`: optional, global options:

	- `opts.basedir`: _{string}_ default is process.cwd(), used to resolve relative path in `.fromDir(path)`
	- `opts.resolve`: _{function(id)}_, default is[reolve](https://www.npmjs.com/package/resolve)`.sync`, you may also use Node API `require.resolve` or [browser-resolve](https://www.npmjs.com/package/browser-resole)`.sync`
	- `opts.resolveOpts`:  _{object}_  set a global [resolve](https://www.npmjs.com/package/resolve) options which is for `.fromPackage(path, opts)`
    - `noNode`: _{boolean}_  default is false, if you only use it as a replacer like Browserify's transform or Webpack's loader, you don't want injection work on NodeJS side, no kidnapping on `Module.prototype.require`, just set this property to `true`
	- `opts.debug`: _{boolean}_ if true, log4js will be enabled to print out logs


- #### fromPackage( _{string|array}_ nodePackageName, _{function}_ resolve, _{object}_ opts)<a name="api2"></a>
	Adding one or multiple packages to injection setting, all files under this package's directory will be injectable. This function calls `.fromDir()` internally.
	##### Parameters
	- `nodePackageName`: Node package's name or array of multiple package names
    - `resolve`: optional, if this parameter is a function, it will be used to locate package directory, default is [resolve](https://www.npmjs.com/package/resolve)`.sync`

        If the package is a Browserify package, you may use [browser-resolve](https://www.npmjs.com/package/browser-resolve)`.sync` or `require.resolve`
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

- #### cleanup()<a name="api9"></a>
    Remove all packages and directories set by `.fromDir()` and `.fromPackage()`, also release `Module.prototype.require()`, injection will stop working.
### FactoryMap API
- #### substitute(_{string}_ requiredModule, _{string}_ newModule)<a name="api4"></a>
	Replacing a required module with requiring another module.
	##### Parameters
	- `requiredModule`: the original module name which is required for, it can't be a relative file path, only supports package name or scoped package name.
	- `newModule`: the new module name that is replaced with.

	_returns_ chainable FactoryMap

- #### factory(_{string}_ requiredModule, _{function}_ factory)<a name="api5"></a>
    Replacing a required module with a function returned value.
    ##### Parameters
    - `requiredModule`: the original module name which is required for, it can't be a relative file path, only supports package name or scoped package name.
    - `factory`: A function that returns a value which then will be replaced to the original module of `requiredModule`.

        When `.injectToFile()` or Browserify bundling with `.transform` is called to files, it actually replaces entire `require('requiredModule')` expression with Immediately-Invoked Function Expression (IIFE) of the factory function`.toString()`:
		```js
		// require('requiredModule'); ->
		'(' + factory.toString() + ')()';
		```
	_returns_ chainable FactoryMap

- #### value(_{string}_ requiredModule, _{*|object}_ value)<a name="api6"></a>
    Replacing a required module with any object or primitive value.
    ##### Parameters
    - `requiredModule`: the original module name which is required for, it can't be a relative file path, only supports package name or scoped package name.
    - `value`: the value be replaced to `requiredModule` exports.

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


-----
Now you can require some cool fake or abstract module name in your code, and inject/replace them with the real package or value.

All have been covered by unit test, except Browserify `.tranform` function, contribution is welcome.

I will continue to work on Webpack loaders
