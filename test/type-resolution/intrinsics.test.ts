import * as reflect from 'jsii-reflect';
import { Template } from '../../src/parser/template';
import { TypedTemplate } from '../../src/type-resolution/template';
import {
  matchConstruct,
  matchFnGetAtt,
  matchFnRef,
  matchFnSub,
  matchInitializer,
  matchStaticMethodCall,
  matchStringLiteral,
  matchSubLiteralFragment,
  matchSubRefFragment,
  Testing,
} from '../util';

let typeSystem: reflect.TypeSystem;

beforeAll(async () => {
  typeSystem = await Testing.typeSystem;
});

test('can use intrinsic where primitive string is expected', async () => {
  // GIVEN
  const template = await Template.fromObject({
    Resources: {
      Bucket: {
        Type: 'AWS::S3::Bucket',
        Properties: {
          BucketName: 'my-bucket',
        },
      },
      Topic: {
        Type: 'aws-cdk-lib.aws_sns.Topic',
        Properties: {
          displayName: { 'Fn::GetAtt': ['Bucket', 'BucketName'] },
        },
      },
    },
  });

  const typedTemplate = new TypedTemplate(template, { typeSystem });
  const myTopic = typedTemplate.resource('Topic');

  // THEN
  expect(myTopic).toEqual(
    matchConstruct({
      displayName: matchFnGetAtt('Bucket', matchStringLiteral('BucketName')),
    })
  );

  expect(template.template).toBeValidTemplate();
});

test('can use intrinsic where primitive number is expected', async () => {
  // GIVEN
  const template = await Template.fromObject({
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
              amount: { 'Fn::GetAtt': ['SomeResource', 'SomeAtt'] },
            },
          },
        },
      },
    },
  });

  const typedTemplate = new TypedTemplate(template, { typeSystem });
  const myLambda = typedTemplate.resource('Lambda');

  // THEN
  expect(myLambda).toEqual(
    matchConstruct({
      timeout: matchStaticMethodCall('aws-cdk-lib.Duration.seconds', [
        matchFnGetAtt('SomeResource'),
      ]),
    })
  );
  expect(template.template).toBeValidTemplate();
});

test('can use intrinsic where primitive boolean is expected', async () => {
  // GIVEN
  const template = await Template.fromObject({
    Resources: {
      Topic: {
        Type: 'aws-cdk-lib.aws_sns.Topic',
        Properties: {
          fifo: { 'Fn::GetAtt': ['SomeResource', 'SomeAtt'] },
        },
      },
    },
  });

  const typedTemplate = new TypedTemplate(template, { typeSystem });
  const myTopic = typedTemplate.resource('Topic');

  // THEN
  expect(myTopic).toEqual(
    matchConstruct({
      fifo: matchFnGetAtt('SomeResource', matchStringLiteral('SomeAtt')),
    })
  );
  expect(template.template).toBeValidTemplate();
});

/**
 * In CDK dates have to return a `Date` object.
 * We cannot instantiate a `Data` from a Token.
 *
 * We might later allow tokens that can be resolved directly, e.g. GetAtt or GetProp.
 */
test('can NOT use intrinsic where primitive date is expected', async () => {
  // GIVEN
  const template = await Template.fromObject({
    Resources: {
      Action: {
        Type: 'aws-cdk-lib.aws_autoscaling.ScheduledAction',
        Properties: {
          autoScalingGroup: { Ref: 'SomeASG' },
          schedule: {
            'aws-cdk-lib.aws_autoscaling.Schedule.expression': {
              expression: '5 0 * * *',
            },
          },
          startTime: { 'Fn::GetAtt': ['SomeResource', 'SomeAtt'] },
        },
      },
    },
  });

  // THEN
  expect(() => {
    new TypedTemplate(template, { typeSystem });
  }).toThrowError('Expected string, got');
});

test('can use nested intrinsic', async () => {
  // GIVEN
  const template = await Template.fromObject({
    Resources: {
      Bucket: {
        Type: 'AWS::S3::Bucket',
        Properties: {
          BucketName: 'my-bucket',
        },
      },
      AppSyncEventBridgeRole: {
        Type: 'aws-cdk-lib.aws_iam.Role',
        Properties: {
          assumedBy: {
            'aws-cdk-lib.aws_iam.ServicePrincipal': {
              service: {
                'Fn::Sub': [
                  'appsync.${Domain}.com',
                  {
                    Domain: {
                      Ref: 'Bucket',
                    },
                  },
                ],
              },
            },
          },
        },
      },
    },
  });

  const typedTemplate = new TypedTemplate(template, { typeSystem });
  const myRole = typedTemplate.resource('AppSyncEventBridgeRole');

  // THEN
  expect(myRole).toEqual(
    matchConstruct({
      assumedBy: matchInitializer('aws-cdk-lib.aws_iam.ServicePrincipal', [
        matchFnSub(
          [
            matchSubLiteralFragment('appsync.'),
            matchSubRefFragment('Domain'),
            matchSubLiteralFragment('.com'),
          ],
          {
            Domain: matchFnRef('Bucket'),
          }
        ),
      ]),
    })
  );
  expect(template.template).toBeValidTemplate();
});
