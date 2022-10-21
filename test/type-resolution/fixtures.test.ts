import { expect } from 'expect';
import * as reflect from 'jsii-reflect';
import { readTemplate } from '../../src';
import { TypedTemplate } from '../../src/type-resolution/template';
import { testTemplateFixtures, Testing } from '../util';

suite('Type Resolution: Fixtures', () => {
  let typeSystem: reflect.TypeSystem;
  suiteSetup(async () => {
    typeSystem = await Testing.typeSystem;
  });

  testTemplateFixtures(async (example) => {
    const template = await readTemplate(example.path);

    const typedTemplate = new TypedTemplate(template, { typeSystem });

    expect(template.template).toBeValidTemplate();
    expect(typedTemplate).toMatchSnapshot();
  });
});
