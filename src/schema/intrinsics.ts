import { ConditionExpression } from './conditions';
import { $ref, schemaForExpressions } from './expression';
import { SchemaContext } from './jsii2schema';

const FnBase64 = () =>
  schemaForIntrinsic('Fn::Base64', {
    description:
      'https://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/intrinsic-function-reference-base64.html',
    params: [
      {
        name: 'valueToEncode',
        description: 'The original string, in Base64 representation.',
        types: [$ref('StringExpression')],
      },
    ],
  });

const FnCidr = () => {
  const supported = [$ref('FnSelect'), $ref('FnRef'), $ref('FnGetAtt')];

  return schemaForIntrinsic('Fn::Cidr', {
    description:
      'https://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/intrinsic-function-reference-cidr.html',
    params: [
      {
        name: 'ipBlock',
        description:
          'The user-specified CIDR address block to be split into smaller CIDR blocks.',
        types: [$ref('StringLiteral'), ...supported],
      },
      {
        name: 'count',
        description:
          'The number of CIDRs to generate. Valid range is between 1 and 256.',
        types: [
          {
            type: 'integer',
            minimum: 1,
            maximum: 256,
          },
          ...supported,
        ],
      },
      {
        name: 'cidrBits',
        optional: true,
        description:
          'The number of subnet bits for the CIDR. For example, specifying a value "8" for this parameter will create a CIDR with a mask of "/24".',
        types: [
          {
            type: 'integer',
            minimum: 1,
            maximum: 128,
          },
          ...supported,
        ],
      },
    ],
  });
};

const FnFindInMap = () => {
  const types = [$ref('StringLiteral'), $ref('FnRef'), $ref('FnSelect')];

  return schemaForIntrinsic('Fn::FindInMap', {
    description:
      'https://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/intrinsic-function-reference-findinmap.html',
    params: [
      {
        name: 'MapName',
        description:
          'The logical name of a mapping declared in the Mappings section that contains the keys and values.',
        types,
      },
      {
        name: 'TopLevelKey',
        description:
          'The top-level key name. Its value is a list of key-value pairs.',
        types,
      },
      {
        name: 'SecondLevelKey',
        description:
          'The second-level key name, which is set to one of the keys from the list assigned to TopLevelKey.',
        types,
      },
    ],
  });
};

const FnGetAtt = () => ({
  anyOf: [
    schemaForIntrinsic('Fn::GetAtt', {
      description:
        'https://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/intrinsic-function-reference-getatt.html',
      params: [
        {
          name: 'logicalNameOfResource',
          description:
            'The logical name (also called logical ID) of the resource that contains the attribute that you want.',
          types: [$ref('StringLiteral')],
        },
        {
          name: 'attributeName',
          description:
            "The name of the resource-specific attribute whose value you want. See the resource's reference page for details about the attributes available for that resource type.",
          types: [$ref('StringLiteral'), $ref('FnRef')],
        },
      ],
    }),
    schemaForIntrinsic('Fn::GetAtt', {
      description:
        'https://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/intrinsic-function-reference-getatt.html',
      params: [
        {
          name: 'shortSyntaxForm',
          description:
            'The logical name and attribute name in short syntax form: logicalNameOfResource.attributeName.',
          types: [$ref('StringLiteral')],
        },
      ],
    }),
  ],
});

const FnGetAZs = () =>
  schemaForIntrinsic('Fn::GetAZs', {
    description:
      'https://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/intrinsic-function-reference-getavailabilityzones.html',
    params: [
      {
        name: 'region',
        description:
          'The name of the region for which you want to get the Availability Zones.',
        types: [$ref('StringLiteral'), $ref('FnRef')],
      },
    ],
  });

const FnIf = () => {
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

const FnImportValue = () =>
  schemaForIntrinsic('Fn::ImportValue', {
    description:
      'https://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/intrinsic-function-reference-importvalue.html',
    params: [
      {
        name: 'sharedValueToImport',
        description: 'The stack output value that you want to import.',
        types: [
          $ref('StringLiteral'),
          $ref('FnBase64'),
          $ref('FnFindInMap'),
          $ref('FnIf'),
          $ref('FnJoin'),
          $ref('FnSelect'),
          $ref('FnSplit'),
          $ref('FnSub'),
          $ref('FnRef'),
        ],
      },
    ],
  });

const FnJoin = () =>
  schemaForIntrinsic('Fn::Join', {
    description:
      'https://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/intrinsic-function-reference-join.html',
    params: [
      {
        name: 'delimiter',
        description:
          "The value you want to occur between fragments. The delimiter will occur between fragments only. It won't terminate the final value.",
        types: [$ref('StringLiteral')],
      },
      {
        name: 'ListOfValues',
        description: 'The list of values you want combined.',
        types: [
          {
            anyOf: [
              $ref('ListExpression'),
              {
                type: 'array',
                items: $ref('StringExpression'),
              },
            ],
          },
        ],
      },
    ],
  });

const FnSelect = () => {
  return schemaForIntrinsic('Fn::Select', {
    description:
      'https://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/intrinsic-function-reference-select.html',
    params: [
      {
        name: 'index',
        description:
          'The index of the object to retrieve. This must be a value from zero to N-1, where N represents the number of elements in the array.',
        types: [
          { type: ['integer', 'string'] },
          $ref('FnRef'),
          $ref('FnFindInMap'),
        ],
      },
      {
        name: 'listOfObjects',
        description:
          'The list of objects to select from. This list must not be null, nor can it have null entries.',
        types: [
          $ref('ListExpression'),
          {
            type: 'array',
            items: {
              anyOf: [$ref('PrimitiveLiteral'), $ref('IntrinsicExpression')],
            },
            minItems: 1,
          },
        ],
      },
    ],
  });
};

const FnSplit = () =>
  schemaForIntrinsic('Fn::Split', {
    description:
      'https://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/intrinsic-function-reference-split.html',
    params: [
      {
        name: 'delimiter',
        description:
          'A string value that determines where the source string is divided.',
        types: [$ref('StringLiteral')],
      },
      {
        name: 'sourceString',
        description: 'The string value that you want to split.',
        types: [$ref('StringExpression')],
      },
    ],
  });

const FnSub = () =>
  schemaForIntrinsic('Fn::Sub', {
    description:
      'https://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/intrinsic-function-reference-sub.html',
    params: [
      {
        name: 'substituteString',
        description:
          "A string with variables that AWS CloudFormation substitutes with their associated values at runtime. Write variables as ${MyVarName}. Variables can be template parameter names, resource logical IDs, resource attributes, or a variable in a key-value map. If you specify only template parameter names, resource logical IDs, and resource attributes, don't specify a key-value map.\nIf you specify template parameter names or resource logical IDs, such as ${InstanceTypeParameter}, AWS CloudFormation returns the same values as if you used the Ref intrinsic function. If you specify resource attributes, such as ${MyInstance.PublicIp}, AWS CloudFormation returns the same values as if you used the Fn::GetAtt intrinsic function.\nTo write a dollar sign and curly braces (${}) literally, add an exclamation point (!) after the open curly brace, such as ${!Literal}. AWS CloudFormation resolves this text as ${Literal}.",
        types: [$ref('StringLiteral')],
      },
      {
        name: 'substituteMap',
        optional: true,
        description:
          'The name of a variable that you included in the String parameter.',
        types: [
          {
            type: 'object',
            patternProperties: {
              '^[a-zA-Z0-9._-]{1,255}$': {
                $comment:
                  'The value that AWS CloudFormation substitutes for the associated variable name at runtime.',
                anyOf: [
                  $ref('StringLiteral'),
                  $ref('FnBase64'),
                  $ref('FnFindInMap'),
                  $ref('FnGetAtt'),
                  $ref('FnGetAZs'),
                  $ref('FnIf'),
                  $ref('FnImportValue'),
                  $ref('FnJoin'),
                  $ref('FnSelect'),
                  $ref('FnRef'),
                ],
              },
            },
            minProperties: 1,
          },
        ],
      },
    ],
  });

const FnTransform = () =>
  schemaForIntrinsic('Fn::Transform', {
    description:
      'https://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/intrinsic-function-reference-transform.html',
    params: [
      {
        name: 'Name',
        description:
          'The name of the macro you want to perform the processing.',
        types: [$ref('StringLiteral')],
      },
      {
        name: 'Parameters',
        description:
          'The list parameters, specified as key-value pairs, to pass to the macro.',
        types: [{ type: 'object' }],
      },
    ],
  });

const FnRef = () => ({
  anyOf: ['Ref', 'Fn::Ref'].map((name) =>
    schemaForIntrinsic(name, {
      description:
        'https://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/intrinsic-function-reference-ref.html',
      params: [
        {
          name: 'logicalName',
          description:
            'The logical name of the resource or parameter you want to reference.',
          types: [$ref('StringLiteral')],
        },
      ],
    })
  ),
});

export function schemaForIntrinsicFunctions(ctx: SchemaContext) {
  schemaForExpressions(ctx);
  ctx.define('IntrinsicExpression', () => ({
    $comment: 'Intrinsic function token expression',
    type: ['string'],
    anyOf: [
      ctx.define('FnBase64', FnBase64),
      ctx.define('FnCidr', FnCidr),
      ctx.define('FnFindInMap', FnFindInMap),
      ctx.define('FnGetAtt', FnGetAtt),
      ctx.define('FnGetAZs', FnGetAZs),
      ctx.define('FnImportValue', FnImportValue),
      ctx.define('FnJoin', FnJoin),
      ctx.define('FnSelect', FnSelect),
      ctx.define('FnSplit', FnSplit),
      ctx.define('FnSub', FnSub),
      ctx.define('FnTransform', FnTransform),
      ctx.define('FnRef', FnRef),
      ctx.define('FnIf', FnIf),
    ],
  }));
  ctx.define('ConditionExpression', ConditionExpression);
}

interface IntrinsicDefinition {
  description: string;
  variadic?: [number, number];
  params: ParameterDefinition[];
}

export function schemaForIntrinsic(name: string, def: IntrinsicDefinition) {
  if (def.params.length === 1 && !def.variadic) {
    return {
      type: 'object',
      properties: {
        [name]: {
          ...schemaForIntrinsicParam(def.params[0]),
          description: def.description,
        },
      },
      additionalProperties: false,
    };
  }

  if (def.params.length === 1 && def.variadic) {
    return {
      type: 'object',
      properties: {
        [name]: {
          description: def.description,
          type: 'array',
          items: schemaForIntrinsicParam(def.params[0]),
          minItems: def.variadic[0],
          maxItems: def.variadic[1],
        },
      },
      additionalProperties: false,
    };
  }

  return {
    type: 'object',
    properties: {
      [name]: {
        description: def.description,
        type: 'array',
        items: def.params.map((p: any) => schemaForIntrinsicParam(p)),
        minItems: def.params.filter((p: any) => !p.optional).length,
        maxItems: def.params.length,
        additionalItems: false,
      },
    },
    additionalProperties: false,
  };
}

interface ParameterDefinition {
  name: string;
  description: string;
  optional?: boolean;
  types: any[];
}

function schemaForIntrinsicParam(def: ParameterDefinition) {
  if (def.types.length === 1) {
    return {
      $comment: def.description ?? undefined,
      ...def.types[0],
    };
  }

  return {
    $comment: def.description ?? undefined,
    anyOf: def.types,
  };
}
