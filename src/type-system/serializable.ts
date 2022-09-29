import * as reflect from 'jsii-reflect';
import { isConstruct } from './construct';
import { isEnum, isEnumLikeClass } from './enums';
import { allStaticFactoryMethods } from './factories';
import { allImplementationsOfType } from './implements';

export function isSerializableInterface(
  type: reflect.Type | undefined,
  errorPrefix?: string
): type is reflect.InterfaceType {
  if (!type || !(type instanceof reflect.InterfaceType)) {
    return false;
  }

  if (type.allMethods.length > 0) {
    return false;
  }

  return type.allProperties.every(
    (p) =>
      isSerializableTypeReference(p.type, errorPrefix) ||
      isConstruct(p.type) ||
      p.optional
  );
}

// Must only have properties, all of which are scalars,
// lists or isSerializableInterface types.
function isSerializableTypeReference(
  type: reflect.TypeReference,
  errorPrefix?: string
): boolean {
  if (type.primitive) {
    return true;
  }

  if (type.arrayOfType) {
    return isSerializableTypeReference(type.arrayOfType, errorPrefix);
  }

  if (type.mapOfType) {
    return isSerializableTypeReference(type.mapOfType, errorPrefix);
  }

  if (type.type) {
    return isSerializableType(type.type, errorPrefix);
  }

  if (type.unionOfTypes) {
    return type.unionOfTypes.some((x) =>
      isSerializableTypeReference(x, errorPrefix)
    );
  }

  return false;
}

function isSerializableType(type: reflect.Type, errorPrefix?: string): boolean {
  // if this is a construct class, we can represent it as a "Ref"
  if (isConstruct(type)) {
    return true;
  }

  if (isEnum(type)) {
    return true;
  }

  if (isSerializableInterface(type)) {
    return true;
  }

  // if this is a class that looks like an enum, we can represent it
  if (isEnumLikeClass(type)) {
    return true;
  }

  if (allImplementationsOfType(type).length > 0) {
    return true;
  }

  if (allStaticFactoryMethods(type).length > 0) {
    return true;
  }

  if (errorPrefix) {
    console.error(errorPrefix, `${type} is not serializable`);
  }

  return false;
}
