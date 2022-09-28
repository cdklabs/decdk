import * as reflect from 'jsii-reflect';

export function allImplementationsOfType(type: reflect.Type) {
  if (type instanceof reflect.ClassType) {
    return allSubclasses(type).filter((x) => !x.abstract);
  }

  if (type instanceof reflect.InterfaceType) {
    return allImplementations(type).filter((x) => !x.abstract);
  }

  throw new Error('Must either be a class or an interface');
}

function allSubclasses(base: reflect.ClassType) {
  return base.system.classes.filter((x) => x.extends(base));
}

function allImplementations(base: reflect.InterfaceType) {
  return base.system.classes.filter((x) =>
    x.getInterfaces(true).some((i) => i.extends(base))
  );
}
