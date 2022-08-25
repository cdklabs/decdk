import * as path from 'path';
import * as jsiiReflect from 'jsii-reflect';
import { Template } from './parser/template';

/**
 * Reads a YAML/JSON template file.
 */
export async function readTemplate(templateFile: string): Promise<Template> {
  return Template.fromFile(templateFile);
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
