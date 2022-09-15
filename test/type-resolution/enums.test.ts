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

  const typedTemplate = new TypedTemplate(template, { typeSystem });

  // THEN
  expect(template.template).toBeValidTemplate();
  const myQueue = getCdkConstruct(typedTemplate, 'MyQueue');
  expect(myQueue.type).toBe('construct');
  expect(myQueue.props?.type).toBe('struct');
  expect((myQueue.props as StructExpression)?.fields).toHaveProperty(
    'encryption',
    expect.objectContaining({ type: 'enum', choice: 'KMS' })
  );
});
