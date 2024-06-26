import * as fs from 'fs';
import * as path from 'path';
import { expect } from 'expect';
import * as jsonschema from 'jsonschema';
import { Testing } from '../util';

suite('Generated Schema is valid', () => {
  test('generated schema is valid JSON Schema draft-04', async () => {
    // GIVEN
    const result = jsonschema.validate(
      Testing.schema,
      JSON.parse(
        fs
          .readFileSync(path.join(__dirname, 'json-schema-draft-04.json'))
          .toString()
      )
    );

    // THEN
    expect(result.errors).toEqual([]);
    expect(result.valid).toStrictEqual(true);
  }).timeout(60_000);
});
