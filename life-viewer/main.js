import {initMap} from './modules/scripts';
import './style.css';

let data_url
if (import.meta.env.MODE == 'production') {
  data_url = '/data/layers_prod.json'
} else {
  data_url = '/data/layers.json'
}
fetch(data_url)
  .then((response) => response.json())
  .then((data) => {
    initMap(data);
  });