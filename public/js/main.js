import makeLineCoordinates from './shape.js';

const arrowSideLength = 15;
const arrowSideAngle = 8;
const minArrowSpacing = 600;

const arrowParams = {
  arrowSideLength,
  arrowSideAngle: Math.PI / arrowSideAngle,
  minArrowSpacing,
};

const initialView = [35.64807, 139.74164];
let map;
let markers = [];
let myLines = [];
let myArrows = [];

const createMap = () => {
  let m = L.map('map').setView(initialView, 5);
  L.tileLayer(
    // 'https://cartodb-basemaps-{s}.global.ssl.fastly.net/dark_all/{z}/{x}/{y}.png',
    'https://cyberjapandata.gsi.go.jp/xyz/pale/{z}/{x}/{y}.png',
    {
      attribution: '&copy; <a target="_blank" href="https://maps.gsi.go.jp/development/ichiran.html">地理院地図</a>',
      subdomains: 'abcd',
      maxZoom: 20,
    }
  ).addTo(m);

  return m;
};

let lines = [];
const lineColor = 'royalblue';

const createLines = (trackerDatas) => {
  const markerLocations = trackerDatas.map((data) => {
    return [data.Latitude, data.Longitude, data.UplinkId];
  });

  for (let i = 1; i < markerLocations.length; ++i) {
    let from = markerLocations[i - 1];
    let to = markerLocations[i];
    const fromUplinkId = from[2];
    const toUplinkId = to[2];
    let width = 1;
    let dashArray= "3,10";
    let dashOffset = "3";
    if (fromUplinkId === toUplinkId) {
      width = 5;
      dashArray = null;
      dashOffset = null;
    }
    let calcLine = makeLineCoordinates(map, from, to);
    let path = calcLine(arrowParams);
    let line = L.polyline(path.line, { color: lineColor, weight: width, dashArray: dashArray, dashOffset: dashOffset });
    let arrow = L.polyline(path.arrow, { color: lineColor, fill: lineColor, fillOpacity: 1 });

    const l = line.addTo(map);
    //const a = arrow.addTo(map);
    //myArrows.push(a);
    myLines.push(l);

    lines.push({ line, arrow, calcLine });
  }

  var last = markerLocations.slice(-1)[0];
  map.setView([last[0], last[1]], 15);

  let geojsonMarkerOptions = {
    radius: 4,
    fillColor: "#00ffff",
    color: "#00f",
    weight: 1,
    opacity: 1,
    fillOpacity: 0.8
};
  // popup
  const l = trackerDatas.forEach( (l, index) => {
    let pop = {};
    let interval = 0;
    if (index !== 0) {
      interval = l.SamplingTime - trackerDatas[index-1].SamplingTime
    }

    pop = L.popup({
      autoClose: false,
    });
    pop.setContent(
      `interval:${interval} <br />
      samplingTime:${new Date(l.SamplingTime * 1000 - (9*3600*1000)).toLocaleString('ja')} <br />
      uplinkTime:${new Date(l.Date * 1000).toLocaleString('ja')} <br />
      rsrp:${l.Rsrp} <br />
      rsrq:${l.Rsrq} <br />
      hdop:${l.Hdop}  <br />
      direction:${l.Direction}  <br />`
    );

    if (index === trackerDatas.length - 1) {
      const marker = L.marker([l.Latitude, l.Longitude]).addTo(map)
      marker.bindPopup(pop);
      markers.push(marker);
    } else {
      const marker = L.circleMarker([l.Latitude, l.Longitude], geojsonMarkerOptions).addTo(map);
      marker.bindPopup(pop);
      markers.push(marker);
    }
  })
};

const recalculateArrows = () => {
  for (let line of lines) {
    let path = line.calcLine(arrowParams);
    //line.arrow.setLatLngs(path.arrow);
    line.arrow.redraw();
  }
};

const getTrackerData = async (deviceId, after, before ) => {
  const params = {
    device_id: deviceId,
    after: after,
    before: before,
    format: 'json',
  };

  const queryParams = new URLSearchParams(params);
  const url = '';
  return await fetch(url + '?' + queryParams, {
    headers: {
      'X-Webhook-Token': '',
    },
  });
};

map = createMap();

map.on('zoom', recalculateArrows);

$('#updateButton').on('click', function () {
  markers.forEach( m => {
    map.removeLayer(m);
  })

  myLines.forEach( l => {
    map.removeLayer(l);
  })

  myArrows.forEach( a => {
    map.removeLayer(a);
  })

  const deviceId = $('#inputDeviceId').val()
  var after = $('#datetimeAfter').val();
  if (after.length > 0) {
    after = `${after.replace(' ', 'T')}:00`
    after = `${after.replaceAll('/', '-')}`;
  }
  var before = $('#datetimeBefore').val();
  if (before.length > 0) {
    before = `${before.replace(' ', 'T')}:59`
    before = `${before.replaceAll('/', '-')}`;
  }
  getTrackerData(deviceId, after, before)
  .then((response) => response.json())
  .then((trackerDatas) => createLines(trackerDatas))
  .catch((error) => console.log(error));
});

$(function () {
  $('#datetimeAfter, #datetimeBefore').datetimepicker({
    dayViewHeaderFormat: 'YYYY年 MMMM',
    tooltips: {
      close: '閉じる',
      selectMonth: '月を選択',
      prevMonth: '前月',
      nextMonth: '次月',
      selectYear: '年を選択',
      prevYear: '前年',
      nextYear: '次年',
      selectTime: '時間を選択',
      selectDate: '日付を選択',
      prevDecade: '前期間',
      nextDecade: '次期間',
      selectDecade: '期間を選択',
      prevCentury: '前世紀',
      nextCentury: '次世紀',
    },
    format: 'YYYY/MM/DD HH:mm',
    locale: 'ja',
    icons: {
      time: 'far fa-clock',
      date: 'far fa-calendar-alt',
      up: 'fas fa-arrow-up',
      down: 'fas fa-arrow-down',
    },
    buttons: {
      showClose: true,
    },
  });
});
