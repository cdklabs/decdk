import { TemplateExpression } from '../template';

export function analyzeSubPattern(pattern: string): SubFragment[] {
  const ret: SubFragment[] = [];
  let start = 0;

  let ph0 = pattern.indexOf('${', start);
  while (ph0 > -1) {
    const ph1 = pattern.indexOf('}', ph0 + 2);
    const placeholder = pattern.substring(ph0 + 2, ph1);

    if (ph1 === -1) {
      break;
    }

    if (ph0 > start) {
      ret.push({ type: 'literal', content: pattern.substring(start, ph0) });
    }

    if (placeholder.trim()[0] === '!') {
      // "${!" means "don't actually substitute"
      ret.push({ type: 'literal', content: pattern.substring(ph0, ph1 + 1) });
      start = ph1 + 1;
      ph0 = pattern.indexOf('${', start);
      continue;
    }

    if (placeholder.includes('.')) {
      const logicalId = placeholder.split('.')[0];
      // Because split('.', 2) doesn't do what you think it does
      const attr = placeholder.substring(logicalId.length + 1);

      ret.push({ type: 'getatt', logicalId: logicalId!, attr: attr! });
    } else {
      ret.push({ type: 'ref', logicalId: placeholder.trim() });
    }

    start = ph1 + 1;
    ph0 = pattern.indexOf('${', start);
  }

  if (start < pattern.length) {
    ret.push({ type: 'literal', content: pattern.substring(start) });
  }

  return ret;
}

export type SubFragment =
  | { readonly type: 'literal'; readonly content: string }
  | { readonly type: 'ref'; readonly logicalId: string }
  | {
      readonly type: 'getatt';
      readonly logicalId: string;
      readonly attr: string;
    };

export function isNonLiteral(
  x: SubFragment
): x is Extract<SubFragment, { type: 'ref' | 'getatt' }> {
  return x.type !== 'literal';
}

export function fragmentToExpr(frag: SubFragment): TemplateExpression {
  if (frag.type === 'ref') {
    return {
      type: 'intrinsic',
      fn: 'ref',
      logicalId: frag.logicalId,
    };
  }
  if (frag.type === 'getatt') {
    return {
      type: 'intrinsic',
      fn: 'getAtt',
      logicalId: frag.logicalId,
      attribute: {
        type: 'string',
        value: frag.attr,
      },
    };
  }
  return {
    type: 'string',
    value: frag.content,
  };
}
