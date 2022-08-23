import { assertStringOrList, mapFromObject } from '../private/types';

export type TemplateMapping = Map<string, Map<string, string | string[]>>;

export function parseMapping(xs: unknown): TemplateMapping {
  return mapFromObject(xs, (m) => mapFromObject(m, assertStringOrList));
}
