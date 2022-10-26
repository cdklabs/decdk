import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as reflect from 'jsii-reflect';
import { AnnotationsContext, DeclarativeStackError } from './error-handling';
import { EvaluationContext, Evaluator } from './evaluate';
import { Template } from './parser/template';
import { TypedTemplate } from './type-resolution/template';
// eslint-disable-next-line @typescript-eslint/no-require-imports
const { version } = require('../package.json');

const JSII_RTTI_SYMBOL = Symbol.for('jsii.rtti');

export interface DeclarativeStackProps extends cdk.StackProps {
  typeSystem: reflect.TypeSystem;
  template: Template;
  workingDirectory?: string;
}

export class DeclarativeStack extends cdk.Stack {
  constructor(scope: cdk.App, id: string, props: DeclarativeStackProps) {
    super(scope, id, props);

    const ctx = props.template.metadata.get('AWS::CDK::Context') ?? {};
    Object.entries(ctx).forEach(([k, v]) => this.node.setContext(k, v));

    this.templateOptions.templateFormatVersion =
      props.template.templateFormatVersion;
    this.templateOptions.description = props.template.description;

    const typeSystem = props.typeSystem;
    const template = new TypedTemplate(props.template, { typeSystem });

    new (class extends Construct {
      //@ts-ignore
      private static readonly [JSII_RTTI_SYMBOL] = {
        fqn: '@cdklabs/decdk',
        version,
      };
    })(this, '$decdkAnalytics');

    const annotations = AnnotationsContext.root();
    const context = new EvaluationContext({
      stack: this,
      template,
      typeSystem,
    });
    const ev = new Evaluator(context);

    _cwd(props.workingDirectory, () => {
      ev.evaluateTemplate(annotations);
    });

    if (annotations.hasErrors()) {
      throw new DeclarativeStackError(annotations);
    }
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
