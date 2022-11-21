const { DynamoDBClient, BatchWriteItemCommand, QueryCommand } = require('@aws-sdk/client-dynamodb');
const { unmarshall } = require('@aws-sdk/util-dynamodb');

// connect to local DB if running offline
let options = {
  region: process.env.REGION,
};
if (process.env.IS_OFFLINE) {
  options = {
    region: 'localhost',
    endpoint: 'http://localhost:8000',
    credentials: { accessKeyId: 'DUMMY', secretAccessKey: 'DUMMY' },
  };
}

/**
 * @type  {DynamoDBClient} client
 */
const client = new DynamoDBClient(options);

/**
 *
 * @param  {string} tableName
 * @param  {Array<WriteRequest>} writeRequests
 * @return {Array<BatchWriteItemCommandOutput>}
 * @see https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/clients/client-dynamodb/interfaces/writerequest.html
 */
const writeItemsAsync = async (tableName, writeRequests) => {
  // 書き込みコマンド列作成
  const splitWriteRequests = splitBatchWriteItems(writeRequests);
  const commands = splitWriteRequests.map((req) => {
    return new BatchWriteItemCommand({
      RequestItems: {
        [tableName]: req,
      },
      ReturnConsumedCapacity: 'TOTAL',
    });
  });

  // コマンド送信
  return await Promise.all(
    commands.map((command) => {
      return client.send(command);
    })
  );
};

/**
 * @param  {string} tableName
 * @param  {string} deviceId
 * @param  {number} before
 * @param  {number} after
 * @param  {boolean} unmarshallFlg(true: unmarshall)
 * @return {array} items
 */
const getItemsAsync = async (tableName, deviceId, after, before, unmarshallFlg = true) => {
  const params = {
    TableName: tableName,
    KeyConditionExpression: 'DeviceId = :device_id  and SamplingTime BETWEEN :after AND :before',
    ExpressionAttributeValues: {
      ':device_id': { S: `${deviceId}` },
      ':after': { N: `${after}` },
      ':before': { N: `${before}` },
    },
  };

  const data = await client.send(new QueryCommand(params));

  if (!unmarshallFlg) {
    return data.Items;
  }

  const items = [];
  data.Items.forEach((item) => {
    items.push(unmarshall(item));
  });
  return items;
};

/**
 * @param  {string} tableName
 * @param  {string} deviceId
 * @param  {number} before
 * @param  {number} after
 * @return {array} response
 */
const deleteItemAsync = async (tableName, deviceId, after, before) => {
  // 削除コマンド列作成
  const targetItems = await getItemsAsync(tableName, deviceId, after, before, false);
  const splitWriteItems = splitBatchWriteItems(targetItems);
  const commands = splitWriteItems.map((items) => {
    return new BatchWriteItemCommand({
      RequestItems: {
        [tableName]: items.map((item) => {
          return {
            DeleteRequest: {
              Key: {
                DeviceId: item.DeviceId,
                SamplingTime: item.SamplingTime,
              },
            },
          };
        }),
      },
      ReturnConsumedCapacity: 'TOTAL',
    });
  });

  // コマンド送信
  return await Promise.all(
    commands.map((command) => {
      return client.send(command);
    })
  );
};

/**
 * 配列を指定要素数ずつに分割する
 * @param  {array} items
 * @param  {number} splitCount=25
 * @return {array} splitArray (per splitCount)
 */
const splitBatchWriteItems = (items, splitCount = 25) => {
  const b = items.length;
  if (b <= splitCount) return [items];
  const splitItems = [];

  for (let i = 0; i < Math.ceil(b / splitCount); i++) {
    const start = i * splitCount;
    const end = start + splitCount;
    const p = items.slice(start, end);
    splitItems.push(p);
  }
  return splitItems;
};

module.exports = { writeItemsAsync, getItemsAsync, deleteItemAsync };
