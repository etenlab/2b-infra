import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as ecs from 'aws-cdk-lib/aws-ecs';
import * as ssm from 'aws-cdk-lib/aws-ssm';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import * as iam from 'aws-cdk-lib/aws-iam';

export interface FargateClusterStackProps extends cdk.StackProps {
  readonly envName: string;

  readonly vpcSsmParam: string;
  readonly ecsExecRoleSsmParam: string;
  readonly ecsTaskRoleSsmParam: string;
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

    // TODO: move to role builder
    const defaultExecutionRole = new iam.Role(this, 'EcsExecutionRole', {
      roleName: `${props.envName}-default-ecs-execution-role`,
      description: 'Role used by ECS to manage tasks',
      assumedBy: new iam.ServicePrincipal('ecs-tasks.amazonaws.com'),
    });

    const defaultEcsExecutionPolicy = new iam.Policy(this, 'EcsExecutionPolicy', {
      policyName: `${props.envName}-default-ecs-execution-policy`,
      statements: [
        new iam.PolicyStatement({
          effect: iam.Effect.ALLOW,
          actions: [
            'ssm:DescribeParameters',
            'ssm:GetParameters',
            'ssm:GetParameter',
            'ssm:GetParameterHistory',
            'kms:Decrypt',
            'secretsmanager:GetSecretValue',
          ],
          resources: ['*'],
        }),
        new iam.PolicyStatement({
          effect: iam.Effect.ALLOW,
          actions: ['logs:CreateLogStream', 'logs:PutLogEvents'],
          resources: [`arn:aws:logs:${cdk.Aws.REGION}:${cdk.Aws.ACCOUNT_ID}:log-group:/ecs/*`],
        }),
      ],
    });

    defaultEcsExecutionPolicy.attachToRole(defaultExecutionRole);

    const executionRoleSSMParam = new ssm.StringParameter(this, 'EcsExecutionRoleSsmParam', {
      stringValue: defaultExecutionRole.roleArn,
      description: 'Default ECS execution role',
      parameterName: props.ecsExecRoleSsmParam,
    });

    const defaultEcsTaskPolicy = new iam.Policy(this, 'EcsTaskPolicy', {
      policyName: `${props.envName}-default-ecs-task-policy`,
      statements: [
        new iam.PolicyStatement({
          effect: iam.Effect.ALLOW,
          actions: ['ssm:GetParameter'],
          resources: [`arn:aws:ssm:${cdk.Aws.REGION}:${cdk.Aws.ACCOUNT_ID}:*`],
        }),
        new iam.PolicyStatement({
          effect: iam.Effect.ALLOW,
          actions: ['secretsmanager:GetSecretValue', 'secretsmanager:DescribeSecret', 'secretsmanager:ListSecretVersionIds'],
          resources: [`arn:aws:secretsmanager:${cdk.Aws.REGION}:${cdk.Aws.ACCOUNT_ID}:*`],
        }),
      ],
    });

    const defaultTaskRole = new iam.Role(this, 'EcsTaskRole', {
      roleName: `${props.envName}-default-ecs-task-role`,
      description: 'Role application running on ECS use to access AWS resources.',
      assumedBy: new iam.ServicePrincipal('ecs-tasks.amazonaws.com'),
    });

    defaultEcsTaskPolicy.attachToRole(defaultTaskRole);

    const taskRoleSSMParam = new ssm.StringParameter(this, 'EcsTaskRoleSsmParam', {
      stringValue: defaultTaskRole.roleArn,
      description: 'Default ECS task role',
      parameterName: props.ecsTaskRoleSsmParam,
    });
  }
}
