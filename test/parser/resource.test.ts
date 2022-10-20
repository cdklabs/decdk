import { expect } from 'expect';
import { Template } from '../../src/parser/template';

suite('Parse Resources', () => {
  test('Resource properties must be object', async () => {
    // GIVEN
    const template = {
      Resources: {
        CdkTopic: {
          Type: 'aws-cdk-lib.aws_sns.Topic',
          Properties: [1, 2, 3],
        },
      },
    };

    // THEN
    await expect(async () => Template.fromObject(template)).rejects.toThrow(
      'Expected object, got: [1,2,3]'
    );
  });
});
