import {Map, View} from 'ol';
import TileLayer from 'ol/layer/Tile';
import TileWMS from 'ol/source/TileWMS';

let active;
let callback_ini, callback_end, callback_changeMap;
let parent_map, parent_map_id;
let slave_map, slave_map_id;
let slave_view;
let map_type, active_map;

function cloneMap(type) {
    // view
    if (type == 'sync') {
        slave_view = parent_map.getView();
    } else {
        slave_view = new View({
            projection: parent_map.getView().getProjection(),
            center: parent_map.getView().getCenter(),
            extent: parent_map.getView().calculateExtent(),
            zoom: parent_map.getView().getZoom()
        });
        // sync code
        var span =(p.idmap === 1 ? -1 : 1) * mmap.getView().getResolution() * mmap.getSize()[0];
        var x1 = mmap.getView().getCenter()[0];
        var y1 = mmap.getView().getCenter()[1];
        var x2 = x1 + span * Math.cos(rotation);
        var y2 = y1 + span * Math.sin(rotation);
        center = [x2, y2];        
    }

    // map
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
                    serverType: layer.getSource().serverType_
                }),
                visible: layer.getVisible()
            }));
        }
    });
    slave_map = new Map({
        target: slave_map_id,
        layers: layers,
        view: slave_view
    });
}


function divideWindow(type) {
    $('#' + parent_map_id).width('50%');
    parent_map.updateSize();
    $('#' + slave_map_id).css('visibility', 'visible');
    if (type == 'sync') {
    } else {
    }
}

function restoreWindow() {
    $('#' + parent_map_id).width('100%');
    parent_map.updateSize();
    $('#' + slave_map_id).css('visibility', 'hidden');
}

export function finalize() {
    if (callback_end) {
        callback_end();
    }

    changeActiveMap('left');
    
    active = false;

    restoreWindow();
}

export function changeActiveMap(side) {
    active_map = (side === 'left' ? parent_map : slave_map);
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
}
  
export function execute(opt) {
    active = true;
    callback_changeMap = opt.callback_changeMap;
    callback_ini = opt.callback_ini;
    callback_end = opt.callback_end;
    map_type = opt.type;
    parent_map = opt.parent_map;
    parent_map_id = opt.parent_map_id;
    slave_map_id = opt.slave_map_id;

    cloneMap(opt.type);

    divideWindow(opt.type);

    if (callback_ini) {
        callback_ini();
    }
}