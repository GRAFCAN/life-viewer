import {initMap} from './modules/scripts';
import './style.css';

fetch('/data/layers.json')
  .then((response) => response.json())
  .then((data) => {
    initMap(data);
  });