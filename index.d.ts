
export interface FactoryMapInterf {
	factory(name: string | RegExp, RegExp : string| FactoryFunc): FactoryMapInterf;
	substitute(requiredModule: string | RegExp, newModule: string| FactoryFunc): FactoryMapInterf;
	value(requiredModule: string | RegExp, newModule: any| FactoryFunc): FactoryMapInterf;
	swigTemplateDir: (requiredModule: string, dir: string) => FactoryMapInterf;
	replaceCode: (requiredModule: string | RegExp, newModule: string| FactoryFunc) => FactoryMapInterf;
	alias: (requiredModule: string | RegExp, newModule: string| FactoryFunc) => FactoryMapInterf;
}
var Replacer: any;
interface Replacer {
	replace: any;
}

declare function getInstance(): any;
var cssLoader: any;
export {Replacer, getInstance, cssLoader};
