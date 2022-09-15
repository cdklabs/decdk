import { ParserError } from '../private/types';
import { ObjectLiteral, parseExpression } from './expression';

export function parseCall(x: unknown): ObjectLiteral {
  const call = parseExpression(x ?? {});
  if (call.type !== 'object') {
    throw new ParserError(`Expected object, got: ${JSON.stringify(x)}`);
  }
  return call;
}
