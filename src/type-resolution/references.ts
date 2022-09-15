import { ParserError } from '../parser/private/types';
import {
  GetAttIntrinsic,
  RefIntrinsic,
  TemplateExpression,
} from '../parser/template';
import { TypedTemplateExpression } from './expression';

export interface ResolveReferenceExpression {
  type: 'resolve-reference';
  reference: RefIntrinsic | GetAttIntrinsic;
}

export function resolveRef(x: RefIntrinsic): ResolveReferenceExpression {
  return {
    type: 'resolve-reference',
    reference: x,
  };
}

export function assertRef(x: TemplateExpression): RefIntrinsic {
  if (x.type !== 'intrinsic' || x.fn !== 'ref') {
    throw new ParserError(`Expected Ref, got: ${JSON.stringify(x)}`);
  }

  return x;
}

export function refOrResolve(
  x: TemplateExpression,
  fn: (x: TemplateExpression) => TypedTemplateExpression
): TypedTemplateExpression {
  if (x.type === 'intrinsic' && (x.fn === 'ref' || x.fn === 'getAtt')) {
    return {
      type: 'resolve-reference',
      reference: x,
    };
  }

  return fn(x);
}
