import { RequireInjector } from './replace-require';
import { InjectorOption } from './node-inject';
declare type InjectorDelegate = (option?: InjectorOption) => RequireInjector;
declare const _default: InjectorDelegate & RequireInjector;
export = _default;
