import { expect } from 'expect';
import * as reflect from 'jsii-reflect';
import { Template } from '../../src/parser/template';
import { TypedTemplate } from '../../src/type-resolution/template';
import { matchConstruct, Testing } from '../util';

suite('Type Resolution: Enums', () => {
  let typeSystem: reflect.TypeSystem;

  suiteSetup(async () => {
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
    const myQueue = typedTemplate.resource('MyQueue');
    expect(myQueue).toEqual(
      matchConstruct({
        encryption: expect.objectContaining({ type: 'enum', choice: 'KMS' }),
      })
    );
    expect(template.template).toBeValidTemplate();
  });
});
