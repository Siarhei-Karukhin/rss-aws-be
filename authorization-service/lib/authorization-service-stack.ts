import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import 'dotenv/config';

export class AuthorizationServiceStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    new lambda.Function(this, 'BasicAuthorizerFunction', {
      runtime: lambda.Runtime.NODEJS_20_X,
      code: new lambda.AssetCode('lambda'),
      handler: 'basicAuthorizer.handler',
      environment: {
        zxc: process.env.zxc!,
      },
    });
  }
}
