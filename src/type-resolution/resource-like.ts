import * as reflect from 'jsii-reflect';
import { ObjectLiteral, TemplateResource } from '../parser/template';
import { ResourceTag } from '../parser/template/tags';
import {
  resolveStaticMethodCallExpression,
  StaticMethodCallExpression,
} from './callables';
import { isExpressionShaped, TypedTemplateExpression } from './expression';
import { resolveExpressionType } from './resolve';

export type ResourceLike = CfnResource | CdkConstruct | LazyResource;

interface BaseConstruct {
  readonly logicalId: string;
  readonly namespace?: string;
  readonly fqn: string;
  readonly tags: ResourceTag[];
  readonly dependsOn: string[];
}
export interface CfnResource extends BaseConstruct {
  readonly type: 'resource';
  readonly props: TypedTemplateExpression;
}

export interface CdkConstruct extends BaseConstruct {
  readonly type: 'construct';
  readonly props: TypedTemplateExpression;
  readonly overrides: any;
}

export interface LazyResource extends BaseConstruct {
  readonly type: 'lazyResource';
  readonly call: StaticMethodCallExpression;
  readonly overrides: any;
}

export function isCdkConstructExpression(x: unknown): x is CdkConstruct {
  return isExpressionShaped(x) && x.type === 'construct';
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

  if (Object.keys(resource.call.fields).length > 0) {
    // @todo type inference
    return {
      type: 'lazyResource',
      logicalId,
      namespace: type.namespace,
      fqn: type.fqn,
      tags: resource.tags,
      dependsOn: Array.from(resource.dependsOn),
      overrides: resource.overrides,
      call: resolveStaticMethodCallExpression(resource.call, type),
    };
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
    dependsOn: Array.from(resource.dependsOn),
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
    dependsOn: Array.from(resource.dependsOn),
    overrides: resource.overrides,
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
