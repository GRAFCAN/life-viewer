import Map from 'ol/Map';
import View from 'ol/View';
import TileLayer from 'ol/layer/Tile';
import TileWMS from 'ol/source/TileWMS';
import {unByKey} from 'ol/Observable';

let active;
let map_handlers;
let view_change_handler;
let callback_ini, callback_end, callback_changeMap;
let parent_map, parent_map_id; // left map
let slave_map, slave_map_id; // right map
let slave_view;
let map_type, // 'sync', 'extended'
    active_map; // selected map
let over_map, // pointer is over this map
    out_map; // pointer is not over this map
let parent_map_handler = [],
    slave_map_handler = [];

function cloneMap(type) {
    if (slave_map) {
        slave_map.getLayers().clear()
    }
    let layers = []
    parent_map.getLayers().forEach(layer => {
        if (layer instanceof TileLayer) {
            layers.push(new TileLayer({
                queryable: layer.get('queryable'),
                name: layer.get('name'),
                title: layer.get('title'),
                source: new TileWMS({
                    url: layer.getSource().getUrls()[0],
                    params: layer.getSource().getParams(),
                    // serverType: layer.getSource().serverType_
                }),
                visible: layer.getVisible()
            }));
        }
    });
    if (slave_map) {
        slave_map.getLayers().extend(layers)
    } else {
        slave_map = new Map({
            target: slave_map_id,
            layers: layers
        });
    }

    mapEvents(true);

    // create and set view according to map type
    changeMapType(type);
}

function divideWindow(type) {
    $('#' + parent_map_id).width('50%');
    parent_map.updateSize();
    $('#' + slave_map_id).css('visibility', 'visible');
}

function restoreWindow() {
    $('#' + parent_map_id).width('100%');
    parent_map.updateSize();
    $('#' + slave_map_id).css('visibility', 'hidden');
}

function mapPointerMove(evt) {
    if (evt.target.getTarget() == parent_map_id) {
        over_map = parent_map;
        out_map = slave_map;
    } else {
        over_map = slave_map;
        out_map = parent_map;
    }
}

function mapEvents(on) {
    // which map is the pointer over
    if (on) {
        parent_map_handler['dw:pointermove'] = parent_map.on('pointermove', mapPointerMove);
        slave_map_handler['dw:pointermove'] = slave_map.on('pointermove', mapPointerMove);
    } else {
        unByKey(parent_map_handler['dw:pointermove']);
        unByKey(slave_map_handler['dw:pointermove']);
    }

    Object.keys(map_handlers).forEach((name) => {
        if (on) {
            slave_map_handler[name] = slave_map.on(name, map_handlers[name]);
        } else {
            unByKey(slave_map_handler[name]);
        }
    });
}

// function viewEvents(on) {
//     if (slave_map.getView() == parent_map.getView()) {
//         return;
//     }
//     if (on) {
//         slave_map_handler['dw:change_view_state'] = slave_map.getView().on(
//             ['change:center', 'change:resolution', 'change:rotation'], view_change_handler);
//     } else {
//         unByKey(slave_map_handler['dw:change_view_state']);
//     }
// }

export function synchronize(evt) {
    if (out_map.view_locked) {
        return;
    }
    if (over_map.getView() != out_map.getView()) {
        let zoom = over_map.getView().getZoom();
        let rotation = over_map.getView().getRotation();
        let span = (over_map == parent_map ? 1 : -1) * over_map.getView().getResolution() * over_map.getSize()[0];
        var x1 = over_map.getView().getCenter()[0];
        var y1 = over_map.getView().getCenter()[1];
        var x2 = x1 + span * Math.cos(rotation);
        var y2 = y1 + span * Math.sin(rotation);
        let center = [x2, y2];

        out_map.view_locked = true;

        if (out_map.getView().getRotation() != rotation) {
            out_map.getView().setRotation(rotation);
        }
        if (out_map.getView().getZoom() != zoom) {
            out_map.getView().setZoom(zoom);
        }
        if (
            out_map.getView().getCenter()[0] != center[0] ||
            out_map.getView().getCenter()[1] != center[1]
        ) {
            out_map.getView().setCenter(center);
        }

        out_map.view_locked = false;
    }
}
  
export function getActive() {
    return active;
}

export function changeActiveMap(side) {
    if (side === 'left') {
        active_map = parent_map;
    } else {
        active_map = slave_map;
    }
    callback_changeMap(active_map);
}

export function getActiveMap() {
    return (active_map == parent_map ? 'left' : 'right');
}

export function getSlaveMap() {
    return slave_map;
}

export function changeMapType(type) {
    map_type = type;
    if (type == 'sync') {
        slave_map.setView(parent_map.getView());
    } else {
        if (!slave_view) {
            slave_view = new View({
                parent_map: slave_map_id,
                projection: parent_map.getView().getProjection(),
                center: parent_map.getView().getCenter(),
                // extent: import.meta.env.VITE_EXTENT.split(',').map(ele => parseFloat(ele)),
                zoom: parent_map.getView().getZoom(),
                minZoom: parseFloat(import.meta.env.VITE_MINZOOM),
                maxZoom: parseFloat(import.meta.env.VITE_MAXZOOM)
            });
        }
        slave_map.setView(slave_view);
        slave_map_handler['dw:change_view_state'] = slave_map.getView().on(
            ['change:center', 'change:resolution', 'change:rotation'], view_change_handler);
        over_map = slave_map;
        out_map = parent_map;
        synchronize();
    }
}

export function execute(opt) {
    active = true;
    map_handlers = opt.map_handlers;
    view_change_handler = opt.view_change_handler;
    callback_changeMap = opt.callback_changeMap;
    callback_ini = opt.callback_ini;
    callback_end = opt.callback_end;
    map_type = opt.type;
    parent_map = opt.parent_map;
    parent_map_id = opt.parent_map_id;
    slave_map_id = opt.slave_map_id;
    active_map = opt.parent_map;

    cloneMap(opt.type);

    divideWindow(opt.type);

    if (callback_ini) {
        callback_ini();
    }
}

export function finalize() {
    if (callback_end) {
        callback_end()
    }

    mapEvents(false)

    restoreWindow()

    active = false
}