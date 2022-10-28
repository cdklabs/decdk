import * as reflect from 'jsii-reflect';
import { AnnotationsContext } from '../error-handling';
import { TemplateExpression } from '../parser/template';
import {
  isBehavioralInterface,
  isEnum,
  isEnumLikeClass,
  isSerializableInterface,
} from '../type-system';
import { resolveInstanceExpression } from './callables';
import {
  assertArrayOfType,
  assertMapOfType,
  resolveArrayOfTypeExpression,
  resolveMapOfTypeExpression,
} from './collections';
import {
  assertClass,
  assertEnum,
  resolveEnumExpression,
  resolveEnumLikeExpression,
} from './enums';
import {
  assertExpressionShaped,
  assertExpressionForType,
  TypedTemplateExpression,
} from './expression';
import { resolveDateLiteral } from './literals';
import {
  assertLiteralOrIntrinsic,
  assertVoid,
  isAny,
  resolveAnyExpression,
  resolveVoidExpression,
} from './primitives';
import { assertRef, refOrResolve, resolveRefToValue } from './references';
import { isConstruct } from './resource-like';
import { assertInterface, resolveStructExpression } from './struct';
import { TypedTemplate } from './template';
import { assertUnionOfTypes, resolveUnionOfTypesExpression } from './union';

export interface TypeResolutionContext {
  annotations: AnnotationsContext;
  template: TypedTemplate;
  typeSystem: reflect.TypeSystem;
}

export function resolveExpressionType(
  x: TemplateExpression,
  typeRef: reflect.TypeReference
): TypedTemplateExpression {
  assertExpressionShaped(x);
  const expectedType = analyzeTypeReference(typeRef);

  switch (expectedType) {
    case ResolvableExpressionType.NUMBER:
      return assertLiteralOrIntrinsic(x, 'number');
    case ResolvableExpressionType.BOOLEAN:
      return assertLiteralOrIntrinsic(x, 'boolean');
    case ResolvableExpressionType.STRING:
      return assertLiteralOrIntrinsic(x, 'string');
    case ResolvableExpressionType.DATE:
      return resolveDateLiteral(assertExpressionForType(x, 'string', typeRef));
    case ResolvableExpressionType.ARRAY_OF_TYPE:
      return resolveArrayOfTypeExpression(
        assertExpressionForType(x, 'array', typeRef),
        assertArrayOfType(typeRef)
      );
    case ResolvableExpressionType.MAP_OF_TYPE:
      return resolveMapOfTypeExpression(
        assertExpressionForType(x, 'object', typeRef),
        assertMapOfType(typeRef)
      );
    case ResolvableExpressionType.UNION_OF_TYPES:
      return resolveUnionOfTypesExpression(x, assertUnionOfTypes(typeRef));
    case ResolvableExpressionType.STRUCT:
      return refOrResolve(x, (y) =>
        resolveStructExpression(
          assertExpressionForType(y, 'object', typeRef),
          assertInterface(typeRef)
        )
      );
    case ResolvableExpressionType.ENUM:
      return resolveEnumExpression(
        assertExpressionForType(x, 'string', typeRef),
        assertEnum(typeRef)
      );
    case ResolvableExpressionType.ENUM_LIKE_CLASS:
      return refOrResolve(x, (y) =>
        resolveEnumLikeExpression(y, assertClass(typeRef))
      );

    case ResolvableExpressionType.BEHAVIORAL_INTERFACE:
      return refOrResolve(x, (y) =>
        resolveInstanceExpression(
          assertExpressionForType(y, 'object', typeRef),
          assertInterface(typeRef)
        )
      );
    case ResolvableExpressionType.OTHER_CLASS:
      return refOrResolve(x, (y) =>
        resolveInstanceExpression(
          assertExpressionForType(y, 'object', typeRef),
          assertClass(typeRef)
        )
      );

    case ResolvableExpressionType.CONSTRUCT:
      return resolveRefToValue(assertRef(x));

    case ResolvableExpressionType.ANY:
      return resolveAnyExpression(x);
    case ResolvableExpressionType.VOID:
      assertVoid(x);
      return resolveVoidExpression();
    default:
      throw TypeError(
        `Encountered unsupported type ${ResolvableExpressionType[expectedType]}. This feature is currently not supported.`
      );
  }
}

export enum ResolvableExpressionType {
  UNKNOWN,
  VOID,
  ANY,
  NUMBER,
  BOOLEAN,
  STRING,
  DATE,
  ARRAY_OF_TYPE,
  MAP_OF_TYPE,
  UNION_OF_TYPES,
  ENUM,
  ENUM_LIKE_CLASS,
  STRUCT,
  BEHAVIORAL_INTERFACE,
  CONSTRUCT,
  OTHER_CLASS,
}

export function analyzeTypeReference(
  typeRef: reflect.TypeReference
): ResolvableExpressionType {
  if (typeRef.void) {
    return ResolvableExpressionType.VOID;
  }
  if (isAny(typeRef)) {
    return ResolvableExpressionType.ANY;
  }

  if (typeRef.primitive === 'number') {
    return ResolvableExpressionType.NUMBER;
  }
  if (typeRef.primitive === 'boolean') {
    return ResolvableExpressionType.BOOLEAN;
  }
  if (typeRef.primitive === 'string') {
    return ResolvableExpressionType.STRING;
  }
  if (typeRef.primitive === 'date') {
    return ResolvableExpressionType.DATE;
  }

  if (typeRef.arrayOfType) {
    return ResolvableExpressionType.ARRAY_OF_TYPE;
  }
  if (typeRef.mapOfType) {
    return ResolvableExpressionType.MAP_OF_TYPE;
  }
  if (typeRef.unionOfTypes) {
    return ResolvableExpressionType.UNION_OF_TYPES;
  }

  if (isEnum(typeRef.type)) {
    return ResolvableExpressionType.ENUM;
  }
  if (isEnumLikeClass(typeRef.type)) {
    return ResolvableExpressionType.ENUM_LIKE_CLASS;
  }
  if (isBehavioralInterface(typeRef.type)) {
    return ResolvableExpressionType.BEHAVIORAL_INTERFACE;
  }
  if (isSerializableInterface(typeRef.type)) {
    return ResolvableExpressionType.STRUCT;
  }
  if (isConstruct(typeRef.type)) {
    return ResolvableExpressionType.CONSTRUCT;
  }
  if (typeRef.type?.isClassType()) {
    return ResolvableExpressionType.OTHER_CLASS;
  }

  return ResolvableExpressionType.UNKNOWN;
}
