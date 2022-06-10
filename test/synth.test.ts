import * as fs from 'fs';
import * as path from 'path';
import * as cdk from 'aws-cdk-lib';
import * as reflect from 'jsii-reflect';
import {
  DeclarativeStack,
  loadTypeSystem,
  readTemplate,
  stackNameFromFileName,
} from '../lib';

const dir = path.join(__dirname, '..', 'examples');

let _cachedTS: reflect.TypeSystem;
async function obtainTypeSystem() {
  // Load the typesystem only once, it's quite expensive
  if (!_cachedTS) {
    _cachedTS = await loadTypeSystem(true);
  }
  return _cachedTS;
}

for (const templateFile of fs.readdirSync(dir)) {
  test(templateFile, async () => {
    const workingDirectory = dir;
    const template = await readTemplate(path.resolve(dir, templateFile));
    const typeSystem = await obtainTypeSystem();

    const app = new cdk.App();
    const stackName = stackNameFromFileName(templateFile);

    new DeclarativeStack(app, stackName, {
      workingDirectory,
      template,
      typeSystem,
    });

    const output = app.synth().getStackByName(stackName);
    expect(output.template).toMatchSnapshot(stackName);
  });
}
