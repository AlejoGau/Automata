# backend/niches — copia empaquetada para Docker

⚠️ Esto es una **copia** de los nichos canónicos que viven en la raíz del repo (`/niches`).

Existe solo para que los nichos viajen dentro de la imagen Docker del backend
(el contexto de build es `backend/`, así que no alcanza `../niches`).

- **Fuente de verdad:** `/niches` en la raíz (lo que usa el dev local vía `../niches`).
- **En producción** el backend lee esta copia vía `MARKETING_NICHES_DIR=/app/niches` (ver Dockerfile).

Si agregás o editás un nicho en `/niches`, replicá el cambio acá antes de redesplegar:

```
cp -r niches backend/niches
```
