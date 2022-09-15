import '../util';
test('can use intrinsic where primitive string is expected', () => {
  // GIVEN
  const template = {
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
  };

  // THEN
  expect(template).toBeValidTemplate();
});

test('can use intrinsic where primitive number is expected', () => {
  // GIVEN
  const template = {
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
  };

  // THEN
  expect(template).toBeValidTemplate();
});

test('can use intrinsic where primitive boolean is expected', () => {
  // GIVEN
  const template = {
    Resources: {
      Topic: {
        Type: 'aws-cdk-lib.aws_sns.Topic',
        Properties: {
          fifo: { 'Fn::GetAtt': ['SomeResource', 'SomeAtt'] },
        },
      },
    },
  };

  // THEN
  expect(template).toBeValidTemplate();
});

/**
 * In CDK dates have to return a `Date` object.
 * We cannot instantiate a `Data` from a Token.
 *
 * We might later allow tokens that can be resolved directly, e.g. GetAtt or GetProp.
 */
test('can NOT use intrinsic where primitive date is expected', () => {
  // GIVEN
  const template = {
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
  };

  // THEN
  expect(template).not.toBeValidTemplate();
});

test('can use nested intrinsic', () => {
  // GIVEN
  const template = {
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
  };

  // THEN
  expect(template).toBeValidTemplate();
});

test('FnJoin', () => {
  // GIVEN
  const template = {
    Resources: {
      Topic: {
        Type: 'aws-cdk-lib.aws_sns.Topic',
        Properties: {
          displayName: { 'Fn::Join': ['-', ['A', 'B', 'C']] },
        },
      },
    },
  };

  // THEN
  expect(template).toBeValidTemplate();
});

test('FnFindInMap', () => {
  // GIVEN
  const template = {
    Resources: {
      Topic: {
        Type: 'aws-cdk-lib.aws_sns.Topic',
        Properties: {
          displayName: { 'Fn::FindInMap': ['A', 'B', 'C'] },
        },
      },
    },
  };

  // THEN
  expect(template).toBeValidTemplate();
});
