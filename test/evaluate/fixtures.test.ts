import path from 'path';
import { readTemplate } from '../../src';
import { testTemplateFixtures, Testing, loadTemplateFixtures } from '../util';

describe('Valid Template Fixtures should synth', () => {
  testTemplateFixtures(async (templateFile) => {
    const template = await readTemplate(templateFile.path);

    const output = await Testing.synth(template);

    expect(template.template).toBeValidTemplate();
    expect(output.template).toMatchSnapshot();
  });
});

describe('Cloudformation templates', () => {
  const cfnFixtures = loadTemplateFixtures([
    path.join(__dirname, '..', 'fixtures/templates/cloudformation'),
  ]);

  const ignoreBecauseCurrentlyFailing: string[] = [
    'cloudformation/condition-same-name-as-resource.json', // There is already a Construct with name 'AlwaysTrue' in DeclarativeStack [Test]
    'cloudformation/condition-using-mapping.json', // does not look like a template
    'cloudformation/find-in-map-for-boolean-property.json', // Expected string or list of strings, got: true
    'cloudformation/find-in-map-with-dynamic-mapping.json', // Expected string, got: {"Ref":"Stage"}
    'cloudformation/fn-sub-escaping.json', //  No resource or parameter with name:  ! DoesNotExist
    'cloudformation/fn-sub-parsing-edges.json', // TypeError: Cannot read properties of null (reading 'Resources')
    'cloudformation/fn-sub-shadow-attribute.json', //  No resource or parameter with name: AnotherBucket
    'cloudformation/functions-and-conditions.json', // Expected list of length 3, got 2
    'cloudformation/hook-code-deploy-blue-green-ecs.json', // Expected valid template, got error(s): -  is not allowed to have the additional property "Hooks"
    'cloudformation/if-in-tags.json', // Expected valid template, got error(s): - Conditions.ValcacheServerEnabled is not of a type(s) object
    'cloudformation/only-parameters-and-rule.json', // does not look like a template
    'cloudformation/outputs-with-references.json', // Expected string, got: {"Ref":"Bucket"}
    'cloudformation/parameter-references.json', // Expected string or list of strings, got: {"Name":"AWS::Include","Parameters":{"Location":{"Ref":"MyParam"}}}
    'cloudformation/resource-attribute-creation-policy.json', // Expected number, got: {"Ref":"CountParameter"}
    'cloudformation/resource-attribute-update-policy.json', // Expected boolean, got: {"Fn::Equals":["true",{"Ref":"WaitOnResourceSignals"}]}
    'cloudformation/short-form-fnsub-string.yaml', // No resource or parameter with name:  ! AWS::Region
  ];

  testTemplateFixtures(
    async (templateFile) => {
      const template = await readTemplate(templateFile.path);
      const output = await Testing.synth(template);
      expect(template.template).toBeValidTemplate();
      expect(output.template).toMatchSnapshot();
    },
    cfnFixtures.filter(({ id }) => !ignoreBecauseCurrentlyFailing.includes(id))
  );
});

describe('Invalid Template Fixtures should fail', () => {
  const invalidFixtures = loadTemplateFixtures([
    path.join(__dirname, '..', 'fixtures/invalid-templates'),
  ]);

  const ignoreBecauseCurrentlyPassing = [
    'invalid-templates/alphabetical-string-passed-to-number.json',
    'invalid-templates/bucket-policy-without-bucket.json',
    'invalid-templates/bucket-with-cors-rules-not-an-array.json',
    'invalid-templates/bucket-with-cors-rules-null-element.json',
    'invalid-templates/bucket-with-invalid-cors-rule.json',
    'invalid-templates/non-existent-condition-in-conditions.json',
    'invalid-templates/non-existent-condition-in-if.json',
    'invalid-templates/non-existent-condition.json',
    'invalid-templates/non-existent-depends-on.json',
    'invalid-templates/non-existent-mapping.json',
    'invalid-templates/non-existent-resource-attribute.json',
    'invalid-templates/only-codecommit-repo-using-cfn-functions.json',
    'invalid-templates/output-referencing-non-existent-condition.json',
    'invalid-templates/rule-referencing-a-non-existent-parameter.json',
    'invalid-templates/short-form-get-att-no-dot.yaml',
    'invalid-templates/short-form-import-sub.yaml',
    'invalid-templates/short-form-transform.yaml',
  ];

  testTemplateFixtures(
    async (templateFile) => {
      const template = await readTemplate(templateFile.path);

      await expect(Testing.synth(template)).rejects.toThrow();
    },
    invalidFixtures.filter(
      ({ id }) => !ignoreBecauseCurrentlyPassing.includes(id)
    )
  );
});

describe('SAM templates', () => {
  const samFixtures = loadTemplateFixtures([
    path.join(__dirname, '..', 'fixtures/templates/sam'),
  ]);

  testTemplateFixtures(async (templateFile) => {
    const template = await readTemplate(templateFile.path);
    const output = await Testing.synth(template);
    expect(template.template).toBeValidTemplate();
    expect(output.template).toMatchSnapshot();
  }, samFixtures);
});

describe('Nested Stacks templates', () => {
  const nestedFixtures = loadTemplateFixtures([
    path.join(__dirname, '..', 'fixtures/templates/nested'),
  ]);

  testTemplateFixtures(async (templateFile) => {
    const template = await readTemplate(templateFile.path);
    const output = await Testing.synth(template);
    expect(template.template).toBeValidTemplate();
    expect(output.template).toMatchSnapshot();
  }, nestedFixtures);
});
