import { CdkConstruct, isCdkConstructExpression } from '../src/type-resolution';
import { TypedTemplate } from '../src/type-resolution/template';

export function getCdkConstruct(
  template: TypedTemplate,
  name: string
): CdkConstruct {
  const result = template.resources.get(name);
  if (!isCdkConstructExpression(result)) {
    fail(`${result.fqn} must be a CDK construct`);
  }
  return result;
}
