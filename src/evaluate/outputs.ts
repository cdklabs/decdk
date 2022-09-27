import { CfnElement } from 'aws-cdk-lib';
import { Construct } from 'constructs';

export interface DeCdkCfnOutputProps {
  value: any;
  description?: string;
  exportName?: any;
  condition?: string;
}

export class DeCDKCfnOutput extends CfnElement {
  private readonly value: any;
  private readonly description?: string;
  private readonly exportName?: any;
  private readonly condition?: string;
  constructor(scope: Construct, id: string, props: DeCdkCfnOutputProps) {
    super(scope, id);
    if (props.value === undefined) {
      throw new Error(
        `Missing value for CloudFormation output at path "${this.node.path}"`
      );
    }
    this.value = props.value;
    this.condition = props.condition;
    this.description = props.description;
    this.exportName = props.exportName;
  }

  public _toCloudFormation(): object {
    return {
      Outputs: {
        [this.logicalId]: {
          Description: this.description,
          Value: this.value,
          Export: this.exportName ? { Name: this.exportName } : undefined,
          Condition: this.condition ?? undefined,
        },
      },
    };
  }
}
