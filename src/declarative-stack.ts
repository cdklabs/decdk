import * as cdk from 'aws-cdk-lib';
import * as reflect from 'jsii-reflect';
import { CdkContext, CdkEvaluator } from './evaluate/cdk';
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

    const context = new CdkContext({
      stack: this,
      typeSystem,
      template, // ?? needed?
    });
    const ev = new CdkEvaluator(context);

    // Changing working directory if needed, such that relative paths in the template are resolved relative to the
    // template's location, and not to the current process' CWD.
    _cwd(props.workingDirectory, () => {
      ev.evaluateTemplate(template);
    });
  }
}

function _cwd<T>(workDir: string | undefined, cb: () => T): T {
  if (!workDir) {
    return cb();
  }
  const prevWd = process.cwd();
  try {
    process.chdir(workDir);
    return cb();
  } finally {
    process.chdir(prevWd);
  }
}
