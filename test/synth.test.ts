import * as fs from 'fs';
import * as path from 'path';
import { readTemplate, stackNameFromFileName } from '../src';
import { Testing } from './util';

const dir = path.join(__dirname, '..', 'examples');

for (const templateFile of fs.readdirSync(dir)) {
  test(templateFile, async () => {
    const stackName = stackNameFromFileName(templateFile);
    const template = await readTemplate(path.resolve(dir, templateFile));

    const output = await Testing.synth(stackName, template);
    expect(output.template).toMatchSnapshot(stackName);
  });
}
