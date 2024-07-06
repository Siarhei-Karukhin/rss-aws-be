import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, TransactWriteCommand } from "@aws-sdk/lib-dynamodb";
import { v4 as uuidv4 } from 'uuid';

const isValidBody = (body: any) =>
  typeof body?.title === 'string' &&
  typeof body?.description === 'string' &&
  typeof body?.price === 'number' &&
  typeof body?.count === 'number';

const headers = {
  "Content-Type": "application/json",
  "Access-Control-Allow-Origin" : "*",
};

const client = new DynamoDBClient({});
const documentClient = DynamoDBDocumentClient.from(client);

export const handler = async (event: any) => {
  console.log('event: ', event);
  
  try {
    const body = JSON.parse(event.body);

    if (!isValidBody(body)) {
      return {
        statusCode: 400,
        headers,
        body: 'Validation Error',
      };
    }

    const id = uuidv4();

    const newProduct = {
      id,
      title: body?.title,
      description: body?.description,
      price: body?.price,
    };

    const newStock = {
      product_id: id,
      count: body?.count,
    };

    await documentClient.send(new TransactWriteCommand({
      TransactItems: [
        {
          Put: {
            TableName: process.env.PRODUCTS_TABLE,
            Item: newProduct
          }
        },
        {
          Put: {
            TableName: process.env.STOCKS_TABLE,
            Item: newStock
          }
        }
      ]
    }));

    const productWithStock = {
      ...newProduct,
      count: newStock?.count,
    };

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify(productWithStock),
    };
  } catch (error) {
    console.error(error);
    return {
      statusCode: 500,
      headers,
      body: 'Something went wrong',
    };
  }
};
