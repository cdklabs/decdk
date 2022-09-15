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

const PrimitiveLiteral = (ctx: SchemaContext) => ({
  $comment: 'A literal value',
  anyOf: [
    ctx.define('StringLiteral', StringLiteral),
    ctx.define('NumberLiteral', NumberLiteral),
    ctx.define('BooleanLiteral', BooleanLiteral),
    ctx.define('DateLiteral', DateLiteral),
  ],
});

const StringExpression = () => ({
  $comment: 'Intrinsic function token expression or literal string value',
  type: ['string', 'object'],
  anyOf: [
    $ref('StringLiteral'),
    $ref('FnRef'),
    $ref('FnBase64'),
    $ref('FnFindInMap'),
    $ref('FnGetAtt'),
    $ref('FnImportValue'),
    $ref('FnJoin'),
    $ref('FnSelect'),
    $ref('FnSub'),
    $ref('FnIf'),
  ],
});

const NumberExpression = () => ({
  $comment: 'Intrinsic function token expression or literal number value',
  type: ['number', 'object'],
  anyOf: [
    $ref('NumberLiteral'),
    $ref('FnRef'),
    $ref('FnFindInMap'),
    $ref('FnGetAtt'),
    $ref('FnImportValue'),
    $ref('FnSelect'),
    $ref('FnIf'),
  ],
});

const BooleanExpression = () => ({
  $comment: 'Intrinsic function token expression or literal boolean value',
  type: ['boolean', 'object'],
  anyOf: [
    $ref('BooleanLiteral'),
    $ref('FnRef'),
    $ref('FnFindInMap'),
    $ref('FnGetAtt'),
    $ref('FnImportValue'),
    $ref('FnSelect'),
    $ref('FnIf'),
  ],
});

export function schemaForExpressions(ctx: SchemaContext) {
  ctx.define('PrimitiveLiteral', PrimitiveLiteral);
  ctx.define('StringExpression', StringExpression);
  ctx.define('NumberExpression', NumberExpression);
  ctx.define('BooleanExpression', BooleanExpression);
}
