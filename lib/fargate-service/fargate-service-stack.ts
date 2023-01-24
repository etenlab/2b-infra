import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as ssm from 'aws-cdk-lib/aws-ssm';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import * as ecs from 'aws-cdk-lib/aws-ecs';
import * as secretsmanager from 'aws-cdk-lib/aws-secretsmanager';

import { FargateTaskDefinition } from './ecs-task-definition';
import { SecretTargetAttachment } from 'aws-cdk-lib/aws-secretsmanager';

export interface FargateServiceSecret {
  taskDefSecretName: string;
  secretsMangerSecretField: string;
  secretsManagerSecretName: string;
}

export interface FargateServiceStackProps extends cdk.StackProps {
  readonly envName: string;

  readonly vpcSsmParam: string;
  readonly ecsExecRoleSsmParam: string;
  readonly ecsTaskRoleSsmParam: string;
  readonly containerPort: number;
  readonly hostPort: number;
  readonly serviceName: string;
  readonly dockerImageUrl: string;
  readonly cpu: number;
  readonly memory: number;
  readonly secrets: FargateServiceSecret[];
}

export class FargateServiceStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props: FargateServiceStackProps) {
    super(scope, id, props);

    const vpcId = ssm.StringParameter.valueFromLookup(this, props.vpcSsmParam);

    const vpc = ec2.Vpc.fromLookup(this, 'Vpc', {
      vpcId,
    });

    const secrets: { [key: string]: ecs.Secret } = {};
    for (const secret of props.secrets) {
      const secretsManagerSecret = secretsmanager.Secret.fromSecretNameV2(this, `${secret.taskDefSecretName}Secret`, secret.secretsManagerSecretName);
      secrets[secret.taskDefSecretName] = ecs.Secret.fromSecretsManager(secretsManagerSecret, secret.secretsMangerSecretField);
    }

    const taskDefinition = new FargateTaskDefinition(this, 'FargateTaskDefinition', {
      serviceName: props.serviceName,
      dockerImageUrl: props.dockerImageUrl,
      envName: props.envName,
      ecsDefExecRoleSsmParam: props.ecsExecRoleSsmParam,
      ecsDefTaskRoleSsmParam: props.ecsTaskRoleSsmParam,
      containerDefinitions: [
        {
          name: props.serviceName,
          essential: true,
          portMappings: [
            {
              hostPort: props.hostPort,
              containerPort: props.containerPort,
              protocol: ecs.Protocol.TCP,
            },
          ],
          secrets: secrets,
          environment: {
            ENV: props.envName,
            SERVICE: props.serviceName,
          },
        },
      ],
    }).build();
  }
}
