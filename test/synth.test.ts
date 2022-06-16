import * as fs from 'fs';
import * as path from 'path';
import { readTemplate } from '../src';
import { Testing } from './util';

const dir = path.join(__dirname, '..', 'examples');

for (const templateFile of fs.readdirSync(dir)) {
  test(templateFile, async () => {
    const template = await readTemplate(path.resolve(dir, templateFile));

    const output = await Testing.synth(template);
    expect(output.template).toMatchSnapshot();
  });
}
