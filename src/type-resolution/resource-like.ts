import * as reflect from 'jsii-reflect';
import {
  ObjectLiteral,
  RetentionPolicy,
  TemplateResource,
} from '../parser/template';
import { FactoryMethodCall } from '../parser/template/calls';
import { ResourceTag } from '../parser/template/tags';
import {
  InstanceMethodCallExpression,
  resolveInstanceMethodCallExpression,
  resolveStaticMethodCallExpression,
  StaticMethodCallExpression,
} from './callables';
import { isExpressionShaped, TypedTemplateExpression } from './expression';
import { resolveExpressionType, TypeResolutionContext } from './resolve';

export type ResourceLike =
  | CfnResource
  | CdkConstruct
  | CdkObject
  | LazyResource;

interface BaseResourceLike {
  readonly logicalId: string;
  readonly namespace?: string;
  readonly tags: ResourceTag[];
  readonly dependsOn: string[];
}
export interface CfnResource extends BaseResourceLike {
  readonly fqn: string;
  readonly type: 'resource';
  readonly cfnType: string;
  readonly props: TypedTemplateExpression;
  readonly creationPolicy?: TypedTemplateExpression;
  readonly deletionPolicy?: RetentionPolicy;
  readonly updateReplacePolicy?: RetentionPolicy;
  readonly updatePolicy?: TypedTemplateExpression;
  readonly metadata?: Record<string, unknown>;
}

export interface CdkConstruct extends BaseResourceLike {
  readonly fqn: string;
  readonly type: 'construct';
  readonly props: TypedTemplateExpression;
  readonly overrides: any;
}
export interface CdkObject extends BaseResourceLike {
  readonly fqn: string;
  readonly type: 'cdkObject';
  readonly props: TypedTemplateExpression;
}

export interface LazyResource extends BaseResourceLike {
  readonly type: 'lazyResource';
  readonly call: StaticMethodCallExpression | InstanceMethodCallExpression;
  readonly overrides: any;
}

export function isCdkConstructExpression(x: unknown): x is CdkConstruct {
  return isExpressionShaped(x) && x.type === 'construct';
}

export function resolveResourceLike(
  logicalId: string,
  resource: TemplateResource,
  ctx: TypeResolutionContext
): ResourceLike {
  const { typeSystem } = ctx;

  if (isCfnResource(resource)) {
    const type = ctx.typeSystem.findClass('aws-cdk-lib.CfnResource');
    return resolveCfnResource(logicalId, resource, type);
  }

  if (isLazyResource(resource)) {
    return replaceLogicalIds(resolveLazyResource(logicalId, resource, ctx));
  }

  if (resource.type) {
    const type = typeSystem.findFqn(resource.type);

    if (isConstruct(type)) {
      return replaceLogicalIds(resolveCdkConstruct(logicalId, resource, type));
    }

    if (isCdkObject(type)) {
      return resolveCdkObject(logicalId, resource, type);
    }
  }

  throw new TypeError(
    `Expected Cloudformation resource or CDK type, got ${resource.type}`
  );
}

function isLazyResource(
  resource: TemplateResource
): resource is TemplateResource & Required<Pick<TemplateResource, 'call'>> {
  return resource.call != null;
}

/**
 * Replaces the values of 'lazyLogicalId' occurrences (if any) with the path to
 * the attribute that contains it. For instance:
 *
 * Resources:
 *   Function:
 *     Type: aws-cdk-lib.aws_lambda.Function
 *     Properties:
 *       runtime: NODEJS_16_X
 *       handler: 'index.handler'
 *       code:
 *         'aws-cdk-lib.aws_lambda.Code.fromInline': 'foo'
 *       deadLetterQueue:
 *         'aws-cdk-lib.aws_sqs.Queue.fromQueueArn': 'arn:aws:sqs:us-east-2:444455556666:queue1'
 *
 * fromQueueArn has three parameters: scope, id and arn. Only the third argument
 * to this call is being passed explicitly. The other two are injected into the
 * AST, since they can be inferred from the context. In particular, the second
 * argument is a lazyLogicalId. This function will replace its value with the
 * string 'Function.deadLetterQueue'.
 *
 * @param x the template expression.
 * @param path the path prefix.
 */
function replaceLogicalIds<X extends TypedTemplateExpression>(
  x: X,
  path: string[] = []
): X {
  switch (x.type) {
    case 'lazyResource':
      return {
        ...x,
        call: replaceLogicalIds(x.call, [x.logicalId]),
      };
    case 'construct':
      return {
        ...x,
        props: replaceLogicalIds(x.props, [x.logicalId]),
      };
    case 'object':
    case 'struct':
      return {
        ...x,
        fields: Object.fromEntries(
          Object.entries(x.fields).map(([k, v]) => [
            k,
            replaceLogicalIds(v, path.concat(k)),
          ])
        ),
      };
    case 'array':
      return {
        ...x,
        array: x.array.map((v, idx) =>
          replaceLogicalIds(v, path.concat(String(idx)))
        ),
      };
    case 'staticMethodCall':
      const array = x.args.array.map((expr) =>
        expr.type === 'intrinsic' && expr.fn === 'lazyLogicalId'
          ? { ...expr, value: path.join('.') }
          : expr
      );
      return { ...x, args: { ...x.args, array } };
    default:
      return x;
  }
}

function resolveLazyResource(
  logicalId: string,
  resource: TemplateResource & Required<Pick<TemplateResource, 'call'>>,
  ctx: TypeResolutionContext
): LazyResource {
  const type = ctx.typeSystem.tryFindFqn(resource.type ?? '');

  const call = isInstanceMethodCall(resource.call)
    ? resolveInstanceMethodCallExpression(resource.call, ctx, type)
    : resolveStaticMethodCallExpression(resource.call, ctx.typeSystem, type);

  return {
    type: 'lazyResource',
    logicalId,
    namespace: type?.namespace,
    tags: resource.tags,
    dependsOn: Array.from(resource.dependsOn),
    overrides: resource.overrides,
    call,
  };
}

function resolveCfnResource(
  logicalId: string,
  resource: TemplateResource,
  type: reflect.ClassType
): CfnResource {
  const propsExpressions: ObjectLiteral = {
    type: 'object',
    fields: {
      type: {
        type: 'string',
        value: resource.type!,
      },
      properties: {
        type: 'object',
        fields: resource.properties,
      },
    },
  };

  return {
    type: 'resource',
    cfnType: resource.type!,
    logicalId,
    namespace: type.namespace,
    fqn: type.fqn,
    tags: resource.tags,
    dependsOn: Array.from(resource.dependsOn),
    props: resolveExpressionType(
      propsExpressions,
      type.system.findFqn('aws-cdk-lib.CfnResourceProps').reference
    ),
    creationPolicy: resource.creationPolicy,
    updatePolicy: resource.updatePolicy,
    metadata: resource.metadata,
    deletionPolicy: resource.deletionPolicy,
    updateReplacePolicy: resource.updateReplacePolicy,
  };
}

function resolveCdkConstruct(
  logicalId: string,
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

function resolveCdkObject(
  logicalId: string,
  resource: TemplateResource,
  type: reflect.ClassType
): CdkObject {
  const [propsParam] = type.initializer?.parameters ?? [];

  const propsExpressions: ObjectLiteral = {
    type: 'object',
    fields: resource.properties,
  };

  return {
    type: 'cdkObject',
    logicalId,
    namespace: type.namespace,
    fqn: type.fqn,
    tags: resource.tags,
    dependsOn: Array.from(resource.dependsOn),
    props: propsParam
      ? resolveExpressionType(propsExpressions, propsParam.type)
      : { type: 'void' },
  };
}

function isInstanceMethodCall(
  c: FactoryMethodCall
): c is Required<FactoryMethodCall> {
  return c.target != null;
}

export function isCfnResource(resource: TemplateResource) {
  return resource.type?.includes('::') ?? false;
}

export function isConstruct(type?: reflect.Type): type is reflect.ClassType {
  if (type && type.isClassType()) {
    const constructClass = type.system.findFqn('constructs.Construct');
    return type.extends(constructClass);
  }

  return false;
}

export function isCdkObject(type?: reflect.Type): type is reflect.ClassType {
  if (!type?.isClassType()) {
    return false;
  }

  const initializer = type.initializer;
  return (
    !type.abstract &&
    !isConstruct(type) &&
    !!initializer &&
    initializer.parameters.length <= 1 &&
    initializer?.parameters[0]?.variadic !== true
  );
}
