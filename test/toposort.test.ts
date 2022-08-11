import { topologicalSort } from '../lib/toposort';

describe('Topological sort', () => {
  test('already sorted', () => {
    const resources = {
      Bar: {
        Type: 'cdk.Bar',
      },
      Foo: {
        Type: 'cdk.Foo',
        DependsOn: 'Bar',
      },
    };

    const sorted = topologicalSort(resources);

    expect(sorted.map(toId)).toEqual(['Bar', 'Foo']);
  });

  test('not sorted', () => {
    const resources = {
      Foo: {
        Type: 'cdk.Foo',
        Properties: {
          bar: { Ref: 'Bar' },
        },
      },
      Bar: {
        Type: 'cdk.Bar',
      },
    };

    const sorted = topologicalSort(resources);

    expect(sorted.map(toId)).toEqual(['Bar', 'Foo']);
  });

  test('disconnected graph', () => {
    const resources = {
      A: {
        Type: 'cdk.Foo',
        Properties: {
          bar: { 'Fn::GetAtt': ['B', 'name'] },
        },
      },
      B: {
        Type: 'cdk.Foo',
      },
      C: {
        Type: 'cdk.Foo',
      },
      D: {
        Type: 'cdk.Foo',
        Properties: {
          bar: [{ Ref: 'C' }],
        },
      },
    };

    const sorted = topologicalSort(resources);

    expect(sorted.map(toId)).toEqual(['B', 'A', 'C', 'D']);
  });

  test('cycles', () => {
    const resources = {
      A: {
        Type: 'cdk.Foo',
        Properties: {
          b: { Ref: 'B' },
        },
      },
      B: {
        Type: 'cdk.Foo',
        Properties: {
          c: { Ref: 'C' },
        },
      },
      C: {
        Type: 'cdk.Foo',
        Properties: {
          a: { Ref: 'A' },
        },
      },
    };

    expect(() => topologicalSort(resources)).toThrow(
      'Cycle detected: A -> B -> C -> A'
    );
  });
});

function toId(entry: [string, any]): string {
  return entry[0];
}
