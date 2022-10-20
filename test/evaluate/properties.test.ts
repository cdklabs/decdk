import { Template } from '../../src/parser/template';
import { Testing } from '../util';
suite('Evaluate Properties', () => {
  test('can define boolean property as "false"', async () => {
    // GIVEN
    const rawTemplate = {
      Resources: {
        Topic: {
          Type: 'aws-cdk-lib.aws_sns.Topic',
          Properties: {
            fifo: false,
          },
        },
      },
    };
    const template = await Testing.template(
      await Template.fromObject(rawTemplate)
    );

    // THEN
    template.hasResourceProperties('AWS::SNS::Topic', {
      FifoTopic: false,
    });
  });
});
