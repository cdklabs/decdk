import * as reflect from 'jsii-reflect';
import { Initializer } from 'jsii-reflect';
import * as util from 'util';
import {
  allImplementationsOfType,
  enumLikeClassMethods,
  enumLikeClassProperties,
  isConstruct,
} from '../type-system';
import { allStaticFactoryMethods } from '../type-system/factories';
import { $ref } from './expression';

/* eslint-disable no-console */

export class SchemaContext {
  public static root(
    definitions?: { [fqn: string]: any },
    primitives?: { [type: string]: string }
  ): SchemaContext {
    return new SchemaContext(undefined, undefined, definitions, primitives);
  }

  public readonly definitions: { [fqn: string]: any };
  public readonly primitives: { [type: string]: any };
  public readonly path: string;
  public readonly children = new Array<SchemaContext>();
  public readonly name: string;
  public readonly root: boolean;
  public readonly warnings = new Array<string>();
  public readonly errors = new Array<string>();

  private readonly definitionStack: string[];

  private constructor(
    name?: string,
    parent?: SchemaContext,
    definitions?: { [fqn: string]: any },
    primitives?: { [type: string]: string }
  ) {
    this.name = name || '';
    if (parent) {
      this.root = false;
      parent.children.push(this);
      this.definitions = parent.definitions;
      this.primitives = parent.primitives;
      this.path = parent.path + '/' + this.name;
      this.definitionStack = parent.definitionStack;
    } else {
      this.root = true;
      this.definitions = definitions || {};
      this.primitives = primitives || {};
      this.path = this.name || '';
      this.definitionStack = new Array<string>();
    }
  }

  public child(type: string, name: string): SchemaContext {
    return new SchemaContext(`[${type} "${name}"]`, this);
  }

  public get hasWarningsOrErrors(): boolean {
    return (
      this.warnings.length > 0 ||
      this.errors.length > 0 ||
      this.children.some((child) => child.hasWarningsOrErrors)
    );
  }

  public warning(format: any, ...args: any[]) {
    this.warnings.push(util.format(format, ...args));
  }

  public error(format: any, ...args: any[]) {
    this.errors.push(util.format(format, ...args));
  }

  public findDefinition(ref: string) {
    const [, , id] = ref.split('/');
    return this.definitions[id];
  }

  public define(fqn: string, schema: (ctx: SchemaContext) => any) {
    const originalFqn = fqn;
    fqn = fqn.replace('/', '.');

    if (!this.isDefined(fqn)) {
      if (this.definitionStack.includes(fqn)) {
        this.error(`cyclic definition of ${fqn}`);
        return undefined;
      }

      this.definitionStack.push(fqn);

      try {
        const s = schema(this.child('definition', fqn));
        if (!s) {
          this.error('cannot schematize');
          return undefined;
        }

        s.comment = originalFqn;

        this.definitions[fqn] = s;
      } finally {
        this.definitionStack.pop();
      }
    }

    return { $ref: `#/definitions/${fqn}` };
  }

  public isDefined(fqn: string): boolean {
    return fqn in this.definitions;
  }
}

export function schemaForTypeReference(
  type: reflect.TypeReference,
  ctx: SchemaContext
): any {
  const prim = schemaForPrimitive(type, ctx);
  if (prim) {
    return prim;
  }

  const arr = schemaForArray(type, ctx);
  if (arr) {
    return arr;
  }

  const map = schemaForMap(type, ctx);
  if (map) {
    return map;
  }

  const union = schemaForUnion(type, ctx);
  if (union) {
    return union;
  }

  const constructRef = schemaForConstructRef(type);
  if (constructRef) {
    return constructRef;
  }

  const iface = schemaForInterface(type.type, ctx);
  if (iface) {
    return iface;
  }

  const enm = schemaForEnum(type.type);
  if (enm) {
    return enm;
  }

  const enumLike = schemaForEnumLikeClass(type.type, ctx);
  if (enumLike) {
    return enumLike;
  }

  const cls = schemaForPolymorphic(type.type, ctx);
  if (cls) {
    return cls;
  }

  if (!ctx.hasWarningsOrErrors) {
    ctx.error("didn't match any schematizable shape");
  }

  return undefined;
}

function schemaForPolymorphic(
  type: reflect.Type | undefined,
  ctx: SchemaContext
) {
  if (!type) {
    return undefined;
  }

  ctx = ctx.child('polymorphic', type.fqn);

  const anyOf = new Array<any>();

  const parentctx = ctx;

  for (const x of allImplementationsOfType(type)) {
    ctx = parentctx.child('impl', x.fqn);

    const enumLike = schemaForEnumLikeClass(x, ctx);
    if (enumLike) {
      anyOf.push(enumLike);
    }

    if (x.initializer) {
      const methd = methodSchema(x.initializer, ctx);
      if (methd) {
        anyOf.push(methd);
      }
    }
  }

  // If there are any acceptable implementations, they will also be allowed at the top-level
  // So we need to allow Ref here as well
  if (anyOf.length >= 1) {
    anyOf.unshift(schemaForReferences());
  }

  for (const method of allStaticFactoryMethods(type)) {
    const methd = methodSchema(method, ctx);
    if (methd) {
      anyOf.push(methd);
    }
  }

  if (anyOf.length === 0) {
    return undefined;
  }

  return ctx.define(type.fqn, () => {
    return { anyOf };
  });
}

function schemaForEnum(type: reflect.Type | undefined) {
  if (!type || !(type instanceof reflect.EnumType)) {
    return undefined;
  }

  return {
    enum: type.members.map((m) => m.name),
  };
}

function schemaForMap(type: reflect.TypeReference, ctx: SchemaContext) {
  ctx = ctx.child('map', type.toString());

  if (!type.mapOfType) {
    return undefined;
  }

  const s = schemaForTypeReference(type.mapOfType, ctx);
  if (!s) {
    return undefined;
  }

  return {
    type: 'object',
    additionalProperties: s,
  };
}

function schemaForArray(type: reflect.TypeReference, ctx: SchemaContext) {
  ctx = ctx.child('array', type.toString());

  if (!type.arrayOfType) {
    return undefined;
  }

  const s = schemaForTypeReference(type.arrayOfType, ctx);
  if (!s) {
    return undefined;
  }

  return {
    type: 'array',
    items: s,
  };
}

function schemaForPrimitive(
  type: reflect.TypeReference,
  ctx: SchemaContext
): any {
  if (!type.primitive) {
    return undefined;
  }

  if (ctx.primitives[type.primitive]) {
    return { $ref: `#/definitions/${ctx.primitives[type.primitive]}` };
  }

  switch (type.primitive) {
    case 'date':
      return { type: 'string', format: 'date-time' };
    case 'json':
      return { type: 'object' };
    case 'any':
      return {}; // this means "any"
    case 'string':
    case 'number':
    case 'boolean':
    default:
      return { type: type.primitive };
  }
}

function schemaForUnion(type: reflect.TypeReference, ctx: SchemaContext): any {
  ctx = ctx.child('union', type.toString());

  if (!type.unionOfTypes) {
    return undefined;
  }

  const anyOf = type.unionOfTypes
    .map((x) => schemaForTypeReference(x, ctx))
    .filter((x) => x); // filter failed schemas

  if (anyOf.length === 0) {
    return undefined;
  }

  return { anyOf };
}

function schemaForConstructRef(type: reflect.TypeReference) {
  if (!isConstruct(type)) {
    return undefined;
  }

  return schemaForReferences();
}

function schemaForReferences() {
  return { anyOf: [$ref('FnRef'), $ref('FnGetProp')] };
}

function schemaForInterface(
  type: reflect.Type | undefined,
  ctx: SchemaContext
) {
  if (!type || !(type instanceof reflect.InterfaceType)) {
    return undefined; // skip
  }

  if (type.allMethods.length > 0) {
    return undefined;
  }

  ctx = ctx.child('interface', type.fqn);

  const ifctx = ctx;

  return ctx.define(type.fqn, () => {
    const properties: any = {};
    const required = new Array<string>();

    for (const prop of type.allProperties) {
      ctx = ifctx.child(
        prop.optional ? 'optional' : 'required' + ' property',
        prop.name
      );

      const schema = schemaForTypeReference(prop.type, ctx);
      if (!schema) {
        // if prop is not serializable but optional, we can still serialize
        // but without this property.
        if (prop.optional) {
          ctx.warning(
            'optional property omitted because it cannot be schematized'
          );
          continue;
        }

        // error
        ctx.error('property cannot be schematized');
        return undefined;
      }

      if (schema.$ref != null) {
        properties[prop.name] = {
          anyOf: [
            withDescription(prop, schema),
            withDescription(prop, schemaForReferences()),
          ],
        };
      } else {
        properties[prop.name] = withDescription(prop, schema);
      }

      if (!prop.optional) {
        required.push(prop.name);
      }
    }

    function withDescription(
      prop: reflect.Property,
      obj: Record<string, unknown>
    ) {
      const docstring = prop.docs.toString();
      return docstring ? { ...obj, description: docstring } : obj;
    }

    return {
      type: 'object',
      title: type.name,
      additionalProperties: false,
      properties,
      required: required.length > 0 ? required : undefined,
    };
  });
}

export function schemaForEnumLikeClass(
  type: reflect.Type | undefined,
  ctx: SchemaContext
) {
  if (type) {
    ctx = ctx.child('enum-like', type.toString());
  }

  if (!type || !(type instanceof reflect.ClassType)) {
    return undefined;
  }

  const enumLikeProps = enumLikeClassProperties(type);
  const enumLikeMethods = enumLikeClassMethods(type);
  const constructorParams = type.initializer?.parameters ?? [];

  if (enumLikeProps.length === 0 && enumLikeMethods.length === 0) {
    return undefined;
  }

  const anyOf = new Array<any>();

  if (enumLikeProps.length > 0) {
    anyOf.push({ enum: enumLikeProps.map((m) => m.name) });
  }

  for (const method of enumLikeMethods) {
    const methd = methodSchema(method, ctx);
    if (methd) {
      anyOf.push(methd);
    }
  }

  anyOf.push({
    additionalProperties: false,
    type: 'object',
    properties: {
      Type: {
        type: 'string',
        enum: [type.fqn],
      },
      Call: {
        type: 'object',
      },
      On: {
        type: 'string',
      },
    },
  });

  anyOf.push({
    type: 'array',
    items: constructorParams.map((p) => schemaForTypeReference(p.type, ctx)),
  });

  if (anyOf.length === 0) {
    return undefined;
  }

  return ctx.define(type.fqn, () => {
    return { anyOf };
  });
}

function methodSchema(method: reflect.Callable, ctx: SchemaContext) {
  ctx = ctx.child('method', method.name);

  const fqn = `${method.parentType.fqn}.${method.name}`;

  const methodctx = ctx;

  return ctx.define(fqn, () => {
    const properties: any[] = [];
    const required = new Array<string>();

    const addProperty = (prop: reflect.Property | reflect.Parameter): void => {
      const param = schemaForTypeReference(prop.type, ctx);

      // bail out - can't serialize a required parameter, so we can't serialize the method
      if (!param && !prop.optional) {
        ctx.error(
          'cannot schematize method because parameter cannot be schematized'
        );
        return undefined;
      }

      properties.push(param);

      if (!prop.optional) {
        required.push(prop.name);
      }
    };

    for (let i = 0; i < method.parameters.length; ++i) {
      const p = method.parameters[i];
      methodctx.child('param', p.name);

      addProperty(p);
    }

    const basicSchema =
      required.length > 0
        ? {
            type: 'array',
            items: properties.map((p) => ({
              anyOf: [p, $ref('IntrinsicExpression')],
            })),
            maxItems: properties.length,
          }
        : {
            type: ['array', 'null'],
            maxItems: 0,
          };

    const methodCallName = Initializer.isInitializer(method)
      ? method.parentType.fqn
      : `${method.parentType.fqn}.${method.name}`;

    const callSchema = (schema: any) => ({
      type: 'object',
      additionalProperties: false,
      properties: {
        [methodCallName]: schema,
      },
    });

    if (
      basicSchema.items &&
      basicSchema.items.length > 0 &&
      required.length < 2
    ) {
      return callSchema({
        anyOf: [basicSchema, basicSchema.items[0]],
      });
    }

    return callSchema(basicSchema);
  });
}
