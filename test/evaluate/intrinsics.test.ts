import { Template } from '../../src/parser/template';
import { Testing } from '../util';

test('FnCidr', async () => {
  // GIVEN
  const template = await Testing.template(
    await Template.fromObject({
      Resources: {
        VPC: {
          Type: 'AWS::EC2::VPC',
        },
        Subnet: {
          Type: 'aws-cdk-lib.aws_ec2.Subnet',
          Properties: {
            vpcId: { Ref: 'VPC' },
            availabilityZone: 'us-east-1a',
            cidrBlock: {
              'Fn::Select': [
                0,
                {
                  'Fn::Cidr': [{ 'Fn::GetAtt': ['VPC', 'CidrBlock'] }, 1, 8],
                },
              ],
            },
          },
        },
      },
    })
  );

  // THEN
  template.hasResourceProperties('AWS::EC2::Subnet', {
    CidrBlock: {
      'Fn::Select': [
        0,
        {
          'Fn::Cidr': [{ 'Fn::GetAtt': ['VPC', 'CidrBlock'] }, 1, 8],
        },
      ],
    },
  });
});
