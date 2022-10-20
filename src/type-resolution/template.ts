import * as reflect from 'jsii-reflect';
import { DependencyGraph } from '../parser/private/toposort';
import {
  Template,
  TemplateExpression,
  TemplateParameter,
} from '../parser/template';
import { TemplateHook } from '../parser/template/hooks';
import { TemplateMapping } from '../parser/template/mappings';
import { TemplateRule } from '../parser/template/rules';
import {
  toTypedTemplateExpression,
  TypedTemplateExpression,
  TypedTemplateOutput,
} from './expression';
import { resolveResourceLike, ResourceLike } from './resource-like';

export interface TypedTemplateProps {
  typeSystem: reflect.TypeSystem;
}

/**
 * A template describes the desired state of some infrastructure
 */
export class TypedTemplate {
  public readonly resources: DependencyGraph<ResourceLike>;
  public readonly parameters: Map<string, TemplateParameter>;
  public readonly conditions: Map<string, TypedTemplateExpression>;
  public readonly mappings: Map<string, TemplateMapping>;
  public readonly outputs: Map<string, TypedTemplateOutput>;
  public readonly transform: string[];
  public readonly metadata: Map<string, TemplateExpression>;
  public readonly rules: Map<string, TemplateRule>;
  public readonly hooks: Map<string, TemplateHook>;

  constructor(public template: Template, props: TypedTemplateProps) {
    this.resources = template
      .resourceGraph()
      .map((logicalId, resource) =>
        resolveResourceLike(template, resource, logicalId, props.typeSystem)
      );

    this.parameters = template.parameters;
    this.conditions = new Map();
    for (let [logicalId, condition] of template.conditions) {
      const typedCondition = toTypedTemplateExpression(condition);
      this.conditions.set(logicalId, typedCondition);
    }
    this.mappings = template.mappings;
    this.transform = template.transform;
    this.metadata = template.metadata;
    this.rules = template.rules;
    this.hooks = template.hooks;
    this.outputs = new Map();
    for (let [logicalId, output] of template.outputs) {
      const typedOutput = {
        exportName: output.exportName
          ? toTypedTemplateExpression(output.exportName)
          : output.exportName,
        conditionName: output.conditionName,
        value: toTypedTemplateExpression(output.value),
        description: output.description,
      } as TypedTemplateOutput;
      this.outputs.set(logicalId, typedOutput);
    }
  }

  public resource(logicalId: string) {
    return this.resources.get(logicalId);
  }
}
