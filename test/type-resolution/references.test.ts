import { expect } from 'expect';
import * as reflect from 'jsii-reflect';
import { Template } from '../../src/parser/template';
import { TypedTemplate } from '../../src/type-resolution/template';
import { matchConstruct, matchResolveFnRef, Testing } from '../util';

suite('Type Resolution: References', () => {
  let typeSystem: reflect.TypeSystem;

  suiteSetup(async () => {
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
              'aws-cdk-lib.aws_lambda.Code.fromAsset':
                'examples/lambda-handler',
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
            resource: { 'CDK::GetProp': ['MyApi', 'root'] },
            httpMethod: 'GET',
          },
        },
      },
    });

    const typedTemplate = new TypedTemplate(template, { typeSystem });

    // THEN
    const myApi = typedTemplate.resource('MyApi');
    expect(myApi).toEqual(
      matchConstruct({
        handler: matchResolveFnRef('MyLambda'),
      })
    );
    expect(template.template).toBeValidTemplate();
  });
});
