import { $ref } from './expression';
import { schemaForIntrinsic } from './intrinsics';

export const FnGetProp = () => {
  const description =
    'The CDK::GetProp intrinsic function returns the value of a Property from a Construct in the template. For more information about GetProp return values for a particular Construct, refer to the CDK documentation for that Construct in the Properties section.';
  return {
    anyOf: [
      schemaForIntrinsic('CDK::GetProp', {
        description,
        params: [
          {
            name: 'logicalNameOfConstruct',
            description:
              'The logical name (also called logical ID) of the Construct that contains the Property that you want.',
            types: [$ref('StringLiteral')],
          },
          {
            name: 'propertyName',
            description:
              "The name of the Construct-specific Property whose value you want. See the Construct's documentation page for details about the Properties available.",
            types: [$ref('StringLiteral')],
          },
        ],
      }),
      schemaForIntrinsic('CDK::GetProp', {
        description,
        params: [
          {
            name: 'shortSyntaxForm',
            description:
              'The logical name and property name in short syntax form: `logicalNameOfConstruct.propertyName`.',
            types: [$ref('StringLiteral')],
          },
        ],
      }),
    ],
  };
};
