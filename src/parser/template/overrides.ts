import {
  assertExactlyOneOfFields,
  assertField,
  assertListOfForm,
  assertObject,
  assertString,
  assertTrue,
} from '../private/types';
import { ifField, parseExpression, TemplateExpression } from './expression';

export type ResourceOverride =
  | UpdateOverride
  | DeleteOverride
  | RemoveResourceOverride;
export interface UpdateOverride {
  childConstructPath?: string;
  update: { path: string; value: TemplateExpression };
  delete?: never;
  removeResource?: never;
}

export interface DeleteOverride {
  childConstructPath?: string;
  update?: never;
  delete?: { path: string };
  removeResource?: never;
}
export interface RemoveResourceOverride {
  childConstructPath: string;
  update?: never;
  delete?: never;
  removeResource: true;
}

export function parseOverrides(x: unknown): ResourceOverride[] {
  return assertListOfForm(x ?? [], parseOverride);
}

function parseOverride(x: unknown): ResourceOverride {
  const override = assertObject(x);
  const action = assertExactlyOneOfFields(override, [
    'Update',
    'Delete',
    'RemoveResource',
  ]);

  switch (action) {
    case 'Update':
      return parseUpdate(override);
    case 'Delete':
      return parseDelete(override);
    case 'RemoveResource':
      return parseRemoveResource(override);
    default:
      throw new SyntaxError('Unexpected Error');
  }
}

function parseUpdate(x: unknown): UpdateOverride {
  const override = assertObject(x);
  const update = assertField(override, 'Update');

  return {
    childConstructPath: ifField(override, 'ChildConstructPath', assertString),
    update: {
      path: assertString(assertField(assertObject(update), 'Path')),
      value: parseExpression(assertField(assertObject(update), 'Value')),
    },
  };
}

function parseDelete(x: unknown): DeleteOverride {
  const override = assertObject(x);
  const del = assertField(override, 'Delete');

  return {
    childConstructPath: ifField(override, 'ChildConstructPath', assertString),
    delete: {
      path: assertString(assertField(assertObject(del), 'Path')),
    },
  };
}

function parseRemoveResource(x: unknown): RemoveResourceOverride {
  const override = assertObject(x);
  return {
    childConstructPath: assertString(
      assertField(override, 'ChildConstructPath')
    ),
    removeResource: assertTrue(assertField(override, 'RemoveResource')),
  };
}
