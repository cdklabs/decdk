import * as reflect from 'jsii-reflect';
import { Template } from '../../src/parser/template';
import { StructExpression } from '../../src/type-resolution/struct';
import { TypedTemplate } from '../../src/type-resolution/template';
import { getCdkConstruct } from '../template';
import { Testing } from '../util';

let typeSystem: reflect.TypeSystem;

beforeAll(async () => {
  typeSystem = await Testing.typeSystem;
});

test('Static Methods are resolved correctly', async () => {
  // GIVEN
  const template = await Template.fromObject({
    Resources: {
      MyLambda: {
        Type: 'aws-cdk-lib.aws_lambda.Function',
        Properties: {
          code: {
            'aws-cdk-lib.aws_lambda.Code.fromAsset': {
              path: 'examples/lambda-handler',
            },
          },
          runtime: 'PYTHON_3_6',
          handler: 'index.handler',
        },
      },
    },
  });

  const typedTemplate = new TypedTemplate(template, { typeSystem });

  // THEN
  const myLambda = getCdkConstruct(typedTemplate, 'MyLambda');
  expect(myLambda.type).toBe('construct');
  expect(myLambda.props?.type).toBe('struct');
  expect((myLambda.props as StructExpression)?.fields).toHaveProperty(
    'code',
    expect.objectContaining({
      type: 'staticMethodCall',
      fqn: 'aws-cdk-lib.aws_lambda.Code',
      namespace: 'aws_lambda',
      method: 'fromAsset',
    })
  );
  expect(template.template).toBeValidTemplate();
});

test('Can provide implementation via static method', async () => {
  // GIVEN
  const template = await Template.fromObject({
    Resources: {
      MyVpc: {
        Type: 'aws-cdk-lib.aws_ec2.Vpc',
        Properties: {
          maxAzs: 2,
        },
      },
      MyFleet: {
        Type: 'aws-cdk-lib.aws_autoscaling.AutoScalingGroup',
        Properties: {
          vpc: { Ref: 'MyVpc' },
          instanceType: {
            'aws-cdk-lib.aws_ec2.InstanceType.of': {
              instanceClass: 'T2',
              instanceSize: 'XLARGE',
            },
          },
          machineImage: {
            'aws-cdk-lib.aws_ecs.EcsOptimizedImage.amazonLinux2': {},
          },
          desiredCapacity: 3,
        },
      },
    },
  });

  const typedTemplate = new TypedTemplate(template, { typeSystem });

  // THEN
  const myLambda = getCdkConstruct(typedTemplate, 'MyFleet');
  expect((myLambda.props as StructExpression)?.fields).toHaveProperty(
    'machineImage',
    expect.objectContaining({
      type: 'staticMethodCall',
      fqn: 'aws-cdk-lib.aws_ecs.EcsOptimizedImage',
      namespace: 'aws_ecs',
      method: 'amazonLinux2',
    })
  );
  expect(template.template).toBeValidTemplate();
});
