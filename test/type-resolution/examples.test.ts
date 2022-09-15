import * as reflect from 'jsii-reflect';
import { readTemplate } from '../../src';
import { TypedTemplate } from '../../src/type-resolution/template';
import { testExamples, Testing } from '../util';

let typeSystem: reflect.TypeSystem;
beforeAll(async () => {
  typeSystem = await Testing.typeSystem;
});

testExamples(async (example) => {
  const template = await readTemplate(example.path);

  const typedTemplate = new TypedTemplate(template, { typeSystem });

  expect(template.template).toBeValidTemplate();
  expect(typedTemplate).toMatchSnapshot();
});
