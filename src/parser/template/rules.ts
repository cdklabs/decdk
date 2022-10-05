import {
  assertField,
  assertList,
  assertObject,
  assertString,
} from '../private/types';
import {
  assertIntrinsic,
  ifField,
  IntrinsicExpression,
  parseExpression,
} from './expression';

export interface Assertion {
  readonly assert: IntrinsicExpression;
  readonly assertDescription: string;
}

export interface TemplateRule {
  readonly ruleCondition?: IntrinsicExpression;
  readonly assertions: Assertion[];
}

export function parseRule(x: unknown): TemplateRule {
  const rule = assertObject(x);
  const ruleCondition = ifField(
    rule,
    'RuleCondition',
    parseRuleSpecificIntrinsic
  );
  const assertions: Assertion[] = assertList(
    assertField(rule, 'Assertions')
  ).map(parseAssertion);

  return { assertions, ruleCondition };
}

function parseAssertion(x: unknown): Assertion {
  const assertion = assertObject(x);
  const assert = parseRuleSpecificIntrinsic(assertField(assertion, 'Assert'));
  const assertDescription = assertString(
    assertField(assertion, 'AssertDescription')
  );

  return { assert, assertDescription };
}

function parseRuleSpecificIntrinsic(x: unknown) {
  return assertIntrinsic(parseExpression(x), [
    'and',
    'contains',
    'eachMemberEquals',
    'eachMemberIn',
    'equals',
    'if',
    'not',
    'or',
    'refAll',
    'valueOf',
    'valueOfAll',
  ]);
}
