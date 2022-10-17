import { Token } from 'aws-cdk-lib';

export function parseTransform(xs: unknown): string[] {
  if (xs == null) return [];

  if (Array.isArray(xs)) {
    return xs.map((x) => Token.asString(x));
  }

  return [Token.asString(xs)];
}
