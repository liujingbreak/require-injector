### v5.2.0
Webpack loader is re-written with TS, provide few more useful loader `options` parameters.


## v5.0.0
Rewrite all functional script with Typescript, fully support Typescript user.

**Breaking changes**
- The way to get Injector instance.
```js
const Injector = require('require-inject').default;
new INjector().on('inject', moduleId => {});

```
or Typescript

```js
import Injector from 'require-inject';
new INjector().on('inject', moduleId => {});
```

### 5.1.0
Use Typescript 3.2.x to parse all JS, JSX files, acorn is no longer used.

### 5.1.1
Enable TS compiler option "strictNullCheck" for better quality.

### 5.1.3
Support Replacing Typescript source code export statement, e.g. `export * as foobar from "To-be-replaced";`

### 5.1.4
Bug fix: Incorrect TS type definition for FactoryMapInterf.factory() function

### 5.1.5
- Bug fix: Incorrect TS type definition for FactoryMapInterf.factory() function, return type should be `any` not `string`

- New function `.fromRoot()`

## v4.0.0
### Support Typescript file replacement
When work with webpack as a loader for '.ts', '.tsx' file , you may put it even before ts-loader.

### 4.2.2
Rewrite lib/dir-tree.js in Typescript


