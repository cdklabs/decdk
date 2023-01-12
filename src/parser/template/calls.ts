import {
  ArrayLiteral,
  parseExpression,
  TemplateExpression,
} from './expression';
import { assertOneField, assertString } from '../private/types';

export interface FactoryMethodCall {
  readonly target?: string;
  readonly methodName: string;
  readonly arguments: ArrayLiteral;
}

export function parseCall(x: unknown): FactoryMethodCall | undefined {
  if (x == null) return undefined;

  const array = Array.isArray(x) ? x : [x];
  switch (array.length) {
    case 1:
      return parseStaticCall(array);
    case 2:
      return parseInstanceCall(array);
    default:
      throw new SyntaxError(
        `Method calls should have 1 or 2 elements, got ${array}`
      );
  }
}

function parseStaticCall(array: any[]) {
  const methodFqn = assertOneField(array[0]);
  return {
    methodName: methodFqn,
    arguments: toArrayLiteral(parseExpression(array[0][methodFqn])),
  };
}

function parseInstanceCall(array: any[]) {
  const methodFqn = assertOneField(array[1]);
  return {
    target: assertString(array[0]),
    methodName: methodFqn,
    arguments: toArrayLiteral(parseExpression(array[1][methodFqn])),
  };
}

export function toArrayLiteral(x: TemplateExpression): ArrayLiteral {
  return x.type === 'array'
    ? x
    : {
        type: 'array',
        array: [x],
      };
}
