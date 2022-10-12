import { parseCfnYaml } from '../../src/parser/private/cfn-yaml';

test('Unquoted year-month-day is treated as a string, not a Date', () => {
  const value = parseCfnYaml('Key: 2020-12-31');

  expect(value).toEqual({
    Key: '2020-12-31',
  });
});

test("Unquoted 'No' is treated as a boolean", () => {
  const value = parseCfnYaml('Key: No');

  expect(value).toEqual({
    Key: false,
  });
});

test("Short-form 'Ref' is deserialized correctly", () => {
  const value = parseCfnYaml('!Ref Resource');

  expect(value).toEqual({
    Ref: 'Resource',
  });
});

test("Short-form 'Fn::GetAtt' is deserialized correctly", () => {
  const value = parseCfnYaml('!GetAtt Resource.Attribute');

  expect(value).toEqual({
    'Fn::GetAtt': 'Resource.Attribute',
  });
});

test('Hash merges are not supported', () => {
  const src = `
    source: &base { a: 1, b: 2 }
    target:
      <<: *base
      b: base`;
  const value = parseCfnYaml(src);

  expect(Object.keys(value)).toEqual(['source', 'target']);
});
