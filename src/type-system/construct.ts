import * as reflect from 'jsii-reflect';

export function isConstruct(
  typeOrTypeRef: reflect.TypeReference | reflect.Type
): boolean {
  let type: reflect.Type;

  if (typeOrTypeRef instanceof reflect.Type) {
    type = typeOrTypeRef;
  } else {
    if (typeOrTypeRef.arrayOfType) {
      return isConstruct(typeOrTypeRef.arrayOfType);
    }

    if (typeOrTypeRef.mapOfType) {
      return isConstruct(typeOrTypeRef.mapOfType);
    }

    if (typeOrTypeRef.unionOfTypes) {
      return typeOrTypeRef.unionOfTypes.some((x) => isConstruct(x));
    }

    if (typeOrTypeRef.type) {
      type = typeOrTypeRef.type;
    } else {
      return false;
    }
  }

  // if it is an interface, it should extend constructs.IConstruct
  if (type instanceof reflect.InterfaceType) {
    const constructIface = type.system.findFqn('constructs.IConstruct');
    return type.extends(constructIface);
  }

  // if it is a class, it should extend constructs.Construct
  if (type instanceof reflect.ClassType) {
    const constructClass = type.system.findFqn('constructs.Construct');
    return type.extends(constructClass);
  }

  return false;
}
