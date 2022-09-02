import * as reflect from 'jsii-reflect';
import { ValidationError } from '../deconstruction';
import {
  enumLikeClassMethods,
  isBehavioralInterface,
  isDataType,
  isEnum,
  isEnumLikeClass,
  isSerializableInterface,
} from '../jsii2schema';
import { EvaluationContext, EvaluationContextOptions } from './context';
import { Evaluator } from './evaluate';

export interface TypedContextOptions extends EvaluationContextOptions {
  readonly typeSystem: reflect.TypeSystem;
}

export class TypedContext<P, A = P> extends EvaluationContext<P, A> {
  public readonly typeSystem: reflect.TypeSystem;

  constructor(opts: TypedContextOptions) {
    super(opts);
    this.typeSystem = opts.typeSystem;
  }

  /**
   * Return the Class for a given FQN
   */
  public resolveClass(fqn: string) {
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

  // @todo make it generic
  public extractPropsType(fqn: string): reflect.TypeReference | undefined {
    const construct = this.typeSystem.findFqn(fqn);
    if (!construct.isClassType()) {
      return;
    }

    const [_scopeParam, _idParam, propsParam] =
      construct.initializer?.parameters ?? [];

    return propsParam?.type;
  }
}

enum EvaluationType {
  UNKNOWN,
  VOID,
  ANY,
  NUMBER,
  BOOLEAN,
  STRING,
  DATE_TIME,
  OBJECT,
  ARRAY_OF_TYPE,
  MAP_OF_TYPE,
  UNION_OF_TYPE,
  ENUM,
  ENUM_LIKE,
  SERIALIZABLE_INTERFACE,
  BEHAVIORAL_INTERFACE,
}

export abstract class TypedEvaluator<
  Context extends TypedContext<unknown, unknown>,
  Resource
> extends Evaluator<Context, Resource> {
  public resolveType(x: unknown, typeRef?: reflect.TypeReference): any {
    if (typeRef === undefined) {
      return undefined;
    }

    switch (this.detectEvaluationType(typeRef)) {
      case EvaluationType.ARRAY_OF_TYPE:
        return this.resolveAsArray(x, typeRef.arrayOfType!);
      case EvaluationType.ENUM:
        return this.resolveAsEnum(x, typeRef.type as reflect.EnumType);
      case EvaluationType.SERIALIZABLE_INTERFACE:
        return this.resolveAsStruct(x, typeRef.type as reflect.InterfaceType);
      case EvaluationType.MAP_OF_TYPE:
        return this.resolveAsMap(x, typeRef.mapOfType!);
      case EvaluationType.UNION_OF_TYPE:
        return this.resolveAsUnion(x, typeRef.unionOfTypes!);
      case EvaluationType.ENUM_LIKE:
        return this.resolveAsEnumLike(x, typeRef.type as reflect.ClassType);
      case EvaluationType.BEHAVIORAL_INTERFACE:
        return this.resolveAsPolymorphic(
          x,
          typeRef.type as reflect.InterfaceType
        );
      default:
        return x;
    }
  }

  protected resolveAsPolymorphic(
    x: unknown,
    interfaceType: reflect.InterfaceType
  ): any {
    const subClasses = interfaceType.system.classes.filter((i) =>
      i.extends(interfaceType)
    );

    const [providedType, props] = Object.entries(x as object)[0];

    for (const typeCandidate of subClasses) {
      if (providedType === typeCandidate.fqn && typeCandidate.initializer) {
        return this.invoke(typeCandidate.initializer, props);
      }

      if (x instanceof this.context.resolveClass(typeCandidate.fqn)) {
        return x;
      }
    }
  }

  protected resolveAsEnumLike(
    x: unknown,
    classType: reflect.ClassType
  ): unknown {
    // Static Property
    if (typeof x === 'string') {
      const typeClass = this.context.resolveClass(classType.fqn);
      return typeClass[x];
    }

    // Static Method
    const methods = enumLikeClassMethods(classType);
    const [methodName, args] = Object.entries(x as object)[0];
    const method = methods.find((m) => m.name === methodName);
    if (!method) {
      throw new Error(
        `Invalid member "${methodName}" for enum-like class ${
          classType.fqn
        }. Options: ${methods.map((m) => m.name).join(',')}`
      );
    }
    if (typeof args !== 'object') {
      throw new Error(
        `Expecting enum-like member ${methodName} to be an object for enum-like class ${classType.fqn}`
      );
    }
    return this.invoke(method, args);
  }

  /**
   * Invoke a static class method
   */
  public invoke(method: reflect.Callable, parameters: Record<string, unknown>) {
    const typeClass = this.context.resolveClass(method.parentType.fqn);
    const args = new Array<any>();

    for (let i = 0; i < method.parameters.length; ++i) {
      const p = method.parameters[i];

      // kwargs: if this is the last argument and a data type, flatten (treat as keyword args)
      if (i === method.parameters.length - 1 && isDataType(p.type.type)) {
        // we pass in all parameters as the value, and the positional arguments will be ignored since
        // we are promised there are no conflicts
        args.push(this.resolveType(parameters, p.type));
        continue;
      }

      if (parameters[p.name] === undefined) {
        if (!p.optional) {
          throw new Error(
            `Missing required parameter '${p.name}' for ${method.parentType.fqn}.${method.name}`
          );
        }
        continue;
      }

      // args.push(parameters[p.name]);
      args.push(this.resolveType(parameters[p.name], p.type));
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

  protected resolveAsArray(
    x: unknown,
    arrayTypeRef: reflect.TypeReference
  ): unknown {
    return (x as unknown[]).map((i) => this.resolveType(i, arrayTypeRef));
  }

  protected resolveAsMap(
    x: unknown,
    mapTypeRef: reflect.TypeReference
  ): unknown {
    return Object.fromEntries(
      Object.entries(x as object).map(([k, v]) => [
        k,
        this.resolveType(v, mapTypeRef),
      ])
    );
  }

  protected resolveAsUnion(
    x: unknown,
    unionTypeRefs: reflect.TypeReference[]
  ): unknown {
    const errors = new Array<ValidationError>();
    for (const typeRef of unionTypeRefs) {
      try {
        return this.resolveType(x, typeRef);
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

  protected resolveAsStruct(x: unknown, type: reflect.InterfaceType): unknown {
    const out: Record<string, unknown> = {};
    for (const prop of type.allProperties) {
      const propValue = (x as unknown as Record<string, unknown>)[prop.name];
      if (propValue === undefined) {
        if (!prop.optional) {
          // @todo
          const key = 'Properties';
          throw new ValidationError(
            `Missing required property ${key}.${prop.name} in ${type.name}`
          );
        }
        continue;
      }

      out[prop.name] = this.resolveType(propValue, prop.type);
    }

    return out;
  }

  protected resolveAsEnum(x: unknown, type: reflect.EnumType): unknown {
    const enumChoice = String(x).toUpperCase();
    const enumType = this.context.resolveClass(type.fqn);

    if (!(enumChoice in enumType)) {
      throw new Error(
        `Could not find enum choice ${enumChoice} for enum type ${
          type.fqn
        }. Available options: [${Object.keys(enumType).join(', ')}]`
      );
    }

    return enumType[enumChoice];
  }

  private detectEvaluationType(typeRef: reflect.TypeReference): EvaluationType {
    if (typeRef.void) {
      return EvaluationType.VOID;
    }
    if (typeRef.isAny || typeRef.primitive === 'any') {
      return EvaluationType.ANY;
    }

    if (typeRef.primitive === 'number') {
      return EvaluationType.NUMBER;
    }
    if (typeRef.primitive === 'boolean') {
      return EvaluationType.BOOLEAN;
    }
    if (typeRef.primitive === 'string') {
      return EvaluationType.STRING;
    }
    if (typeRef.primitive === 'date') {
      return EvaluationType.DATE_TIME;
    }
    if (typeRef.primitive === 'json') {
      return EvaluationType.OBJECT;
    }

    if (typeRef.arrayOfType) {
      return EvaluationType.ARRAY_OF_TYPE;
    }
    if (typeRef.mapOfType) {
      return EvaluationType.MAP_OF_TYPE;
    }
    if (typeRef.unionOfTypes) {
      return EvaluationType.UNION_OF_TYPE;
    }

    if (isEnum(typeRef.type)) {
      return EvaluationType.ENUM;
    }
    if (isEnumLikeClass(typeRef.type)) {
      return EvaluationType.ENUM_LIKE;
    }
    if (isSerializableInterface(typeRef.type)) {
      return EvaluationType.SERIALIZABLE_INTERFACE;
    }
    if (isBehavioralInterface(typeRef.type)) {
      return EvaluationType.BEHAVIORAL_INTERFACE;
    }

    return EvaluationType.UNKNOWN;
  }
}
