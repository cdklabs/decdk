import { SchemaContext } from './jsii2schema';

export const $ref = (ref: string) => ({ $ref: `#/definitions/${ref}` });

const StringLiteral = () => ({
  $comment: 'Literal string value',
  type: 'string',
});

const NumberLiteral = () => ({
  $comment: 'Literal number value',
  type: 'number',
});

const BooleanLiteral = () => ({
  $comment: 'Literal boolean value',
  type: 'boolean',
});

const DateLiteral = () => ({
  $comment: 'Literal date value',
  type: 'string',
  format: 'date-time',
});

export function schemaForExpressions(
  ctx: SchemaContext,
  supportedIntrinsicFunctions: {
    string: string[];
    number: string[];
    boolean: string[];
    list: string[];
  } = {
    string: [],
    number: [],
    boolean: [],
    list: [],
  }
) {
  ctx.define('PrimitiveLiteral', () => ({
    $comment: 'A literal value',
    anyOf: [
      ctx.define('StringLiteral', StringLiteral),
      ctx.define('NumberLiteral', NumberLiteral),
      ctx.define('BooleanLiteral', BooleanLiteral),
      ctx.define('DateLiteral', DateLiteral),
    ],
  }));
  ctx.define('StringExpression', () => ({
    $comment: 'Intrinsic function token expression or literal string value',
    type: ['string', 'object'],
    anyOf: [
      $ref('StringLiteral'),
      ...supportedIntrinsicFunctions.string.map($ref),
    ],
  }));
  ctx.define('NumberExpression', () => ({
    $comment: 'Intrinsic function token expression or literal number value',
    type: ['number', 'object'],
    anyOf: [
      $ref('NumberLiteral'),
      ...supportedIntrinsicFunctions.number.map($ref),
    ],
  }));
  ctx.define('BooleanExpression', () => ({
    $comment: 'Intrinsic function token expression or literal boolean value',
    type: ['boolean', 'object'],
    anyOf: [
      $ref('BooleanLiteral'),
      ...supportedIntrinsicFunctions.boolean.map($ref),
    ],
  }));
  ctx.define('ListExpression', () => ({
    $comment: 'Intrinsic function returning a list',
    type: ['object'],
    anyOf: supportedIntrinsicFunctions.list.map($ref),
  }));
}
