import { handler, Cost } from '../lambda/catalogBatchProcess';
import { SNSClient, PublishCommand } from '@aws-sdk/client-sns';
import { TransactWriteCommand } from "@aws-sdk/lib-dynamodb";
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { mockClient } from 'aws-sdk-client-mock';

jest.mock('@aws-sdk/client-sns');

const snsMock = mockClient(SNSClient);
const ddbMock = mockClient(DynamoDBClient);

describe('catalogBatchProcess', () => {
  afterEach(() => {
    jest.clearAllMocks();
    snsMock.reset();
    ddbMock.reset();
  });

  test('should process valid event', async () => {
    const mockEvent = {
      Records: [
        { body: JSON.stringify({ title: 'title', description: 'desc', price: '10', count: '5' }) },
      ],
    };

    snsMock
      .on(PublishCommand, {
        TopicArn: "",
        Message: "Product with cost === 10 has been successfully saved to the database!",
        MessageAttributes: {
          cost: { DataType: 'String', StringValue: Cost.Red },
        },
      })
      .resolves({});

    ddbMock.on(TransactWriteCommand).resolves({});

    await handler(mockEvent);

    expect(snsMock.calls()).toHaveLength(1);
    expect(ddbMock.calls()).toHaveLength(1);
  });

  test('should throw an error if body is not valid', async () => {
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation();

    const mockEvent = {
      Records: [
        { body: JSON.stringify({ price: 10, count: 5 }) },
      ],
    };

    await expect(handler(mockEvent)).rejects.toEqual(new Error('Invalid data in .csv file'));

    expect(consoleSpy).toHaveBeenCalledTimes(1);
    expect(snsMock.calls()).toHaveLength(0);
    expect(ddbMock.calls()).toHaveLength(0);
  });
});
