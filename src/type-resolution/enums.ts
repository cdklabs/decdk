import * as reflect from 'jsii-reflect';
import {
  InitializerExpression,
  resolveInstanceExpression,
  StaticMethodCallExpression,
} from './callables';
import { assertExpressionForType } from './expression';
import { assertString } from '../parser/private/types';
import { StringLiteral, TemplateExpression } from '../parser/template';

export interface StaticPropertyExpression {
  readonly type: 'staticProperty';
  readonly fqn: string;
  readonly namespace?: string;
  readonly property: string;
}

export function resolveEnumLikeExpression(
  x: TemplateExpression,
  type: reflect.ClassType
):
  | StaticPropertyExpression
  | StaticMethodCallExpression
  | InitializerExpression {
  if (x.type === 'string') {
    return {
      type: 'staticProperty',
      fqn: type.fqn,
      namespace: type.namespace,
      property: x.value,
    };
  }

  return resolveInstanceExpression(
    assertExpressionForType(x, 'object', type.reference),
    type
  );
}

export function assertClass(typeRef: reflect.TypeReference): reflect.ClassType {
  if (!typeRef.type?.isClassType()) {
    throw new TypeError(`Expected Class, got ${typeRef.toString()}`);
  }

  return typeRef.type;
}

export interface EnumExpression {
  readonly type: 'enum';
  readonly fqn: string;
  readonly namespace?: string;
  readonly choice: string;
}

export function resolveEnumExpression(
  x: StringLiteral,
  type: reflect.EnumType
): EnumExpression {
  const enumChoice = assertString(x.value).toUpperCase();
  const options = type.members.map((m) => m.name);

  if (!type.members.map((m) => m.name).includes(enumChoice)) {
    throw new TypeError(
      `Expected choice for enum type ${type.fqn} to be one of ${options.join(
        '|'
      )}, got: ${x.value}`
    );
  }

  return {
    type: 'enum',
    fqn: type.fqn,
    namespace: type.namespace,
    choice: enumChoice,
  };
}

export function assertEnum(typeRef: reflect.TypeReference): reflect.EnumType {
  if (!typeRef.type?.isEnumType()) {
    throw new TypeError(`Expected Enum, got ${typeRef.toString()}`);
  }

  return typeRef.type;
}
