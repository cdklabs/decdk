import { readTemplate } from '../../src';
import { testExamples } from '../util';

testExamples(async (example) => {
  const template = await readTemplate(example.path);

  expect(template.template).toBeValidTemplate();
});
