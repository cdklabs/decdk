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

const unsupportedTags = [
  'tag:yaml.org,2002:binary',
  'tag:yaml.org,2002:omap',
  'tag:yaml.org,2002:pairs',
  'tag:yaml.org,2002:set',
  'tag:yaml.org,2002:timestamp',
];

export function parseCfnYaml(text: string): any {
  return yaml.parse(text, {
    customTags: supportedTags,
    version: '1.1',
    schema: 'yaml-1.1',
    merge: false,
    prettyErrors: true,
  });
}

const unquotedDotTag: yaml_types.Schema.Tag = {
  identify: (value: any) => typeof value === 'string',
  default: true,
  tag: 'tag:yaml.org,2002:str',
  test: /^\.$/,
  resolve: (str: string) => str,
  stringify: () => '.',
};

function supportedTags(tags: yaml_types.Schema.Tag[]): yaml_types.Schema.Tag[] {
  const filteredTags = tags.filter((t) => !unsupportedTags.includes(t.tag));

  const customTags: yaml_types.Schema.Tag[] = [];

  customTags.push(unquotedDotTag);
  customTags.push(...filteredTags);
  customTags.push(...shortForms);

  return customTags;
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
