import { DirectedAcyclicGraph, Edge } from '../src/graph';

describe(DirectedAcyclicGraph, () => {
  const vertices = {
    a: 1,
    b: 2,
    c: 3,
    d: 4,
  };

  const edges: Record<string, Edge<string>[]> = {
    a: [
      { target: 'b', label: 'foo' },
      { target: 'c', label: 'foo' },
    ],
    b: [{ target: 'd', label: 'foo' }],
    c: [{ target: 'd', label: 'foo' }],
    d: [],
  };

  const graph = new DirectedAcyclicGraph<number, string>(vertices, edges);

  test('Topologically sorted vertices', () => {
    expect(graph.sortedVertices).toEqual([4, 2, 3, 1]);
  });

  test('edgeless graph', () => {
    const g = new DirectedAcyclicGraph(vertices, {
      a: [],
      b: [],
      c: [],
      d: [],
    });
    expect(g.sortedVertices).toEqual([1, 2, 3, 4]);
  });

  test('Edges must form a map from vertices to vertices', () => {
    const makeGraph = () =>
      new DirectedAcyclicGraph(vertices, {
        a: [
          { target: 'b', label: 'foo' },
          { target: 'c', label: 'foo' },
        ],
        e: [{ target: 'f', label: 'foo' }],
        f: [],
      });
    expect(makeGraph).toThrow('Vertices and edges must have the same keys');
  });

  test('map', () => {
    const squares = graph.map((x) => x * x);
    expect(squares.sortedVertices).toEqual([16, 4, 9, 1]);
  });

  test('extended map', () => {
    const sumOfVertexAndAdjacents = graph.mapWithAdjacent(
      (x, xs) => x + xs.reduce((a, b) => a + b, 0)
    );

    const sortedVertices = sumOfVertexAndAdjacents.sortedVertices;
    expect(sortedVertices).toEqual([4, 6, 7, 6]);
  });
});
