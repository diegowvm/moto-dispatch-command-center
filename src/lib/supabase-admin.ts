import { createClient } from '@supabase/supabase-js';
import { env } from './env';
import type { Database } from '@/integrations/supabase/types';

// Cliente administrativo com service role key
export const supabaseAdmin = createClient<Database>(
  env.supabase.url,
  env.supabase.serviceRoleKey,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
    db: {
      schema: 'public',
    },
  }
);

// Funções administrativas otimizadas
export const adminOperations = {
  // Buscar localizações ativas com limite
  async getActiveDeliveryLocations(limit = 100) {
    const { data, error } = await supabaseAdmin.rpc('get_active_delivery_locations', {
      limit_count: limit,
    });

    if (error) {
      console.error('Error fetching active delivery locations:', error);
      throw error;
    }

    return data;
  },

  // Buscar estatísticas do dashboard
  async getDashboardStats() {
    const { data, error } = await supabaseAdmin.rpc('get_dashboard_stats');

    if (error) {
      console.error('Error fetching dashboard stats:', error);
      throw error;
    }

    return data;
  },

  // Criar usuário administrativo
  async createAdminUser(email: string, password: string, userData: {
    nome: string;
    telefone?: string;
  }) {
    // Criar usuário no auth
    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
    });

    if (authError) {
      console.error('Error creating auth user:', authError);
      throw authError;
    }

    // Criar registro na tabela usuarios
    const { data: userRecord, error: userError } = await supabaseAdmin
      .from('usuarios')
      .insert({
        auth_user_id: authData.user.id,
        nome: userData.nome,
        email,
        tipo: 'admin',
        telefone: userData.telefone,
      })
      .select()
      .single();

    if (userError) {
      console.error('Error creating user record:', userError);
      // Cleanup: delete auth user if user record creation fails
      await supabaseAdmin.auth.admin.deleteUser(authData.user.id);
      throw userError;
    }

    return { authUser: authData.user, userRecord };
  },

  // Atualizar status do entregador
  async updateDeliveryStatus(entregadorId: string, status: 'disponivel' | 'ocupado' | 'offline' | 'em_entrega') {
    const { data, error } = await supabaseAdmin
      .from('entregadores')
      .update({ status })
      .eq('id', entregadorId)
      .select()
      .single();

    if (error) {
      console.error('Error updating delivery status:', error);
      throw error;
    }

    return data;
  },

  // Buscar entregadores com paginação
  async getDeliveryPersons(page = 1, limit = 20, status?: string) {
    let query = supabaseAdmin
      .from('entregadores')
      .select(`
        *,
        usuarios!inner(id, nome, email, telefone, status)
      `)
      .order('created_at', { ascending: false })
      .range((page - 1) * limit, page * limit - 1);

    if (status) {
      query = query.eq('status', status);
    }

    const { data, error, count } = await query;

    if (error) {
      console.error('Error fetching delivery persons:', error);
      throw error;
    }

    return { data, count, totalPages: Math.ceil((count || 0) / limit) };
  },

  // Buscar pedidos com paginação e filtros
  async getOrders(page = 1, limit = 20, filters?: {
    status?: string;
    empresaId?: string;
    entregadorId?: string;
    dateFrom?: string;
    dateTo?: string;
  }) {
    let query = supabaseAdmin
      .from('pedidos')
      .select(`
        *,
        empresas!inner(nome_fantasia),
        entregadores(
          id,
          usuarios!inner(nome)
        )
      `)
      .order('created_at', { ascending: false })
      .range((page - 1) * limit, page * limit - 1);

    if (filters?.status) {
      query = query.eq('status', filters.status);
    }

    if (filters?.empresaId) {
      query = query.eq('empresa_id', filters.empresaId);
    }

    if (filters?.entregadorId) {
      query = query.eq('entregador_id', filters.entregadorId);
    }

    if (filters?.dateFrom) {
      query = query.gte('created_at', filters.dateFrom);
    }

    if (filters?.dateTo) {
      query = query.lte('created_at', filters.dateTo);
    }

    const { data, error, count } = await query;

    if (error) {
      console.error('Error fetching orders:', error);
      throw error;
    }

    return { data, count, totalPages: Math.ceil((count || 0) / limit) };
  },

  // Verificar saúde do sistema
  async checkSystemHealth() {
    try {
      const [locationsCount, ordersCount, deliveryPersonsCount] = await Promise.all([
        supabaseAdmin.from('localizacao_tempo_real').select('id', { count: 'exact', head: true }),
        supabaseAdmin.from('pedidos').select('id', { count: 'exact', head: true }),
        supabaseAdmin.from('entregadores').select('id', { count: 'exact', head: true }),
      ]);

      return {
        status: 'healthy',
        counts: {
          locations: locationsCount.count || 0,
          orders: ordersCount.count || 0,
          deliveryPersons: deliveryPersonsCount.count || 0,
        },
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      console.error('System health check failed:', error);
      return {
        status: 'unhealthy',
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString(),
      };
    }
  },
};

