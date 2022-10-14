import {init_map} from './scripts.js';
import './style.css';

fetch('/data/layers.json')
  .then((response) => response.json())
  .then((data) => {
    init_map(data);
  });