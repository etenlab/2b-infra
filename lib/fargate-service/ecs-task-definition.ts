import 'source-map-support/register';
import * as ecs from 'aws-cdk-lib/aws-ecs';
import * as cdk from 'aws-cdk-lib';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as logs from 'aws-cdk-lib/aws-logs';
import { Construct } from 'constructs';

export interface IC8FargateBasicContainerDefinition {
  /** the function for which we want to count url hits **/
  name: string;
  essential: boolean;
  portMappings?: ecs.PortMapping[];
  environment?: any;
  secrets?: any;
  dockerLabels?: any;
}

export interface IC8FargateBasicTaskDefinition {
  executionRoleArn: string;
  taskRoleArn: string;
  containerDefinitions: IC8FargateBasicContainerDefinition[];
  cpu?: string;
  family: string;
  memory?: string;
}

export interface FargateTaskDefinitionProps {
  serviceName: string;
  ecrRepoArn: string;
  ecrImageTag: string;
  taskDefinition: IC8FargateBasicTaskDefinition;
  envName: string;
  addC8Metrics?: boolean;
  addDatadog?: boolean;
}

export class FargateTaskDefinition extends Construct {
  private taskDefinition: ecs.FargateTaskDefinition;

  private readonly defaultCpu: string = '2048';
  private readonly defaultMemory: string = '4096';

  constructor(scope: Construct, id: string, props: FargateTaskDefinitionProps) {
    super(scope, id);

    const repository = ecr.Repository.fromRepositoryArn(this, `${props.serviceName}EcrRepository`, props.ecrRepoArn);

    const taskRole = new iam.Role(this, 'ServiceTaskRole', {
      roleName: `ecs-service-task-role`,
      description: 'The role for c8 services containers to assume with access to the appropriate resources.',
      assumedBy: new iam.ServicePrincipal('ecs-tasks.amazonaws.com'),
    });

    taskRole.addToPolicy(
      new iam.PolicyStatement({
        effect: iam.Effect.ALLOW,
        actions: ['ssm:GetParameter'],
        resources: [`arn:aws:ssm:${cdk.Aws.REGION}:${cdk.Aws.ACCOUNT_ID}:*`],
      })
    );
    
    taskRole.addToPolicy(new iam.PolicyStatement({
        effect: iam.Effect.ALLOW,
        actions: ["secretsmanager:GetSecretValue",
            "secretsmanager:DescribeSecret",
            "secretsmanager:ListSecretVersionIds"
        ],
        resources: [`arn:aws:ssm:${cdk.Aws.REGION}:${cdk.Aws.ACCOUNT_ID}:*`],
    }));

    const execRole = iam.Role.fromRoleArn(this, 'executionRole', props.taskDefinition.executionRoleArn);
    // const taskRole = iam.Role.fromRoleArn(this, 'taskRole', props.taskDefinition.taskRoleArn);

    const cpu = props.taskDefinition.cpu ? parseInt(props.taskDefinition.cpu) : parseInt(this.defaultCpu);
    const memory = props.taskDefinition.memory ? parseInt(props.taskDefinition.memory) : parseInt(this.defaultMemory);

    const taskDefinitionProps: ecs.FargateTaskDefinitionProps = {
      executionRole: execRole,
      cpu,
      family: props.taskDefinition.family,
      memoryLimitMiB: memory,
      taskRole: taskRole,
    };

    this.taskDefinition = new ecs.FargateTaskDefinition(this, `${props.serviceName}TaskDefinition`, taskDefinitionProps);

    props.taskDefinition.containerDefinitions.forEach((definition) => {
      const logGroup = new logs.LogGroup(this, `${definition.name}ContainerLogGroup`, {
        logGroupName: `/ecs/${definition.name}`,
        retention: logs.RetentionDays.ONE_MONTH,
        removalPolicy: cdk.RemovalPolicy.DESTROY,
      });

      const containerDefinitionProps: ecs.ContainerDefinitionProps = {
        taskDefinition: this.taskDefinition,
        image: ecs.ContainerImage.fromEcrRepository(repository, props.ecrImageTag),
        essential: definition.essential,
        logging: ecs.LogDriver.awsLogs({
          streamPrefix: 'ecs',
          logGroup: logGroup,
        }),
        environment: definition.environment,
        secrets: definition.secrets,
        dockerLabels: definition.dockerLabels,
      };

      const taskContainer = this.taskDefinition.addContainer(definition.name, containerDefinitionProps);

      definition.portMappings?.forEach((mapping) => {
        taskContainer.addPortMappings(mapping);
      });
    });
  }

  public fargateTaskDefinition(): ecs.FargateTaskDefinition {
    return this.taskDefinition;
  }
}
