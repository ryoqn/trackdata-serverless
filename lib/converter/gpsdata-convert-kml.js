/**
 * @param  {} item
 */
/**
 * @param  {} gpsDataItems
 * @return {string} kml string
 */
const createKmlString = (gpsDataItems) => {
  const startTag =
    '<?xml version="1.0" encoding="UTF-8"?>\n<kml xmlns="http://www.opengis.net/kml/2.2"><Document>\n';

  // style
  const lineStyle =
    '<Style id="trackstyle"><LineStyle><color>7f00ff00</color><width>4</width></LineStyle></Style>\n';

  // line
  let lineTag =
    '<Placemark><name>tracker_line</name><styleUrl>#trackstyle</styleUrl><LineString><coordinates>\n';
  gpsDataItems.forEach((item) => {
    lineTag += `\t${item.Longitude},${item.Latitude},2\n`;
  });
  lineTag += '</coordinates></LineString></Placemark>\n';

  // point
  let points = '';
  gpsDataItems.forEach((item) => {
    const placemark = '<Placemark>\n';
    const name = `<name>${new Date(item.SamplingTime * 1000).toLocaleString('ja')}</name>\n`;
    let dataTag = '<ExtendedData>\n';
    dataTag += createDataTag('uplink_id', item.UplinkId);
    dataTag += createDataTag('router_id', item.RouterId);
    dataTag += createDataTag('device_id', item.DeviceId);
    dataTag += createDataTag('rsrp', item.Rsrp);
    dataTag += createDataTag('rsrq', item.Rsrq);
    dataTag += createDataTag(
      'sampling_time',
      new Date(item.SamplingTime * 1000).toLocaleString('ja')
    );
    dataTag += createDataTag('latitude', item.Latitude);
    dataTag += createDataTag('longitude', item.Longitude);
    dataTag += createDataTag('hdop', item.Hdop);
    dataTag += createDataTag('velocity', item.Velocity.toFixed(2));
    dataTag += createDataTag('direction', item.Direction);
    dataTag += '</ExtendedData>';
    dataTag += `<Point><coordinates>${item.Longitude},${item.Latitude},0</coordinates></Point>\n`;
    dataTag += '</Placemark>\n';
    const point = placemark + name + dataTag;
    points += point;
  });

  return startTag + lineStyle + lineTag + points + '</Document></kml>';
};

const createDataTag = (name, value) => {
  return `<Data name="${name}"><value>${value}</value></Data>\n`;
};

/**
 * @param  {array} gpsDataItems
 * @return {string} kml string
 */
const convertKml = (gpsDataItems) => {
  try {
    return createKmlString(gpsDataItems);
  } catch (error) {
    console.error(error);
  }
};

module.exports = { convertKml };
