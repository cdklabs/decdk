import * as cdk from 'aws-cdk-lib';
import { IConstruct } from 'constructs';
import { TemplateExpression } from '../parser/template';
import { ResourceOverride } from '../parser/template/overrides';

export function applyOverride(
  resource: IConstruct,
  override: ResourceOverride,
  ev: (x: TemplateExpression) => unknown
) {
  if (override.removeResource) {
    resource.node.tryRemoveChild(override.childConstructPath);
    return;
  }

  const descendent = findCfnResourceFromPath(
    resource,
    override.childConstructPath
  );

  if (override.update) {
    const { path, value } = override.update;
    descendent.addOverride(path, ev(value));
    return;
  }

  if (override.delete) {
    descendent.addDeletionOverride(override.delete.path);
    return;
  }
}

function findCfnResourceFromPath(
  root: IConstruct,
  path?: string
): cdk.CfnResource {
  const destination = findChildFromPath(root, path);

  if (cdk.CfnResource.isCfnResource(destination)) {
    return destination;
  }

  const defaultChild = destination.node.defaultChild;
  if (defaultChild && cdk.CfnResource.isCfnResource(defaultChild)) {
    return defaultChild;
  }

  throw new Error(
    `Construct ${path} does not have a default child. Please specify the CloudFormation Resource`
  );
}

function findChildFromPath(root: IConstruct, path = ''): IConstruct {
  const descend = (construct: IConstruct, id: string) =>
    construct.node.findChild(id);

  return path.split('.').reduce(descend, root);
}
