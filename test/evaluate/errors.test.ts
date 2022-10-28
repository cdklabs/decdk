import { expect } from 'expect';
import { DeclarativeStackError } from '../../src/error-handling';
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
      const synth = Testing.synth(await Template.fromObject(template), {
        validateTemplate: false,
      });
      await expect(synth).rejects.toThrow(TypeError);
      await expect(synth).rejects.toThrow(
        'Expected static method, got: "bucket"'
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
      const synth = Testing.synth(await Template.fromObject(template), {
        validateTemplate: false,
      });
      await expect(synth).rejects.toThrow(TypeError);
      await expect(synth).rejects.toThrow(
        'Expected aws-cdk-lib.aws_s3.IBucket, got: "MyBucket'
      );
    });
  });

  suite('Multiple errors', () => {
    test('Evaluation errors are collected', async () => {
      // GIVEN
      const template = {
        Resources: {
          SiteDistribution: {
            Type: 'aws-cdk-lib.aws_cloudfront.Distribution',
            Properties: {
              certificate: {
                Ref: 'SiteBucket', // this should be SiteCertificate
              },
              defaultRootObject: 'index.html',
              domainNames: [
                {
                  Ref: 'DomainName',
                },
              ],
              minimumProtocolVersion: 'TLS_V1_2_2021',
              defaultBehavior: {
                origin: {
                  'aws-cdk-lib.aws_cloudfront_origins.S3Origin': [
                    { Ref: 'SiteCertificate' }, // this should be SiteBucket
                    {
                      originAccessIdentity: {
                        Ref: 'CloudFrontOAI',
                      },
                    },
                  ],
                },
              },
            },
          },
        },
      };
      const synth = Testing.synth(await Template.fromObject(template), {
        validateTemplate: false,
      });

      // THEN
      await expect(synth).rejects.toThrow(DeclarativeStackError);
      try {
        await synth;
      } catch (error) {
        const msg = error.toString();
        expect(msg).toContain('No such Resource or Parameter: SiteCertificate');
        expect(msg).toContain('No such Resource or Parameter: CloudFrontOAI');
        expect(msg).toContain('No such Resource or Parameter: SiteBucket');
        expect(msg).toContain('No such Resource or Parameter: DomainName');
      }
    });
  });
});
