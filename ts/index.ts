import Replacer, {RequireInjector} from './replace-require';
import {InjectorOption, ResolveOption} from './node-inject';
import {FactoryMapInterf} from './factory-map';
import {Transform} from 'stream';

let instance: Replacer;

type InjectorDelegate = (option?: InjectorOption) => RequireInjector;

function delegate(option: InjectorOption): RequireInjector {
	instance = new Replacer(option);
	return instance;
}
// tslint:disable-next-line:class-name
interface delegate {
	getInstance(): RequireInjector;
}
namespace delegate {
	export function getInstance() {
		if (instance == null)
			instance = new Replacer();
		return instance;
	}
	export function fromPackage(packageName: string | string[], resolveOpt: ResolveOption): FactoryMapInterf {
		return instance.fromPackage(packageName, resolveOpt);
	}
	export function fromDir(dir: string | string[]): FactoryMapInterf {
		return instance.fromDir(dir);
	}
	export function transform(file: string): Transform {
		return instance.transform(file);
	}
	export function injectToFile(filePath: string, code: string, ast?: any): string {
		return instance.injectToFile(filePath, code, ast);
	}
	export function cleanup() {
		if (instance)
			instance.cleanup();
		instance = null;
	}
}

export = delegate as InjectorDelegate & RequireInjector;
