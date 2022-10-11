import { Template } from '../../src/parser/template';
import { Testing } from '../util';

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
    Testing.synth(await Template.fromObject(template), false)
  ).rejects.toThrow(
    'Expected choice for enum type aws-cdk-lib.aws_sqs.QueueEncryption to be one of UNENCRYPTED|KMS_MANAGED|KMS|SQS_MANAGED, got: boom'
  );
});
