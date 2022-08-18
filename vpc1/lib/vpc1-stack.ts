import * as cdk from 'aws-cdk-lib';
import autoscaling = require('aws-cdk-lib/aws-autoscaling');
import ec2 = require('aws-cdk-lib/aws-ec2');
import elbv2 = require('aws-cdk-lib/aws-elasticloadbalancingv2');
import { Construct } from 'constructs';
import rds = require('aws-cdk-lib/aws-rds');
import secretsManager = require('aws-cdk-lib/aws-secretsmanager');
import ssm = require('aws-cdk-lib/aws-ssm');
import { Duration } from 'aws-cdk-lib';

export class Vpc1Stack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    // 👇 create the VPC
    const vpc = new ec2.Vpc(this, 'vpc-1', {
      cidr: '10.1.0.0/16',
      natGateways: 1,
      maxAzs: 2,
      subnetConfiguration: [
        {
          name: 'public-subnet-1',
          subnetType: ec2.SubnetType.PUBLIC,
          cidrMask: 24,
        },
        {
          name: 'public-subnet-2',
          subnetType: ec2.SubnetType.PUBLIC,
          cidrMask: 24,
        },
        {
          name: 'private-subnet-1',
          subnetType: ec2.SubnetType.PRIVATE_WITH_NAT,
          cidrMask: 24,
        },
        {
          name: 'private-subnet-2',
          subnetType: ec2.SubnetType.PRIVATE_WITH_NAT,
          cidrMask: 24,
        },
      ],
    });

    // 👇 create a security group for the database
    const db_sg = new ec2.SecurityGroup(this, 'database-sg', {
      vpc,
    });

    db_sg.addIngressRule(
      ec2.Peer.anyIpv4(),
      ec2.Port.tcp(5432),
      'allow postgres connections from anywhere',
    );

    db_sg.addIngressRule(
      ec2.Peer.anyIpv6(),
      ec2.Port.tcp(5432),
      'allow postgres connections from anywhere',
    );

    const db_password = new secretsManager.Secret(
      this, 'Secret', {
      secretName: `eil_db_1_password`,
      description: 'RDS database auto-generated user password',
      generateSecretString: {
        excludeCharacters: '"@/',
        generateStringKey: 'password',
        passwordLength: 32,
        secretStringTemplate: `{"username": "postgres"}`,
      }
    }
    );

    // aurora postgres serverless v2
    const cluster = new rds.ServerlessCluster(this, 'eil-db-1-cluster', {
      defaultDatabaseName: 'eil-db-1',
      enableDataApi: false,
      credentials: { username: 'postgres', password: db_password.secretValue },
      engine: rds.DatabaseClusterEngine.auroraPostgres({
        version: rds.AuroraPostgresEngineVersion.VER_13_7
      }),
      parameterGroup: rds.ParameterGroup.fromParameterGroupName(this, 'ParameterGroup', 'default.aurora-postgresql13'),
      vpc,
      scaling: {
        // autoPause: Duration.minutes(10), // default is to pause after 5 minutes of idle time
        minCapacity: rds.AuroraCapacityUnit.ACU_1, // default is 2 Aurora capacity units (ACUs)
        maxCapacity: rds.AuroraCapacityUnit.ACU_4, // default is 16 Aurora capacity units (ACUs)
      },
      securityGroups: [db_sg],
    });

    // application load balancer
    const alb = new elbv2.ApplicationLoadBalancer(this, 'alb-1', {
      vpc,
      internetFacing: true,
    })

  }
}

const app = new cdk.App()
new Vpc1Stack(app, 'vpc-1-stack')
app.synth()