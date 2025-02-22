import Draw from 'ol/interaction/Draw';
import {Vector as VectorSource} from 'ol/source';
import {Vector as VectorLayer} from 'ol/layer';
import Overlay from 'ol/Overlay';
import {LineString, Polygon} from 'ol/geom';
import {getArea, getLength} from 'ol/sphere';
import {unByKey} from 'ol/Observable';

let map;
let draw;
let measureTooltipElement;
let measureTooltip;
let helpTooltipElement;
let helpTooltip;
let sketch;
let callback_end;

const continuePolygonMsg = 'Clic para continuar dibujando el polígono';
const continueLineMsg = 'Clic para continuar dibujando la línea';

const source = new VectorSource();

const vector = new VectorLayer({
  source: source,
  style: [
    {
      'stroke-color': 'rgba(0, 0, 0, 0.6)',
      'stroke-width': 3
    },
    {
      'fill-color': 'rgba(0, 0, 0, 0.2)',
      'stroke-color': '#ff0000',
      'stroke-width': 1,
      'circle-radius': 5,
      'circle-stroke-color': 'rgba(0, 0, 0, 1)',
      'circle-fill-color': 'rgba(255, 0, 0, 0.6)',
    }
  ]
});

const pointerMoveHandler = function (evt) {
  if (evt.dragging) {
    return;
  }
  let helpMsg = 'Clic para comenzar a dibujar';

  if (sketch) {
    const geom = sketch.getGeometry();
    if (geom instanceof Polygon) {
      helpMsg = continuePolygonMsg;
    } else if (geom instanceof LineString) {
      helpMsg = continueLineMsg;
    }
  }

  helpTooltipElement.innerHTML = helpMsg;
  helpTooltip.setPosition(evt.coordinate);

  helpTooltipElement.classList.remove('hidden');
};

function createHelpTooltip() {
  if (helpTooltipElement) {
    helpTooltipElement.parentNode.removeChild(helpTooltipElement);
  }
  helpTooltipElement = document.createElement('div');
  helpTooltipElement.className = 'ol-tooltip hidden';
  helpTooltip = new Overlay({
    element: helpTooltipElement,
    offset: [15, 0],
    positioning: 'center-left',
  });
  map.addOverlay(helpTooltip);
}

function createMeasureTooltip() {
  if (measureTooltipElement) {
    measureTooltipElement.parentNode.removeChild(measureTooltipElement);
  }
  measureTooltipElement = document.createElement('div');
  measureTooltipElement.className = 'ol-tooltip';
  measureTooltip = new Overlay({
    element: measureTooltipElement,
    offset: [0, -15],
    positioning: 'bottom-center',
    stopEvent: false,
    insertFirst: false,
  });
  map.addOverlay(measureTooltip);
}

const formatLength = function (line) {
  const length = getLength(line);
  let output;
  if (length > 100) {
    output = Math.round((length / 1000) * 100) / 100;
    output = output.toLocaleString() + ' ' + 'km';
  } else {
    output = Math.round(length * 100) / 100;
    output = output.toLocaleString() + ' ' + 'm';
  }
  return output;
};

const formatArea = function (polygon) {
  const area = getArea(polygon);
  let output;
  if (area > 10000) {
    output = Math.round((area / 1000000) * 100) / 100 + ' ' + 'km<sup>2</sup>';
  } else {
    output = Math.round(area * 100) / 100 + ' ' + 'm<sup>2</sup>';
  }
  return output;
};

function addInteraction(type) {
  // type: Polygon, LineString
  draw = new Draw({
    source: source,
    type: type,
    style: [
      {
        'stroke-color': 'rgba(0, 0, 0, 0.6)',
        'stroke-width': 3
      },
      {
        'fill-color': 'rgba(0, 0, 0, 0.2)',
        'stroke-color': '#ff0000',
        'stroke-width': 1,
        'circle-radius': 5,
        'circle-stroke-color': 'rgba(0, 0, 0, 1)',
        'circle-fill-color': 'rgba(255, 0, 0, 0.6)',
      }
    ]
  });
  map.addInteraction(draw);
  createMeasureTooltip();
  createHelpTooltip();

  let listener;
  draw.on('drawstart', function (evt) {
    // set sketch
    sketch = evt.feature;

    /** @type {import("../src/ol/coordinate.js").Coordinate|undefined} */
    let tooltipCoord = evt.coordinate;

    listener = sketch.getGeometry().on('change', function (evt) {
      const geom = evt.target;
      let output;
      if (geom instanceof Polygon) {
        output = formatArea(geom);
        let perimeter;
        if (geom.getLinearRing(0).getCoordinates().length > 3) {
          perimeter = formatLength(new LineString(
              geom.getLinearRing(0).getCoordinates()));
        } else {
          // first edge
          perimeter = formatLength(new LineString(
            geom.getLinearRing(0).getCoordinates().slice(
              0, geom.getLinearRing(0).getCoordinates().length - 1)));
        }
        output += ' (' + perimeter + ')';
        tooltipCoord = geom.getInteriorPoint().getCoordinates();
      } else if (geom instanceof LineString) {
        output = formatLength(geom);
        tooltipCoord = geom.getLastCoordinate();
      }
      measureTooltipElement.innerHTML = output;
      measureTooltip.setPosition(tooltipCoord);
    });
  });

  draw.on('drawend', function () {
    measureTooltipElement.className = 'ol-tooltip ol-tooltip-static';
    measureTooltip.setOffset([0, -7]);
    // unset sketch
    sketch = null;
    // unset tooltip so that a new one can be created
    measureTooltipElement = null;
    createMeasureTooltip();
    unByKey(listener);
  });
}

export function clean() {
  // remove DOM tooltips
  const elements = document.getElementsByClassName('ol-tooltip');
  while(elements.length > 0){
    elements[0].parentNode.removeChild(elements[0]);
  }
  vector.getSource().clear();

  helpTooltipElement = measureTooltipElement = null;
  createMeasureTooltip();
  createHelpTooltip();
}

export function finalize() {
  clean();
  map.un('pointermove', pointerMoveHandler);
  map.removeOverlay(measureTooltip);
  map.removeOverlay(helpTooltip);
  helpTooltipElement = measureTooltipElement = null;
  map.removeInteraction(draw);
  map.removeLayer(vector);
  if (callback_end) {
    callback_end();
  }
}

export function changeType(type) {
  map.removeInteraction(draw);
  addInteraction(type);
}

export function execute(opt) {
  map = opt.map;

  if (opt.callback_ini) {
    opt.callback_ini();
  }
  callback_end = opt.callback_end;

  map.on('pointermove', pointerMoveHandler);
  map.addLayer(vector);

  map.removeInteraction(draw);
  addInteraction(opt.type);
}