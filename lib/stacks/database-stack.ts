import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as rds from 'aws-cdk-lib/aws-rds';
import * as ssm from 'aws-cdk-lib/aws-ssm';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import * as s3 from 'aws-cdk-lib/aws-s3';
import { importVpc } from '../helpers';

/**
 * Properties required to create Aurora database
 */
export interface DatabaseStackProps extends cdk.StackProps {
  /** Name of the application assigned to logical id of CloudFormation components */
  readonly appPrefix: string;

  /** Name of the deployed environmend */
  readonly envName: string;

  /** SSM param name storing VPC id */
  readonly vpcSsmParam: string;

  /** Whether database is accessible outside of VPC */
  readonly isPubliclyAccessible: boolean;

  /** Name of the secret in Secrets Manager to store database credentials */
  readonly dbCredentialSecret: string;

  /** SSM param name to store database security group id */
  readonly dbSecurityGroupSsmParam: string;

  /** Bucket name for storing public files */
  readonly publicFilesBucketName: string;
}

/**
 * Creates PostgreSQL Aurora cluster with a single database
 */
export class DatabaseStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props: DatabaseStackProps) {
    super(scope, id, props);

    const vpc = importVpc(this, props.vpcSsmParam);

    const databaseSg = new ec2.SecurityGroup(
      this,
      `${props.appPrefix}AuroraClusterSG`,
      {
        vpc,
        description: 'Aurora cluster security group',
        securityGroupName: `${props.envName}-aurora-cluster-sg`,
        allowAllOutbound: true,
      },
    );

    if (props.isPubliclyAccessible) {
      databaseSg.addIngressRule(
        ec2.Peer.anyIpv4(),
        ec2.Port.tcp(5432),
        'Allow database connection from anywhere',
      );
    } else {
      databaseSg.addIngressRule(
        ec2.Peer.ipv4(vpc.vpcCidrBlock),
        ec2.Port.tcp(5432),
        'Allow database connection only from VPC',
      );
    }

    const auroraCluster = new rds.DatabaseCluster(
      this,
      `${props.appPrefix}AuroraCluster`,
      {
        instances: 1,
        clusterIdentifier: `${props.envName}-aurora-cluster`,
        defaultDatabaseName: 'eildb1',
        deletionProtection: true,
        parameterGroup: rds.ParameterGroup.fromParameterGroupName(
          this,
          'DbParamGroup',
          'default.aurora-postgresql14',
        ),
        engine: rds.DatabaseClusterEngine.auroraPostgres({
          version: rds.AuroraPostgresEngineVersion.VER_14_5,
        }),
        storageEncrypted: true,
        credentials: rds.Credentials.fromGeneratedSecret('postgres', {
          secretName: props.dbCredentialSecret,
        }),
        instanceProps: {
          vpc,
          vpcSubnets: {
            subnets: vpc.selectSubnets({
              subnetType: props.isPubliclyAccessible
                ? ec2.SubnetType.PUBLIC
                : ec2.SubnetType.PRIVATE_ISOLATED,
            }).subnets,
          },
          instanceType: 'serverless' as unknown as ec2.InstanceType,
          securityGroups: [databaseSg],
          publiclyAccessible: props.isPubliclyAccessible,
        },
      },
    );

    /**
     * CDK v2.60 does not support ServerlessV2 Aurora.
     * Editing the generated cloudformation construct directly is a way to set autoscaling options.
     *
     * @see: https://github.com/aws/aws-cdk/issues/10842
     */
    (
      auroraCluster.node.findChild('Resource') as rds.CfnDBCluster
    ).serverlessV2ScalingConfiguration = {
      minCapacity: 0.5,
      maxCapacity: 4,
    };

    new ssm.StringParameter(this, `${props.appPrefix}DbSecurityGroup`, {
      stringValue: databaseSg.securityGroupId,
      description: 'Database security group',
      parameterName: props.dbSecurityGroupSsmParam,
    });

    /** Create public S3 bucket for files */
    const publicFilesBucket = new s3.Bucket(
      this,
      `${props.appPrefix}FilesBucket`,
      {
        bucketName: props.publicFilesBucketName,
        publicReadAccess: true,
        removalPolicy: cdk.RemovalPolicy.RETAIN,
        accessControl: s3.BucketAccessControl.PUBLIC_READ,
        objectOwnership: s3.ObjectOwnership.BUCKET_OWNER_PREFERRED,
        encryption: s3.BucketEncryption.S3_MANAGED,
      },
    );
  }
}
