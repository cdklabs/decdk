import {
  assertBoolean,
  assertList,
  assertNumber,
  assertOr,
  assertString,
  mapFromObject,
} from '../private/types';

export class TemplateMapping {
  public constructor(
    readonly mapping: Map<
      string,
      Map<string, string | string[] | number | boolean>
    >
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
  const assertValidMappingValue = (xs: unknown) =>
    assertOr<string | string[] | number | boolean>(
      xs,
      (v) =>
        `Expected one fo the following: string, list of strings, number, boolean. Got: ${v}`,
      assertString,
      assertList,
      assertNumber,
      assertBoolean
    );

  return new TemplateMapping(
    mapFromObject(xs, (m) => mapFromObject(m, assertValidMappingValue))
  );
}
