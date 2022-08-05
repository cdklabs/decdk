import { topologicalSort } from '../lib/toposort';

describe('Topological sort', () => {
  test('already sorted', () => {
    const resources = {
      Bar: {
        Type: 'cdk.Bar',
      },
      Foo: {
        Type: 'cdk.Foo',
        Properties: {
          bar: { Ref: 'Bar' },
        },
      },
    };

    const sorted = topologicalSort(resources);

    expect(sorted).toEqual([
      [
        'Bar',
        {
          Type: 'cdk.Bar',
        },
      ],
      [
        'Foo',
        {
          Type: 'cdk.Foo',
          Properties: {
            bar: { Ref: 'Bar' },
          },
        },
      ],
    ]);
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

    expect(sorted).toEqual([
      [
        'Bar',
        {
          Type: 'cdk.Bar',
        },
      ],
      [
        'Foo',
        {
          Type: 'cdk.Foo',
          Properties: {
            bar: { Ref: 'Bar' },
          },
        },
      ],
    ]);
  });

  test('disconnected graph', () => {
    const resources = {
      A: {
        Type: 'cdk.Foo',
        Properties: {
          bar: { Ref: 'B' },
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

    expect(sorted).toEqual([
      [
        'B',
        {
          Type: 'cdk.Foo',
        },
      ],
      [
        'A',
        {
          Type: 'cdk.Foo',
          Properties: {
            bar: { Ref: 'B' },
          },
        },
      ],
      [
        'C',
        {
          Type: 'cdk.Foo',
        },
      ],
      [
        'D',
        {
          Type: 'cdk.Foo',
          Properties: {
            bar: [{ Ref: 'C' }],
          },
        },
      ],
    ]);
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
