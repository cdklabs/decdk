import { CfnParameterProps } from 'aws-cdk-lib';
import {
  assertBoolean,
  assertList,
  assertNumber,
  assertObject,
  assertString,
} from '../private/types';
import { ifField } from './expression';

export interface TemplateParameter extends CfnParameterProps {}

export function parseParameter(x: unknown): TemplateParameter {
  const param = assertObject(x);

  return {
    type: ifField(param, 'Type', assertString),
    default: param.Default,
    allowedPattern: ifField(param, 'AllowedPattern', assertString),
    allowedValues: ifField(param, 'AllowedValues', assertList) as string[],
    constraintDescription: ifField(
      param,
      'ConstraintDescription',
      assertString
    ),
    description: ifField(param, 'Description', assertString),
    maxLength: ifField(param, 'MaxLength', assertNumber),
    maxValue: ifField(param, 'MaxValue', assertNumber),
    minLength: ifField(param, 'MinLength', assertNumber),
    minValue: ifField(param, 'MinValue', assertNumber),
    noEcho: ifField(param, 'NoEcho', assertBoolean),
  };
}
