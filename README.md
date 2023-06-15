# Proyecto LIFE

# Carpeta `life-viewer`

Proyecto desarrollado en JavaScript del visor [LIFE Garachico](https://lifegarachico.eu/).

Iconografía: https://pictogrammers.com/library/mdi/

# Archivo de contenidos

La ruta del archivo de contenidos se encuentra en la variable de entorno `VITE_CONTENT_FILE`, definida con el valor apropiado dentro del archivo de entorno asociado a cada modo.

## Herramientas

### Medición

Medición de longitudes, áreas y perímetros.

### Doble ventana

Composición de un mapa gemelo. La vista de este segundo mapa puede ser la misma que la del mapa principal o una vista extendida.

El _bounding_ del visor no se restringe porque la herramienta no se comporta correctamente cuando nos encontramos en los extremos de la vista.

### Carga de archivos de formas

Soporta la carga de KML, KMZ y GeoJSON.