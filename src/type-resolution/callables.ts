import * as reflect from 'jsii-reflect';
import { TypeReference, TypeSystem } from 'jsii-reflect';
import {
  assertExactlyOneOfFields,
  assertOneField,
} from '../parser/private/types';
import { ObjectLiteral, Template, TemplateResource } from '../parser/template';
import { enumLikeClassMethods, isDataType } from '../schema';
import { splitPath } from '../strings';
import {
  assertExpressionType,
  TypedArrayExpression,
  TypedTemplateExpression,
} from './expression';
import { resolveExpressionType } from './resolve';
import { isCfnResource } from './resource-like';
import { assertImplements } from './types';

export interface StaticMethodCallExpression {
  readonly type: 'staticMethodCall';
  readonly fqn: string;
  readonly namespace?: string;
  readonly method: string;
  readonly args: TypedArrayExpression;
}

export interface InstanceMethodCallExpression {
  readonly type: 'instanceMethodCall';
  readonly logicalId: string;
  readonly method: string;
  readonly args: TypedArrayExpression;
}

interface MethodCall {
  readonly method: reflect.Method;
  readonly args: TypedArrayExpression;
}

interface InstanceMethodCall extends MethodCall {
  readonly logicalId: string;
  readonly methodPath: string;
}

function methodFQN(method: reflect.Method): string {
  return `${method.parentType.fqn}.${method.name}`;
}

export function resolveStaticMethodCallExpression(
  call: ObjectLiteral,
  typeSystem: reflect.TypeSystem,
  resultType?: reflect.Type
): StaticMethodCallExpression {
  const { method, args } = inferMethodCall(typeSystem, call);

  if (resultType) {
    assertImplements(method.returns.type, resultType);
  }

  return {
    type: 'staticMethodCall',
    fqn: method.parentType.fqn,
    namespace: method.parentType.namespace,
    method: method.name,
    args,
  };
}

export function resolveInstanceMethodCallExpression(
  template: Template,
  resource: TemplateResource,
  typeSystem: reflect.TypeSystem,
  resultType?: reflect.Type
): InstanceMethodCallExpression {
  const { logicalId, method, methodPath, args } = inferInstanceMethodCall(
    typeSystem,
    template,
    resource
  );

  if (resultType) {
    assertImplements(method.returns.type, resultType);
  }

  return {
    type: 'instanceMethodCall',
    logicalId,
    method: methodPath,
    args,
  };
}

function inferMethodCall(
  typeSystem: reflect.TypeSystem,
  call: ObjectLiteral
): MethodCall {
  const candidateFQN = assertFullyQualifiedStaticMethodCall(call);
  const candidateClass = typeSystem.findClass(candidateFQN);
  const methods = enumLikeClassMethods(candidateClass);
  const methodNames = methods.map(methodFQN);
  const methodName = assertExactlyOneOfFields(call.fields, methodNames);
  const method = methods.find((m) => methodFQN(m) === methodName)!;
  const parameters = assertExpressionType(call.fields[methodName], 'object');
  const args = resolveCallableParameters(parameters, method);

  return {
    method,
    args,
  };
}

function inferInstanceMethodCall(
  typeSystem: TypeSystem,
  template: Template,
  resource: TemplateResource
): InstanceMethodCall {
  const logicalId = resource.on!;
  const factory = template.resource(logicalId);
  if (isCfnResource(factory)) {
    throw new Error(
      `${factory.type} is a CloudFormation resource. Method calls are not allowed.`
    );
  }

  const { method, path } = inferMethod(inferType(factory), resource.call);
  const parameters = assertExpressionType(resource.call.fields[path], 'object');
  const args = resolveCallableParameters(parameters, method);

  return {
    logicalId,
    methodPath: path,
    method,
    args,
  };

  function inferType(res: TemplateResource): TypeReference {
    if (res.type) {
      return typeSystem.findFqn(res.type).reference;
    }

    if (res.on) {
      const typeReference = inferType(template.resource(res.on));
      const m = inferMethod(typeReference, res.call);
      return m.method.returns.type;
    }

    if (Object.keys(res.call.fields).length > 0) {
      const methodCall = inferMethodCall(typeSystem, res.call);
      return methodCall.method.returns.type;
    }

    throw new Error(
      `The type of ${logicalId} could not be inferred. Please provide the type explicitly.`
    );
  }

  function inferMethod(
    typeRef: reflect.TypeReference,
    call: ObjectLiteral
  ): { method: reflect.Method; path: string } {
    const methodPath = assertOneField(call.fields);
    const [constructPath, methodName] = splitPath(methodPath);
    const candidateType = resolveTypeFromPath(typeRef.type, constructPath);
    const methods = candidateType.allMethods.filter((m) => !m.static);
    const methodNames = methods.map((m) => m.name);

    if (!methodNames.includes(methodName)) {
      throw new Error(
        `'${candidateType.fqn}' has no method called '${methodPath}'`
      );
    }

    return {
      method: methods.find((m) => m.name === methodName)!,
      path: methodPath,
    };
  }
}

function resolveTypeFromPath(
  type: reflect.Type | undefined,
  path: string[]
): reflect.ReferenceType {
  const result = path.reduce((t, name) => {
    const property = assertReferenceType(t).allProperties.find(
      (p) => p.name === name
    );
    if (!property) {
      throw new Error(`Invalid construct path '${path}'.`);
    }
    return property.type.type;
  }, type);

  return assertReferenceType(result);
}

function assertFullyQualifiedStaticMethodCall(x: ObjectLiteral): string {
  const fqn = assertOneField(x.fields);
  const lastIndex = fqn.lastIndexOf('.');
  if (lastIndex <= 0 || lastIndex >= fqn.length) {
    throw new TypeError(`Expected static method call FQN, got: ${fqn}`);
  }

  return fqn.slice(0, lastIndex);
}

export interface InitializerExpression {
  readonly type: 'initializer';
  readonly fqn: string;
  readonly namespace?: string;
  readonly args: TypedArrayExpression;
}

export function resolveInstanceExpression(
  x: ObjectLiteral,
  type: reflect.InterfaceType
): InitializerExpression | StaticMethodCallExpression {
  const allSubClasses = type.system.classes.filter((i) => i.extends(type));

  const candidateFQN = assertOneField(x.fields);
  const candidateClass = type.system.tryFindFqn(candidateFQN);

  // Cannot find a class for the fqn, try a static method call instead
  if (!candidateClass) {
    return resolveStaticMethodCallExpression(x, type.system, type);
  }

  const selectedSubClassFQN = assertExactlyOneOfFields(
    x.fields,
    allSubClasses.map((s) => s.fqn)
  );
  const selectedSubClass = candidateClass;

  const parameters = assertExpressionType(
    x.fields[selectedSubClassFQN],
    'object'
  );

  const initializer = assertInitializer(selectedSubClass);
  const args = resolveCallableParameters(parameters, initializer);

  return {
    type: 'initializer',
    fqn: selectedSubClass.fqn,
    namespace: selectedSubClass.namespace,
    args,
  };
}

export function assertInitializer(type: reflect.Type): reflect.Initializer {
  if (!type.isClassType() || !type.initializer) {
    throw new TypeError(`Expected Class Initializer, got ${type.toString()}`);
  }

  return type.initializer;
}

export function resolveCallableParameters(
  x: ObjectLiteral,
  callable: reflect.Callable
): TypedArrayExpression {
  const args: TypedTemplateExpression[] = [];

  for (let i = 0; i < callable.parameters.length; ++i) {
    const p = callable.parameters[i];

    // kwargs: if this is the last argument and a data type, flatten (treat as keyword args)
    // we pass in all parameters as the value, and the positional arguments will be ignored since
    // we are promised there are no conflicts
    if (i === callable.parameters.length - 1 && isDataType(p.type.type)) {
      args.push(resolveExpressionType(x, p.type));
      continue;
    }

    if (x.fields[p.name] === undefined) {
      if (!p.optional) {
        throw new TypeError(
          `Expected required parameter '${p.name}' for ${callable.parentType.fqn}.${callable.name}`
        );
      }
      args.push({ type: 'void' });
      continue;
    }

    args.push(resolveExpressionType(x.fields[p.name], p.type));
  }

  return {
    type: 'array',
    array: args,
  };
}

function assertReferenceType(
  t: reflect.Type | undefined
): reflect.ReferenceType {
  if (!t || !(t.isClassType() || t.isInterfaceType())) {
    throw new Error(`Construct paths must only contain classes or interfaces.`);
  }
  return t;
}
