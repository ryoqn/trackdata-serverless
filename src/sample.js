const fs = require('fs');
const readline = require('readline');
const GpsData = require('../lib/sensordata/gpsdata');
const { DynamoDBClient, UpdateItemCommand } = require('@aws-sdk/client-dynamodb');

const client = new DynamoDBClient({ region: process.env.REGION });

module.exports.sample = async (event) => {
  const res = await fixDirectionAsync('./example/uplink_bin.txt');
  console.log(res);

  return {
    statusCode: 200,
    body: JSON.stringify({ message: 'webhook successfully.' }, null, 2),
  };
};

const fixDirectionAsync = async (filePath) => {
  try {
    const rs = fs.createReadStream(filePath);
    const rl = readline.createInterface({ input: rs });

    return new Promise((resolve) => {
      rl.on('line', (lineString) => {
        const contents = lineString.split(',');
        const uplinkId = contents[0];
        const routerId = contents[2];
        const deviceId = contents[3];
        const ret = fix(uplinkId, routerId, deviceId);
        console.log(ret);
      });

      rl.once('close', () => {
        resolve(true);
        console.log('close');
      });
    });
  } catch (error) {
    console.error(error);
  }
};

const fix = (uplinkId, deviceId, routerId) => {
  try {
    const buffer = fs.readFileSync(`./example/data/${uplinkId}.bin`);
    const gpsData = new GpsData(
      `${uplinkId}`,
      '2018-10-23T00:00:00+09:00',
      `${deviceId}`,
      `${routerId}`,
      buffer
    );
    gpsData.gpsRecords.forEach((record) => {
      const command = new UpdateItemCommand({
        TableName: 'dev-UplinkData',
        Key: {
          DeviceId: { S: `${deviceId}` },
          SamplingTime: { N: `${record.samplingTime}` },
        },
        UpdateExpression: 'set #direction = :direction',
        ExpressionAttributeNames: {
          '#direction': 'Direction',
        },
        ExpressionAttributeValues: {
          ':direction': { N: `${record.direction.toFixed(2)}` },
        },
      });
      client
        .send(command)
        .then((res) => {
          console.log(res);
        })
        .catch((error) => {
          throw error;
        });
    });
  } catch (error) {
    console.error(error);
  }
  return 0;
};
