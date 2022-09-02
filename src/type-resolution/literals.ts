import { StringLiteral } from '../parser/template';

export interface DateLiteral {
  readonly type: 'date';
  readonly date: Date;
}

export function resolveDateLiteral(x: StringLiteral): DateLiteral {
  return {
    type: 'date',
    date: new Date(x.value),
  };
}
