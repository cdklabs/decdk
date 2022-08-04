import { mkdtempSync, writeFileSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';
import * as cdk from 'aws-cdk-lib';
import { CfnInclude } from 'aws-cdk-lib/cloudformation-include';
import { Construct } from 'constructs';
import * as reflect from 'jsii-reflect';
import * as jsonschema from 'jsonschema';
import { renderFullSchema } from './cdk-schema';
import {
  isConstruct,
  isDataType,
  isEnumLikeClass,
  isSerializableInterface,
  SchemaContext,
  schemaForPolymorphic,
} from './jsii2schema';

export interface DeclarativeStackProps extends cdk.StackProps {
  typeSystem: reflect.TypeSystem;
  template: any;
  workingDirectory?: string;
}

export class DeclarativeStack extends cdk.Stack {
  constructor(scope: cdk.App, id: string, props: DeclarativeStackProps) {
    super(scope, id, {
      env: {
        account:
          process.env.CDK_DEPLOY_ACCOUNT || process.env.CDK_DEFAULT_ACCOUNT,
        region: process.env.CDK_DEPLOY_REGION || process.env.CDK_DEFAULT_REGION,
      },
    });

    const typeSystem = props.typeSystem;
    const template = props.template;

    const schema = renderFullSchema(typeSystem);

    const result = jsonschema.validate(template, schema);
    if (!result.valid) {
      throw new ValidationError(
        'Schema validation errors:\n  ' +
          result.errors.map((e) => `"${e.property}" ${e.message}`).join('\n  ')
      );
    }

    const resourceIndex: Map<string, Construct> = new Map();

    // Replace every resource that starts with CDK::
    for (const [logicalId, resourceProps] of Object.entries(
      template.Resources || {}
    )) {
      const rprops: any = resourceProps;
      if (!rprops.Type) {
        throw new Error(
          'Resource is missing type: ' + JSON.stringify(resourceProps)
        );
      }

      if (isCfnResourceType(rprops.Type)) {
        continue;
      }

      const propsType = typeSystem.findFqn(rprops.Type + 'Props');
      const propsTypeRef = new reflect.TypeReference(typeSystem, propsType);
      const Ctor = resolveType(rprops.Type);

      // Changing working directory if needed, such that relative paths in the template are resolved relative to the
      // template's location, and not to the current process' CWD.
      _cwd(props.workingDirectory, () => {
        const resource = new Ctor(
          this,
          logicalId,
          deconstructValue({
            stack: this,
            typeRef: propsTypeRef,
            optional: true,
            key: 'Properties',
            value: rprops.Properties,
          })
        );

        resourceIndex.set(logicalId, resource);
        tryAddDependency(rprops, resourceIndex, resource);
        return resource;
      });

      delete template.Resources[logicalId];
    }

    delete template.$schema;

    const workdir = mkdtempSync(join(tmpdir(), 'decdk-'));
    const templateFile = join(workdir, 'template.json');
    writeFileSync(templateFile, JSON.stringify(template));

    // Add an Include construct with what's left of the template
    new CfnInclude(this, 'Include', { templateFile });

    // replace all "Fn::GetAtt" with tokens that resolve correctly both for
    // constructs and raw resources.
    processReferences(this);
  }
}

function resolveType(fqn: string) {
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

interface ParsedIntrinsic {
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
function tryParseIntrinsic(input: any): ParsedIntrinsic | undefined {
  if (typeof input !== 'object') {
    return undefined;
  }

  if (Object.keys(input).length !== 1) {
    return undefined;
  }

  const name = Object.keys(input)[0];
  const value = input[name];
  return { name, value };
}

function tryResolveRef(value: any) {
  const fn = tryParseIntrinsic(value);
  if (!fn || fn.name !== 'Ref') {
    return undefined;
  }

  return fn.value;
}

function tryResolveGetAtt(value: any) {
  const fn = tryParseIntrinsic(value);
  if (!fn || fn.name !== 'Fn::GetAtt') {
    return undefined;
  }

  return fn.value;
}

interface DeconstructCommonOptions {
  readonly stack: cdk.Stack;
  readonly typeRef: reflect.TypeReference;
  readonly key: string;
  readonly value: any;
}

interface DeconstructValueOptions extends DeconstructCommonOptions {
  readonly optional: boolean;
}

function deconstructValue(options: DeconstructValueOptions): any {
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

  if (typeRef.primitive) {
    return value;
  }

  const enumLike = deconstructEnumLike(options);
  if (enumLike) {
    return enumLike;
  }

  const asType = deconstructType(options);
  if (asType) {
    return asType;
  }

  throw new Error(
    `Unable to deconstruct "${JSON.stringify(value)}" for type ref ${typeRef}`
  );
}

function deconstructRef(options: DeconstructCommonOptions) {
  const { stack, typeRef, value } = options;

  const asRef = tryResolveRef(value);

  if (!asRef) {
    return undefined;
  }

  if (isConstruct(typeRef)) {
    return findConstruct(stack, value.Ref);
  }

  throw new Error(
    `{ Ref } can only be used when a construct type is expected and this is ${typeRef}. ` +
      'Use { Fn::GetAtt } to represent specific resource attributes'
  );
}

function deconstructArray(options: DeconstructCommonOptions) {
  const { stack, typeRef, key, value } = options;

  if (!typeRef.arrayOfType) {
    return undefined;
  }

  if (!Array.isArray(value)) {
    throw new Error(`Expecting array for ${key} in ${typeRef}`);
  }

  return value.map((x, i) =>
    deconstructValue({
      stack,
      typeRef: typeRef.arrayOfType!,
      optional: false,
      key: `${key}[${i}]`,
      value: x,
    })
  );
}

function deconstructMap(options: DeconstructCommonOptions) {
  const { stack, typeRef, key, value } = options;

  if (!typeRef.mapOfType) {
    return undefined;
  }

  if (typeof value !== 'object') {
    throw new ValidationError(`Expecting object for ${key} in ${typeRef}`);
  }

  const out: Record<string, any> = {};
  for (const [k, v] of Object.entries(value)) {
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

function deconstructUnion(options: DeconstructCommonOptions) {
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

function deconstructEnum(options: DeconstructCommonOptions) {
  const { typeRef, value } = options;

  if (!(typeRef.type instanceof reflect.EnumType)) {
    return undefined;
  }

  if (typeof value !== 'string') {
    throw new Error(
      `Enum choice must be a string literal, found ${JSON.stringify(value)}.`
    );
  }

  const enumChoice = value.toUpperCase();
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

function deconstructInterface(options: DeconstructCommonOptions) {
  const { stack, typeRef, key, value } = options;

  if (!isSerializableInterface(typeRef.type)) {
    return undefined;
  }

  const out: any = {};
  for (const prop of typeRef.type.allProperties) {
    const propValue = value[prop.name];
    if (!propValue) {
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

function deconstructEnumLike(options: DeconstructCommonOptions) {
  const { stack, typeRef, value } = options;

  if (!isEnumLikeClass(typeRef.type)) {
    return undefined;
  }

  // if the value is a string, we deconstruct it as a static property
  if (typeof value === 'string') {
    return deconstructStaticProperty(typeRef.type, value);
  }

  // if the value is an object, we deconstruct it as a static method
  if (typeof value === 'object' && !Array.isArray(value)) {
    return deconstructStaticMethod(stack, typeRef.type, value);
  }

  throw new Error(
    `Invalid value for enum-like class ${typeRef.fqn}: ${JSON.stringify(value)}`
  );
}

function deconstructType(options: DeconstructCommonOptions) {
  const { stack, typeRef, value } = options;

  const schemaDefs: any = {};
  const ctx = SchemaContext.root(schemaDefs);
  const schemaRef = schemaForPolymorphic(typeRef.type, ctx);
  if (!schemaRef) {
    return undefined;
  }

  const def = findDefinition(schemaDefs, schemaRef.$ref);

  const keys = Object.keys(value);
  if (keys.length !== 1) {
    throw new ValidationError(
      `Cannot parse class type ${typeRef} with value ${value}`
    );
  }

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

  return invokeMethod(stack, method, value[className]);
}

function findDefinition(defs: any, $ref: string) {
  const k = $ref.split('/').slice(2).join('/');
  return defs[k];
}

function deconstructStaticProperty(typeRef: reflect.ClassType, value: string) {
  const typeClass = resolveType(typeRef.fqn);
  return typeClass[value];
}

function deconstructStaticMethod(
  stack: cdk.Stack,
  typeRef: reflect.ClassType,
  value: any
) {
  const methods = typeRef.allMethods.filter((m) => m.static);
  const members = methods.map((x) => x.name);

  if (typeof value === 'object') {
    const entries: Array<[string, any]> = Object.entries(value);
    if (entries.length !== 1) {
      throw new Error(
        `Value for enum-like class ${
          typeRef.fqn
        } must be an object with a single key (one of: ${members.join(',')})`
      );
    }

    const [methodName, args] = entries[0];
    const method = methods.find((m) => m.name === methodName);
    if (!method) {
      throw new Error(
        `Invalid member "${methodName}" for enum-like class ${
          typeRef.fqn
        }. Options: ${members.join(',')}`
      );
    }

    if (typeof args !== 'object') {
      throw new Error(
        `Expecting enum-like member ${methodName} to be an object for enum-like class ${typeRef.fqn}`
      );
    }

    return invokeMethod(stack, method, args);
  }
}

function invokeMethod(
  stack: cdk.Stack,
  method: reflect.Callable,
  parameters: any
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
      const value = parameters[p.name];
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

function deconstructGetAtt(options: DeconstructCommonOptions) {
  const { stack, typeRef, key, value } = options;

  const getAtt = tryResolveGetAtt(value);
  if (getAtt) {
    const [logical, attr] = getAtt;

    if (isConstruct(typeRef)) {
      const obj: any = findConstruct(stack, logical);
      return obj[attr];
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
function produceLazyGetAtt(stack: cdk.Stack, id: string, attribute: string) {
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
      return (res as any)[attribute];
    },
  });
}

function findConstruct(stack: cdk.Stack, id: string) {
  const child = stack.node.tryFindChild(id);
  if (!child) {
    throw new Error(
      `Construct with ID ${id} not found (it must be defined before it is referenced)`
    );
  }
  return child;
}

function tryAddDependency(
  resourceProperties: any,
  resourceIndex: Map<string, Construct>,
  resource: any
) {
  if (resourceProperties.DependsOn != null) {
    const dependencies = Array.isArray(resourceProperties.DependsOn)
      ? resourceProperties.DependsOn
      : [resourceProperties.DependsOn];

    for (const dependency of dependencies) {
      const ref = tryResolveRef(dependency);

      if (ref == null) {
        throw new Error(
          `The value of a DependsOn property must be a reference to another construct. Got ${JSON.stringify(
            resourceProperties.DependsOn
          )}`
        );
      }

      if (resourceIndex.has(ref)) {
        resource.node.addDependency(resourceIndex.get(ref));
      } else {
        throw new Error(
          `Construct with ID ${ref} not found (it must be defined before it is referenced)`
        );
      }
    }
  }
}

function processReferences(stack: cdk.Stack) {
  const include = stack.node.findChild('Include') as CfnInclude;
  if (!include) {
    throw new Error('Unexpected');
  }

  process((include as any).template);

  function process(value: any): any {
    if (
      typeof value === 'object' &&
      Object.keys(value).length === 1 &&
      Object.keys(value)[0] === 'Fn::GetAtt'
    ) {
      const [id, attribute] = value['Fn::GetAtt'];
      return produceLazyGetAtt(stack, id, attribute);
    }

    if (Array.isArray(value)) {
      return value.map((x) => process(x));
    }

    if (typeof value === 'object') {
      for (const [k, v] of Object.entries(value)) {
        value[k] = process(v);
      }
      return value;
    }

    return value;
  }
}

function isCfnResourceType(resourceType: string) {
  return resourceType.includes('::');
}

class ValidationError extends Error {}

function _cwd<T>(workDir: string | undefined, cb: () => T): T {
  if (!workDir) {
    return cb();
  }
  const prevWd = process.cwd();
  try {
    process.chdir(workDir);
    return cb();
  } finally {
    process.chdir(prevWd);
  }
}
