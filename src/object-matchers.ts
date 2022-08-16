import { PSEUDO_PARAMETER_NAMES, Reference } from './model';

export interface Matcher {
  match(value: unknown): Reference[];
}

export class RefMatcher implements Matcher {
  constructor(
    private readonly parameterNames: string[],
    private readonly resourceNames: string[]
  ) {}

  match(value: unknown): Reference[] {
    if (
      value != null &&
      typeof value === 'object' &&
      Object.entries(value).length === 1
    ) {
      const [key, val] = Object.entries(value)[0];
      if (key === 'Ref') {
        if (typeof val !== 'string') {
          throw new Error("The target of a 'Ref' call must be a string");
        }
        if (this.resourceNames.includes(val)) {
          return [{ type: 'Ref', target: val }];
        }
        if (
          this.parameterNames.includes(val) ||
          PSEUDO_PARAMETER_NAMES.includes(val)
        ) {
          return [];
        }
        throw new Error(
          `'${val}' must be either a parameter name or a resource name`
        );
      }
    }
    return [];
  }
}

export class FnGetAttMatcher implements Matcher {
  constructor(private readonly resourceNames: string[]) {}

  match(value: unknown): Reference[] {
    if (
      value != null &&
      typeof value === 'object' &&
      Object.entries(value).length === 1
    ) {
      const [key, val] = Object.entries(value)[0];
      if (key === 'Fn::GetAtt') {
        if (Array.isArray(val)) {
          if (val.length !== 2) {
            throw new Error(
              'The value Fn::GetAtt must be an array with two elements'
            );
          }

          if (val.some((v) => typeof v !== 'string')) {
            throw new Error(
              'The value Fn::GetAtt must be contain only strings'
            );
          }

          if (this.resourceNames.includes(val[0])) {
            return [{ type: 'FnGetAtt', target: val[0] }];
          }

          throw new Error(
            `'${val[0]}' must be either a parameter name or a resource name`
          );
        }
        throw new Error('The value Fn::GetAtt must be an array');
      }
    }

    return [];
  }
}

export class FnSubMatcher implements Matcher {
  constructor(
    private readonly parameterNames: string[],
    private readonly resourceNames: string[]
  ) {}

  match(value: unknown): Reference[] {
    const regex = /\$\{([A-Za-z0-9]+)}/g;

    if (
      value != null &&
      typeof value === 'object' &&
      Object.entries(value).length === 1
    ) {
      const [key, val] = Object.entries(value)[0];
      if (key === 'Fn::Sub') {
        if (Array.isArray(val)) {
          if (typeof val[0] !== 'string') {
            throw new Error(
              'The first element of the Fn::Sub target must be a string.'
            );
          }
          const str = val[0];

          const variableMap = val[1] ?? {};
          if (
            typeof variableMap !== 'object' ||
            Object.values(variableMap).some(
              (v) => typeof v === 'object' || typeof v === 'function'
            )
          ) {
            throw new Error(
              'The second element of the Fn::Sub target must be a key-value list.'
            );
          }

          const matchedNames = [...str.matchAll(regex)].map((v) => v[1]);

          const unrecognized = matchedNames.filter(
            (v) =>
              !this.resourceNames.includes(v) &&
              !this.parameterNames.includes(v) &&
              !Object.keys(variableMap).includes(v)
          );

          if (unrecognized.length > 0) {
            const names = unrecognized.map((name) => `'${name}'`).join(', ');
            throw new Error(
              `The following variables are neither resources nor parameter names: ${names}`
            );
          }

          return matchedNames
            .filter((v) => this.resourceNames.includes(v))
            .map((name) => ({ type: 'FnSub', target: name }));
        }
        throw new Error('The Fn::Sub target must be an array.');
      }
    }
    return [];
  }
}

export class DependsOnMatcher implements Matcher {
  constructor(private readonly resourceNames: string[]) {}

  match(value: unknown): Reference[] {
    if (value != null && typeof value === 'object') {
      const dependencyNames = Object.entries(value)
        .filter(([k, _]) => k === 'DependsOn')
        .flatMap(([_, v]) => v);

      const unrecognized = dependencyNames.filter(
        (name) => !this.resourceNames.includes(name)
      );

      if (unrecognized.length > 0) {
        throw new Error('DependsOn values must be resource names.');
      }

      return dependencyNames.map((name) => ({
        type: 'DependsOn',
        target: name,
      }));
    }
    return [];
  }
}

export class CompositeMatcher implements Matcher {
  private readonly terminalMatchers: Matcher[];
  private readonly nonTerminalMatchers: Matcher[];

  constructor(parameterNames: string[], resourceNames: string[]) {
    this.terminalMatchers = [
      new RefMatcher(parameterNames, resourceNames),
      new FnSubMatcher(parameterNames, resourceNames),
      new FnGetAttMatcher(resourceNames),
    ];
    this.nonTerminalMatchers = [new DependsOnMatcher(resourceNames)];
  }

  match(value: unknown): Reference[] {
    return compositeMatch(
      this.terminalMatchers,
      this.nonTerminalMatchers,
      value
    );
  }
}

function compositeMatch(
  terminal: Matcher[],
  nonTerminal: Matcher[],
  value: unknown
): Reference[] {
  if (Array.isArray(value)) {
    return value.flatMap((v) => compositeMatch(terminal, nonTerminal, v));
  }

  if (value !== null && typeof value === 'object') {
    const matches = terminal.flatMap((m) => m.match(value));
    if (matches.length > 0) {
      return matches;
    }
    const localResult = nonTerminal.flatMap((m) => m.match(value));
    const additional = Object.values(value).flatMap((v) =>
      compositeMatch(terminal, nonTerminal, v)
    );
    return localResult.concat(additional);
  }

  return [];
}
