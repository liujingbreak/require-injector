# require-injector
![https://travis-ci.org/](https://travis-ci.org/dr-web-house/require-injector.svg)
[Travis build](https://travis-ci.org/dr-web-house/require-injector)

Injecting and replacing require() function in both NodeJS and browser side CommonJS framework like Browserify and Webpack.

> You may use it as a simple IoC container, which helps you decouple modules.

> Or if you just want to replace some third-party package's dependency without doing git-fork and create a whole new package.

### Installation
```
npm install require-injector
```

### Setup
Assume you have project structure like below,
```
/
├─── src
|      ├─── dir1
|      |     └─── some1.js
|      └─── dir2
|            └─── some2.js
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
	.substitute('module1-dependencyA', 'someOtherPackage');
// If module1 is a Browserify package
rj.fromPackage('module1', require('browser-resolve').sync)
    .substitute('module1-dependencyA', 'someOtherPackage');
```

If you are packing files to browser side by Browserify,
```js
var bresolve = require('browser-resolve').sync;
rj({resolve: bresolve});
rj.fromPackage('...')...
...
var browserify = require('browserify');
var b = browserify();
b.transform(rj.transform);
```
It will use [esprima](https://www.npmjs.com/package/esprima) language recoganizer to parse each JS file and replace line of `require("matchedModule")`.

Or you just want to write your replacement function or Browserify, Webpack transform, just call `.injectToFile`,
```js
var fs = require('fs');
var code = fs.readFileSync(filePath, 'utf8');
var replacedCode = rj.injectToFile(filePath, code);
fs.writeFileSync(filePath, replacedCode);
```


### API
1. #### require('require-injector')( _{object}_ options )
	Must call this function at as beginning as possible of your entry script.
	It kidnaps Node's native API `Module.prototype.require()`, so every `require()`
	call actually goes to its management.
    - `options`: optional globale option

        | Property | Description
        | - | -
        |  basedir | _{string}_ set this value, you can use relative path in `.fromDir(path)`
        | resolve | _{function(id)}_, default is [resolve](https://www.npmjs.com/package/resolve)`.sync`, you may also use Node API `require.resolve` or [browserResolve](https://www.npmjs.com/package/browser-resolve)`.sync`
        | resolveOpts | _{object}_  set a global [resolve](https://www.npmjs.com/package/resolve) options which is for `.fromPackage(path, opts)`


2. #### .fromPackage( _{string}_ nodePackageName, _{object}_ opts)
	Adding a package to injection setting, all files under this package's directory will be injectable. This function calls `.fromDir()` internally.\
	**Parameters**:
	- `nodePackageName`: Node package's name
    - `resolve`: optional, if this parameter is a function, it will be used to locate package directory, default is [resolve](https://www.npmjs.com/package/resolve)`.sync`

        If the package is a Browserify package, you may use [browserResolve](https://www.npmjs.com/package/browser-resolve)`.sync` or `require.resolve`
	- `opts`: optional, options object passed to [resolve](https://www.npmjs.com/package/resolve),

	Underneath, it uses [resolve](https://www.npmjs.com/package/resolve) to locate package's root directory, which mean it could not only be a Node package, but also a _Browser_ side package which has a "`browser`" property instead of "`main`" property in package.json, you may use [browserResolve](https://www.npmjs.com/package/browser-resolve).sync instead of [resolve](https://www.npmjs.com/package/resolve).

	**returns** chainable FactoryMap

3. #### .fromDir( _{string}_ directory)
	Adding a directory to injection setting, all files under this directory will be injectable.
    > The internal directory list are sorted and can be binary searched when `Module.prototype.require()` is called against each file. So the performance of dynamic injection should be not bad

	**Parameters**:
	- `directory`: if this is a relative path, you must call `requireInjector({basedir: rootDir})`
		to tell a base directory
		> It doesn't not allow to add any overlap directories like a parent directory or a sub-directory of any added directories, it will throw an Error for that case.

		e.g.
		```js
		rj.fromDir('src/dir1');
		rj.fromDir('src/dir1/sub-dir'); //.fromDir() it will throw Error
		```

	**returns** chainable FactoryMap

4. #### .substitute(_{string}_ requiredModule, _{string}_ replaceToModule)
	Replacing a required module with requiring another module.\
	**Parameters**:
	- `requiredModule`: the original module name which is required for, it can't be a relative file path, only supports package name or scoped package name.
	- `replaceToModule`: the new module name is replaced to

5. #### .factory(_{string}_ requiredModule, _{function}_ factory)
    Replacing a required module with a function returned value.\
    **Parameters**:
    - `requiredModule`: the original module name which is required for, it can't be a relative file path, only supports package name or scoped package name.
    - `factory`: A function that returns a value which then will be replaced to the original module of `requireMaodule`.

        When `.injectToFile()` or Browserify bundling with `.transform` is called to files, it actually replaces entire `require('requiredModule')` expression literally with the `toString()` of the factory function: `factory.toString()`

6. #### .value(_{string}_ requiredModule, _{*}_ anything)
    Replacing a required module with any object or primitive value.\
    **Parameters**:
    - `requiredModule`: the original module name which is required for, it can't be a relative file path, only supports package name or scoped package name.
    - anything: the value be replaced to `requiredModule`.

        When `.injectToFile()` or Browserify bundling with `.transform` is called to files, it actually replaces entire `require('requiredModule')` expression with returned string of `JSON.stringify(anything)`

7. #### .injectToFile(_{string}_ filePath, _{string}_ code, _{object}_ ast)
    Parsing a matched file to esprima AST tree, looking for matched `require(module)` expression and replace them with proper injections.\
    **Parameters**:
    - `filePath`: file path
    - `code`: content of file
    - `ast`: optional, if you have already parsed code to [esprima](https://www.npmjs.com/package/esprima) AST tree, pass it to this function which helps to speed up process by skip parsing code one more time.

8. #### .transform(filePath)
    A Browserify JS file transform function to replace `require()` expression with proper injection.

9. #### .cleanup()
    Remove all packages and directories set by `.fromDir()` and `.fromPackage()`, also release `Module.prototype.require()`, injection will stop working.


Most of the functions in the package has been covered by unit test, except Browserify `.tranform` function, contribution is welcome
