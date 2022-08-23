import * as fs from 'fs';
import * as path from 'path';
import { readTemplate } from '../src';
import { Testing } from './util';

const dir = path.join(__dirname, '..', 'examples');

const isTemplateFile = (dirent: fs.Dirent): boolean =>
  dirent.isFile() &&
  (dirent.name.endsWith('.json') || dirent.name.endsWith('.yaml'));

const examples = fs
  .readdirSync(dir, { withFileTypes: true })
  .filter(isTemplateFile);

for (const templateFile of examples) {
  test(templateFile.name, async () => {
    const template = await readTemplate(path.resolve(dir, templateFile.name));

    const output = await Testing.synth(template);
    expect(output.template).toMatchSnapshot();
  });
}
