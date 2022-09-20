export namespace schema {
  export interface Template {
    readonly Resources?: Record<string, Resource>;
    readonly AWSTemplateFormatVersion?: string;
    readonly Description?: string;
    readonly Metadata?: Record<any, any>;
    readonly Parameters?: Record<string, Parameter>;
    readonly Rules?: Record<string, Rule>;
    readonly Mappings?: Record<string, Mapping>;
    readonly Conditions?: Record<string, Condition>;
    readonly Transform?: string[];
    readonly Outputs?: Record<string, Output>;
  }

  export interface Resource {
    readonly Type: string;
    readonly Properties?: Record<string, CfnValue<any>>;
    readonly Condition?: string;
    readonly DependsOn?: string | string[];
    readonly DeletionPolicy?: 'Retain' | 'Delete' | 'Snapshot';
    readonly UpdateReplacePolicy?: 'Retain' | 'Delete' | 'Snapshot';
    readonly Metadata?: Record<string, any>;
    readonly CreationPolicy?: CreationPolicy;
    readonly UpdatePolicy?: UpdatePolicy;
    readonly Tags?: Tag[];
    readonly Overrides?: Override[];
    readonly On?: string;
    readonly Call?: CfnValue<any>;
  }

  export interface CreationPolicy {
    readonly AutoScalingCreationPolicy?: AutoScalingCreationPolicy;
    readonly ResourceSignal?: ResourceSignal;
  }

  export interface UpdatePolicy {
    // @todo
    [key: string]: any;
  }

  export interface AutoScalingCreationPolicy {
    readonly MinSuccessfulInstancesPercent: number;
  }

  export interface ResourceSignal {
    readonly Count: number;
    readonly Timeout: string;
  }

  export interface Parameter {
    readonly Type: string;
    readonly Description?: string;
    readonly Default?: any;
    readonly AllowedValues?: any[];
    readonly AllowedPattern?: string;
    readonly ConstraintDescription?: string;
    readonly MaxLength?: number;
    readonly MinLength?: number;
    readonly MinValue?: number;
    readonly MaxValue?: number;
    readonly NoEcho?: boolean;
  }

  export interface Rule {}

  export interface Output {
    readonly Description?: string;
    readonly Value: CfnValue<string>;
    readonly Export?: {
      readonly Name: CfnValue<string>;
    };
    readonly Condition?: string;
  }

  export interface Tag {
    readonly Key: string;
    readonly Value: string;
  }

  export interface Override {
    readonly ChildConstructPath?: string;
    readonly Update?: {
      readonly Path: string;
      readonly Value: CfnValue<any>;
    };
    readonly Delete?: {
      readonly Path: string;
    };
    readonly RemoveResource?: boolean;
  }

  export type Mapping = Record<string, any>;

  export type CfnValue<A> = A | Intrinsic;

  export type Intrinsic =
    | Ref
    | FnBase64
    | FnCidr
    | FnFindInMap
    | FnGetAZs
    | FnGetAtt
    | FnIf
    | FnImportValue
    | FnJoin
    | FnSelect
    | FnSplit
    | FnSub;

  export type Ref = { Ref: string };
  export type FnBase64 = { 'Fn::Base64': CfnValue<string> };
  export type FnCidr = {
    'Fn::Cidr': [string | FnSelect | Ref, number, number];
  };
  export type FnFindInMap = {
    'Fn::FindInMap': [CfnValue<string>, CfnValue<string>, CfnValue<string>];
  };
  export type FnGetAZs = { 'Fn::GetAZs': string | Ref };
  export type FnGetAtt = { 'Fn::GetAtt': string | [string, string | Ref] };
  export type FnIf = { 'Fn::If': [string, CfnValue<any>, CfnValue<any>] };
  export type FnImportValue = { 'Fn::ImportValue': CfnValue<string> };
  export type FnJoin = {
    'Fn::Join': [string, CfnValue<Array<CfnValue<string>>>];
  };
  export type FnSelect = { 'Fn::Select': [CfnValue<number>, CfnValue<string>] };
  export type FnSplit = { 'Fn::Split': [string, CfnValue<string>] };
  export type FnSub = {
    'Fn::Sub': string | [string, Record<string, CfnValue<string>>];
  };

  export type FnTransform = {
    'Fn::Transform': {
      readonly Name: string;
      readonly Parameters: Record<string, CfnValue<any>>;
    };
  };

  export type Condition = FnEquals | FnAnd | FnNot | FnOr;

  export type ConditionValue<A> = A | FnFindInMap | Ref;

  export type FnAnd = { 'Fn::And': Condition[] };
  export type FnOr = { 'Fn::Or': Condition[] };
  export type FnNot = { 'Fn::Not': [Condition] };
  export type FnEquals = {
    'Fn::Equals': [ConditionValue<string>, ConditionValue<string>];
  };
}
