import { assertStringOrListIntoList } from '../private/types';

export function parseTransform(xs: unknown): string[] {
  if (xs == null) {
    return [];
  }
  return assertStringOrListIntoList(xs);
}
