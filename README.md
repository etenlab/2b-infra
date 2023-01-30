# Infrastructure

Project infrastructure written in CDK Typescript.

## Project structure

The project consists of several CloudFormation stacks:

1. `1 * CommonStack` - deploys resources shared across all applications (VPC, ALB, ECS Cluster, Route53 Hosted Zone)
2. `1 * DatabaseStack` - deploys Aurora PostgreSQL cluster shared across all applications
3. `N * ApiServiceStack` - deploys project APIs hosted on ECS
4. `N * FrontendStack` - deploys project frontends hosted on S3 + CloudFront

## First-time deployment

1. Configured your AWS CLI with correct credentials. See [AWS CLI Configuration basics](https://docs.aws.amazon.com/cli/latest/userguide/cli-configure-quickstart.html) for reference.
2. Bootstrap CDK project in your AWS account if you have not done so already. See [CDK Bootstrapping docs](https://docs.aws.amazon.com/cdk/v2/guide/bootstrapping.html) for reference.
3. Install project dependencies: `npm install`.
4. Check environment configuration in `./config/dev.yaml` for developnet environment. Use `./config/prod.yaml` for production.
5. Deploy Common stack: `cdk deploy -c env=dev CommonStack`
6. Find deployed Route53 hosted zone and add NS records to your DNS provider.
7. Deploy Database stack `cdk deploy -c env=dev DatabaseStack`
8. Deploy other stack/s of your choice:
   - single stack: `cdk deploy -c env=dev CommonStack`.
   - several stacks: `cdk deploy -c env=dev DatabaseApiStack, AdminApiStack`.

## Useful commands

- `npm run build` compile typescript to js
- `npm run watch` watch for changes and compile
- `npm run test` perform the jest unit tests
- `cdk deploy` deploy this stack to your default AWS account/region
- `cdk diff` compare deployed stack with current state
- `cdk synth` emits the synthesized CloudFormation template

## How to add new API stack

1. Add API configuration into `./config/dev.yaml`. See `databaseApi` config for example.
2. Add new `ApiServiceStack` into `./bin/app.ts`. See `databaseApiStack` for example.
3. Deploy API using `cdk deploy -c env=dev <NEW_API_STACK_NAME>`

## How to add new Frontend stack

1. Add frontend configuration into `./config/dev.yaml`. See `showcaseApp` config for example.
2. Add new `ApiServiceStack` into `./bin/app.ts`. See `showcaseAppStack` for example.
3. Deploy frontend using `cdk deploy -c env=dev <NEW_FRONTEND_STACK_NAME>`
