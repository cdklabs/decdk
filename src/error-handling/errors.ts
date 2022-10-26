import { AnnotationsContext } from './annotations';

export class DeclarativeStackError extends Error {
  constructor(public readonly annotations: AnnotationsContext) {
    super();
    this.name = 'Declarative CDK Errors';
    Object.setPrototypeOf(this, DeclarativeStackError.prototype);
  }

  public toString(debug = false) {
    return `${this.name}:\n\n${this.annotations.toString(debug)}`;
  }
}

/**
 * Thrown by the Evaluator
 */
export class RuntimeError extends Error {
  constructor(msg: string) {
    super(msg);
    this.name = 'RuntimeError';
    Object.setPrototypeOf(this, RuntimeError.prototype);
  }
}

/**
 * Annotation any Error with additional info
 */
export class AnnotatedError {
  constructor(public readonly path: string, public readonly error: Error) {}

  public toString(printStackStrace = false) {
    return `[${this.path}] ${printStackStrace ? this.error.stack : this.error}`;
  }
}
