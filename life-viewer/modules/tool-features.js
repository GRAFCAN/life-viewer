import VectorLayer from 'ol/layer/Vector';
import VectorSource from 'ol/source/Vector';
import KML from 'ol/format/KML';
import GeoJSON from 'ol/format/GeoJSON';

import JSZip from 'jszip';

const xml_mime = 'text/xml';
const kml_mime = 'application/vnd.google-earth.kml+xml';
const kmz_mime = 'application/vnd.google-earth.kmz';

export function loadFromString(source, projection) {
    let format;
    let format_string = '';
    try {
        JSON.parse(source);
        format_string = 'geojson';
    } catch (e) {
        try {
            let parser = new DOMParser();
            const doc = parser.parseFromString(source, xml_mime);
            if ($(doc).find('parsererror').length == 0) {
                format_string = 'kml';
            } else {
                format_string = 'kmz';
            }
        } catch (e) {
            format_string = 'none';
        }
    }
    switch (format_string) {
        case 'geojson':
            format = new GeoJSON({
                featureProjection: projection
            });
            break;
        case 'kml':
            format = new KML();
            break;
        case 'kmz':
            format = new KMZ();
            break;
    }
    if (typeof format_string == '') {
        throw 'Invalid format file';
    }
    let features = format.readFeatures(source);
    if (format instanceof KML) {
        features.forEach(feature => {
            feature.getGeometry().transform('EPSG:4326', projection);
        });
    }
    const vector = new VectorLayer({
        source: new VectorSource({
            features: features
        })
    });
    return vector;
}


// KMZ files
export function loadKMZ(file, projection, callback) {
    JSZip.loadAsync(file).then(zip => {
        let format = new KMZ();
        format.readFeatures(zip, void(0), (features) => {
            features.forEach(feature => {
                feature.getGeometry().transform('EPSG:4326', projection);
            });
            const vector = new VectorLayer({
                source: new VectorSource({
                    features: features
                })
            });
            callback(vector);
        });
    });
}

const zip = new JSZip();

function getKMLData(zip, callback) {
    zip.file(/\.kml$/i)[0].async('text').then(data => {
        callback(data);
    });
}

function getKMLImage(href) {
  const index = window.location.href.lastIndexOf('/');
  if (index !== -1) {
    const kmlFile = zip.file(href.slice(index + 1));
    if (kmlFile) {
      return URL.createObjectURL(new Blob([kmlFile.asArrayBuffer()]));
    }
  }
  return href;
}

class KMZ extends KML {
    constructor(opt_options) {
        const options = opt_options || {};
        options.iconUrlFunction = getKMLImage;
        super(options);
    }

    getType() {
        return 'arraybuffer';
    }

    readFeature(source, options) {
        const kmlData = getKMLData(source);
        return super.readFeature(kmlData, options);
    }

    readFeatures(source, options, callback) {
        getKMLData(source, (data) => {
            callback(super.readFeatures(data, options));
        });
    }
}
