import * as reflect from 'jsii-reflect';
import { ObjectLiteral, TemplateResource } from '../parser/template';
import { ResourceTag } from '../parser/template/tags';
import { TypedTemplateExpression } from './expression';
import { resolveExpressionType } from './resolve';

export type ResourceLike = CfnResource | CdkConstruct;

interface BaseConstruct {
  readonly logicalId: string;
  readonly namespace?: string;
  readonly fqn: string;
  readonly props: TypedTemplateExpression;
  readonly tags: ResourceTag[];
}
export interface CfnResource extends BaseConstruct {
  readonly type: 'resource';
}

export interface CdkConstruct extends BaseConstruct {
  readonly type: 'construct';
}

export function resolveResourceLike(
  resource: TemplateResource,
  logicalId: string,
  typeSystem: reflect.TypeSystem
): ResourceLike {
  if (isCfnResource(resource)) {
    return resolveCfnResource(
      resource,
      logicalId,
      typeSystem.findFqn('aws-cdk-lib.CfnResource') as reflect.ClassType
    );
  }

  const type = typeSystem.findFqn(resource.type);
  if (isConstruct(type)) {
    return resolveCdkConstruct(resource, logicalId, type);
  }

  throw new TypeError(
    `Expected Cloudformation resource or CDK type, got ${resource.type}`
  );
}

function resolveCfnResource(
  resource: TemplateResource,
  logicalId: string,
  type: reflect.ClassType
): CfnResource {
  const propsExpressions: ObjectLiteral = {
    type: 'object',
    fields: {
      type: {
        type: 'string',
        value: resource.type,
      },
      properties: {
        type: 'object',
        fields: resource.properties,
      },
    },
  };

  return {
    type: 'resource',
    logicalId,
    namespace: type.namespace,
    fqn: type.fqn,
    tags: resource.tags,
    props: resolveExpressionType(
      propsExpressions,
      type.system.findFqn('aws-cdk-lib.CfnResourceProps').reference
    ),
  };
}

function resolveCdkConstruct(
  resource: TemplateResource,
  logicalId: string,
  type: reflect.ClassType
): CdkConstruct {
  const [_scopeParam, _idParam, propsParam] =
    type.initializer?.parameters ?? [];

  const propsExpressions: ObjectLiteral = {
    type: 'object',
    fields: resource.properties,
  };

  return {
    type: 'construct',
    logicalId,
    namespace: type.namespace,
    fqn: type.fqn,
    tags: resource.tags,
    props: propsParam
      ? resolveExpressionType(propsExpressions, propsParam.type)
      : { type: 'void' },
  };
}

export function isCfnResource(resource: TemplateResource) {
  return resource.type.includes('::');
}

export function isConstruct(type?: reflect.Type): type is reflect.ClassType {
  if (type && type.isClassType()) {
    const constructClass = type.system.findFqn('constructs.Construct');
    return type.extends(constructClass);
  }

  return false;
}
