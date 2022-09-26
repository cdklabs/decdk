import * as fs from 'fs';
import * as os from 'os';
import { join } from 'path';
import { readTemplate } from '../../src';
import { Testing } from '../util';

const cfnIncludeTemplatesBaseDir = join(
  os.homedir(),
  'code/aws/aws-cdk/packages/@aws-cdk/cloudformation-include/test/test-templates'
);

const cfnIncludeValidTemplateDirs = [
  cfnIncludeTemplatesBaseDir,
  join(cfnIncludeTemplatesBaseDir, 'yaml'),
  join(cfnIncludeTemplatesBaseDir, 'sam'),
  join(cfnIncludeTemplatesBaseDir, 'nested'),
];

const cfnIncludeInvalidTemplateDirs = [
  join(cfnIncludeTemplatesBaseDir, 'invalid'),
  join(cfnIncludeTemplatesBaseDir, 'yaml', 'invalid'),
];

const isTemplateFile = (dirent: fs.Dirent): boolean =>
  dirent.isFile() &&
  (dirent.name.endsWith('.json') || dirent.name.endsWith('.yaml'));

const readFolder = (dir: string) =>
  fs
    .readdirSync(dir, { withFileTypes: true })
    .filter(isTemplateFile)
    .map((file) => ({
      file: {
        name: file.name,
        path: join(dir, file.name),
      },
    }));

describe('should be valid', () => {
  test.each(cfnIncludeValidTemplateDirs.flatMap(readFolder))(
    '$file.name',
    async ({ file }) => {
      const template = await readTemplate(file.path);
      const output = await Testing.synth(template);

      expect(template.template).toBeValidTemplate();
      expect(output.template).toMatchSnapshot();
    }
  );
});

describe('should be invalid', () => {
  test.each(cfnIncludeInvalidTemplateDirs.flatMap(readFolder))(
    '$file.name',
    async ({ file }) => {
      await expect(async () => {
        const template = await readTemplate(file.path);
        await Testing.synth(template, false);
      }).rejects.toThrow();
    }
  );
});
