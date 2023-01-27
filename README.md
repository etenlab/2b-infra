# Infrastructure

Project infrastructure written in CDK Typescript.

## Project structure

The project consists of several CloudFormation stacks:

1. `1 * CommonStack` - deploys resources shared across all applications (VPC, ALB, ECS Cluster, Route53 Hosted Zone)
2. `1 * DatabaseStack` - deploys Aurora PostgreSQL cluster shared across all applications
3. `multiple * ApiServiceStack` - deploys project APIs hosted on ECS
4. `multiple * FrontendStack` - deploys project frontend hosted on S3 + CloudFront

## How to deploy

1. Install project dependencies: `npm install`.
2. Make sure your AWS CLI is configured with correct credentials.
3. Deploy stack/s of your choice:
   To deploy all stacks: `cdk deploy -c env=dev`. Make sure to specify desired environment name.
   To deploy single stack: `cdk deploy -c env=dev CommonStack`.
   To deploy several stacks: `cdk deploy -c env=dev DatabaseApiStack, AdminApiStack`.

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
