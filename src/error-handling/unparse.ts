import {
  INTRINSIC_NAME_MAP,
  TemplateExpression,
  UserIntrinsicExpression,
} from '../parser/template';

export function unparseExpression(x: TemplateExpression): any {
  switch (x.type) {
    case 'string':
    case 'number':
    case 'boolean':
      return x.value;
    case 'null':
      return null;
    case 'array':
      return x.array.map(unparseExpression);
    case 'object':
      return Object.fromEntries(
        Object.entries(x.fields).map(([k, v]) => [k, unparseExpression(v)])
      );
    default:
      return x;
  }
}

export function intrinsicToLongForm(fn: UserIntrinsicExpression['fn']): string {
  return INTRINSIC_NAME_MAP?.[fn] ?? fn;
}
