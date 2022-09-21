import * as reflect from 'jsii-reflect';
import {
  assertExactlyOneOfFields,
  assertOneField,
} from '../parser/private/types';
import { ObjectLiteral, Template, TemplateResource } from '../parser/template';
import { enumLikeClassMethods, isDataType } from '../schema';
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

function methodFQN(method: reflect.Method): string {
  return `${method.parentType.fqn}.${method.name}`;
}

export function resolveStaticMethodCallExpression(
  x: ObjectLiteral,
  typeSystem: reflect.TypeSystem,
  resultType?: reflect.Type
): StaticMethodCallExpression {
  const candidateFQN = assertFullyQualifiedStaticMethodCall(x);
  const candidateClass = typeSystem.findClass(candidateFQN);

  const methods = enumLikeClassMethods(candidateClass);
  const methodNames = methods.map(methodFQN);

  const methodName = assertExactlyOneOfFields(x.fields, methodNames);
  const method = methods.find((m) => methodFQN(m) === methodName)!;

  if (resultType) {
    assertImplements(method.returns.type, resultType);
  }

  const parameters = assertExpressionType(x.fields[methodName], 'object');
  const args = resolveCallableParameters(parameters, method);

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
  const call = resource.call;
  const logicalId = resource.on!;
  const factory = template.resource(logicalId);

  if (isCfnResource(factory)) {
    throw new Error(
      `${factory.type} is a CloudFormation resource. Method calls are not allowed.`
    );
  }

  if (!factory.type) {
    throw new Error('TODO'); //TODO
  }

  const candidateClass = typeSystem.findClass(factory.type);
  const methods = candidateClass.allMethods.filter((m) => !m.static);
  const methodNames = methods.map((method) => method.name);
  const methodName = assertOneField(call.fields);

  if (!methodNames.includes(methodName)) {
    throw new Error(
      `'${candidateClass.fqn}' has no method called '${methodName}'`
    );
  }

  const method = methods.find((m) => m.name === methodName)!;

  if (resultType) {
    assertImplements(method.returns.type, resultType);
  }

  const parameters = assertExpressionType(call.fields[methodName], 'object');
  const args = resolveCallableParameters(parameters, method);

  return {
    type: 'instanceMethodCall',
    logicalId,
    method: methodName,
    args,
  };
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
