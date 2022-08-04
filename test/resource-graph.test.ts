import { ResourceGraph } from '../src/resource-graph';

describe('foo', () => {
  test('bar', () => {
    const resources = {
      xupeta: {
        foo: 1,
      },
      maloca: {
        bar: 2,
        xup: { Ref: 'xupeta' },
      },
    };

    const graph = new ResourceGraph(resources);

    console.log(graph.getResource('xupeta'));
  });
});
