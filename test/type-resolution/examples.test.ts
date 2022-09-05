import * as reflect from 'jsii-reflect';
import { readTemplate } from '../../src';
import { resolveResourceLike } from '../../src/type-resolution';
import { testExamples, Testing } from '../util';

let typeSystem: reflect.TypeSystem;
beforeAll(async () => {
  typeSystem = await Testing.typeSystem;
});

testExamples(async (example) => {
  const template = await readTemplate(example.path);

  const typedTemplate = template
    .resourceGraph()
    .map((_, resource) => resolveResourceLike(resource, typeSystem));

  expect(template.template).toBeValidTemplate();
  expect(typedTemplate).toMatchSnapshot();
});
