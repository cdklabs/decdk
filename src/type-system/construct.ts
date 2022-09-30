import * as reflect from 'jsii-reflect';
import { isSerializableInterface } from './serializable';

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

export function hasPropsParam(
  type: reflect.Type,
  considerParamAt = 0
): type is reflect.ClassType {
  // Not an instantiable class type
  if (!type.isClassType() || !type.initializer || type.abstract) {
    return false;
  }

  // Investigate the constructor
  const initializer = type.initializer;

  // There are less params than we expect
  if (initializer.parameters.length < considerParamAt) {
    return false;
  }

  // Consider only relevant params from now on
  const params = initializer.parameters.slice(considerParamAt);

  // All params except the first must be optional
  if (params.slice(1).filter((p) => !p.optional).length !== 0) {
    return false;
  }

  // Investigate the candidate
  const propsParam = params[0];

  // No props param is okay
  if (!propsParam) {
    return true;
  }

  // Cannot be variadic
  if (propsParam.variadic) {
    return false;
  }

  // Not a resolvable type
  if (propsParam.type.fqn === undefined) {
    return false;
  }

  // Candidate must be a struct
  return isSerializableInterface(propsParam.type.type);
}
