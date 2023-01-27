import 'source-map-support/register';
import * as ecs from 'aws-cdk-lib/aws-ecs';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import * as elbv2 from 'aws-cdk-lib/aws-elasticloadbalancingv2';
import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';

export interface FargateServiceProps {
  serviceName: string;
  taskDefinition: ecs.FargateTaskDefinition;
  cluster: ecs.ICluster;
  targetGroup: elbv2.ApplicationTargetGroup;
  albSecurityGroup: ec2.ISecurityGroup;
  dbSecurityGroup: ec2.ISecurityGroup;
  vpc: ec2.IVpc;
  taskCount: number;
  dbPort: ec2.Port;
  hostPort: ec2.Port;
}

export class EcsFargateService extends Construct {
  private service: ecs.FargateService;

  constructor(scope: Construct, id: string, props: FargateServiceProps) {
    super(scope, id);

    const serviceSg = new ec2.SecurityGroup(scope, `${props.serviceName}FargateServiceSg`, {
      vpc: props.vpc,
      description: `${props.serviceName} fargate service security group`,
      securityGroupName: `${props.serviceName}-service-sg`,
    });

    serviceSg.addIngressRule(props.albSecurityGroup, props.hostPort, `Allows ALB to ECS connection on port ${props.hostPort.toString()}`)

    props.dbSecurityGroup.addIngressRule(serviceSg,props.dbPort, `Allows ECS to DB connection on port ${props.dbPort.toString()}`)


    const service = new ecs.FargateService(scope, `${props.serviceName}FargateService`, {
      cluster: props.cluster,
      serviceName: `${props.serviceName}Service`,
      assignPublicIp: true,
      taskDefinition: props.taskDefinition,
      desiredCount: props.taskCount,
      minHealthyPercent: 100,
      maxHealthyPercent: 200,
      securityGroups: [serviceSg],
      vpcSubnets: props.vpc.selectSubnets({
        subnetType: ec2.SubnetType.PUBLIC,
      }),
      healthCheckGracePeriod: cdk.Duration.seconds(60),
    });

    service.attachToApplicationTargetGroup(props.targetGroup);
  }

  public getEcsService(): ecs.FargateService {
    return this.service;
  }
}
