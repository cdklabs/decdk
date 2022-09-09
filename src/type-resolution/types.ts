import * as reflect from 'jsii-reflect';

type TypeOrTypeRef = reflect.Type | reflect.TypeReference;

export function assertType(
  typeOrTypeRef?: reflect.Type | reflect.TypeReference
): reflect.Type {
  if (!typeOrTypeRef) {
    throw new TypeError('Expected type, got: undefined');
  }

  if (typeOrTypeRef instanceof reflect.TypeReference) {
    return assertType(typeOrTypeRef.type);
  }

  return typeOrTypeRef;
}

export function assertImplements(
  typeRef: TypeOrTypeRef,
  parentTypeRef: TypeOrTypeRef
): reflect.Type {
  const type = assertType(typeRef);
  const parentType = assertType(parentTypeRef);

  if (!type.extends(parentType)) {
    throw new TypeError(`Expected ${type} to implement ${parentType}`);
  }

  return type;
}
