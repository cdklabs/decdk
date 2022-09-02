import * as reflect from 'jsii-reflect';
import { Template } from '../../src/parser/template';
import { resolveResourceLike } from '../../src/type-resolution';
import { StructExpression } from '../../src/type-resolution/struct';
import { Testing } from '../util';

let typeSystem: reflect.TypeSystem;

beforeAll(async () => {
  typeSystem = await Testing.typeSystem;
});

test('Enums are resolved correctly', async () => {
  // GIVEN
  const template = await Template.fromObject({
    Resources: {
      MyQueue: {
        Type: 'aws-cdk-lib.aws_sqs.Queue',
        Properties: {
          encryption: 'KMS',
        },
      },
    },
  });

  const typedTemplate = template
    .resourceGraph()
    .map((_, resource) => resolveResourceLike(resource, typeSystem));

  // THEN
  const myQueue = typedTemplate.get('MyQueue');
  expect(myQueue.type).toBe('construct');
  expect(myQueue.props?.type).toBe('struct');
  expect((myQueue.props as StructExpression)?.fields).toHaveProperty(
    'encryption',
    expect.objectContaining({ type: 'enum', choice: 'KMS' })
  );
});
