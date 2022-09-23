import { assertStringOrList, mapFromObject } from '../private/types';

export class TemplateMapping {
  public constructor(
    readonly mapping: Map<string, Map<string, string | string[]>>
  ) {}

  public toObject(): {
    [k1: string]: {
      [k2: string]: any;
    };
  } {
    return Object.fromEntries(
      Array.from(this.mapping).map(([key, secondLevel]) => [
        key,
        Object.fromEntries(secondLevel),
      ])
    );
  }
}

export function parseMapping(xs: unknown): TemplateMapping {
  return new TemplateMapping(
    mapFromObject(xs, (m) => mapFromObject(m, assertStringOrList))
  );
}
