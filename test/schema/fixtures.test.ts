import { expect } from 'expect';
import { readTemplate } from '../../src';
import { testTemplateFixtures } from '../util';

suite('Schema: Fixtures', () => {
  testTemplateFixtures(async (example) => {
    const template = await readTemplate(example.path);

    expect(template.template).toBeValidTemplate();
  });
});
