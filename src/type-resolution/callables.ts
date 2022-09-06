import * as reflect from 'jsii-reflect';
import { enumLikeClassMethods, isDataType } from '../jsii2schema';
import { assertExactlyOneOfFields } from '../parser/private/types';
import { ObjectLiteral } from '../parser/template';
import {
  assertExpressionType,
  TypedArrayExpression,
  TypedTemplateExpression,
} from './expression';
import { resolveExpressionType } from './resolve';

export interface StaticMethodCallExpression {
  readonly type: 'staticMethodCall';
  readonly fqn: string;
  readonly namespace?: string;
  readonly method: string;
  readonly args: TypedArrayExpression;
}

export function resolveStaticMethodCallExpression(
  x: ObjectLiteral,
  type: reflect.ClassType
): StaticMethodCallExpression {
  const methods = enumLikeClassMethods(type);
  const methodNames = methods.map((m) => m.name);

  const methodName = assertExactlyOneOfFields(x.fields, methodNames);
  const method = methods.find((m) => m.name === methodName)!;

  const parameters = assertExpressionType(x.fields[methodName], 'object');
  const args = resolveCallableParameters(parameters, method);

  return {
    type: 'staticMethodCall',
    fqn: type.fqn,
    namespace: type.namespace,
    method: methodName,
    args,
  };
}

export interface InitializerExpression {
  readonly type: 'initializer';
  readonly fqn: string;
  readonly namespace?: string;
  readonly args: TypedArrayExpression;
}

export function resolveInitializerExpression(
  x: ObjectLiteral,
  type: reflect.InterfaceType
): InitializerExpression {
  const allSubClasses = type.system.classes.filter((i) => i.extends(type));

  const selectedSubClassFQN = assertExactlyOneOfFields(
    x.fields,
    allSubClasses.map((s) => s.fqn)
  );
  const selectedSubClass = type.system.findClass(selectedSubClassFQN);
  const initializer = assertInitializer(selectedSubClass);

  const parameters = assertExpressionType(
    x.fields[selectedSubClassFQN],
    'object'
  );
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

    if (!p.optional && x.fields[p.name] === undefined) {
      throw new TypeError(
        `Expected required parameter '${p.name}' for ${callable.parentType.fqn}.${callable.name}`
      );
    }

    args.push(resolveExpressionType(x.fields[p.name], p.type));
  }

  return {
    type: 'array',
    array: args,
  };
}
