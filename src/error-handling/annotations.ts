import { AnnotatedError } from './errors';

export class AnnotationsContext {
  public static root(): AnnotationsContext {
    return new AnnotationsContext();
  }

  public readonly children = new Array<AnnotationsContext>();
  public readonly path: Array<string | number> = [];
  public readonly parent?: AnnotationsContext;
  private readonly _errorsStack: AnnotatedError[] = [];

  private constructor(parent?: AnnotationsContext, path?: string | number) {
    if (parent) {
      this.path.push(...parent.path);
      this.parent = parent;
      parent.children.push(this);
    }

    if (path !== undefined) {
      this.path.push(path);
    }
  }

  public get root(): boolean {
    return !!this.parent;
  }

  public hasErrors(): boolean {
    return this.errors.length > 0;
  }

  public get errors(): AnnotatedError[] {
    return [...this._errorsStack, ...this.children.flatMap((c) => c.errors)];
  }

  public child(path: string | number): AnnotationsContext {
    return new AnnotationsContext(this, path);
  }

  public wrap<T>(fn: (ctx: AnnotationsContext) => T): T | void {
    try {
      return fn(this);
    } catch (error) {
      this.error(error as any);
    }
  }

  public error(error: Error) {
    this._errorsStack.push(new AnnotatedError(this.path, error));
  }

  public toString(printStackStrace = false) {
    return this.errors.map((e) => e.toString(printStackStrace)).join('\n\n');
  }
}
