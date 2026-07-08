"use client";

import React, { useState, useEffect, useRef } from "react";
import {
  Sparkles, Plus, Trash2, Megaphone, User, Globe, Save, Download,
  ChevronLeft, ChevronRight, Palette, Check, RefreshCw, FileText,
  LayoutGrid, Share2, HelpCircle, Phone, ArrowRight, Upload
} from "lucide-react";

interface BrandProfile {
  business_name: string;
  industry: string;
  logo_url: string;
  primary_color: string;
  secondary_color: string;
  background_color: string;
  font_family: string;
  whatsapp: string;
  website: string;
  default_tone: string;
}

interface Slide {
  slideNumber: number;
  role: 'hook' | 'problem' | 'benefit' | 'offer' | 'cta' | 'generic';
  title: string;
  subtitle: string;
  visualSuggestion?: string;
  layoutStyle?: 'center' | 'left' | 'accent' | 'highlight';
}

interface MarketingContent {
  id?: string;
  content_type: 'carrusel' | 'reel' | 'post_simple';
  status: 'draft' | 'ready';
  title: string;
  goal: string;
  tone: string;
  target_social_network: string;
  format: string;
  form_data_json: any;
  slides_json: Slide[] | any;
  caption: string;
  hashtags_json: string[];
  created_at?: string;
}

interface MarketingStudioProps {
  session: any;
  BACKEND_URL: string;
  getHeaders: () => any;
}

export default function MarketingStudio({ session, BACKEND_URL, getHeaders }: MarketingStudioProps) {
  // Subsecciones: 'crear' | 'mis_publicaciones' | 'marca' | 'plantillas'
  const [subSection, setSubSection] = useState<'crear' | 'mis_publicaciones' | 'marca' | 'plantillas'>('crear');

  // Perfil de marca
  const [brandProfile, setBrandProfile] = useState<BrandProfile>({
    business_name: "",
    industry: "",
    logo_url: "",
    primary_color: "#f97316",
    secondary_color: "#fbbf24",
    background_color: "#121214",
    font_family: "Inter",
    whatsapp: "",
    website: "",
    default_tone: "Motivador"
  });

  // Lista de borradores guardados
  const [savedContents, setSavedContents] = useState<MarketingContent[]>([]);
  const [dbNotMigrated, setDbNotMigrated] = useState<boolean>(false);
  const [loadingBrand, setLoadingBrand] = useState<boolean>(false);
  const [loadingContents, setLoadingContents] = useState<boolean>(false);
  const [savingBrand, setSavingBrand] = useState<boolean>(false);
  const [savingContent, setSavingContent] = useState<boolean>(false);

  // Formulario de creación
  const [formData, setFormData] = useState({
    contentType: 'carrusel' as 'carrusel' | 'reel' | 'post_simple',
    title: '',
    industry: '',
    goal: 'Conseguir leads',
    tone: 'Motivador',
    offer: '',
    benefits: '',
    cta: 'Escribinos por WhatsApp',
    targetSocialNetwork: 'Instagram Feed',
    format: '1080x1350',
    slidesCount: 5,
    duration: 15
  });

  // Publicación activa en el editor
  const [activeContent, setActiveContent] = useState<MarketingContent | null>(null);
  const [activeSlideIndex, setActiveSlideIndex] = useState<number>(0);
  const [generating, setGenerating] = useState<boolean>(false);

  // Cargar datos al iniciar
  useEffect(() => {
    fetchBrandProfile();
    fetchSavedContents();
  }, []);

  // Autofill del formulario con la marca guardada
  useEffect(() => {
    if (brandProfile.business_name) {
      setFormData(prev => ({
        ...prev,
        title: prev.title || `Publicación para ${brandProfile.business_name}`,
        industry: prev.industry || brandProfile.industry || '',
        tone: prev.tone || brandProfile.default_tone || 'Motivador',
        cta: prev.cta || (brandProfile.whatsapp ? `Escribinos al WhatsApp +${brandProfile.whatsapp}` : 'Escribinos por WhatsApp')
      }));
    }
  }, [brandProfile]);

  // --- API CALLS ---
  const fetchBrandProfile = async () => {
    setLoadingBrand(true);
    try {
      const res = await fetch(`${BACKEND_URL}/api/marketing/brand`, { headers: getHeaders() });
      const resJson = await res.json();
      
      if (resJson.db_not_migrated) {
        setDbNotMigrated(true);
        // Fallback a localStorage
        const localBrand = localStorage.getItem('automata_brand_profile');
        if (localBrand) {
          setBrandProfile(JSON.parse(localBrand));
        }
      } else if (resJson.data) {
        setBrandProfile(resJson.data);
      }
    } catch (err) {
      console.error("Error al cargar marca:", err);
      // Fallback local
      const localBrand = localStorage.getItem('automata_brand_profile');
      if (localBrand) setBrandProfile(JSON.parse(localBrand));
    } finally {
      setLoadingBrand(false);
    }
  };

  const saveBrandProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingBrand(true);
    try {
      if (dbNotMigrated) {
        localStorage.setItem('automata_brand_profile', JSON.stringify(brandProfile));
        alert('Marca guardada localmente en el navegador (Base de datos no migrada).');
      } else {
        const res = await fetch(`${BACKEND_URL}/api/marketing/brand`, {
          method: 'POST',
          headers: { ...getHeaders(), 'Content-Type': 'application/json' },
          body: JSON.stringify(brandProfile)
        });
        const resJson = await res.json();
        if (resJson.data) {
          setBrandProfile(resJson.data);
          alert('Identidad de marca actualizada correctamente.');
        } else {
          // Fallback en error
          localStorage.setItem('automata_brand_profile', JSON.stringify(brandProfile));
          alert('Marca guardada localmente.');
        }
      }
    } catch (err) {
      console.error("Error al guardar marca:", err);
      localStorage.setItem('automata_brand_profile', JSON.stringify(brandProfile));
      alert('Error en red. Perfil guardado localmente.');
    } finally {
      setSavingBrand(false);
    }
  };

  const fetchSavedContents = async () => {
    setLoadingContents(true);
    try {
      const res = await fetch(`${BACKEND_URL}/api/marketing/contents`, { headers: getHeaders() });
      const resJson = await res.json();

      if (resJson.db_not_migrated) {
        setDbNotMigrated(true);
        const localContents = localStorage.getItem('automata_marketing_contents');
        if (localContents) {
          setSavedContents(JSON.parse(localContents));
        }
      } else if (resJson.data) {
        setSavedContents(resJson.data);
      }
    } catch (err) {
      console.error("Error al cargar publicaciones:", err);
      const localContents = localStorage.getItem('automata_marketing_contents');
      if (localContents) setSavedContents(JSON.parse(localContents));
    } finally {
      setLoadingContents(false);
    }
  };

  const saveContentDraft = async (content: MarketingContent) => {
    setSavingContent(true);
    try {
      if (dbNotMigrated) {
        const updated = [...savedContents];
        const idx = updated.findIndex(c => c.id === content.id);
        
        let targetContent = { ...content };
        if (idx > -1) {
          updated[idx] = targetContent;
        } else {
          targetContent.id = `local-${Date.now()}`;
          targetContent.created_at = new Date().toISOString();
          updated.unshift(targetContent);
        }
        
        localStorage.setItem('automata_marketing_contents', JSON.stringify(updated));
        setSavedContents(updated);
        setActiveContent(targetContent);
        alert('Borrador guardado localmente.');
      } else {
        const isUpdate = !!content.id && !content.id.startsWith('local-');
        const url = isUpdate 
          ? `${BACKEND_URL}/api/marketing/contents/${content.id}`
          : `${BACKEND_URL}/api/marketing/contents`;
        
        const res = await fetch(url, {
          method: isUpdate ? 'PUT' : 'POST',
          headers: { ...getHeaders(), 'Content-Type': 'application/json' },
          body: JSON.stringify(content)
        });
        
        const resJson = await res.json();
        if (resJson.data) {
          const updated = [...savedContents];
          const idx = updated.findIndex(c => c.id === resJson.data.id);
          if (idx > -1) {
            updated[idx] = resJson.data;
          } else {
            updated.unshift(resJson.data);
          }
          setSavedContents(updated);
          setActiveContent(resJson.data);
          alert('Borrador guardado en la nube.');
        }
      }
    } catch (err) {
      console.error("Error al guardar borrador:", err);
      alert('No se pudo guardar el borrador en el servidor.');
    } finally {
      setSavingContent(false);
    }
  };

  const deleteContentDraft = async (id: string) => {
    if (!window.confirm('¿Seguro que querés eliminar esta publicación?')) return;
    try {
      if (dbNotMigrated || id.startsWith('local-')) {
        const updated = savedContents.filter(c => c.id !== id);
        localStorage.setItem('automata_marketing_contents', JSON.stringify(updated));
        setSavedContents(updated);
        if (activeContent?.id === id) setActiveContent(null);
      } else {
        const res = await fetch(`${BACKEND_URL}/api/marketing/contents/${id}`, {
          method: 'DELETE',
          headers: getHeaders()
        });
        if (res.ok) {
          const updated = savedContents.filter(c => c.id !== id);
          setSavedContents(updated);
          if (activeContent?.id === id) setActiveContent(null);
        }
      }
    } catch (err) {
      console.error("Error al eliminar borrador:", err);
    }
  };

  // --- GENERACIÓN DE CONTENIDO ---
  const handleGenerate = async (e: React.FormEvent) => {
    e.preventDefault();
    setGenerating(true);
    setActiveSlideIndex(0);
    
    try {
      const res = await fetch(`${BACKEND_URL}/api/marketing/generate`, {
        method: 'POST',
        headers: { ...getHeaders(), 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contentType: formData.contentType,
          businessName: brandProfile.business_name || "Mi Negocio",
          industry: formData.industry || brandProfile.industry,
          goal: formData.goal,
          tone: formData.tone,
          offer: formData.offer,
          benefits: formData.benefits,
          cta: formData.cta,
          targetSocialNetwork: formData.targetSocialNetwork,
          format: formData.format,
          slidesCount: formData.slidesCount,
          duration: formData.duration
        })
      });

      const resJson = await res.json();
      if (resJson.success && resJson.data) {
        const payload: MarketingContent = {
          content_type: formData.contentType,
          status: 'draft',
          title: formData.title || `Generado para ${brandProfile.business_name || 'Negocio'}`,
          goal: formData.goal,
          tone: formData.tone,
          target_social_network: formData.targetSocialNetwork,
          format: formData.format,
          form_data_json: formData,
          slides_json: resJson.data.slides || resJson.data.scenes || [
            {
              slideNumber: 1,
              role: 'generic',
              title: resJson.data.title || "Post Simple",
              subtitle: resJson.data.visualSuggestion || "Diseño corporativo",
              layoutStyle: 'center'
            }
          ],
          caption: resJson.data.caption || "",
          hashtags_json: resJson.data.hashtags || []
        };
        
        // Agregar layouts por defecto si no existen
        if (formData.contentType === 'carrusel') {
          payload.slides_json = payload.slides_json.map((s: any, idx: number) => ({
            ...s,
            layoutStyle: idx === 0 ? 'center' : idx === payload.slides_json.length - 1 ? 'highlight' : 'left'
          }));
        }

        setActiveContent(payload);
        alert('¡Propuesta de contenido generada exitosamente!');
      }
    } catch (err) {
      console.error("Error al generar contenido:", err);
      alert('Error de conexión al generar contenido.');
    } finally {
      setGenerating(false);
    }
  };

  // --- EDITOR INTERACTIONS ---
  const handleUpdateSlideField = (field: 'title' | 'subtitle' | 'layoutStyle', value: string) => {
    if (!activeContent) return;
    
    let updatedSlides = [];
    if (activeContent.content_type === 'carrusel') {
      updatedSlides = [...activeContent.slides_json];
      updatedSlides[activeSlideIndex] = {
        ...updatedSlides[activeSlideIndex],
        [field]: value
      };
    } else {
      updatedSlides = [...activeContent.slides_json];
      updatedSlides[activeSlideIndex] = {
        ...updatedSlides[activeSlideIndex],
        [field === 'title' ? 'textOnScreen' : field]: value
      };
    }

    setActiveContent({
      ...activeContent,
      slides_json: updatedSlides
    });
  };

  const handleAISmallAction = async (actionType: string) => {
    if (!activeContent) return;
    alert(`Asistente IA: Modificando texto ("${actionType}")...`);
    
    const isCarrusel = activeContent.content_type === 'carrusel';
    const currentText = isCarrusel 
      ? activeContent.slides_json[activeSlideIndex].title
      : activeContent.slides_json[activeSlideIndex].textOnScreen;
    
    // Simulación rápida de optimización de texto
    let newText = currentText;
    if (actionType === 'vendedor') {
      newText = `🔥 ¡OFERTA IMPERDIBLE! ${currentText} - ¡Solo por tiempo limitado!`;
    } else if (actionType === 'corto') {
      newText = currentText.length > 25 ? currentText.substring(0, 25) + '...' : currentText;
    } else if (actionType === 'divertido') {
      newText = `😜 ¿Te lo vas a perder? ${currentText} ¡Escribinos ya! 🎉`;
    } else if (actionType === 'urgencia') {
      newText = `🚨 ÚLTIMOS CUPOS DISPONIBLES 🚨 ${currentText}`;
    }

    if (isCarrusel) {
      handleUpdateSlideField('title', newText);
    } else {
      handleUpdateSlideField('title', newText);
    }
  };

  // --- EXPORTAR CARRUSEL O POST SIMPLE (CANVAS RENDER DINÁMICO) ---
  const exportAllSlides = () => {
    if (!activeContent || (activeContent.content_type !== 'carrusel' && activeContent.content_type !== 'post_simple')) return;
    
    const slides = activeContent.slides_json;
    alert(`Renderizando ${slides.length} imágenes. Tu navegador descargará los archivos PNG en unos segundos.`);

    // 1. Obtener dimensiones dinámicas según el formato de la publicación
    let width = 1080;
    let height = 1350;
    if (activeContent.format && activeContent.format.includes('x')) {
      const parts = activeContent.format.split('x');
      width = parseInt(parts[0]) || 1080;
      height = parseInt(parts[1]) || 1350;
    }

    slides.forEach((slide: Slide, index: number) => {
      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      // Colores desde la marca
      const bg = brandProfile.background_color || '#121214';
      const primary = brandProfile.primary_color || '#f97316';
      const secondary = brandProfile.secondary_color || '#fbbf24';

      // 1. Dibujar Fondo
      ctx.fillStyle = bg;
      ctx.fillRect(0, 0, width, height);

      // 2. Gráficos decorativos proporcionales
      ctx.fillStyle = primary;
      ctx.beginPath();
      // Esquina superior derecha
      ctx.arc(width, 0, width * 0.32, 0, 2 * Math.PI);
      ctx.fill();

      // Círculo decorativo inferior izquierdo
      ctx.fillStyle = `${secondary}15`; // con opacidad
      ctx.beginPath();
      ctx.arc(0, height, height * 0.33, 0, 2 * Math.PI);
      ctx.fill();

      // 3. Dibujar Branding Superior proporcional
      ctx.fillStyle = '#ffffff';
      const logoFontSize = Math.max(16, Math.round(width * 0.033));
      ctx.font = `bold ${logoFontSize}px sans-serif`;
      ctx.fillText(brandProfile.business_name.toUpperCase() || 'MI NEGOCIO', width * 0.074, height * 0.09);

      // Icono decorativo de marca (Isotipo simple)
      ctx.fillStyle = primary;
      const barWidth = width * 0.055;
      const barHeight = Math.max(2, Math.round(height * 0.006));
      ctx.fillRect(width * 0.074, height * 0.105, barWidth, barHeight);

      // 4. Dibujar Layout de Texto Principal Proporcional
      const layout = slide.layoutStyle || 'left';
      ctx.fillStyle = '#ffffff';
      
      let titleY = height * 0.35;
      const textMaxWidth = width * 0.82;
      const leftMargin = width * 0.092;

      // Tamaños de fuente relativos según el ancho del canvas
      const baseTitleSize = Math.max(24, Math.round(width * 0.055));
      const baseSubSize = Math.max(14, Math.round(width * 0.031));

      if (layout === 'center') {
        ctx.textAlign = 'center';
        const fontSize = Math.round(baseTitleSize * 1.06);
        ctx.font = `bold ${fontSize}px sans-serif`;
        titleY = height * 0.40;
        
        // Dibujar Título con wrapping
        const nextY = wrapText(ctx, slide.title, width * 0.5, titleY, textMaxWidth, fontSize * 1.3);
        
        // Dibujar Subtítulo
        ctx.fillStyle = '#a3a3a3';
        const subFontSize = Math.round(baseSubSize * 1.06);
        ctx.font = `${subFontSize}px sans-serif`;
        wrapText(ctx, slide.subtitle, width * 0.5, nextY + (height * 0.022), textMaxWidth, subFontSize * 1.4);
      } else if (layout === 'highlight' || slide.role === 'offer') {
        ctx.textAlign = 'left';
        const fontSize = Math.round(baseTitleSize * 1.13);
        ctx.font = `bold ${fontSize}px sans-serif`;
        ctx.fillStyle = secondary;
        
        // Dibujar Título
        const nextY = wrapText(ctx, slide.title, leftMargin, titleY, textMaxWidth, fontSize * 1.3);
        
        // Dibujar Subtítulo
        ctx.fillStyle = '#ffffff';
        const subFontSize = Math.round(baseSubSize * 1.11);
        ctx.font = `normal ${subFontSize}px sans-serif`;
        wrapText(ctx, slide.subtitle, leftMargin, nextY + (height * 0.03), textMaxWidth, subFontSize * 1.4);
        
        // Dibujar caja de oferta
        ctx.fillStyle = `${primary}20`;
        ctx.fillRect(width * 0.074, titleY - (height * 0.06), width * 0.85, Math.max(2, Math.round(height * 0.007)));
      } else {
        // Layout 'left'
        ctx.textAlign = 'left';
        ctx.font = `bold ${baseTitleSize}px sans-serif`;
        
        // Dibujar Título
        const nextY = wrapText(ctx, slide.title, leftMargin, titleY, textMaxWidth, baseTitleSize * 1.3);
        
        // Dibujar Subtítulo
        ctx.fillStyle = '#d4d4d4';
        ctx.font = `${baseSubSize}px sans-serif`;
        wrapText(ctx, slide.subtitle, leftMargin, nextY + (height * 0.022), textMaxWidth, baseSubSize * 1.4);
      }

      // 5. Dibujar Pie de Página (Footer) Proporcional
      ctx.textAlign = 'left';
      ctx.fillStyle = '#a3a3a3';
      const footerFontSize = Math.max(12, Math.round(width * 0.026));
      ctx.font = `${footerFontSize}px sans-serif`;

      if (brandProfile.whatsapp) {
        ctx.fillText(`💬 WhatsApp: +${brandProfile.whatsapp}`, leftMargin, height * 0.90);
      }
      if (brandProfile.website) {
        ctx.fillText(`🌐 ${brandProfile.website}`, leftMargin, height * 0.935);
      }

      // Indicador de Paginación (Slide 1 / X)
      ctx.textAlign = 'right';
      ctx.fillStyle = primary;
      const paginationFontSize = Math.max(14, Math.round(width * 0.033));
      ctx.font = `bold ${paginationFontSize}px sans-serif`;
      ctx.fillText(`${index + 1} / ${slides.length}`, width * 0.91, height * 0.92);

      // Deslizar para leer
      const swipeFontSize = Math.max(10, Math.round(width * 0.022));
      ctx.fillStyle = '#737373';
      ctx.font = `bold ${swipeFontSize}px sans-serif`;
      if (index < slides.length - 1) {
        ctx.fillText(`Deslizar ➔`, width * 0.91, height * 0.95);
      }

      // 6. Descargar Archivo
      const link = document.createElement('a');
      link.download = `${activeContent.title.replace(/\s+/g, '_')}_slide_${index + 1}.png`;
      link.href = canvas.toDataURL('image/png');
      link.click();
    });
  };

  // Helper para wrapping en Canvas
  function wrapText(
    ctx: CanvasRenderingContext2D,
    text: string,
    x: number,
    y: number,
    maxWidth: number,
    lineHeight: number
  ): number {
    const words = text.split(' ');
    let line = '';
    let currentY = y;
    
    for (let n = 0; n < words.length; n++) {
      const testLine = line + words[n] + ' ';
      const metrics = ctx.measureText(testLine);
      const testWidth = metrics.width;
      
      if (testWidth > maxWidth && n > 0) {
        ctx.fillText(line, x, currentY);
        line = words[n] + ' ';
        currentY += lineHeight;
      } else {
        line = testLine;
      }
    }
    ctx.fillText(line, x, currentY);
    return currentY;
  }

  // --- RENDER COMPONENT ---
  return (
    <div className="flex-1 flex flex-col overflow-hidden bg-neutral-950/20 text-neutral-100 font-sans">
      
      {/* Header del Marketing Studio */}
      <header className="h-16 px-6 border-b border-neutral-800/60 bg-neutral-900/20 backdrop-blur-md flex items-center justify-between shrink-0 z-10">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-orange-500 to-amber-500 flex items-center justify-center font-bold text-white shadow-md shadow-orange-500/20">
            <Megaphone size={16} />
          </div>
          <div>
            <span className="font-bold text-base text-white block">Marketing Studio</span>
            <span className="text-[10px] text-neutral-400">Creación visual de carruseles, posts e ideas de reels con Inteligencia Artificial.</span>
          </div>
        </div>

        {/* Selector de subsecciones */}
        <div className="flex bg-neutral-900/60 p-0.5 rounded-xl border border-neutral-800">
          <button
            onClick={() => setSubSection('crear')}
            className={`text-xs py-1.5 px-3 rounded-lg font-semibold transition-all ${
              subSection === 'crear' ? 'bg-orange-600 text-white shadow' : 'text-neutral-400 hover:text-neutral-200'
            }`}
          >
            Crear Contenido
          </button>
          <button
            onClick={() => setSubSection('mis_publicaciones')}
            className={`text-xs py-1.5 px-3 rounded-lg font-semibold transition-all ${
              subSection === 'mis_publicaciones' ? 'bg-orange-600 text-white shadow' : 'text-neutral-400 hover:text-neutral-200'
            }`}
          >
            Mis Publicaciones ({savedContents.length})
          </button>
          <button
            onClick={() => setSubSection('marca')}
            className={`text-xs py-1.5 px-3 rounded-lg font-semibold transition-all ${
              subSection === 'marca' ? 'bg-orange-600 text-white shadow' : 'text-neutral-400 hover:text-neutral-200'
            }`}
          >
            Marca del Negocio
          </button>
          <button
            onClick={() => setSubSection('plantillas')}
            className={`text-xs py-1.5 px-3 rounded-lg font-semibold transition-all ${
              subSection === 'plantillas' ? 'bg-orange-600 text-white shadow' : 'text-neutral-400 hover:text-neutral-200'
            }`}
          >
            Catálogo
          </button>
        </div>
      </header>

      {/* Database Warning */}
      {dbNotMigrated && (
        <div className="bg-amber-950/20 border-b border-amber-900/40 py-2 px-6 flex items-center justify-between text-xs text-amber-400">
          <div className="flex items-center gap-2">
            <HelpCircle size={14} className="shrink-0 animate-pulse" />
            <span><strong>Nota técnica:</strong> Base de datos de marketing no migrada. Los borradores y marcas se guardan de forma local en tu navegador para que puedas probar el flujo completo de inmediato.</span>
          </div>
          <button 
            onClick={() => setDbNotMigrated(false)} 
            className="text-[10px] uppercase font-bold text-amber-500 hover:underline px-2"
          >
            Ocultar
          </button>
        </div>
      )}

      {/* Main Workspace Grid */}
      <div className="flex-1 flex overflow-hidden">
        
        {/* SUBSECCIÓN 1: FORMULARIO CREAR CONTENIDO */}
        {subSection === 'crear' && (
          <div className="flex-1 flex overflow-hidden">
            
            {/* Columna 1: Formulario */}
            <aside className="w-80 md:w-96 flex flex-col bg-neutral-900/30 backdrop-blur-xl border-r border-neutral-800/60 overflow-y-auto custom-scrollbar p-6 shrink-0 space-y-5">
              <h3 className="font-bold text-sm text-neutral-300 uppercase tracking-wider flex items-center gap-1.5">
                <FileText size={15} className="text-orange-500" /> Parámetros del Post
              </h3>

              <form onSubmit={handleGenerate} className="space-y-4">
                {/* Tipo de publicación */}
                <div>
                  <label className="block text-[10px] text-neutral-500 font-bold uppercase tracking-wider mb-1.5">Tipo de Contenido</label>
                  <div className="grid grid-cols-3 gap-2">
                    {(['carrusel', 'reel', 'post_simple'] as const).map(type => (
                      <button
                        key={type}
                        type="button"
                        onClick={() => setFormData({ ...formData, contentType: type })}
                        className={`py-2 px-1 text-[11px] font-bold rounded-lg border text-center capitalize transition-all ${
                          formData.contentType === type
                            ? 'bg-orange-950/40 border-orange-500 text-orange-400 shadow-inner'
                            : 'bg-neutral-900/40 border-neutral-800 text-neutral-400 hover:border-neutral-700'
                        }`}
                      >
                        {type === 'post_simple' ? 'Post Estático' : type}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Título de borrador */}
                <div>
                  <label className="block text-[10px] text-neutral-500 font-bold uppercase tracking-wider mb-1">Nombre Campaña (CRM)</label>
                  <input
                    type="text"
                    required
                    placeholder="Ej: Promo Gimnasio Julio"
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    className="w-full bg-neutral-950/60 border border-neutral-800 text-neutral-200 placeholder-neutral-600 text-xs px-3 py-2.5 rounded-xl focus:outline-none focus:border-orange-600 transition-colors"
                  />
                </div>

                {/* Rubro */}
                <div>
                  <label className="block text-[10px] text-neutral-500 font-bold uppercase tracking-wider mb-1">Rubro de la Marca</label>
                  <input
                    type="text"
                    placeholder="Ej: Gimnasio, Inmobiliaria..."
                    value={formData.industry}
                    onChange={(e) => setFormData({ ...formData, industry: e.target.value })}
                    className="w-full bg-neutral-950/60 border border-neutral-800 text-neutral-200 placeholder-neutral-600 text-xs px-3 py-2.5 rounded-xl focus:outline-none focus:border-orange-600 transition-colors"
                  />
                </div>

                {/* Objetivo y Tono */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[10px] text-neutral-500 font-bold uppercase tracking-wider mb-1">Objetivo</label>
                    <select
                      value={formData.goal}
                      onChange={(e) => setFormData({ ...formData, goal: e.target.value })}
                      className="w-full bg-neutral-950/60 border border-neutral-800 text-neutral-200 text-xs px-3 py-2.5 rounded-xl focus:outline-none focus:border-orange-600"
                    >
                      <option>Conseguir leads</option>
                      <option>Promocionar oferta</option>
                      <option>Mostrar testimonios</option>
                      <option>Tips educativos</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-[10px] text-neutral-500 font-bold uppercase tracking-wider mb-1">Tono</label>
                    <select
                      value={formData.tone}
                      onChange={(e) => setFormData({ ...formData, tone: e.target.value })}
                      className="w-full bg-neutral-950/60 border border-neutral-800 text-neutral-200 text-xs px-3 py-2.5 rounded-xl focus:outline-none focus:border-orange-600"
                    >
                      <option>Motivador</option>
                      <option>Profesional</option>
                      <option>Divertido</option>
                      <option>Urgente</option>
                      <option>Premium</option>
                    </select>
                  </div>
                </div>

                {/* Oferta */}
                <div>
                  <label className="block text-[10px] text-neutral-500 font-bold uppercase tracking-wider mb-1">Oferta / Mensaje Principal</label>
                  <textarea
                    placeholder="Ej: 20% de descuento en la matrícula durante Julio."
                    value={formData.offer}
                    onChange={(e) => setFormData({ ...formData, offer: e.target.value })}
                    rows={2}
                    className="w-full bg-neutral-950/60 border border-neutral-800 text-neutral-200 placeholder-neutral-600 text-xs px-3 py-2.5 rounded-xl focus:outline-none focus:border-orange-600 resize-none transition-colors"
                  />
                </div>

                {/* Beneficios */}
                <div>
                  <label className="block text-[10px] text-neutral-500 font-bold uppercase tracking-wider mb-1">Beneficios (Opcional)</label>
                  <textarea
                    placeholder="Ej: Seguimiento continuo, entrenadores certificados."
                    value={formData.benefits}
                    onChange={(e) => setFormData({ ...formData, benefits: e.target.value })}
                    rows={2}
                    className="w-full bg-neutral-950/60 border border-neutral-800 text-neutral-200 placeholder-neutral-600 text-xs px-3 py-2.5 rounded-xl focus:outline-none focus:border-orange-600 resize-none transition-colors"
                  />
                </div>

                {/* CTA y Red Social */}
                <div>
                  <label className="block text-[10px] text-neutral-500 font-bold uppercase tracking-wider mb-1">Llamado a la acción (CTA)</label>
                  <input
                    type="text"
                    value={formData.cta}
                    onChange={(e) => setFormData({ ...formData, cta: e.target.value })}
                    className="w-full bg-neutral-950/60 border border-neutral-800 text-neutral-200 text-xs px-3 py-2.5 rounded-xl focus:outline-none focus:border-orange-600"
                  />
                </div>

                {/* Configuraciones adicionales por tipo */}
                {formData.contentType === 'carrusel' && (
                  <div>
                    <label className="block text-[10px] text-neutral-500 font-bold uppercase tracking-wider mb-1">Cantidad de Slides</label>
                    <input
                      type="number"
                      min={3}
                      max={10}
                      value={formData.slidesCount}
                      onChange={(e) => setFormData({ ...formData, slidesCount: parseInt(e.target.value) || 5 })}
                      className="w-full bg-neutral-950/60 border border-neutral-800 text-neutral-200 text-xs px-3 py-2.5 rounded-xl focus:outline-none"
                    />
                  </div>
                )}

                {formData.contentType === 'reel' && (
                  <div>
                    <label className="block text-[10px] text-neutral-500 font-bold uppercase tracking-wider mb-1">Duración (segundos)</label>
                    <input
                      type="number"
                      min={5}
                      max={60}
                      value={formData.duration}
                      onChange={(e) => setFormData({ ...formData, duration: parseInt(e.target.value) || 15 })}
                      className="w-full bg-neutral-950/60 border border-neutral-800 text-neutral-200 text-xs px-3 py-2.5 rounded-xl focus:outline-none"
                    />
                  </div>
                )}

                <button
                  type="submit"
                  disabled={generating || !formData.title}
                  className="w-full py-3 bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-400 hover:to-amber-400 text-white rounded-xl text-xs font-semibold shadow-md shadow-orange-500/15 hover:shadow-orange-500/25 transition-all flex items-center justify-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  {generating ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      <span>Generando propuesta...</span>
                    </>
                  ) : (
                    <>
                      <Sparkles size={14} />
                      <span>Generar propuesta IA</span>
                    </>
                  )}
                </button>
              </form>
            </aside>

            {/* Columna 2: Editor de Slides de la Propuesta Generada */}
            {activeContent ? (
              <main className="flex-1 flex overflow-hidden">
                <div className="flex-1 flex flex-col p-6 overflow-y-auto custom-scrollbar">
                  
                  {/* Título de publicación e información de marca */}
                  <div className="flex justify-between items-center mb-6 border-b border-neutral-800 pb-4">
                    <div>
                      <h4 className="text-base font-bold text-white mb-1 flex items-center gap-2">
                        {activeContent.title}
                        <span className="text-[9px] uppercase tracking-widest px-2 py-0.5 rounded bg-orange-950/40 text-orange-400 border border-orange-900/30">
                          {activeContent.content_type}
                        </span>
                      </h4>
                      <p className="text-xs text-neutral-500">Editá los textos, reordená slides y aplicá cambios de IA.</p>
                    </div>

                    <div className="flex gap-2">
                      <button
                        onClick={() => saveContentDraft(activeContent)}
                        disabled={savingContent}
                        className="px-3.5 py-1.5 rounded-lg bg-neutral-900 hover:bg-neutral-800 border border-neutral-800 text-neutral-300 hover:text-white transition-all text-xs font-semibold flex items-center gap-1.5"
                      >
                        <Save size={13} />
                        {savingContent ? 'Guardando...' : 'Guardar Borrador'}
                      </button>

                      {(activeContent.content_type === 'carrusel' || activeContent.content_type === 'post_simple') && (
                        <button
                          onClick={exportAllSlides}
                          className="px-3.5 py-1.5 rounded-lg bg-gradient-to-r from-orange-500 to-amber-500 text-white shadow text-xs font-semibold flex items-center gap-1.5"
                        >
                          <Download size={13} />
                          <span>
                            {activeContent.content_type === 'carrusel' ? 'Exportar Carrusel' : 'Exportar Post'}
                          </span>
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Panel de edición por slide / escena */}
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
                    
                    {/* Lista y Formularios del Slide Seleccionado */}
                    <div className="space-y-5">
                      
                      {/* Grid de miniaturas para navegar */}
                      <div className="space-y-1.5">
                        <label className="block text-[10px] text-neutral-500 font-bold uppercase tracking-wider">Páginas de la publicación</label>
                        <div className="flex flex-wrap gap-2">
                          {activeContent.slides_json.map((slide: any, idx: number) => (
                            <button
                              key={idx}
                              onClick={() => setActiveSlideIndex(idx)}
                              className={`w-10 h-10 rounded-lg font-bold text-xs border transition-all ${
                                activeSlideIndex === idx
                                  ? 'bg-orange-600 border-orange-500 text-white scale-110 shadow'
                                  : 'bg-neutral-900/50 border-neutral-800 text-neutral-400 hover:border-neutral-700'
                              }`}
                            >
                              {idx + 1}
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* Caja de edición */}
                      <div className="bg-neutral-900/40 border border-neutral-800/80 rounded-2xl p-5 space-y-4">
                        <h4 className="font-semibold text-sm text-neutral-200 border-b border-neutral-800 pb-2 flex justify-between">
                          <span>Editar Slide {activeSlideIndex + 1}</span>
                          <span className="text-[10px] text-neutral-500 uppercase tracking-widest font-mono">
                            {activeContent.slides_json[activeSlideIndex]?.role || 'Slide'}
                          </span>
                        </h4>

                        {/* Título de Slide */}
                        <div>
                          <label className="block text-[10px] text-neutral-500 font-bold uppercase tracking-wider mb-1">Título principal</label>
                          <textarea
                            value={
                              activeContent.content_type === 'carrusel'
                                ? activeContent.slides_json[activeSlideIndex]?.title || ''
                                : activeContent.slides_json[activeSlideIndex]?.textOnScreen || ''
                            }
                            onChange={(e) => handleUpdateSlideField('title', e.target.value)}
                            rows={3}
                            className="w-full bg-neutral-950/60 border border-neutral-800 text-neutral-200 text-xs px-3 py-2.5 rounded-xl focus:outline-none focus:border-orange-600 resize-none transition-colors"
                          />
                        </div>

                        {/* Subtítulo o locución */}
                        <div>
                          <label className="block text-[10px] text-neutral-500 font-bold uppercase tracking-wider mb-1">
                            {activeContent.content_type === 'carrusel' ? 'Subtítulo / Texto secundario' : 'Locución (Voz en off)'}
                          </label>
                          <textarea
                            value={
                              activeContent.content_type === 'carrusel'
                                ? activeContent.slides_json[activeSlideIndex]?.subtitle || ''
                                : activeContent.slides_json[activeSlideIndex]?.voiceOver || ''
                            }
                            onChange={(e) => handleUpdateSlideField('subtitle', e.target.value)}
                            rows={2}
                            className="w-full bg-neutral-950/60 border border-neutral-800 text-neutral-200 text-xs px-3 py-2.5 rounded-xl focus:outline-none focus:border-orange-600 resize-none transition-colors"
                          />
                        </div>

                        {/* Layout y Sugerencia visual */}
                        {activeContent.content_type === 'carrusel' && (
                          <div>
                            <label className="block text-[10px] text-neutral-500 font-bold uppercase tracking-wider mb-1.5">Estilo / Layout</label>
                            <div className="grid grid-cols-3 gap-2">
                              {(['left', 'center', 'highlight'] as const).map(style => (
                                <button
                                  key={style}
                                  type="button"
                                  onClick={() => handleUpdateSlideField('layoutStyle', style)}
                                  className={`py-1.5 px-2 text-[10px] font-bold rounded-lg border capitalize transition-all ${
                                    activeContent.slides_json[activeSlideIndex]?.layoutStyle === style
                                      ? 'bg-orange-950/20 border-orange-500/70 text-orange-400'
                                      : 'bg-neutral-950/30 border-neutral-800 text-neutral-500 hover:border-neutral-700'
                                  }`}
                                >
                                  {style === 'left' ? 'Alineado Izq.' : style === 'center' ? 'Centrado' : 'Destacado'}
                                </button>
                              ))}
                            </div>
                          </div>
                        )}

                        {activeContent.slides_json[activeSlideIndex]?.visualSuggestion && (
                          <div className="p-3 rounded-xl bg-neutral-950/40 border border-neutral-800/60">
                            <span className="block text-[9px] text-neutral-500 font-bold uppercase tracking-wider mb-1">💡 Sugerencia visual</span>
                            <span className="text-[11px] text-neutral-400 italic leading-relaxed">
                              {activeContent.slides_json[activeSlideIndex]?.visualSuggestion}
                            </span>
                          </div>
                        )}
                      </div>

                      {/* Botones rápidos de IA (Acciones) */}
                      <div className="space-y-2">
                        <label className="block text-[10px] text-neutral-500 font-bold uppercase tracking-wider">✨ Asistente IA para este slide</label>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                          <button
                            onClick={() => handleAISmallAction('vendedor')}
                            className="py-2 px-2 rounded-lg bg-neutral-900 border border-neutral-800 text-[11px] text-neutral-300 hover:text-white font-medium hover:border-orange-500/30 transition-all text-center"
                          >
                            Hacer Vendedor
                          </button>
                          <button
                            onClick={() => handleAISmallAction('corto')}
                            className="py-2 px-2 rounded-lg bg-neutral-900 border border-neutral-800 text-[11px] text-neutral-300 hover:text-white font-medium hover:border-orange-500/30 transition-all text-center"
                          >
                            Hacer más Corto
                          </button>
                          <button
                            onClick={() => handleAISmallAction('divertido')}
                            className="py-2 px-2 rounded-lg bg-neutral-900 border border-neutral-800 text-[11px] text-neutral-300 hover:text-white font-medium hover:border-orange-500/30 transition-all text-center"
                          >
                            Hacer Divertido
                          </button>
                          <button
                            onClick={() => handleAISmallAction('urgencia')}
                            className="py-2 px-2 rounded-lg bg-neutral-900 border border-neutral-800 text-[11px] text-neutral-300 hover:text-white font-medium hover:border-orange-500/30 transition-all text-center"
                          >
                            Agregar Urgencia
                          </button>
                        </div>
                      </div>

                      {/* Copy y Hashtags */}
                      <div className="bg-neutral-900/40 border border-neutral-800/80 rounded-2xl p-5 space-y-3">
                        <h4 className="font-semibold text-xs text-neutral-300 border-b border-neutral-800 pb-2 flex items-center gap-1">
                          <Share2 size={13} className="text-orange-500" /> Copy e Identificadores (Cuerpo del Post)
                        </h4>
                        
                        <div>
                          <textarea
                            value={activeContent.caption}
                            onChange={(e) => setActiveContent({ ...activeContent, caption: e.target.value })}
                            rows={4}
                            className="w-full bg-neutral-950/60 border border-neutral-800 text-neutral-200 text-xs px-3 py-2 rounded-lg focus:outline-none focus:border-orange-600 resize-none transition-colors"
                          />
                        </div>

                        <div className="flex flex-wrap gap-1.5">
                          {activeContent.hashtags_json?.map((tag, i) => (
                            <span key={i} className="text-[10px] px-2 py-0.5 rounded bg-neutral-950 border border-neutral-800 text-neutral-400 font-mono">
                              {tag}
                            </span>
                          ))}
                        </div>
                      </div>

                    </div>

                    {/* VISTA PREVIA (MOCKUP CELULAR) */}
                    <div className="flex flex-col items-center justify-center p-4 bg-neutral-900/10 border border-neutral-800/40 rounded-2xl min-h-[500px]">
                      <span className="block text-[10px] text-neutral-500 font-bold uppercase tracking-wider mb-4">Vista Previa Móvil (Instagram)</span>
                      
                      {/* Celular Mockup Frame */}
                      <div className="w-[300px] h-[550px] rounded-[40px] border-4 border-neutral-800 bg-[#0d0d0f] shadow-2xl relative flex flex-col overflow-hidden">
                        {/* Notch */}
                        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-32 h-6 bg-neutral-800 rounded-b-2xl z-40" />

                        {/* Top bar info */}
                        <div className="px-5 pt-7 pb-2 flex justify-between items-center text-[10px] text-neutral-400 z-30 shrink-0">
                          <span className="font-semibold">9:41</span>
                          <div className="flex gap-1.5">
                            <span className="w-3 h-2.5 bg-neutral-400 rounded-sm" />
                            <span className="w-2 h-2.5 bg-neutral-400 rounded-sm" />
                          </div>
                        </div>

                        {/* Red Social Top Bar */}
                        <div className="px-4 py-2 border-b border-neutral-900 bg-neutral-900/60 flex items-center gap-2 z-30 shrink-0 select-none">
                          <div className="w-7 h-7 rounded-full bg-neutral-700 border border-neutral-600 flex items-center justify-center text-[10px] font-bold text-white uppercase">
                            {brandProfile.business_name?.charAt(0) || 'M'}
                          </div>
                          <div>
                            <span className="text-[10.5px] font-bold text-white block">{brandProfile.business_name || 'Mi Negocio'}</span>
                            <span className="text-[8px] text-neutral-500">Patrocinado</span>
                          </div>
                        </div>

                        {/* Slide Render Container */}
                        <div 
                          className="flex-1 relative flex flex-col p-6 justify-between select-none transition-all duration-300"
                          style={{ 
                            backgroundColor: brandProfile.background_color || '#121214',
                            fontFamily: brandProfile.font_family || 'sans-serif'
                          }}
                        >
                          {/* Top Brand Name */}
                          <div className="flex items-center gap-1.5">
                            <div className="w-1.5 h-6 bg-orange-600" style={{ backgroundColor: brandProfile.primary_color }} />
                            <span className="text-[11px] font-black uppercase text-white tracking-widest">
                              {brandProfile.business_name || 'MI NEGOCIO'}
                            </span>
                          </div>

                          {/* Content Text Body */}
                          <div className={`space-y-3 my-auto ${
                            activeContent.slides_json[activeSlideIndex]?.layoutStyle === 'center' ? 'text-center' : 'text-left'
                          }`}>
                            <h2 
                              className="text-lg font-black leading-tight text-white transition-all duration-300"
                              style={{ 
                                color: (activeContent.slides_json[activeSlideIndex]?.layoutStyle === 'highlight' || activeContent.slides_json[activeSlideIndex]?.role === 'offer')
                                  ? (brandProfile.secondary_color || '#fbbf24') 
                                  : '#ffffff'
                              }}
                            >
                              {activeContent.content_type === 'carrusel' 
                                ? activeContent.slides_json[activeSlideIndex]?.title 
                                : activeContent.slides_json[activeSlideIndex]?.textOnScreen}
                            </h2>
                            <p className="text-[11px] leading-relaxed text-neutral-400 transition-all duration-300">
                              {activeContent.content_type === 'carrusel' 
                                ? activeContent.slides_json[activeSlideIndex]?.subtitle 
                                : activeContent.slides_json[activeSlideIndex]?.voiceOver}
                            </p>
                          </div>

                          {/* Footer with Contacts and Page dots */}
                          <div className="flex justify-between items-end border-t border-neutral-800/40 pt-4 shrink-0">
                            <div className="text-[8px] text-neutral-500 space-y-0.5">
                              {brandProfile.whatsapp && <p>💬 +{brandProfile.whatsapp}</p>}
                              {brandProfile.website && <p>🌐 {brandProfile.website}</p>}
                            </div>
                            
                            {/* Dots navigation */}
                            {activeContent.slides_json.length > 1 && (
                              <div className="flex gap-1">
                                {activeContent.slides_json.map((_: any, i: number) => (
                                  <span 
                                    key={i} 
                                    className={`w-1.5 h-1.5 rounded-full ${
                                      activeSlideIndex === i ? 'bg-orange-500' : 'bg-neutral-800'
                                    }`} 
                                    style={{ 
                                      backgroundColor: activeSlideIndex === i ? brandProfile.primary_color : '#333' 
                                    }}
                                  />
                                ))}
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Navigation Overlay Arrows on Phone */}
                        {activeContent.slides_json.length > 1 && (
                          <div className="absolute inset-y-0 left-0 right-0 flex items-center justify-between px-1 pointer-events-none z-30">
                            <button
                              type="button"
                              disabled={activeSlideIndex === 0}
                              onClick={() => setActiveSlideIndex(prev => Math.max(0, prev - 1))}
                              className="w-7 h-7 rounded-full bg-neutral-900/80 border border-neutral-800 flex items-center justify-center text-white pointer-events-auto disabled:opacity-20 disabled:cursor-not-allowed shadow"
                            >
                              <ChevronLeft size={14} />
                            </button>
                            <button
                              type="button"
                              disabled={activeSlideIndex === activeContent.slides_json.length - 1}
                              onClick={() => setActiveSlideIndex(prev => Math.min(activeContent.slides_json.length - 1, prev + 1))}
                              className="w-7 h-7 rounded-full bg-neutral-900/80 border border-neutral-800 flex items-center justify-center text-white pointer-events-auto disabled:opacity-20 disabled:cursor-not-allowed shadow"
                            >
                              <ChevronRight size={14} />
                            </button>
                          </div>
                        )}

                      </div>
                    </div>

                  </div>

                </div>
              </main>
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center p-8 text-center bg-neutral-950/10">
                <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-orange-500 to-amber-500 flex items-center justify-center shadow-xl shadow-orange-500/20 mb-6">
                  <Sparkles size={28} className="text-white" />
                </div>
                <h2 className="text-lg font-semibold text-white mb-2">Creá contenido con IA</h2>
                <p className="text-xs text-neutral-400 max-w-sm">
                  Completá los campos del formulario de la izquierda y hacé clic en Generar para ver la propuesta de slides y textos.
                </p>
              </div>
            )}

          </div>
        )}

        {/* SUBSECCIÓN 2: LISTA DE PUBLICACIONES GUARDADAS */}
        {subSection === 'mis_publicaciones' && (
          <main className="flex-1 p-6 overflow-y-auto custom-scrollbar">
            <h3 className="font-bold text-sm text-neutral-300 uppercase tracking-wider mb-6 flex items-center gap-1.5 border-b border-neutral-800 pb-3">
              <FileText size={15} className="text-orange-500" /> Historial de Contenidos Guardados ({savedContents.length})
            </h3>

            {loadingContents ? (
              <div className="flex flex-col items-center justify-center h-48 text-neutral-400 gap-2">
                <RefreshCw className="animate-spin text-orange-500" size={18} />
                <span className="text-xs">Cargando publicaciones...</span>
              </div>
            ) : savedContents.length === 0 ? (
              <div className="flex flex-col items-center justify-center p-8 text-center text-neutral-500 h-64 border border-dashed border-neutral-800 rounded-2xl">
                <FileText className="text-neutral-700 mb-2 animate-pulse" size={32} />
                <p className="text-xs">No hay publicaciones guardadas en este espacio todavía.</p>
                <button
                  onClick={() => setSubSection('crear')}
                  className="mt-4 px-4 py-2 bg-orange-600/10 hover:bg-orange-600/20 border border-orange-500/30 text-orange-400 rounded-lg text-xs font-semibold"
                >
                  Crear primer post
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {savedContents.map(post => (
                  <div
                    key={post.id}
                    className="bg-neutral-900/40 border border-neutral-800/80 hover:border-orange-500/40 p-4 rounded-xl flex flex-col justify-between transition-all duration-300 relative group"
                  >
                    <div>
                      <div className="flex justify-between items-start mb-2">
                        <span className="text-xs px-2 py-0.5 rounded bg-neutral-950/60 border border-neutral-800 text-orange-400 font-semibold uppercase">
                          {post.content_type}
                        </span>
                        <span className="text-[10px] text-neutral-500 font-mono">
                          {post.created_at ? new Date(post.created_at).toLocaleDateString() : 'Borrador'}
                        </span>
                      </div>
                      
                      <h4 className="font-bold text-sm text-neutral-200 mb-1 line-clamp-1">{post.title}</h4>
                      <p className="text-[11px] text-neutral-500 line-clamp-2 italic mb-4">{post.caption}</p>
                    </div>

                    <div className="flex gap-2 pt-2 border-t border-neutral-800/40">
                      <button
                        onClick={() => {
                          setActiveContent(post);
                          setSubSection('crear');
                        }}
                        className="flex-1 py-1.5 bg-neutral-950 hover:bg-neutral-800 text-neutral-300 hover:text-white rounded-lg text-xs font-semibold border border-neutral-800 text-center"
                      >
                        Editar Post
                      </button>
                      <button
                        onClick={() => deleteContentDraft(post.id!)}
                        className="p-1.5 rounded-lg bg-neutral-950 hover:bg-rose-950/20 text-neutral-500 hover:text-rose-400 border border-neutral-800 text-xs transition-all"
                        title="Eliminar"
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </main>
        )}

        {/* SUBSECCIÓN 3: CONFIGURACIÓN DE IDENTIDAD DE MARCA */}
        {subSection === 'marca' && (
          <main className="flex-1 p-6 md:p-8 overflow-y-auto custom-scrollbar flex justify-center">
            <div className="w-full max-w-xl space-y-6">
              
              <div className="border-b border-neutral-800 pb-4">
                <h3 className="font-bold text-sm text-neutral-300 uppercase tracking-wider flex items-center gap-1.5">
                  <Palette size={15} className="text-orange-500" /> Identidad Visual y Datos de Marca
                </h3>
                <p className="text-xs text-neutral-500 mt-1">Configurá estos valores para que la IA los cargue automáticamente en cada generación.</p>
              </div>

              {loadingBrand ? (
                <div className="flex flex-col items-center justify-center py-12 text-neutral-400 gap-2">
                  <RefreshCw className="animate-spin text-orange-500" size={18} />
                  <span className="text-xs">Cargando perfil de marca...</span>
                </div>
              ) : (
                <form onSubmit={saveBrandProfile} className="space-y-4 bg-neutral-900/30 border border-neutral-800/80 rounded-2xl p-6">
                  {/* Nombre negocio y rubro */}
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-[10px] text-neutral-500 font-bold uppercase tracking-wider mb-1">Nombre Comercial</label>
                      <input
                        type="text"
                        required
                        placeholder="Ej: PowerFit Gym"
                        value={brandProfile.business_name}
                        onChange={(e) => setBrandProfile({ ...brandProfile, business_name: e.target.value })}
                        className="w-full bg-neutral-950/60 border border-neutral-800 text-neutral-200 text-xs px-3 py-2.5 rounded-xl focus:outline-none focus:border-orange-600 transition-colors"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] text-neutral-500 font-bold uppercase tracking-wider mb-1">Rubro por Defecto</label>
                      <input
                        type="text"
                        placeholder="Ej: Gimnasio"
                        value={brandProfile.industry}
                        onChange={(e) => setBrandProfile({ ...brandProfile, industry: e.target.value })}
                        className="w-full bg-neutral-950/60 border border-neutral-800 text-neutral-200 text-xs px-3 py-2.5 rounded-xl focus:outline-none focus:border-orange-600 transition-colors"
                      />
                    </div>
                  </div>

                  {/* Colores de marca */}
                  <div className="grid grid-cols-3 gap-3">
                    <div>
                      <label className="block text-[10px] text-neutral-500 font-bold uppercase tracking-wider mb-1.5 flex items-center gap-1">
                        <span className="w-2.5 h-2.5 rounded border border-neutral-700" style={{ backgroundColor: brandProfile.primary_color }} />
                        Color Principal
                      </label>
                      <input
                        type="color"
                        value={brandProfile.primary_color}
                        onChange={(e) => setBrandProfile({ ...brandProfile, primary_color: e.target.value })}
                        className="w-full h-10 bg-neutral-950/60 border border-neutral-800 rounded-xl cursor-pointer p-1"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] text-neutral-500 font-bold uppercase tracking-wider mb-1.5 flex items-center gap-1">
                        <span className="w-2.5 h-2.5 rounded border border-neutral-700" style={{ backgroundColor: brandProfile.secondary_color }} />
                        Color Secundario
                      </label>
                      <input
                        type="color"
                        value={brandProfile.secondary_color}
                        onChange={(e) => setBrandProfile({ ...brandProfile, secondary_color: e.target.value })}
                        className="w-full h-10 bg-neutral-950/60 border border-neutral-800 rounded-xl cursor-pointer p-1"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] text-neutral-500 font-bold uppercase tracking-wider mb-1.5 flex items-center gap-1">
                        <span className="w-2.5 h-2.5 rounded border border-neutral-700" style={{ backgroundColor: brandProfile.background_color }} />
                        Fondo de Post
                      </label>
                      <input
                        type="color"
                        value={brandProfile.background_color}
                        onChange={(e) => setBrandProfile({ ...brandProfile, background_color: e.target.value })}
                        className="w-full h-10 bg-neutral-950/60 border border-neutral-800 rounded-xl cursor-pointer p-1"
                      />
                    </div>
                  </div>

                  {/* WhatsApp y Sitio Web */}
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-[10px] text-neutral-500 font-bold uppercase tracking-wider mb-1">WhatsApp (con código de país)</label>
                      <input
                        type="text"
                        placeholder="Ej: 5491162838106"
                        value={brandProfile.whatsapp}
                        onChange={(e) => setBrandProfile({ ...brandProfile, whatsapp: e.target.value.replace(/\D/g, '') })}
                        className="w-full bg-neutral-950/60 border border-neutral-800 text-neutral-200 text-xs px-3 py-2.5 rounded-xl focus:outline-none focus:border-orange-600 transition-colors"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] text-neutral-500 font-bold uppercase tracking-wider mb-1">Sitio Web</label>
                      <input
                        type="text"
                        placeholder="Ej: www.powerfitgym.com"
                        value={brandProfile.website}
                        onChange={(e) => setBrandProfile({ ...brandProfile, website: e.target.value })}
                        className="w-full bg-neutral-950/60 border border-neutral-800 text-neutral-200 text-xs px-3 py-2.5 rounded-xl focus:outline-none focus:border-orange-600 transition-colors"
                      />
                    </div>
                  </div>

                  {/* Logo de negocio */}
                  <div>
                    <label className="block text-[10px] text-neutral-500 font-bold uppercase tracking-wider mb-1">Enlace del Logotipo (Logo URL)</label>
                    <input
                      type="text"
                      placeholder="https://ejemplo.com/logo.png"
                      value={brandProfile.logo_url}
                      onChange={(e) => setBrandProfile({ ...brandProfile, logo_url: e.target.value })}
                      className="w-full bg-neutral-950/60 border border-neutral-800 text-neutral-200 text-xs px-3 py-2.5 rounded-xl focus:outline-none focus:border-orange-600 transition-colors"
                    />
                  </div>

                  {/* Tono predeterminado */}
                  <div>
                    <label className="block text-[10px] text-neutral-500 font-bold uppercase tracking-wider mb-1">Tono de Comunicación Preferido</label>
                    <select
                      value={brandProfile.default_tone}
                      onChange={(e) => setBrandProfile({ ...brandProfile, default_tone: e.target.value })}
                      className="w-full bg-neutral-950/60 border border-neutral-800 text-neutral-200 text-xs px-3 py-2.5 rounded-xl focus:outline-none focus:border-orange-600"
                    >
                      <option>Motivador</option>
                      <option>Profesional</option>
                      <option>Divertido</option>
                      <option>Urgente</option>
                      <option>Premium</option>
                    </select>
                  </div>

                  <button
                    type="submit"
                    disabled={savingBrand || !brandProfile.business_name}
                    className="w-full py-2.5 bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-400 hover:to-amber-400 text-white rounded-xl text-xs font-semibold shadow-md shadow-orange-500/10 hover:shadow-orange-500/20 transition-all flex items-center justify-center gap-1.5 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <Save size={13} />
                    {savingBrand ? 'Guardando...' : 'Guardar Datos de Marca'}
                  </button>
                </form>
              )}

            </div>
          </main>
        )}

        {/* SUBSECCIÓN 4: CATÁLOGO DE PLANTILLAS */}
        {subSection === 'plantillas' && (
          <main className="flex-1 p-6 overflow-y-auto custom-scrollbar">
            <h3 className="font-bold text-sm text-neutral-300 uppercase tracking-wider mb-6 flex items-center gap-1.5 border-b border-neutral-800 pb-3">
              <LayoutGrid size={15} className="text-orange-500" /> Catálogo de Ideas y Plantillas Predefinidas
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              
              {/* Gym */}
              <div className="bg-neutral-900/40 border border-neutral-800/80 p-5 rounded-2xl flex flex-col justify-between">
                <div>
                  <h4 className="font-bold text-base text-white mb-1.5">Gimnasios y Box Fitness</h4>
                  <p className="text-[11.5px] text-neutral-500 leading-normal mb-4">Campañas de inscripción con oferta del 20% de matrícula bonificada, rutinas semanales o testimonios motivacionales de alumnos.</p>
                </div>
                <button
                  onClick={() => {
                    setFormData({
                      ...formData,
                      title: "Campaña Fitness — Inscripción",
                      industry: "Gimnasio",
                      goal: "Conseguir leads",
                      offer: "Matrícula de inscripción 20% OFF esta semana.",
                      benefits: "Entrenamientos personalizados, clases de Crossfit, seguimiento continuo.",
                      contentType: "carrusel"
                    });
                    setSubSection('crear');
                  }}
                  className="w-full py-2 bg-neutral-950 hover:bg-neutral-800 border border-neutral-800 rounded-xl text-xs font-semibold text-orange-400 hover:text-orange-300 transition-colors"
                >
                  Usar Plantilla
                </button>
              </div>

              {/* Peluquería */}
              <div className="bg-neutral-900/40 border border-neutral-800/80 p-5 rounded-2xl flex flex-col justify-between">
                <div>
                  <h4 className="font-bold text-base text-white mb-1.5">Peluquerías y Barberías</h4>
                  <p className="text-[11.5px] text-neutral-500 leading-normal mb-4">Placas elegantes de turnos disponibles de la semana, promociones especiales corte + barba en días de baja demanda, o tips de cuidado.</p>
                </div>
                <button
                  onClick={() => {
                    setFormData({
                      ...formData,
                      title: "Promo Semanal Peluquería",
                      industry: "Peluquería / Barbería",
                      goal: "Promocionar oferta",
                      offer: "Combo Corte + Afeitado con 15% OFF de Lunes a Miércoles.",
                      benefits: "Atención premium, café de cortesía, estilistas certificados.",
                      contentType: "carrusel"
                    });
                    setSubSection('crear');
                  }}
                  className="w-full py-2 bg-neutral-950 hover:bg-neutral-800 border border-neutral-800 rounded-xl text-xs font-semibold text-orange-400 hover:text-orange-300 transition-colors"
                >
                  Usar Plantilla
                </button>
              </div>

              {/* Inmobiliaria */}
              <div className="bg-neutral-900/40 border border-neutral-800/80 p-5 rounded-2xl flex flex-col justify-between">
                <div>
                  <h4 className="font-bold text-base text-white mb-1.5">Inmobiliarias y Propiedades</h4>
                  <p className="text-[11.5px] text-neutral-500 leading-normal mb-4">Destacar propiedades premium en venta o pozo, guías de requisitos de alquiler, o tours visuales recomendados.</p>
                </div>
                <button
                  onClick={() => {
                    setFormData({
                      ...formData,
                      title: "Oportunidad Pozo Inmobiliaria",
                      industry: "Inmobiliaria",
                      goal: "Conseguir leads",
                      offer: "Financiación en pesos hasta 24 cuotas sin interés.",
                      benefits: "Ubicación céntrica, terminaciones premium, cochera incluida.",
                      contentType: "carrusel"
                    });
                    setSubSection('crear');
                  }}
                  className="w-full py-2 bg-neutral-950 hover:bg-neutral-800 border border-neutral-800 rounded-xl text-xs font-semibold text-orange-400 hover:text-orange-300 transition-colors"
                >
                  Usar Plantilla
                </button>
              </div>

              {/* Taller mecánico */}
              <div className="bg-neutral-900/40 border border-neutral-800/80 p-5 rounded-2xl flex flex-col justify-between">
                <div>
                  <h4 className="font-bold text-base text-white mb-1.5">Talleres Mecánicos y Motores</h4>
                  <p className="text-[11.5px] text-neutral-500 leading-normal mb-4">Promociones semanales en cambio de aceite, checklist completo para viajes antes de vacaciones, o advertencias de mantenimiento preventivo.</p>
                </div>
                <button
                  onClick={() => {
                    setFormData({
                      ...formData,
                      title: "Checklist de Vacaciones",
                      industry: "Taller Mecánico",
                      goal: "Promocionar oferta",
                      offer: "Alineación y balanceo bonificados con tu cambio de aceite.",
                      benefits: "Garantía de reparación, diagnóstico computarizado, repuestos originales.",
                      contentType: "carrusel"
                    });
                    setSubSection('crear');
                  }}
                  className="w-full py-2 bg-neutral-950 hover:bg-neutral-800 border border-neutral-800 rounded-xl text-xs font-semibold text-orange-400 hover:text-orange-300 transition-colors"
                >
                  Usar Plantilla
                </button>
              </div>

            </div>
          </main>
        )}

      </div>

    </div>
  );
}
