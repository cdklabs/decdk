import { Template } from '../../src/parser/template';
import { Testing } from '../util';

describe('given a template with unknown top-level properties', () => {
  it('can synth the template and will ignore unknown properties', async () => {
    // GIVEN
    const template = await Testing.template(
      await Template.fromObject({
        Parameters: {},
        Mappings: {},
        Conditions: {},
        Rules: {},
        Resources: {
          WaitHandle: {
            Type: 'AWS::CloudFormation::WaitConditionHandle',
          },
        },
        Outputs: {},
        AWSTemplateFormatVersion: '2010-09-09',
        Whatever: {},
      }),
      false
    );

    // THEN
    template.hasResourceProperties(
      'AWS::CloudFormation::WaitConditionHandle',
      {}
    );
    expect(template.toJSON()).not.toHaveProperty('Whatever');
  });
});
