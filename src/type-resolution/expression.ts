import { ParserError } from '../parser/private/types';
import {
  ArrayExpression,
  BooleanLiteral,
  IntrinsicExpression,
  NumberLiteral,
  ObjectExpression,
  StringLiteral,
  TemplateExpression,
} from '../parser/template';
import { InitializerExpression, StaticMethodCallExpression } from './callables';
import { EnumExpression, StaticPropertyExpression } from './enums';
import { DateLiteral } from './literals';
import { AnyTemplateExpression, VoidExpression } from './primitives';
import { StructExpression } from './struct';

export type TypedTemplateExpression =
  | IntrinsicExpression
  | StringLiteral
  | NumberLiteral
  | BooleanLiteral
  | DateLiteral
  | TypedArrayExpression
  | TypedObjectExpression
  | EnumExpression
  | StructExpression
  | StaticPropertyExpression
  | StaticMethodCallExpression
  | InitializerExpression
  | VoidExpression
  | AnyTemplateExpression;

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
