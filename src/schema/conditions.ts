import { $ref } from './expression';
import { schemaForIntrinsic } from './intrinsics';

export const ConditionExpression = () => ({
  $comment:
    'Intrinsic function token expressions that can be used in Condition functions',
  type: ['object'],
  anyOf: [
    $ref('FnCondition'),
    $ref('FnAnd'),
    $ref('FnEquals'),
    $ref('FnNot'),
    $ref('FnOr'),
    $ref('FnRef'),
    $ref('FnFindInMap'),
  ],
});

export const FnCondition = () =>
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

export const FnAnd = () =>
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

export const FnEquals = () =>
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

export const FnIf = () => {
  const types = [
    $ref('PrimitiveLiteral'),
    $ref('FnBase64'),
    $ref('FnFindInMap'),
    $ref('FnGetAtt'),
    $ref('FnGetAZs'),
    $ref('FnIf'),
    $ref('FnJoin'),
    $ref('FnSelect'),
    $ref('FnSub'),
    $ref('FnRef'),
  ];
  return schemaForIntrinsic('Fn::If', {
    description:
      'https://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/intrinsic-function-reference-conditions.html#intrinsic-function-reference-conditions-if',
    params: [
      {
        name: 'condition_name',
        description:
          "A reference to a condition in the Conditions section. Use the condition's name to reference it.",
        types: [$ref('StringLiteral')],
      },
      {
        name: 'value_if_true',
        description:
          'A value to be returned if the specified condition evaluates to true.',
        types,
      },
      {
        name: 'value_if_false',
        description:
          'A value to be returned if the specified condition evaluates to false.',
        types,
      },
    ],
  });
};

export const FnNot = () =>
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

export const FnOr = () =>
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
