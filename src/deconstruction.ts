import * as cdk from 'aws-cdk-lib';
import { CfnResource, Tags } from 'aws-cdk-lib';
import { CfnInclude } from 'aws-cdk-lib/cloudformation-include';
import { IConstruct } from 'constructs';
import * as reflect from 'jsii-reflect';
import { DirectedAcyclicGraph, Edge } from './graph';
import {
  isConstruct,
  isDataType,
  isEnumLikeClass,
  isSerializableInterface,
  SchemaContext,
  schemaForPolymorphic,
} from './jsii2schema';
import {
  CfnResourceEntry,
  Override,
  ReferenceType,
  ResourceDeclaration,
  Tag,
} from './model';
import { IntrinsicFunctionsMatcher } from './object-matchers';

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
export function tryParseIntrinsic(input: any): ParsedIntrinsic | undefined {
  if (typeof input !== 'object') {
    return undefined;
  }

  if (Object.keys(input).length !== 1) {
    return undefined;
  }

  const [name, value] = Object.entries(input)[0];
  return { name, value };
}

export function tryResolveRef(value: any) {
  const fn = tryParseIntrinsic(value);
  if (!fn || fn.name !== 'Ref') {
    return undefined;
  }

  return fn.value;
}

export function tryResolveGetAtt(value: any) {
  const fn = tryParseIntrinsic(value);
  if (!fn || fn.name !== 'Fn::GetAtt') {
    return undefined;
  }

  return fn.value;
}

export interface DeconstructCommonOptions {
  readonly stack: cdk.Stack;
  readonly typeRef: reflect.TypeReference;
  readonly key: string;
  readonly value: any;
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

export function deconstructRef(options: DeconstructCommonOptions) {
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

export function deconstructArray(options: DeconstructCommonOptions) {
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

export function deconstructMap(options: DeconstructCommonOptions) {
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

export function deconstructInterface(options: DeconstructCommonOptions) {
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

export function deconstructEnumLike(options: DeconstructCommonOptions) {
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

export function deconstructType(options: DeconstructCommonOptions) {
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

export function findDefinition(defs: any, $ref: string) {
  const k = $ref.split('/').slice(2).join('/');
  return defs[k];
}

export function deconstructStaticProperty(
  typeRef: reflect.ClassType,
  value: string
) {
  const typeClass = resolveType(typeRef.fqn);
  return typeClass[value];
}

export function deconstructStaticMethod(
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

export function invokeMethod(
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

export function deconstructGetAtt(options: DeconstructCommonOptions) {
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
export function produceLazyGetAtt(
  stack: cdk.Stack,
  id: string,
  attribute: string
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
      return (res as any)[attribute];
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

export function processReferences(stack: cdk.Stack) {
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

export function isCfnResourceType(resourceType: string) {
  return resourceType.includes('::');
}

export class ValidationError extends Error {}

export function _cwd<T>(workDir: string | undefined, cb: () => T): T {
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

export function applyTags(resource: IConstruct, tags: Tag[] = []) {
  tags.forEach((tag: Tag) => {
    Tags.of(resource).add(tag.key, tag.value);
  });
}

export function applyOverrides(
  resource: IConstruct,
  overrides: Override[] = []
) {
  overrides.forEach((override: Override) => {
    if (override.removeResource) {
      resource.node.tryRemoveChild(override.childConstructPath!);
    } else if (override.update != null) {
      const descendent = resolvePath(resource, override.childConstructPath);
      const { path, value } = override.update;
      descendent.addOverride(path, value);
    } else if (override.delete != null) {
      const descendent = resolvePath(resource, override.childConstructPath);
      descendent.addDeletionOverride(override.delete.path);
    }
  });
}

function resolvePath(root: IConstruct, path?: string): CfnResource {
  const ids = path != null ? path.split('.') : [];
  const destination = ids.reduce(descend, root);
  if (CfnResource.isCfnResource(destination)) {
    return destination;
  } else if (
    destination.node.defaultChild != null &&
    CfnResource.isCfnResource(destination.node.defaultChild)
  ) {
    return destination.node.defaultChild;
  }
  throw new Error(
    `Resource ${path} does not have a default child. Please specify the Cfn resource`
  );

  function descend(construct: IConstruct, id: string): IConstruct {
    const child = construct.node.tryFindChild(id);
    if (child == null) {
      throw new Error(`${id} does not exist`);
    }
    return child;
  }
}

export function mapValues<A, B>(
  rec: Record<string, A>,
  fn: (a: A) => B
): Record<string, B> {
  return Object.fromEntries(Object.entries(rec).map(([k, v]) => [k, fn(v)]));
}

/**
 * Extracts the graph structure encoded in the template
 * @param template a deCDK template
 */
export function graphFromTemplate(
  template: any
): DirectedAcyclicGraph<CfnResourceEntry, ReferenceType> {
  const resources = template.Resources as Record<string, CfnResourceEntry>;
  const identified = Object.fromEntries(
    Object.entries(resources).map(([id, v]) => [id, { ...v, logicalId: id }])
  );
  const parameterNames = Object.keys(template.Parameters ?? {});
  const resourceNames = Object.keys(template.Resources ?? {});

  const matcher = new IntrinsicFunctionsMatcher(parameterNames, resourceNames);

  return new DirectedAcyclicGraph(identified, mapValues(resources, toEdges));

  function toEdges(entry: CfnResourceEntry): Edge<ReferenceType>[] {
    return matcher
      .match(entry)
      .map((ref) => ({ label: ref.type, target: ref.target }));
  }
}

/**
 * Transforms a resource entry provided by the user into a strongly typed
 * declaration. If the entry is not valid, a specific error will be thrown.
 */
export function parse(entry: CfnResourceEntry): ResourceDeclaration {
  return {
    logicalId: entry.logicalId,
    type: validateType(entry.Type),
    properties: validateProperties(entry.Properties),
    tags: validateTags(entry.Tags),
    overrides: validateOverrides(entry.Overrides),
  };

  function validateType(value: unknown): string {
    if (value == null) {
      throw new Error('Resource is missing type: ' + JSON.stringify(value));
    }
    if (typeof value !== 'string') {
      throw new Error('Type should be a string');
    }
    return value;
  }

  function validateProperties(value: unknown): Record<string, unknown> {
    if (value == null) {
      return {};
    }
    if (typeof value !== 'object') {
      throw new Error('Properties must be an object');
    }
    return Object.fromEntries(Object.entries(value));
  }

  function validateTags(value: unknown): Tag[] {
    if (value == null) {
      return [];
    }

    if (!Array.isArray(value)) {
      throw new Error('Tags must be an array');
    }

    return value.map((element) => {
      if (
        element == null ||
        typeof element !== 'object' ||
        element.Key == null ||
        element.Value == null
      ) {
        throw new Error(
          'Tags must contain only elements of the form {Key: string, Value: string}'
        );
      }
      return { key: element.Key, value: element.Value };
    });
  }

  function validateOverrides(value: unknown): Override[] {
    if (value == null) {
      return [];
    }
    if (!Array.isArray(value)) {
      throw new Error('Overrides must be an array');
    }

    return value.map((element) => {
      if (
        element.RemoveResource === true &&
        element.ChildConstructPath == null
      ) {
        throw new Error(
          "Overrides must have a 'ChildConstructPath' attribute when RemoveResource is true"
        );
      }
      const actions = [element.RemoveResource, element.Update, element.Delete];
      if (actions.filter((action) => action != null).length !== 1) {
        throw new Error(
          "Exactly one of these actions should be provided in an Override: 'RemoveResource', 'Update' or 'Delete'"
        );
      }

      return {
        update: validateUpdate(element.Update),
        delete: validateDelete(element.Delete),
        childConstructPath: element.ChildConstructPath,
        removeResource: element.RemoveResource ?? false,
      };
    });
  }

  function validateUpdate(
    update: any
  ): { path: string; value: unknown } | undefined {
    if (update == null) return undefined;

    if (update.Path == null || update.Value == null) {
      throw new Error(
        "Update overrides must have a 'Path' and a 'Value' attribute"
      );
    }
    return {
      path: update.Path,
      value: update.Value,
    };
  }

  function validateDelete(del: any): { path: string } | undefined {
    if (del == null) return undefined;

    if (del.Path == null) {
      throw new Error("Delete overrides must have a 'Path' attribute");
    }
    return {
      path: del.Path,
    };
  }
}

export interface ConstructBuilderProps {
  readonly typeSystem: reflect.TypeSystem;
  readonly workingDirectory?: string;
  readonly stack: cdk.Stack;
  readonly template: any;
}

export class ConstructBuilder {
  constructor(private readonly props: ConstructBuilderProps) {}

  /**
   * Creates a new CDK Construct based on its resource declaration and the
   * declarations of its dependencies.
   */
  public build(resource: ResourceDeclaration): IConstruct | undefined {
    if (isCfnResourceType(resource.type)) {
      return undefined;
    }

    const { workingDirectory, stack, template } = this.props;
    const propsTypeRef = this.extractPropsType(resource.type);
    const Ctor = resolveType(resource.type);

    // Changing working directory if needed, such that relative paths in the template are resolved relative to the
    // template's location, and not to the current process' CWD.
    const construct = _cwd(workingDirectory, () => {
      const props = propsTypeRef
        ? deconstructValue({
            stack,
            typeRef: propsTypeRef,
            optional: true,
            key: 'Properties',
            value: resource.properties,
          })
        : undefined;

      const cdkConstruct = new Ctor(stack, resource.logicalId, props);
      applyTags(cdkConstruct, resource.tags);
      applyOverrides(cdkConstruct, resource.overrides);
      return cdkConstruct;
    });

    delete template.Resources[resource.logicalId];

    return construct;
  }

  private extractPropsType(fqn: string): reflect.TypeReference | undefined {
    const construct = this.props.typeSystem.findFqn(fqn);
    if (!construct.isClassType()) {
      return;
    }

    const [_scopeParam, _idParam, propsParam] =
      construct.initializer?.parameters ?? [];

    return propsParam?.type;
  }
}
