import '../util';
import { expect } from 'expect';

suite('Schema Errors', () => {
  test('invalid schema will fail', () => {
    // GIVEN
    const template = {
      $schema: '../cdk.schema.json',
      Resources: {
        VPC: {
          Type: 'aws-cdk-lib.aws_ec2.Vpc',
          Properties: {
            banana: true,
          },
        },
      },
    };

    // THEN
    expect(template).not.toBeValidTemplate();
  });

  test('short static method calls are not valid', () => {
    // GIVEN
    const template = {
      $schema: '../cdk.schema.json',
      Resources: {
        Lambda: {
          Type: 'aws-cdk-lib.aws_lambda.Function',
          Properties: {
            code: {
              fromAsset: {
                path: 'examples/lambda-handler',
              },
            },
            runtime: 'NODEJS_16_X',
            handler: 'index.handler',
          },
        },
      },
    };

    // THEN
    expect(template).not.toBeValidTemplate();
  });
});
