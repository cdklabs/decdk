import { analyzeSubPattern, SubFragment } from '../private/sub';
import {
  assertField,
  assertList,
  assertObject,
  assertString,
} from '../private/types';

export type TemplateExpression =
  | StringLiteral
  | ObjectLiteral
  | ArrayLiteral
  | NumberLiteral
  | BooleanLiteral
  | NullLiteral
  | IntrinsicExpression;

export interface StringLiteral {
  readonly type: 'string';
  readonly value: string;
}

export interface NumberLiteral {
  readonly type: 'number';
  readonly value: number;
}

export interface BooleanLiteral {
  readonly type: 'boolean';
  readonly value: boolean;
}

export interface NullLiteral {
  readonly type: 'null';
}

export interface ObjectExpression<T> {
  readonly type: 'object';
  readonly fields: Record<string, T>;
}

export interface ArrayExpression<T> {
  readonly type: 'array';
  readonly array: T[];
}

export interface ArrayLiteral extends ArrayExpression<TemplateExpression> {}
export interface ObjectLiteral extends ObjectExpression<TemplateExpression> {}

export type IntrinsicExpression = UserIntrinsicExpression | LazyLogicalId;

export type UserIntrinsicExpression =
  | RefIntrinsic
  | GetAttIntrinsic
  | GetPropIntrinsic
  | Base64Intrinsic
  | CidrIntrinsic
  | FindInMapIntrinsic
  | GetAZsIntrinsic
  | IfIntrinsic
  | ImportValueIntrinsic
  | JoinIntrinsic
  | SelectIntrinsic
  | SplitIntrinsic
  | SubIntrinsic
  | TransformIntrinsic
  | AndIntrinsic
  | OrIntrinsic
  | NotIntrinsic
  | EqualsIntrinsic
  | ArgsIntrinsic
  | LengthIntrinsic
  | ToJsonStringIntrinsic;

export interface RefIntrinsic {
  readonly type: 'intrinsic';
  readonly fn: 'ref';
  readonly logicalId: string;
}

export interface GetAttIntrinsic {
  readonly type: 'intrinsic';
  readonly fn: 'getAtt';
  readonly logicalId: string;
  readonly attribute: TemplateExpression;
}

export interface GetPropIntrinsic {
  readonly type: 'intrinsic';
  readonly fn: 'getProp';
  readonly logicalId: string;
  readonly property: string;
}

export interface Base64Intrinsic {
  readonly type: 'intrinsic';
  readonly fn: 'base64';
  readonly expression: TemplateExpression;
}

export interface CidrIntrinsic {
  readonly type: 'intrinsic';
  readonly fn: 'cidr';
  readonly ipBlock: TemplateExpression;
  readonly count: TemplateExpression;
  readonly netMask?: TemplateExpression;
}

export interface FindInMapIntrinsic {
  readonly type: 'intrinsic';
  readonly fn: 'findInMap';
  readonly mappingName: TemplateExpression;
  readonly key1: TemplateExpression;
  readonly key2: TemplateExpression;
}

export interface GetAZsIntrinsic {
  readonly type: 'intrinsic';
  readonly fn: 'getAzs';
  readonly region: TemplateExpression;
}

export interface IfIntrinsic {
  readonly type: 'intrinsic';
  readonly fn: 'if';
  readonly conditionName: string;
  readonly then: TemplateExpression;
  readonly else: TemplateExpression;
}

export interface ImportValueIntrinsic {
  readonly type: 'intrinsic';
  readonly fn: 'importValue';
  readonly export: TemplateExpression;
}

export interface JoinIntrinsic {
  readonly type: 'intrinsic';
  readonly fn: 'join';
  readonly separator: string;
  readonly list: ListIntrinsic;
}

export interface SelectIntrinsic {
  readonly type: 'intrinsic';
  readonly fn: 'select';
  readonly index: TemplateExpression;
  readonly objects: ListIntrinsic;
}

export interface SplitIntrinsic {
  readonly type: 'intrinsic';
  readonly fn: 'split';
  readonly separator: string;
  readonly value: TemplateExpression;
}

export interface SubIntrinsic {
  readonly type: 'intrinsic';
  readonly fn: 'sub';
  readonly fragments: SubFragment[];
  readonly additionalContext: Record<string, TemplateExpression>;
}

export interface TransformIntrinsic {
  readonly type: 'intrinsic';
  readonly fn: 'transform';
  readonly transformName: string;
  readonly parameters: Record<string, TemplateExpression>;
}

export interface AndIntrinsic {
  readonly type: 'intrinsic';
  readonly fn: 'and';
  readonly operands: TemplateExpression[];
}

export interface OrIntrinsic {
  readonly type: 'intrinsic';
  readonly fn: 'or';
  readonly operands: TemplateExpression[];
}

export interface NotIntrinsic {
  readonly type: 'intrinsic';
  readonly fn: 'not';
  readonly operand: TemplateExpression;
}

export interface EqualsIntrinsic {
  readonly type: 'intrinsic';
  readonly fn: 'equals';
  readonly value1: TemplateExpression;
  readonly value2: TemplateExpression;
}

export interface ArgsIntrinsic {
  readonly type: 'intrinsic';
  readonly fn: 'args';
  readonly array: TemplateExpression[];
}

export interface LazyLogicalId {
  readonly type: 'intrinsic';
  readonly fn: 'lazyLogicalId';
  readonly value?: string;
  readonly errorMessage?: string;
}

export interface LengthIntrinsic {
  readonly type: 'intrinsic';
  readonly fn: 'length';
  readonly list: ListIntrinsic;
}

export interface ToJsonStringIntrinsic {
  readonly type: 'intrinsic';
  readonly fn: 'toJsonString';
  readonly value: Record<string, TemplateExpression>;
}

export const INTRINSIC_NAME_MAP: Record<
  Exclude<IntrinsicExpression['fn'], 'lazyLogicalId'>,
  string
> = {
  ref: 'Ref',
  getAtt: 'Fn::GetAtt',
  getProp: 'CDK::GetProp',
  base64: 'Fn::Base64',
  cidr: 'Fn::Cidr',
  findInMap: 'Fn::FindInMap',
  getAzs: 'Fn::GetAZs',
  if: 'Fn::If',
  importValue: 'Fn::ImportValue',
  join: 'Fn::Join',
  select: 'Fn::Select',
  split: 'Fn::Split',
  sub: 'Fn::Sub',
  transform: 'Fn::Transform',
  and: 'Fn::And',
  or: 'Fn::Or',
  not: 'Fn::Not',
  equals: 'Fn::Equals',
  args: 'CDK::Args',
  length: 'Fn::Length',
  toJsonString: 'Fn::ToJsonString',
};

export function isExpression(x: unknown): x is TemplateExpression {
  try {
    assertExpression(x);
    return true;
  } catch (_) {
    return false;
  }
}

export function assertExpression(x: unknown): TemplateExpression {
  const expressionType = assertString(assertField(assertObject(x), 'type'));
  const expressionTypes = [
    'string',
    'boolean',
    'number',
    'object',
    'array',
    'intrinsic',
  ];
  if (!expressionTypes.includes(expressionType)) {
    throw new SyntaxError(
      `Expected ${expressionTypes.join('|')}, got: '${JSON.stringify(
        expressionType
      )}'`
    );
  }

  return x as TemplateExpression;
}

export function parseExpression(x: unknown): TemplateExpression {
  if (x == null) {
    return { type: 'null' };
  }
  if (typeof x === 'string') {
    return { type: 'string', value: x };
  }
  if (typeof x === 'number') {
    return { type: 'number', value: x };
  }
  if (typeof x === 'boolean') {
    return { type: 'boolean', value: x };
  }

  if (Array.isArray(x)) {
    return { type: 'array', array: x.map(parseExpression) };
  }

  const INTRINSIC_TABLE: Record<string, (x: unknown) => IntrinsicExpression> = {
    [INTRINSIC_NAME_MAP.ref]: (value) => ({
      type: 'intrinsic',
      fn: 'ref',
      logicalId: assertString(value),
    }),
    [INTRINSIC_NAME_MAP.getAtt]: (value) => {
      if (typeof value == 'string') {
        const [id, ...attrs] = value.split('.');
        value = [id, attrs.join('.')];
      }
      const xs = assertList(value, [2]);
      return {
        type: 'intrinsic',
        fn: 'getAtt',
        logicalId: assertString(xs[0]),
        attribute: parseExpression(xs[1]),
      };
    },
    [INTRINSIC_NAME_MAP.getProp]: (value) => {
      if (typeof value == 'string') {
        const [id, ...attrs] = value.split('.');
        value = [id, attrs.join('.')];
      }
      const xs = assertList(value, [2]);
      return {
        type: 'intrinsic',
        fn: 'getProp',
        logicalId: assertString(xs[0]),
        property: assertString(xs[1]),
      };
    },
    [INTRINSIC_NAME_MAP.base64]: (value) => ({
      type: 'intrinsic',
      fn: 'base64',
      expression: parseExpression(value),
    }),
    [INTRINSIC_NAME_MAP.cidr]: (value) => {
      const xs = assertList(value, [2, 3]);
      return {
        type: 'intrinsic',
        fn: 'cidr',
        ipBlock: parseExpression(xs[0]),
        count: parseExpression(xs[1]),
        netMask: xs[2] ? parseExpression(xs[2]) : undefined,
      };
    },
    [INTRINSIC_NAME_MAP.findInMap]: (value) => {
      const xs = assertList(value, [3]);
      return {
        type: 'intrinsic',
        fn: 'findInMap',
        mappingName: parseExpression(xs[0]),
        key1: parseExpression(xs[1]),
        key2: parseExpression(xs[2]),
      };
    },
    [INTRINSIC_NAME_MAP.getAzs]: (value) => ({
      type: 'intrinsic',
      fn: 'getAzs',
      region: parseExpression(value),
    }),
    [INTRINSIC_NAME_MAP.if]: (value) => {
      const xs = assertList(value, [3]);
      return {
        type: 'intrinsic',
        fn: 'if',
        conditionName: assertString(xs[0]),
        then: parseExpression(xs[1]),
        else: parseExpression(xs[2]),
      };
    },
    [INTRINSIC_NAME_MAP.importValue]: (value) => ({
      type: 'intrinsic',
      fn: 'importValue',
      export: parseExpression(value),
    }),
    [INTRINSIC_NAME_MAP.join]: (value) => {
      const xs = assertList(value, [2]);
      return {
        type: 'intrinsic',
        fn: 'join',
        separator: assertString(xs[0]),
        list: parseListIntrinsic(xs[1]),
      };
    },
    [INTRINSIC_NAME_MAP.select]: (value) => {
      const xs = assertList(value, [2]);
      return {
        type: 'intrinsic',
        fn: 'select',
        index: parseExpression(xs[0]),
        objects: parseListIntrinsic(xs[1]),
      };
    },
    [INTRINSIC_NAME_MAP.split]: (value) => {
      const xs = assertList(value, [2]);
      return {
        type: 'intrinsic',
        fn: 'split',
        separator: assertString(xs[0]),
        value: parseExpression(xs[1]),
      };
    },
    [INTRINSIC_NAME_MAP.sub]: (value) => {
      let pattern: string;
      let context: Record<string, TemplateExpression>;
      if (typeof value === 'string') {
        pattern = value;
        context = {};
      } else if (Array.isArray(value)) {
        const xs = assertList(value);
        pattern = assertString(xs[0]);
        context = parseObject(xs[1]);
      } else {
        throw new Error(`Argument to {Fn::Sub} is of wrong type`);
      }

      const fragments = analyzeSubPattern(pattern);
      return {
        type: 'intrinsic',
        fn: 'sub',
        fragments,
        additionalContext: context,
      };
    },
    [INTRINSIC_NAME_MAP.transform]: (value) => {
      const fields = assertObject(value);

      const parameters = parseObject(assertField(fields, 'Parameters'));
      return {
        type: 'intrinsic',
        fn: 'transform',
        transformName: assertString(assertField(fields, 'Name')),
        parameters,
      };
    },
    [INTRINSIC_NAME_MAP.and]: (value) => {
      return {
        type: 'intrinsic',
        fn: 'and',
        operands: assertList(value).map(parseExpression),
      };
    },
    [INTRINSIC_NAME_MAP.or]: (value) => {
      return {
        type: 'intrinsic',
        fn: 'or',
        operands: assertList(value).map(parseExpression),
      };
    },
    [INTRINSIC_NAME_MAP.not]: (value) => {
      return {
        type: 'intrinsic',
        fn: 'not',
        operand: parseExpression(value),
      };
    },
    [INTRINSIC_NAME_MAP.equals]: (value) => {
      const [x1, x2] = assertList(value, [2]);
      return {
        type: 'intrinsic',
        fn: 'equals',
        value1: parseExpression(x1),
        value2: parseExpression(x2),
      };
    },
    [INTRINSIC_NAME_MAP.args]: (value) => {
      return {
        type: 'intrinsic',
        fn: 'args',
        array: assertList(value).map(parseExpression),
      };
    },
    [INTRINSIC_NAME_MAP.length]: (value) => {
      return {
        type: 'intrinsic',
        fn: 'length',
        list: parseListIntrinsic(value),
      };
    },
    [INTRINSIC_NAME_MAP.toJsonString]: (value) => {
      return {
        type: 'intrinsic',
        fn: 'toJsonString',
        value: parseObject(value),
      };
    },
  };

  if (typeof x === 'object' && x) {
    const keys = Object.keys(x);
    if (keys.length === 1 && INTRINSIC_TABLE[keys[0]]) {
      return INTRINSIC_TABLE[keys[0]]((x as any)[keys[0]]);
    }
    return {
      type: 'object',
      fields: parseObject(x),
    };
  }

  throw new Error(`Unable to parse: ${JSON.stringify(x)}`);
}

export function parseObject(x: unknown) {
  if (x === undefined) {
    return {};
  }

  return Object.fromEntries(
    Object.entries(assertObject(x)).map(([k, v]) => [k, parseExpression(v)])
  );
}

type ListIntrinsic =
  | ArrayLiteral
  | RefIntrinsic
  | CidrIntrinsic
  | FindInMapIntrinsic
  | GetAttIntrinsic
  | GetAZsIntrinsic
  | IfIntrinsic
  | SplitIntrinsic;

function parseListIntrinsic(xs: unknown): ListIntrinsic {
  if (Array.isArray(xs)) {
    return parseExpression(xs) as ArrayLiteral;
  } else {
    return assertIntrinsic(parseExpression(xs), [
      'ref',
      'cidr',
      'findInMap',
      'getAtt',
      'getAzs',
      'if',
      'split',
    ]);
  }
}

export function ifField<A extends object, K extends keyof A, B>(
  xs: A,
  k: K,
  fn: (x: NonNullable<A[K]>) => B
): B | undefined {
  if (xs[k] != null) {
    return fn(xs[k] as any);
  }
  return undefined;
}

export function assertIntrinsic<T extends IntrinsicExpression['fn']>(
  x: TemplateExpression,
  fns: T[]
): IntrinsicExpression & { fn: T } {
  for (const fn of fns) {
    if (x.type === 'intrinsic' && fn === x.fn) {
      return x as IntrinsicExpression & { fn: typeof fn };
    }
  }

  throw new SyntaxError(
    `Expected one of Intrinsic Functions [${fns.join(
      '|'
    )}], got: ${JSON.stringify(x)}`
  );
}

/**
 * Wraps an expression inside an ArrayLiteral. If it is already an ArrayLiteral,
 * return the expression unmodified.
 */
export function asArrayLiteral(x: TemplateExpression): ArrayLiteral {
  return x.type === 'array'
    ? x
    : {
        type: 'array',
        array: [x],
      };
}
