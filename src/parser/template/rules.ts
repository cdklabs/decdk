import { assertField, assertList, assertObject } from '../private/types';

/* The fields `assert` and `ruleCondition` should be rule-specific intrinsic
functions. Within these functions, it's only allowed to use other rule-specific
functions or `Ref`. But `Ref` in this context should only be used to reference
parameters. So we can skip the parsing of these two fields, pass it to the CDK
as they are, and let CloudFormation do the validation on the generated template.
*/

export interface Assertion {
  readonly assert: any;
  readonly assertDescription: string;
}

export interface TemplateRule {
  readonly ruleCondition?: any;
  readonly assertions: Assertion[];
}

export function parseRule(x: unknown): TemplateRule {
  const rule = assertObject(x);

  return {
    assertions: assertList(assertField(rule, 'Assertions')),
    ruleCondition: rule.RuleCondition,
  };
}
