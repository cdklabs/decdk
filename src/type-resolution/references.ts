import { TypedTemplateExpression } from './expression';
import {
  GetPropIntrinsic,
  RefIntrinsic,
  TemplateExpression,
} from '../parser/template';

export interface ResolveReferenceExpression {
  type: 'resolve-reference';
  reference: RefIntrinsic | GetPropIntrinsic;
}

export function resolveRefToValue(x: RefIntrinsic): ResolveReferenceExpression {
  return {
    type: 'resolve-reference',
    reference: x,
  };
}

export function assertRef(x: TemplateExpression): RefIntrinsic {
  if (x.type !== 'intrinsic' || x.fn !== 'ref') {
    throw new SyntaxError(`Expected Ref, got: ${JSON.stringify(x)}`);
  }

  return x;
}

export function refOrResolve(
  x: TemplateExpression,
  fn: (x: TemplateExpression) => TypedTemplateExpression
): TypedTemplateExpression {
  if (x.type === 'intrinsic' && (x.fn === 'ref' || x.fn === 'getProp')) {
    return {
      type: 'resolve-reference',
      reference: x,
    };
  }

  return fn(x);
}
