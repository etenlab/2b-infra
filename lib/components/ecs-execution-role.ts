import 'source-map-support/register';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';

export interface EcsExecRoleProps {
  envName: string;
}

export class EcsExecutionRole extends Construct {
  private ecsExecRole: iam.Role;

  constructor(scope: Construct, id: string, props: EcsExecRoleProps) {
    super(scope, id);

    this.ecsExecRole = new iam.Role(this, 'EcsExecutionRole', {
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

    defaultEcsExecutionPolicy.attachToRole(this.ecsExecRole);
  }

  public getRole(): iam.Role {
    return this.ecsExecRole;
  }

  public getRoleArn(): string {
    return this.ecsExecRole.roleArn;
  }
}
