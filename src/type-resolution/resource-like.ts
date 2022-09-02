import * as reflect from 'jsii-reflect';
import { ObjectLiteral, TemplateResource } from '../parser/template';
import { TypedTemplateExpression } from './expression';
import { resolveExpressionType } from './resolve';

export type ResourceLike = CfnResource | CdkConstruct;

export interface CfnResource {
  readonly type: 'resource';
  readonly namespace?: string;
  readonly fqn: string;
  readonly resource: TemplateResource;
  readonly props?: TypedTemplateExpression;
}

export interface CdkConstruct {
  readonly type: 'construct';
  readonly namespace?: string;
  readonly fqn: string;
  readonly resource: TemplateResource;
  readonly props?: TypedTemplateExpression;
}

export function resolveResourceLike(
  resource: TemplateResource,
  typeSystem: reflect.TypeSystem
): ResourceLike {
  if (isCfnResource(resource)) {
    return resolveCfnResource(
      resource,
      typeSystem.findFqn('aws-cdk-lib.CfnResource') as reflect.ClassType
    );
  }

  const type = typeSystem.findFqn(resource.type);
  if (isConstruct(type)) {
    return resolveCdkConstruct(resource, type);
  }

  throw new TypeError(
    `Expected Cloudformation resource or CDK type, got ${resource.type}`
  );
}

function resolveCfnResource(
  resource: TemplateResource,
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
    namespace: type.namespace,
    fqn: type.fqn,
    resource,
    props: resolveExpressionType(
      propsExpressions,
      type.system.findFqn('aws-cdk-lib.CfnResourceProps').reference
    ),
  };
}

function resolveCdkConstruct(
  resource: TemplateResource,
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
    namespace: type.namespace,
    fqn: type.fqn,
    resource,
    props: propsParam
      ? resolveExpressionType(propsExpressions, propsParam.type)
      : undefined,
  };
}

function isCfnResource(resource: TemplateResource) {
  return resource.type.includes('::');
}

export function isConstruct(type?: reflect.Type): type is reflect.ClassType {
  if (type && type.isClassType()) {
    const constructClass = type.system.findFqn('constructs.Construct');
    return type.extends(constructClass);
  }

  return false;
}
