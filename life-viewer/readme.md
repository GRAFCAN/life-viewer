# OpenLayers + Vite

This example demonstrates how the `ol` package can be used with [Vite](https://vitejs.dev/).

To get started, run the following (requires Node 14+):

    npx create-ol-app my-app --template vite

Then change into your new `my-app` directory and start a development server (available at http://localhost:5173):

    cd my-app
    npm start

To generate a build ready for production:

    npm run build

Then deploy the contents of the `dist` directory to your server.  You can also run `npm run serve` to serve the results of the `dist` directory for preview.

# Instalación

Para la instalación del proyecto es necesario que tenga instalado [npm](https://www.npmjs.com/).

- Abra una ventana de línea de comandos y clone el proyecto.
- Dentro de la carpeta donde haya clonado el proyecto, acceda a la carpeta `life-viewer`.
- Instale las dependencias del proyecto con el comando `npm install`.
- Ejecute o genere la distribución del proyecto:
  - Ejecute el proyecto en modo desarrollo con `npm start` y acceda al visor en la dirección http://localhost:5173.
  - Genere la versión para producción con `npm run build` y luego despliegue el contenido de la carpeta `dist` en su servidor. También puede ejecutar el comando `npm run serve` para servir los resultados en modo _preview_.

## Archivo de contenidos

La ruta del archivo de contenidos se encuentra en la variable de entorno `VITE_CONTENT_FILE`, definida con el valor apropiado dentro del archivo de entorno.

## Herramientas

### Medición

Medición de longitudes, áreas y perímetros.

### Doble ventana

Composición de un mapa gemelo. La vista de este segundo mapa puede ser la misma que la del mapa principal o una vista extendida.

### Carga de archivos de formas

Soporta la carga de archivos KML, KMZ y GeoJSON.