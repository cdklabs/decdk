import * as fs from 'fs';
import * as path from 'path';
import * as reflect from 'jsii-reflect';
import { readTemplate } from '../../src';
import { resolveResourceLike } from '../../src/type-resolution';
import { Testing } from '../util';

let typeSystem: reflect.TypeSystem;
beforeAll(async () => {
  typeSystem = await Testing.typeSystem;
});

const dir = path.join(__dirname, '..', '..', 'examples');

const isTemplateFile = (dirent: fs.Dirent): boolean =>
  dirent.isFile() &&
  (dirent.name.endsWith('.json') || dirent.name.endsWith('.yaml'));

const examples = fs
  .readdirSync(dir, { withFileTypes: true })
  .filter(isTemplateFile);

for (const templateFile of examples) {
  test(templateFile.name, async () => {
    const template = await readTemplate(path.resolve(dir, templateFile.name));

    const typedTemplate = template
      .resourceGraph()
      .map((_, resource) => resolveResourceLike(resource, typeSystem));

    expect(typedTemplate).toMatchSnapshot();
  });
}
