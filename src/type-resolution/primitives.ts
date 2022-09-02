import * as reflect from 'jsii-reflect';
import { ParserError } from '../parser/private/types';
import { IntrinsicExpression, TemplateExpression } from '../parser/template';

export interface AnyTemplateExpression {
  readonly type: 'any';
  readonly value: TemplateExpression;
}

export function resolveAnyExpression(
  x: TemplateExpression
): AnyTemplateExpression {
  return {
    type: 'any',
    value: x,
  };
}

export function isAny(typeRef: reflect.TypeReference): boolean {
  return (
    typeRef.isAny || typeRef.primitive === 'any' || typeRef.primitive === 'json'
  );
}

export interface VoidExpression {
  readonly type: 'void';
}

export function assertVoid(x: unknown): void {
  if (x !== undefined || x !== null) {
    throw new ParserError(`Expected nothing, got: ${JSON.stringify(x)}`);
  }
}

export function resolveVoidExpression(): VoidExpression {
  return {
    type: 'void',
  };
}

export function assertLiteralOrIntrinsic<
  T extends 'string' | 'number' | 'boolean'
>(
  x: TemplateExpression,
  type: T
): (TemplateExpression & { type: T }) | IntrinsicExpression {
  if (![type, 'intrinsic'].includes(x.type)) {
    throw new ParserError(`Expected ${type}, got: ${JSON.stringify(x)}`);
  }

  return x as TemplateExpression & { type: T };
}
