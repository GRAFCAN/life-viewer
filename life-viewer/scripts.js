import proj4 from 'proj4';
import {register} from 'ol/proj/proj4';
import {Map, View} from 'ol';
import TileLayer from 'ol/layer/Tile';
import TileWMS from 'ol/source/TileWMS';
import {get as getProjection} from 'ol/proj';
import MousePosition from 'ol/control/MousePosition';
import {format} from 'ol/coordinate';

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

function init_events() {
    map.on('singleclick', function (evt) {
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

function init_controls(data) {
    // mouseposition
    map.addControl(new MousePosition({
        target: 'coordinate',
        coordinateFormat: function(coordinate) {
            coordinate[0] = coordinate[0].toLocaleString();
            coordinate[1] = coordinate[1].toLocaleString();
            return '<div id="coordinate-x">X: ' + coordinate[0].toLocaleString() + '</div>'
                 + '<div id="coordinate-y">Y: ' + coordinate[1].toLocaleString() + '</div>';
        },
        className: 'coordinate-style',
        change: function(evt){
            console.log(evt); //or anything to catch the event
        },
        projection: 'EPSG:32628',
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
    $('#toc-btn').button();
    $('#toc-btn').on('click', () => {
        open_toc();
    });
}

function open_toc() {
    $("#toc").dialog({
        position: { my: 'left top', at: 'left bottom', of: $('#toc-btn') },
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