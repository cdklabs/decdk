import { assertStringOrListIntoList } from '../private/types';

export function parseTransform(xs: unknown): string[] {
  return xs == null ? [] : assertStringOrListIntoList(xs);
}
