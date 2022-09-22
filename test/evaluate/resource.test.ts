import { Match } from 'aws-cdk-lib/assertions';
import * as reflect from 'jsii-reflect';
import { Template } from '../../src/parser/template';
import { TypedTemplate } from '../../src/type-resolution/template';
import { Testing } from '../util';

let typeSystem: reflect.TypeSystem;

beforeAll(async () => {
  typeSystem = await Testing.typeSystem;
});

describe('depending on a ResourceLike that is not a Construct', () => {
  it('will honour the execution order, but not apply DependsOn in the resulting template', async () => {
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
              'aws-cdk-lib.aws_ec2.InstanceType.of': {
                instanceClass: 'T2',
                instanceSize: 'MICRO',
              },
            },
            machineImage: {
              'aws-cdk-lib.aws_ec2.AmazonLinuxImage': {},
            },
          },
        },
        AModestLoad: {
          Type: 'aws-cdk-lib.aws_autoscaling.TargetTrackingScalingPolicy',
          On: 'MyASG',
          Call: {
            scaleOnRequestCount: {
              id: 'AModestLoad',
              targetRequestsPerMinute: 60,
            },
          },
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
          On: 'MyLB',
          Call: {
            addListener: {
              id: 'MyListener',
              port: 80,
            },
          },
        },
        MyTarget: {
          Type: 'aws-cdk-lib.aws_elasticloadbalancingv2.ApplicationTargetGroup',
          On: 'MyListener',
          Call: {
            addTargets: {
              id: 'MyTarget',
              port: 80,
              targets: [
                {
                  Ref: 'MyASG',
                },
              ],
            },
          },
        },
      },
    });
    // THEN
    const typedTemplate = new TypedTemplate(parsedTemplate, { typeSystem });
    expect(typedTemplate.resources.directDependencies('AModestLoad')).toContain(
      'MyTarget'
    );

    const template = await Testing.template(parsedTemplate);
    template.hasResource('AWS::AutoScaling::ScalingPolicy', {
      DependsOn: Match.not(Match.arrayWith(['MyTarget'])),
    });
  });
});
