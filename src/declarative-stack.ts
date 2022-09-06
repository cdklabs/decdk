import * as cdk from 'aws-cdk-lib';
import * as reflect from 'jsii-reflect';
import { EvaluationContext, Evaluator } from './evaluate';
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

    const context = new EvaluationContext({
      stack: this,
      template,
      typeSystem,
    });

    new Evaluator(context).evaluateTemplate((fn) =>
      // Changing working directory if needed, such that relative paths in the template are resolved relative to the
      // template's location, and not to the current process' CWD.
      _cwd(props.workingDirectory, fn)
    );
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
