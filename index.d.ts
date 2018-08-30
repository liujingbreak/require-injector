type StringFactory = (sourceFilePath: string, regexpExecRes?: RegExpExecArray) => string;
type ValueFactory = (sourceFilePath: string, regexpExecRes?: RegExpExecArray) => any;

export interface FactoryMapInterf {
	factory(requiredModule: string | RegExp, factoryFunc: (sourceFilePath: string) => string): FactoryMapInterf;

	substitute(requiredModule: string | RegExp,
		newModule: string | StringFactory): FactoryMapInterf;

	value(requiredModule: string | RegExp, value: ReplaceTypeValue | ValueFactory | any): FactoryMapInterf;

	swigTemplateDir(requiredModule: string, dir: string): FactoryMapInterf;

	replaceCode(requiredModule: string | RegExp, jsCode: string | StringFactory): FactoryMapInterf;
	alias(requiredModule: string | RegExp, newModule: string| StringFactory): FactoryMapInterf;
}
export interface ReplaceTypeValue {
	replacement: string;
	value: any | ValueFactory;
}

declare var Replacer: any;
interface Replacer {
	replace: any;
}

declare function getInstance(): any;
declare var cssLoader: any;
export {Replacer, getInstance, cssLoader};
