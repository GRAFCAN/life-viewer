import {Map, View} from 'ol';
import TileLayer from 'ol/layer/Tile';
import TileWMS from 'ol/source/TileWMS';

let active;
let callback_ini, callback_end, callback_changeMap;
let parent_map, parent_map_id;
let slave_map, slave_map_id;
let slave_view;
let map_type, active_map, theother_map;

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

export function getActive() {
    return active;
}

export function changeActiveMap(side) {
    if (side === 'left') {
        active_map = parent_map;
        theother_map = slave_map;
    } else {
        active_map = slave_map;
        theother_map = parent_map;
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
        slave_view = parent_map.getView();
    } else {
        slave_view = new View({
            projection: parent_map.getView().getProjection(),
            center: parent_map.getView().getCenter(),
            extent: parent_map.getView().calculateExtent(),
            zoom: parent_map.getView().getZoom()
        });
    }
    slave_map.setView(slave_view);
    synchronize();
}

export function synchronize() {
    if (active_map.getView() != theother_map.getView()) {
        console.log('sync');
        let zoom = active_map.getView().getZoom();
        let rotation = active_map.getView().getRotation();
        let span = (active_map == parent_map ? -1 : 1) * active_map.getView().getResolution() * active_map.getSize()[0];
        var x1 = active_map.getView().getCenter()[0];
        var y1 = active_map.getView().getCenter()[1];
        var x2 = x1 + span * Math.cos(rotation);
        var y2 = y1 + span * Math.sin(rotation);
        let center = [x2, y2];

        const same_center = (
            theother_map.getView().getCenter()[0] == center[0] &&
            theother_map.getView().getCenter()[1] == center[1]
        );
        if (!same_center) {
            theother_map.getView().setCenter(center);
        }
        if (theother_map.getView().getZoom() != zoom) {
            theother_map.getView().setZoom(zoom);
        }
        if (theother_map.getView().getRotation() != rotation) {
            theother_map.getView().setRotation(rotation);
        }
    }
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
    active_map = opt.parent_map;

    cloneMap(opt.type);
    theother_map = slave_map;

    divideWindow(opt.type);

    if (callback_ini) {
        callback_ini();
    }
}