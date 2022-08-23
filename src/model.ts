import { TemplateExpression } from './parser/template';

export const PSEUDO_PARAMETER_NAMES = [
  'AWS::AccountId',
  'AWS::Region',
  'AWS::Partition',
  'AWS::URLSuffix',
  'AWS::NotificationARNs',
  'AWS::StackId',
  'AWS::StackName',
  'AWS::NoValue',
];

/**
 * A raw entry in the template defining a resource. Since we can't rely on this
 * structure being valid, most property types are unknown.
 */
export interface CfnResourceEntry {
  logicalId: string;
  Type: unknown;
  Properties?: unknown;
  Overrides?: unknown;
  DependsOn?: unknown;
  Tags?: unknown;
}

/**
 * A valid, type-safe and abstract resource declaration, used by deCDK as a
 * blueprint for creating actual CDK constructs in a stack.
 */
export interface ResourceDeclaration {
  logicalId: string;
  type: string;
  properties: Record<string, TemplateExpression>;
  overrides: Override[];
  tags: Tag[];
}

export interface Tag {
  key: string;
  value: string;
}

export interface Override {
  childConstructPath?: string;
  update?: { path: string; value: unknown };
  delete?: { path: string };
  removeResource: boolean;
}

export type ReferenceType = 'Ref' | 'FnGetAtt' | 'DependsOn' | 'FnSub';

export interface Reference {
  type: ReferenceType;
  target: string;
}
