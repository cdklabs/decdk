import * as reflect from 'jsii-reflect';
import { assertString } from '../parser/private/types';
import { StringLiteral, TemplateExpression } from '../parser/template';
import {
  resolveStaticMethodCallExpression,
  StaticMethodCallExpression,
} from './callables';
import { assertExpressionType } from './expression';

export interface StaticPropertyExpression {
  readonly type: 'staticProperty';
  readonly fqn: string;
  readonly namespace?: string;
  readonly property: string;
}

export function resolveEnumLikeExpression(
  x: TemplateExpression,
  type: reflect.ClassType
): StaticPropertyExpression | StaticMethodCallExpression {
  if (x.type === 'string') {
    return {
      type: 'staticProperty',
      fqn: type.fqn,
      namespace: type.namespace,
      property: x.value,
    };
  }

  return resolveStaticMethodCallExpression(
    assertExpressionType(x, 'object'),
    type.system,
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
