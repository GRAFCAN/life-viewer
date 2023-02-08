import {initMap} from './modules/scripts';
import './style.css';

fetch(import.meta.env.VITE_CONTENT_FILE)
  .then((response) => response.json())
  .then((data) => {
    initMap(data);
  });