import { Match } from 'aws-cdk-lib/assertions';
import { Template } from '../../src/parser/template';
import { Testing } from '../util';

describe('Mappings', () => {
  test('can use Mapping with string value', async () => {
    // GIVEN
    const template = await Testing.template(
      await Template.fromObject({
        Mappings: {
          RegionMap: {
            'us-west-1': {
              HVM64: 'ami-0bdb828fd58c52235',
              HVMG2: 'ami-066ee5fd4a9ef77f1',
            },
            'eu-west-1': {
              HVM64: 'ami-047bb4163c506cd98',
              HVMG2: 'ami-0a7c483d527806435',
            },
          },
        },
        Resources: {
          myEC2Instance: {
            Type: 'AWS::EC2::Instance',
            Properties: {
              ImageId: {
                'Fn::FindInMap': ['RegionMap', { Ref: 'AWS::Region' }, 'HVM64'],
              },
              InstanceType: 'm1.small',
            },
          },
        },
      })
    );

    // THEN
    template.hasMapping('RegionMap', {
      'us-west-1': {
        HVM64: 'ami-0bdb828fd58c52235',
        HVMG2: 'ami-066ee5fd4a9ef77f1',
      },
      'eu-west-1': {
        HVM64: 'ami-047bb4163c506cd98',
        HVMG2: 'ami-0a7c483d527806435',
      },
    });
    template.hasResourceProperties('AWS::EC2::Instance', {
      ImageId: {
        'Fn::FindInMap': ['RegionMap', { Ref: 'AWS::Region' }, 'HVM64'],
      },
    });
  });

  test('can use Mapping with list value', async () => {
    // GIVEN
    const template = await Testing.template(
      await Template.fromObject({
        Mappings: {
          RegionMap: {
            'eu-west-1': {
              HVM64: ['ami-047bb4163c506cd98'],
              HVMG2: ['ami-0a7c483d527806435'],
            },
          },
        },
        Resources: {
          myEC2Instance: {
            Type: 'AWS::EC2::Instance',
            Properties: {
              ImageId: {
                'Fn::Select': [
                  0,
                  {
                    'Fn::FindInMap': [
                      'RegionMap',
                      { Ref: 'AWS::Region' },
                      'HVM64',
                    ],
                  },
                ],
              },
              InstanceType: 'm1.small',
            },
          },
        },
      })
    );

    // THEN
    template.hasMapping('RegionMap', {
      'eu-west-1': {
        HVM64: ['ami-047bb4163c506cd98'],
        HVMG2: ['ami-0a7c483d527806435'],
      },
    });
    template.hasResourceProperties('AWS::EC2::Instance', {
      ImageId: {
        'Fn::Select': [
          0,
          {
            'Fn::FindInMap': ['RegionMap', { Ref: 'AWS::Region' }, 'HVM64'],
          },
        ],
      },
    });
  });
});

describe('Parameters', () => {
  test('String parameter', async () => {
    // GIVEN
    const stringParam = {
      Default: 'MyS3Bucket',
      AllowedPattern: '^[a-zA-Z0-9]*$',
      ConstraintDescription:
        'a string consisting only of alphanumeric characters',
      Description: 'The name of your bucket',
      MaxLength: 10,
      MinLength: 1,
      Type: 'String',
      NoEcho: true,
    };
    const template = await Testing.template(
      await Template.fromObject({
        Parameters: {
          BucketName: stringParam,
        },
        Resources: {
          Bucket: {
            Type: 'aws-cdk-lib.aws_s3.Bucket',
            Properties: {
              bucketName: {
                Ref: 'BucketName',
              },
            },
          },
        },
      })
    );

    // THEN
    template.hasParameter('BucketName', stringParam);
    template.hasResourceProperties('AWS::S3::Bucket', {
      BucketName: { Ref: 'BucketName' },
    });
  });

  test('Number parameter', async () => {
    // GIVEN
    const numberParam = {
      Default: '3',
      MaxValue: '300', // Check can be a string
      MinValue: 0, // or a number
      AllowedValues: [1, 2, 3, 10, 100, 300, 'nonsense-string-value'],
      Type: 'Number',
      NoEcho: true,
    };
    const template = await Testing.template(
      await Template.fromObject({
        Parameters: {
          CorsMaxAge: numberParam,
        },
        Resources: {
          Bucket: {
            Type: 'aws-cdk-lib.aws_s3.Bucket',
            Properties: {
              bucketName: 'my-bucket',
              cors: [
                {
                  allowedMethods: ['GET', 'POST'],
                  allowedOrigins: ['origin1', 'origin2'],
                  maxAge: {
                    Ref: 'CorsMaxAge',
                  },
                },
              ],
            },
          },
        },
      })
    );

    // THEN
    template.hasParameter('CorsMaxAge', {
      Default: '3',
      MaxValue: 300, // should be parsed to number
      MinValue: 0,
      AllowedValues: [1, 2, 3, 10, 100, 300, 'nonsense-string-value'],
      Type: 'Number',
      NoEcho: true,
    });
    template.hasResourceProperties('AWS::S3::Bucket', {
      BucketName: 'my-bucket',
      CorsConfiguration: {
        CorsRules: Match.arrayWith([
          Match.objectLike({
            MaxAge: { Ref: 'CorsMaxAge' },
          }),
        ]),
      },
    });
  });

  test('NoEcho can be string "true"', async () => {
    // GIVEN
    const noEchoParam = {
      Default: 'MyS3Bucket',
      NoEcho: 'true',
      Type: 'String',
    };
    const template = await Testing.template(
      await Template.fromObject({
        Parameters: {
          BucketName: noEchoParam,
        },
        Resources: {
          Bucket: {
            Type: 'aws-cdk-lib.aws_s3.Bucket',
            Properties: {
              bucketName: {
                Ref: 'BucketName',
              },
            },
          },
        },
      })
    );

    // THEN
    template.hasParameter('BucketName', {
      NoEcho: true,
    });
    template.hasResourceProperties('AWS::S3::Bucket', {
      BucketName: { Ref: 'BucketName' },
    });
  });
});

describe('given a template with unknown top-level properties', () => {
  it('can synth the template and will ignore unknown properties', async () => {
    // GIVEN
    const template = await Testing.template(
      await Template.fromObject({
        Parameters: {},
        Mappings: {},
        Conditions: {},
        Rules: {},
        Resources: {
          WaitHandle: {
            Type: 'AWS::CloudFormation::WaitConditionHandle',
          },
        },
        Outputs: {},
        AWSTemplateFormatVersion: '2010-09-09',
        Whatever: {},
      }),
      false
    );

    // THEN
    template.hasResourceProperties(
      'AWS::CloudFormation::WaitConditionHandle',
      {}
    );
    expect(template.toJSON()).not.toHaveProperty('Whatever');
  });
});

describe('Outputs', () => {
  test('Simple value output', async () => {
    const template = await Testing.template(
      await Template.fromObject({
        Resources: {
          handler: {
            Type: 'AWS::CloudFormation::WaitConditionHandler',
          },
        },
        Outputs: {
          SimpleOutput: {
            Value: 'StringValue',
            Description: 'Description',
            Export: {
              Name: 'ExportName',
            },
          },
        },
      }),
      false
    );

    template.hasOutput('SimpleOutput', {
      Description: 'Description',
      Value: 'StringValue',
      Export: {
        Name: 'ExportName',
      },
    });
    expect(template.toJSON()).toHaveProperty('Outputs');
  });

  test('Simple output with condition', async () => {
    const template = await Testing.template(
      await Template.fromObject({
        Parameters: {
          Stage: {
            Type: 'String',
            Default: 'Prod',
          },
        },
        Conditions: {
          IsProd: {
            'Fn::Equals': [
              {
                Ref: 'Stage',
              },
              'Prod',
            ],
          },
        },
        Resources: {
          handler: {
            Type: 'AWS::CloudFormation::WaitConditionHandler',
          },
        },
        Outputs: {
          SimpleOutput: {
            Condition: 'IsProd',
            Value: 'StringValue',
            Description: 'Description',
          },
        },
      }),
      false
    );

    template.hasOutput('SimpleOutput', {
      Condition: 'IsProd',
      Description: 'Description',
      Value: 'StringValue',
    });
    template.hasParameter('Stage', {
      Type: 'String',
      Default: 'Prod',
    });
    expect(template.toJSON()).toHaveProperty('Outputs');
    expect(template.toJSON()).toHaveProperty('Parameters');
  });

  test('Simple output value with Fn::Join', async () => {
    const template = await Testing.template(
      await Template.fromObject({
        Resources: {
          handler: {
            Type: 'AWS::CloudFormation::WaitConditionHandler',
          },
        },
        Outputs: {
          SimpleOutput: {
            Value: {
              'Fn::Join': ['-', ['simple', 'output', 'value']],
            },
            Description: 'Description',
            Export: {
              Name: 'ExportName',
            },
          },
        },
      }),
      false
    );

    template.hasOutput('SimpleOutput', {
      Description: 'Description',
      Value: 'simple-output-value',
      Export: {
        Name: 'ExportName',
      },
    });
    expect(template.toJSON()).toHaveProperty('Outputs');
  });

  test('Simple export value with Fn::Join', async () => {
    const template = await Testing.template(
      await Template.fromObject({
        Resources: {
          handler: {
            Type: 'AWS::CloudFormation::WaitConditionHandler',
          },
        },
        Outputs: {
          SimpleOutput: {
            Value: {
              'Fn::Join': ['-', ['simple', 'output', 'value']],
            },
            Description: 'Description',
            Export: {
              Name: {
                'Fn::Join': ['-', ['export', 'value']],
              },
            },
          },
        },
      }),
      false
    );

    template.hasOutput('SimpleOutput', {
      Description: 'Description',
      Value: 'simple-output-value',
      Export: {
        Name: 'export-value',
      },
    });
    expect(template.toJSON()).toHaveProperty('Outputs');
  });
});

describe('can evaluate cyclic types', () => {
  test('JsonSchema', async () => {
    // GIVEN
    const template = await Testing.template(
      await Template.fromObject({
        Resources: {
          Api: {
            Type: 'aws-cdk-lib.aws_apigateway.RestApi',
          },
          ResponseModel: {
            On: 'Api',
            Call: {
              addModel: [
                'ResponseModel',
                {
                  contentType: 'application/json',
                  modelName: 'ResponseModel',
                  schema: {
                    schema: 'DRAFT4',
                    title: 'pollResponse',
                    type: 'OBJECT',
                    properties: {
                      state: { type: 'STRING' },
                      greeting: { type: 'STRING' },
                    },
                  },
                },
              ],
            },
          },
          MockIntegration: {
            Type: 'aws-cdk-lib.aws_apigateway.MockIntegration',
          },
          MockMethod: {
            Type: 'aws-cdk-lib.aws_apigateway.Method',
            On: 'Api',
            Call: {
              'root.addMethod': [
                'GET',
                {
                  Ref: 'MockIntegration',
                },
              ],
            },
          },
        },
      })
    );

    // THEN
    template.resourceCountIs('AWS::ApiGateway::RestApi', 1);
    template.resourceCountIs('AWS::ApiGateway::Model', 1);
    template.resourceCountIs('AWS::ApiGateway::Method', 1);
  });
});
