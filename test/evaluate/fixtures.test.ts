import path from 'path';
import { readTemplate } from '../../src';
import { testTemplateFixtures, Testing, loadTemplateFixtures } from '../util';

describe('Valid Template Fixtures should synth', () => {
  testTemplateFixtures(async (templateFile) => {
    const template = await readTemplate(templateFile.path);
    const output = await Testing.synth(template);
    expect(output.template).toMatchSnapshot();
  });
});

describe('Cloudformation templates', () => {
  const cfnFixtures = loadTemplateFixtures([
    path.join(__dirname, '..', 'fixtures/templates/cloudformation'),
  ]);

  const ignoreBecauseCurrentlyFailing: string[] = [
    'cloudformation/functions-and-conditions.json', // Expected list of length 3, got 2
    'cloudformation/hook-code-deploy-blue-green-ecs.json', // Expected valid template, got error(s): -  is not allowed to have the additional property "Hooks"
    'cloudformation/resource-attribute-creation-policy.json', // Expected number, got: {"Ref":"CountParameter"}
    'cloudformation/resource-attribute-update-policy.json', // Expected boolean, got: {"Fn::Equals":["true",{"Ref":"WaitOnResourceSignals"}]}
  ];

  testTemplateFixtures(
    async (templateFile) => {
      const template = await readTemplate(templateFile.path);
      const output = await Testing.synth(template);
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
    expect(output.template).toMatchSnapshot();
  }, nestedFixtures);
});
