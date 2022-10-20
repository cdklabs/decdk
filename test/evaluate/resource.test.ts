import { Match } from 'aws-cdk-lib/assertions';
import { expect } from 'expect';
import * as reflect from 'jsii-reflect';
import { Template } from '../../src/parser/template';
import { TypedTemplate } from '../../src/type-resolution/template';
import { Testing } from '../util';

let typeSystem: reflect.TypeSystem;

suite('Evaluate Resources', () => {
  suiteSetup(async () => {
    typeSystem = await Testing.typeSystem;
  });

  suite('depending on a ResourceLike that is not a Construct', () => {
    test('will honour the execution order, but not apply DependsOn in the resulting template', async () => {
      // GIVEN
      const parsedTemplate = await Template.fromObject({
        Resources: {
          MyVPC: {
            Type: 'aws-cdk-lib.aws_ec2.Vpc',
          },
          MyASG: {
            Type: 'aws-cdk-lib.aws_autoscaling.AutoScalingGroup',
            Properties: {
              vpc: {
                Ref: 'MyVPC',
              },
              instanceType: {
                'aws-cdk-lib.aws_ec2.InstanceType.of': ['T2', 'MICRO'],
              },
              machineImage: {
                'aws-cdk-lib.aws_ec2.AmazonLinuxImage': [],
              },
            },
          },
          AModestLoad: {
            Type: 'aws-cdk-lib.aws_autoscaling.TargetTrackingScalingPolicy',
            Call: [
              'MyASG',
              {
                scaleOnRequestCount: [
                  'AModestLoad',
                  { targetRequestsPerMinute: 60 },
                ],
              },
            ],
            DependsOn: ['MyTarget'],
          },
          MyLB: {
            Type: 'aws-cdk-lib.aws_elasticloadbalancingv2.ApplicationLoadBalancer',
            Properties: {
              vpc: {
                Ref: 'MyVPC',
              },
              internetFacing: true,
            },
          },
          MyListener: {
            Type: 'aws-cdk-lib.aws_elasticloadbalancingv2.ApplicationListener',
            Call: [
              'MyLB',
              {
                addListener: ['MyListener', { port: 80 }],
              },
            ],
          },
          MyTarget: {
            Type: 'aws-cdk-lib.aws_elasticloadbalancingv2.ApplicationTargetGroup',
            Call: [
              'MyListener',
              {
                addTargets: [
                  'MyTarget',
                  {
                    port: 80,
                    targets: [
                      {
                        Ref: 'MyASG',
                      },
                    ],
                  },
                ],
              },
            ],
          },
        },
      });
      // THEN
      const typedTemplate = new TypedTemplate(parsedTemplate, { typeSystem });
      expect(
        typedTemplate.resources.directDependencies('AModestLoad')
      ).toContain('MyTarget');

      const template = await Testing.template(parsedTemplate);
      template.hasResource('AWS::AutoScaling::ScalingPolicy', {
        DependsOn: Match.not(Match.arrayWith(['MyTarget'])),
      });
    });
  });

  test('Non-constructs can be instantiated inline using constructor args', async () => {
    const parsedTemplate = await Template.fromObject({
      Resources: {
        MyBucket: {
          Type: 'aws-cdk-lib.aws_s3.Bucket',
        },
        MyLambda: {
          Type: 'aws-cdk-lib.aws_lambda.Function',
          Properties: {
            runtime: 'NODEJS_16_X',
            handler: 'index.handler',
            memorySize: 10240,
            code: {
              'aws-cdk-lib.aws_lambda.Code.fromBucket': [
                {
                  Ref: 'MyBucket',
                },
                'handler.zip',
              ],
            },
            initialPolicy: [
              {
                'aws-cdk-lib.aws_iam.PolicyStatement': {
                  actions: ['s3:GetObject*', 's3:PutObject*'],
                  resources: ['*'],
                },
              },
            ],
          },
        },
      },
    });

    const template = await Testing.template(parsedTemplate);
    template.hasResourceProperties('AWS::IAM::Policy', {
      PolicyDocument: {
        Statement: [
          {
            Action: ['s3:GetObject*', 's3:PutObject*'],
            Effect: 'Allow',
            Resource: '*',
          },
        ],
      },
    });
  });

  suite('CreationPolicy', () => {
    test('can use StartFleet creation policy', async () => {
      const parsedTemplate = await Template.fromObject({
        Resources: {
          MyBucket: {
            Type: 'AWS::S3::Bucket',
            CreationPolicy: {
              StartFleet: true,
            },
          },
        },
      });

      const template = await Testing.template(parsedTemplate);
      template.hasResource('AWS::S3::Bucket', {
        CreationPolicy: {
          StartFleet: true,
        },
      });
    });

    test('creation policies can reference CDK constructs', async () => {
      const withWebsite = await Template.fromObject({
        Resources: {
          Bucket1: {
            Type: 'aws-cdk-lib.aws_s3.Bucket',
            Properties: {
              websiteErrorDocument: '404.html',
              websiteIndexDocument: 'index.html',
            },
          },
          Bucket2: {
            Type: 'AWS::S3::Bucket',
            CreationPolicy: {
              StartFleet: { 'CDK::GetProp': 'Bucket1.isWebsite' },
            },
          },
        },
      });

      (await Testing.template(withWebsite)).hasResource('AWS::S3::Bucket', {
        CreationPolicy: {
          StartFleet: true,
        },
      });

      const withoutWebsite = await Template.fromObject({
        Resources: {
          Bucket1: {
            Type: 'aws-cdk-lib.aws_s3.Bucket',
            Properties: {},
          },
          Bucket2: {
            Type: 'AWS::S3::Bucket',
            CreationPolicy: {
              StartFleet: { 'CDK::GetProp': 'Bucket1.isWebsite' },
            },
          },
        },
      });

      (await Testing.template(withoutWebsite)).hasResource('AWS::S3::Bucket', {
        CreationPolicy: {
          StartFleet: false,
        },
      });
    });
  });
});
