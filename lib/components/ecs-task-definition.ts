import 'source-map-support/register';
import * as ecs from 'aws-cdk-lib/aws-ecs';
import * as cdk from 'aws-cdk-lib';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as logs from 'aws-cdk-lib/aws-logs';
import * as ssm from 'aws-cdk-lib/aws-ssm';
import { Construct } from 'constructs';

export interface FargateContainerDefinition {
  name: string;
  essential: boolean;
  portMappings?: ecs.PortMapping[];
  environment?: any;
  secrets?: any;
  dockerLabels?: any;
}

export interface FargateTaskDefinitionProps {
  serviceName: string;
  envName: string;
  ecsDefExecRoleSsmParam: string;
  ecsDefTaskRoleSsmParam: string;
  dockerImageUrl: string;
  family?: string;
  containerDefinitions: FargateContainerDefinition[];
  cpu?: number;
  memory?: number;
  executionRoleArn?: string;
  taskRoleArn?: string;
}

export class FargateTaskDefinition extends Construct {
  private taskDefinition: ecs.FargateTaskDefinition;

  private readonly defaultCpu: number = 256;

  private readonly defaultMemory: number = 512;

  constructor(scope: Construct, id: string, props: FargateTaskDefinitionProps) {
    super(scope, id);

    const executionRoleArn =
      props.executionRoleArn || ssm.StringParameter.fromStringParameterName(this, 'EcsExecRoleArn', props.ecsDefExecRoleSsmParam).stringValue;
    const taskRoleArn =
      props.taskRoleArn || ssm.StringParameter.fromStringParameterName(this, 'EcsTaskRoleArn', props.ecsDefTaskRoleSsmParam).stringValue;

    const execRole = iam.Role.fromRoleArn(this, 'ExecutionRole', executionRoleArn);
    const taskRole = iam.Role.fromRoleArn(this, 'TaskRole', taskRoleArn);

    const cpu = props.cpu || this.defaultCpu;
    const memory = props.memory || this.defaultMemory;
    const taskFamily = props.family || props.serviceName;

    const taskDefinitionProps: ecs.FargateTaskDefinitionProps = {
      executionRole: execRole,
      taskRole,
      cpu,
      family: taskFamily,
      memoryLimitMiB: memory,
    };

    this.taskDefinition = new ecs.FargateTaskDefinition(this, `${props.serviceName}TaskDefinition`, taskDefinitionProps);

    for (const definition of props.containerDefinitions) {
      const logGroup = new logs.LogGroup(this, `${definition.name}ContainerLogGroup`, {
        logGroupName: `/ecs/${definition.name}`,
        retention: logs.RetentionDays.ONE_MONTH,
        removalPolicy: cdk.RemovalPolicy.DESTROY,
      });

      const containerDefinitionProps: ecs.ContainerDefinitionProps = {
        taskDefinition: this.taskDefinition,
        image: ecs.ContainerImage.fromRegistry(props.dockerImageUrl),
        essential: definition.essential,
        logging: ecs.LogDriver.awsLogs({
          streamPrefix: 'ecs',
          logGroup,
        }),
        environment: definition.environment,
        secrets: definition.secrets,
        dockerLabels: definition.dockerLabels,
      };

      const taskContainer = this.taskDefinition.addContainer(definition.name, containerDefinitionProps);

      definition.portMappings?.forEach((mapping) => {
        taskContainer.addPortMappings(mapping);
      });
    }
  }

  public getFargateTaskDefinition(): ecs.FargateTaskDefinition {
    return this.taskDefinition;
  }
}
