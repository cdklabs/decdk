import * as reflect from 'jsii-reflect';
import { ArrayLiteral, ObjectLiteral } from '../parser/template/expression';
import { TypedArrayExpression, TypedObjectExpression } from './expression';
import { resolveExpressionType } from './resolve';

export function resolveMapOfTypeExpression(
  x: ObjectLiteral,
  typeRef: reflect.TypeReference
): TypedObjectExpression {
  const fields = Object.fromEntries(
    Object.entries(x.fields).map(([k, v]) => [
      k,
      resolveExpressionType(v, typeRef),
    ])
  );

  return {
    type: 'object',
    fields,
  };
}

export function assertMapOfType(
  typeRef: reflect.TypeReference
): reflect.TypeReference {
  if (!typeRef.mapOfType) {
    throw new TypeError(`Expected map of type, got ${typeRef.toString()}`);
  }

  return typeRef.mapOfType;
}

export function resolveArrayOfTypeExpression(
  x: ArrayLiteral,
  typeRef: reflect.TypeReference
): TypedArrayExpression {
  const array = x.array.map((i) => resolveExpressionType(i, typeRef));

  return {
    type: 'array',
    array,
  };
}

export function assertArrayOfType(
  typeRef: reflect.TypeReference
): reflect.TypeReference {
  if (!typeRef.arrayOfType) {
    throw new TypeError(`Expected array of type, got ${typeRef.toString()}`);
  }

  return typeRef.arrayOfType;
}
