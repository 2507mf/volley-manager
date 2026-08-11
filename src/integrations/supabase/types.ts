export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.15"
  }
  public: {
    Tables: {
      organizacoes: {
        Row: {
          cor: string
          criado_por: string | null
          created_at: string
          descricao: string | null
          icone: string
          id: string
          logo_url: string | null
          nome: string
          updated_at: string
        }
        Insert: {
          cor?: string
          criado_por?: string | null
          created_at?: string
          descricao?: string | null
          icone?: string
          id?: string
          logo_url?: string | null
          nome: string
          updated_at?: string
        }
        Update: {
          cor?: string
          criado_por?: string | null
          created_at?: string
          descricao?: string | null
          icone?: string
          id?: string
          logo_url?: string | null
          nome?: string
          updated_at?: string
        }
        Relationships: []
      }
      organizacao_membros: {
        Row: {
          created_at: string
          id: string
          organizacao_id: string
          papel: Database["public"]["Enums"]["papel_membro"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          organizacao_id: string
          papel?: Database["public"]["Enums"]["papel_membro"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          organizacao_id?: string
          papel?: Database["public"]["Enums"]["papel_membro"]
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "organizacao_membros_organizacao_id_fkey"
            columns: ["organizacao_id"]
            isOneToOne: false
            referencedRelation: "organizacoes"
            referencedColumns: ["id"]
          },
        ]
      }
      perfis: {
        Row: {
          created_at: string
          email: string | null
          id: string
          nome: string | null
          super_admin: boolean
        }
        Insert: {
          created_at?: string
          email?: string | null
          id: string
          nome?: string | null
          super_admin?: boolean
        }
        Update: {
          nome?: string | null
        }
        Relationships: []
      }
      gastos: {
        Row: {
          categoria: string
          comprovante_url: string | null
          created_at: string
          data: string
          descricao: string
          id: string
          organizacao_id: string
          responsavel: string | null
          user_id: string
          valor: number
        }
        Insert: {
          categoria?: string
          comprovante_url?: string | null
          created_at?: string
          data?: string
          descricao: string
          id?: string
          organizacao_id?: string
          responsavel?: string | null
          user_id: string
          valor: number
        }
        Update: {
          categoria?: string
          comprovante_url?: string | null
          created_at?: string
          data?: string
          descricao?: string
          id?: string
          organizacao_id?: string
          responsavel?: string | null
          user_id?: string
          valor?: number
        }
        Relationships: []
      }
      inscricoes_mensais: {
        Row: {
          created_at: string
          id: string
          organizacao_id: string
          participante_id: string
          referencia: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          organizacao_id?: string
          participante_id: string
          referencia: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          organizacao_id?: string
          participante_id?: string
          referencia?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "inscricoes_mensais_participante_id_fkey"
            columns: ["participante_id"]
            isOneToOne: false
            referencedRelation: "participantes"
            referencedColumns: ["id"]
          },
        ]
      }
      pagamentos: {
        Row: {
          created_at: string
          data_pagamento: string
          forma_pagamento: Database["public"]["Enums"]["forma_pagamento"]
          id: string
          organizacao_id: string
          observacao: string | null
          participante_id: string
          referencia: string
          user_id: string
          valor: number
        }
        Insert: {
          created_at?: string
          data_pagamento?: string
          forma_pagamento?: Database["public"]["Enums"]["forma_pagamento"]
          id?: string
          organizacao_id?: string
          observacao?: string | null
          participante_id: string
          referencia: string
          user_id: string
          valor: number
        }
        Update: {
          created_at?: string
          data_pagamento?: string
          forma_pagamento?: Database["public"]["Enums"]["forma_pagamento"]
          id?: string
          organizacao_id?: string
          observacao?: string | null
          participante_id?: string
          referencia?: string
          user_id?: string
          valor?: number
        }
        Relationships: [
          {
            foreignKeyName: "pagamentos_participante_id_fkey"
            columns: ["participante_id"]
            isOneToOne: false
            referencedRelation: "participantes"
            referencedColumns: ["id"]
          },
        ]
      }
      participantes: {
        Row: {
          apelido: string | null
          created_at: string
          data_entrada: string
          data_nascimento: string | null
          foto_url: string | null
          id: string
          organizacao_id: string
          nome: string
          numero: number | null
          status: Database["public"]["Enums"]["status_participante"]
          telefone: string | null
          tipo_plano: Database["public"]["Enums"]["tipo_plano"]
          updated_at: string
          user_id: string
          valor_plano: number
        }
        Insert: {
          apelido?: string | null
          created_at?: string
          data_entrada?: string
          data_nascimento?: string | null
          foto_url?: string | null
          id?: string
          organizacao_id?: string
          nome: string
          numero?: number | null
          status?: Database["public"]["Enums"]["status_participante"]
          telefone?: string | null
          tipo_plano?: Database["public"]["Enums"]["tipo_plano"]
          updated_at?: string
          user_id: string
          valor_plano?: number
        }
        Update: {
          apelido?: string | null
          created_at?: string
          data_entrada?: string
          data_nascimento?: string | null
          foto_url?: string | null
          id?: string
          organizacao_id?: string
          nome?: string
          numero?: number | null
          status?: Database["public"]["Enums"]["status_participante"]
          telefone?: string | null
          tipo_plano?: Database["public"]["Enums"]["tipo_plano"]
          updated_at?: string
          user_id?: string
          valor_plano?: number
        }
        Relationships: []
      }
      receitas: {
        Row: {
          categoria: string
          created_at: string
          data: string
          descricao: string
          id: string
          organizacao_id: string
          user_id: string
          valor: number
        }
        Insert: {
          categoria?: string
          created_at?: string
          data?: string
          descricao: string
          id?: string
          organizacao_id?: string
          user_id: string
          valor: number
        }
        Update: {
          categoria?: string
          created_at?: string
          data?: string
          descricao?: string
          id?: string
          organizacao_id?: string
          user_id?: string
          valor?: number
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      criar_organizacao: {
        Args: { p_nome: string; p_icone?: string; p_cor?: string }
        Returns: string
      }
      adicionar_membro: {
        Args: {
          p_org: string
          p_email: string
          p_papel?: Database["public"]["Enums"]["papel_membro"]
        }
        Returns: string
      }
      is_super_admin: {
        Args: Record<string, never>
        Returns: boolean
      }
    }
    Enums: {
      papel_membro: "dono" | "admin" | "membro"
      categoria_gasto:
        | "quadra"
        | "material"
        | "uniformes"
        | "agua_gelo"
        | "confraternizacao"
        | "manutencao"
        | "outros"
      forma_pagamento: "pix" | "dinheiro" | "cartao" | "transferencia"
      status_participante: "ativo" | "inativo"
      tipo_plano: "mensalista" | "anual" | "avulso"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
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
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
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
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
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
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      categoria_gasto: [
        "quadra",
        "material",
        "uniformes",
        "agua_gelo",
        "confraternizacao",
        "manutencao",
        "outros",
      ],
      forma_pagamento: ["pix", "dinheiro", "cartao", "transferencia"],
      status_participante: ["ativo", "inativo"],
      tipo_plano: ["mensalista", "anual", "avulso"],
    },
  },
} as const
