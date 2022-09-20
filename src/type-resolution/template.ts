import * as reflect from 'jsii-reflect';
import { DependencyGraph } from '../parser/private/toposort';
import {
  Template,
  TemplateExpression,
  TemplateParameters,
} from '../parser/template';
import { TemplateMapping } from '../parser/template/mappings';
import { TemplateOutput } from '../parser/template/output';
import { resolveResourceLike, ResourceLike } from './resource-like';

export interface TypedTemplateProps {
  typeSystem: reflect.TypeSystem;
}

/**
 * A template describes the desired state of some infrastructure
 */
export class TypedTemplate {
  public readonly resources: DependencyGraph<ResourceLike>;
  public readonly parameters: TemplateParameters;
  public readonly conditions: Map<string, TemplateExpression>;
  public readonly mappings: Map<string, TemplateMapping>;
  public readonly outputs: Map<string, TemplateOutput>;

  constructor(public template: Template, props: TypedTemplateProps) {
    this.resources = template
      .resourceGraph()
      .map((logicalId, resource) =>
        resolveResourceLike(template, resource, logicalId, props.typeSystem)
      );

    this.parameters = template.parameters;
    this.conditions = template.conditions;
    this.mappings = template.mappings;
    this.outputs = template.outputs;
  }

  public resource(logicalId: string) {
    return this.resources.get(logicalId);
  }
}
