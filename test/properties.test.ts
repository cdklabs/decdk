import { Template } from '../src/parser/template';
import { Testing } from './util';

test('can define boolean property as "false"', async () => {
  // GIVEN
  const template = await Testing.template(
    await Template.fromObject({
      Resources: {
        Topic: {
          Type: 'aws-cdk-lib.aws_sns.Topic',
          Properties: {
            fifo: false,
          },
        },
      },
    })
  );

  // THEN
  template.hasResourceProperties('AWS::SNS::Topic', {
    FifoTopic: false,
  });
});
