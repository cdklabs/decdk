import * as reflect from 'jsii-reflect';
import { Template } from '../../src/parser/template';
import { resolveResourceLike } from '../../src/type-resolution';
import { Testing } from '../util';

let typeSystem: reflect.TypeSystem;

beforeAll(async () => {
  typeSystem = await Testing.typeSystem;
});

test('ResourceLikes are resolved correctly', async () => {
  // GIVEN
  const template = await Template.fromObject({
    Resources: {
      CdkTopic: {
        Type: 'aws-cdk-lib.aws_sns.Topic',
        Properties: {
          fifo: false,
        },
      },
      CfnTopic: {
        Type: 'AWS::SNS::Topic',
        Properties: {
          FifoTopic: true,
        },
      },
    },
  });

  const typedTemplate = template
    .resourceGraph()
    .map((_, resource) => resolveResourceLike(resource, typeSystem));

  // THEN
  expect(template.template).toBeValidTemplate();
  expect(typedTemplate.get('CdkTopic').type).toBe('construct');
  expect(typedTemplate.get('CfnTopic').type).toBe('resource');
});
