export interface EnvConfig {
  awsAccountId: string;
  awsRegion: string;
  environment: string;
  appPrefix: string;
  vpcCidr: string;
  createEnvHostedZone: boolean;
  natGatewaysCount: number;
  envDomainName: string;
  ecsClusterName: string;
  vpcSsmParam: string;
  defaultEcsExecRoleSsmParam: string;
  defaultEcsTaskRoleSsmParam: string;
  albArnSsmParam: string;
  albSecurityGroupSsmParam: string;
  albListenerSsmParam: string;
  dbSecurityGroupSsmParam: string;

  dbCredentialSecret: string;
  dbPublicAccess: boolean;
  fargateApiServices: { [key: string]: FargateServiceConfig };
  frontendServices: { [key: string]: FrontendAppConfig };
  dns: DNSConfig[];
}

export interface FargateServiceConfig {
  dockerPort: number;
  rootdomain: string;
  subdomain: string;
  rootDomainCertSsm: string;
  albPort: number;
  serviceName: string;
  dockerImageUrl: string;
  cpu: number;
  memory: number;
  taskCount: number;
  healthCheckPath: string;
  environment: Record<string, string>;
  secrets: Record<string, string>;
  priority: number;
  dockerLabels?: { [key: string]: string };
  command?: string[];
}

export interface FrontendAppConfig {
  domainName: string;
}

export interface DNSConfig {
  existingRootHostedZone: string;
  createEnvHostedZone: Boolean;
  rootDomainCertSsmParam: string;
  envDomainCertSsmParam: string;
}
