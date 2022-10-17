import proj4 from 'proj4';
import {register} from 'ol/proj/proj4';
import {Map, View} from 'ol';
import TileLayer from 'ol/layer/Tile';
import TileWMS from 'ol/source/TileWMS';
import {get as getProjection} from 'ol/proj';
import MousePosition from 'ol/control/MousePosition';
import ScaleLine from 'ol/control/ScaleLine';

import * as measure from './modules/tool-measure';

// EPSG:32628 projection
proj4.defs(
    "EPSG:32628",
    "+proj=utm +zone=28 +datum=WGS84 +units=m +no_defs +type=crs"
);
register(proj4);

export let map;

export const view = new View({
    projection: getProjection('EPSG:32628'),
    center: [326834.62, 3139762.92],
    extent: [323220.4023237814, 3137760.6135218954, 330131.9412516408, 3141794.416367382],
    zoom: 15
});

export function init_map(data) {
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
                    serverType: layer.source.serverType
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

    init_events();

    init_controls(data);
}

function map_singleclick(evt) {
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
                    width: 600,
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

function init_events() {
    // singleclick
    map.on('singleclick', map_singleclick);  
}

function init_controls(data) {
    // mouse position
    map.addControl(new MousePosition({
        target: 'coordinate-utm',
        coordinateFormat: function(coordinate) {
            return 'x: ' + coordinate[0].toLocaleString() + ' y: ' + coordinate[1].toLocaleString();
        },
        projection: 'EPSG:32628',
    }));

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
        open_toc();
    });

    // tools btn
    $('#tools-btn').button({icon: 'btn-tools-class'});
    $('#tools-btn').on('click', () => {
        open_tools();
    });
}

function open_toc() {
    $("#toc").dialog({
        position: { my: 'right top', at: 'left top', of: $('#toc-btn') },
        autoOpen: false,
        width: 400,
        height: 300,
        title: 'Capas'
    });
    if ($('#toc').dialog('isOpen')) {
        $('#toc').dialog('close');
    } else {
        $('#toc').dialog('open');
        $('#toc-layers').controlgroup({'direction': 'vertical'});
    }
}

function open_tools() {
    let tool_dialog = $('#tools-div').dialog({
        position: { my: 'right top', at: 'left top', of: $('#tools-btn') },
        autoOpen: false,
        title: 'Herramientas'
    });
    if ($('#tools-div').dialog('isOpen')) {
        $('#tools-div').dialog('close');
    } else {
        $('#tools-div').dialog('open');
        $('#tools-menu').menu({
            select: function(event, ui) {
                execute_tool(event.currentTarget.id);
                tool_dialog.dialog('close');
            }
        });
    }
}

function execute_tool(tool_id) {
    switch (tool_id) {
        case 'tool-measure':
            execute_measure();
            break;
        case 'double-window':
            break;
    }
}

function execute_measure() {
    $(function() {
        $('#tool-measure-dialog').dialog({
            dialogClass: 'noclose',
            resizable: false,
            height: 'auto',
            width: 400,
            height: 250,
            title: 'Medición',
            open: function(event, ui) {
                $('#tool-measure-type').selectmenu({
                    select: function(event, ui) {
                        measure.change_type(ui.item.value);
                    }
                });
                map.un('singleclick', map_singleclick);
                measure.execute({
                    map: map,
                    type: $('#tool-measure-type').val(),
                    callback_ini: function() {
                        map.un('singleclick', map_singleclick);
                    },
                    callback_end: function() {
                        map.on('singleclick', map_singleclick);
                    }
                });
            },
            buttons: {
                'Limpiar': function() {
                    measure.clean();
                },
                'Cerrar': function() {
                    measure.finalize();
                    map.on('singleclick', map_singleclick);
                    $(this).dialog('close');
                }
            }
        });
    });
}