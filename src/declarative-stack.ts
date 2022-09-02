import { mkdtempSync, writeFileSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';
import * as cdk from 'aws-cdk-lib';
import { CfnInclude } from 'aws-cdk-lib/cloudformation-include';
import * as reflect from 'jsii-reflect';
import { ConstructBuilder, processReferences } from './deconstruction';
import { Template } from './parser/template';

export interface DeclarativeStackProps extends cdk.StackProps {
  typeSystem: reflect.TypeSystem;
  template: Template;
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

    const builder = new ConstructBuilder({
      stack: this,
      template,
      typeSystem,
      workingDirectory: props.workingDirectory,
    });

    const graph = template.resourceGraph();
    const topoQueue = graph.topoQueue();

    while (!topoQueue.isEmpty()) {
      topoQueue.withNext((logicalId, resource) =>
        builder.build(logicalId, resource)
      );
    }

    const cfnTemplate = JSON.parse(JSON.stringify(template.template));
    delete cfnTemplate.$schema;

    const workdir = mkdtempSync(join(tmpdir(), 'decdk-'));
    const templateFile = join(workdir, 'template.json');
    writeFileSync(templateFile, JSON.stringify(cfnTemplate));

    // Add an Include construct with what's left of the template
    new CfnInclude(this, 'Include', { templateFile });

    // replace all "Fn::GetAtt" with tokens that resolve correctly both for
    // constructs and raw resources.
    processReferences(this);
  }
}
