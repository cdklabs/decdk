import * as cdk from 'aws-cdk-lib';
import { IConstruct } from 'constructs';
import * as reflect from 'jsii-reflect';
import { Template } from '../parser/template';
export type ContextValue = IConstruct | string | string[];

export interface ContextRecord {
  readonly primaryValue: ContextValue;
  readonly attributes?: Record<string, any>;
}

export type Context = Map<string, ContextRecord>;

export interface EvaluationContextOptions {
  readonly stack: cdk.Stack;
  readonly template: Template;
  readonly typeSystem: reflect.TypeSystem;
}

export class EvaluationContext {
  public readonly stack: cdk.Stack;
  public readonly typeSystem: reflect.TypeSystem;
  public readonly template: Template;
  protected readonly context: Context = new Map();

  constructor(opts: EvaluationContextOptions) {
    this.stack = opts.stack;
    this.template = opts.template;
    this.typeSystem = opts.typeSystem;

    this.context.set('AWS::AccountId', { primaryValue: cdk.Aws.ACCOUNT_ID });
    this.context.set('AWS::NotificationARNs', {
      primaryValue: cdk.Aws.NOTIFICATION_ARNS,
    });
    this.context.set('AWS::NoValue', { primaryValue: cdk.Aws.NO_VALUE });
    this.context.set('AWS::Partition', { primaryValue: cdk.Aws.PARTITION });
    this.context.set('AWS::Region', { primaryValue: cdk.Aws.REGION });
    this.context.set('AWS::StackId', { primaryValue: cdk.Aws.STACK_ID });
    this.context.set('AWS::StackName', { primaryValue: cdk.Aws.STACK_NAME });
    this.context.set('AWS::URLSuffix', { primaryValue: cdk.Aws.URL_SUFFIX });
  }

  public addReferenceable(logicalId: string, record: ContextRecord) {
    this.context.set(logicalId, record);
  }

  public setPrimaryContextValues(contextValues: Record<string, ContextValue>) {
    for (const [name, primaryValue] of Object.entries(contextValues ?? {})) {
      this.context.set(name, { primaryValue });
    }
  }

  public referenceable(logicalId: string) {
    const r = this.context.get(logicalId);
    if (!r) {
      throw new Error(`No resource or parameter with name: ${logicalId}`);
    }
    return r;
  }

  public mapping(mappingName: string) {
    const map = this.template?.mappings?.get(mappingName);
    if (!map) {
      throw new Error(`No such Mapping: ${mappingName}`);
    }
    return map;
  }

  public condition(conditionName: string) {
    const condition = this.template?.conditions?.get(conditionName);
    if (!condition) {
      throw new Error(`No such condition: ${conditionName}`);
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
        throw new Error(`unable to resolve class ${className}`);
      }
    }

    return curr;
  }
}
