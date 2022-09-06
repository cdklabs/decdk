import * as reflect from 'jsii-reflect';
import { Template } from '../../src/parser/template';
import { resolveResourceLike } from '../../src/type-resolution';
import { StructExpression } from '../../src/type-resolution/struct';
import { Testing } from '../util';

let typeSystem: reflect.TypeSystem;

beforeAll(async () => {
  typeSystem = await Testing.typeSystem;
});

test('Constructs can be referenced', async () => {
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
      MyApi: {
        Type: 'aws-cdk-lib.aws_apigateway.LambdaRestApi',
        Properties: {
          handler: { Ref: 'MyLambda' },
        },
      },
      GetRoot: {
        Type: 'aws-cdk-lib.aws_apigateway.Method',
        Properties: {
          resource: { 'Fn::GetAtt': ['MyApi', 'root'] },
          httpMethod: 'GET',
        },
      },
    },
  });

  const typedTemplate = template
    .resourceGraph()
    .map((logicalId, resource) =>
      resolveResourceLike(resource, logicalId, typeSystem)
    );

  // THEN
  expect(template.template).toBeValidTemplate();
  const myApi = typedTemplate.get('MyApi');
  expect(myApi.type).toBe('construct');
  expect(myApi.props?.type).toBe('struct');
  expect((myApi.props as StructExpression)?.fields).toHaveProperty(
    'handler',
    expect.objectContaining({
      type: 'intrinsic',
      fn: 'ref',
      logicalId: 'MyLambda',
    })
  );
});
