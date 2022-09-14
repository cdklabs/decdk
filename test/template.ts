import * as reflect from 'jsii-reflect';
import { DependencyGraph } from '../src/parser/private/toposort';
import { Template } from '../src/parser/template';
import {
  CdkConstruct,
  isCdkConstructExpression,
  resolveResourceLike,
  ResourceLike,
} from '../src/type-resolution';

export function typed(
  typeSystem: reflect.TypeSystem,
  template: Template
): DependencyGraph<ResourceLike> {
  return template
    .resourceGraph()
    .map((logicalId, resource) =>
      resolveResourceLike(resource, logicalId, typeSystem)
    );
}

export function getCdkConstruct(
  template: DependencyGraph<ResourceLike>,
  name: string
): CdkConstruct {
  const result = template.get(name);
  if (!isCdkConstructExpression(result)) {
    fail(`${result.fqn} must be a CDK construct`);
  }
  return result;
}
