'use strict';

module.exports = class GpsData {
  static SENSOR_ID = '0095';
  static #headerSize = 6;
  static #recordSize = 24;

  /**
   * @param  {string} uplinkId
   * @param  {string} date (iso8601 format)
   * @param  {string} deviceId
   * @param  {string} routerId
   * @param  {Buffer} sensorDataBinary
   */
  constructor(uplinkId, date, deviceId, routerId, sensorDataBinary) {
    if (
      typeof uplinkId === 'undefined' ||
      typeof date === 'undefined' ||
      typeof deviceId === 'undefined' ||
      typeof routerId === 'undefined' ||
      typeof sensorDataBinary === 'undefined'
    ) {
      throw new Error('invalid parameter of gpsdata!');
    }
    this.uplinkId = uplinkId;
    this.date = new Date(date);
    this.deviceId = deviceId;
    this.routerId = routerId;
    this.rsrp = 0;
    this.rsrq = 0;
    this.gpsRecordNum = 0;
    this.gpsRecords = [];
    this.#createTrackData(sensorDataBinary);
  }

  /**
   * @param  {Buffer} byteData
   */
  #createTrackData(byteData) {
    this.rsrp = byteData.readInt8(0);
    this.rsrq = byteData.readInt8(1);
    this.gpsRecordNum = byteData.readUInt32LE(2);

    const mustSize = this.gpsRecordNum * GpsData.#recordSize + GpsData.#headerSize;
    if (byteData.length !== mustSize) {
      throw new Error(
        `invalid size of sensor data byte! must ${mustSize}byte but ${byteData.length}byte. record num is ${this.gpsRecordNum}`
      );
    }

    for (let i = 0; i < this.gpsRecordNum; i++) {
      const gpsData = byteData.subarray(
        GpsData.#headerSize + GpsData.#recordSize * i,
        GpsData.#headerSize + GpsData.#recordSize * (i + 1)
      );
      this.gpsRecords.push(new GpsRecord(gpsData));
    }
  }

  getGPSRecordsNum() {
    return this.gpsRecords.length;
  }

  /**
   */
  getWriteRequests() {
    const writeRequests = [];
    this.gpsRecords.forEach((value) => {
      const putRequest = {
        PutRequest: {
          Item: {
            UplinkId: { S: `${this.uplinkId}` },
            Date: { N: `${Math.floor(this.date.getTime() / 1000)}` },
            DeviceId: { S: `${this.deviceId}` },
            RouterId: { S: `${this.routerId}` },
            Rsrq: { N: `${this.rsrq}` },
            Rsrp: { N: `${this.rsrp}` },
            SamplingTime: { N: `${value.samplingTime}` },
            Longitude: { N: `${value.longitude.toFixed(5)}` },
            Latitude: { N: `${value.latitude.toFixed(5)}` },
            Hdop: { N: `${value.hdop.toFixed(2)}` },
            Velocity: { N: `${value.velocity.toFixed(2)}` },
            Direction: { N: `${value.direction.toFixed(2)}` },
            Expiration: { N: `${this.date.getTime() + 604800000}` },
          },
        },
      };
      writeRequests.push(putRequest);
    });
    return writeRequests;
  }

  /**
   */
  toString() {
    let ret =
      `uplink_id : ${this.uplinkId}\n` +
      `date: ${Math.floor(this.date.getTime() / 1000)}\n` +
      `device_id: ${this.deviceId}\n` +
      `router_id: ${this.routerId}\n` +
      `rsrp: ${this.rsrp}\n` +
      `rsrq: ${this.rsrq}\n` +
      `gps_records_num: ${this.gpsRecordNum}\n`;
    this.gpsRecords.forEach(
      (value, index) => (ret += `gps_records_index: ${index}\n` + value.toString())
    );
    return ret;
  }
};

class GpsRecord {
  static #size = 24;

  /**
   * @param  {Buffer} byteData
   */
  constructor(byteData) {
    if (byteData.length != GpsRecord.#size) {
      throw new Error('invalid size of gps data!');
    }
    this.samplingTime = byteData.readInt32LE(0);
    this.latitude = byteData.readFloatLE(4);
    this.longitude = byteData.readFloatLE(8);
    this.hdop = byteData.readFloatLE(12);
    this.velocity = byteData.readFloatLE(16);
    this.direction = byteData.readFloatLE(20);
  }

  /**
   */
  toString() {
    return (
      ` sampling_time : ${this.samplingTime}\n` +
      ` latitude: ${this.latitude.toFixed(5)}\n` +
      ` longitude: ${this.longitude.toFixed(5)}\n` +
      ` hdop: ${this.hdop.toFixed(5)}\n` +
      ` velocity: ${this.velocity.toFixed(2)}\n` +
      ` direction: ${this.direction.toFixed(2)}\n`
    );
  }
}
