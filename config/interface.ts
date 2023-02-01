export interface EnvConfig {
    awsAccountId: string;
    awsRegion: string;
    environment: string;
    appPrefix: string;
    vpcCidr: string;
    createEnvHostedZone: boolean;
    natGatewaysCount: number;
    rootDomainName: string;
    envDomainName?: string;
    rootDomainCertArn?: string;
    ecsClusterName: string;
    vpcSsmParam: string;
    defaultEcsExecRoleSsmParam: string;
    defaultEcsTaskRoleSsmParam: string;
    albArnSsmParam: string;
    albSecurityGroupSsmParam: string;
    dbSecurityGroupSsmParam: string;
    domainCertSsmParam: string;
    dbCredentialSecret: string;
    dbPublicAccess: boolean;
    showcaseApp: FrontendAppConfig;
    databaseApi: FargateServiceConfig;
    adminApi: FargateServiceConfig;
}

export interface FargateServiceConfig {
    dockerPort: number;
    subdomain: string;
    albPort: number;
    serviceName: string;
    dockerImageUrl: string;
    cpu: number;
    memory: number;
    taskCount: number;
    environment: Record<string, any>[];
}

export interface FrontendAppConfig {
    domainName: string;
}
