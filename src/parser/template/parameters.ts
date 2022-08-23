import { parseNumber } from '../private/types';
import { schema } from '../schema';

export type ContextValue = string | string[] | symbol;

export class TemplateParameters {
  constructor(private readonly parameters: Record<string, schema.Parameter>) {}

  public get required(): Record<string, schema.Parameter> {
    return Object.fromEntries(
      Object.entries(this.parameters).filter(
        ([_, param]) => param.Default == null
      )
    );
  }

  public has(name: string) {
    return !!this.parameters[name];
  }

  public parse(name: string, value: string) {
    const param = this.parameters[name];
    if (!param) {
      throw new Error(`Unknown parameter: ${name}`);
    }
    return parseParamValue(name, param, value);
  }
}

function parseParamValue(name: string, param: schema.Parameter, value: string) {
  const ptype = parseParameterType(param.Type);

  if (ptype.source === 'ssm') {
    throw new Error('SSM parameter values not yet supported');
  }

  let ret: ContextValue;
  if (ptype.type === 'list') {
    ret = value.split(',').map((x) => parseScalar(x, ptype.elementType));
  } else {
    ret = parseScalar(value, ptype);
  }

  if (param.AllowedValues && !param.AllowedValues.includes(assertString(ret))) {
    throw new Error(
      `Parameter ${name} ${
        param.ConstraintDescription ?? `not in list ${param.AllowedValues}`
      }`
    );
  }

  if (
    param.AllowedPattern &&
    !new RegExp(param.AllowedPattern).test(assertString(ret))
  ) {
    throw new Error(
      `Parameter ${name} ${
        param.ConstraintDescription ??
        `does not match pattern ${param.AllowedPattern}`
      }`
    );
  }

  // @TODO: More validations here

  return ret;

  function parseScalar(scalar: string, type: ScalarParameterType) {
    switch (type.type) {
      case 'number':
        return parseNumber(scalar).asString;
      case 'string':
        return scalar;
    }
  }
}

function assertString(x: ContextValue): string {
  if (typeof x !== 'string') {
    throw new Error(`Expected string, got ${JSON.stringify(x)}`);
  }
  return x;
}

function parseParameterType(specifier: string): ParameterType {
  let source: ParameterSource = { source: 'direct' };
  const m = specifier.match(/^AWS::SSM::Parameter::Value<(.*)>$/);
  if (m) {
    source = { source: 'ssm' };
    specifier = m[1];
  }

  if (specifier === 'CommaDelimitedList') {
    specifier = 'List<String>';
  }

  let isList = false;
  const mm = specifier.match(/^List<(.*)>$/);
  if (mm) {
    isList = true;
    specifier = mm[1];
  }

  let type: ScalarParameterType;
  switch (specifier) {
    case 'String':
      type = { type: 'string' };
      break;
    case 'Number':
      type = { type: 'number' };
      break;
    default:
      type = {
        type: 'string',
        resourceIdentifier: specifier as ResourceIdentifier,
      };
      break;
  }

  return {
    ...source,
    ...(isList ? { type: 'list', elementType: type } : type),
  };
}

export type ParameterType = (
  | ScalarParameterType
  | { readonly type: 'list'; readonly elementType: ScalarParameterType }
) &
  ParameterSource;

export type ParameterSource =
  | { readonly source: 'direct' }
  | { readonly source: 'ssm' };

export type ScalarParameterType =
  | { readonly type: 'string' }
  | { readonly type: 'number' }
  | {
      readonly type: 'string';
      readonly resourceIdentifier: ResourceIdentifier;
    };

export type ResourceIdentifier =
  | 'AWS::EC2::AvailabilityZone::Name'
  | 'AWS::EC2::Image::Id'
  | 'AWS::EC2::Instance::Id'
  | 'AWS::EC2::KeyPair::KeyName'
  | 'AWS::EC2::SecurityGroup::GroupName'
  | 'AWS::EC2::SecurityGroup::Id'
  | 'AWS::EC2::Subnet::Id'
  | 'AWS::EC2::Volume::Id'
  | 'AWS::EC2::VPC::Id'
  | 'AWS::Route53::HostedZone::Id'
  | 'AWS::SSM::Parameter::Name';
