import * as reflect from 'jsii-reflect';
import * as jsonschema from 'jsonschema';
import { Schema } from 'jsonschema';
import { readTemplate } from '../../src';
import { renderFullSchema } from '../../src/cdk-schema';
import { testExamples, Testing } from '../util';

let typeSystem: reflect.TypeSystem;
let schema: Schema;
beforeAll(async () => {
  typeSystem = await Testing.typeSystem;
  schema = renderFullSchema(typeSystem);
});

testExamples(async (example) => {
  const template = await readTemplate(example.path);
  const result = jsonschema.validate(template.template, schema);

  expect(result.valid).toBe(true);
});
