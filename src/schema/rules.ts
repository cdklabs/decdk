import { $ref } from './expression';
import { schemaForIntrinsic } from './intrinsics';
import { SchemaContext } from './jsii2schema';

export const schemaForRules = (ctx: SchemaContext) => ({
  $comment:
    'The optional Rules section validates a parameter or a combination of parameters passed to a template during a stack creation or stack update.',
  additionalProperties: false,
  patternProperties: {
    '^[a-zA-Z0-9]+$': ctx.define('Rule', () => ({
      additionalProperties: false,
      type: 'object',
      properties: {
        RuleCondition: ctx.define('RuleExpression', RuleExpression),
        Assertions: {
          type: 'array',
          items: [
            {
              type: 'object',
              additionalProperties: false,
              properties: {
                Assert: ctx.define('RuleExpression', RuleExpression),
                AssertDescription: {
                  type: 'string',
                },
              },
              required: ['Assert'],
            },
          ],
        },
      },
      required: ['Assertions'],
    })),
  },
  type: 'object',
});

const LIST_TYPES = [
  { type: 'array', items: $ref('StringExpression') },
  $ref('ListExpression'),
  $ref('FnRefAll'),
  $ref('FnValueOf'),
  $ref('FnValueOfAll'),
];

const BOOLEAN_TYPES = [
  $ref('FnRuleAnd'),
  $ref('FnRuleEquals'),
  $ref('FnRuleNot'),
  $ref('FnRuleOr'),
  $ref('FnContains'),
  $ref('FnEachMemberEquals'),
  $ref('FnEachMemberIn'),
];

export const RuleExpression = (ctx: SchemaContext) => ({
  type: 'object',
  anyOf: [
    ctx.define('FnContains', FnContains),
    ctx.define('FnEachMemberEquals', FnEachMemberEquals),
    ctx.define('FnEachMemberIn', FnEachMemberIn),
    ctx.define('FnRefAll', FnRefAll),
    ctx.define('FnValueOf', FnValueOf),
    ctx.define('FnValueOfAll', FnValueOfAll),
    ctx.define('FnRuleAnd', FnAnd),
    ctx.define('FnRuleEquals', FnEquals),
    ctx.define('FnRuleNot', FnNot),
    ctx.define('FnRuleOr', FnOr),
    $ref('FnRef'),
  ],
});

const FnContains = () =>
  schemaForIntrinsic('Fn::Contains', {
    description:
      'https://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/intrinsic-function-reference-rules.html#fn-contains',
    params: [
      {
        name: 'listOfStrings',
        description: 'A list of strings, such as "A", "B", "C".',
        types: LIST_TYPES,
      },
      {
        name: 'string',
        description:
          'A string, such as "A", that you want to compare against a list of strings.',
        types: [$ref('StringExpression')],
      },
    ],
  });

const FnEachMemberEquals = () =>
  schemaForIntrinsic('Fn::EachMemberEquals', {
    description:
      'https://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/intrinsic-function-reference-rules.html#fn-eachmemberequals',
    params: [
      {
        name: 'listOfStrings',
        description: 'A list of strings, such as "A", "B", "C".',
        types: LIST_TYPES,
      },
      {
        name: 'string',
        description:
          'A string, such as "A", that you want to compare against a list of strings.',
        types: [$ref('StringExpression')],
      },
    ],
  });

const FnEachMemberIn = () =>
  schemaForIntrinsic('Fn::EachMemberIn', {
    description:
      'https://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/intrinsic-function-reference-rules.html#fn-eachmemberin',
    params: [
      {
        name: 'stringsToCheck',
        description:
          'A list of strings, such as "A", "B", "C". CloudFormation checks whether each member in the strings_to_check parameter is in the strings_to_match parameter',
        types: LIST_TYPES,
      },
      {
        name: 'stringsToMatch',
        description:
          'A list of strings, such as "A", "B", "C". Each member in the strings_to_match parameter is compared against the members of the strings_to_check parameter.',
        types: LIST_TYPES,
      },
    ],
  });

const FnRefAll = () =>
  schemaForIntrinsic('Fn::RefAll', {
    description:
      'https://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/intrinsic-function-reference-rules.html#fn-refall',
    params: [
      {
        name: 'parameterType',
        description:
          'An AWS-specific parameter type, such as AWS::EC2::SecurityGroup::Id or AWS::EC2::VPC::Id',
        types: [$ref('StringExpression')],
      },
    ],
    variadic: [1, 1],
  });

const FnValueOf = () =>
  schemaForIntrinsic('Fn::ValueOf', {
    description:
      'https://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/intrinsic-function-reference-rules.html#fn-valueof',
    params: [
      {
        name: 'parameterLogicalId',
        description:
          'The name of a parameter for which you want to retrieve attribute values.',
        types: [$ref('StringLiteral')],
      },
      {
        name: 'attribute',
        description:
          'The name of an attribute from which you want to retrieve a value.',
        types: [$ref('StringLiteral')],
      },
    ],
  });

const FnValueOfAll = () =>
  schemaForIntrinsic('Fn::ValueOfAll', {
    description:
      'https://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/intrinsic-function-reference-rules.html#fn-valueofall',
    params: [
      {
        name: 'parameterType',
        description:
          'An AWS-specific parameter type, such as AWS::EC2::SecurityGroup::Id or AWS::EC2::VPC::Id.',
        types: [$ref('StringExpression')],
      },
      {
        name: 'attribute',
        description:
          'The name of an attribute from which you want to retrieve a value.',
        types: [$ref('StringExpression')],
      },
    ],
  });

/* We need to redefine the following functions to allow other rule specific
   functions to be used inside them. For example:

      Fn::And:
        Fn::Contains: ...
        Fn::EachMemberIn: ...
*/

const FnAnd = () =>
  schemaForIntrinsic('Fn::And', {
    description:
      'https://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/intrinsic-function-reference-conditions.html#intrinsic-function-reference-conditions-and',
    variadic: [2, 10],
    params: [
      {
        name: 'condition',
        description: 'A condition that evaluates to true or false.',
        types: BOOLEAN_TYPES,
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
        types: [$ref('PrimitiveLiteral'), $ref('RuleExpression')],
      },
      {
        name: 'value2',
        description: 'The second value of any type that you want to compare.',
        types: [$ref('PrimitiveLiteral'), $ref('RuleExpression')],
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
        types: BOOLEAN_TYPES,
      },
    ],
    variadic: [1, 1],
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
        types: BOOLEAN_TYPES,
      },
    ],
  });
