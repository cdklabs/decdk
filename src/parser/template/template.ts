import { promises as fs } from 'fs';
import { parseCfnYaml } from '../private/cfn-yaml';
import { DependencyGraph } from '../private/toposort';
import { schema } from '../schema';
import { parseExpression, TemplateExpression } from './expression';
import { parseMapping, TemplateMapping } from './mappings';
import { parseOutput, TemplateOutput } from './output';
import { parseParameter, TemplateParameter } from './parameters';
import { parseTemplateResource, TemplateResource } from './resource';
import { parseRule, TemplateRule } from './rules';
import { parseTransform } from './transform';

/**
 * A template describes the desired state of some infrastructure
 */
export class Template {
  public static async fromFile(fileName: string): Promise<Template> {
    const tpl = parseCfnYaml(
      await fs.readFile(fileName, { encoding: 'utf-8' })
    );
    if (!tpl.Resources) {
      throw new Error(`${fileName}: does not look like a template`);
    }
    return new Template(tpl);
  }

  public static fromObject(template: object): Template {
    return new Template(template);
  }

  public static empty(): Template {
    return new Template({
      Resources: {},
    });
  }

  public readonly description?: string;
  public readonly templateFormatVersion?: string;
  public readonly parameters: Map<string, TemplateParameter>;
  public readonly resources: Map<string, TemplateResource>;
  public readonly conditions: Map<string, TemplateExpression>;
  public readonly mappings: Map<string, TemplateMapping>;
  public readonly outputs: Map<string, TemplateOutput>;
  public readonly transform: string[];
  public readonly metadata: Map<string, TemplateExpression>;
  public readonly rules: Map<string, TemplateRule>;

  constructor(public template: schema.Template) {
    this.templateFormatVersion = template.AWSTemplateFormatVersion;
    this.description = template.Description;
    this.parameters = mapValues(template.Parameters, parseParameter);
    this.resources = mapEntries(template.Resources, parseTemplateResource);
    this.conditions = mapValues(template.Conditions, parseExpression);
    this.mappings = mapValues(template.Mappings, parseMapping);
    this.outputs = mapValues(template.Outputs, parseOutput);
    this.transform = parseTransform(template.Transform);
    this.metadata = mapValues(template.Metadata, parseExpression);
    this.rules = mapValues(template.Rules, parseRule);
  }

  public resource(logicalId: string) {
    const r = this.resources.get(logicalId);
    if (!r) {
      throw new Error(`No such resource: ${logicalId}`);
    }
    return r;
  }

  public condition(logicalId: string) {
    const condition = this.conditions.get(logicalId);
    if (!condition) {
      throw new Error(`No such Condition: ${logicalId}`);
    }
    return condition;
  }

  /**
   * Return a graph containing all dependencies in execution order
   *
   * This includes relations established both by property references, as
   * well as 'DependsOn' declarations.
   */
  public resourceGraph(): DependencyGraph<TemplateResource> {
    const dependencies: Map<string, any> = new Map();
    for (const [k, v] of this.resources.entries()) {
      dependencies.set(k, v.dependencies);
    }

    return new DependencyGraph(
      Object.fromEntries(this.resources.entries()),
      dependencies
    );
  }
}

function mapValues<T, U>(
  record: Record<string, T> | undefined,
  fn: (t: T) => U
): Map<string, U> {
  return new Map(Object.entries(record ?? {}).map(([k, v]) => [k, fn(v)]));
}

function mapEntries<T, U>(
  record: Record<string, T> | undefined,
  fn: (key: string, t: T) => U
): Map<string, U> {
  return new Map(Object.entries(record ?? {}).map(([k, v]) => [k, fn(k, v)]));
}
