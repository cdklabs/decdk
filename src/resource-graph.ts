class Node {
  constructor(
    public readonly id: string,
    public readonly value: any,
    public readonly adjacent: Node[] = []
  ) {}
}

interface ParsedIntrinsic {
  readonly name: string;
  readonly value: any;
}

export class ResourceGraph {
  private readonly index: Map<string, Node> = new Map();
  public readonly nodes: Node[];

  constructor(resources: any) {
    this.nodes = makeNodes(resources);
    this.nodes.forEach((node: Node) => this.index.set(node.id, node));
  }

  getResource(id: string): any | undefined {
    return this.index.get(id)?.value;
  }

  toposort() {
    const visited: Set<string> = new Set();
    const stack: Node[] = [];
    const result: Node[] = [];
    this.nodes.forEach(recurse);
    return result.reverse();

    function recurse(node: Node) {
      if (!visited.has(node.id)) {
        visited.add(node.id);
        stack.push(node);
        node.adjacent.forEach(recurse);
        result.push(stack.pop()!);
      }
    }
  }
}

function makeNodes(resources: any) {
  const refMap: Map<string, string[]> = new Map();
  Object.entries(resources).forEach(([id, resource]) => {
    refMap.set(id, extractRefs(resource));
  });

  return Object.keys(resources).map(makeNode);

  function makeNode(id: string): Node {
    if (!refMap.has(id))
      throw new Error(`Resource ${id} does not exist bla bla bla`);
    const refs = refMap.get(id)!;

    return new Node(id, resources[id], refs.map(makeNode));
  }
}

function extractRefs(resource: any): string[] {
  const result: string[] = [];
  process(resource);
  return result;

  function process(obj: any) {
    if (Array.isArray(obj)) {
      obj.forEach(process);
    }

    if (obj != null && typeof obj == 'object') {
      const id = tryResolveRef(obj);
      if (id != null) {
        result.push(id);
        return;
      }
      Object.values(obj).forEach(process);
    }
  }
}

function tryResolveRef(value: any) {
  const fn = tryParseIntrinsic(value);
  if (!fn || fn.name !== 'Ref') {
    return undefined;
  }

  return fn.value;
}

function tryParseIntrinsic(input: any): ParsedIntrinsic | undefined {
  if (typeof input !== 'object') {
    return undefined;
  }

  if (Object.keys(input).length !== 1) {
    return undefined;
  }

  const name = Object.keys(input)[0];
  const value = input[name];
  return { name, value };
}
