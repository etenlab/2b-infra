import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as ssm from 'aws-cdk-lib/aws-ssm';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import * as ecs from 'aws-cdk-lib/aws-ecs';
import * as elbv2 from 'aws-cdk-lib/aws-elasticloadbalancingv2';
import * as secretsmanager from 'aws-cdk-lib/aws-secretsmanager';
import * as route53 from 'aws-cdk-lib/aws-route53';
import * as route53Targets from 'aws-cdk-lib/aws-route53-targets';

import { FargateTaskDefinition } from '../components/ecs-task-definition';
import { EcsFargateService } from '../components/ecs-fargate-service';

export interface FargateServiceSecret {
  taskDefSecretName: string;
  secretsMangerSecretField: string;
  secretsManagerSecretName: string;
}

export interface ApiServiceStackProps extends cdk.StackProps {
  readonly envName: string;
  readonly appPrefix: string;

  readonly vpcSsmParam: string;
  readonly domainCertSsmParam: string;
  readonly rootDomainName: string;
  readonly subdomain: string;
  readonly albArnSsmParam: string;
  readonly albSecurityGroupSsmParam: string;
  readonly dbSecurityGroupSsmParam: string;
  readonly ecsExecRoleSsmParam: string;
  readonly ecsTaskRoleSsmParam: string;
  readonly ecsClusterName: string;
  readonly dockerPort: number;
  readonly albPort: number;
  readonly healthCheckPath?: string;
  readonly serviceName: string;
  readonly dockerImageUrl: string;
  readonly cpu: number;
  readonly memory: number;
  readonly serviceTasksCount: number;
  readonly secrets: FargateServiceSecret[];
  readonly environmentVars: Record<string, string>[];
}

export class ApiServiceStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props: ApiServiceStackProps) {
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

    const environment: Record<string, string> = {
      ENV: props.envName,
      SERVICE: props.serviceName,
    }

    for (const envVar of props.environmentVars) {
      for (const [key, value] of Object.entries(envVar)) {
        const varName = key as string;
        environment[varName] = value.toString()
      }
    }

    const albArn = ssm.StringParameter.valueFromLookup(this, props.albArnSsmParam);
    const albSgId = ssm.StringParameter.valueFromLookup(this, props.albSecurityGroupSsmParam);
    const alb = elbv2.ApplicationLoadBalancer.fromLookup(this, 'Alb', { loadBalancerArn: albArn });
    const albSg = ec2.SecurityGroup.fromLookupById(this, 'AlbSg', albSgId);


    const dbSgId = ssm.StringParameter.valueFromLookup(this, props.dbSecurityGroupSsmParam);
    const dbSg = ec2.SecurityGroup.fromLookupById(this, 'DbSg', dbSgId);

    const cluster = ecs.Cluster.fromClusterAttributes(this, 'EcsCluster', { clusterName: props.ecsClusterName, vpc: vpc, securityGroups: [] });

    const domainCertArn = ssm.StringParameter.valueForStringParameter(this, props.domainCertSsmParam);

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
              hostPort: props.dockerPort,
              containerPort: props.dockerPort,
              protocol: ecs.Protocol.TCP,
            },
          ],
          secrets: secrets,
          environment: environment,
        },
      ],
    });

    const targetGroup = new elbv2.ApplicationTargetGroup(this, `TargetGroup`, {
      targetGroupName: `${props.serviceName}-target-group`,
      targetType: elbv2.TargetType.IP,
      protocol: elbv2.ApplicationProtocol.HTTP,
      port: props.albPort,
      vpc: vpc,
      deregistrationDelay: cdk.Duration.seconds(30),
      healthCheck: {
        path: props.healthCheckPath || '/',
        port: 'traffic-port'
      }
    });

    const fargateService = new EcsFargateService(this, `FargateService`, {
      serviceName: props.serviceName,
      taskDefinition: taskDefinition.getFargateTaskDefinition(),
      cluster: cluster,
      targetGroup: targetGroup,
      albSecurityGroup: albSg,
      dbSecurityGroup: dbSg,
      vpc: vpc,
      taskCount: props.serviceTasksCount,
      hostPort: ec2.Port.tcp(props.albPort),
      dbPort: ec2.Port.tcp(5432)
    })


    const listener = alb.addListener(`AlbListener`, {
      protocol: elbv2.ApplicationProtocol.HTTPS,
      port: props.albPort,
      open: true,
      defaultAction: elbv2.ListenerAction.fixedResponse(200, {
        contentType: 'text/plain',
        messageBody: 'ALB is working'
      }),
      certificates: [elbv2.ListenerCertificate.fromArn(domainCertArn)],
    });

    listener.addAction('ListenerAction', {
      action: elbv2.ListenerAction.forward([targetGroup]),
    });

    const rootHostedZone = route53.HostedZone.fromLookup(this, 'RootHostedZone', {
      domainName: props.rootDomainName
    });

    new route53.ARecord(this, 'AlbAliasRecord', {
      zone: rootHostedZone,
      recordName: props.subdomain,
      target: route53.RecordTarget.fromAlias(
        new route53Targets.LoadBalancerTarget(alb)
      )
    });

  }

}
