import { assertField, assertObject, assertString } from '../private/types';
import { ifField, parseObject, TemplateExpression } from './expression';

export interface TemplateHook {
  readonly type: string;
  readonly properties?: Record<string, TemplateExpression>;
}

export function parseHook(x: unknown): TemplateHook {
  const hook = assertObject(x);

  return {
    type: assertString(assertField(hook, 'Type')),
    properties: ifField(hook, 'Properties', parseObject),
  };
}
