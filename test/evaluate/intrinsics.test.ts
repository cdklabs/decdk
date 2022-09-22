import { Match } from 'aws-cdk-lib/assertions';
import { Template } from '../../src/parser/template';
import { Testing } from '../util';

test('can use intrinsic where primitive number is expected', async () => {
  // GIVEN
  const template = await Testing.template(
    await Template.fromObject({
      Resources: {
        Lambda: {
          Type: 'aws-cdk-lib.aws_lambda.Function',
          Properties: {
            code: {
              'aws-cdk-lib.aws_lambda.Code.fromInline': {
                code: 'whatever',
              },
            },
            runtime: 'NODEJS_16_X',
            handler: 'index.handler',
            timeout: {
              'aws-cdk-lib.Duration.seconds': {
                amount: { 'Fn::Select': [0, [5, 15, 20]] },
              },
            },
          },
        },
      },
    })
  );

  // THEN
  template.hasResourceProperties('AWS::Lambda::Function', {
    Timeout: 5,
  });
});

test('can use intrinsic where primitive boolean is expected', async () => {
  // GIVEN
  const template = await Testing.template(
    await Template.fromObject({
      Mappings: {
        RegionMap: {
          'us-east-1': {
            TRUE: '0',
            FALSE: '1',
          },
        },
      },

      Resources: {
        Bucket: {
          Type: 'AWS::S3::Bucket',
        },
        Topic: {
          Type: 'aws-cdk-lib.aws_sns.Topic',
          Properties: {
            fifo: {
              'Fn::Select': [1, [true, false]],
            },
          },
        },
      },
    })
  );

  // THEN
  template.hasResourceProperties('AWS::SNS::Topic', {
    FifoTopic: false,
  });
});

test('FnBase64', async () => {
  // GIVEN
  const template = await Testing.template(
    await Template.fromObject({
      Resources: {
        Bucket: {
          Type: 'aws-cdk-lib.aws_s3.Bucket',
        },
        Topic: {
          Type: 'aws-cdk-lib.aws_sns.Topic',
          Properties: {
            displayName: { 'Fn::Base64': 'Test' },
            topicName: { 'Fn::Base64': { Ref: 'Bucket' } },
          },
        },
      },
    })
  );

  // THEN
  template.hasResourceProperties('AWS::SNS::Topic', {
    DisplayName: { 'Fn::Base64': 'Test' },
    TopicName: {
      'Fn::Base64': { Ref: Match.stringLikeRegexp('^Bucket.{8}$') },
    },
  });
});

test('FnCidr', async () => {
  // GIVEN
  const template = await Testing.template(
    await Template.fromObject({
      Resources: {
        VPC: {
          Type: 'AWS::EC2::VPC',
        },
        Subnet: {
          Type: 'aws-cdk-lib.aws_ec2.Subnet',
          Properties: {
            vpcId: { Ref: 'VPC' },
            availabilityZone: 'us-east-1a',
            cidrBlock: {
              'Fn::Select': [
                0,
                {
                  'Fn::Cidr': [{ 'Fn::GetAtt': ['VPC', 'CidrBlock'] }, 1, 8],
                },
              ],
            },
          },
        },
      },
    })
  );

  // THEN
  template.hasResourceProperties('AWS::EC2::Subnet', {
    CidrBlock: {
      'Fn::Select': [
        0,
        {
          'Fn::Cidr': [{ 'Fn::GetAtt': ['VPC', 'CidrBlock'] }, 1, 8],
        },
      ],
    },
  });
});

describe('FnGetAtt', () => {
  test('can get attributes from the underlying resource', async () => {
    // GIVEN
    const template = await Testing.template(
      await Template.fromObject({
        Resources: {
          VPC: {
            Type: 'aws-cdk-lib.aws_ec2.Vpc',
          },
          Subnet: {
            Type: 'aws-cdk-lib.aws_ec2.Subnet',
            Properties: {
              vpcId: { Ref: 'VPC' },
              availabilityZone: 'us-east-1a',
              cidrBlock: { 'Fn::GetAtt': ['VPC', 'CidrBlock'] },
            },
          },
        },
      })
    );

    // THEN
    template.hasResourceProperties('AWS::EC2::Subnet', {
      AvailabilityZone: 'us-east-1a',
      CidrBlock: {
        'Fn::GetAtt': [Match.stringLikeRegexp('^VPC.{8}$'), 'CidrBlock'],
      },
    });
  });

  test('cannot get non existing attributes', async () => {
    // GIVEN
    const template = await Template.fromObject({
      Resources: {
        VPC: {
          Type: 'aws-cdk-lib.aws_ec2.Vpc',
        },
        Subnet: {
          Type: 'aws-cdk-lib.aws_ec2.Subnet',
          Properties: {
            vpcId: { Ref: 'VPC' },
            availabilityZone: 'us-east-1a',
            cidrBlock: { 'Fn::GetAtt': ['VPC', 'DOES_NOT_EXIST'] },
          },
        },
      },
    });

    // THEN
    await expect(Testing.synth(template, false)).rejects.toThrow(
      'Fn::GetAtt: Expected Cloudformation Attribute, got: VPC.DOES_NOT_EXIST'
    );
  });
});

describe('FnGetProp', () => {
  test('can get properties from a construct', async () => {
    // GIVEN
    const template = await Testing.template(
      await Template.fromObject({
        Resources: {
          TopicOne: {
            Type: 'aws-cdk-lib.aws_sns.Topic',
            Properties: {
              topicName: 'one',
              fifo: true,
            },
          },
          TopicTwo: {
            Type: 'aws-cdk-lib.aws_sns.Topic',
            Properties: {
              topicName: 'two',
              fifo: { 'CDK::GetProp': 'TopicOne.fifo' },
            },
          },
        },
      })
    );

    // THEN
    template.hasResourceProperties('AWS::SNS::Topic', {
      TopicName: 'two.fifo', // .fifo is added automatically for fifo topics
      FifoTopic: true,
    });
  });

  test('cannot get constructor only properties', async () => {
    // GIVEN
    const template = await Template.fromObject({
      Resources: {
        Key: {
          Type: 'aws-cdk-lib.aws_kms.Key',
        },
        TopicOne: {
          Type: 'aws-cdk-lib.aws_sns.Topic',
          Properties: {
            masterKey: { Ref: 'Key' },
          },
        },
        TopicTwo: {
          Type: 'aws-cdk-lib.aws_sns.Topic',
          Properties: {
            topicName: 'two',
            // masterKey is a constructor property and not available on the resulting object
            masterKey: { 'CDK::GetProp': 'TopicOne.masterKey' },
          },
        },
      },
    });

    // THEN
    await expect(Testing.synth(template, false)).rejects.toThrow(
      'CDK::GetProp: Expected Construct Property, got: TopicOne.masterKey'
    );
  });

  test('can use FnGetProp to get nested properties', async () => {
    // GIVEN
    const source = {
      Resources: {
        MyLambda: {
          Type: 'aws-cdk-lib.aws_lambda.Function',
          Properties: {
            handler: 'app.hello_handler',
            runtime: 'PYTHON_3_9',
            code: {
              'aws-cdk-lib.aws_lambda.Code.fromAsset': {
                path: 'examples/lambda-handler',
              },
            },
          },
        },
        AppSyncEventBridgeRule: {
          Type: 'aws-cdk-lib.aws_events.Rule',
          Properties: {
            description: { 'CDK::GetProp': 'MyLambda.stack.stackId' },
            eventPattern: {
              source: ['aws.ec2'],
            },
          },
        },
      },
    };
    const template = await Testing.template(Template.fromObject(source));

    // THEN
    template.hasResourceProperties('AWS::Events::Rule', {
      Description: {
        Ref: 'AWS::StackId',
      },
    });
  });
});

test.each(['', 'us-east-1', { Ref: 'AWS::Region' }])(
  'FnGetAZs with: %j',
  async (azsValue) => {
    // GIVEN
    const template = await Testing.template(
      await Template.fromObject({
        Resources: {
          VPC: {
            Type: 'aws-cdk-lib.aws_ec2.Vpc',
          },
          Subnet: {
            Type: 'aws-cdk-lib.aws_ec2.Subnet',
            Properties: {
              vpcId: { Ref: 'VPC' },
              cidrBlock: '10.0.0.0/24',
              availabilityZone: {
                'Fn::Select': ['0', { 'Fn::GetAZs': azsValue }],
              },
            },
          },
        },
      })
    );

    // THEN
    template.hasResourceProperties('AWS::EC2::Subnet', {
      AvailabilityZone: {
        'Fn::Select': ['0', { 'Fn::GetAZs': azsValue }],
      },
    });
  }
);

test('FnImportValue', async () => {
  // GIVEN
  const template = await Testing.template(
    await Template.fromObject({
      Resources: {
        Topic: {
          Type: 'aws-cdk-lib.aws_sns.Topic',
          Properties: {
            displayName: {
              'Fn::ImportValue': {
                'Fn::Base64': { Ref: 'AWS::StackName' },
              },
            },
          },
        },
      },
    })
  );

  // THEN
  template.hasResourceProperties('AWS::SNS::Topic', {
    DisplayName: {
      'Fn::ImportValue': {
        'Fn::Base64': { Ref: 'AWS::StackName' },
      },
    },
  });
});

test('FnJoin', async () => {
  // GIVEN
  const template = await Testing.template(
    await Template.fromObject({
      Resources: {
        Bucket: {
          Type: 'aws-cdk-lib.aws_s3.Bucket',
        },
        Topic: {
          Type: 'aws-cdk-lib.aws_sns.Topic',
          Properties: {
            topicName: { 'Fn::Join': ['|', { 'Fn::Split': ['|', 'a|b|c'] }] },
            displayName: {
              'Fn::Join': [
                '-',
                [
                  'queue',
                  { Ref: 'AWS::Region' },
                  { 'Fn::Base64': { Ref: 'Bucket' } },
                ],
              ],
            },
          },
        },
      },
    })
  );

  // THEN
  template.hasResourceProperties('AWS::SNS::Topic', {
    TopicName: 'a|b|c', // can be computed locally
    DisplayName: {
      'Fn::Join': [
        '-',
        [
          'queue',
          { Ref: 'AWS::Region' },
          { 'Fn::Base64': { Ref: Match.stringLikeRegexp('^Bucket.{8}$') } },
        ],
      ],
    },
  });
});

test('FnSplit', async () => {
  // GIVEN
  const template = await Testing.template(
    await Template.fromObject({
      Resources: {
        Bucket: {
          Type: 'aws-cdk-lib.aws_s3.Bucket',
        },
        Topic: {
          Type: 'aws-cdk-lib.aws_sns.Topic',
          Properties: {
            displayName: {
              'Fn::Select': ['0', { 'Fn::Split': ['|', 'a|b|c'] }],
            },
            topicName: {
              'Fn::Select': [
                2,
                { 'Fn::Split': ['|', { 'Fn::Base64': 'Test' }] },
              ],
            },
          },
        },
      },
    })
  );

  // THEN
  template.hasResourceProperties('AWS::SNS::Topic', {
    DisplayName: 'a', // can be computed locally
    TopicName: {
      'Fn::Select': [2, { 'Fn::Split': ['|', { 'Fn::Base64': 'Test' }] }],
    },
  });
});

test('FnSub', async () => {
  // GIVEN
  const template = await Testing.template(
    await Template.fromObject({
      Resources: {
        Bucket: {
          Type: 'aws-cdk-lib.aws_s3.Bucket',
        },
        AppSyncEventBridgeRole: {
          Type: 'aws-cdk-lib.aws_iam.Role',
          Properties: {
            description: { 'Fn::Sub': '${AWS::Region} ${!AWS::Region}' },
            assumedBy: {
              'aws-cdk-lib.aws_iam.ServicePrincipal': {
                service: {
                  'Fn::Sub': [
                    'appsync.${Domain}.com',
                    {
                      Domain: { Ref: 'Bucket' },
                    },
                  ],
                },
              },
            },
          },
        },
      },
    })
  );

  // THEN
  template.hasResourceProperties('AWS::IAM::Role', {
    Description: {
      'Fn::Sub': '${AWS::Region} ${!AWS::Region}',
    },
    AssumeRolePolicyDocument: {
      Statement: [
        {
          Action: 'sts:AssumeRole',
          Effect: 'Allow',
          Principal: {
            Service: {
              'Fn::Sub': [
                'appsync.${Domain}.com',
                {
                  Domain: {
                    Ref: Match.stringLikeRegexp('^Bucket.{8}$'),
                  },
                },
              ],
            },
          },
        },
      ],
    },
  });
});
