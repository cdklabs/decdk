import * as yaml from 'yaml';
import * as yaml_cst from 'yaml/parse-cst';
import * as yaml_types from 'yaml/types';

const shortForms: yaml_types.Schema.CustomTag[] = [
  'Base64',
  'Cidr',
  'FindInMap',
  'GetAZs',
  'ImportValue',
  'Join',
  'Sub',
  'Select',
  'Split',
  'Transform',
  'And',
  'Equals',
  'If',
  'Not',
  'Or',
  'GetAtt',
]
  .map((name) => intrinsicTag(name, true))
  .concat(intrinsicTag('Ref', false), intrinsicTag('Condition', false));

export function parseCfnYaml(text: string): any {
  return yaml.parse(text, {
    customTags: shortForms,
    schema: 'core',
  });
}

function intrinsicTag(
  intrinsicName: string,
  addFnPrefix: boolean
): yaml_types.Schema.CustomTag {
  return {
    identify(value: any) {
      return typeof value === 'string';
    },
    tag: `!${intrinsicName}`,
    resolve: (_doc: yaml.Document, cstNode: yaml_cst.CST.Node) => {
      const ret: any = {};
      ret[addFnPrefix ? `Fn::${intrinsicName}` : intrinsicName] =
        // the +1 is to account for the ! the short form begins with
        parseCfnYaml(cstNode.toString().substring(intrinsicName.length + 1));
      return ret;
    },
  };
}
