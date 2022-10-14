import { $ref } from './expression';
import { schemaForIntrinsic } from './intrinsics';
import { SchemaContext } from './jsii2schema';

export const schemaForRules = (ctx: SchemaContext) => ({
  $comment:
    'The optional Rules section validates a parameter or a combination of parameters passed to a template during a stack creation or stack update.',
  additionalProperties: false,
  patternProperties: {
    '^[a-zA-Z0-9]+$': ctx.define('Rule', RuleExpression),
  },
  type: 'object',
});

export const RuleExpression = (ctx: SchemaContext) => ({
  additionalProperties: false,
  type: 'object',
  properties: {
    RuleCondition: ruleSpecificIntrinsic(ctx),
    Assertions: {
      type: 'array',
      items: [
        {
          Assert: ruleSpecificIntrinsic(ctx),
          AssertDescription: {
            type: 'string',
          },
        },
      ],
    },
  },
});

const ruleSpecificIntrinsic = (ctx: SchemaContext) =>
  ctx.define('RuleSpecificIntrinsic', () => ({
    $comment:
      'Intrinsic function token expressions that can be used in Rule functions',
    anyOf: [
      ctx.define('FnContains', FnContains),
      ctx.define('FnEachMemberEquals', FnEachMemberEquals),
      ctx.define('FnEachMemberIn', FnEachMemberIn),
      ctx.define('FnRefAll', FnRefAll),
      ctx.define('FnValueOf', FnValueOf),
      ctx.define('FnValueOfAll', FnValueOfAll),
      $ref('FnAnd'),
      $ref('FnEquals'),
      $ref('FnIf'),
      $ref('FnNot'),
      $ref('FnOr'),
      $ref('FnRef'),
    ],
  }));

const FnContains = () =>
  schemaForIntrinsic('Fn::Contains', {
    description:
      'https://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/intrinsic-function-reference-rules.html#fn-contains',
    params: [
      {
        name: 'listOfStrings',
        description: 'A list of strings, such as "A", "B", "C".',
        types: [{ type: 'array', items: $ref('StringExpression') }],
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
        types: [{ type: 'array', items: $ref('StringExpression') }],
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
        types: [{ type: 'array', items: $ref('StringExpression') }],
      },
      {
        name: 'stringsToMatch',
        description:
          'A list of strings, such as "A", "B", "C". Each member in the strings_to_match parameter is compared against the members of the strings_to_check parameter.',
        types: [{ type: 'array', items: $ref('StringExpression') }],
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
