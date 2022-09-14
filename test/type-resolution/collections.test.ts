import * as reflect from 'jsii-reflect';
import { Template } from '../../src/parser/template';
import { StructExpression } from '../../src/type-resolution/struct';
import { getCdkConstruct, typed } from '../template';
import { Testing } from '../util';

let typeSystem: reflect.TypeSystem;

beforeAll(async () => {
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
            'aws-cdk-lib.aws_lambda.Code.fromAsset': {
              path: 'examples/lambda-handler',
            },
          },
          events: [
            {
              'aws-cdk-lib.aws_lambda_event_sources.ApiEventSource': {
                method: 'GET',
                path: '/hello',
              },
            },
          ],
        },
      },
    },
  });

  const typedTemplate = typed(typeSystem, template);

  // THEN
  const myQueue = getCdkConstruct(typedTemplate, 'MyFunction');
  expect(myQueue.type).toBe('construct');
  expect(myQueue.props?.type).toBe('struct');
  expect((myQueue.props as StructExpression)?.fields).toHaveProperty(
    'events',
    expect.objectContaining({
      type: 'array',
      array: expect.arrayContaining([
        expect.objectContaining({
          type: 'initializer',
          fqn: 'aws-cdk-lib.aws_lambda_event_sources.ApiEventSource',
        }),
      ]),
    })
  );
  expect(template.template).toBeValidTemplate();
});
