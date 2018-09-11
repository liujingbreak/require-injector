## 4.0.0
### Support Typescript file replacement
When work with webpack as a loader for '.ts', '.tsx' file , you may put it even before ts-loader.

### 4.2.2
Rewrite lib/dir-tree.js in Typescript

### 5.0.0
Rewrite all functional script with Typescript, fully support Typescript user.

**Breaking changes**
- The way to add event listener is changed to:
```js
const rj = require('require-inject');
rj.getInstance().on('inject', moduleId => {});
```
or 

```js
const rj = require('require-inject');
const injector = rj();
injector.on('inject', moduleId => {});
```
