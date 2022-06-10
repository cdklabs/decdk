import { Testing } from './util';

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
  await expect(Testing.synth(template)).rejects.toThrow(
    'Could not find enum choice BOOM for enum type aws-cdk-lib.aws_sqs.QueueEncryption. Available options: [UNENCRYPTED, KMS_MANAGED, KMS]'
  );
});
