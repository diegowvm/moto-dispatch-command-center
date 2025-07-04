export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  public: {
    Tables: {
      empresas: {
        Row: {
          bairro: string | null
          cep: string | null
          cidade: string
          cnpj: string | null
          contato_responsavel: string | null
          created_at: string
          email_contato: string | null
          endereco: string
          estado: string
          id: string
          nome_fantasia: string
          razao_social: string
          status: boolean
          telefone: string | null
          updated_at: string
          usuario_id: string
        }
        Insert: {
          bairro?: string | null
          cep?: string | null
          cidade: string
          cnpj?: string | null
          contato_responsavel?: string | null
          created_at?: string
          email_contato?: string | null
          endereco: string
          estado: string
          id?: string
          nome_fantasia: string
          razao_social: string
          status?: boolean
          telefone?: string | null
          updated_at?: string
          usuario_id: string
        }
        Update: {
          bairro?: string | null
          cep?: string | null
          cidade?: string
          cnpj?: string | null
          contato_responsavel?: string | null
          created_at?: string
          email_contato?: string | null
          endereco?: string
          estado?: string
          id?: string
          nome_fantasia?: string
          razao_social?: string
          status?: boolean
          telefone?: string | null
          updated_at?: string
          usuario_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "empresas_usuario_id_fkey"
            columns: ["usuario_id"]
            isOneToOne: false
            referencedRelation: "usuarios"
            referencedColumns: ["id"]
          },
        ]
      }
      entregadores: {
        Row: {
          avaliacao_media: number | null
          cnh: string
          cpf: string
          created_at: string
          foto_perfil: string | null
          id: string
          status: Database["public"]["Enums"]["status_entregador"]
          telefone: string | null
          total_entregas: number | null
          updated_at: string
          usuario_id: string
          veiculo_cor: string | null
          veiculo_modelo: string | null
          veiculo_placa: string
          veiculo_tipo: string
        }
        Insert: {
          avaliacao_media?: number | null
          cnh: string
          cpf: string
          created_at?: string
          foto_perfil?: string | null
          id?: string
          status?: Database["public"]["Enums"]["status_entregador"]
          telefone?: string | null
          total_entregas?: number | null
          updated_at?: string
          usuario_id: string
          veiculo_cor?: string | null
          veiculo_modelo?: string | null
          veiculo_placa: string
          veiculo_tipo: string
        }
        Update: {
          avaliacao_media?: number | null
          cnh?: string
          cpf?: string
          created_at?: string
          foto_perfil?: string | null
          id?: string
          status?: Database["public"]["Enums"]["status_entregador"]
          telefone?: string | null
          total_entregas?: number | null
          updated_at?: string
          usuario_id?: string
          veiculo_cor?: string | null
          veiculo_modelo?: string | null
          veiculo_placa?: string
          veiculo_tipo?: string
        }
        Relationships: [
          {
            foreignKeyName: "entregadores_usuario_id_fkey"
            columns: ["usuario_id"]
            isOneToOne: false
            referencedRelation: "usuarios"
            referencedColumns: ["id"]
          },
        ]
      }
      localizacao_tempo_real: {
        Row: {
          direcao: number | null
          entregador_id: string
          id: string
          latitude: number
          longitude: number
          precisao: number | null
          status: Database["public"]["Enums"]["status_entregador"]
          timestamp: string
          velocidade: number | null
        }
        Insert: {
          direcao?: number | null
          entregador_id: string
          id?: string
          latitude: number
          longitude: number
          precisao?: number | null
          status: Database["public"]["Enums"]["status_entregador"]
          timestamp?: string
          velocidade?: number | null
        }
        Update: {
          direcao?: number | null
          entregador_id?: string
          id?: string
          latitude?: number
          longitude?: number
          precisao?: number | null
          status?: Database["public"]["Enums"]["status_entregador"]
          timestamp?: string
          velocidade?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "localizacao_tempo_real_entregador_id_fkey"
            columns: ["entregador_id"]
            isOneToOne: true
            referencedRelation: "entregadores"
            referencedColumns: ["id"]
          },
        ]
      }
      logs_sistema: {
        Row: {
          dados_anteriores: Json | null
          dados_novos: Json | null
          descricao: string
          entregador_id: string | null
          id: string
          ip_address: unknown | null
          pedido_id: string | null
          timestamp: string
          tipo_evento: Database["public"]["Enums"]["tipo_evento"]
          user_agent: string | null
          usuario_id: string | null
        }
        Insert: {
          dados_anteriores?: Json | null
          dados_novos?: Json | null
          descricao: string
          entregador_id?: string | null
          id?: string
          ip_address?: unknown | null
          pedido_id?: string | null
          timestamp?: string
          tipo_evento: Database["public"]["Enums"]["tipo_evento"]
          user_agent?: string | null
          usuario_id?: string | null
        }
        Update: {
          dados_anteriores?: Json | null
          dados_novos?: Json | null
          descricao?: string
          entregador_id?: string | null
          id?: string
          ip_address?: unknown | null
          pedido_id?: string | null
          timestamp?: string
          tipo_evento?: Database["public"]["Enums"]["tipo_evento"]
          user_agent?: string | null
          usuario_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "logs_sistema_entregador_id_fkey"
            columns: ["entregador_id"]
            isOneToOne: false
            referencedRelation: "entregadores"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "logs_sistema_pedido_id_fkey"
            columns: ["pedido_id"]
            isOneToOne: false
            referencedRelation: "pedidos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "logs_sistema_usuario_id_fkey"
            columns: ["usuario_id"]
            isOneToOne: false
            referencedRelation: "usuarios"
            referencedColumns: ["id"]
          },
        ]
      }
      mensagens: {
        Row: {
          anexo_url: string | null
          created_at: string
          id: string
          lida_em: string | null
          mensagem: string
          pedido_id: string | null
          status: boolean
          usuario_destino_id: string
          usuario_origem_id: string
        }
        Insert: {
          anexo_url?: string | null
          created_at?: string
          id?: string
          lida_em?: string | null
          mensagem: string
          pedido_id?: string | null
          status?: boolean
          usuario_destino_id: string
          usuario_origem_id: string
        }
        Update: {
          anexo_url?: string | null
          created_at?: string
          id?: string
          lida_em?: string | null
          mensagem?: string
          pedido_id?: string | null
          status?: boolean
          usuario_destino_id?: string
          usuario_origem_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "mensagens_pedido_id_fkey"
            columns: ["pedido_id"]
            isOneToOne: false
            referencedRelation: "pedidos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "mensagens_usuario_destino_id_fkey"
            columns: ["usuario_destino_id"]
            isOneToOne: false
            referencedRelation: "usuarios"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "mensagens_usuario_origem_id_fkey"
            columns: ["usuario_origem_id"]
            isOneToOne: false
            referencedRelation: "usuarios"
            referencedColumns: ["id"]
          },
        ]
      }
      pedidos: {
        Row: {
          bairro_coleta: string | null
          bairro_entrega: string | null
          cep_coleta: string | null
          cep_entrega: string | null
          cidade_coleta: string
          cidade_entrega: string
          contato_coleta: string | null
          contato_entrega: string | null
          created_at: string
          data_atribuicao: string | null
          data_chegada_entrega: string | null
          data_criacao: string
          data_finalizacao: string | null
          data_saida_coleta: string | null
          descricao_produto: string | null
          empresa_id: string
          endereco_coleta: string
          endereco_entrega: string
          entregador_id: string | null
          id: string
          numero_pedido: string
          observacoes: string | null
          observacoes_entregador: string | null
          status: Database["public"]["Enums"]["status_pedido"]
          telefone_coleta: string | null
          telefone_entrega: string | null
          updated_at: string
          valor_frete: number
          valor_produto: number | null
          valor_total: number | null
        }
        Insert: {
          bairro_coleta?: string | null
          bairro_entrega?: string | null
          cep_coleta?: string | null
          cep_entrega?: string | null
          cidade_coleta: string
          cidade_entrega: string
          contato_coleta?: string | null
          contato_entrega?: string | null
          created_at?: string
          data_atribuicao?: string | null
          data_chegada_entrega?: string | null
          data_criacao?: string
          data_finalizacao?: string | null
          data_saida_coleta?: string | null
          descricao_produto?: string | null
          empresa_id: string
          endereco_coleta: string
          endereco_entrega: string
          entregador_id?: string | null
          id?: string
          numero_pedido?: string
          observacoes?: string | null
          observacoes_entregador?: string | null
          status?: Database["public"]["Enums"]["status_pedido"]
          telefone_coleta?: string | null
          telefone_entrega?: string | null
          updated_at?: string
          valor_frete: number
          valor_produto?: number | null
          valor_total?: number | null
        }
        Update: {
          bairro_coleta?: string | null
          bairro_entrega?: string | null
          cep_coleta?: string | null
          cep_entrega?: string | null
          cidade_coleta?: string
          cidade_entrega?: string
          contato_coleta?: string | null
          contato_entrega?: string | null
          created_at?: string
          data_atribuicao?: string | null
          data_chegada_entrega?: string | null
          data_criacao?: string
          data_finalizacao?: string | null
          data_saida_coleta?: string | null
          descricao_produto?: string | null
          empresa_id?: string
          endereco_coleta?: string
          endereco_entrega?: string
          entregador_id?: string | null
          id?: string
          numero_pedido?: string
          observacoes?: string | null
          observacoes_entregador?: string | null
          status?: Database["public"]["Enums"]["status_pedido"]
          telefone_coleta?: string | null
          telefone_entrega?: string | null
          updated_at?: string
          valor_frete?: number
          valor_produto?: number | null
          valor_total?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "pedidos_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pedidos_entregador_id_fkey"
            columns: ["entregador_id"]
            isOneToOne: false
            referencedRelation: "entregadores"
            referencedColumns: ["id"]
          },
        ]
      }
      usuarios: {
        Row: {
          auth_user_id: string | null
          created_at: string
          email: string
          id: string
          nome: string
          status: boolean
          telefone: string | null
          tipo: Database["public"]["Enums"]["tipo_usuario"]
          updated_at: string
        }
        Insert: {
          auth_user_id?: string | null
          created_at?: string
          email: string
          id?: string
          nome: string
          status?: boolean
          telefone?: string | null
          tipo: Database["public"]["Enums"]["tipo_usuario"]
          updated_at?: string
        }
        Update: {
          auth_user_id?: string | null
          created_at?: string
          email?: string
          id?: string
          nome?: string
          status?: boolean
          telefone?: string | null
          tipo?: Database["public"]["Enums"]["tipo_usuario"]
          updated_at?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      get_current_user_empresa_id: {
        Args: Record<PropertyKey, never>
        Returns: string
      }
      get_current_user_entregador_id: {
        Args: Record<PropertyKey, never>
        Returns: string
      }
      get_current_user_id: {
        Args: Record<PropertyKey, never>
        Returns: string
      }
      get_current_user_type: {
        Args: Record<PropertyKey, never>
        Returns: Database["public"]["Enums"]["tipo_usuario"]
      }
      is_current_user_admin: {
        Args: Record<PropertyKey, never>
        Returns: boolean
      }
    }
    Enums: {
      status_entregador: "disponivel" | "ocupado" | "offline" | "em_entrega"
      status_pedido:
        | "recebido"
        | "enviado"
        | "a_caminho"
        | "entregue"
        | "cancelado"
      tipo_evento:
        | "pedido_criado"
        | "entregador_atribuido"
        | "status_atualizado"
        | "localização_atualizada"
        | "mensagem_enviada"
      tipo_usuario: "admin" | "empresa" | "entregador"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DefaultSchema = Database[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof Database },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof (Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        Database[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof Database }
  ? (Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      Database[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof Database },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof Database }
  ? Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof Database },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof Database }
  ? Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof Database },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends { schema: keyof Database }
  ? Database[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof Database },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends { schema: keyof Database }
  ? Database[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      status_entregador: ["disponivel", "ocupado", "offline", "em_entrega"],
      status_pedido: [
        "recebido",
        "enviado",
        "a_caminho",
        "entregue",
        "cancelado",
      ],
      tipo_evento: [
        "pedido_criado",
        "entregador_atribuido",
        "status_atualizado",
        "localização_atualizada",
        "mensagem_enviada",
      ],
      tipo_usuario: ["admin", "empresa", "entregador"],
    },
  },
} as const
