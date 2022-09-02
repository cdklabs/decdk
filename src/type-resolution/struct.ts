import * as reflect from 'jsii-reflect';
import { ObjectLiteral } from '../parser/template';
import { TypedTemplateExpression } from './expression';
import { resolveExpressionType } from './resolve';

export interface StructExpression {
  type: 'struct';
  fields: Record<string, TypedTemplateExpression>;
}

export function resolveStructExpression(
  x: ObjectLiteral,
  type: reflect.InterfaceType
): StructExpression {
  const fields: Record<string, TypedTemplateExpression> = {};
  for (const prop of type.allProperties) {
    const propValue = x.fields[prop.name];
    if (propValue === undefined) {
      if (!prop.optional) {
        throw new TypeError(
          `Missing required property ${prop.name} in ${type.name}`
        );
      }
      continue;
    }

    fields[prop.name] = resolveExpressionType(propValue, prop.type);
  }

  return {
    type: 'struct',
    fields,
  };
}

export function assertInterface(
  typeRef: reflect.TypeReference
): reflect.InterfaceType {
  if (!typeRef.type?.isInterfaceType()) {
    throw new TypeError(`Expected Interface, got ${typeRef.toString()}`);
  }

  return typeRef.type;
}
