import * as reflect from 'jsii-reflect';
import { Template } from '../../src/parser/template';
import { StructExpression } from '../../src/type-resolution/struct';
import { TypedTemplate } from '../../src/type-resolution/template';
import { getCdkConstruct } from '../template';
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
            'aws-cdk-lib.aws_lambda.Code.fromAsset': {
              path: 'examples/lambda-handler',
            },
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

  const typedTemplate = new TypedTemplate(template, { typeSystem });

  // THEN
  const myApi = getCdkConstruct(typedTemplate, 'MyApi');
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
  expect(template.template).toBeValidTemplate();
});
