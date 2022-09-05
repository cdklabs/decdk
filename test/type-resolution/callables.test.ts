import * as reflect from 'jsii-reflect';
import { Template } from '../../src/parser/template';
import { resolveResourceLike } from '../../src/type-resolution';
import { StructExpression } from '../../src/type-resolution/struct';
import { Testing } from '../util';

let typeSystem: reflect.TypeSystem;

beforeAll(async () => {
  typeSystem = await Testing.typeSystem;
});

test('Static Methods are resolved correctly', async () => {
  // GIVEN
  const template = await Template.fromObject({
    Resources: {
      MyLambda: {
        Type: 'aws-cdk-lib.aws_lambda.Function',
        Properties: {
          code: {
            fromAsset: { path: 'examples/lambda-handler' },
          },
          runtime: 'PYTHON_3_6',
          handler: 'index.handler',
        },
      },
    },
  });

  const typedTemplate = template
    .resourceGraph()
    .map((_, resource) => resolveResourceLike(resource, typeSystem));

  // THEN
  expect(template.template).toBeValidTemplate();
  const myLambda = typedTemplate.get('MyLambda');
  expect(myLambda.type).toBe('construct');
  expect(myLambda.props?.type).toBe('struct');
  expect((myLambda.props as StructExpression)?.fields).toHaveProperty(
    'code',
    expect.objectContaining({
      type: 'staticMethodCall',
      fqn: 'aws-cdk-lib.aws_lambda.Code',
      method: 'fromAsset',
    })
  );
});
