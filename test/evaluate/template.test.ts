import { Template } from '../../src/parser/template';
import { Testing } from '../util';

describe('Mappings', () => {
  test('can use Mapping with string value', async () => {
    // GIVEN
    const template = await Testing.template(
      await Template.fromObject({
        Mappings: {
          RegionMap: {
            'us-west-1': {
              HVM64: 'ami-0bdb828fd58c52235',
              HVMG2: 'ami-066ee5fd4a9ef77f1',
            },
            'eu-west-1': {
              HVM64: 'ami-047bb4163c506cd98',
              HVMG2: 'ami-0a7c483d527806435',
            },
          },
        },
        Resources: {
          myEC2Instance: {
            Type: 'AWS::EC2::Instance',
            Properties: {
              ImageId: {
                'Fn::FindInMap': ['RegionMap', { Ref: 'AWS::Region' }, 'HVM64'],
              },
              InstanceType: 'm1.small',
            },
          },
        },
      })
    );

    // THEN
    template.hasMapping('RegionMap', {
      'us-west-1': {
        HVM64: 'ami-0bdb828fd58c52235',
        HVMG2: 'ami-066ee5fd4a9ef77f1',
      },
      'eu-west-1': {
        HVM64: 'ami-047bb4163c506cd98',
        HVMG2: 'ami-0a7c483d527806435',
      },
    });
    template.hasResourceProperties('AWS::EC2::Instance', {
      ImageId: {
        'Fn::FindInMap': ['RegionMap', { Ref: 'AWS::Region' }, 'HVM64'],
      },
    });
  });

  test('can use Mapping with list value', async () => {
    // GIVEN
    const template = await Testing.template(
      await Template.fromObject({
        Mappings: {
          RegionMap: {
            'eu-west-1': {
              HVM64: ['ami-047bb4163c506cd98'],
              HVMG2: ['ami-0a7c483d527806435'],
            },
          },
        },
        Resources: {
          myEC2Instance: {
            Type: 'AWS::EC2::Instance',
            Properties: {
              ImageId: {
                'Fn::Select': [
                  0,
                  {
                    'Fn::FindInMap': [
                      'RegionMap',
                      { Ref: 'AWS::Region' },
                      'HVM64',
                    ],
                  },
                ],
              },
              InstanceType: 'm1.small',
            },
          },
        },
      })
    );

    // THEN
    template.hasMapping('RegionMap', {
      'eu-west-1': {
        HVM64: ['ami-047bb4163c506cd98'],
        HVMG2: ['ami-0a7c483d527806435'],
      },
    });
    template.hasResourceProperties('AWS::EC2::Instance', {
      ImageId: {
        'Fn::Select': [
          0,
          {
            'Fn::FindInMap': ['RegionMap', { Ref: 'AWS::Region' }, 'HVM64'],
          },
        ],
      },
    });
  });
});

describe('given a template with unknown top-level properties', () => {
  it('can synth the template and will ignore unknown properties', async () => {
    // GIVEN
    const template = await Testing.template(
      await Template.fromObject({
        Parameters: {},
        Mappings: {},
        Conditions: {},
        Rules: {},
        Resources: {
          WaitHandle: {
            Type: 'AWS::CloudFormation::WaitConditionHandle',
          },
        },
        Outputs: {},
        AWSTemplateFormatVersion: '2010-09-09',
        Whatever: {},
      }),
      false
    );

    // THEN
    template.hasResourceProperties(
      'AWS::CloudFormation::WaitConditionHandle',
      {}
    );
    expect(template.toJSON()).not.toHaveProperty('Whatever');
  });
});
