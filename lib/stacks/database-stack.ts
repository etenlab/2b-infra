import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as rds from 'aws-cdk-lib/aws-rds';
import * as ssm from 'aws-cdk-lib/aws-ssm';
import * as ec2 from 'aws-cdk-lib/aws-ec2';

export interface DatabaseStackProps extends cdk.StackProps {
  readonly envName: string;
  readonly vpcSsmParam: string;
}

export class DatabaseStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props: DatabaseStackProps) {
    super(scope, id, props);

    const { envName, vpcSsmParam } = props;

    const vpcId = ssm.StringParameter.valueFromLookup(this, vpcSsmParam);

    const vpc = ec2.Vpc.fromLookup(this, `${envName}VPC`, {
      vpcId,
    });

    const databaseSg = new ec2.SecurityGroup(this, `${envName}AuroraClusterSG`, {
      vpc: vpc,
      description: 'Aurora cluster security group',
      securityGroupName: `${envName}-aurora-cluster-sg`,
      allowAllOutbound: true,
    });

    // TODO: add diff setting for prod (connection from VPC only)
    databaseSg.addIngressRule(ec2.Peer.anyIpv4(), ec2.Port.tcp(5432), `Allow database connection from anywhere`);

    // TODO: add secrets
    const auroraCluster = new rds.ServerlessCluster(this, `${envName}AuroraCluster`, {
      clusterIdentifier: `${envName}-aurora-cluster`,
      defaultDatabaseName: 'default',
      deletionProtection: true,
      enableDataApi: true,
      parameterGroup: rds.ParameterGroup.fromParameterGroupName(this, `${envName}ParamGroup`, 'default.aurora-postgresql14'),
      engine: rds.DatabaseClusterEngine.auroraPostgres({
        version: rds.AuroraPostgresEngineVersion.VER_13_7,
      }),
      scaling: {
        minCapacity: rds.AuroraCapacityUnit.ACU_1,
        maxCapacity: rds.AuroraCapacityUnit.ACU_4,
      },
    //   vpc: vpc,
    //   vpcSubnets: {
    //     subnets: vpc.selectSubnets({
    //       subnetType: ec2.SubnetType.PUBLIC,
    //     }).subnets,
    //   },
    //   securityGroups: [databaseSg],
    });
  }
}
