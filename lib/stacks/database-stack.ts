import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as rds from 'aws-cdk-lib/aws-rds';
import * as ssm from 'aws-cdk-lib/aws-ssm';
import * as ec2 from 'aws-cdk-lib/aws-ec2';

export interface DatabaseStackProps extends cdk.StackProps {
  readonly envName: string;
  readonly vpcSsmParam: string;
  readonly isPubliclyAccessible: boolean;
  readonly dbCredentialSecret: string;
}

export class DatabaseStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props: DatabaseStackProps) {
    super(scope, id, props);

    const vpcId = ssm.StringParameter.valueFromLookup(this, props.vpcSsmParam);

    const vpc = ec2.Vpc.fromLookup(this, `VPC`, {
      vpcId,
    });

    const databaseSg = new ec2.SecurityGroup(this, 'AuroraClusterSG', {
      vpc: vpc,
      description: 'Aurora cluster security group',
      securityGroupName: `${props.envName}-aurora-cluster-sg`,
      allowAllOutbound: true,
    });

    if (props.isPubliclyAccessible) {
      databaseSg.addIngressRule(ec2.Peer.anyIpv4(), ec2.Port.tcp(5432), 'Allow database connection from anywhere');
    } else {
      databaseSg.addIngressRule(ec2.Peer.ipv4(vpc.vpcCidrBlock), ec2.Port.tcp(5432), 'Allow database only from VPC');
    }

    const auroraCluster = new rds.DatabaseCluster(this, 'AuroraCluster', {
      instances: 1,
      clusterIdentifier: `${props.envName}-aurora-cluster`,
      defaultDatabaseName: 'eildb1',
      deletionProtection: true,
      parameterGroup: rds.ParameterGroup.fromParameterGroupName(this, 'DbParamGroup', 'default.aurora-postgresql14'),
      engine: rds.DatabaseClusterEngine.auroraPostgres({
        version: rds.AuroraPostgresEngineVersion.VER_14_5,
      }),
      storageEncrypted: true,
      credentials: rds.Credentials.fromGeneratedSecret('postgres', { secretName: props.dbCredentialSecret }),
      instanceProps: {
        vpc: vpc,
        vpcSubnets: {
          subnets: vpc.selectSubnets({
            subnetType: props.isPubliclyAccessible ? ec2.SubnetType.PUBLIC : ec2.SubnetType.PRIVATE_ISOLATED,
          }).subnets,
        },
        instanceType: 'serverless' as unknown as ec2.InstanceType,
        securityGroups: [databaseSg],
        publiclyAccessible: props.isPubliclyAccessible
      },
    });

    /**
     * CDK v2.60 does not support ServerlessV2 Aurora.
     * Editing the generated cloudformation construct directly allows to set autoscaling options.
     *
     * @see: https://github.com/aws/aws-cdk/issues/10842
     */
    (
      auroraCluster.node.findChild('Resource') as rds.CfnDBCluster
    ).serverlessV2ScalingConfiguration = {
      minCapacity: 0.5,
      maxCapacity: 4,
    };
  }
}
