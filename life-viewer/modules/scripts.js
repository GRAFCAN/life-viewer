import proj4 from 'proj4';
import {register} from 'ol/proj/proj4';
import Map from 'ol/Map';
import View from 'ol/View';
import TileLayer from 'ol/layer/Tile';
import TileWMS from 'ol/source/TileWMS';
import ImageLayer from 'ol/layer/Image';
import ImageWMS from 'ol/source/ImageWMS'
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

function recLayers(data) {
    // retrieve layers from JSON
    let layers = []
    data.forEach(item => {
        if (item.type == 'TileLayer') {
            layers.unshift(new TileLayer({
                queryable: item.queryable,
                name: item.name,
                title: item.title,
                opacity: item.opacity,
                source: new TileWMS({
                    url: item.source.url,
                    params: item.source.params,
                    // serverType: item.source.serverType
                }),
                visible: item.visible
            }))
        } else if (item.type == 'ImageLayer') {
            layers.unshift(new ImageLayer({
                queryable: item.queryable,
                name: item.name,
                title: item.title,
                opacity: item.opacity,
                source: new ImageWMS({
                    url: item.source.url,
                    params: item.source.params,
                    // serverType: item.source.serverType
                }),
                visible: item.visible
            }))
        } else if (item.type.match(/group|folder/) && item.nodes) {
            layers = recLayers(item.nodes).concat(layers)
        }
    })
    return layers
}

export function initMap(data) {
    let layers = recLayers(data);

    map = new Map({
        target: 'map',
        layers: layers,
        view: view
    });

    initControls(data);

    initEvents();
}

function smallScreen() {
    return $(window).width() <= 414;
}

function addInfoTab(name, title, url, height=300) {
    const id = `info-${name}`
    const tabs = $('#info-tabs').tabs()
    const li = `<li><a href="#${id}">${title}</a></li>`
    tabs.find('.ui-tabs-nav').append(li)
    tabs.append(`<div id="${id}"><iframe style="border:0px" src="${url}" width="100%" height="${height}px"></iframe></div>`)
    tabs.tabs('refresh')
}

function removeAllInfoTabs() {
    $('#info').html('<div id="info-tabs"><ul></ul></div>')
}

function mapSingleclick(evt) {
    let urls = []
    map.getLayers().forEach((layer, index, arr) => {
        if (layer.get('queryable') && layer.getVisible()) {
            const url = layer.getSource().getFeatureInfoUrl(
                evt.coordinate,
                view.getResolution(),
                'EPSG:32628',
                {'INFO_FORMAT': 'text/html'}
            )
            if (url) {
                // reverse order
                urls.unshift({
                    name: layer.get('name'),
                    title: layer.get('title'),
                    url: url
                })
            }
        }
    })
    if (urls.length) {
        // remove tabs
        removeAllInfoTabs()
        $('#info').dialog({
            title: 'Información',
            position: {my: 'left top', at: 'left top'},
            width: smallScreen() ? 400 : 400,
            minWidth: smallScreen() ? 400 : 500,
            maxWidth: 800,
            minHeight: 300,
            maxHeight: 800,
        })
        urls.forEach(item => {
            addInfoTab(item.name, item.title, item.url)
        })
        $(`#info-tabs >ul >li >a`).first().click()
    }
}

function showFeatureInfo(evt) {
    let features = [];
    const pixel = map.getEventPixel(evt.originalEvent);
    map.forEachFeatureAtPixel(pixel, feature => {
        features.push(feature);
    });
    if (features.length == 1) {
        $('#feature-info').html(features[0].get('name'));
        $('#feature-info').css('left', pixel[0]);
        $('#feature-info').css('top', pixel[1]);
        $('#feature-info').show();
        $('#' + map.getTarget()).css('cursor', 'pointer');
    } else {
        $('#feature-info').hide();
        $('#' + map.getTarget()).css('cursor', '');
    }
}

function mapPointerMove(evt) {
    if (evt.map != mousePositionControl.getMap()) {
        mousePositionControl.setMap(evt.map);
    }
}

function viewChange(evt) {
    if (doublewindow.getActive()) {
        doublewindow.synchronize(evt);
    }
}

function initEvents() {
    map_handler['singleclick'] = map.on('singleclick', mapSingleclick);
    map_handler['pointermove'] = map.on('pointermove', mapPointerMove);
    map_handler['featureinfo'] = map.on('pointermove', showFeatureInfo);
    map_handler['change_view_state'] = map.getView().on(
        ['change:center', 'change:resolution', 'change:rotation'], viewChange);
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

function restoreTocState() {
    map.getLayers().forEach(ele => {
        const name = ele.get('name')
        const title = ele.get('title')
        $(`#lyr-${name}`).checkboxradio()
        $(`#lyr-${name}`).prop('checked', ele.getVisible()).checkboxradio('refresh')
    });
}

function addLegendTab(name, title, url) {
    const id = `legend-${name}`
    if ($(`#${id}`).length) {
        // the legend already has tab
        $(`#legend-tabs >ul >li >a[href="#${id}"]`).click()
        return
    }
    const tabs = $('#legend-tabs').tabs()
    const li = `<li><a href="#${id}">${title}</a></li>`
    tabs.find('.ui-tabs-nav').append(li)
    tabs.append(`<div id="${id}"><img src="${url}"></div>`)
    tabs.tabs('refresh')
    // show tab content
    $('#legend-tabs >ul >li').last().find('a').click()
}

function removeAllLegendTabs() {
    $('#legend').html('<div id="legend-tabs"><ul></ul></div>')
}

function addContent(data, target) {
    data.forEach(ele => {
        if (ele.type.match(/layer/i)) {
            const checked = ele.visible ? 'checked ' : ''
            const layer_id = `lyr-${ele.name}`
            let container = $('<div class="layer-container"></div>').appendTo(target)
            $(container).append(`<label class="layer-label" for="${layer_id}">${ele.title}</label>`)
            $(`<input ${checked}type="checkbox" name="layers" id="${layer_id}" value="${ele.name}"></input>`)
                .appendTo(container)
                .click(() => {
                    const layer = map.getLayers().getArray().find(layer => layer.get('name') == ele.name)
                    layer.setVisible(!layer.getVisible())
                })
            if (ele.legend) {
                $('<img class="legend-img" src="/img/legend.png">')
                    .appendTo(container)
                    .click(() => {
                        let url
                        if (typeof ele.legend == 'boolean') {
                            const params = `version=1.3.0&service=WMS&request=GetLegendGraphic&sld_version=1.1.0&layer=${ele.source.params.LAYERS}&format=image/png&STYLE=default`
                            url = ele.source.url + params
                        } else {
                            url = ele.legend
                        }
                        let position = { my: 'right top', at: 'left top', of: '#toc' }
                        $('#legend').dialog({
                            title: "Leyenda",
                            position: smallScreen() ? void(0) : position,
                            minWidth: smallScreen() ? 300 : 500,
                            maxWidth: 800,
                            minHeight: 300,
                            maxHeight: 600,
                            close: () => {
                                // remove tabs
                                removeAllLegendTabs()
                            }
                        })
                        addLegendTab(ele.name, ele.title, url)
                    })
            }
        } else if (ele.type == 'group') {
            let container = $(`<div id="${ele.name}" class="accordion-group"></div>`).appendTo(target)
            if (ele.nodes) {
                addContent(ele.nodes, container)
            }
        } else if (ele.type == 'folder') {
            $(target).append(`<h3>${ele.title}</h3>`)
            let container = $(`<div id="${ele.name}"></div>`).appendTo(target)
            if (ele.nodes) {
                addContent(ele.nodes, container)
            }
        }
    })
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
    addContent(data, '#toc-layers')

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

    // groups
    $('.accordion-group').accordion({
        active: false,
        collapsible: true,
        heightStyle: 'content'
    })
}

function openToc() {
    $("#toc").dialog({
        position: { my: 'right top', at: 'left top', of: $('#toc-btn') },
        autoOpen: false,
        width: smallScreen() ? 275 : 400,
        minWidth: smallScreen() ? 275 : 400,
        height: 150,
        maxHeight: 800,
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
            width: 250,
            title: 'Medición',
            open: function(event, ui) {
                $('#tool-measure-type').selectmenu({
                    select: function(event, ui) {
                        measure.changeType(ui.item.value);
                    }
                });
                measure.execute({
                    map: map,
                    type: $('#tool-measure-type').val(),
                    callback_ini: function() {
                        unByKey(map_handler['singleclick']);
                        unByKey(map_handler['featureinfo']);
                    },
                    callback_end: function() {
                        map_handler['singleclick'] = map.on('singleclick', mapSingleclick);
                        map_handler['featureinfo'] = map.on('pointermove', showFeatureInfo);
                    }
                });
            },
            buttons: {
                'Limpiar': function() {
                    measure.clean();
                },
                'Cerrar': function() {
                    measure.finalize();
                    // map_handler['singleclick'] = map.on('singleclick', mapSingleclick);
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
            width: 325,
            height: 210,
            title: 'Doble ventana',
            // position: { my: 'right top', at: 'left top', of: $('#tools-btn')},
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
                        restoreTocState();
                    },
                    callback_ini: () => {},
                    callback_end: () => {}
                });
            },
            buttons: {
                'Cerrar': function() {
                    doublewindow.changeActiveMap('left')
                    doublewindow.changeMapType('sync')
                    $('#tool-doublewindow-active-map').val('left')
                    $('#tool-doublewindow-active-map').selectmenu('refresh')
                    $('#tool-doublewindow-type').val('sync')
                    $('#tool-doublewindow-type').selectmenu('refresh')
                    doublewindow.finalize()
                    $(this).dialog('close')
                }
            }
        });
    });
}

function addVectorLayer2Toc(ele) {
    // add vector layer to TOC with remove button
    const checked = ele.getVisible() ? 'checked ' : ''
    const name = ele.get('name').replace(/[\s|&;$%@"<>()+,]/g, '_')
    const layer_id = `lyr-${name}`
    let div = $(`<div id="lyr-div-${name}" class="user-layer-div"></div>`).prependTo('#toc-layers')
    div.append(`<img id="${layer_id}-remove" src="/img/trash.png" title="Eliminar" class="user-layer-trash"/>`)
    div.append(`<label for="${layer_id}" class="user-layer-label">${ele.get('filename')}</label>`)
    div.append(`<input ${checked}type="checkbox" name="layers" id="${layer_id}" value="${ele.get('name')}"></input>`)
    $(`input[id="${layer_id}"]`).checkboxradio()
    // layer check
    document.getElementById(layer_id).addEventListener('click', () => {
        const layer = map.getLayers().getArray().find(layer => layer.get('name') == ele.get('name'))
        layer.setVisible(!layer.getVisible())
    });
    // layer remove
    document.getElementById(`${layer_id}-remove`).addEventListener('click', () => {
        const layer = map.getLayers().getArray().find(layer => layer.get('name') == ele.get('name'))
        if (layer) {
            map.removeLayer(layer)
            $(`#lyr-div-${name}`).remove()
        }
    })
}

function toolLoadFeatures() {
    let loadFeatures = (input) => {
        let file = input.files[0];
        if (!file) {
          return;
        }
        let name = file.name.match(/(.+)(\..+)$/i)
        name = name ? name[1] : file.name
        if (file.type != 'application/vnd.google-earth.kmz') {
            // kml, geojson
            let reader = new FileReader();
            reader.onload = function(e) {
              let vector = features.loadFromString(
                e.target.result, map.getView().getProjection());
              map.addLayer(vector);
              vector.set('name', name);
              vector.set('filename', file.name)
              addVectorLayer2Toc(vector);
            }
            reader.readAsText(file);
        } else {
            // kmz
            let vector = features.loadKMZ(
                file, map.getView().getProjection(), (vector) => {
                    map.addLayer(vector);
                    vector.set('name', name);
                    vector.set('filename', file.name)
                    addVectorLayer2Toc(vector);
                }
            )
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