import * as cdk from 'aws-cdk-lib';
import * as reflect from 'jsii-reflect';
import { EvaluationContext, Evaluator } from './evaluate';
import { Template } from './parser/template';
import { TypedTemplate } from './type-resolution/template';

export interface DeclarativeStackProps extends cdk.StackProps {
  typeSystem: reflect.TypeSystem;
  template: Template;
  workingDirectory?: string;
}

export class DeclarativeStack extends cdk.Stack {
  constructor(scope: cdk.App, id: string, props: DeclarativeStackProps) {
    super(scope, id, props);

    const typeSystem = props.typeSystem;
    const template = new TypedTemplate(props.template, { typeSystem });

    const context = new EvaluationContext({
      stack: this,
      template,
      typeSystem,
    });
    const ev = new Evaluator(context);

    _cwd(props.workingDirectory, () => {
      ev.evaluateTemplate();
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
