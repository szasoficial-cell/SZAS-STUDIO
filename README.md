# SZAS STUDIO — FINAL BUILD

Herramienta web para edición, preparación DTF y vectorización, diseñada para publicarse directamente en GitHub Pages.

## Qué cambió

- Arquitectura modular real en `modules/`.
- Historial de deshacer/rehacer.
- Canvas y zoom separados del tamaño real de impresión.
- Eliminación de fondo con modelo de segmentación ejecutado en el navegador.
- Upscaling 4× con modelo de super-resolución ejecutado en el navegador.
- Vectorización SVG real mediante ImageTracerJS.
- Semitono DTF con ángulo, densidad, contraste y patrones.
- Descomposición RGB descargable.
- Calado alpha y limpieza de bordes.
- Recorte al contenido.
- Control de tamaño físico + DPI + diagnóstico de resolución.
- Exportación PNG/SVG.
- Fallback CPU si WebGPU falla.
- Mensajes de error y límites de memoria para reducir fallos.

## Dependencias remotas

La app es estática, pero descarga librerías/modelos desde CDN/Hugging Face cuando se usan por primera vez:

- Transformers.js 4.2.0
- `xrds/isnet-general-onnx-int8` para quitar fondo.
- `onnx-community/swin2SR-realworld-sr-x4-64-bsrgan-psnr-ONNX` para 4×.
- ImageTracerJS 1.2.6 para vectorización.

Los modelos se cachean en el navegador después de descargarse. La primera ejecución puede tardar bastante, especialmente en equipos modestos.

## Licencias

- Transformers.js: Apache-2.0.
- ISNet INT8: MIT.
- Swin2SR model: Apache-2.0.
- ImageTracerJS: Unlicense / dominio público.

**Importante:** no se incorporó BRIA RMBG-1.4 en esta build porque su licencia actual restringe el uso comercial. Para una marca comercial como SZAS es preferible usar un modelo con licencia compatible. Si posteriormente se obtiene una licencia comercial de otro modelo, se puede sustituir el motor sin cambiar la interfaz.

## Publicación

Sube todo el contenido de esta carpeta a tu repositorio de GitHub Pages. No necesitas crear manualmente `modules/`: ya viene incluida con los archivos.

## Limitaciones honestas

- El procesamiento AI ocurre en el navegador; el rendimiento depende del PC/celular.
- El upscaler AI trabaja con límites de entrada para reducir errores de memoria.
- Para impresión profesional, el archivo final debe revisarse a tamaño real; ningún editor puede garantizar por sí solo la calidad del transfer o del perfil de color de una impresora DTF.
