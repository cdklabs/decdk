import { expect } from 'expect';
import { Template } from '../../src/parser/template';
import { Testing } from '../util';

suite('Evaluation errors', () => {
  suite('Enums', () => {
    test('invalid enum option raises an error', async () => {
      // GIVEN
      const template = {
        Resources: {
          Hello: {
            Type: 'aws-cdk-lib.aws_sqs.Queue',
            Properties: {
              encryption: 'boom',
            },
          },
        },
      };

      // THEN
      expect(template).not.toBeValidTemplate();
      await expect(
        Testing.synth(await Template.fromObject(template), {
          validateTemplate: false,
        })
      ).rejects.toThrow(
        'Expected choice for enum type aws-cdk-lib.aws_sqs.QueueEncryption to be one of UNENCRYPTED|KMS_MANAGED|KMS|SQS_MANAGED, got: boom'
      );
    });
  });

  suite('Invalid FQNs', () => {
    test('invalid method name option raises an error', async () => {
      // GIVEN
      const template = {
        Resources: {
          MyBucket: {
            Type: 'aws-cdk-lib.aws_s3.Bucket',
          },
          MyDist: {
            Type: 'aws-cdk-lib.aws_cloudfront.Distribution',
            Properties: {
              defaultBehavior: {
                origin: {
                  'aws-cdk-lib.aws_cloudfront_origins.S3Origin': {
                    bucket: 'MyBucket',
                  },
                },
              },
            },
          },
        },
      };

      // THEN
      await expect(
        Testing.synth(await Template.fromObject(template), {
          validateTemplate: false,
        })
      ).rejects.toThrow(
        'Expected static method expression, but provided method was not found. Got: bucket'
      );
    });
  });

  suite('Invalid Types', () => {
    test('string in place of reference raised an error', async () => {
      // GIVEN
      const template = {
        Resources: {
          MyBucket: {
            Type: 'aws-cdk-lib.aws_s3.Bucket',
          },
          MyDist: {
            Type: 'aws-cdk-lib.aws_cloudfront.Distribution',
            Properties: {
              defaultBehavior: {
                origin: {
                  'aws-cdk-lib.aws_cloudfront_origins.S3Origin': 'MyBucket',
                },
              },
            },
          },
        },
      };

      // THEN
      await expect(
        Testing.synth(await Template.fromObject(template), {
          validateTemplate: false,
        })
      ).rejects.toThrow('Expected aws-cdk-lib.aws_s3.IBucket, got: "MyBucket');
    });
  });
});
