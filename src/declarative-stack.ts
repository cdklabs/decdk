import { mkdtempSync, writeFileSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';
import * as cdk from 'aws-cdk-lib';
import { CfnInclude } from 'aws-cdk-lib/cloudformation-include';
import * as reflect from 'jsii-reflect';
import * as jsonschema from 'jsonschema';
import { renderFullSchema } from './cdk-schema';
import {
  _cwd,
  applyOverrides,
  deconstructValue,
  isCfnResourceType,
  processReferences,
  resolveType,
  applyDependency,
  applyTags,
  ValidationError,
} from './deconstruction';
import { topologicalSort } from './toposort';

export interface DeclarativeStackProps extends cdk.StackProps {
  typeSystem: reflect.TypeSystem;
  template: any;
  workingDirectory?: string;
}

export class DeclarativeStack extends cdk.Stack {
  constructor(scope: cdk.App, id: string, props: DeclarativeStackProps) {
    super(scope, id, {
      env: {
        account:
          process.env.CDK_DEPLOY_ACCOUNT || process.env.CDK_DEFAULT_ACCOUNT,
        region: process.env.CDK_DEPLOY_REGION || process.env.CDK_DEFAULT_REGION,
      },
    });

    const typeSystem = props.typeSystem;
    const template = props.template;

    const schema = renderFullSchema(typeSystem);

    const result = jsonschema.validate(template, schema);
    if (!result.valid) {
      throw new ValidationError(
        'Schema validation errors:\n  ' +
          result.errors.map((e) => `"${e.property}" ${e.message}`).join('\n  ')
      );
    }

    const sortedResources = topologicalSort(template.Resources ?? {});
    for (const [logicalId, resourceProps] of sortedResources) {
      const rprops: any = resourceProps;
      if (!rprops.Type) {
        throw new Error('Resource is missing type: ' + JSON.stringify(rprops));
      }

      if (isCfnResourceType(rprops.Type)) {
        continue;
      }

      const propsType = typeSystem.findFqn(rprops.Type + 'Props');
      const propsTypeRef = new reflect.TypeReference(typeSystem, propsType);
      const Ctor = resolveType(rprops.Type);

      // Changing working directory if needed, such that relative paths in the template are resolved relative to the
      // template's location, and not to the current process' CWD.
      _cwd(props.workingDirectory, () => {
        const resource = new Ctor(
          this,
          logicalId,
          deconstructValue({
            stack: this,
            typeRef: propsTypeRef,
            optional: true,
            key: 'Properties',
            value: rprops.Properties,
          })
        );
        applyDependency(this, resource, rprops.DependsOn);
        applyTags(resource, rprops.Tags);
        applyOverrides(resource, rprops.Overrides);
      });

      delete template.Resources[logicalId];
    }

    delete template.$schema;

    const workdir = mkdtempSync(join(tmpdir(), 'decdk-'));
    const templateFile = join(workdir, 'template.json');
    writeFileSync(templateFile, JSON.stringify(template));

    // Add an Include construct with what's left of the template
    new CfnInclude(this, 'Include', { templateFile });

    // replace all "Fn::GetAtt" with tokens that resolve correctly both for
    // constructs and raw resources.
    processReferences(this);
  }
}
