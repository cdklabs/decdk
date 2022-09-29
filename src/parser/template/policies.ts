export interface CreationPolicy {
  readonly autoScalingCreationPolicy?: AutoScalingCreationPolicy;
  readonly resourceSignal?: ResourceSignal;
}

export interface AutoScalingCreationPolicy {
  readonly minSuccessfulInstancesPercent?: number;
}

export interface ResourceSignal {
  readonly count?: number;
  readonly timeout?: string;
}

import { assertNumber, assertObject, assertString } from '../private/types';
import { ifField } from './expression';

export function parseCreationPolicy(x: unknown): CreationPolicy | undefined {
  if (x == null) {
    return undefined;
  }
  const policy = assertObject(x);

  return {
    autoScalingCreationPolicy: ifField(
      policy,
      'AutoScalingCreationPolicy',
      parseAutoScalingCreationPolicy
    ),
    resourceSignal: ifField(policy, 'ResourceSignal', parseResourceSignal),
  };
}

function parseAutoScalingCreationPolicy(x: unknown): AutoScalingCreationPolicy {
  return {
    minSuccessfulInstancesPercent: ifField(
      assertObject(x),
      'MinSuccessfulInstancesPercent',
      assertNumber
    ),
  };
}

function parseResourceSignal(x: unknown): ResourceSignal {
  return {
    count: ifField(assertObject(x), 'Count', assertNumber),
    timeout: ifField(assertObject(x), 'Timeout', assertString),
  };
}
