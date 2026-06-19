import { Request, Response, NextFunction } from 'express';
import { supabase } from '../supabase.js';

export interface AuthenticatedRequest extends Request {
  user?: {
    id: string;
    email: string;
    name: string;
    role: 'owner' | 'agent';
    workspace_id: string;
  };
}

/**
 * Middleware para requerir autenticación JWT de Supabase.
 * Extrae el token del header Authorization, lo verifica con Supabase
 * y busca el perfil del usuario en la tabla pública de usuarios del CRM.
 */
export async function requireAuth(req: Request, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    res.status(401).json({ error: 'Falta cabecera de autenticación o formato inválido (debe ser Bearer)' });
    return;
  }

  const token = authHeader.split(' ')[1];

  try {
    // 1. Validar el token con Supabase Auth
    const { data: { user: authUser }, error: authError } = await supabase.auth.getUser(token);

    if (authError || !authUser) {
      res.status(401).json({ error: 'Token de sesión inválido o expirado' });
      return;
    }

    // 2. Obtener el perfil público del CRM (contiene el workspace_id y rol)
    const { data: profile, error: profileError } = await supabase
      .from('users')
      .select('id, email, name, role, workspace_id')
      .eq('id', authUser.id)
      .single();

    if (profileError || !profile) {
      res.status(403).json({ error: 'El usuario no tiene un perfil configurado en este CRM' });
      return;
    }

    // 3. Adjuntar la información del usuario autenticado a la petición
    (req as AuthenticatedRequest).user = {
      id: profile.id,
      email: profile.email,
      name: profile.name,
      role: profile.role as 'owner' | 'agent',
      workspace_id: profile.workspace_id
    };

    next();
  } catch (err: any) {
    console.error('Error en requireAuth Middleware:', err);
    res.status(500).json({ error: 'Error interno de autenticación' });
  }
}
