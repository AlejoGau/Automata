# Automata CRM - Módulo Marketing Studio

## Objetivo del módulo

Agregar dentro de Automata CRM un módulo llamado **Marketing Studio**, orientado a que negocios locales puedan crear contenido para redes sociales desde una interfaz simple.

La idea principal es que el usuario complete un formulario, el sistema genere una propuesta de contenido, permita editarla visualmente y luego exporte el resultado como carrusel, post simple o reel.

En una segunda etapa, el contenido podrá enviarse a Postiz para programar publicaciones en redes sociales.

---

## Propuesta de valor

Automata CRM no solo administra clientes y leads. También ayuda al negocio a generar contenido para atraer nuevos clientes.

Ejemplo de mensaje comercial:

> Desde el mismo panel donde gestionás tus clientes, podés crear publicaciones, carruseles y reels listos para Instagram, TikTok, Facebook o YouTube Shorts.

---

## Alcance inicial del MVP

El primer MVP debe ser simple y vendible.

### Funcionalidades incluidas

- Crear contenido desde un formulario.
- Elegir tipo de contenido: carrusel, reel o post simple.
- Elegir una plantilla.
- Cargar datos del negocio.
- Generar guion/copy con IA.
- Editar el texto manualmente.
- Ver una vista previa.
- Exportar imágenes del carrusel.
- Exportar video MP4 en el caso de reels.
- Guardar el contenido como borrador dentro del CRM.

### Funcionalidades no incluidas en la primera versión

- Publicación automática en redes.
- OAuth con Instagram, TikTok, YouTube o Facebook.
- Editor libre tipo Canva.
- Calendario avanzado de publicaciones.
- Música automática.
- Voz en off automática.
- Subtítulos automáticos complejos.
- Multiusuario avanzado.

---

## Estructura dentro del CRM

Agregar una sección principal en el menú:

```txt
Marketing Studio
```

Subsecciones sugeridas:

```txt
Marketing Studio
├── Crear contenido
├── Mis publicaciones
├── Plantillas
├── Marca del negocio
└── Calendario // etapa futura
```

---

## Flujo principal

```txt
1. Usuario entra a Marketing Studio
2. Selecciona tipo de contenido
3. Completa formulario
4. La IA genera una propuesta de copy/guion
5. El usuario edita el contenido
6. El sistema muestra vista previa
7. El usuario exporta o guarda el contenido
8. En etapa futura, se envía a Postiz para programarlo
```

---

## Tipos de contenido

### 1. Carrusel

Formato principal para Instagram, Facebook y LinkedIn.

Ejemplo:

```txt
Slide 1: Gancho
Slide 2: Problema
Slide 3: Beneficio
Slide 4: Oferta
Slide 5: Llamado a la acción
```

### 2. Reel / Short / TikTok

Video vertical 9:16 generado con Remotion.

Ejemplo:

```txt
Escena 1: Gancho
Escena 2: Oferta
Escena 3: Beneficios
Escena 4: CTA
```

### 3. Post simple

Imagen estática con copy corto.

Ejemplo:

```txt
Promo de la semana
Turnos disponibles
Nuevo servicio
Recordatorio
```

---

## Pantalla: Crear contenido

La pantalla debería estar dividida en tres zonas.

```txt
┌────────────────────┬────────────────────┬────────────────────┐
│ Formulario          │ Vista previa        │ Acciones rápidas    │
│                    │                    │                    │
│ Datos del contenido │ Preview visual      │ Botones de IA       │
│ Plantilla           │ Carrusel/Reel/Post  │ Exportar/Guardar    │
└────────────────────┴────────────────────┴────────────────────┘
```

---

## Formulario base

Campos generales para cualquier tipo de contenido:

```txt
Negocio / cliente
Tipo de contenido
Objetivo de la publicación
Rubro
Tono de comunicación
Oferta o mensaje principal
Beneficios
Llamado a la acción
Red social objetivo
Formato
Fecha sugerida de publicación
```

### Ejemplo de valores

```txt
Negocio: PowerFit Gym
Tipo de contenido: Carrusel
Objetivo: Conseguir nuevos alumnos
Rubro: Gimnasio
Tono: Motivador y vendedor
Oferta: 20% OFF en inscripción
Beneficios: Rutinas, clases, seguimiento
CTA: Escribinos por WhatsApp
Red social: Instagram
Formato: 1080x1350
```

---

## Objetivos de publicación

Opciones sugeridas:

```txt
Conseguir leads
Promocionar oferta
Reactivar clientes
Anunciar novedad
Mostrar testimonio
Educar al cliente
Publicar tips
Vender producto/servicio
Recordar turnos disponibles
```

---

## Tonos de comunicación

Opciones sugeridas:

```txt
Profesional
Cercano
Divertido
Urgente
Premium
Motivador
Educativo
Directo
Emocional
```

---

## Red social objetivo

Opciones sugeridas:

```txt
Instagram Feed
Instagram Stories
Instagram Reels
TikTok
YouTube Shorts
Facebook
LinkedIn
```

---

## Formatos sugeridos

```txt
Carrusel Instagram: 1080x1350
Post cuadrado: 1080x1080
Historia/Reel/TikTok/Short: 1080x1920
LinkedIn post: 1200x1200
Facebook post: 1200x630
```

---

## Vista previa

La vista previa debe actualizarse cuando el usuario modifica:

```txt
Texto
Colores
Logo
Imagen
Orden de slides
Plantilla
CTA
```

Para MVP, la vista previa puede ser liviana y renderizada en el frontend.

El render final se genera recién cuando el usuario toca:

```txt
Generar contenido final
```

---

## Editor de carrusel

Para carruseles, mostrar una lista de slides editables.

```txt
Slide 1 - Gancho
Slide 2 - Problema
Slide 3 - Beneficio
Slide 4 - Oferta
Slide 5 - CTA
```

Cada slide debe permitir editar:

```txt
Título
Subtítulo
Texto corto
Imagen
Icono
Color de fondo
Color del texto
Orden
Visibilidad
```

Acciones por slide:

```txt
Editar
Duplicar
Eliminar
Mover arriba
Mover abajo
Regenerar texto con IA
```

---

## Editor de reel

Para reels, mostrar escenas editables.

```txt
Escena 1 - Gancho
Escena 2 - Problema
Escena 3 - Solución
Escena 4 - Oferta
Escena 5 - CTA
```

Cada escena debe permitir editar:

```txt
Texto en pantalla
Duración
Imagen/fondo
Animación
Tipo de transición
Orden
```

---

## Botones de IA

Agregar botones simples para modificar el copy sin que el usuario tenga que escribir prompts.

Botones recomendados:

```txt
Mejorar texto
Hacer más vendedor
Hacer más corto
Hacer más profesional
Hacer más divertido
Agregar urgencia
Cambiar gancho
Crear 3 versiones
Adaptar a Instagram
Adaptar a TikTok
Adaptar a YouTube Shorts
Generar CTA
Generar hashtags
```

---

## Prompt interno para generar carrusel

```txt
Sos un experto en marketing para negocios locales.
Generá un carrusel para redes sociales usando los datos del formulario.

Datos:
- Negocio: {{businessName}}
- Rubro: {{industry}}
- Objetivo: {{goal}}
- Tono: {{tone}}
- Oferta: {{offer}}
- Beneficios: {{benefits}}
- CTA: {{cta}}
- Cantidad de slides: {{slidesCount}}
- Red social: {{targetSocialNetwork}}

Devolvé la respuesta en JSON con esta estructura:

{
  "title": "Título general del carrusel",
  "caption": "Copy para acompañar la publicación",
  "hashtags": ["#hashtag1", "#hashtag2"],
  "slides": [
    {
      "slideNumber": 1,
      "role": "hook",
      "title": "Texto principal",
      "subtitle": "Texto secundario",
      "visualSuggestion": "Idea visual para el slide"
    }
  ]
}

Reglas:
- El texto debe ser claro y corto.
- Cada slide debe tener una sola idea principal.
- El primer slide debe tener un gancho fuerte.
- El último slide debe incluir un llamado a la acción.
- No uses frases genéricas vacías.
```

---

## Prompt interno para generar reel

```txt
Sos un experto en guiones cortos para reels de negocios locales.
Generá un guion para un video vertical de redes sociales usando los datos del formulario.

Datos:
- Negocio: {{businessName}}
- Rubro: {{industry}}
- Objetivo: {{goal}}
- Tono: {{tone}}
- Oferta: {{offer}}
- Beneficios: {{benefits}}
- CTA: {{cta}}
- Duración: {{duration}}
- Red social: {{targetSocialNetwork}}

Devolvé la respuesta en JSON con esta estructura:

{
  "title": "Título del reel",
  "caption": "Copy para publicar junto al reel",
  "hashtags": ["#hashtag1", "#hashtag2"],
  "scenes": [
    {
      "sceneNumber": 1,
      "role": "hook",
      "textOnScreen": "Texto que aparece en pantalla",
      "voiceOver": "Texto sugerido para voz en off",
      "durationSeconds": 3,
      "visualSuggestion": "Idea visual para esta escena"
    }
  ]
}

Reglas:
- El primer segundo debe captar atención.
- El texto en pantalla debe ser breve.
- El video debe cerrar con un CTA claro.
- El guion debe ser fácil de entender para un negocio local.
```

---

## Datos de marca del negocio

Cada cliente del CRM debería poder tener un perfil de marca.

Campos sugeridos:

```txt
Nombre del negocio
Rubro
Logo
Color principal
Color secundario
Color de fondo
Tipografía preferida
Teléfono / WhatsApp
Instagram
Dirección
Sitio web
Descripción corta
Tono de comunicación preferido
```

Este perfil se reutiliza automáticamente al crear contenido.

---

## Integración con datos del CRM

El módulo de marketing puede usar información ya existente en Automata CRM.

Ejemplos:

```txt
Si hay pocos leads esta semana, sugerir crear una publicación promocional.
Si hay clientes inactivos, sugerir campaña de reactivación.
Si se acerca una fecha especial, sugerir contenido temático.
Si hay cuotas vencidas, sugerir recordatorio interno o campaña.
```

Ejemplo de sugerencia automática:

```txt
Detectamos que esta semana ingresaron pocos leads.
¿Querés crear una promo para Instagram?
```

---

## Templates iniciales para MVP

### Gimnasios

```txt
Promo de inscripción
Rutina de la semana
Clase destacada
Testimonio de alumno
Tips para principiantes
Reactivación de alumnos inactivos
```

### Peluquerías / Barberías

```txt
Turnos disponibles
Promo corte + barba
Antes y después
Tips de cuidado
Nuevo servicio
Combo semanal
```

### Inmobiliarias

```txt
Propiedad destacada
Tour de propiedad
Tips para alquilar
Nueva oportunidad
Barrio recomendado
Requisitos para ingresar
```

### Talleres mecánicos

```txt
Servicio recomendado
Cambio de aceite
Checklist del vehículo
Promo semanal
Antes y después
Consejo de mantenimiento
```

---

## Modelo de datos sugerido

### Tabla: brand_profiles

```sql
id
client_id
business_name
industry
logo_url
primary_color
secondary_color
background_color
font_family
whatsapp
instagram
address
website
default_tone
created_at
updated_at
```

### Tabla: content_templates

```sql
id
name
content_type
industry
format
description
thumbnail_url
schema_json
is_active
created_at
updated_at
```

### Tabla: marketing_contents

```sql
id
client_id
template_id
content_type
status
title
goal
tone
target_social_network
format
form_data_json
script_json
caption
hashtags_json
preview_url
final_asset_url
created_by
created_at
updated_at
```

### Tabla: render_jobs

```sql
id
marketing_content_id
job_type
status
progress
input_json
output_url
error_message
started_at
finished_at
created_at
updated_at
```

### Tabla: scheduled_posts

```sql
id
marketing_content_id
provider
provider_post_id
status
scheduled_at
published_at
error_message
created_at
updated_at
```

---

## Estados de marketing_contents

```txt
draft
generating_copy
ready_to_preview
rendering
ready_to_export
scheduled
published
failed
```

---

## Estados de render_jobs

```txt
pending
processing
completed
failed
cancelled
```

---

## Arquitectura técnica recomendada

```txt
Frontend CRM
React / Next.js

Backend API
Node.js / Express o NestJS

Base de datos
Supabase / PostgreSQL

Storage
Supabase Storage, S3 o Cloudflare R2

Render de contenido
Remotion

Cola de trabajos
BullMQ + Redis

Publicación futura
Postiz API / Postiz self-hosted
```

---

## Flujo técnico para carrusel

```txt
1. Usuario completa formulario
2. Backend llama a IA para generar slides
3. Se guarda marketing_content como draft
4. Frontend muestra preview de slides
5. Usuario edita textos/colores/orden
6. Usuario toca Exportar
7. Backend crea render_job
8. Worker usa Remotion renderStill/renderFrames
9. Se generan imágenes PNG/JPEG
10. Se guardan en Storage
11. Se devuelve ZIP o links de descarga
```

---

## Flujo técnico para reel

```txt
1. Usuario completa formulario
2. Backend llama a IA para generar escenas
3. Se guarda marketing_content como draft
4. Frontend muestra preview liviana
5. Usuario edita escenas
6. Usuario toca Generar video
7. Backend crea render_job
8. Worker usa Remotion para renderizar MP4
9. Se guarda el video en Storage
10. Se devuelve link de descarga
```

---

## Futuro flujo con Postiz

```txt
1. Usuario genera contenido final
2. Usuario elige fecha y redes
3. Automata envía asset + caption a Postiz
4. Postiz crea borrador o publicación programada
5. Automata guarda provider_post_id
6. Automata muestra estado: programado, publicado o error
```

---

## Reglas de producto

- No crear un editor libre tipo Canva en la primera versión.
- Usar plantillas guiadas.
- Priorizar carruseles antes que reels porque son más fáciles de renderizar y validar.
- Permitir edición manual siempre.
- La IA debe asistir, no reemplazar completamente al usuario.
- El cliente no debe ver términos técnicos como Remotion o Postiz.
- Vender el beneficio, no la tecnología.

---

## Roadmap sugerido

### Etapa 1 - MVP carrusel

```txt
Formulario básico
Perfil de marca
Generación IA de slides
Editor simple de slides
Preview visual
Exportar imágenes
Guardar borrador
```

### Etapa 2 - Reels con Remotion

```txt
Templates 9:16
Editor de escenas
Preview liviana
Render MP4
Descarga de video
```

### Etapa 3 - Calendario

```txt
Vista mensual/semanal
Estados de publicaciones
Ideas sugeridas por IA
Plan semanal de contenido
```

### Etapa 4 - Integración Postiz

```txt
Conectar Postiz self-hosted
Crear borradores
Programar publicaciones
Consultar estado
```

### Etapa 5 - Automatizaciones inteligentes

```txt
Sugerencias según métricas del CRM
Campañas para leads fríos
Campañas para clientes inactivos
Contenido recurrente semanal
```

---

## Primer objetivo técnico recomendado

Construir primero:

```txt
Marketing Studio > Crear carrusel
```

Con estas funciones mínimas:

```txt
Elegir cliente
Elegir plantilla
Completar objetivo/oferta/CTA
Generar slides con IA
Editar slides
Preview
Exportar PNGs
```

Cuando eso funcione, avanzar a:

```txt
Marketing Studio > Crear reel
```

---

## Frase de posicionamiento

```txt
Automata CRM te ayuda a gestionar clientes, responder leads y crear contenido para vender más desde un solo panel.
```

Otra opción más directa:

```txt
El CRM para negocios locales que venden por WhatsApp y necesitan publicar más sin perder tiempo.
```
