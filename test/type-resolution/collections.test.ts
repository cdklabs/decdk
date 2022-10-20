import { expect } from 'expect';
import * as reflect from 'jsii-reflect';
import { Template } from '../../src/parser/template';
import { TypedTemplate } from '../../src/type-resolution/template';
import { matchConstruct, Testing } from '../util';

suite('Type Resolution: Collections', () => {
  let typeSystem: reflect.TypeSystem;

  suiteSetup(async () => {
    typeSystem = await Testing.typeSystem;
  });

  test('Array of Types are resolved correctly', async () => {
    // GIVEN
    const template = await Template.fromObject({
      Resources: {
        MyFunction: {
          Type: 'aws-cdk-lib.aws_lambda.Function',
          Properties: {
            handler: 'app.hello_handler',
            runtime: 'PYTHON_3_6',
            code: {
              'aws-cdk-lib.aws_lambda.Code.fromAsset':
                'examples/lambda-handler',
            },
            events: [
              {
                'aws-cdk-lib.aws_lambda_event_sources.ApiEventSource': [
                  'GET',
                  '/hello',
                ],
              },
            ],
          },
        },
      },
    });

    const typedTemplate = new TypedTemplate(template, { typeSystem });

    // THEN
    const resource = typedTemplate.resource('MyFunction');

    expect(resource).toEqual(
      matchConstruct({
        events: expect.objectContaining({
          type: 'array',
          array: expect.arrayContaining([
            expect.objectContaining({
              type: 'initializer',
              fqn: 'aws-cdk-lib.aws_lambda_event_sources.ApiEventSource',
            }),
          ]),
        }),
      })
    );
    expect(template.template).toBeValidTemplate();
  });
});
