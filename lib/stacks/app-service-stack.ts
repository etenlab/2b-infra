import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as ssm from 'aws-cdk-lib/aws-ssm';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import * as ecs from 'aws-cdk-lib/aws-ecs';
import * as elbv2 from 'aws-cdk-lib/aws-elasticloadbalancingv2';
import * as secretsmanager from 'aws-cdk-lib/aws-secretsmanager';

import { FargateTaskDefinition } from '../components/ecs-task-definition';
import { EcsFargateService } from '../components/ecs-fargate-service';

export interface FargateServiceSecret {
  taskDefSecretName: string;
  secretsMangerSecretField: string;
  secretsManagerSecretName: string;
}

export interface AppServiceStackProps extends cdk.StackProps {
  readonly envName: string;
  readonly appPrefix: string;

  readonly vpcSsmParam: string;
  readonly albArnSsmParam: string;
  readonly albSecurityGroupSsmParam: string;
  readonly ecsExecRoleSsmParam: string;
  readonly ecsTaskRoleSsmParam: string;
  readonly ecsClusterName: string;
  readonly containerPort: number;
  readonly hostPort: number;
  readonly healthCheckPath?: string;
  readonly serviceName: string;
  readonly dockerImageUrl: string;
  readonly cpu: number;
  readonly memory: number;
  readonly serviceTasksCount: number;
  readonly secrets: FargateServiceSecret[];
}

export class AppServiceStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props: AppServiceStackProps) {
    super(scope, id, props);

    const vpcId = ssm.StringParameter.valueFromLookup(this, props.vpcSsmParam);

    const vpc = ec2.Vpc.fromLookup(this, `${props.appPrefix}Vpc`, {
      vpcId,
    });

    // TODO: move to separate construct
    const secrets: { [key: string]: ecs.Secret } = {};
    for (const secret of props.secrets) {
      const secretsManagerSecret = secretsmanager.Secret.fromSecretPartialArn(this, `${secret.taskDefSecretName}Secret`, `arn:aws:secretsmanager:${cdk.Aws.REGION}:${cdk.Aws.ACCOUNT_ID}:secret:${secret.secretsManagerSecretName}`);
      secrets[secret.taskDefSecretName] = ecs.Secret.fromSecretsManager(secretsManagerSecret, secret.secretsMangerSecretField);
    }

    const albArn = ssm.StringParameter.valueFromLookup(this, props.albArnSsmParam);
    const albSgId = ssm.StringParameter.valueFromLookup(this, props.albSecurityGroupSsmParam);
    const alb = elbv2.ApplicationLoadBalancer.fromLookup(this, 'Alb', { loadBalancerArn: albArn });

    const albSg = ec2.SecurityGroup.fromLookupById(this, 'AlbSg', albSgId);

    const cluster = ecs.Cluster.fromClusterAttributes(this, 'EcsCluster', { clusterName: props.ecsClusterName, vpc: vpc, securityGroups: [] });

    const taskDefinition = new FargateTaskDefinition(this, `FargateTaskDefinition`, {
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
    });

    const targetGroup = new elbv2.ApplicationTargetGroup(this, `TargetGroup`, {
      targetGroupName: `${props.serviceName}-target-group`,
      targetType: elbv2.TargetType.IP,
      protocol: elbv2.ApplicationProtocol.HTTP,
      port: props.hostPort,
      vpc: vpc,
      deregistrationDelay: cdk.Duration.seconds(30),
      healthCheck: {
        path: props.healthCheckPath || '/',
        port: props.hostPort.toString()
      }
    });

    const fargateService = new EcsFargateService(this, `FargateService`, {
      serviceName: props.serviceName,
      taskDefinition: taskDefinition.getFargateTaskDefinition(),
      cluster: cluster,
      targetGroup: targetGroup,
      albSecurityGroup: albSg,
      vpc: vpc,
      taskCount: props.serviceTasksCount,
      ports: [ec2.Port.tcp(props.hostPort)]
    })


    const listener = alb.addListener(`AlbListener`, {
      protocol: elbv2.ApplicationProtocol.HTTP, //TODO: change to HTTPS after registering domain
      open: true,
      // certificates: [elbv2.ListenerCertificate.fromArn(props.certArn)],
    });

    listener.addAction(`ListenerAction`, {
      action: elbv2.ListenerAction.forward([targetGroup])
    });

  }

}
