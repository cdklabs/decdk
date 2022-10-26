import * as cdk from 'aws-cdk-lib';
import * as reflect from 'jsii-reflect';
import { RuntimeError } from '../error-handling';
import { TypedTemplate } from '../type-resolution/template';
import { InstanceReference, Reference, References } from './references';

export interface EvaluationContextOptions {
  readonly stack: cdk.Stack;
  readonly template: TypedTemplate;
  readonly typeSystem: reflect.TypeSystem;
}
class PseudoParamRef extends InstanceReference {}

export class EvaluationContext {
  public readonly stack: cdk.Stack;
  public readonly typeSystem: reflect.TypeSystem;
  public readonly template: TypedTemplate;
  protected readonly availableRefs: References = new References();

  constructor(opts: EvaluationContextOptions) {
    this.stack = opts.stack;
    this.template = opts.template;
    this.typeSystem = opts.typeSystem;

    this.addReferences(
      new PseudoParamRef('AWS::AccountId', cdk.Aws.ACCOUNT_ID),
      new PseudoParamRef('AWS::NotificationARNs', cdk.Aws.NOTIFICATION_ARNS),
      new PseudoParamRef('AWS::NoValue', cdk.Aws.NO_VALUE),
      new PseudoParamRef('AWS::Partition', cdk.Aws.PARTITION),
      new PseudoParamRef('AWS::Region', cdk.Aws.REGION),
      new PseudoParamRef('AWS::StackId', cdk.Aws.STACK_ID),
      new PseudoParamRef('AWS::StackName', cdk.Aws.STACK_NAME),
      new PseudoParamRef('AWS::URLSuffix', cdk.Aws.URL_SUFFIX),
      new PseudoParamRef('CDK::Scope', this.stack)
    );
  }

  public addReference(reference: Reference) {
    this.availableRefs.add(reference);
  }

  public addReferences(...references: Reference[]) {
    for (const reference of references) {
      this.addReference(reference);
    }
  }

  public reference(logicalId: string): Reference {
    const r = this.availableRefs.get(logicalId);
    if (!r) {
      throw new RuntimeError(`No such Resource or Parameter: ${logicalId}`);
    }
    return r;
  }

  public mapping(mappingName: string) {
    const map = this.template?.mappings?.get(mappingName);
    if (!map) {
      throw new RuntimeError(`No such Mapping: ${mappingName}`);
    }
    return map;
  }

  public condition(conditionName: string) {
    const condition = this.template?.conditions?.get(conditionName);
    if (!condition) {
      throw new RuntimeError(`No such condition: ${conditionName}`);
    }
    return condition;
  }

  /**
   * Return the Class for a given FQN
   */
  public resolveClass(fqn: string) {
    const [mod, ...className] = fqn.split('.');
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const module = require(mod);

    let curr = module;
    while (true) {
      const next = className.shift();
      if (!next) {
        break;
      }
      curr = curr[next];
      if (!curr) {
        throw new RuntimeError(`Class not found: ${fqn}`);
      }
    }

    return curr;
  }
}
