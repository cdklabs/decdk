import { readTemplate } from '../../src';
import { testTemplateFixtures } from '../util';

testTemplateFixtures(async (example) => {
  const template = await readTemplate(example.path);

  expect(template.template).toBeValidTemplate();
});
