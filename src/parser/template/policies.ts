import {
  assertBoolean,
  assertField,
  assertList,
  assertNumber,
  assertObject,
  assertString,
} from '../private/types';
import { ifField } from './expression';

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

export interface UpdatePolicy {
  readonly autoScalingReplacingUpdate?: AutoScalingReplacingUpdate;
  readonly autoScalingRollingUpdate?: AutoScalingRollingUpdate;
  readonly autoScalingScheduledAction?: AutoScalingScheduledAction;
  readonly codeDeployLambdaAliasUpdate?: CodeDeployLambdaAliasUpdate;
  readonly useOnlineResharding?: boolean;
  readonly enableVersionUpgrade?: boolean;
}

export interface AutoScalingReplacingUpdate {
  readonly willReplace?: boolean;
}

export interface AutoScalingRollingUpdate {
  readonly maxBatchSize?: number;
  readonly minInstancesInService?: number;
  readonly minSuccessfulInstancesPercent?: number;
  readonly pauseTime?: string;
  readonly suspendProcesses?: string[];
  readonly waitOnResourceSignals?: boolean;
}

export interface AutoScalingScheduledAction {
  readonly ignoreUnmodifiedGroupSizeProperties?: boolean;
}

export interface CodeDeployLambdaAliasUpdate {
  readonly applicationName: string;
  readonly deploymentGroupName: string;
  readonly beforeAllowTrafficHook?: string;
  readonly afterAllowTrafficHook?: string;
}

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

export function parseUpdatePolicy(x: unknown): UpdatePolicy | undefined {
  if (x == null) {
    return undefined;
  }

  const value = assertObject(x);
  return {
    useOnlineResharding: ifField(value, 'UseOnlineResharding', assertBoolean),
    autoScalingReplacingUpdate: ifField(
      value,
      'AutoScalingReplacingUpdate',
      parseAutoScalingReplacingUpdate
    ),
    autoScalingRollingUpdate: ifField(
      value,
      'AutoScalingRollingUpdate',
      parseAutoScalingRollingUpdate
    ),
    autoScalingScheduledAction: ifField(
      value,
      'AutoScalingScheduledAction',
      parseAutoScalingScheduledAction
    ),
    codeDeployLambdaAliasUpdate: ifField(
      value,
      'CodeDeployLambdaAliasUpdate',
      parseCodeDeployLambdaAliasUpdate
    ),
    enableVersionUpgrade: ifField(value, 'EnableVersionUpgrade', assertBoolean),
  };
}

function parseAutoScalingReplacingUpdate(
  x: unknown
): AutoScalingReplacingUpdate {
  const value = assertObject(x);
  return {
    willReplace: ifField(value, 'WillReplace', assertBoolean),
  };
}

function parseAutoScalingRollingUpdate(x: unknown): AutoScalingRollingUpdate {
  const value = assertObject(x);
  return {
    maxBatchSize: ifField(value, 'MaxBatchSize', assertNumber),
    minInstancesInService: ifField(
      value,
      'MinInstancesInService',
      assertNumber
    ),
    pauseTime: ifField(value, 'PauseTime', assertString),
    suspendProcesses: ifField(value, 'SuspendProcesses', (sp) =>
      assertList<string>(sp)
    ),
    waitOnResourceSignals: ifField(
      value,
      'WaitOnResourceSignals',
      assertBoolean
    ),
    minSuccessfulInstancesPercent: ifField(
      value,
      'MinSuccessfulInstancesPercent',
      assertNumber
    ),
  };
}

function parseAutoScalingScheduledAction(
  x: unknown
): AutoScalingScheduledAction {
  const value = assertObject(x);
  return {
    ignoreUnmodifiedGroupSizeProperties: ifField(
      value,
      'IgnoreUnmodifiedGroupSizeProperties',
      assertBoolean
    ),
  };
}

function parseCodeDeployLambdaAliasUpdate(
  x: unknown
): CodeDeployLambdaAliasUpdate {
  const value = assertObject(x);
  return {
    afterAllowTrafficHook: ifField(
      value,
      'AfterAllowTrafficHook',
      assertString
    ),
    applicationName: assertString(assertField(value, 'ApplicationName')),
    beforeAllowTrafficHook: ifField(
      value,
      'BeforeAllowTrafficHook',
      assertString
    ),
    deploymentGroupName: assertString(
      assertField(value, 'DeploymentGroupName')
    ),
  };
}
