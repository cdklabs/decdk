import { ParserError } from '../parser/private/types';
import {
  ArrayExpression,
  BooleanLiteral,
  IntrinsicExpression,
  NullLiteral,
  NumberLiteral,
  ObjectExpression,
  StringLiteral,
  TemplateExpression,
} from '../parser/template';
import { InitializerExpression, StaticMethodCallExpression } from './callables';
import { EnumExpression, StaticPropertyExpression } from './enums';
import { DateLiteral } from './literals';
import { AnyTemplateExpression, VoidExpression } from './primitives';
import { ResolveReferenceExpression } from './references';
import { ResourceLike } from './resource-like';
import { StructExpression } from './struct';

export type TypedTemplateExpression =
  | IntrinsicExpression
  | ResolveReferenceExpression
  | StringLiteral
  | NumberLiteral
  | BooleanLiteral
  | DateLiteral
  | NullLiteral
  | TypedArrayExpression
  | TypedObjectExpression
  | EnumExpression
  | StructExpression
  | StaticPropertyExpression
  | StaticMethodCallExpression
  | InitializerExpression
  | VoidExpression
  | AnyTemplateExpression
  | ResourceLike;

export interface TypedArrayExpression
  extends ArrayExpression<TypedTemplateExpression> {}
export interface TypedObjectExpression
  extends ObjectExpression<TypedTemplateExpression> {}

export function assertExpressionType<T extends TemplateExpression['type']>(
  x: TemplateExpression,
  type: T
): TemplateExpression & { type: T } {
  if (x.type !== type) {
    throw new ParserError(`Expected ${type}, got: ${JSON.stringify(x)}`);
  }

  return x as TemplateExpression & { type: T };
}

export function isExpressionShaped(x: unknown): x is TypedTemplateExpression {
  return x !== null && typeof x === 'object' && 'type' in x;
}

export function assertExpressionShaped(x: unknown): TypedTemplateExpression {
  if (!isExpressionShaped(x)) {
    throw new Error(`Expected expression, got: ${JSON.stringify(x)}`);
  }

  return x as TypedTemplateExpression;
}

export interface TypedTemplateOutput {
  readonly description?: string;
  readonly value: TypedTemplateExpression;
  readonly exportName?: TypedTemplateExpression;
  readonly conditionName?: string;
}

export function toTypedTemplateExpression(
  input: TemplateExpression
): TypedTemplateExpression {
  switch (input.type) {
    case 'boolean':
    case 'number':
    case 'string':
      return {
        type: input.type,
        value: input.value,
      } as TypedTemplateExpression;
    case 'array':
      return {
        type: 'array',
        array: convertArray(input.array),
      } as TypedArrayExpression;
    case 'object':
      return {
        type: 'object',
        fields: convertObject(input.fields),
      } as TypedObjectExpression;
    case 'intrinsic':
      return input;
    default:
      throw new Error(`Encounter unexpected type ${input}`);
  }
}

export function convertArray(
  xs: TemplateExpression[]
): TypedTemplateExpression[] {
  return xs.map((item) => toTypedTemplateExpression(item));
}

export function convertObject(
  xs: Record<string, TemplateExpression>
): Record<string, TypedTemplateExpression> {
  return Object.fromEntries(
    Object.entries(xs).map(([k, v]) => [k, toTypedTemplateExpression(v)])
  );
}
