import {
  assertField,
  assertListOfForm,
  assertObject,
  assertString,
} from '../private/types';
import { schema } from '../schema';

export interface ResourceTag {
  key: string;
  value: string;
}

export function parseTags(x: schema.Resource['Tags']): ResourceTag[] {
  return assertListOfForm(x ?? [], parseTag, '{Key: string, Value: string}');
}

function parseTag(x: unknown): ResourceTag {
  const t = assertObject(x);

  return {
    key: assertString(assertField(t, 'Key')),
    value: assertString(assertField(t, 'Value')),
  };
}
