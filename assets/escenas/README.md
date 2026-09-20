# Escenas

Aquí deja n8n la imagen que genera OpenAI a partir de la foto real del producto.
El nombre del archivo es el `sku` en minúsculas más la extensión.

El Action `render-post` coge esta imagen, le compone encima el nombre, el detalle
y el precio que vienen de la hoja, y deja el resultado en `assets/publicaciones/`.

No se edita nada aquí a mano.
