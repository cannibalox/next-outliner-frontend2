export type _ModuleDef<DEPS extends Record<string, _ModuleDef<any>>> = {
  id: string;
  deps: (keyof DEPS)[];
  build: (deps: DEPS) => Record<string, any>;
  init?: (self: ModuleInstance<any>) => Promise<void>;
  cleanup?: (self: ModuleInstance<any>) => Promise<void>;
};

export type ModuleInstance<DEF extends _ModuleDef<any>> = Awaited<ReturnType<DEF["build"]>>;

export const defineModule = <DEPS extends _ModuleDef<any>[], INST>(
  id: string,
  deps: DEPS,
  build: (deps: { [ELEM in DEPS[number] as ELEM["id"]]?: ModuleInstance<ELEM> }) => INST,
  init?: (self: INST) => Promise<void>,
  cleanup?: (self: INST) => Promise<void>,
) => ({ id, deps, build, init, cleanup });
