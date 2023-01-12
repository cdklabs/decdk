import * as reflect from 'jsii-reflect';
import { TypedTemplateExpression } from './expression';
import { resolveExpressionType } from './resolve';
import { TemplateExpression } from '../parser/template/expression';

export function resolveUnionOfTypesExpression(
  x: TemplateExpression,
  unionTypeRefs: reflect.TypeReference[]
): TypedTemplateExpression {
  const errors = new Array<TypeError | SyntaxError>();
  for (const typeRef of unionTypeRefs) {
    try {
      return resolveExpressionType(x, typeRef);
    } catch (e) {
      if (!(e instanceof TypeError || e instanceof SyntaxError)) {
        throw e;
      }
      errors.push(e);
    }
  }

  throw new TypeError(
    `Expected one of allowed types, got errors: \n  ${errors
      .map((e) => e.message)
      .join('\n  ')}`
  );
}

export function assertUnionOfTypes(
  typeRef: reflect.TypeReference
): reflect.TypeReference[] {
  if (!typeRef.unionOfTypes) {
    throw new TypeError(`Expected union of types, got ${typeRef.toString()}`);
  }

  return typeRef.unionOfTypes;
}
