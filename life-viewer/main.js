import {initMap} from './scripts.js';
import './style.css';

fetch('/data/layers.json')
  .then((response) => response.json())
  .then((data) => {
    initMap(data);
  });