import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as ecs from 'aws-cdk-lib/aws-ecs';
import * as ssm from 'aws-cdk-lib/aws-ssm';
import * as ec2 from 'aws-cdk-lib/aws-ec2';

export interface FargateClusterStackProps extends cdk.StackProps {
  readonly envName: string;

  readonly vpcSsmParam: string;
}

export class FargateClusterStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props: FargateClusterStackProps) {
    super(scope, id, props);

    const vpcId = ssm.StringParameter.valueFromLookup(this, props.vpcSsmParam);

    const vpc = ec2.Vpc.fromLookup(this, 'Vpc', {
      vpcId,
    });

    const cluster = new ecs.Cluster(this, 'Cluster', {
      vpc: vpc,
      clusterName: `${props.envName}-cluster`,
      containerInsights: true,
    });
  }
}
