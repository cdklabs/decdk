import * as reflect from 'jsii-reflect';
import { Template } from '../../src/parser/template';
import { resolveResourceLike } from '../../src/type-resolution';
import { StructExpression } from '../../src/type-resolution/struct';
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
            fromAsset: { path: 'examples/lambda-handler' },
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

  const typedTemplate = template
    .resourceGraph()
    .map((_, resource) => resolveResourceLike(resource, typeSystem));

  // THEN
  expect(template.template).toBeValidTemplate();
  const myQueue = typedTemplate.get('MyFunction');
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
});
