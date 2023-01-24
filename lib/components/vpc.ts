import { Construct } from 'constructs';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import * as ssm from 'aws-cdk-lib/aws-ssm';

export interface VpcProps {
  readonly cidr: string;
  readonly envName: string;
  readonly natGatewaysCount: number;
}

export class VPC extends Construct {
  private vpc: ec2.Vpc;

  constructor(scope: Construct, id: string, props: VpcProps) {
    super(scope, id);

    this.vpc = new ec2.Vpc(this, 'Vpc', {
      ipAddresses: ec2.IpAddresses.cidr(props.cidr),
      maxAzs: 3,
      natGateways: props.natGatewaysCount,
      vpcName: `app-vpc-${props.envName}`,
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
  }

  public getVpcId() {
    return this.vpc.vpcId;
  }

  public getVpc() {
    return this.vpc;
  }
}
