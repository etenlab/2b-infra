import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import * as ssm from 'aws-cdk-lib/aws-ssm';

export interface NetworkingStackProps extends cdk.StackProps {
  readonly cidr: string;

  readonly envName: string;

  readonly vpcSsmParam: string;

  readonly natGatewaysCount: number;
}

export class NetworkingStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props: NetworkingStackProps) {
    super(scope, id, props);

    const { envName, cidr, natGatewaysCount, vpcSsmParam } = props;

    const vpc = new ec2.Vpc(this, 'Vpc', {
      ipAddresses: ec2.IpAddresses.cidr(cidr),
      maxAzs: 3,
      natGateways: natGatewaysCount,
      vpcName: `app-vpc-${envName}`,
      subnetConfiguration: [
        {
          cidrMask: 24,
          name: 'Public',
          subnetType: ec2.SubnetType.PUBLIC,
        },
        {
          cidrMask: 24,
          name: 'Private',
          subnetType: ec2.SubnetType.PRIVATE_ISOLATED,
        },
      ],
    });

    const vpcIdSSMParam = new ssm.StringParameter(this, 'VpcId', {
      stringValue: vpc.vpcId,
      description: 'Application VPC Id',
      parameterName: vpcSsmParam,
    });
  }
}
