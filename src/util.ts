import * as path from 'path';
import * as fs from 'fs-extra';
import * as jsiiReflect from 'jsii-reflect';
import * as YAML from 'yaml';

/**
 * Reads a YAML/JSON template file.
 */
export async function readTemplate(templateFile: string) {
  const str = await fs.readFile(templateFile, { encoding: 'utf-8' });
  const template = YAML.parse(str, { schema: 'yaml-1.1' });
  return template;
}

export async function loadTypeSystem(validate = true) {
  const typeSystem = new jsiiReflect.TypeSystem();
  await typeSystem.loadNpmDependencies(path.resolve(__dirname, '..'), {
    validate,
  });
  return typeSystem;
}

export function stackNameFromFileName(fileName: string) {
  return path.parse(fileName).name.replace('.', '-');
}
