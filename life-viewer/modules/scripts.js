import proj4 from 'proj4';
import {register} from 'ol/proj/proj4';
import {Map, View} from 'ol';
import TileLayer from 'ol/layer/Tile';
import TileWMS from 'ol/source/TileWMS';
import {get as getProjection} from 'ol/proj';
import MousePosition from 'ol/control/MousePosition';
import ScaleLine from 'ol/control/ScaleLine';
import {unByKey} from 'ol/Observable';

import * as measure from './tool-measure';
import * as doublewindow from './tool-doublewindow';
import * as features from './tool-features';

// EPSG:32628 projection
proj4.defs(
    "EPSG:32628",
    "+proj=utm +zone=28 +datum=WGS84 +units=m +no_defs +type=crs"
);
register(proj4);

export let map;
let map_handler = [];
let mousePositionControl;

let view = new View({
    projection: getProjection('EPSG:32628'),
    center: import.meta.env.VITE_CENTER.split(',').map(ele => parseFloat(ele)),
    // extent: import.meta.env.VITE_EXTENT.split(',').map(ele => parseFloat(ele)),
    zoom: parseFloat(import.meta.env.VITE_ZOOM),
    minZoom: parseFloat(import.meta.env.VITE_MINZOOM),
    maxZoom: parseFloat(import.meta.env.VITE_MAXZOOM)
});

export function initMap(data) {
    let layers = [];
    data.forEach(layer => {
        if (layer.type == 'TileLayer') {
            layers.push(new TileLayer({
                queryable: layer.queryable,
                name: layer.name,
                title: layer.title,
                source: new TileWMS({
                    url: layer.source.url,
                    params: layer.source.params,
                    // serverType: layer.source.serverType
                }),
                visible: layer.visible
            }));
        }
    });
    map = new Map({
        target: 'map',
        layers: layers,
        view: view
    });

    initControls(data);

    initEvents();
}

function mapSingleclick(evt) {
    let offset = 10;
    const viewResolution = /** @type {number} */ (view.getResolution());
    map.getLayers().forEach((layer, index, arr) => {
        if (layer.get('queryable') && layer.getVisible()) {
            const url = layer.getSource().getFeatureInfoUrl(
                evt.coordinate,
                viewResolution,
                'EPSG:32628',
                {'INFO_FORMAT': 'text/html'}
            );
            if (url) {
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
                    modal: false,
                    width: 500,
                    height: 400,
                    title: layer.get('title'),
                    position: { my: 'left top', at: 'left+' + offset + ' top+' + offset }
                });
                $(info_div).dialog('open');
                offset += 40;
            }
        }
    });
}

function mapPointerMove(evt) {
    if (evt.map != mousePositionControl.getMap()) {
        mousePositionControl.setMap(evt.map);
    }
}

function viewChange(evt) {
    if (typeof evt.target.get('parent_map') == 'undefined') {
        console.log('main change:view');
    }
    if (doublewindow.getActive()) {
        doublewindow.synchronize(evt);
    }
}

function initEvents() {
    map_handler['singleclick'] = map.on('singleclick', mapSingleclick);
    map_handler['pointermove'] = map.on('pointermove', mapPointerMove);
    map_handler['change_view_state'] = map.getView().on(
        ['change:center', 'change:resolution', 'change:rotation'], viewChange);
    map_handler['view_error'] = map.getView().on('error', (evt) => {
        console.log('error on main view');
    });
}

function refreshToc() {
    $('#toc-layers').empty();
    map.getLayers().forEach(ele => {
        const name = ele.get('name')
        const title = ele.get('title')
        const checked = ele.getVisible() ? 'checked ' : '';
        $('#toc-layers').prepend('<label for="lyr-' + name + '">' + title + '</label>');
        $('#toc-layers').prepend(
            '<input ' + checked + 'type="checkbox" name="layers" id="lyr-' + name + '" value="' + name + '"></input>');
        $('#lyr-' + name).on('click', () => {
            const layer = map.getLayers().getArray().find(layer => layer.get('name') == name);
            layer.setVisible(!layer.getVisible());
        });
    });
}

function initControls(data) {
    // mouse position
    mousePositionControl = new MousePosition({
        target: 'coordinate-utm',
        coordinateFormat: function(coordinate) {
            return 'x: ' + coordinate[0].toLocaleString() + ' y: ' + coordinate[1].toLocaleString();
        }
    });

    // scale
    map.addControl(new ScaleLine({
        target: 'scale'
    }));

    // add toc layers
    data.forEach(ele => {
        const checked = ele.visible ? 'checked ' : '';
        $('#toc-layers').prepend('<label for="lyr-' + ele.name + '">' + ele.title + '</label>');
        $('#toc-layers').prepend(
            '<input ' + checked + 'type="checkbox" name="layers" id="lyr-' + ele.name + '" value="' + ele.name + '"></input>');
        $('#lyr-' + ele.name).on('click', () => {
            const layer = map.getLayers().getArray().find(layer => layer.get('name') == ele.name);
            layer.setVisible(!layer.getVisible());
        });
    });

    // toc btn
    $('#toc-btn').button({icon: 'btn-layers-class'});
    $('#toc-btn').on('click', () => {
        openToc();
    });

    // tools btn
    $('#tools-btn').button({icon: 'btn-tools-class'});
    $('#tools-btn').on('click', () => {
        openTools();
    });
}

function openToc() {
    $("#toc").dialog({
        position: { my: 'right top', at: 'left top', of: $('#toc-btn') },
        autoOpen: false,
        width: 300,
        height: 250,
        title: 'Capas'
    });
    if ($('#toc').dialog('isOpen')) {
        $('#toc').dialog('close');
    } else {
        $('#toc').dialog('open');
        $('#toc-layers').controlgroup({'direction': 'vertical'});
    }
}

function openTools() {
    let tool_dialog = $('#tools-div').dialog({
        position: { my: 'right top', at: 'left top', of: $('#tools-btn') },
        autoOpen: false,
        title: 'Herramientas',
        width: 200
    });
    if ($('#tools-div').dialog('isOpen')) {
        $('#tools-div').dialog('close');
    } else {
        $('#tools-div').dialog('open');
        $('#tools-menu').menu({
            select: function(event, ui) {
                executeTool(event.currentTarget.id);
                tool_dialog.dialog('close');
            }
        });
    }
}

function executeTool(tool_id) {
    switch (tool_id) {
        case 'tool-measure':
            toolMeasure();
            break;
        case 'tool-doublewindow':
            toolDoubleWindow();
            break;
        case 'tool-load-features':
            toolLoadFeatures();
            break;
    }
}

function toolMeasure() {
    $(function() {
        $('#tool-measure-dialog').dialog({
            dialogClass: 'noclose',
            resizable: false,
            height: 'auto',
            // width: 300,
            // height: 150,
            title: 'Medición',
            open: function(event, ui) {
                $('#tool-measure-type').selectmenu({
                    select: function(event, ui) {
                        measure.changeType(ui.item.value);
                    }
                });
                unByKey(map_handler['singleclick']);
                measure.execute({
                    map: map,
                    type: $('#tool-measure-type').val(),
                    callback_ini: function() {
                        unByKey(map_handler['singleclick']);
                    },
                    callback_end: function() {
                        map_handler['singleclick'] = map.on('singleclick', mapSingleclick);
                    }
                });
            },
            buttons: {
                'Limpiar': function() {
                    measure.clean();
                },
                'Cerrar': function() {
                    measure.finalize();
                    map.on('singleclick', mapSingleclick);
                    $(this).dialog('close');
                }
            }
        });
    });
}

function toolDoubleWindow() {
    $(function() {
        $('#tool-doublewindow-dialog').dialog({
            dialogClass: 'noclose',
            resizable: false,
            height: 'auto',
            width: 425,
            height: 210,
            title: 'Doble ventana',
            position: { my: 'right top', at: 'left top', of: $('#tools-btn')},
            open: function(event, ui) {
                $('#tool-doublewindow-active-map').selectmenu({
                    select: function(event, ui) {
                        doublewindow.changeActiveMap(ui.item.value);
                    }
                });
                $('#tool-doublewindow-type').selectmenu({
                    select: function(event, ui) {
                        doublewindow.changeMapType(ui.item.value);
                    }
                });
                doublewindow.execute({
                    type: $('#tool-doublewindow-type').val(),
                    parent_map: map,
                    parent_map_id: 'map',
                    slave_map_id: 'map2',
                    map_handlers: {
                        'singleclick': mapSingleclick,
                        'pointermove': mapPointerMove
                    },
                    view_change_handler: viewChange,
                    callback_changeMap: function(active_map) {
                        map = active_map;
                        refreshToc();
                    },
                    callback_ini: () => {},
                    callback_end: () => {}
                });
            },
            buttons: {
                'Cerrar': function() {
                    doublewindow.finalize();
                    $(this).dialog('close');
                }
            }
        });
    });
}

function toolLoadFeatures() {
    let loadFeatures = (input) => {
        let file = input.files[0];
        if (!file) {
          return;
        }
        if (file.type != 'application/vnd.google-earth.kmz') {
            // kml, geojson
            let reader = new FileReader();
            reader.onload = function(e) {
              let vector = features.loadFromString(
                e.target.result, map.getView().getProjection());
              map.addLayer(vector);
            };
            reader.readAsText(file);
        } else {
            // kmz
            let vector = features.loadKMZ(
                file, map.getView().getProjection(), (vector) => {
                map.addLayer(vector);
            });
        }
    };
    $(function() {
        $('#tool-load-features-dialog').dialog({
            dialogClass: 'noclose',
            resizable: false,
            height: 'auto',
            title: 'Carga de formas',
            buttons: {
                'Cargar': function() {
                    loadFeatures($('#tool-load-features-input')[0]);
                    $(this).dialog('close');
                },
                'Cerrar': function() {
                    $(this).dialog('close');
                }
            }
        });
    });
}