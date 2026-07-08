import { Router, Response } from 'express';
import { supabase } from '../supabase.js';
import { requireAuth, AuthenticatedRequest } from '../middleware/auth.js';

const router = Router();

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
    prompt = `Sos un experto en marketing y diseño para redes sociales para negocios locales.
Generá una propuesta de carrusel interactivo en formato JSON estricto basado en los siguientes datos:
- Negocio: ${businessName}
- Rubro: ${industry || 'No especificado'}
- Objetivo de la campaña: ${goal || 'Vender'}
- Tono de comunicación: ${tone || 'Profesional'}
- Oferta o Mensaje principal: ${offer || 'No especificado'}
- Beneficios clave: ${benefits || 'No especificado'}
- Llamado a la acción (CTA): ${cta || 'WhatsApp'}
- Red social: ${targetSocialNetwork || 'Instagram'}
- Cantidad de slides: ${slidesCount}

Devolvé la respuesta en JSON con esta estructura exacta:
{
  "title": "Título general del carrusel",
  "caption": "Copy sugerido y persuasivo para acompañar el post",
  "hashtags": ["#tag1", "#tag2", "#tag3"],
  "slides": [
    {
      "slideNumber": 1,
      "role": "hook",
      "title": "Título del slide (máx 10 palabras)",
      "subtitle": "Subtítulo o texto secundario corto",
      "visualSuggestion": "Sugerencia visual para diseñar el fondo o imagen de este slide"
    }
  ]
}

Reglas:
- El texto debe ser sumamente claro, vendedor y corto.
- Cada slide debe tener una sola idea principal y enfocarse en enganchar al usuario.
- El primer slide ("role": "hook") debe ser un gancho que capte la atención inmediatamente.
- El último slide debe incluir el llamado a la acción.
- El formato de respuesta debe ser JSON puro, sin código Markdown adicional.`;
  } else if (contentType === 'reel') {
    prompt = `Sos un experto en guiones cortos para videos verticales de redes sociales (Reels, TikTok, Shorts).
Generá una propuesta de guion técnico y creativo en formato JSON estricto basado en los siguientes datos:
- Negocio: ${businessName}
- Rubro: ${industry || 'No especificado'}
- Objetivo: ${goal || 'Promocionar'}
- Tono: ${tone || 'Motivador'}
- Oferta: ${offer || 'No especificada'}
- Beneficios: ${benefits || 'No especificados'}
- CTA: ${cta || 'WhatsApp'}
- Duración sugerida: ${duration} segundos
- Red social: ${targetSocialNetwork || 'Instagram Reels'}

Devolvé la respuesta en JSON con esta estructura exacta:
{
  "title": "Título del Reel",
  "caption": "Copy persuasivo y formateado para el cuerpo de la publicación",
  "hashtags": ["#tag1", "#tag2", "#tag3"],
  "scenes": [
    {
      "sceneNumber": 1,
      "role": "hook",
      "textOnScreen": "Texto que aparece en pantalla",
      "voiceOver": "Texto sugerido para locución o voz en off",
      "durationSeconds": 3,
      "visualSuggestion": "Descripción del video, plano o animación recomendada"
    }
  ]
}

Reglas:
- El primer segundo del reel debe contener el gancho (role: hook).
- El texto en pantalla debe ser breve y de lectura rápida.
- Devolvé únicamente el JSON.`;
  } else {
    // Post simple
    prompt = `Sos un redactor publicitario experto. Generá un post simple en formato JSON estricto:
- Negocio: ${businessName}
- Rubro: ${industry || 'No especificado'}
- Objetivo: ${goal || 'Informar'}
- Tono: ${tone || 'Profesional'}
- Oferta: ${offer || 'No especificada'}
- CTA: ${cta || 'WhatsApp'}
- Red social: ${targetSocialNetwork || 'Facebook/Instagram'}

Estructura JSON exacta:
{
  "title": "Título descriptivo del post",
  "caption": "Copy principal persuasivo con emojis y CTA claro",
  "hashtags": ["#tag1", "#tag2"],
  "visualSuggestion": "Sugerencia detallada de la imagen estática a utilizar"
}
Solo devolvé el JSON.`;
  }

  // Intentar llamar a una IA si hay API key en las variables de entorno
  try {
    let aiResponse = null;

    if (process.env.GEMINI_API_KEY) {
      console.log('Utilizando Gemini para generar contenido...');
      const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${process.env.GEMINI_API_KEY}`;
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
      res.status(200).json({ success: true, ai_generated: true, data: parsed });
      return;
    }
  } catch (err) {
    console.warn('Error al llamar a la API del LLM, recurriendo al generador local:', err);
  }

  // FALLBACK GENERATOR: Si no hay keys o el fetch falla, generamos contenido de excelente calidad
  console.log('Utilizando generador local de plantillas...');
  const result = generateFallbackLocal(contentType, businessName, industry, goal, tone, offer, benefits, slidesCount, duration);
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
        { slideNumber: 1, role: 'hook', title: `¿Querés ponerte en forma y no sabés cómo empezar?`, subtitle: `En ${business} te acompañamos en cada paso de tu camino fitness.`, visualSuggestion: 'Imagen motivadora de alguien entrenando, fondo oscuro con texto en color principal.' },
        { slideNumber: 2, role: 'problem', title: `El problema de las rutinas aburridas`, subtitle: `Mucha gente abandona porque entrena sola o sin un plan específico para su nivel.`, visualSuggestion: 'Foto en blanco y negro de un gimnasio vacío o persona desmotivada.' },
        { slideNumber: 3, role: 'benefit', title: `Nuestra solución a tu medida`, subtitle: `Ofrecemos rutinas personalizadas, clases dinámicas y coach de seguimiento continuo.`, visualSuggestion: 'Foto grupal alegre en una clase con el color principal como acento.' },
        { slideNumber: 4, role: 'offer', title: `¡Aprovechá la oferta especial!`, subtitle: offer || `20% de descuento en la matrícula de inscripción este mes.`, visualSuggestion: 'Texto grande y destacado con la oferta resaltada en amarillo brillante.' },
        { slideNumber: 5, role: 'cta', title: `¡Escribinos para reservar!`, subtitle: `Hacé clic en el enlace para mandarnos un mensaje de WhatsApp directo.`, visualSuggestion: 'Pantalla de cierre limpia con logo de WhatsApp grande y colores de marca.' }
      );
    } else if (category === 'hair') {
      slides.push(
        { slideNumber: 1, role: 'hook', title: `Un cambio de look que potencia tu confianza`, subtitle: `Descubrí el estilo ideal para vos en ${business}.`, visualSuggestion: 'Imagen de un corte de pelo moderno con iluminación cálida y limpia.' },
        { slideNumber: 2, role: 'problem', title: `¿Corte apurado y sin asesoramiento?`, subtitle: `Ir a la peluquería no debería ser un trámite rápido, sino una experiencia de renovación.`, visualSuggestion: 'Foto detallada de herramientas de barbería o salón, estética premium.' },
        { slideNumber: 3, role: 'benefit', title: `Experiencia de Asesoría Completa`, subtitle: `Nuestros estilistas analizan tus rasgos y te recomiendan lo mejor para tu tipo de cabello.`, visualSuggestion: 'Foto del estilista trabajando con una sonrisa en un salón moderno.' },
        { slideNumber: 4, role: 'offer', title: `Tu beneficio exclusivo de la semana`, subtitle: offer || `Corte y servicio de hidratación profunda con 15% OFF de lunes a miércoles.`, visualSuggestion: 'Placa de colores contrastantes destacando la promoción de la semana.' },
        { slideNumber: 5, role: 'cta', title: `¡Reservá tu turno ya!`, subtitle: `Escribinos por WhatsApp para asegurar tu lugar. ¡Cupos limitados!`, visualSuggestion: 'Botones y contacto de WhatsApp destacados sobre fondo de marca.' }
      );
    } else if (category === 'inmo') {
      slides.push(
        { slideNumber: 1, role: 'hook', title: `Encontrá el hogar que siempre soñaste`, subtitle: `En ${business} tenemos las propiedades más exclusivas de la zona.`, visualSuggestion: 'Foto gran angular de un living moderno y luminoso.' },
        { slideNumber: 2, role: 'problem', title: `¿El trámite de alquiler o compra te estresa?`, subtitle: `Sabemos lo difícil que es encontrar un lugar que cumpla con todos tus requisitos y presupuesto.`, visualSuggestion: 'Foto conceptual de llaves y contratos firmados con luz tenue.' },
        { slideNumber: 3, role: 'benefit', title: `Trato humano y asesoramiento legal`, subtitle: `Te guiamos de principio a fin, ahorrándote trámites pesados y garantizando tu seguridad.`, visualSuggestion: 'Imagen de asesor inmobiliario conversando cordialmente con clientes en una propiedad.' },
        { slideNumber: 4, role: 'offer', title: `Propiedad Destacada`, subtitle: offer || `Nuevas propiedades en pozo con financiación exclusiva de hasta 24 cuotas sin interés.`, visualSuggestion: 'Plano del departamento o render 3D con banner de oportunidad única.' },
        { slideNumber: 5, role: 'cta', title: `¡Hablemos hoy mismo!`, subtitle: `Hacé clic en el botón para recibir el catálogo completo de propiedades.`, visualSuggestion: 'Detalle de contacto con el isotipo de la empresa inmobiliaria.' }
      );
    } else if (category === 'taller') {
      slides.push(
        { slideNumber: 1, role: 'hook', title: `Mantené tu auto seguro en la ruta`, subtitle: `En ${business} cuidamos tu coche con tecnología de diagnóstico avanzada.`, visualSuggestion: 'Foto de un capó de auto abierto con mecánico usando herramientas especializadas.' },
        { slideNumber: 2, role: 'problem', title: `El peligro de los ruidos extraños`, subtitle: `Un pequeño ruido no resuelto hoy puede convertirse en una rotura costosa y peligrosa mañana.`, visualSuggestion: 'Primer plano de frenos desgastados o motor con luz de advertencia.' },
        { slideNumber: 3, role: 'benefit', title: `Mecánicos certificados y repuestos originales`, subtitle: `Garantía escrita en todos los trabajos y entrega a término pactado.`, visualSuggestion: 'Taller ordenado y limpio, con un auto elevado y herramientas de precisión.' },
        { slideNumber: 4, role: 'offer', title: `Checklist de Seguridad Gratis`, subtitle: offer || `Alineación y balanceo bonificados con el cambio de aceite de esta semana.`, visualSuggestion: 'Cuadro de oferta llamativo con borde naranja de alerta y descuentos.' },
        { slideNumber: 5, role: 'cta', title: `¡Agendá tu revisión hoy!`, subtitle: `Consultanos por WhatsApp y coordiná el ingreso de tu vehículo.`, visualSuggestion: 'Información de contacto fácil de leer con logo de WhatsApp.' }
      );
    } else {
      // Genérico
      slides.push(
        { slideNumber: 1, role: 'hook', title: `Potenciá tu día con ${business}`, subtitle: `Soluciones profesionales diseñadas especialmente para vos.`, visualSuggestion: 'Fondo abstracto en degradé con colores corporativos y tipografía nítida.' },
        { slideNumber: 2, role: 'problem', title: `El desafío de encontrar la solución ideal`, subtitle: `Muchas veces perdés tiempo y dinero probando opciones genéricas que no resuelven tu caso.`, visualSuggestion: 'Imagen artística minimalista representando confusión o desorganización.' },
        { slideNumber: 3, role: 'benefit', title: `Por qué elegirnos`, subtitle: benefits || `Ofrecemos un servicio de alta calidad enfocado en la satisfacción y el retorno del cliente.`, visualSuggestion: 'Gráfico limpio o icono que refleje crecimiento o soporte premium.' },
        { slideNumber: 4, role: 'offer', title: `Beneficio único para nuevos clientes`, subtitle: offer || `¡Consultanos hoy y obtené una asesoría de diagnóstico completamente bonificada!`, visualSuggestion: 'Destacado de la oferta con el color secundario de la marca.' },
        { slideNumber: 5, role: 'cta', title: `¡Ponete en contacto!`, subtitle: `Escribinos ahora para arrancar. ¡Estamos listos para ayudarte!`, visualSuggestion: 'Cierre limpio con logo y datos del negocio.' }
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
      { sceneNumber: 1, role: 'hook', textOnScreen: `¿Cansado de lo mismo?`, voiceOver: `Si estás cansado de no encontrar soluciones reales, prestá atención.`, durationSeconds: 3, visualSuggestion: 'Toma rápida de primer plano de persona pensativa.' },
      { sceneNumber: 2, role: 'problem', textOnScreen: `Este es el gran error...`, voiceOver: `El gran error es elegir servicios estándar que no se adaptan a tu negocio local.`, durationSeconds: 4, visualSuggestion: 'Cambio de plano a un espacio de trabajo con ritmo dinámico.' },
      { sceneNumber: 3, role: 'solution', textOnScreen: `Descubrí ${business}`, voiceOver: `En ${business} diseñamos un plan específico para resolver esto a tu medida.`, durationSeconds: 4, visualSuggestion: 'Muestra de los productos, local o el equipo sonriendo.' },
      { sceneNumber: 4, role: 'offer', textOnScreen: offer || `Beneficio especial hoy`, voiceOver: `Y si nos escribís hoy, te llevás un beneficio exclusivo para comenzar sin vueltas.`, durationSeconds: 3, visualSuggestion: 'Placa de texto grande con la oferta.' },
      { sceneNumber: 5, role: 'cta', textOnScreen: `¡Escribinos por WhatsApp!`, voiceOver: `Hacé clic en el enlace de nuestro perfil y escribinos. ¡Te esperamos!`, durationSeconds: Math.max(2, duration - 14), visualSuggestion: 'Toma final del equipo indicando escribir por privado con animación de flecha.' }
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
      visualSuggestion: `Diseño con fondo de color corporativo de la marca. Texto central llamativo con la oferta: "${offer || business}". Logotipo del negocio en la esquina superior derecha y datos de contacto (WhatsApp/Sitio) en la parte inferior.`
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

export default router;
