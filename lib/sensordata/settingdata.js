'use strict';

module.exports = class SettingData {
  static SENSOR_ID = '0000';
  static #dataSize = 25;

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
      throw new Error('invalid parameter of settingdata!');
    }

    const b = sensorDataBinary;
    this.appFwVersion = `${b.readInt8(0)}.${b.readInt8(1)}.${b.readInt8(2)}`;
    this.lteCurrentFwVersion = `${b.readInt8(3)}.${b.readInt8(4)}.${b.readInt8(5)}`;
    this.lteLatestFwVersion = `${b.readInt8(6)}.${b.readInt8(7)}.${b.readInt8(8)}`;
    this.timeZone = b.readInt8(9);
    this.limitSatelliteNum = b.readInt8(10);
    this.limitRsrp = b.readInt8(11);
    this.limitRsrq = b.readInt8(12);
    this.samplingMode = b.readInt8(13);
    this.samplingCycle = b.readInt32LE(14);
    this.uplinkMode = b.readInt8(18);
    this.uplinkCycle = b.readInt32LE(19);
    this.pollingDownlinkCycle = b.readInt16LE(23);
  }
  /**
   * DynamoDB用書き込みアイテム
   */
  getWriteRequests() {
    const writeRequests = [];
    const putRequest = {
      PutRequest: {
        Item: {
          UplinkId: { S: `${this.uplinkId}` },
          Date: { N: `${Math.floor(this.date.getTime() / 1000)}` },
          DeviceId: { S: `${this.deviceId}` },
          RouterId: { S: `${this.routerId}` },
          AppFwVersion: { S: `${this.appFwVersion}` },
          LteCurrentFwVersion: { S: `${this.lteCurrentFwVersion}` },
          LteLatestFwVersion: { S: `${this.lteLatestFwVersion}` },
          TimeZone: { N: `${this.timeZone}` },
          LimitSatelliteNum: { N: `${this.limitSatelliteNum}` },
          LimitRsrp: { N: `${this.limitRsrp}` },
          LimitRsrq: { N: `${this.limitRsrq}` },
          SamplingMode: { N: `${this.samplingMode}` },
          SamplingCycle: { N: `${this.samplingCycle}` },
          UplinkMode: { N: `${this.uplinkMode}` },
          UplinkCycle: { N: `${this.uplinkCycle}` },
          PollingDownlinkCycle: { N: `${this.pollingDownlinkCycle}` },
        },
      },
    };
    writeRequests.push(putRequest);
    return writeRequests;
  }

  /**
   */
  toString() {
    return (
      `appFwVersion: ${this.appFwVersion}\n` +
      `lteCurrentFwVersion: ${this.lteCurrentFwVersion}\n` +
      `lteLatestFwVersion: ${this.lteLatestFwVersion}\n` +
      `timeZone: ${this.timeZone}\n` +
      `limitSatelliteNum: ${this.limitSatelliteNum}\n` +
      `limitRsrp: ${this.limitRsrp}\n` +
      `limitRsrq: ${this.limitRsrq}\n` +
      `samplingMode: ${this.samplingMode}\n` +
      `samplingCycle: ${this.samplingCycle}\n` +
      `uplinkMode: ${this.uplinkMode}\n` +
      `uplinkCycle: ${this.uplinkCycle}\n` +
      `pollingDownlinkCycle: ${this.pollingDownlinkCycle}\n`
    );
  }
};
