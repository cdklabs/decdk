import * as cdk from 'aws-cdk-lib';
import { Fn } from 'aws-cdk-lib';
import { CfnInclude } from 'aws-cdk-lib/cloudformation-include';
import * as reflect from 'jsii-reflect';
import {
  isConstruct,
  isDataType,
  isEnumLikeClass,
  isSerializableInterface,
  SchemaContext,
  schemaForPolymorphic,
} from './jsii2schema';
import {
  IntrinsicExpression,
  ObjectLiteral,
  StringLiteral,
  TemplateExpression,
} from './parser/template';

export function resolveType(fqn: string) {
  const [mod, ...className] = fqn.split('.');
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const module = require(mod);

  let curr = module;
  while (true) {
    const next = className.shift();
    if (!next) {
      break;
    }
    curr = curr[next];
    if (!curr) {
      throw new Error(`unable to resolve class ${className}`);
    }
  }

  return curr;
}

export interface ParsedIntrinsic {
  readonly name: string;
  readonly value: any;
}

/**
 * Parse an intrinsic into its name and its value.
 *
 * Returns `undefined` if the passed value does not look like an intrinsic.
 *
 * @example
 * ```
 * const parsed = tryParseIntrinsic({ "Fn::GetAtt": ["MyLambda", "Arn"] });
 * parsed.name === "Fn::GetAtt";
 * parsed.value === ["MyLambda", "Arn"]
 * ```
 */
export function tryParseIntrinsic(
  input: TemplateExpression
): IntrinsicExpression | undefined {
  if (input.type !== 'intrinsic') {
    return undefined;
  }

  return input;
}

export function tryResolveRef(value: TemplateExpression) {
  const intrinsic = tryParseIntrinsic(value);
  if (!intrinsic || intrinsic.fn !== 'ref') {
    return undefined;
  }

  return intrinsic.logicalId;
}

export function tryResolveGetAtt(
  value: TemplateExpression
): [string, TemplateExpression] | undefined {
  const intrinsic = tryParseIntrinsic(value);
  if (!intrinsic || intrinsic.fn !== 'getAtt') {
    return undefined;
  }

  return [intrinsic.logicalId, intrinsic.attribute];
}

export interface DeconstructCommonOptions {
  readonly stack: cdk.Stack;
  readonly typeRef: reflect.TypeReference;
  readonly key: string;
  readonly value: TemplateExpression;
}

export interface DeconstructValueOptions extends DeconstructCommonOptions {
  readonly optional: boolean;
}

export function deconstructValue(options: DeconstructValueOptions): any {
  const { typeRef, optional, key, value } = options;
  // console.error('====== deserializer ===================');
  // console.error(`type: ${typeRef}`);
  // console.error(`value: ${JSON.stringify(value, undefined, 2)}`);
  // console.error('~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~`');

  if (value === undefined) {
    if (optional) {
      return undefined;
    }

    throw new Error(`Missing required value for ${key} in ${typeRef}`);
  }

  const arr = deconstructArray(options);
  if (arr) {
    return arr;
  }

  const ref = deconstructRef(options);
  if (ref) {
    return ref;
  }

  const getAtt = deconstructGetAtt(options);
  if (getAtt) {
    return getAtt;
  }

  const map = deconstructMap(options);
  if (map) {
    return map;
  }

  const union = deconstructUnion(options);
  if (union) {
    return union;
  }

  const enm = deconstructEnum(options);
  if (enm) {
    return enm;
  }

  // if this is an interface, deserialize each property
  const ifc = deconstructInterface(options);
  if (ifc) {
    return ifc;
  }

  const primitive = deconstructPrimitive(options);
  if (primitive) {
    return primitive;
  }

  const enumLike = deconstructEnumLike(options);
  if (enumLike) {
    return enumLike;
  }

  const asType = deconstructType(options);
  if (asType) {
    return asType;
  }

  const asAny = deconstructAny(options);
  if (asAny) {
    return asAny;
  }

  throw new Error(
    `Unable to deconstruct "${JSON.stringify(value)}" for type ref ${typeRef}`
  );
}

export function deconstructPrimitive(options: DeconstructCommonOptions) {
  const { typeRef, value } = options;

  if (typeRef.primitive !== value.type || !('value' in value)) {
    return undefined;
  }

  return value.value;
}

export function deconstructAny(options: DeconstructCommonOptions) {
  const { stack, typeRef, key, value } = options;

  if (!typeRef.isAny) {
    return undefined;
  }

  switch (value.type) {
    case 'object':
      const out: Record<string, any> = {};
      for (const [k, v] of Object.entries(value.fields)) {
        out[k] = deconstructValue({
          stack,
          typeRef: typeRef,
          optional: false,
          key: `${key}.${k}`,
          value: v,
        });
      }
      return out;
    case 'string':
      return deconstructPrimitive({
        stack,
        typeRef: new reflect.TypeReference(typeRef.system, {
          primitive: 'string' as any,
        }),
        key,
        value,
      });
    case 'array':
      return deconstructArray({
        stack,
        typeRef: new reflect.TypeReference(typeRef.system, {
          primitive: 'any' as any,
        }),
        key,
        value,
      });
    default:
      return undefined;
  }
}

// special
export function deconstructRef(options: DeconstructCommonOptions) {
  const { stack, typeRef, value } = options;

  const asRef = tryResolveRef(value);

  if (!asRef) {
    return undefined;
  }

  if (isConstruct(typeRef)) {
    return findConstruct(stack, asRef);
  }

  if (typeRef.isAny || typeRef.primitive === 'string') {
    return Fn.ref(asRef);
  }

  throw new Error(
    `{ Ref } can only be used when a construct type is expected and this is ${typeRef}. ` +
      'Use { Fn::GetAtt } to represent specific resource attributes'
  );
}

export function deconstructArray(options: DeconstructCommonOptions) {
  const { stack, typeRef, key, value } = options;

  if (!typeRef.arrayOfType) {
    return undefined;
  }

  if (value.type !== 'array' || !Array.isArray(value.array)) {
    throw new Error(`Expecting array for ${key} in ${typeRef}`);
  }

  return value.array.map((x, i) =>
    deconstructValue({
      stack,
      typeRef: typeRef.arrayOfType!,
      optional: false,
      key: `${key}[${i}]`,
      value: x,
    })
  );
}

export function deconstructMap(options: DeconstructCommonOptions) {
  const { stack, typeRef, key, value } = options;

  if (!typeRef.mapOfType) {
    return undefined;
  }

  if (value.type !== 'object') {
    throw new ValidationError(`Expecting object for ${key} in ${typeRef}`);
  }

  const out: Record<string, any> = {};
  for (const [k, v] of Object.entries(value.fields)) {
    out[k] = deconstructValue({
      stack,
      typeRef: typeRef.mapOfType,
      optional: false,
      key: `${key}.${k}`,
      value: v,
    });
  }

  return out;
}

export function deconstructUnion(options: DeconstructCommonOptions) {
  const { stack, typeRef, key, value } = options;

  if (!typeRef.unionOfTypes) {
    return undefined;
  }

  const errors = new Array<any>();
  for (const x of typeRef.unionOfTypes) {
    try {
      return deconstructValue({
        stack,
        typeRef: x,
        optional: false,
        key,
        value,
      });
    } catch (e) {
      if (!(e instanceof ValidationError)) {
        throw e;
      }
      errors.push(e);
      continue;
    }
  }

  throw new ValidationError(
    `Failed to deserialize union. Errors: \n  ${errors
      .map((e) => e.message)
      .join('\n  ')}`
  );
}

export function deconstructEnum(options: DeconstructCommonOptions) {
  const { typeRef, value } = options;

  if (!(typeRef.type instanceof reflect.EnumType)) {
    return undefined;
  }

  if (value.type !== 'string' || typeof value.value !== 'string') {
    throw new Error(
      `Enum choice must be a string literal, found ${JSON.stringify(value)}.`
    );
  }

  const enumChoice = value.value.toUpperCase();
  const enumType = resolveType(typeRef.type.fqn);

  if (!(enumChoice in enumType)) {
    throw new Error(
      `Could not find enum choice ${enumChoice} for enum type ${
        typeRef.type.fqn
      }. Available options: [${Object.keys(enumType).join(', ')}]`
    );
  }

  return enumType[enumChoice];
}

export function deconstructInterface(options: DeconstructCommonOptions) {
  const { stack, typeRef, key, value } = options;

  if (!isSerializableInterface(typeRef.type)) {
    return undefined;
  }

  const out: any = {};
  for (const prop of typeRef.type.allProperties) {
    // @todo
    const propValue = (value as ObjectLiteral)?.fields?.[prop.name];
    if (propValue === undefined) {
      if (!prop.optional) {
        throw new ValidationError(
          `Missing required property ${key}.${prop.name} in ${typeRef}`
        );
      }
      continue;
    }

    out[prop.name] = deconstructValue({
      stack,
      typeRef: prop.type,
      optional: prop.optional,
      key: `${key}.${prop.name}`,
      value: propValue,
    });
  }

  return out;
}

export function deconstructEnumLike(options: DeconstructCommonOptions) {
  const { stack, typeRef, value } = options;

  if (!isEnumLikeClass(typeRef.type)) {
    return undefined;
  }

  function deconstructStaticProperty(tr: reflect.ClassType, v: string) {
    const typeClass = resolveType(tr.fqn);
    return typeClass[v];
  }

  function deconstructStaticMethod(
    s: cdk.Stack,
    tr: reflect.ClassType,
    v: ObjectLiteral
  ) {
    const methods = tr.allMethods.filter((m) => m.static);
    const members = methods.map((x) => x.name);

    if (v.type === 'object') {
      const entries: Array<[string, any]> = Object.entries(v.fields);
      if (entries.length !== 1) {
        throw new Error(
          `Value for enum-like class ${
            tr.fqn
          } must be an object with a single key (one of: ${members.join(',')})`
        );
      }

      const [methodName, args] = entries[0];
      const method = methods.find((m) => m.name === methodName);
      if (!method) {
        throw new Error(
          `Invalid member "${methodName}" for enum-like class ${
            tr.fqn
          }. Options: ${members.join(',')}`
        );
      }

      if (args.type !== 'object') {
        throw new Error(
          `Expecting enum-like member ${methodName} to be an object for enum-like class ${typeRef.fqn}`
        );
      }

      return invokeMethod(s, method, args);
    }
  }

  // if the value is a string, we deconstruct it as a static property
  if (value.type === 'string') {
    return deconstructStaticProperty(typeRef.type, value.value);
  }

  // if the value is an object, we deconstruct it as a static method
  if (value.type === 'object') {
    return deconstructStaticMethod(stack, typeRef.type, value);
  }

  throw new Error(
    `Invalid value for enum-like class ${typeRef.fqn}: ${JSON.stringify(value)}`
  );
}

export function deconstructType(options: DeconstructCommonOptions) {
  const { stack, typeRef, value } = options;

  const schemaDefs: any = {};
  const ctx = SchemaContext.root(schemaDefs);
  const schemaRef = schemaForPolymorphic(typeRef.type, ctx);
  if (!schemaRef) {
    return undefined;
  }

  const def = findDefinition(schemaDefs, schemaRef.$ref);

  // @todo
  if (value.type !== 'object' || Object.keys(value.fields).length !== 1) {
    throw new ValidationError(
      `Cannot parse class type ${typeRef} with value ${value}`
    );
  }
  const keys = Object.keys(value.fields);
  const className = keys[0];

  // now we need to check if it's an enum or a normal class
  const schema = def.anyOf.find(
    (x: any) => x.properties && x.properties[className]
  );
  if (!schema) {
    throw new ValidationError(`Cannot find schema for ${className}`);
  }

  const def2 = findDefinition(schemaDefs, schema.properties[className].$ref);
  const methodFqn = def2.comment;

  const parts = methodFqn.split('.');
  const last = parts[parts.length - 1];
  if (last !== '<initializer>') {
    throw new Error('Expecting an initializer');
  }

  const classFqn = parts.slice(0, parts.length - 1).join('.');
  const method = typeRef.system.findClass(classFqn).initializer;
  if (!method) {
    throw new Error(`Cannot find the initializer for ${classFqn}`);
  }

  // @todo
  return invokeMethod(stack, method, value.fields[className] as ObjectLiteral);
}

export function findDefinition(defs: any, $ref: string) {
  const k = $ref.split('/').slice(2).join('/');
  return defs[k];
}

export function invokeMethod(
  stack: cdk.Stack,
  method: reflect.Callable,
  parameters: ObjectLiteral
) {
  const typeClass = resolveType(method.parentType.fqn);
  const args = new Array<any>();

  for (let i = 0; i < method.parameters.length; ++i) {
    const p = method.parameters[i];

    // kwargs: if this is the last argument and a data type, flatten (treat as keyword args)
    if (i === method.parameters.length - 1 && isDataType(p.type.type)) {
      // we pass in all parameters are the value, and the positional arguments will be ignored since
      // we are promised there are no conflicts
      const kwargs = deconstructValue({
        stack,
        typeRef: p.type,
        optional: p.optional,
        key: p.name,
        value: parameters,
      });
      args.push(kwargs);
    } else {
      const value = parameters.fields[p.name];
      if (value === undefined && !p.optional) {
        throw new Error(
          `Missing required parameter '${p.name}' for ${method.parentType.fqn}.${method.name}`
        );
      }

      if (value !== undefined) {
        args.push(
          deconstructValue({
            stack,
            typeRef: p.type,
            optional: p.optional,
            key: p.name,
            value,
          })
        );
      }
    }
  }

  if (reflect.Initializer.isInitializer(method)) {
    return new typeClass(...args);
  }

  const methodFn: (...s: any[]) => any = typeClass[method.name];
  if (!methodFn) {
    throw new Error(
      `Cannot find method named ${method.name} in ${typeClass.fqn}`
    );
  }

  return methodFn.apply(typeClass, args);
}

// special
export function deconstructGetAtt(options: DeconstructCommonOptions) {
  const { stack, typeRef, key, value } = options;

  const getAtt = tryResolveGetAtt(value);
  if (getAtt) {
    const [logical, attr] = getAtt;

    if (isConstruct(typeRef)) {
      const obj: any = findConstruct(stack, logical);
      return obj[(attr as StringLiteral).value];
    }

    if (typeRef.primitive === 'string') {
      // return a lazy value, so we only try to find after all constructs
      // have been added to the stack.
      return produceLazyGetAtt(stack, logical, attr);
    }

    throw new Error(
      `Fn::GetAtt can only be used for string primitives and ${key} is ${typeRef}`
    );
  }
}

/**
 * Returns a lazy string that includes a deconstructed Fn::GetAtt to a certain
 * resource or construct.
 *
 * If `id` points to a CDK construct, the resolved value will be the value returned by
 * the property `attribute`. If `id` points to a "raw" resource, the resolved value will be
 * an `Fn::GetAtt`.
 */
export function produceLazyGetAtt(
  stack: cdk.Stack,
  id: string,
  attribute: TemplateExpression
) {
  return cdk.Lazy.string({
    produce: () => {
      const res = stack.node.tryFindChild(id);
      if (!res) {
        const include = stack.node.tryFindChild('Include') as CfnInclude;
        if (!include) {
          throw new Error(
            'Unexpected - "Include" should be in the stack at this point'
          );
        }

        const raw = include.getResource(id);
        if (!raw) {
          throw new Error(`Unable to find a resource ${id}`);
        }

        // just leak
        return { 'Fn::GetAtt': [id, attribute] };
      }
      return (res as any)[(attribute as StringLiteral).value];
    },
  });
}

export function findConstruct(stack: cdk.Stack, id: string) {
  const child = stack.node.tryFindChild(id);
  if (!child) {
    throw new Error(
      `Construct with ID ${id} not found (it must be defined before it is referenced)`
    );
  }
  return child;
}

export function isCfnResourceType(resourceType: string) {
  return resourceType.includes('::');
}

export class ValidationError extends Error {}
