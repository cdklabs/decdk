import { $ref } from './expression';
import { schemaForIntrinsic } from './intrinsics';
import { SchemaContext } from './jsii2schema';

export const ConditionExpression = (ctx: SchemaContext) => ({
  $comment:
    'Intrinsic function token expressions that can be used in Condition functions',
  type: ['object'],
  anyOf: [
    ctx.define('FnCondition', FnCondition),
    ctx.define('FnAnd', FnAnd),
    ctx.define('FnEquals', FnEquals),
    ctx.define('FnNot', FnNot),
    ctx.define('FnOr', FnOr),
    $ref('FnRef'),
    $ref('FnFindInMap'),
  ],
});

const FnCondition = () =>
  schemaForIntrinsic('Condition', {
    description:
      'https://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/intrinsic-function-reference-condition.html',
    params: [
      {
        name: 'conditionName',
        description: 'The name of the condition you want to reference.',
        types: [$ref('StringLiteral')],
      },
    ],
  });

const FnAnd = () =>
  schemaForIntrinsic('Fn::And', {
    description:
      'https://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/intrinsic-function-reference-conditions.html#intrinsic-function-reference-conditions-and',
    variadic: [2, 10],
    params: [
      {
        name: 'condition',
        description: 'A condition that evaluates to true or false.',
        types: [$ref('ConditionExpression')],
      },
    ],
  });

const FnEquals = () =>
  schemaForIntrinsic('Fn::Equals', {
    description:
      'https://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/intrinsic-function-reference-conditions.html#intrinsic-function-reference-conditions-equals',
    params: [
      {
        name: 'value1',
        description: 'The first value of any type that you want to compare.',
        types: [$ref('PrimitiveLiteral'), $ref('ConditionExpression')],
      },
      {
        name: 'value2',
        description: 'The second value of any type that you want to compare.',
        types: [$ref('PrimitiveLiteral'), $ref('ConditionExpression')],
      },
    ],
  });

const FnNot = () =>
  schemaForIntrinsic('Fn::Not', {
    description:
      'https://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/intrinsic-function-reference-conditions.html#intrinsic-function-reference-conditions-not',
    params: [
      {
        name: 'condition',
        description:
          'A condition such as Fn::Equals that evaluates to true or false.',
        types: [$ref('ConditionExpression')],
      },
    ],
  });

const FnOr = () =>
  schemaForIntrinsic('Fn::Or', {
    description:
      'https://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/intrinsic-function-reference-conditions.html#intrinsic-function-reference-conditions-or',
    variadic: [2, 10],
    params: [
      {
        name: 'condition',
        description: 'A condition that evaluates to true or false.',
        types: [$ref('ConditionExpression')],
      },
    ],
  });
