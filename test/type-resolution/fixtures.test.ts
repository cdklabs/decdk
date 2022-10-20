import * as reflect from 'jsii-reflect';
import { jestExpect as expect } from 'mocha-expect-snapshot';
import { readTemplate } from '../../src';
import { TypedTemplate } from '../../src/type-resolution/template';
import { testTemplateFixtures, Testing } from '../util';

let typeSystem: reflect.TypeSystem;
setup(async () => {
  typeSystem = await Testing.typeSystem;
});

suite('Fixtures', async () => {
  testTemplateFixtures(async (example) => {
    const template = await readTemplate(example.path);

    const typedTemplate = new TypedTemplate(template, { typeSystem });

    expect(template.template).toBeValidTemplate();
    expect(typedTemplate).toMatchSnapshot();
  });
});
