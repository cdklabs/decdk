import { expect } from 'expect';
import { Template } from '../../src/parser/template';
import { Match, Testing } from '../util';

suite('Evaluate Intrinsic Functions', () => {
  test('can use intrinsic where primitive number is expected', async () => {
    // GIVEN
    const template = await Testing.template(
      await Template.fromObject({
        Resources: {
          Lambda: {
            Type: 'aws-cdk-lib.aws_lambda.Function',
            Properties: {
              code: {
                'aws-cdk-lib.aws_lambda.Code.fromInline': 'whatever',
              },
              runtime: 'NODEJS_16_X',
              handler: 'index.handler',
              timeout: {
                'aws-cdk-lib.Duration.seconds': {
                  'Fn::Select': [0, [5, 15, 20]],
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

  suite('FnFindInMap', () => {
    test('can use FnRef in FnFindInMap', async () => {
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
                  'Fn::FindInMap': [
                    'RegionMap',
                    { Ref: 'AWS::Region' },
                    'HVM64',
                  ],
                },
                InstanceType: 'm1.small',
              },
            },
          },
        })
      );

      // THEN
      template.hasResourceProperties('AWS::EC2::Instance', {
        ImageId: {
          'Fn::FindInMap': ['RegionMap', { Ref: 'AWS::Region' }, 'HVM64'],
        },
      });
    });

    test('can use FnFindInMap in FnFindInMap', async () => {
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
            ArchitectureMap: {
              'us-west-1': {
                Architecture: 'HVM64',
              },
              'eu-west-1': {
                Architecture: 'HVMG2',
              },
            },
          },
          Resources: {
            myEC2Instance: {
              Type: 'AWS::EC2::Instance',
              Properties: {
                ImageId: {
                  'Fn::FindInMap': [
                    'RegionMap',
                    { Ref: 'AWS::Region' },
                    {
                      'Fn::FindInMap': [
                        'ArchitectureMap',
                        { Ref: 'AWS::Region' },
                        'Architecture',
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
      template.hasResourceProperties('AWS::EC2::Instance', {
        ImageId: {
          'Fn::FindInMap': [
            'RegionMap',
            { Ref: 'AWS::Region' },
            {
              'Fn::FindInMap': [
                'ArchitectureMap',
                {
                  Ref: 'AWS::Region',
                },
                'Architecture',
              ],
            },
          ],
        },
      });
    });
  });

  suite('FnGetAtt', () => {
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
      await expect(
        Testing.synth(template, { validateTemplate: false })
      ).rejects.toThrow(
        'Fn::GetAtt: Expected Cloudformation Attribute, got: VPC.DOES_NOT_EXIST'
      );
    });

    test('can use FnGetAtt to get nested properties', async () => {
      // GIVEN
      const source = {
        Resources: {
          MyVPC: {
            Type: 'aws-cdk-lib.aws_ec2.Vpc',
          },
          MyLB: {
            Type: 'aws-cdk-lib.aws_elasticloadbalancing.LoadBalancer',
            Properties: {
              vpc: { Ref: 'MyVPC' },
            },
          },
          MyTopic: {
            Type: 'aws-cdk-lib.aws_sns.Topic',
            Properties: {
              topicName: {
                'Fn::GetAtt': 'MyLB.SourceSecurityGroup.GroupName',
              },
              displayName: {
                'Fn::GetAtt': ['MyLB', 'SourceSecurityGroup.GroupName'],
              },
            },
          },
        },
      };
      const template = await Testing.template(Template.fromObject(source));

      // THEN
      template.hasResourceProperties('AWS::SNS::Topic', {
        DisplayName: {
          'Fn::GetAtt': [
            Match.stringLikeRegexp('^MyLB.{8}$'),
            'SourceSecurityGroup.GroupName',
          ],
        },
        TopicName: {
          'Fn::GetAtt': [
            Match.stringLikeRegexp('^MyLB.{8}$'),
            'SourceSecurityGroup.GroupName',
          ],
        },
      });
    });

    // @todo test for FnGetAtt for nested attributes
    // @see https://docs.aws.amazon.com/cdk/api/v2/docs/aws-cdk-lib.aws_elasticloadbalancing.CfnLoadBalancer.html
  });

  suite('FnGetProp', () => {
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
      await expect(
        Testing.synth(template, { validateTemplate: false })
      ).rejects.toThrow(
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
                'aws-cdk-lib.aws_lambda.Code.fromAsset':
                  'examples/lambda-handler',
              },
            },
          },
          AppSyncEventBridgeRule: {
            Type: 'aws-cdk-lib.aws_events.Rule',
            Properties: {
              description: { 'CDK::GetProp': 'MyLambda.role.roleName' },
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
          Ref: Match.logicalIdFor('MyLambdaServiceRole'),
        },
      });
    });

    test('cannot use FnGetProp to access Stack details', async () => {
      // GIVEN
      const source = {
        Resources: {
          MyLambda: {
            Type: 'aws-cdk-lib.aws_lambda.Function',
            Properties: {
              handler: 'app.hello_handler',
              runtime: 'PYTHON_3_9',
              code: {
                'aws-cdk-lib.aws_lambda.Code.fromAsset':
                  'examples/lambda-handler',
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
      const template = await Template.fromObject(source);

      // THEN
      await expect(
        Testing.synth(template, { validateTemplate: false })
      ).rejects.toThrow(
        'CDK::GetProp: Expected Construct Property, got: MyLambda.stack.stackId'
      );
    });

    test('can use FnGetProp to get array elements by index', async () => {
      const source = {
        Resources: {
          MyVpc: {
            Type: 'aws-cdk-lib.aws_ec2.Vpc',
          },
        },
        Outputs: {
          SubnetOneAz: {
            Value: {
              'CDK::GetProp': 'MyVpc.publicSubnets.0.availabilityZone',
            },
          },
        },
      };

      const template = await Testing.template(Template.fromObject(source));

      // THEN
      template.hasOutput('SubnetOneAz', {
        Value: {
          'Fn::Select': [
            0,
            {
              'Fn::GetAZs': '',
            },
          ],
        },
      });
    });

    test('cannot use array index out of bounds', async () => {
      const template = Template.fromObject({
        Resources: {
          MyVpc: {
            Type: 'aws-cdk-lib.aws_ec2.Vpc',
          },
        },
        Outputs: {
          SubnetOneAz: {
            Value: {
              'CDK::GetProp': 'MyVpc.publicSubnets.999.availabilityZone',
            },
          },
        },
      });

      // THEN
      await expect(
        Testing.synth(template, { validateTemplate: false })
      ).rejects.toThrow(
        'CDK::GetProp: Expected Construct Property, got: MyVpc.publicSubnets.999.availabilityZone'
      );
    });
  });

  ['', 'us-east-1', { Ref: 'AWS::Region' }].forEach((azsValue) => {
    test(`FnGetAZs with: ${JSON.stringify(azsValue)}`, async () => {
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
    });
  });

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
            { 'Fn::Base64': { Ref: Match.logicalIdFor('Bucket') } },
          ],
        ],
      },
    });
  });

  suite('FnSelect', () => {
    test('can select from different types of values', async () => {
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
                cidrBlock: '11.11.11.11/24',
                availabilityZone: {
                  'Fn::Select': [
                    '0',
                    [
                      'test',
                      { Ref: 'VPC' },
                      { 'CDK::GetProp': 'VPC.dnsSupportEnabled' },
                    ],
                  ],
                },
              },
            },
          },
        })
      );

      // THEN
      template.hasResourceProperties('AWS::EC2::Subnet', {
        CidrBlock: '11.11.11.11/24',
        AvailabilityZone: {
          'Fn::Select': [
            '0',
            ['test', { Ref: Match.stringLikeRegexp('^VPC.{8}$') }, true],
          ],
        },
      });
    });

    test('can select from FnGetAZs', async () => {
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
                  'Fn::Select': ['0', { 'Fn::GetAZs': { Ref: 'AWS::Region' } }],
                },
              },
            },
          },
        })
      );

      // THEN
      template.hasResourceProperties('AWS::EC2::Subnet', {
        AvailabilityZone: {
          'Fn::Select': ['0', { 'Fn::GetAZs': { Ref: 'AWS::Region' } }],
        },
      });
    });

    test('index can be ref ', async () => {
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
                  'Fn::Select': [
                    { Ref: 'VPC' }, // nonsensical put should compile
                    { 'Fn::GetAZs': { Ref: 'AWS::Region' } },
                  ],
                },
              },
            },
          },
        })
      );

      // THEN
      template.hasResourceProperties('AWS::EC2::Subnet', {
        AvailabilityZone: {
          'Fn::Select': [
            { Ref: Match.stringLikeRegexp('^VPC.{8}$') },
            { 'Fn::GetAZs': { Ref: 'AWS::Region' } },
          ],
        },
      });
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
});
