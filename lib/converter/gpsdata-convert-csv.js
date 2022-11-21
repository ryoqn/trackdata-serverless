const { parse } = require('json2csv');

/**
 * @param  {} item
 */
/* eslint-disable camelcase */
const myTransform = (item) => {
  return {
    uplink_id: item.UplinkId,
    date: new Date(item.Date * 1000 + 9 * 3600000).toLocaleString('ja'),
    roter_id: item.RouterId,
    device_id: item.DeviceId,
    rsrp: item.Rsrp,
    rsrq: item.Rsrq,
    sampling_time_local: new Date(item.SamplingTime * 1000).toLocaleString('ja'),
    sampling_time_unix: item.SamplingTime,
    latitude: item.Latitude,
    longitude: item.Longitude,
    hdop: item.Hdop,
    velocity: (item.Velocity * 1.943844).toFixed(2),
    direction: item.Direction,
  };
};
/* eslint-disable camelcase */

/**
 * @param  {array} gpsDataItems
 * @return {string} csv string
 */
const convertCsv = (gpsDataItems) => {
  try {
    return parse(gpsDataItems, { transforms: [myTransform] });
  } catch (error) {
    console.log(error);
  }
};

module.exports = { convertCsv };
