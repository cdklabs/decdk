import * as reflect from 'jsii-reflect';

const STATIC_METHOD_SYM = Symbol();
const CACHE: {
  [STATIC_METHOD_SYM]?: any;
} = {};

/**
 * Return all static methods from this type system
 *
 * Cache on the type system to not have to do this calculation again and again.
 */
export function allStaticMethods(ts: reflect.TypeSystem): reflect.Method[] {
  if (CACHE[STATIC_METHOD_SYM]) {
    return CACHE[STATIC_METHOD_SYM];
  }

  const methods = ts.classes.flatMap((x) => x.ownMethods);
  return (CACHE[STATIC_METHOD_SYM] = methods);
}

/**
 * Return all static factory methods that implement the given type
 */
export function allStaticFactoryMethods(type: reflect.Type) {
  return allStaticMethods(type.system)
    .filter((m) => m.returns.type.fqn === type.fqn)
    .filter((m) => m.parentType !== type);
}
