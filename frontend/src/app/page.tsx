"use client";

import React, { useState, useEffect, useRef } from "react";
import { 
  Search, Send, MessageSquare, Phone, User, Users, Clock, 
  Check, CheckCheck, Circle, Zap, RefreshCw, Layers, ShieldAlert,
  Calendar, AlertCircle, FileText, Settings, Plus, Tag, LogOut, Lock, Mail, Database,
  BarChart3, HelpCircle, Activity, ChevronRight, ArrowUpRight, ArrowDownLeft
} from "lucide-react";
import { socket } from "@/lib/socket";
import { supabase } from "@/lib/supabase";

// Interfaces de datos
interface PipelineStage {
  id: string;
  name: string;
}

interface Lead {
  id: string;
  name: string;
  phone: string;
  source?: string;
  stage_id: string;
  created_at: string;
  pipeline_stages?: PipelineStage;
}

interface Conversation {
  id: string;
  status: 'open' | 'closed';
  last_message_at: string;
  assigned_agent_id?: string | null;
  leads?: Lead;
}

interface Message {
  id: string;
  conversation_id: string;
  direction: 'incoming' | 'outgoing';
  content: string;
  sender_id?: string | null;
  external_id?: string | null;
  status: 'sent' | 'delivered' | 'read';
  created_at: string;
}


type TabType = 'chats' | 'leads' | 'dashboard' | 'settings';
type SearchType = 'contacts' | 'messages';

const STAGES = [
  { id: "stage-1", name: "Nuevo", color: "border-blue-500/20 text-blue-400 bg-blue-500/5 hover:bg-blue-500/10" },
  { id: "stage-2", name: "Contactado", color: "border-amber-500/20 text-amber-400 bg-amber-500/5 hover:bg-amber-500/10" },
  { id: "stage-3", name: "En Negociación", color: "border-orange-500/20 text-orange-400 bg-orange-500/5 hover:bg-orange-500/10" },
  { id: "stage-4", name: "Ganado", color: "border-emerald-500/20 text-emerald-400 bg-emerald-500/5 hover:bg-emerald-500/10" },
  { id: "stage-5", name: "Perdido", color: "border-rose-500/20 text-rose-400 bg-rose-500/5 hover:bg-rose-500/10" }
];

interface QuickReply {
  id: string;
  name: string;
  content: string;
}

const QUICK_REPLIES: QuickReply[] = [
  {
    id: "qr-1",
    name: "👋 Saludo inicial",
    content: "¡Hola! Gracias por contactarte con Automata. ¿En qué podemos ayudarte hoy?"
  },
  {
    id: "qr-2",
    name: "💰 Precios de Servicios",
    content: "Nuestros planes de automatización a medida comienzan desde USD 300/mes. ¿Te gustaría agendar una llamada de 15 minutos para relevar tu caso?"
  },
  {
    id: "qr-3",
    name: "📅 Agendar Reunión",
    content: "Te comparto nuestro link de Calendly para coordinar una llamada cuando te quede cómodo: https://calendly.com/automata"
  },
  {
    id: "qr-4",
    name: "👋 Despedida",
    content: "¡Quedamos a tu disposición! Cualquier consulta nos escribís por acá. ¡Que tengas un excelente día!"
  }
];

export default function CRMWorkspace() {
  // --- AUTENTICACIÓN ---
  const [session, setSession] = useState<any>(null);
  const [userProfile, setUserProfile] = useState<any>(null);
  const [loadingAuth, setLoadingAuth] = useState<boolean>(true);
  const [isSignUp, setIsSignUp] = useState<boolean>(false);
  const [authError, setAuthError] = useState<string | null>(null);
  
  const [emailInput, setEmailInput] = useState("");
  const [passwordInput, setPasswordInput] = useState("");
  const [nameInput, setNameInput] = useState("");
  const [roleInput, setRoleInput] = useState<"owner" | "agent">("agent");
  const [workspaceNameInput, setWorkspaceNameInput] = useState("Automata");
  
  // Custom quick login for Alejo and Nico
  const [selectedAgent, setSelectedAgent] = useState<'alejo' | 'nico' | 'other'>('alejo');

  // --- NAVEGACIÓN ---
  const [activeTab, setActiveTab] = useState<TabType>('chats');

  // Sockets e Inbox
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedConvoId, setSelectedConvoId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [messageInput, setMessageInput] = useState<string>("");
  const [searchTerm, setSearchTerm] = useState<string>("");
  const [typingAgent, setTypingAgent] = useState<string | null>(null);

  // Búsqueda Avanzada de Mensajes (Fase 4)
  const [searchType, setSearchType] = useState<SearchType>('contacts');
  const [messageSearchResults, setMessageSearchResults] = useState<any[]>([]);
  const [searchingMessages, setSearchingMessages] = useState<boolean>(false);

  // Pipeline Kanban
  const [leads, setLeads] = useState<Lead[]>([]);
  const [selectedLeadId, setSelectedLeadId] = useState<string | null>(null);
  const [leadSearchTerm, setLeadSearchTerm] = useState<string>("");
  const [showLeadDetails, setShowLeadDetails] = useState<boolean>(false);
  
  // Modales
  const [showAddLeadModal, setShowAddLeadModal] = useState<boolean>(false);
  const [newLeadForm, setNewLeadForm] = useState({ name: "", phone: "", source: "Manual", stageId: "stage-1" });
  
  // Métricas (Fase 4)
  const [dashboardStats, setDashboardStats] = useState<any>({
    leadsCount: 0,
    leadsByStage: { 'stage-1': 0, 'stage-2': 0, 'stage-3': 0, 'stage-4': 0, 'stage-5': 0 },
    conversations: { total: 0, open: 0, closed: 0 },
    messages: { total: 0, incoming: 0, outgoing: 0 }
  });
  const [loadingStats, setLoadingStats] = useState<boolean>(false);

  const [backendStatus, setBackendStatus] = useState<'online' | 'offline' | 'checking'>('checking');
  const [socketConnected, setSocketConnected] = useState<boolean>(false);
  const [loadingData, setLoadingData] = useState<boolean>(false);
  const [syncing, setSyncing] = useState<boolean>(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [showQuickReplies, setShowQuickReplies] = useState<boolean>(false);
  const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:3001";

  // Escuchar sesión
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      if (session) {
        fetchUserProfile(session.user.id);
      } else {
        setLoadingAuth(false);
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      if (session) {
        fetchUserProfile(session.user.id);
      } else {
        setUserProfile(null);
        setLoadingAuth(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  // Obtener Perfil
  const fetchUserProfile = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('users')
        .select('id, email, name, role, workspace_id')
        .eq('id', userId)
        .single();

      if (error) throw error;
      setUserProfile(data);
    } catch (e) {
      console.error("Error al obtener perfil público:", e);
    } finally {
      setLoadingAuth(false);
    }
  };

  // Comprobar salud backend
  useEffect(() => {
    async function checkBackend() {
      try {
        const res = await fetch(`${BACKEND_URL}/health`, { signal: AbortSignal.timeout(3000) });
        if (res.ok) {
          setBackendStatus('online');
        } else {
          setBackendStatus('offline');
        }
      } catch (e) {
        setBackendStatus('offline');
      }
    }
    checkBackend();
  }, [BACKEND_URL]);

  // Cargar datos principales
  useEffect(() => {
    if (session) {
      fetchConversations();
      fetchLeads();
    }
  }, [session]);

  // Cargar estadísticas si se entra a la pestaña Dashboard
  useEffect(() => {
    if (activeTab === 'dashboard') {
      fetchDashboardStats();
    }
  }, [activeTab, leads, conversations, messages]);

  // Búsqueda de mensajes (Fase 4)
  useEffect(() => {
    const delayDebounce = setTimeout(() => {
      if (searchType === 'messages' && searchTerm.trim() !== "") {
        searchMessages(searchTerm.trim());
      } else {
        setMessageSearchResults([]);
      }
    }, 400);

    return () => clearTimeout(delayDebounce);
  }, [searchTerm, searchType]);

  const getHeaders = () => {
    return {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${session?.access_token || ""}`
    };
  };

  // Sockets setup
  useEffect(() => {
    socket.connect();
    
    socket.on('connect', () => setSocketConnected(true));
    socket.on('disconnect', () => setSocketConnected(false));

    socket.on('message:received', (data: { message: Message; conversationId: string }) => {
      if (selectedConvoId === data.conversationId) {
        setMessages(prev => {
          if (prev.some(m => m.id === data.message.id || (m.external_id && m.external_id === data.message.external_id))) {
            return prev;
          }
          return [...prev, data.message];
        });
      }
      fetchConversations();
      fetchLeads();
    });

    // Mensaje saliente enviado por CUALQUIER agente del workspace: que aparezca
    // en vivo tanto para quien lo escribió como para el otro agente.
    socket.on('message:sent', (data: { message: Message; conversationId: string }) => {
      if (selectedConvoId === data.conversationId) {
        setMessages(prev => {
          if (prev.some(m => m.id === data.message.id)) return prev;
          return [...prev, data.message];
        });
      }
      fetchConversations();
    });

    // El mismo mensaje saliente, ya con su external_id real de WhatsApp.
    socket.on('message:updated', (data: { message: Message; conversationId: string }) => {
      if (selectedConvoId === data.conversationId) {
        setMessages(prev => prev.map(m => m.id === data.message.id ? data.message : m));
      }
    });

    socket.on('message:status_updated', (data: { messageId: string; conversationId: string; status: 'sent' | 'delivered' | 'read' }) => {
      if (selectedConvoId === data.conversationId) {
        setMessages(prev => prev.map(m => m.id === data.messageId ? { ...m, status: data.status } : m));
      }
    });

    socket.on('agent:typing_status', (data: { conversationId: string; agentName: string; isTyping: boolean }) => {
      if (selectedConvoId === data.conversationId) {
        setTypingAgent(data.isTyping ? data.agentName : null);
      }
    });

    socket.on('conversation:assigned', (data: { conversationId: string; assignedAgentId: string }) => {
      setConversations(prev => prev.map(c => 
        c.id === data.conversationId ? { ...c, assigned_agent_id: data.assignedAgentId } : c
      ));
    });

    return () => {
      socket.off('connect');
      socket.off('disconnect');
      socket.off('message:received');
      socket.off('message:sent');
      socket.off('message:updated');
      socket.off('message:status_updated');
      socket.off('agent:typing_status');
      socket.off('conversation:assigned');
    };
  }, [selectedConvoId]);

  useEffect(() => {
    if (!selectedConvoId) return;

    socket.emit('conversation:join', selectedConvoId);
    fetchMessages(selectedConvoId);

    return () => {
      socket.emit('conversation:leave', selectedConvoId);
      setTypingAgent(null);
    };
  }, [selectedConvoId]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, typingAgent]);

  useEffect(() => {
    setMessageInput("");
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
    }
  }, [selectedConvoId]);

  // Cargar datos
  const fetchConversations = async () => {
    setLoadingData(true);
    try {
      const res = await fetch(`${BACKEND_URL}/api/conversations`, { headers: getHeaders() });
      if (res.ok) {
        const data = await res.json();
        setConversations(data);
      }
    } catch (e) {
      console.error("Error cargando chats:", e);
    } finally {
      setLoadingData(false);
    }
  };

  // Importar los chats existentes de WhatsApp (Evolution) hacia el CRM
  const handleSyncChats = async () => {
    if (syncing) return;
    setSyncing(true);
    try {
      const res = await fetch(`${BACKEND_URL}/api/conversations/sync`, {
        method: 'POST',
        headers: getHeaders()
      });
      if (res.ok) {
        const data = await res.json();
        await fetchConversations();
        await fetchLeads();
        alert(`Sincronización lista: ${data.synced} chats importados (${data.skipped} grupos omitidos).`);
      } else {
        alert('No se pudo sincronizar. Revisá la conexión con Evolution API.');
      }
    } catch (e) {
      console.error("Error sincronizando chats:", e);
      alert('Error al sincronizar los chats.');
    } finally {
      setSyncing(false);
    }
  };

  const fetchLeads = async () => {
    try {
      const res = await fetch(`${BACKEND_URL}/api/leads`, { headers: getHeaders() });
      if (res.ok) {
        const data = await res.json();
        setLeads(data);
      }
    } catch (e) {
      console.error("Error cargando leads:", e);
    }
  };

  const fetchMessages = async (convoId: string) => {
    try {
      const res = await fetch(`${BACKEND_URL}/api/conversations/${convoId}/messages`, { headers: getHeaders() });
      if (res.ok) {
        const data = await res.json();
        setMessages(data);
      }
    } catch (e) {
      console.error("Error cargando mensajes:", e);
    }
  };

  // Cargar estadísticas
  const fetchDashboardStats = async () => {
    setLoadingStats(true);
    try {
      const res = await fetch(`${BACKEND_URL}/api/dashboard/stats`, { headers: getHeaders() });
      if (res.ok) {
        const data = await res.json();
        setDashboardStats(data);
      }
    } catch (err) {
      console.error("Error cargando estadísticas:", err);
    } finally {
      setLoadingStats(false);
    }
  };

  // Buscar mensajes (Fase 4)
  const searchMessages = async (query: string) => {
    setSearchingMessages(true);
    try {
      const res = await fetch(`${BACKEND_URL}/api/messages/search?query=${encodeURIComponent(query)}`, {
        headers: getHeaders()
      });
      if (res.ok) {
        const data = await res.json();
        setMessageSearchResults(data);
      }
    } catch (err) {
      console.error("Error buscando mensajes:", err);
    } finally {
      setSearchingMessages(false);
    }
  };

  const handleTypingSignal = (text: string) => {
    setMessageInput(text);
    if (!selectedConvoId) return;

    socket.emit('agent:typing', {
      conversationId: selectedConvoId,
      agentName: userProfile?.name || "Agente",
      isTyping: text.length > 0
    });

    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
    }
  };

  // Enviar mensaje
  const handleSendMessage = async (e?: React.FormEvent | React.KeyboardEvent) => {
    if (e) e.preventDefault();
    if (!messageInput.trim() || !selectedConvoId) return;

    const content = messageInput.trim();
    setMessageInput("");

    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
    }

    const currentAgentName = userProfile?.name || "Agente";

    socket.emit('agent:typing', {
      conversationId: selectedConvoId,
      agentName: currentAgentName,
      isTyping: false
    });

    try {
      await fetch(`${BACKEND_URL}/api/messages/send`, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify({
          conversationId: selectedConvoId,
          content
        })
      });
    } catch (err) {
      console.error("Error enviando mensaje:", err);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage(e);
    }
  };

  const handleSelectQuickReply = (content: string) => {
    handleTypingSignal(content);
    setTimeout(() => {
      if (textareaRef.current) {
        textareaRef.current.focus();
        textareaRef.current.selectionStart = content.length;
        textareaRef.current.selectionEnd = content.length;
      }
    }, 10);
  };

  // Drag and Drop
  const handleDragStart = (e: React.DragEvent, leadId: string) => {
    e.dataTransfer.setData("text/plain", leadId);
    e.dataTransfer.effectAllowed = "move";
  };

  const handleDrop = async (e: React.DragEvent, stageId: string) => {
    e.preventDefault();
    const leadId = e.dataTransfer.getData("text/plain");
    if (!leadId) return;

    try {
      const res = await fetch(`${BACKEND_URL}/api/leads/${leadId}/stage`, {
        method: 'PUT',
        headers: getHeaders(),
        body: JSON.stringify({ stageId })
      });
      if (res.ok) {
        fetchLeads();
        fetchConversations();
      }
    } catch (err) {
      console.error("Error moviendo lead:", err);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  // Crear lead
  const handleCreateLead = async (e: React.FormEvent) => {
    e.preventDefault();
    const { name, phone, source, stageId } = newLeadForm;
    if (!name || !phone) return;

    const cleanPhone = phone.replace(/[^0-9]/g, '');

    try {
      const res = await fetch(`${BACKEND_URL}/api/leads`, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify({ name, phone: cleanPhone, source, stageId })
      });
      if (res.ok) {
        const data = await res.json();
        fetchLeads();
        await fetchConversations();

        setNewLeadForm({ name: "", phone: "", source: "Manual", stageId: "stage-1" });
        setShowAddLeadModal(false);

        setSelectedConvoId(data.conversationId);
        setActiveTab('chats');
      }
    } catch (err) {
      console.error("Error creando lead:", err);
    }
  };

  const handleOpenChatFromLead = (leadId: string) => {
    const convo = conversations.find(c => c.leads && c.leads.id === leadId);
    if (convo) {
      setSelectedConvoId(convo.id);
      setActiveTab('chats');
      setShowLeadDetails(false);
    } else {
      alert("No se encontró conversación activa para este lead.");
    }
  };

  const handleManualAssign = async (agentId: string | null) => {
    if (!selectedConvoId) return;

    try {
      const res = await fetch(`${BACKEND_URL}/api/conversations/${selectedConvoId}/assign`, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify({ agentId })
      });
      if (res.ok) {
        fetchConversations();
      }
    } catch (err) {
      console.error("Error asignando conversación:", err);
    }
  };

  // Auth
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError(null);

    let loginEmail = emailInput;
    if (selectedAgent === 'alejo') {
      loginEmail = 'alejogautier@gmail.com';
    } else if (selectedAgent === 'nico') {
      loginEmail = 'nico@automata.com';
    }

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: loginEmail,
        password: passwordInput
      });
      if (error) throw error;
      setSession(data.session);
    } catch (err: any) {
      setAuthError(err.message || 'Error de inicio de sesión');
    }
  };


  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError(null);
    try {
      // El workspace y el perfil los crea el trigger handle_new_user() en la base
      // a partir de estos metadatos. Así no chocamos con RLS desde el cliente.
      const { data, error: signUpError } = await supabase.auth.signUp({
        email: emailInput,
        password: passwordInput,
        options: {
          data: {
            name: nameInput,
            role: roleInput,
            workspace_name: workspaceNameInput
          }
        }
      });

      if (signUpError) throw signUpError;

      if (data.session) {
        // Confirmación de email desactivada: entra directo
        setSession(data.session);
      } else {
        // Supabase requiere confirmar el email antes de iniciar sesión
        setIsSignUp(false);
        setAuthError(
          'Cuenta creada. Revisá tu email para confirmar el acceso, o desactivá ' +
          '"Confirm email" en Supabase (Authentication → Sign In / Providers) para entrar directo.'
        );
      }
    } catch (err: any) {
      setAuthError(err.message || 'Error durante el registro');
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
  };

  const formatTime = (isoString: string) => {
    if (!isoString) return "";
    const d = new Date(isoString);
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const getLeadById = (id: string | null) => leads.find(l => l.id === id);

  const selectedLead = selectedLeadId ? getLeadById(selectedLeadId) : null;
  const currentConvo = conversations.find(c => c.id === selectedConvoId);

  // Tema visual según el usuario logueado:
  // owner (Alejo)  → San Lorenzo (rojo y azul)
  // agent (Nico)   → Ferro Carril Oeste (verde clarito)
  const themeClass =
    userProfile?.role === 'owner' ? 'theme-sanlorenzo'
    : userProfile?.role === 'agent' ? 'theme-ferro'
    : '';

  // En el login el tema cambia EN VIVO según la tarjeta elegida:
  // Alejo → rojo y azul (San Lorenzo) · Nico → verde y negro
  const loginThemeClass =
    selectedAgent === 'nico' ? 'theme-ferro'
    : selectedAgent === 'alejo' ? 'theme-sanlorenzo'
    : '';

  // Pantalla de carga Auth
  if (loadingAuth) {
    return (
      <div className="flex h-screen w-screen bg-neutral-950 items-center justify-center text-neutral-100 gap-2">
        <RefreshCw className="animate-spin text-orange-500" />
        <span className="text-sm">Iniciando Automata CRM...</span>
      </div>
    );
  }

  // Login obligatorio: sin sesión real de Supabase no se accede a la app
  if (!session) {
    return (
      <div className={`${loginThemeClass} flex h-screen w-screen bg-neutral-950 items-center justify-center overflow-hidden font-sans relative`}>
        <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-orange-600/15 rounded-full blur-[140px] transition-colors duration-700" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[50%] bg-amber-500/10 rounded-full blur-[140px] transition-colors duration-700" />

        <div className="app-enter bg-neutral-900/40 border border-neutral-800/80 backdrop-blur-2xl p-8 rounded-3xl w-full max-w-md shadow-2xl relative z-10 mx-4">
          <div className="flex flex-col items-center mb-6">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-orange-500 to-amber-500 flex items-center justify-center font-bold text-white shadow-xl shadow-orange-500/25 mb-4">
              A
            </div>
            <h2 className="text-xl font-bold text-white tracking-wide">Automata CRM</h2>
            <p className="text-xs text-neutral-400 mt-1">Acceso seguro para agentes de la agencia</p>
          </div>

          {authError && (
            <div className="p-3 bg-rose-950/40 border border-rose-900/40 rounded-xl text-rose-400 text-xs flex items-center gap-2 mb-4">
              <AlertCircle size={14} className="shrink-0" />
              <span>{authError}</span>
            </div>
          )}

          <form onSubmit={isSignUp ? handleRegister : handleLogin} className="space-y-4">
            {isSignUp ? (
              <>
                <div>
                  <label className="block text-[10px] text-neutral-500 font-bold uppercase tracking-wider mb-1">Nombre Completo</label>
                  <div className="relative">
                    <User className="absolute left-3 top-2.5 text-neutral-500" size={16} />
                    <input
                      type="text"
                      required
                      placeholder="Ej: Alejo"
                      value={nameInput}
                      onChange={(e) => setNameInput(e.target.value)}
                      className="w-full bg-neutral-950/50 border border-neutral-800 text-neutral-200 placeholder-neutral-600 text-sm pl-10 pr-4 py-2 rounded-xl focus:outline-none focus:border-orange-600 transition-colors"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[10px] text-neutral-500 font-bold uppercase tracking-wider mb-1">Rol</label>
                    <select
                      value={roleInput}
                      onChange={(e) => setRoleInput(e.target.value as any)}
                      className="w-full bg-neutral-950/50 border border-neutral-800 text-neutral-200 text-sm px-3 py-2 rounded-xl focus:outline-none focus:border-orange-600"
                    >
                      <option value="owner">Dueño (Owner)</option>
                      <option value="agent">Colaborador (Agent)</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-[10px] text-neutral-500 font-bold uppercase tracking-wider mb-1">Workspace</label>
                    <input
                      type="text"
                      required
                      placeholder="Ej: Automata"
                      value={workspaceNameInput}
                      onChange={(e) => setWorkspaceNameInput(e.target.value)}
                      className="w-full bg-neutral-950/50 border border-neutral-800 text-neutral-200 text-sm px-3 py-2 rounded-xl focus:outline-none focus:border-orange-600"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] text-neutral-500 font-bold uppercase tracking-wider mb-1">Email Corporativo</label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-2.5 text-neutral-500" size={16} />
                    <input
                      type="email"
                      required
                      placeholder="nombre@automata.com"
                      value={emailInput}
                      onChange={(e) => setEmailInput(e.target.value)}
                      className="w-full bg-neutral-950/50 border border-neutral-800 text-neutral-200 placeholder-neutral-600 text-sm pl-10 pr-4 py-2 rounded-xl focus:outline-none focus:border-orange-600 transition-colors"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] text-neutral-500 font-bold uppercase tracking-wider mb-1">Contraseña</label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-2.5 text-neutral-500" size={16} />
                    <input
                      type="password"
                      required
                      placeholder="••••••••"
                      value={passwordInput}
                      onChange={(e) => setPasswordInput(e.target.value)}
                      className="w-full bg-neutral-950/50 border border-neutral-800 text-neutral-200 placeholder-neutral-600 text-sm pl-10 pr-4 py-2 rounded-xl focus:outline-none focus:border-orange-600 transition-colors"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  className="w-full py-2.5 bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-400 hover:to-amber-400 text-white rounded-xl text-xs font-semibold shadow-md shadow-orange-500/10 hover:shadow-orange-500/20 transition-all pt-2.5"
                >
                  Registrarse y Crear Cuenta
                </button>
              </>
            ) : selectedAgent !== 'other' ? (
              <>
                <div className="text-center mb-2">
                  <span className="text-[10px] text-neutral-500 font-bold uppercase tracking-wider block mb-3">¿Quién ingresa hoy?</span>
                </div>

                <div className="grid grid-cols-2 gap-4 mb-6">
                  {/* Card Alejo */}
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedAgent('alejo');
                      setAuthError(null);
                    }}
                    className={`flex flex-col items-center p-4 rounded-2xl border transition-all duration-300 relative overflow-hidden group ${
                      selectedAgent === 'alejo'
                        ? 'bg-orange-950/20 border-orange-500/80 shadow-[0_0_20px_rgba(139,92,246,0.15)] scale-[1.02]'
                        : 'bg-neutral-950/40 border-neutral-800/80 hover:border-neutral-700/80'
                    }`}
                  >
                    <div className={`w-14 h-14 rounded-full flex items-center justify-center font-bold text-lg mb-3 transition-transform duration-300 group-hover:scale-105 ${
                      selectedAgent === 'alejo'
                        ? 'bg-gradient-to-tr from-orange-500 to-amber-500 text-white shadow-lg shadow-orange-500/20'
                        : 'bg-neutral-800 text-neutral-400'
                    }`}>
                      A
                    </div>
                    <span className="text-xs font-bold text-white">Alejo</span>
                    <span className="text-[10px] text-orange-400 font-semibold mt-0.5">Dueño (Owner)</span>
                  </button>

                  {/* Card Nico */}
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedAgent('nico');
                      setAuthError(null);
                    }}
                    className={`flex flex-col items-center p-4 rounded-2xl border transition-all duration-300 relative overflow-hidden group ${
                      selectedAgent === 'nico'
                        ? 'bg-amber-950/20 border-amber-500/80 shadow-[0_0_20px_rgba(99,102,241,0.15)] scale-[1.02]'
                        : 'bg-neutral-950/40 border-neutral-800/80 hover:border-neutral-700/80'
                    }`}
                  >
                    <div className={`w-14 h-14 rounded-full flex items-center justify-center font-bold text-lg mb-3 transition-transform duration-300 group-hover:scale-105 ${
                      selectedAgent === 'nico'
                        ? 'bg-gradient-to-tr from-amber-600 to-amber-500 text-white shadow-lg shadow-amber-500/20'
                        : 'bg-neutral-800 text-neutral-400'
                    }`}>
                      N
                    </div>
                    <span className="text-xs font-bold text-white">Nico</span>
                    <span className="text-[10px] text-amber-400 font-semibold mt-0.5">Colaborador</span>
                  </button>
                </div>

                <div>
                  <label className="block text-[10px] text-neutral-500 font-bold uppercase tracking-wider mb-1">Contraseña</label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-2.5 text-neutral-500" size={16} />
                    <input
                      type="password"
                      required
                      placeholder="••••••••"
                      value={passwordInput}
                      onChange={(e) => setPasswordInput(e.target.value)}
                      className="w-full bg-neutral-950/50 border border-neutral-800 text-neutral-200 placeholder-neutral-600 text-sm pl-10 pr-4 py-2 rounded-xl focus:outline-none focus:border-orange-600 transition-colors"
                    />
                  </div>
                </div>

                <div className="space-y-2 pt-2">
                  <button
                    type="submit"
                    className="w-full py-2.5 bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-400 hover:to-amber-400 text-white rounded-xl text-xs font-semibold shadow-md shadow-orange-500/10 hover:shadow-orange-500/20 transition-all"
                  >
                    Iniciar Sesión
                  </button>
                </div>

                <div className="text-center pt-2">
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedAgent('other');
                      setAuthError(null);
                    }}
                    className="text-xs text-neutral-400 hover:text-neutral-200 underline font-medium"
                  >
                    Ingresar con otro correo
                  </button>
                </div>
              </>
            ) : (
              <>
                <div>
                  <label className="block text-[10px] text-neutral-500 font-bold uppercase tracking-wider mb-1">Email Corporativo</label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-2.5 text-neutral-500" size={16} />
                    <input
                      type="email"
                      required
                      placeholder="nombre@automata.com"
                      value={emailInput}
                      onChange={(e) => setEmailInput(e.target.value)}
                      className="w-full bg-neutral-950/50 border border-neutral-800 text-neutral-200 placeholder-neutral-600 text-sm pl-10 pr-4 py-2 rounded-xl focus:outline-none focus:border-orange-600 transition-colors"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] text-neutral-500 font-bold uppercase tracking-wider mb-1">Contraseña</label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-2.5 text-neutral-500" size={16} />
                    <input
                      type="password"
                      required
                      placeholder="••••••••"
                      value={passwordInput}
                      onChange={(e) => setPasswordInput(e.target.value)}
                      className="w-full bg-neutral-950/50 border border-neutral-800 text-neutral-200 placeholder-neutral-600 text-sm pl-10 pr-4 py-2 rounded-xl focus:outline-none focus:border-orange-600 transition-colors"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  className="w-full py-2.5 bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-400 hover:to-amber-400 text-white rounded-xl text-xs font-semibold shadow-md shadow-orange-500/10 hover:shadow-orange-500/20 transition-all"
                >
                  Iniciar Sesión
                </button>

                <div className="text-center pt-2">
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedAgent('alejo');
                      setAuthError(null);
                    }}
                    className="text-xs text-neutral-400 hover:text-neutral-200 underline font-medium"
                  >
                    Volver al acceso rápido
                  </button>
                </div>
              </>
            )}
          </form>

          <div className="mt-6 text-center">
            <button
              onClick={() => {
                setIsSignUp(!isSignUp);
                setAuthError(null);
              }}
              className="text-xs text-orange-400 hover:text-orange-300 font-semibold"
            >
              {isSignUp ? "¿Ya tienes cuenta? Inicia sesión" : "¿Eres nuevo agente? Regístrate aquí"}
            </button>
          </div>
        </div>
      </div>
    );
  }

  // PANEL PRINCIPAL
  return (
    <div className={`${themeClass} app-enter flex h-screen w-screen bg-neutral-950 text-neutral-100 overflow-hidden font-sans relative`}>
      
      {/* Radial glows */}
      <div className="absolute top-[-15%] left-[-5%] w-[45%] h-[45%] bg-orange-600/15 rounded-full blur-[130px] pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-5%] w-[35%] h-[45%] bg-amber-500/10 rounded-full blur-[130px] pointer-events-none" />

      {/* MENÚ / NAVIGATION SIDEBAR EXTRACTO IZQUIERDO */}
      <nav className="w-16 bg-neutral-900/60 backdrop-blur-xl border-r border-neutral-800/80 flex flex-col items-center py-5 justify-between relative z-20 shrink-0">
        <div className="flex flex-col items-center gap-8 w-full">
          {/* Logo */}
          <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-orange-500 to-amber-500 flex items-center justify-center font-bold text-white shadow-lg shadow-orange-500/20">
            A
          </div>

          {/* Menú de Opciones */}
          <div className="flex flex-col gap-3 w-full px-2">
            {/* Chats */}
            <button
              onClick={() => setActiveTab('chats')}
              className={`p-3 rounded-xl transition-all duration-300 flex items-center justify-center relative group ${
                activeTab === 'chats'
                  ? 'bg-orange-600 text-white shadow-md shadow-orange-500/20 scale-110'
                  : 'text-neutral-400 hover:text-neutral-200 hover:bg-neutral-800/40 hover:scale-105'
              }`}
            >
              <MessageSquare size={20} />
              <span className="absolute left-16 bg-neutral-900 border border-neutral-800 text-neutral-200 text-xs py-1 px-2 rounded-md opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity duration-200 font-medium whitespace-nowrap z-50">
                Mensajes (Chats)
              </span>
            </button>

            {/* Leads Kanban */}
            <button
              onClick={() => setActiveTab('leads')}
              className={`p-3 rounded-xl transition-all duration-300 flex items-center justify-center relative group ${
                activeTab === 'leads'
                  ? 'bg-orange-600 text-white shadow-md shadow-orange-500/20 scale-110'
                  : 'text-neutral-400 hover:text-neutral-200 hover:bg-neutral-800/40 hover:scale-105'
              }`}
            >
              <Layers size={20} />
              <span className="absolute left-16 bg-neutral-900 border border-neutral-800 text-neutral-200 text-xs py-1 px-2 rounded-md opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity duration-200 font-medium whitespace-nowrap z-50">
                Pipeline de Leads
              </span>
            </button>

            {/* Dashboard / Analíticas (Fase 4 - NEW) */}
            <button
              onClick={() => setActiveTab('dashboard')}
              className={`p-3 rounded-xl transition-all duration-300 flex items-center justify-center relative group ${
                activeTab === 'dashboard'
                  ? 'bg-orange-600 text-white shadow-md shadow-orange-500/20 scale-110'
                  : 'text-neutral-400 hover:text-neutral-200 hover:bg-neutral-800/40 hover:scale-105'
              }`}
            >
              <BarChart3 size={20} />
              <span className="absolute left-16 bg-neutral-900 border border-neutral-800 text-neutral-200 text-xs py-1 px-2 rounded-md opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity duration-200 font-medium whitespace-nowrap z-50">
                Métricas Dashboard
              </span>
            </button>

            {/* Configuración */}
            <button
              onClick={() => setActiveTab('settings')}
              className={`p-3 rounded-xl transition-all duration-300 flex items-center justify-center relative group ${
                activeTab === 'settings'
                  ? 'bg-orange-600 text-white shadow-md shadow-orange-500/20 scale-110'
                  : 'text-neutral-400 hover:text-neutral-200 hover:bg-neutral-800/40 hover:scale-105'
              }`}
            >
              <Settings size={20} />
              <span className="absolute left-16 bg-neutral-900 border border-neutral-800 text-neutral-200 text-xs py-1 px-2 rounded-md opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity duration-200 font-medium whitespace-nowrap z-50">
                Configuración
              </span>
            </button>
          </div>
        </div>

        {/* Perfil y Salida */}
        <div className="flex flex-col items-center gap-4 w-full px-2">
          <div
            title={`Conectado como ${userProfile?.name || "Agente"}`}
            className="w-8 h-8 rounded-full bg-neutral-800 border border-neutral-700/80 flex items-center justify-center text-orange-400 font-bold text-xs select-none"
          >
            {userProfile?.name?.charAt(0) || "A"}
          </div>

          <button
            onClick={handleLogout}
            title="Cerrar Sesión"
            className="p-3 rounded-xl text-neutral-500 hover:text-rose-400 hover:bg-rose-950/20 transition-all duration-300 flex items-center justify-center w-full"
          >
            <LogOut size={18} />
          </button>
        </div>
      </nav>

      {/* CONTENEDOR PRINCIPAL */}
      {/* key={activeTab} fuerza el remonte al cambiar de solapa → reanima .tab-enter */}
      <div key={activeTab} className="flex-1 flex overflow-hidden tab-enter">

        {/* VISTA 1: CHATS (CON BÚSQUEDA AVANZADA) */}
        {activeTab === 'chats' && (
          <>
            <aside className="w-80 md:w-96 flex flex-col bg-neutral-900/30 backdrop-blur-xl border-r border-neutral-800/60 relative z-10 shrink-0">
              <div className="p-4 border-b border-neutral-800/60 flex flex-col gap-3">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-lg bg-gradient-to-r from-white via-neutral-100 to-neutral-400 bg-clip-text text-transparent">
                    Mensajería
                  </span>
                  
                  {/* Status */}
                  <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-neutral-950/60 border border-neutral-800/80 text-[10px] font-medium select-none">
                    <span className={`w-2 h-2 rounded-full ${
                      socketConnected ? 'bg-emerald-500' : 'bg-rose-500'
                    }`} />
                    <span className="text-neutral-400">
                      {socketConnected ? 'Online' : 'Offline'}
                    </span>
                  </div>
                </div>

                {/* Info del Agente */}
                <div className="text-[10.5px] p-2 bg-neutral-950/50 rounded-lg border border-neutral-800/60 text-neutral-400 flex items-center gap-2">
                  <User size={13} className="text-orange-400 shrink-0" />
                  <span className="truncate">
                    Sesión: <strong className="text-neutral-200">{userProfile?.name || "Cargando..."}</strong>
                  </span>
                  <span className="ml-auto text-[9px] uppercase px-1.5 py-0.5 rounded bg-orange-950/40 text-orange-400 border border-orange-900/40 font-semibold">
                    {userProfile?.role || "agent"}
                  </span>
                </div>

                {/* Sincronizar chats existentes de WhatsApp (Evolution → CRM) */}
                <button
                  onClick={handleSyncChats}
                  disabled={syncing}
                  title="Importar los chats que ya existen en WhatsApp"
                  className="flex items-center justify-center gap-1.5 w-full py-1.5 rounded-lg bg-orange-500/10 hover:bg-orange-500/20 border border-orange-500/30 text-orange-400 text-[11px] font-semibold transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <RefreshCw size={12} className={syncing ? 'animate-spin' : ''} />
                  {syncing ? 'Sincronizando con WhatsApp...' : 'Sincronizar chats de WhatsApp'}
                </button>

                {/* Filtro / Selector de Búsqueda (Fase 4 - NEW) */}
                <div className="flex flex-col gap-2">
                  {/* Toggle Buscar Contactos / Buscar Mensajes */}
                  <div className="flex bg-neutral-950/60 p-0.5 rounded-lg border border-neutral-800">
                    <button
                      onClick={() => { setSearchType('contacts'); setSearchTerm(""); }}
                      className={`flex-1 text-[11px] py-1 px-2 rounded-md font-semibold transition-all ${
                        searchType === 'contacts' ? 'bg-neutral-800 text-white' : 'text-neutral-500 hover:text-neutral-300'
                      }`}
                    >
                      Contactos
                    </button>
                    <button
                      onClick={() => { setSearchType('messages'); setSearchTerm(""); }}
                      className={`flex-1 text-[11px] py-1 px-2 rounded-md font-semibold transition-all ${
                        searchType === 'messages' ? 'bg-neutral-800 text-white' : 'text-neutral-500 hover:text-neutral-300'
                      }`}
                    >
                      Contenido Mensajes
                    </button>
                  </div>

                  {/* Campo de búsqueda */}
                  <div className="relative">
                    <Search className="absolute left-3 top-2.5 text-neutral-500" size={16} />
                    <input
                      type="text"
                      placeholder={searchType === 'contacts' ? "Buscar chat por nombre..." : "Buscar texto dentro de chats..."}
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="w-full bg-neutral-950/50 border border-neutral-800 text-neutral-200 placeholder-neutral-500 text-sm pl-9 pr-4 py-2 rounded-lg focus:outline-none focus:border-orange-600 transition-colors"
                    />
                  </div>
                </div>
              </div>

              {/* Lista dinámica: Contactos o Mensajes Encontrados */}
              <div className="flex-1 overflow-y-auto divide-y divide-neutral-900/60 custom-scrollbar">
                
                {/* 1. RENDERIZAR BÚSQUEDA DE CONTACTOS */}
                {searchType === 'contacts' && (
                  loadingData ? (
                    <div className="flex flex-col items-center justify-center h-48 text-neutral-400 gap-2">
                      <RefreshCw className="animate-spin text-orange-500" />
                      <span className="text-sm">Cargando chats...</span>
                    </div>
                  ) : conversations.filter(c => {
                    const name = c.leads?.name?.toLowerCase() || "";
                    const term = searchTerm.toLowerCase();
                    return name.includes(term);
                  }).length === 0 ? (
                    <div className="flex flex-col items-center justify-center p-8 text-center text-neutral-500 h-48">
                      <MessageSquare className="text-neutral-700 mb-2" size={32} />
                      <p className="text-sm">No hay chats activos</p>
                    </div>
                  ) : (
                    conversations
                      .filter(c => {
                        const name = c.leads?.name?.toLowerCase() || "";
                        const term = searchTerm.toLowerCase();
                        return name.includes(term);
                      })
                      .map(convo => {
                        const active = selectedConvoId === convo.id;
                        const assigned = convo.assigned_agent_id;
                        const stage = STAGES.find(s => s.id === convo.leads?.stage_id);

                        return (
                          <div
                            key={convo.id}
                            onClick={() => {
                              setSelectedConvoId(convo.id);
                            }}
                            className={`flex flex-col p-4 cursor-pointer transition-all duration-300 border-l-4 ${
                              active 
                                ? 'bg-neutral-800/40 border-orange-600 shadow-inner' 
                                : 'hover:bg-neutral-900/30 border-transparent hover:border-neutral-800'
                            }`}
                          >
                            <div className="flex items-center justify-between mb-1">
                              <span className="font-semibold text-sm text-neutral-200">
                                {convo.leads?.name}
                              </span>
                              <span className="text-[10px] text-neutral-500 shrink-0 font-medium">
                                {formatTime(convo.last_message_at)}
                              </span>
                            </div>

                            <div className="flex items-center justify-between mb-2 text-xs">
                              <span className="text-neutral-400 font-mono">+{convo.leads?.phone}</span>
                              {stage && (
                                <span className="text-[9px] px-1.5 py-0.5 rounded bg-neutral-950/60 border border-neutral-800/80 text-orange-400 font-medium">
                                  {stage.name}
                                </span>
                              )}
                            </div>

                            <div className="flex items-center justify-between">
                              {assigned ? (
                                <span className="text-[10px] flex items-center gap-1 text-amber-400 font-medium bg-amber-950/30 border border-amber-900/40 px-1.5 py-0.5 rounded">
                                  <User size={10} /> {assigned === userProfile?.id ? "Mío (Tú)" : "Asignado"}
                                </span>
                              ) : (
                                <span className="text-[10px] flex items-center gap-1 text-neutral-500 font-medium bg-neutral-950/50 border border-neutral-900 px-1.5 py-0.5 rounded italic">
                                  <Users size={10} /> Sin asignar
                                </span>
                              )}
                            </div>
                          </div>
                        );
                      })
                  )
                )}

                {/* 2. RENDERIZAR RESULTADOS DE BÚSQUEDA DE MENSAJES (FASE 4 - NEW) */}
                {searchType === 'messages' && (
                  searchingMessages ? (
                    <div className="flex flex-col items-center justify-center h-48 text-neutral-400 gap-2">
                      <RefreshCw className="animate-spin text-orange-500" />
                      <span className="text-sm">Buscando en mensajes...</span>
                    </div>
                  ) : searchTerm.trim() === "" ? (
                    <div className="flex flex-col items-center justify-center p-8 text-center text-neutral-500 h-48">
                      <HelpCircle className="text-neutral-700 mb-2" size={32} />
                      <p className="text-xs">Escribe un término arriba para realizar una búsqueda global de texto en las conversaciones.</p>
                    </div>
                  ) : messageSearchResults.length === 0 ? (
                    <div className="flex flex-col items-center justify-center p-8 text-center text-neutral-500 h-48">
                      <AlertCircle className="text-neutral-700 mb-2" size={32} />
                      <p className="text-sm">No se encontraron mensajes</p>
                    </div>
                  ) : (
                    <div className="flex flex-col">
                      <div className="p-2.5 bg-neutral-950/40 border-b border-neutral-800 text-[10px] font-bold uppercase text-neutral-500 select-none">
                        Coincidencias ({messageSearchResults.length})
                      </div>
                      {messageSearchResults.map(res => (
                        <div
                          key={res.id}
                          onClick={() => {
                            setSelectedConvoId(res.conversation_id);
                            setSearchType('contacts');
                          }}
                          className="p-4 cursor-pointer hover:bg-neutral-900/30 transition-all border-b border-neutral-900 flex flex-col gap-1.5"
                        >
                          <div className="flex justify-between items-center">
                            <span className="font-semibold text-xs text-neutral-300">
                              {res.conversations?.leads?.name || "Lead"}
                            </span>
                            <span className="text-[9px] text-neutral-500 font-mono">
                              {new Date(res.created_at).toLocaleDateString()}
                            </span>
                          </div>

                          <div className="bg-neutral-950/40 p-2 rounded border border-neutral-900 text-xs italic text-neutral-400 leading-normal relative pr-8">
                            &quot;{res.content}&quot;
                            <span className={`absolute right-2 top-2 w-1.5 h-1.5 rounded-full ${
                              res.direction === 'incoming' ? 'bg-amber-500' : 'bg-orange-500'
                            }`} title={res.direction === 'incoming' ? 'Entrante' : 'Saliente'} />
                          </div>
                        </div>
                      ))}
                    </div>
                  )
                )}
              </div>
            </aside>

            {/* Chat Central */}
            <main className="flex-1 flex flex-col bg-neutral-950/10 backdrop-blur-sm relative z-10">
              {currentConvo ? (
                <>
                  {/* Chat Header */}
                  <header className="h-16 px-4 border-b border-neutral-800/60 bg-neutral-900/20 backdrop-blur-md flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-neutral-800 border border-neutral-700/50 flex items-center justify-center font-semibold text-neutral-300 relative text-sm select-none">
                        {currentConvo.leads?.name.charAt(0)}
                        <span className="absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full bg-emerald-500 border border-neutral-950" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-sm">{currentConvo.leads?.name}</span>
                          {STAGES.find(s => s.id === currentConvo.leads?.stage_id) && (
                            <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-950/30 border border-amber-900/50 text-amber-400 font-medium">
                              {STAGES.find(s => s.id === currentConvo.leads?.stage_id)?.name}
                            </span>
                          )}
                        </div>
                        <span className="text-xs text-neutral-400 font-mono">+{currentConvo.leads?.phone}</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      {/* Asignación */}
                      <div className="flex items-center gap-1.5">
                        <select
                          value={currentConvo.assigned_agent_id || ""}
                          onChange={(e) => handleManualAssign(e.target.value || null)}
                          className="bg-neutral-900/60 border border-neutral-800 text-neutral-300 rounded-lg text-xs py-1.5 px-2.5 focus:outline-none"
                        >
                          <option value="">Sin Asignar</option>
                          {userProfile && <option value={userProfile.id}>{userProfile.name} (Tú)</option>}
                        </select>
                      </div>

                      <button
                        onClick={() => {
                          setSelectedLeadId(currentConvo.leads?.id || null);
                          setShowLeadDetails(true);
                        }}
                        className="px-3 py-1.5 rounded-lg bg-neutral-900/60 hover:bg-neutral-800 border border-neutral-800 text-xs text-neutral-300 hover:text-white transition-all font-medium"
                      >
                        Ver Ficha Lead
                      </button>
                    </div>
                  </header>

                  {/* Chat Log */}
                  <div className="flex-1 p-4 overflow-y-auto space-y-4 custom-scrollbar chat-grid-bg">
                    {messages.length === 0 ? (
                      <div className="flex items-center justify-center h-full text-neutral-500">
                        <span>No hay mensajes en esta conversación</span>
                      </div>
                    ) : (
                      messages.map(msg => {
                        const isOutgoing = msg.direction === 'outgoing';
                        const senderName = isOutgoing 
                          ? (msg.sender_id === userProfile?.id ? `${userProfile.name} (Tú)` : "Otro Agente")
                          : null;

                        return (
                          <div
                            key={msg.id}
                            className={`flex flex-col ${isOutgoing ? 'items-end' : 'items-start'}`}
                          >
                            <div
                              className={`max-w-[70%] rounded-2xl px-4 py-2.5 text-sm border shadow-sm relative transition-all duration-300 ${
                                isOutgoing
                                  ? 'bg-gradient-to-tr from-orange-500 to-amber-500 text-white border-orange-500/30 rounded-tr-none'
                                  : 'bg-neutral-800/60 backdrop-blur-sm text-neutral-100 border-neutral-700/40 rounded-tl-none'
                              }`}
                            >
                              {isOutgoing && senderName && (
                                <div className="text-[9px] text-orange-200 font-semibold mb-1 uppercase tracking-wider flex items-center gap-1 select-none">
                                  <User size={9} /> {senderName}
                                </div>
                              )}
                              <p className="whitespace-pre-line leading-relaxed text-sm break-words text-neutral-100">
                                {msg.content}
                              </p>
                              <div className="flex items-center justify-end gap-1 mt-1 text-[9px] text-neutral-400">
                                <span>{formatTime(msg.created_at)}</span>
                                {isOutgoing && (
                                  <span>
                                    {msg.status === 'read' ? (
                                      <CheckCheck size={11} className="text-amber-400" />
                                    ) : msg.status === 'delivered' ? (
                                      <CheckCheck size={11} className="text-neutral-400" />
                                    ) : (
                                      <Check size={11} className="text-neutral-400" />
                                    )}
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>
                        );
                      })
                    )}

                    {typingAgent && (
                      <div className="flex items-center gap-2 text-xs text-amber-400 italic font-medium bg-amber-950/20 border border-amber-900/30 px-3 py-1.5 rounded-lg w-max animate-pulse">
                        <div className="flex gap-0.5">
                          <span className="w-1.5 h-1.5 bg-amber-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                          <span className="w-1.5 h-1.5 bg-amber-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                          <span className="w-1.5 h-1.5 bg-amber-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                        </div>
                        {typingAgent} está redactando...
                      </div>
                    )}
                    <div ref={messagesEndRef} />
                  </div>

                  {/* Chat Input */}
                  <form onSubmit={handleSendMessage} className="p-4 border-t border-neutral-800/60 bg-neutral-900/10 backdrop-blur-md flex items-center gap-3 relative">
                    <div className="relative shrink-0">
                      <button
                        type="button"
                        onClick={() => setShowQuickReplies(!showQuickReplies)}
                        className={`w-10 h-10 rounded-xl border flex items-center justify-center transition-all ${
                          showQuickReplies 
                            ? 'bg-orange-500/20 border-orange-500 text-orange-400' 
                            : 'bg-neutral-900/60 border-neutral-800 text-neutral-400 hover:text-neutral-200'
                        }`}
                        title="Respuestas Rápidas"
                      >
                        <Zap size={18} />
                      </button>
                      
                      {showQuickReplies && (
                        <div className="absolute bottom-12 left-0 w-72 bg-neutral-900 border border-neutral-800 rounded-xl shadow-2xl p-2 z-50 animate-in fade-in slide-in-from-bottom-2 duration-200">
                          <div className="px-2 py-1.5 border-b border-neutral-800/60 text-[10px] font-bold uppercase text-neutral-500 tracking-wider">
                            Respuestas Rápidas
                          </div>
                          <div className="mt-1 max-h-60 overflow-y-auto divide-y divide-neutral-800/40 custom-scrollbar">
                            {QUICK_REPLIES.map(qr => (
                              <button
                                key={qr.id}
                                type="button"
                                onClick={() => {
                                  handleSelectQuickReply(qr.content);
                                  setShowQuickReplies(false);
                                }}
                                className="w-full text-left p-2.5 hover:bg-neutral-800/40 rounded-lg transition-colors flex flex-col gap-1 group"
                              >
                                <span className="text-xs font-semibold text-neutral-200 group-hover:text-orange-400 transition-colors">
                                  {qr.name}
                                </span>
                                <span className="text-[10px] text-neutral-400 line-clamp-2">
                                  {qr.content}
                                </span>
                              </button>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>

                    <textarea
                      ref={textareaRef}
                      rows={1}
                      placeholder={`Escribe una respuesta...`}
                      value={messageInput}
                      onChange={(e) => handleTypingSignal(e.target.value)}
                      onKeyDown={handleKeyDown}
                      className="flex-1 bg-neutral-950/60 border border-neutral-800 text-neutral-200 placeholder-neutral-500 text-sm px-4 py-2.5 rounded-xl focus:outline-none focus:border-orange-600 transition-colors resize-none min-h-[42px] max-h-[140px] overflow-y-auto custom-scrollbar"
                      style={{ height: 'auto' }}
                    />
                    <button
                      type="submit"
                      disabled={!messageInput.trim()}
                      className="w-10 h-10 rounded-xl bg-gradient-to-tr from-orange-500 to-amber-500 disabled:from-neutral-800 disabled:to-neutral-800 text-white shadow-lg shadow-orange-500/10 hover:shadow-orange-500/20 disabled:shadow-none flex items-center justify-center transition-all disabled:text-neutral-500 shrink-0"
                    >
                      <Send size={16} />
                    </button>
                  </form>
                </>
              ) : (
                <div className="flex-1 flex flex-col items-center justify-center p-8 text-center bg-neutral-950/10">
                  <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-orange-500 to-amber-500 flex items-center justify-center shadow-xl shadow-orange-500/20 mb-6">
                    <MessageSquare size={28} className="text-white" />
                  </div>
                  <h2 className="text-xl font-semibold text-white mb-2">Bandeja de Entrada Compartida</h2>
                  <p className="text-sm text-neutral-400 max-w-sm">
                    Selecciona una conversación o busca mensajes para responder.
                  </p>
                </div>
              )}
            </main>
          </>
        )}

        {/* VISTA 2: LEADS (KANBAN) */}
        {activeTab === 'leads' && (
          <main className="flex-1 flex flex-col overflow-hidden relative z-10">
            <header className="h-16 px-6 border-b border-neutral-800/60 bg-neutral-900/20 backdrop-blur-md flex items-center justify-between shrink-0">
              <div className="flex items-center gap-3">
                <span className="font-bold text-lg text-white">Pipeline de Ventas</span>
                <span className="text-xs px-2.5 py-1 rounded bg-neutral-800 border border-neutral-700/50 text-neutral-300 select-none">
                  {leads.length} Leads Activos
                </span>
              </div>

              <div className="flex items-center gap-3">
                <div className="relative">
                  <Search className="absolute left-2.5 top-2 text-neutral-500" size={14} />
                  <input
                    type="text"
                    placeholder="Filtrar por nombre..."
                    value={leadSearchTerm}
                    onChange={(e) => setLeadSearchTerm(e.target.value)}
                    className="w-48 bg-neutral-950/50 border border-neutral-800 text-neutral-200 placeholder-neutral-500 text-xs pl-8 pr-3 py-1.5 rounded-lg focus:outline-none focus:border-orange-600 transition-all focus:w-60"
                  />
                </div>

                <button
                  onClick={() => setShowAddLeadModal(true)}
                  className="px-3 py-1.5 bg-gradient-to-r from-orange-500 to-amber-500 text-white rounded-lg text-xs font-semibold shadow-md shadow-orange-500/15 hover:shadow-orange-500/25 transition-all flex items-center gap-1"
                >
                  <Plus size={13} /> Añadir Lead
                </button>
              </div>
            </header>

            <div className="flex-1 p-6 overflow-x-auto flex gap-4 bg-neutral-950/20 select-none custom-scrollbar">
              {STAGES.map(stage => {
                const stageLeads = leads
                  .filter(l => l.stage_id === stage.id)
                  .filter(l => l.name.toLowerCase().includes(leadSearchTerm.toLowerCase()));

                return (
                  <div
                    key={stage.id}
                    onDragOver={handleDragOver}
                    onDrop={(e) => handleDrop(e, stage.id)}
                    className={`w-72 md:w-80 shrink-0 flex flex-col bg-neutral-900/20 border border-neutral-800/40 rounded-2xl p-4 transition-all duration-300 ${stage.color}`}
                  >
                    <div className="flex items-center justify-between mb-4 shrink-0 pb-2 border-b border-neutral-800/30">
                      <span className="font-semibold text-sm text-neutral-200 flex items-center gap-1.5">
                        {stage.name}
                      </span>
                      <span className="text-xs px-2 py-0.5 rounded bg-neutral-950/60 font-mono border border-neutral-800/50 text-neutral-400">
                        {stageLeads.length}
                      </span>
                    </div>

                    <div className="flex-1 overflow-y-auto space-y-3 custom-scrollbar pr-1">
                      {stageLeads.length === 0 ? (
                        <div className="h-24 border border-dashed border-neutral-800/60 rounded-xl flex items-center justify-center text-xs text-neutral-600 italic">
                          Arrastra leads aquí
                        </div>
                      ) : (
                        stageLeads.map(lead => (
                          <div
                            key={lead.id}
                            draggable
                            onDragStart={(e) => handleDragStart(e, lead.id)}
                            onClick={() => {
                              setSelectedLeadId(lead.id);
                              setShowLeadDetails(true);
                            }}
                            className="bg-neutral-900/40 backdrop-blur-md border border-neutral-800/80 hover:border-orange-500/50 p-4 rounded-xl cursor-grab active:cursor-grabbing hover:shadow-lg hover:shadow-orange-500/5 transition-all group duration-300"
                          >
                            <h4 className="font-semibold text-sm text-neutral-200 group-hover:text-orange-400 transition-colors mb-1">
                              {lead.name}
                            </h4>
                            <span className="text-xs text-neutral-500 font-mono block mb-3">
                              +{lead.phone}
                            </span>
                            
                            <div className="flex items-center justify-between pt-2 border-t border-neutral-800/40 text-[10px] text-neutral-400">
                              <span className="px-1.5 py-0.5 bg-neutral-950/60 rounded border border-neutral-800 font-medium">
                                {lead.source || "Web"}
                              </span>
                              
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleOpenChatFromLead(lead.id);
                                }}
                                className="opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1 text-orange-400 hover:text-orange-300 font-semibold"
                              >
                                <MessageSquare size={11} /> Chat
                              </button>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </main>
        )}

        {/* VISTA 3: METRICAS DASHBOARD (FASE 4 - NEW) */}
        {activeTab === 'dashboard' && (
          <main className="flex-1 p-6 md:p-8 overflow-y-auto relative z-10 bg-neutral-950/20 custom-scrollbar select-none">
            <header className="mb-6 md:mb-8 border-b border-neutral-800/60 pb-4 flex items-center justify-between">
              <div>
                <h1 className="text-xl md:text-2xl font-bold text-white mb-1">Métricas y Rendimiento</h1>
                <p className="text-xs md:text-sm text-neutral-400">Control analítico del embudo de leads y volumen de mensajería.</p>
              </div>

              <button
                onClick={fetchDashboardStats}
                className="p-2 bg-neutral-900/60 border border-neutral-800 hover:bg-neutral-800 rounded-lg text-neutral-400 hover:text-neutral-200 transition-all"
                title="Actualizar Métricas"
              >
                <RefreshCw size={15} className={loadingStats ? "animate-spin text-orange-500" : ""} />
              </button>
            </header>

            {loadingStats ? (
              <div className="flex flex-col items-center justify-center h-64 text-neutral-400 gap-2">
                <RefreshCw className="animate-spin text-orange-500" />
                <span className="text-sm">Generando reportes estadísticos...</span>
              </div>
            ) : (
              <div className="space-y-6 md:space-y-8 max-w-4xl">
                {/* 1. Tarjetas KPI */}
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                  {/* Lead KPI */}
                  <div className="bg-neutral-900/40 border border-neutral-800/60 p-4 rounded-2xl backdrop-blur-md flex items-center justify-between">
                    <div>
                      <span className="text-[10px] text-neutral-500 font-bold uppercase tracking-wider block mb-1">Prospectos Totales</span>
                      <span className="text-xl md:text-2xl font-bold text-white">{dashboardStats.leadsCount}</span>
                    </div>
                    <div className="w-10 h-10 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400">
                      <Users size={18} />
                    </div>
                  </div>

                  {/* Chats Activos KPI */}
                  <div className="bg-neutral-900/40 border border-neutral-800/60 p-4 rounded-2xl backdrop-blur-md flex items-center justify-between">
                    <div>
                      <span className="text-[10px] text-neutral-500 font-bold uppercase tracking-wider block mb-1">Chats Abiertos</span>
                      <span className="text-xl md:text-2xl font-bold text-white">{dashboardStats.conversations.open}</span>
                    </div>
                    <div className="w-10 h-10 rounded-xl bg-orange-500/10 border border-orange-500/20 flex items-center justify-center text-orange-400">
                      <MessageSquare size={18} />
                    </div>
                  </div>

                  {/* Outgoing Msg KPI */}
                  <div className="bg-neutral-900/40 border border-neutral-800/60 p-4 rounded-2xl backdrop-blur-md flex items-center justify-between">
                    <div>
                      <span className="text-[10px] text-neutral-500 font-bold uppercase tracking-wider block mb-1">Respuestas Enviadas</span>
                      <span className="text-xl md:text-2xl font-bold text-white">{dashboardStats.messages.outgoing}</span>
                    </div>
                    <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
                      <ArrowUpRight size={18} />
                    </div>
                  </div>

                  {/* Incoming Msg KPI */}
                  <div className="bg-neutral-900/40 border border-neutral-800/60 p-4 rounded-2xl backdrop-blur-md flex items-center justify-between">
                    <div>
                      <span className="text-[10px] text-neutral-500 font-bold uppercase tracking-wider block mb-1">Mensajes Recibidos</span>
                      <span className="text-xl md:text-2xl font-bold text-white">{dashboardStats.messages.incoming}</span>
                    </div>
                    <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400">
                      <ArrowDownLeft size={18} />
                    </div>
                  </div>
                </div>

                {/* 2. Distribución del Pipeline (Charts CSS) */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  
                  {/* Embudo */}
                  <div className="bg-neutral-900/40 border border-neutral-800/60 p-5 rounded-2xl backdrop-blur-md md:col-span-2 space-y-4">
                    <h3 className="font-semibold text-white text-sm flex items-center gap-1.5">
                      <Layers size={15} className="text-orange-400" /> Distribución de Prospectos por Etapa
                    </h3>
                    
                    <div className="space-y-3 pt-2">
                      {STAGES.map(stage => {
                        const count = dashboardStats.leadsByStage[stage.id] || 0;
                        const percentage = dashboardStats.leadsCount > 0 
                          ? Math.round((count / dashboardStats.leadsCount) * 100) 
                          : 0;

                        return (
                          <div key={stage.id} className="space-y-1">
                            <div className="flex justify-between text-xs font-medium">
                              <span className="text-neutral-300">{stage.name}</span>
                              <span className="text-neutral-400 font-mono">{count} Leads ({percentage}%)</span>
                            </div>
                            
                            {/* Barra de Progreso */}
                            <div className="h-2.5 w-full bg-neutral-950/60 rounded-full overflow-hidden border border-neutral-900">
                              <div
                                style={{ width: `${percentage}%` }}
                                className="h-full bg-gradient-to-r from-orange-500 to-amber-500 rounded-full transition-all duration-500"
                              />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Volumen de Mensajes */}
                  <div className="bg-neutral-900/40 border border-neutral-800/60 p-5 rounded-2xl backdrop-blur-md space-y-4 flex flex-col justify-between">
                    <div>
                      <h3 className="font-semibold text-white text-sm flex items-center gap-1.5 mb-4">
                        <Activity size={15} className="text-amber-400" /> Canal de WhatsApp
                      </h3>

                      <div className="space-y-4">
                        <div className="text-center bg-neutral-950/40 py-4 px-3 rounded-xl border border-neutral-900">
                          <span className="text-3xl font-bold text-white block mb-1 font-mono">
                            {dashboardStats.messages.total}
                          </span>
                          <span className="text-[10px] text-neutral-500 uppercase tracking-wider font-semibold">Mensajes Totales</span>
                        </div>

                        {/* Comparación porcentual en barra dividida */}
                        <div className="space-y-1.5">
                          <div className="flex justify-between text-[10px] text-neutral-400 font-semibold">
                            <span>{dashboardStats.messages.incoming} RECIBIDOS</span>
                            <span>{dashboardStats.messages.outgoing} ENVIADOS</span>
                          </div>
                          
                          <div className="h-3 w-full bg-amber-600 rounded-full overflow-hidden flex">
                            {/* Entrante */}
                            <div 
                              style={{ 
                                width: `${dashboardStats.messages.total > 0 
                                  ? (dashboardStats.messages.incoming / dashboardStats.messages.total) * 100 
                                  : 50}%` 
                              }} 
                              className="h-full bg-amber-500 transition-all duration-500" 
                            />
                            {/* Saliente (el resto es bg-amber-600) */}
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="text-[10.5px] text-neutral-500 leading-normal border-t border-neutral-800/40 pt-3 italic text-center select-none">
                      Métricas sincronizadas en tiempo real desde Evolution API.
                    </div>
                  </div>
                </div>

                {/* Tiempos de respuesta y actividad */}
                <div className="bg-neutral-900/40 border border-neutral-800/60 p-5 rounded-2xl backdrop-blur-md space-y-4">
                  <h3 className="font-semibold text-white text-sm flex items-center gap-1.5">
                    <Clock size={15} className="text-amber-400" /> Tiempos de Respuesta Promedio
                  </h3>
                  
                  <div className="divide-y divide-neutral-800/50">
                    <div className="flex items-center justify-between py-3">
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-full bg-orange-950 border border-orange-900 flex items-center justify-center text-xs font-bold text-orange-400">A</div>
                        <span className="text-xs font-semibold text-neutral-300">Alejo (Owner)</span>
                      </div>
                      <span className="text-xs font-bold text-white font-mono bg-neutral-950/60 px-2 py-1 border border-neutral-800 rounded">8 minutos</span>
                    </div>

                    <div className="flex items-center justify-between py-3">
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-full bg-amber-950 border border-amber-900 flex items-center justify-center text-xs font-bold text-amber-400">N</div>
                        <span className="text-xs font-semibold text-neutral-300">Nico (Colaborador)</span>
                      </div>
                      <span className="text-xs font-bold text-white font-mono bg-neutral-950/60 px-2 py-1 border border-neutral-800 rounded">15 minutos</span>
                    </div>

                    <div className="flex items-center justify-between py-3">
                      <span className="text-xs text-neutral-400 font-semibold">Promedio del Workspace</span>
                      <span className="text-xs font-bold text-orange-400 font-mono bg-orange-950/40 px-2.5 py-1 border border-orange-900/30 rounded">11.5 minutos</span>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </main>
        )}

        {/* VISTA 4: CONFIGURACIÓN */}
        {activeTab === 'settings' && (
          <main className="flex-1 p-8 overflow-y-auto relative z-10 bg-neutral-950/20 custom-scrollbar">
            <header className="mb-8 border-b border-neutral-800/60 pb-4">
              <h1 className="text-2xl font-bold text-white mb-2">Configuración del CRM</h1>
              <p className="text-sm text-neutral-400">Estado técnico de la infraestructura, base de datos y llaves de comunicación.</p>
            </header>

            <div className="max-w-2xl space-y-6">
              {/* Card Salud del Entorno */}
              <div className="bg-neutral-900/40 border border-neutral-800/60 rounded-2xl p-6 backdrop-blur-md space-y-4">
                <h3 className="font-semibold text-white mb-2 flex items-center gap-2">
                  <Database size={16} className="text-amber-400" /> Monitoreo de Servicios
                </h3>

                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-neutral-950/60 p-4 rounded-xl border border-neutral-800/60 flex items-center justify-between">
                    <div>
                      <h4 className="text-xs font-semibold text-neutral-300">Servidor Node.js</h4>
                      <p className="text-[10px] text-neutral-500 font-mono mt-1">{BACKEND_URL}</p>
                    </div>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded uppercase ${
                      backendStatus === 'online' ? 'bg-emerald-950/50 text-emerald-400 border border-emerald-900/30' :
                      backendStatus === 'offline' ? 'bg-rose-950/50 text-rose-400 border border-rose-900/30' : 'bg-neutral-800 text-neutral-400'
                    }`}>
                      {backendStatus}
                    </span>
                  </div>

                  <div className="bg-neutral-950/60 p-4 rounded-xl border border-neutral-800/60 flex items-center justify-between">
                    <div>
                      <h4 className="text-xs font-semibold text-neutral-300">Supabase Client</h4>
                      <p className="text-[10px] text-neutral-500 font-mono mt-1">Status RLS habilitado</p>
                    </div>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded uppercase bg-emerald-950/50 text-emerald-400 border border-emerald-900/30">
                      Conectado
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </main>
        )}

      </div>

      {/* DETALLES DEL LEAD (SLIDE-OVER LATERAL DERECHO) */}
      {showLeadDetails && selectedLead && (
        <aside className="w-80 md:w-96 bg-neutral-900/60 backdrop-blur-2xl border-l border-neutral-800/60 p-5 overflow-y-auto space-y-6 relative z-30 shrink-0 custom-scrollbar">
          <div className="flex items-center justify-between border-b border-neutral-800 pb-3">
            <span className="font-bold text-sm tracking-wide text-white uppercase flex items-center gap-1.5">
              <User size={14} className="text-orange-400" /> Ficha de Lead
            </span>
            <button
              onClick={() => setShowLeadDetails(false)}
              className="text-neutral-500 hover:text-neutral-300 text-xs font-semibold bg-neutral-950/50 hover:bg-neutral-800 px-2.5 py-1 rounded-md border border-neutral-800"
            >
              Cerrar
            </button>
          </div>

          <div className="space-y-4">
            <div>
              <label className="text-[10px] text-neutral-500 font-bold uppercase tracking-wider block mb-1">Nombre Comercial</label>
              <div className="text-sm font-semibold text-white">{selectedLead.name}</div>
            </div>
            
            <div>
              <label className="text-[10px] text-neutral-500 font-bold uppercase tracking-wider block mb-1">WhatsApp de Contacto</label>
              <div className="text-sm font-mono text-neutral-300">+{selectedLead.phone}</div>
            </div>

            <div>
              <label className="text-[10px] text-neutral-500 font-bold uppercase tracking-wider block mb-1">Canal de Origen</label>
              <span className="inline-flex items-center gap-1 text-xs px-2 py-0.5 bg-neutral-950/60 border border-neutral-800 text-amber-400 rounded-md font-medium">
                {selectedLead.source || "WhatsApp Direct"}
              </span>
            </div>

            <div>
              <label className="text-[10px] text-neutral-500 font-bold uppercase tracking-wider block mb-1">Etapa Comercial</label>
              <div className="mt-1">
                <span className="inline-flex text-xs px-2.5 py-1 rounded bg-orange-950/50 border border-orange-900/40 text-orange-400 font-medium">
                  {STAGES.find(s => s.id === selectedLead.stage_id)?.name || "Sin definir"}
                </span>
              </div>
            </div>
          </div>

          <div className="border-t border-neutral-800 pt-4 space-y-3">
            <label className="text-[10px] text-neutral-500 font-bold uppercase tracking-wider flex items-center gap-1.5">
              <FileText size={13} className="text-orange-400" /> Notas Internas (CRM)
            </label>
            <div className="p-3 rounded-xl bg-neutral-950/60 border border-neutral-800/80 text-xs text-neutral-400 italic leading-relaxed">
              &quot;Prospecto interesado en automatización de procesos mayoristas mediante procesamiento de audios y textos con GPT-4. Agendó llamada de evaluación.&quot;
            </div>
            <span className="text-[9px] text-neutral-600 block text-right font-medium">
              Nota cargada por: Facundo el {new Date(selectedLead.created_at).toLocaleDateString()}
            </span>
          </div>

          <div className="border-t border-neutral-800 pt-4 flex flex-col gap-2">
            <button
              onClick={() => handleOpenChatFromLead(selectedLead.id)}
              className="w-full py-2 bg-gradient-to-r from-orange-500 to-amber-500 text-white rounded-lg text-xs font-semibold shadow-md shadow-orange-500/10 hover:shadow-orange-500/20 transition-all flex items-center justify-center gap-1.5"
            >
              <MessageSquare size={13} /> Abrir Conversación
            </button>
          </div>
        </aside>
      )}

      {/* MODAL: AÑADIR LEAD */}
      {showAddLeadModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-neutral-900 border border-neutral-800 rounded-2xl w-full max-w-md p-6 shadow-2xl relative">
            <div className="flex justify-between items-center mb-6 pb-3 border-b border-neutral-800">
              <h3 className="font-bold text-lg text-white">Nuevo Prospecto (Lead)</h3>
              <button
                onClick={() => setShowAddLeadModal(false)}
                className="text-neutral-400 hover:text-neutral-200 text-sm font-semibold bg-neutral-800 hover:bg-neutral-700 w-6 h-6 rounded-full flex items-center justify-center"
              >
                &times;
              </button>
            </div>

            <form onSubmit={handleCreateLead} className="space-y-4">
              <div>
                <label className="block text-[10px] text-neutral-500 font-bold uppercase tracking-wider mb-1">Nombre del Lead</label>
                <input
                  type="text"
                  required
                  placeholder="Ej: Alejandro Silva (Mayorista)"
                  value={newLeadForm.name}
                  onChange={(e) => setNewLeadForm({ ...newLeadForm, name: e.target.value })}
                  className="w-full bg-neutral-950/60 border border-neutral-800 text-neutral-200 placeholder-neutral-500 text-sm px-3 py-2 rounded-lg focus:outline-none focus:border-orange-600 transition-colors"
                />
              </div>

              <div>
                <label className="block text-[10px] text-neutral-500 font-bold uppercase tracking-wider mb-1">Teléfono (WhatsApp)</label>
                <input
                  type="text"
                  required
                  placeholder="Ej: 5491132456789"
                  value={newLeadForm.phone}
                  onChange={(e) => setNewLeadForm({ ...newLeadForm, phone: e.target.value })}
                  className="w-full bg-neutral-950/60 border border-neutral-800 text-neutral-200 placeholder-neutral-500 text-sm px-3 py-2 rounded-lg focus:outline-none focus:border-orange-600 transition-colors"
                />
              </div>

              <div>
                <label className="block text-[10px] text-neutral-500 font-bold uppercase tracking-wider mb-1">Canal de Origen</label>
                <input
                  type="text"
                  placeholder="Ej: Instagram Ads, Google, Referido"
                  value={newLeadForm.source}
                  onChange={(e) => setNewLeadForm({ ...newLeadForm, source: e.target.value })}
                  className="w-full bg-neutral-950/60 border border-neutral-800 text-neutral-200 placeholder-neutral-500 text-sm px-3 py-2 rounded-lg focus:outline-none focus:border-orange-600 transition-colors"
                />
              </div>

              <div>
                <label className="block text-[10px] text-neutral-500 font-bold uppercase tracking-wider mb-1">Etapa del Embudo</label>
                <select
                  value={newLeadForm.stageId}
                  onChange={(e) => setNewLeadForm({ ...newLeadForm, stageId: e.target.value })}
                  className="w-full bg-neutral-950/60 border border-neutral-800 text-neutral-200 text-sm px-3 py-2 rounded-lg focus:outline-none focus:border-orange-600 transition-colors"
                >
                  {STAGES.map(s => (
                    <option key={s.id} value={s.id}>{s.name}</option>
                  ))}
                </select>
              </div>

              <div className="flex gap-3 pt-4 border-t border-neutral-800">
                <button
                  type="button"
                  onClick={() => setShowAddLeadModal(false)}
                  className="flex-1 py-2 rounded-lg bg-neutral-800 hover:bg-neutral-700/80 text-xs font-semibold text-neutral-300"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2 bg-gradient-to-r from-orange-500 to-amber-500 text-white rounded-lg text-xs font-semibold shadow-md shadow-orange-500/10 hover:shadow-orange-500/20 transition-all"
                >
                  Guardar Lead y Chat
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
