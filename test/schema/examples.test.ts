import * as jsonschema from 'jsonschema';
import { Schema } from 'jsonschema';
import { readTemplate } from '../../src';
import { testExamples, Testing } from '../util';

let schema: Schema;
beforeAll(async () => {
  schema = await Testing.schema;
});

testExamples(async (example) => {
  const template = await readTemplate(example.path);
  const result = jsonschema.validate(template.template, schema);

  expect(result.valid).toBe(true);
});
