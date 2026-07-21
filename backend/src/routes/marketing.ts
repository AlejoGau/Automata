import { Router, Response } from 'express';
import { readdir } from 'fs/promises';
import path from 'path';
import { supabase } from '../supabase.js';
import { requireAuth, AuthenticatedRequest } from '../middleware/auth.js';
import { generateStoryboard } from '../marketing/agent.js';

const NICHES_DIR = process.env.MARKETING_NICHES_DIR || path.resolve(process.cwd(), '..', 'niches');

const router = Router();

// Busca 1 foto de stock en Pexels para un slide/escena puntual (no bloquea el flujo si falla:
// el frontend cae a la imagen fija por rubro cuando el slide no trae photoUrl).
async function fetchStockPhoto(query: string): Promise<string | null> {
  if (!process.env.PEXELS_API_KEY || !query) return null;
  try {
    const url = `https://api.pexels.com/v1/search?query=${encodeURIComponent(query)}&per_page=1&orientation=portrait`;
    const response = await fetch(url, { headers: { Authorization: process.env.PEXELS_API_KEY } });
    if (!response.ok) return null;
    const data: any = await response.json();
    const photo = data.photos?.[0];
    return photo?.src?.portrait || photo?.src?.large2x || photo?.src?.large || null;
  } catch (err) {
    console.warn('Pexels API falló para query:', query, err);
    return null;
  }
}

// Enriquece las escenas de video de tipo `stock`/`screen_recording` con la URL real de
// una foto de Pexels (según su stockQuery, con respaldo en stockAlternatives). Corre en
// paralelo y nunca tira: si una foto falla, esa escena queda sin photoUrl y el front cae
// a un fondo degradado limpio.
async function enrichVideoPhotos(storyboard: any): Promise<void> {
  if (!process.env.PEXELS_API_KEY) return;
  const scenes: any[] = storyboard?.scenes;
  if (!Array.isArray(scenes)) return;
  await Promise.all(scenes.map(async (scene) => {
    const v = scene?.visual;
    if (!v || (v.type !== 'stock' && v.type !== 'screen_recording')) return;
    const queries: string[] = [v.stockQuery, ...(v.stockAlternatives || []), v.description].filter(Boolean);
    for (const q of queries) {
      const url = await fetchStockPhoto(q);
      if (url) { v.photoUrl = url; return; }
    }
  }));
}

// Enriquece cada slide/escena con su propia foto (usa photoKeywords si la IA lo generó,
// si no cae a visualSuggestion o al rubro). Corre en paralelo y nunca tira: un fallo puntual
// solo deja ese slide sin photoUrl.
async function enrichWithPhotos(data: any, industry: string): Promise<void> {
  if (!process.env.PEXELS_API_KEY) return;
  const items: any[] = data?.slides || data?.scenes;
  if (Array.isArray(items) && items.length > 0) {
    await Promise.all(items.map(async (item) => {
      const query = item.photoKeywords || item.visualSuggestion || industry;
      item.photoUrl = await fetchStockPhoto(query);
    }));
  } else if (data && typeof data === 'object') {
    // Post simple del generador local: no tiene array de slides, la sugerencia va en el tope.
    const query = data.photoKeywords || data.visualSuggestion || industry;
    data.photoUrl = await fetchStockPhoto(query);
  }
}

// Helper para detectar si un error de Supabase se debe a que la tabla no existe (no migrada)
function handleDbError(err: any, res: Response) {
  console.error('Database Error:', err);
  if (err?.code === '42P01') {
    // Código Postgres 42P01 = relation does not exist
    return res.status(200).json({
      db_not_migrated: true,
      message: 'La base de datos de marketing no está migrada en Supabase. Se utilizará almacenamiento local en el navegador.',
      data: null
    });
  }
  return res.status(500).json({ error: 'Error en la base de datos', details: err.message });
}

// 1. OBTENER PERFIL DE MARCA
router.get('/brand', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  const user = req.user!;
  try {
    const { data: brand, error } = await supabase
      .from('brand_profiles')
      .select('*')
      .eq('workspace_id', user.workspace_id)
      .maybeSingle();

    if (error) return handleDbError(error, res);

    res.status(200).json({ data: brand });
  } catch (err) {
    handleDbError(err, res);
  }
});

// 2. GUARDAR/ACTUALIZAR PERFIL DE MARCA
router.post('/brand', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  const user = req.user!;
  const { business_name, industry, logo_url, primary_color, secondary_color, background_color, font_family, whatsapp, website, default_tone } = req.body;

  if (!business_name) {
    res.status(400).json({ error: 'El nombre del negocio es requerido' });
    return;
  }

  try {
    // Intentar buscar si ya existe
    const { data: existingBrand, error: fetchError } = await supabase
      .from('brand_profiles')
      .select('id')
      .eq('workspace_id', user.workspace_id)
      .maybeSingle();

    if (fetchError) return handleDbError(fetchError, res);

    let result;
    const brandData = {
      workspace_id: user.workspace_id,
      business_name,
      industry,
      logo_url,
      primary_color,
      secondary_color,
      background_color,
      font_family,
      whatsapp,
      website,
      default_tone,
      updated_at: new Date().toISOString()
    };

    if (existingBrand) {
      // Actualizar
      const { data, error: updateError } = await supabase
        .from('brand_profiles')
        .update(brandData)
        .eq('workspace_id', user.workspace_id)
        .select('*')
        .single();

      if (updateError) return handleDbError(updateError, res);
      result = data;
    } else {
      // Insertar
      const { data, error: insertError } = await supabase
        .from('brand_profiles')
        .insert(brandData)
        .select('*')
        .single();

      if (insertError) return handleDbError(insertError, res);
      result = data;
    }

    res.status(200).json({ data: result });
  } catch (err) {
    handleDbError(err, res);
  }
});

// 3. OBTENER TODAS LAS PUBLICACIONES (BORRADORES)
router.get('/contents', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  const user = req.user!;
  try {
    const { data: contents, error } = await supabase
      .from('marketing_contents')
      .select('*')
      .eq('workspace_id', user.workspace_id)
      .order('created_at', { ascending: false });

    if (error) return handleDbError(error, res);

    res.status(200).json({ data: contents });
  } catch (err) {
    handleDbError(err, res);
  }
});

// 4. CREAR NUEVA PUBLICACIÓN
router.post('/contents', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  const user = req.user!;
  const { content_type, status, title, goal, tone, target_social_network, format, form_data_json, slides_json, caption, hashtags_json } = req.body;

  if (!title || !content_type) {
    res.status(400).json({ error: 'Faltan parámetros requeridos: title, content_type' });
    return;
  }

  try {
    const { data: newContent, error } = await supabase
      .from('marketing_contents')
      .insert({
        workspace_id: user.workspace_id,
        content_type,
        status: status || 'draft',
        title,
        goal,
        tone,
        target_social_network,
        format,
        form_data_json,
        slides_json,
        caption,
        hashtags_json,
        created_by: user.id
      })
      .select('*')
      .single();

    if (error) return handleDbError(error, res);

    res.status(201).json({ data: newContent });
  } catch (err) {
    handleDbError(err, res);
  }
});

// 5. ACTUALIZAR PUBLICACIÓN
router.put('/contents/:id', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  const user = req.user!;
  const contentId = req.params.id;
  const { status, title, goal, tone, target_social_network, format, form_data_json, slides_json, caption, hashtags_json } = req.body;

  try {
    // Validar propiedad del workspace
    const { data: existingContent, error: fetchError } = await supabase
      .from('marketing_contents')
      .select('workspace_id')
      .eq('id', contentId)
      .maybeSingle();

    if (fetchError) return handleDbError(fetchError, res);
    if (!existingContent) {
      res.status(404).json({ error: 'Publicación no encontrada' });
      return;
    }
    if (existingContent.workspace_id !== user.workspace_id) {
      res.status(403).json({ error: 'No tienes acceso a esta publicación' });
      return;
    }

    const { data: updatedContent, error: updateError } = await supabase
      .from('marketing_contents')
      .update({
        status,
        title,
        goal,
        tone,
        target_social_network,
        format,
        form_data_json,
        slides_json,
        caption,
        hashtags_json,
        updated_at: new Date().toISOString()
      })
      .eq('id', contentId)
      .select('*')
      .single();

    if (updateError) return handleDbError(updateError, res);

    res.status(200).json({ data: updatedContent });
  } catch (err) {
    handleDbError(err, res);
  }
});

// 6. ELIMINAR PUBLICACIÓN
router.delete('/contents/:id', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  const user = req.user!;
  const contentId = req.params.id;

  try {
    // Validar propiedad del workspace
    const { data: existingContent, error: fetchError } = await supabase
      .from('marketing_contents')
      .select('workspace_id')
      .eq('id', contentId)
      .maybeSingle();

    if (fetchError) return handleDbError(fetchError, res);
    if (!existingContent) {
      res.status(404).json({ error: 'Publicación no encontrada' });
      return;
    }
    if (existingContent.workspace_id !== user.workspace_id) {
      res.status(403).json({ error: 'No tienes acceso a esta publicación' });
      return;
    }

    const { error: deleteError } = await supabase
      .from('marketing_contents')
      .delete()
      .eq('id', contentId);

    if (deleteError) return handleDbError(deleteError, res);

    res.status(200).json({ success: true, message: 'Publicación eliminada correctamente' });
  } catch (err) {
    handleDbError(err, res);
  }
});

// 7. GENERACIÓN INTELIGENTE CON IA (FALLBACK LOCAL INCLUIDO)
router.post('/generate', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  const {
    contentType, // 'carrusel' | 'reel' | 'post_simple'
    businessName,
    industry,
    goal,
    tone,
    offer,
    benefits,
    cta,
    targetSocialNetwork,
    format,
    slidesCount = 5,
    duration = 15
  } = req.body;

  if (!businessName || !contentType) {
    res.status(400).json({ error: 'Faltan parámetros requeridos: businessName, contentType' });
    return;
  }

  // Crear prompts específicos basados en el tipo de contenido
  let prompt = '';
  if (contentType === 'carrusel') {
    prompt = `Sos un director creativo y copywriter experto en marketing para negocios locales en Argentina.
Tu misión: generar un carrusel de Instagram de ALTA CONVERSIÓN con copy de nivel senior y dirección visual clara.

DATOS DEL NEGOCIO:
- Nombre: ${businessName}
- Rubro: ${industry || 'No especificado'}
- Objetivo de campaña: ${goal || 'Conseguir leads'}
- Tono: ${tone || 'Profesional'}
- Oferta principal: ${offer || 'No especificada'}
- Beneficios clave: ${benefits || 'Servicio de calidad'}
- CTA: ${cta || 'Escribinos por WhatsApp'}
- Red social: ${targetSocialNetwork || 'Instagram Feed'}
- Cantidad de slides: ${slidesCount}

REGLAS DE COPYWRITING:
1. Slide 1 (hook): título en MAYÚSCULAS o pregunta directa que duela o sorprenda. Máx 8 palabras.
2. Cada slide = UNA sola idea. Si hay dos ideas, hay dos slides.
3. Slide de oferta: badge con urgencia real (ej: "⚡ SOLO ESTA SEMANA", "🔥 CUPOS LIMITADOS").
4. Slide CTA: el texto más corto y directo. Una línea. Sin adornos.
5. eyebrow = etiqueta pequeña arriba del título (ej: "DATO CLAVE", "NUESTRA SOLUCIÓN", "OFERTA EXCLUSIVA", "ÚLTIMO PASO").
6. colorAccent: "primary" para color principal de marca, "secondary" para color acento/amarillo, "white" para blanco puro.
7. badge: texto corto de urgencia o null si no aplica.
8. Caption: persuasivo, con emojis bien ubicados, saltos de línea y CTA al final.
9. photoKeywords: 3 a 5 palabras clave EN INGLÉS para buscar una foto de stock específica para ESE slide (no genérica del rubro). Deben describir la escena real de visualSuggestion, no el copy. Ej: "mechanic car hood repair", "barbershop chair interior close-up".

Devolvé ÚNICAMENTE este JSON (sin markdown, sin texto extra):
{
  "title": "Título interno del carrusel (para el CRM)",
  "caption": "Copy completo para el cuerpo del post en Instagram con emojis y CTA claro",
  "hashtags": ["#tag1", "#tag2", "#tag3", "#tag4", "#tag5"],
  "slides": [
    {
      "slideNumber": 1,
      "role": "hook",
      "eyebrow": "ETIQUETA PEQUEÑA ARRIBA DEL TÍTULO",
      "title": "TÍTULO PRINCIPAL IMPACTANTE",
      "subtitle": "Texto secundario breve y complementario (máx 15 palabras)",
      "badge": null,
      "colorAccent": "primary",
      "visualSuggestion": "Descripción del tratamiento visual recomendado para este slide",
      "photoKeywords": "3 a 5 palabras clave en inglés para buscar la foto de este slide puntual"
    }
  ]
}

Roles válidos: "hook", "problem", "benefit", "offer", "cta". Generá exactamente ${slidesCount} slides.`;

  } else if (contentType === 'reel') {
    prompt = `Sos un guionista experto en Reels e Instagram para negocios locales argentinos.
Generá un guion técnico-creativo de alto impacto para un video de ${duration} segundos.

DATOS:
- Negocio: ${businessName} | Rubro: ${industry} | Objetivo: ${goal} | Tono: ${tone}
- Oferta: ${offer} | Beneficios: ${benefits} | CTA: ${cta}

REGLAS:
1. Los primeros 2 segundos son el gancho. Sin introducción, al grano directo.
2. Texto en pantalla: ultra breve, máximo 5 palabras por escena.
3. Ritmo: escenas de 2-4 segundos. Dinánico y cortado.
4. Locución: puede ser más larga pero siempre clara y directa.
5. Cierre: CTA hablado Y escrito en pantalla.
6. photoKeywords: 3 a 5 palabras clave EN INGLÉS para buscar una foto de stock que represente ESA escena puntual (no genérica del rubro).

Devolvé ÚNICAMENTE este JSON:
{
  "title": "Título del Reel (interno CRM)",
  "caption": "Copy persuasivo para el post con emojis y CTA",
  "hashtags": ["#tag1", "#tag2", "#tag3", "#tag4", "#tag5"],
  "scenes": [
    {
      "sceneNumber": 1,
      "role": "hook",
      "textOnScreen": "Texto ultra breve en pantalla (máx 5 palabras)",
      "voiceOver": "Lo que dice la locución en este momento",
      "durationSeconds": 3,
      "visualSuggestion": "Descripción del plano, movimiento de cámara o animación recomendada",
      "photoKeywords": "3 a 5 palabras clave en inglés para buscar la foto de esta escena puntual"
    }
  ]
}`;

  } else {
    // Post simple
    prompt = `Sos un redactor publicitario senior especializado en posts estáticos de Instagram para negocios locales argentinos.
Generá un post de ALTO IMPACTO visual y comercial.

DATOS:
- Negocio: ${businessName} | Rubro: ${industry} | Objetivo: ${goal} | Tono: ${tone}
- Oferta: ${offer} | CTA: ${cta}

REGLAS:
1. Título: frase que detenga el scroll. Máximo 7 palabras. En MAYÚSCULAS si el tono lo permite.
2. Subtitle: el beneficio principal en una sola línea clara.
3. eyebrow: etiqueta pequeña arriba del título (ej: "NUEVA PROMO", "TIP DEL DÍA", "OFERTA EXCLUSIVA").
4. badge: llamada de urgencia corta (ej: "⚡ SOLO HOY", "🔥 ÚLTIMOS CUPOS") o null.
5. visualSuggestion: describí el diseño con detalle profesional (colores, layout, tipografía, imagen de fondo).
6. Caption: copy completo con emojis, saltos de línea y CTA claro al final.
7. photoKeywords: 3 a 5 palabras clave EN INGLÉS para buscar una foto de stock específica para este post (no genérica del rubro).

Devolvé ÚNICAMENTE este JSON:
{
  "title": "Título interno del post (CRM)",
  "caption": "Copy completo para Instagram con emojis, saltos de línea y CTA al final",
  "hashtags": ["#tag1", "#tag2", "#tag3"],
  "slides": [
    {
      "slideNumber": 1,
      "role": "offer",
      "eyebrow": "ETIQUETA PEQUEÑA",
      "title": "TÍTULO PRINCIPAL IMPACTANTE",
      "subtitle": "Texto secundario que convierte en una línea",
      "badge": "⚡ SOLO ESTA SEMANA",
      "colorAccent": "secondary",
      "visualSuggestion": "Descripción visual detallada del tratamiento de imagen, tipografía y layout",
      "photoKeywords": "3 a 5 palabras clave en inglés para buscar la foto de este post"
    }
  ]
}`;
  }

  // Intentar llamar a una IA si hay API key en las variables de entorno
  try {
    let aiResponse = null;

    if (process.env.GEMINI_API_KEY) {
      console.log('Utilizando Gemini para generar contenido...');
      const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${process.env.GEMINI_API_KEY}`;
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: { responseMimeType: "application/json" }
        })
      });
      if (response.ok) {
        const data: any = await response.json();
        aiResponse = data.candidates?.[0]?.content?.parts?.[0]?.text;
      } else {
        console.warn('Gemini API falló:', response.statusText);
      }
    } else if (process.env.OPENAI_API_KEY) {
      console.log('Utilizando OpenAI para generar contenido...');
      const url = 'https://api.openai.com/v1/chat/completions';
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`
        },
        body: JSON.stringify({
          model: 'gpt-4o-mini',
          messages: [{ role: 'user', content: prompt }],
          response_format: { type: "json_object" }
        })
      });
      if (response.ok) {
        const data: any = await response.json();
        aiResponse = data.choices?.[0]?.message?.content;
      } else {
        console.warn('OpenAI API falló:', response.statusText);
      }
    }

    if (aiResponse) {
      // Limpiar markdown si el modelo lo puso por error
      let cleaned = aiResponse.trim();
      if (cleaned.startsWith('```json')) cleaned = cleaned.replace(/^```json/, '');
      if (cleaned.endsWith('```')) cleaned = cleaned.replace(/```$/, '');
      cleaned = cleaned.trim();
      
      const parsed = JSON.parse(cleaned);
      await enrichWithPhotos(parsed, industry);
      res.status(200).json({ success: true, ai_generated: true, data: parsed });
      return;
    }
  } catch (err) {
    console.warn('Error al llamar a la API del LLM, recurriendo al generador local:', err);
  }

  // FALLBACK GENERATOR: Si no hay keys o el fetch falla, generamos contenido de excelente calidad
  console.log('Utilizando generador local de plantillas...');
  const result = generateFallbackLocal(contentType, businessName, industry, goal, tone, offer, benefits, slidesCount, duration);
  await enrichWithPhotos(result, industry);
  res.status(200).json({ success: true, ai_generated: false, data: result });
});

// Función generadora de contenido local adaptativo
function generateFallbackLocal(
  type: string,
  business: string,
  industry: string,
  goal: string,
  tone: string,
  offer: string,
  benefits: string,
  slidesCount: number,
  duration: number
) {
  const cleanInd = (industry || '').toLowerCase();
  
  // Categorizar rubro
  let category = 'generic';
  if (cleanInd.includes('gim') || cleanInd.includes('gym') || cleanInd.includes('fitness') || cleanInd.includes('entren')) {
    category = 'gym';
  } else if (cleanInd.includes('pelu') || cleanInd.includes('barber') || cleanInd.includes('estet') || cleanInd.includes('salon')) {
    category = 'hair';
  } else if (cleanInd.includes('inmo') || cleanInd.includes('propied') || cleanInd.includes('casa') || cleanInd.includes('real')) {
    category = 'inmo';
  } else if (cleanInd.includes('taller') || cleanInd.includes('auto') || cleanInd.includes('mecan')) {
    category = 'taller';
  }

  const ctaText = offer ? `¡Escribinos y reservá con el beneficio!` : `¡Comunicate con nosotros hoy!`;

  if (type === 'carrusel') {
    const slides: any[] = [];
    
    // Plantillas de contenido local precargado
    if (category === 'gym') {
      slides.push(
        { slideNumber: 1, role: 'hook', eyebrow: 'DATO CLAVE', title: `¿Querés ponerte en forma y no sabés cómo empezar?`, subtitle: `En ${business} te acompañamos en cada paso de tu camino fitness.`, colorAccent: 'primary', badge: null, visualSuggestion: 'Imagen motivadora de alguien entrenando, fondo oscuro con texto en color principal.', photoKeywords: 'gym workout motivation dark' },
        { slideNumber: 2, role: 'problem', eyebrow: 'EL DESAFÍO', title: `El problema de las rutinas aburridas`, subtitle: `Mucha gente abandona porque entrena sola o sin un plan específico para su nivel.`, colorAccent: 'white', badge: null, visualSuggestion: 'Foto en blanco y negro de un gimnasio vacío o persona desmotivada.', photoKeywords: 'empty gym no motivation' },
        { slideNumber: 3, role: 'benefit', eyebrow: 'NUESTRA PROPUESTA', title: `Nuestra solución a tu medida`, subtitle: `Ofrecemos rutinas personalizadas, clases dinámicas y coach de seguimiento continuo.`, colorAccent: 'primary', badge: null, visualSuggestion: 'Foto grupal alegre en una clase con el color principal como acento.', photoKeywords: 'group fitness class coach' },
        { slideNumber: 4, role: 'offer', eyebrow: 'PROMO DE LA SEMANA', title: `¡Aprovechá la oferta especial!`, subtitle: offer || `20% de descuento en la matrícula de inscripción este mes.`, colorAccent: 'secondary', badge: '⚡ SOLO POR HOY', visualSuggestion: 'Texto grande y destacado con la oferta resaltada en amarillo brillante.', photoKeywords: 'gym weights close up' },
        { slideNumber: 5, role: 'cta', eyebrow: 'ÚLTIMO PASO', title: `¡Escribinos para reservar!`, subtitle: `Hacé clic en el enlace para mandarnos un mensaje de WhatsApp directo.`, colorAccent: 'primary', badge: null, visualSuggestion: 'Pantalla de cierre limpia con logo de WhatsApp grande y colores de marca.', photoKeywords: 'smartphone chat contact' }
      );
    } else if (category === 'hair') {
      slides.push(
        { slideNumber: 1, role: 'hook', eyebrow: 'ESTILO Y TENDENCIA', title: `Un cambio de look que potencia tu confianza`, subtitle: `Descubrí el estilo ideal para vos en ${business}.`, colorAccent: 'primary', badge: null, visualSuggestion: 'Imagen de un corte de pelo moderno con iluminación cálida y limpia.', photoKeywords: 'modern haircut barber salon' },
        { slideNumber: 2, role: 'problem', eyebrow: 'EL DIAGNÓSTICO', title: `¿Corte apurado y sin asesoramiento?`, subtitle: `Ir a la peluquería no debería ser un trámite rápido, sino una experiencia de renovación.`, colorAccent: 'white', badge: null, visualSuggestion: 'Foto detallada de herramientas de barbería o salón, estética premium.', photoKeywords: 'barber tools closeup vintage' },
        { slideNumber: 3, role: 'benefit', eyebrow: 'QUÉ HACEMOS DIFERENTE', title: `Experiencia de Asesoría Completa`, subtitle: `Nuestros estilistas analizan tus rasgos y te recomiendan lo mejor para tu tipo de cabello.`, colorAccent: 'primary', badge: null, visualSuggestion: 'Foto del estilista trabajando con una sonrisa en un salón moderno.', photoKeywords: 'hairstylist smiling salon client' },
        { slideNumber: 4, role: 'offer', eyebrow: 'BENEFICIO EXCLUSIVO', title: `Tu beneficio de la semana`, subtitle: offer || `Corte y servicio de hidratación profunda con 15% OFF de lunes a miércoles.`, colorAccent: 'secondary', badge: '🔥 CUPOS LIMITADOS', visualSuggestion: 'Placa de colores contrastantes destacando la promoción de la semana.', photoKeywords: 'barbershop chair interior' },
        { slideNumber: 5, role: 'cta', eyebrow: 'RESERVÁ TU LUGAR', title: `¡Reservá tu turno ya!`, subtitle: `Escribinos por WhatsApp para asegurar tu lugar. ¡Cupos limitados!`, colorAccent: 'primary', badge: null, visualSuggestion: 'Botones y contacto de WhatsApp destacados sobre fondo de marca.', photoKeywords: 'whatsapp contact chat phone' }
      );
    } else if (category === 'inmo') {
      slides.push(
        { slideNumber: 1, role: 'hook', eyebrow: 'ESTILO DE VIDA', title: `Encontrá el hogar que siempre soñaste`, subtitle: `En ${business} tenemos las propiedades más exclusivas de la zona.`, colorAccent: 'primary', badge: null, visualSuggestion: 'Foto gran angular de un living moderno y luminoso.', photoKeywords: 'modern bright living room' },
        { slideNumber: 2, role: 'problem', eyebrow: 'EL MERCADO', title: `¿El trámite de alquiler o compra te estresa?`, subtitle: `Sabemos lo difícil que es encontrar un lugar que cumpla con todos tus requisitos y presupuesto.`, colorAccent: 'white', badge: null, visualSuggestion: 'Foto conceptual de llaves y contratos firmados con luz tenue.', photoKeywords: 'house keys contract signing' },
        { slideNumber: 3, role: 'benefit', eyebrow: 'NUESTRO COMPROMISO', title: `Trato humano y asesoramiento legal`, subtitle: `Te guiamos de principio a fin, ahorrándote trámites pesados y garantizando tu seguridad.`, colorAccent: 'primary', badge: null, visualSuggestion: 'Imagen de asesor inmobiliario conversando cordialmente con clientes en una propiedad.', photoKeywords: 'real estate agent handshake client' },
        { slideNumber: 4, role: 'offer', eyebrow: 'OPORTUNIDAD ÚNICA', title: `Propiedad Destacada`, subtitle: offer || `Nuevas propiedades en pozo con financiación exclusiva de hasta 24 cuotas sin interés.`, colorAccent: 'secondary', badge: '🏢 LANZAMIENTO', visualSuggestion: 'Plano del departamento o render 3D con banner de oportunidad única.', photoKeywords: 'new apartment building exterior' },
        { slideNumber: 5, role: 'cta', eyebrow: 'CONTACTO DIRECTO', title: `¡Hablemos hoy mismo!`, subtitle: `Hacé clic en el botón para recibir el catálogo completo de propiedades.`, colorAccent: 'primary', badge: null, visualSuggestion: 'Detalle de contacto con el isotipo de la empresa inmobiliaria.', photoKeywords: 'real estate office contact desk' }
      );
    } else if (category === 'taller') {
      slides.push(
        { slideNumber: 1, role: 'hook', eyebrow: 'SEGURIDAD VIAL', title: `Mantené tu auto seguro en la ruta`, subtitle: `En ${business} cuidamos tu coche con tecnología de diagnóstico avanzada.`, colorAccent: 'primary', badge: null, visualSuggestion: 'Foto de un capó de auto abierto con mecánico usando herramientas especializadas.', photoKeywords: 'mechanic car hood repair' },
        { slideNumber: 2, role: 'problem', eyebrow: 'EL DIAGNÓSTICO', title: `El peligro de los ruidos extraños`, subtitle: `Un pequeño ruido no resuelto hoy puede convertirse en una rotura costosa y peligrosa mañana.`, colorAccent: 'white', badge: null, visualSuggestion: 'Primer plano de frenos desgastados o motor con luz de advertencia.', photoKeywords: 'car brake worn closeup' },
        { slideNumber: 3, role: 'benefit', eyebrow: 'GARANTÍA DE CONFIANZA', title: `Mecánicos certificados y repuestos originales`, subtitle: `Garantía escrita en todos los trabajos y entrega a término pactado.`, colorAccent: 'primary', badge: null, visualSuggestion: 'Taller ordenado y limpio, con un auto elevado y herramientas de precisión.', photoKeywords: 'clean auto repair shop' },
        { slideNumber: 4, role: 'offer', eyebrow: 'OFERTA DE MANTENIMIENTO', title: `Checklist de Seguridad Gratis`, subtitle: offer || `Alineación y balanceo bonificados con el cambio de aceite de esta semana.`, colorAccent: 'secondary', badge: '🚗 BENEFICIO', visualSuggestion: 'Cuadro de oferta llamativo con borde naranja de alerta y descuentos.', photoKeywords: 'car maintenance service tools' },
        { slideNumber: 5, role: 'cta', eyebrow: 'RESERVA DIRECTA', title: `¡Agendá tu revisión hoy!`, subtitle: `Consultanos por WhatsApp y coordiná el ingreso de tu vehículo.`, colorAccent: 'primary', badge: null, visualSuggestion: 'Información de contacto fácil de leer con logo de WhatsApp.', photoKeywords: 'mechanic shop contact phone' }
      );
    } else {
      // Genérico
      slides.push(
        { slideNumber: 1, role: 'hook', eyebrow: 'BIENVENIDO', title: `Potenciá tu día con ${business}`, subtitle: `Soluciones profesionales diseñadas especialmente para vos.`, colorAccent: 'primary', badge: null, visualSuggestion: 'Fondo abstracto en degradé con colores corporativos y tipografía nítida.', photoKeywords: 'abstract gradient business background' },
        { slideNumber: 2, role: 'problem', eyebrow: 'EL RETO', title: `El desafío de encontrar la solución ideal`, subtitle: `Muchas veces perdés tiempo y dinero probando opciones genéricas que no resuelven tu caso.`, colorAccent: 'white', badge: null, visualSuggestion: 'Imagen artística minimalista representando confusión o desorganización.', photoKeywords: 'confused person desk stress' },
        { slideNumber: 3, role: 'benefit', eyebrow: 'NUESTRO DIFERENCIAL', title: `Por qué elegirnos`, subtitle: benefits || `Ofrecemos un servicio de alta calidad enfocado en la satisfacción y el retorno del cliente.`, colorAccent: 'primary', badge: null, visualSuggestion: 'Gráfico limpio o icono que refleje crecimiento o soporte premium.', photoKeywords: 'business growth success chart' },
        { slideNumber: 4, role: 'offer', eyebrow: 'PROPUESTA DE VALOR', title: `Beneficio único para nuevos clientes`, subtitle: offer || `¡Consultanos hoy y obtené una asesoría de diagnóstico completamente bonificada!`, colorAccent: 'secondary', badge: '🔥 REGALO', visualSuggestion: 'Destacado de la oferta con el color secundario de la marca.', photoKeywords: 'gift box discount offer' },
        { slideNumber: 5, role: 'cta', eyebrow: 'CONTACTO', title: `¡Ponete en contacto!`, subtitle: `Escribinos ahora para arrancar. ¡Estamos listos para ayudarte!`, colorAccent: 'primary', badge: null, visualSuggestion: 'Cierre limpio con logo y datos del negocio.', photoKeywords: 'customer service contact smartphone' }
      );
    }

    // Ajustar cantidad de slides requerida por el usuario duplicando/cortando
    const finalSlides = slides.slice(0, slidesCount);
    while (finalSlides.length < slidesCount) {
      const idx = finalSlides.length % slides.length;
      finalSlides.push({
        ...slides[idx],
        slideNumber: finalSlides.length + 1
      });
    }

    return {
      title: `Carrusel para ${business}`,
      caption: `¡Atención! Si buscás una solución real para tu negocio, en ${business} tenemos lo que necesitás. 🚀\n\n📌 ¿Por qué elegirnos?\n• Atención personalizada\n• Resultados reales\n• Profesionales con experiencia\n\n${offer ? `Regalo especial: ${offer}\n\n` : ''}📩 Dejanos tu consulta por privado o escribinos por WhatsApp al enlace de la biografía para más info!`,
      hashtags: [`#${business.replace(/\s+/g, '')}`, `#${industry.replace(/\s+/g, '')}`, '#marketing', '#negocioslocales'],
      slides: finalSlides
    };

  } else if (type === 'reel') {
    const scenes = [
      { sceneNumber: 1, role: 'hook', textOnScreen: `¿Cansado de lo mismo?`, voiceOver: `Si estás cansado de no encontrar soluciones reales, prestá atención.`, durationSeconds: 3, visualSuggestion: 'Toma rápida de primer plano de persona pensativa.', photoKeywords: 'thoughtful person closeup portrait' },
      { sceneNumber: 2, role: 'problem', textOnScreen: `Este es el gran error...`, voiceOver: `El gran error es elegir servicios estándar que no se adaptan a tu negocio local.`, durationSeconds: 4, visualSuggestion: 'Cambio de plano a un espacio de trabajo con ritmo dinámico.', photoKeywords: 'busy workspace dynamic office' },
      { sceneNumber: 3, role: 'solution', textOnScreen: `Descubrí ${business}`, voiceOver: `En ${business} diseñamos un plan específico para resolver esto a tu medida.`, durationSeconds: 4, visualSuggestion: 'Muestra de los productos, local o el equipo sonriendo.', photoKeywords: 'happy team smiling office' },
      { sceneNumber: 4, role: 'offer', textOnScreen: offer || `Beneficio especial hoy`, voiceOver: `Y si nos escribís hoy, te llevás un beneficio exclusivo para comenzar sin vueltas.`, durationSeconds: 3, visualSuggestion: 'Placa de texto grande con la oferta.', photoKeywords: 'gift discount offer surprise' },
      { sceneNumber: 5, role: 'cta', textOnScreen: `¡Escribinos por WhatsApp!`, voiceOver: `Hacé clic en el enlace de nuestro perfil y escribinos. ¡Te esperamos!`, durationSeconds: Math.max(2, duration - 14), visualSuggestion: 'Toma final del equipo indicando escribir por privado con animación de flecha.', photoKeywords: 'smartphone whatsapp chat hand' }
    ];

    return {
      title: `Guion de Reel - ${business}`,
      caption: `¡Grabá este video siguiendo este guion para conectar con tu audiencia! 🎬\n\nConsejo: Usá un audio en tendencia y agregale subtítulos dinámicos.\n\n${offer ? `Promo activa: ${offer}` : ''}`,
      hashtags: [`#${business.replace(/\s+/g, '')}`, '#reel', '#video', '#viral'],
      scenes: scenes.slice(0, Math.ceil(duration / 3)) // Proporcional a la duración
    };
  } else {
    // Post simple
    return {
      title: `Post simple para ${business}`,
      caption: `¡Hola! ¿Conocés nuestro servicio de ${industry || 'asesoría'} en ${business}?\n\nTe ofrecemos la mejor calidad y trato cercano de la zona para ayudarte a lograr tus objetivos.\n\n${offer ? `🔥 Promo exclusiva: ${offer}\n\n` : ''}📲 Hacé clic en nuestro link de contacto o escribinos por WhatsApp para agendar una llamada.`,
      hashtags: [`#${business.replace(/\s+/g, '')}`, '#post', '#novedades'],
      visualSuggestion: `Diseño con fondo de color corporativo de la marca. Texto central llamativo con la oferta: "${offer || business}". Logotipo del negocio en la esquina superior derecha y datos de contacto (WhatsApp/Sitio) en la parte inferior.`,
      photoKeywords: `${industry || 'business'} professional service`
    };
  }
}

// 8. AUDITORÍA DE DISEÑO CON IA (VISION DE CHATGPT)
router.post('/analyze-image', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  const { imageData, contentType, slideIndex = 0 } = req.body;

  if (!imageData) {
    res.status(400).json({ error: 'La imagen en base64 (imageData) es requerida' });
    return;
  }

  if (!process.env.OPENAI_API_KEY) {
    res.status(400).json({ 
      error: 'OpenAI API Key no configurada en el servidor. Configure la variable OPENAI_API_KEY en su archivo .env' 
    });
    return;
  }

  try {
    console.log(`Utilizando ChatGPT Vision para analizar slide ${slideIndex + 1}...`);
    
    let base64Image = imageData;
    if (!base64Image.startsWith('data:')) {
      base64Image = `data:image/png;base64,${base64Image}`;
    }

    const prompt = `Sos un experto en marketing digital, copywriting y diseño gráfico publicitario para redes sociales.
Analizá críticamente esta imagen de publicación (slide ${slideIndex + 1} de un contenido de tipo ${contentType}) diseñada para un negocio local.

Por favor evaluá detalladamente y brindá feedback accionable:
1. **Gancho e Impacto Comercial (Copywriting):** ¿El título es persuasivo? ¿Despierta curiosidad o deseo?
2. **Diseño Visual y Legibilidad:** ¿Tiene buen contraste? ¿El texto es legible a simple vista desde un móvil? ¿La jerarquía visual es clara?
3. **Llamado a la Acción (CTA):** Si corresponde, ¿el cierre es directo y le indica claramente al usuario qué hacer?

Devolvé tu análisis formateado en Markdown de forma limpia y profesional, usando emojis. Sé directo y constructivo, enfocándote en consejos que eleven la conversión. Evitá introducciones vacías, empezá directo con los títulos.`;

    const url = 'https://api.openai.com/v1/chat/completions';
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'user',
            content: [
              { type: 'text', text: prompt },
              {
                type: 'image_url',
                image_url: {
                  url: base64Image
                }
              }
            ]
          }
        ],
        max_tokens: 800
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Error al llamar a OpenAI API:', errorText);
      res.status(500).json({ error: 'La API de OpenAI respondió con un error', details: errorText });
      return;
    }

    const data: any = await response.json();
    const critique = data.choices?.[0]?.message?.content || 'No se pudo obtener el análisis.';
    
    res.status(200).json({ success: true, critique });
  } catch (err: any) {
    console.error('Error en analyze-image:', err);
    res.status(500).json({ error: 'Error interno en el servidor al analizar la imagen', details: err.message });
  }
});

// ─────────────────────────────────────────────────────────────
// VIDEO STUDIO (storyboard por nicho → preview con Remotion)
// ─────────────────────────────────────────────────────────────

// Nichos de video disponibles (carpetas en niches/, menos _template)
router.get('/video/niches', requireAuth, async (_req: AuthenticatedRequest, res: Response) => {
  try {
    const entries = await readdir(NICHES_DIR, { withFileTypes: true });
    const niches = entries.filter((e) => e.isDirectory() && !e.name.startsWith('_')).map((e) => e.name);
    res.status(200).json({ niches });
  } catch {
    res.status(200).json({ niches: [] });
  }
});

// Generar un storyboard de video (usa el cerebro: Claude + capa visual)
router.post('/video/storyboard', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  const { topic, niche, durationSeconds, style, language } = req.body || {};
  if (!topic || !niche) {
    res.status(400).json({ error: 'Faltan parámetros: topic y niche' });
    return;
  }
  try {
    const result = await generateStoryboard({ topic, niche, durationSeconds, style, language });
    await enrichVideoPhotos(result.storyboard);
    res.status(200).json(result);
  } catch (err: any) {
    console.error('Error generando storyboard:', err);
    res.status(500).json({ error: 'No se pudo generar el storyboard', details: err?.message });
  }
});

export default router;
