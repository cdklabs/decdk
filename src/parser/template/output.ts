import { ifField, parseExpression, TemplateExpression } from './expression';
import { assertField, assertString } from '../private/types';
import { schema } from '../schema';

export interface TemplateOutput {
  readonly description?: string;
  readonly value: TemplateExpression;
  readonly exportName?: TemplateExpression;
  readonly conditionName?: string;
}

export function parseOutput(x: schema.Output): TemplateOutput {
  return {
    value: parseExpression(x.Value),
    conditionName: ifField(x, 'Condition', assertString),
    description: ifField(x, 'Description', assertString),
    exportName: ifField(x, 'Export', (e) =>
      parseExpression(assertField(e, 'Name'))
    ),
  };
}
