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
