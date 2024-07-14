enum Access {
  Allow = "Allow",
  Deny = "Deny",
}

const generatePermission = (effect: Access, resource: string) => ({
  principalId: 'user',
  policyDocument: {
    Version: '2012-10-17',
    Statement: [
      {
        Action: 'execute-api:Invoke',
        Effect: effect,
        Resource: resource,
      },
    ],
  },
});

export const handler = async (event: any) => {
  console.log('event: ', event);

  try {
    const { authorizationToken } = event;

    if (!authorizationToken || !authorizationToken.startsWith('Basic ')) {
      throw new Error();
    }
  
    const credentials = authorizationToken.split(' ')[1];
  
    if (!credentials) {
      throw new Error();
    }
  
    const [userName, password] = Buffer.from(credentials, 'base64').toString().split(':');
  
    const dotEnvPassword = process.env[userName];
  
    if (!dotEnvPassword || dotEnvPassword !== password) {
      throw new Error();
    }
  
    return generatePermission(Access.Allow, event.methodArn);
  } catch (e) {
    return generatePermission(Access.Deny, event.methodArn);
  }
};
