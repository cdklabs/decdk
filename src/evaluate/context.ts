// import { Environment } from '../environment';
// import { schema } from '../parser/schema';
import { Template } from '../parser/template';
// import { TemplateMapping } from '../parser/template/mappings';
export type ContextValue = string | string[] | symbol;

export const NO_VALUE = Symbol('AWS::NoValue');

export interface ContextRecord<Primary, Attribute = Primary> {
  readonly primaryValue: Primary;
  readonly attributes?: Record<string, Attribute>;
}

export type Context<Primary, Attribute = Primary> = Map<
  string,
  ContextRecord<Primary, Attribute>
>;

export interface EvaluationContextOptions {
  readonly template?: Template;
  // readonly environment?: Environment;
}

export abstract class EvaluationContext<P, A = P> {
  protected readonly context = new Map<string, ContextRecord<P, A>>();
  protected readonly template?: Template;
  // private readonly environment?: Environment;

  constructor(opts: EvaluationContextOptions = {}) {
    this.template = opts.template;
    // this.environment = opts.environment;

    // this.context.set('AWS::NoValue', { primaryValue: NO_VALUE });
    // this.context.set('AWS::NotificationARNs', { primaryValue: [] });

    // this.template?.parameters.seedDefaults(this.context);
    // this.environment?.seedContext(this.context);
  }

  public addReferenceable(logicalId: string, record: ContextRecord<P, A>) {
    this.context.set(logicalId, record);
  }

  public setPrimaryContextValues(contextValues: Record<string, P>) {
    for (const [name, primaryValue] of Object.entries(contextValues ?? {})) {
      this.context.set(name, { primaryValue });
    }
  }

  // public setParameterValues(parameterValues: Record<string, string>) {
  //   for (const [name, value] of Object.entries(parameterValues ?? {})) {
  //     this.context.set(name, {
  //       primaryValue: this.template
  //         ? this.template.parameters.parse(name, value)
  //         : value,
  //     });
  //   }
  //   this.template?.parameters.assertAllPresent(this.context);
  // }

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

  public exportValue(exportName: string): string {
    // const exp = this.environment?.exports.get(exportName);
    const exp = false;
    if (!exp) {
      throw new Error(`No such export: ${exportName}`);
    }
    return exp;
  }

  public azs(_regionName: string): string[] {
    throw new Error('AZs not supported yet');
  }
}
