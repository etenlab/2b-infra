import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as ssm from 'aws-cdk-lib/aws-ssm';
import * as ecs from 'aws-cdk-lib/aws-ecs';
import { ApplicationLoadBalancer } from '../components/application-load-balancer';
import { VPC } from '../components/vpc';
import { EcsExecutionRole } from '../components/ecs-execution-role';
import { EcsTaskRole } from '../components/ecs-task-role';

export interface CommonStackProps extends cdk.StackProps {
  readonly cidr: string;
  readonly envName: string;
  readonly vpcSsmParam: string;
  readonly ecsExecRoleSsmParam: string;
  readonly ecsTaskRoleSsmParam: string;
  readonly albArnSsmParam: string;
  readonly natGatewaysCount: number;
  readonly appPrefix: string;
}

export class CommonStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props: CommonStackProps) {
    super(scope, id, props);

    const vpc = new VPC(this, 'AppVpc', {
      cidr: props.cidr,
      envName: props.envName,
      natGatewaysCount: props.natGatewaysCount,
    });

    const vpcIdSSMParam = new ssm.StringParameter(this, `${props.appPrefix}VpcIdSSMParam`, {
      stringValue: vpc.getVpcId(),
      description: 'Application VPC Id',
      parameterName: props.vpcSsmParam,
    });

    const alb = new ApplicationLoadBalancer(this, `${props.appPrefix}Alb`, {
      envName: props.envName,
      vpc: vpc.getVpc(),
      certArn: 'string',
      healthCheckPath: '/healthcheck',
      healthCheckPort: '8080',
    });

    const albSSMParam = new ssm.StringParameter(this, `${props.appPrefix}AlbSsmParam`, {
      stringValue: alb.getAlbArn(),
      description: 'Application load balancer ARN',
      parameterName: props.albArnSsmParam,
    });

    const cluster = new ecs.Cluster(this, `${props.appPrefix}Cluster`, {
      vpc: vpc.getVpc(),
      clusterName: `${props.envName}-cluster`,
      containerInsights: true,
    });

    const defaultExecutionRole = new EcsExecutionRole(this, `${props.appPrefix}EcsExecutionRole`, { envName: props.envName });

    const executionRoleSSMParam = new ssm.StringParameter(this, `${props.appPrefix}EcsExecRoleSsmParam`, {
      stringValue: defaultExecutionRole.getRoleArn(),
      description: 'Default ECS execution role',
      parameterName: props.ecsExecRoleSsmParam,
    });

    const defaultTaskRole = new EcsTaskRole(this, `${props.appPrefix}EcsTaskRole`, { envName: props.envName });

    const taskRoleSSMParam = new ssm.StringParameter(this, `${props.appPrefix}EcsTaskRoleSsmParam`, {
      stringValue: defaultTaskRole.getRoleArn(),
      description: 'Default ECS task role',
      parameterName: props.ecsTaskRoleSsmParam,
    });
  }
}
