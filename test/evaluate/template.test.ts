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
      Description:
        'the time in seconds that a browser will cache the preflight response',
      MaxValue: 300,
      MinValue: 0,
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
    template.hasParameter('CorsMaxAge', numberParam);
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
