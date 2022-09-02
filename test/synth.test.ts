import { readTemplate } from '../src';
import { testExamples, Testing } from './util';

testExamples(async (templateFile) => {
  const template = await readTemplate(templateFile.path);

  const output = await Testing.synth(template);
  expect(output.template).toMatchSnapshot();
});
