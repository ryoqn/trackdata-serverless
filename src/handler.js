'use strict';

const GpsData = require('../lib/sensordata/gpsdata');
const SettingData = require('../lib/sensordata/settingdata');
const { writeItemsAsync, getItemsAsync, deleteItemAsync } = require('../lib/database');
const { convertCsv } = require('../lib/converter/gpsdata-convert-csv');
const { convertKml } = require('../lib/converter/gpsdata-convert-kml');
const axios = require('axios');

// const joi = require('joi');

BigInt.prototype.toJSON = function () {
  return this.toString();
};

/**
 * webhookのハンドラ（POSTメソッド）
 * @param {object} event
 * @return {object}
 */
module.exports.webhook = async (event) => {
  const body = JSON.parse(event['body']);
  const uplinkId = body.uplink_id;
  const sensorId = body.device.sensor_id;
  const sensorName = body.device.sensor_name;
  const deviceId = body.device.device_id;
  const routerId = body.router.router_id;
  const date = new Date(body.date);
  const url = body.device.data.url;
  console.info(body);

  try {
    const sensorDataBinary = await getSensorDataBinary(url);
    if (body.device.data.contentLength !== sensorDataBinary.length) {
      throw new Error(
        `invalid sensordata. contentLength is ${body.device.data.contentLength} but sensordata size is ${sensorDataBinary.length}.`
      );
    }

    let data;
    let tableName;
    let recordNum = 0;
    switch (sensorId) {
      case SettingData.SENSOR_ID:
        data = new SettingData(uplinkId, date, deviceId, routerId, sensorDataBinary);
        tableName = process.env.SETTING_TABLENAME;
        recordNum = 1;
        break;
      case GpsData.SENSOR_ID:
        data = new GpsData(uplinkId, date, deviceId, routerId, sensorDataBinary);
        tableName = process.env.GPS_TABLENAME;
        recordNum = data.gpsRecordNum;
        break;
      default:
        throw new Error(`invalid sensor id. sensor_id: ${sensorId}`);
    }
    if (data.getGPSRecordsNum() == 0) {
      return {
        statusCode: 200,
        body: JSON.stringify(
          {
            message: 'webhook successed.(gps records is empty)',
          },
          null,
          2
        )
      };
    }
    const outputs = await writeItemsAsync(tableName, data.getWriteRequests());
    if (outputs.every((output) => 200 == output.$metadata.httpStatusCode)) {
      console.info(`create ${sensorName}. ${recordNum} records is writed.`);
      return {
        statusCode: 201,
        body: JSON.stringify(
          {
            message: 'webhook successed.',
          },
          null,
          2
        ),
      };
    }
  } catch (error) {
    console.error(`${error.name} \n ${error.message}`);
    return {
      statusCode: 400,
      body: JSON.stringify(
        {
          message: 'webhook failed.',
        },
        null,
        2
      ),
    };
  }
};

/**
 * GPSデータ削除ハンドラ（DELETEメソッド）
 * @param  {object} events
 */
module.exports.delete = async (event) => {
  console.log(event);
  try {
    const deviceId = event.queryStringParameters.device_id;
    const before = Math.floor(new Date(event.queryStringParameters.before).getTime() / 1000);
    const after = Math.floor(new Date(event.queryStringParameters.after).getTime() / 1000);
    const outputs = await deleteItemAsync(process.env.GPS_TABLENAME, deviceId, after, before);
    if (outputs.every((output) => 200 == output.$metadata.httpStatusCode)) {
      return {
        statusCode: 201,
        body: JSON.stringify(
          {
            message: 'delete successed.',
          },
          null,
          2
        ),
      };
    }
  } catch (error) {
    console.error(`${error.name} \n ${error.message}`);
    return {
      statusCode: 400,
      body: JSON.stringify(
        {
          message: 'delete failed.',
        },
        null,
        2
      ),
    };
  }
};

// /**
//  *  GETリクエストのスキーマ
//  */
// const trackerRequestSchemaForGet = joi.object().keys({
//   before: Joi.string().allow('')
// });
/**
 * GPSデータ取得ハンドラ（GETメソッド）
 * @param  {object} events
 */
module.exports.track = async (event) => {
  console.log(event);
  try {
    const deviceId = event.queryStringParameters.device_id;
    const before = Math.floor(new Date(event.queryStringParameters.before).getTime() / 1000);
    const after = Math.floor(new Date(event.queryStringParameters.after).getTime() / 1000);
    const format = event.queryStringParameters.format;
    const items = await getItemsAsync(process.env.GPS_TABLENAME, deviceId, after, before);
    console.log(items);
    switch (format) {
      case 'csv':
        return {
          statusCode: 200,
          headers: {
            'Content-disposition': 'attachment; filename=tracker.csv',
            'Content-Type': 'text/csv; charset=UTF-8',
          },
          body: convertCsv(items),
        };
      case 'json':
        return {
          statusCode: 200,
          headers: {
            'Content-Type': 'application/json; charset=UTF-8',
          },
          body: JSON.stringify(items, null, 2),
        };
      case 'kml':
        return {
          statusCode: 200,
          headers: {
            'Content-disposition': 'attachment; filename=tracker.kml',
            'Content-Type': 'vnd.google-earth.kml+xml',
          },
          body: convertKml(items),
        };
    }
  } catch (error) {
    console.error(error);
    return {
      statusCode: 400,
      body: JSON.stringify({ message: 'get tracker failed.' }, null, 2),
    };
  }
};

/**
 * センサーデータバイナリ取得
 * @param  {string} url
 * @return {Buffer} センサーデータのBufferオブジェクト
 */
const getSensorDataBinary = async (url) => {
  try {
    const res = await axios({
      method: 'get',
      url: url,
      responseType: 'arraybuffer',
    });
    return Buffer.from(res.data);
  } catch (error) {
    if (error.response) {
      console.log(error.response.data.toString('utf8'));
      console.log(error.response.status);
      console.log(error.response.headers);
    } else if (error.request) {
      console.log(error.request);
    } else {
      console.error('Error', error.message);
    }
    return null;
  }
};

/**
 * 認証ハンドラ
 * @param  {object} event
 * @return {boolean} true:認証
 */
module.exports.authorizer = async (event) => {
  let response = {
    isAuthorized: false,
  };
  const token = event.identitySource[0];
  if (token === 'my-token') {
    response.isAuthorized = true;
  }
  return response;
};