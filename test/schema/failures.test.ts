import * as jsonschema from 'jsonschema';
import { Schema } from 'jsonschema';
import { Testing } from '../util';

let schema: Schema;
beforeAll(async () => {
  schema = await Testing.schema;
});

test('invalid schema will fail', () => {
  // GIVEN
  const template = {
    $schema: '../cdk.schema.json',
    Resources: {
      VPC: {
        Type: 'aws-cdk-lib.aws_ec2.Vpc',
        Properties: {
          banana: true,
        },
      },
    },
  };

  // THEN
  const result = jsonschema.validate(template, schema);
  expect(result.valid).toBe(false);
});
