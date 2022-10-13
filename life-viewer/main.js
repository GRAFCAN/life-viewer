import proj4 from 'proj4';
import {register} from 'ol/proj/proj4';
import {Map, View} from 'ol';
import TileLayer from 'ol/layer/Tile';
import TileWMS from 'ol/source/TileWMS';
import {get as getProjection} from 'ol/proj';

import './style.css';


function init_map(data) {
  let layers = [];
  data.forEach(layer => {
    if (layer.type == 'TileLayer') {
      layers.push(new TileLayer({
        queryable: layer.queryable,
        name: layer.name,
        source: new TileWMS({
          url: layer.source.url,
          params: layer.source.params,
          serverType: layer.source.serverType
        })
      }));
    }
  });
  map = new Map({
    target: 'map',
    layers: layers,
    view: view
  });

  init_events();
}

function init_events() {
  map.on('singleclick', function (evt) {
    document.getElementById('info').innerHTML = '';
    const viewResolution = /** @type {number} */ (view.getResolution());
    map.getLayers().forEach((layer, index, arr) => {
      if (layer.get('queryable')) {
        const url = layer.getSource().getFeatureInfoUrl(
          evt.coordinate,
          viewResolution,
          'EPSG:32628',
          {'INFO_FORMAT': 'text/html'}
        );
        if (url) {
          // $('#info').html(
          let info_div = document.getElementById('info_' + layer.get('name'));
          if (!info_div) {
            info_div = document.createElement('div');
            document.body.appendChild(info_div);
          }
          $(info_div).html(
            '<iframe style="border: 0px; " src="' + url + '" width="100%" height="100%"></iframe>'
          )
          .dialog({
              autoOpen: false,
              modal: true,
              width: 600,
              height: 400,
              title: layer.get('name')
          });
          $(info_div).dialog('open');
        }
      }
    });
  });  
}

// EPSG:32628 projection
proj4.defs(
  "EPSG:32628",
  "+proj=utm +zone=28 +datum=WGS84 +units=m +no_defs +type=crs"
);
register(proj4);

// const layers = [
//   new TileLayer({
//     queryable: true,
//     name: 'OrtoExpress',
//     source: new TileWMS({
//       url: 'https://idecan1.grafcan.es/ServicioWMS/OrtoExpress',
//       params: {'LAYERS': 'ortoexpress', 'FORMAT': 'image/jpeg', 'TILED': true},
//       serverType: 'mapserver'
//     })
//   })
// ];

fetch('/data/layers.json')
  .then((response) => response.json())
  .then((data) => {
    init_map(data);
  });


let map;

const view = new View({
  projection: getProjection('EPSG:32628'),
  center: [326834.62, 3139762.92],
  zoom: 15
});

// const map = new Map({
//   target: 'map',
//   layers: layers,
//   view: view
// });