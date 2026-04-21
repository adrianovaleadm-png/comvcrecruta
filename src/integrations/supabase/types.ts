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
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      activity_events: {
        Row: {
          created_at: string
          entity_id: string
          entity_type: string
          id: string
          message: string
          metadata: Json | null
          type: string
        }
        Insert: {
          created_at?: string
          entity_id: string
          entity_type: string
          id?: string
          message: string
          metadata?: Json | null
          type: string
        }
        Update: {
          created_at?: string
          entity_id?: string
          entity_type?: string
          id?: string
          message?: string
          metadata?: Json | null
          type?: string
        }
        Relationships: []
      }
      application_checklist: {
        Row: {
          acao: string
          application_id: string
          concluido: boolean
          concluido_em: string | null
          created_at: string
          id: string
          stage_id: string
        }
        Insert: {
          acao: string
          application_id: string
          concluido?: boolean
          concluido_em?: string | null
          created_at?: string
          id?: string
          stage_id: string
        }
        Update: {
          acao?: string
          application_id?: string
          concluido?: boolean
          concluido_em?: string | null
          created_at?: string
          id?: string
          stage_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "application_checklist_application_id_fkey"
            columns: ["application_id"]
            isOneToOne: false
            referencedRelation: "applications"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "application_checklist_stage_id_fkey"
            columns: ["stage_id"]
            isOneToOne: false
            referencedRelation: "stages"
            referencedColumns: ["id"]
          },
        ]
      }
      applications: {
        Row: {
          candidate_id: string | null
          created_at: string
          id: string
          job_id: string
          stage_id: string
          status: string
          updated_at: string
        }
        Insert: {
          candidate_id?: string | null
          created_at?: string
          id?: string
          job_id: string
          stage_id: string
          status?: string
          updated_at?: string
        }
        Update: {
          candidate_id?: string | null
          created_at?: string
          id?: string
          job_id?: string
          stage_id?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "applications_candidate_id_fkey"
            columns: ["candidate_id"]
            isOneToOne: false
            referencedRelation: "candidates"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "applications_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "jobs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "applications_stage_id_fkey"
            columns: ["stage_id"]
            isOneToOne: false
            referencedRelation: "stages"
            referencedColumns: ["id"]
          },
        ]
      }
      candidate_files: {
        Row: {
          candidate_id: string
          created_at: string
          id: string
          name: string | null
          type: string
          url: string
        }
        Insert: {
          candidate_id: string
          created_at?: string
          id?: string
          name?: string | null
          type?: string
          url: string
        }
        Update: {
          candidate_id?: string
          created_at?: string
          id?: string
          name?: string | null
          type?: string
          url?: string
        }
        Relationships: [
          {
            foreignKeyName: "candidate_files_candidate_id_fkey"
            columns: ["candidate_id"]
            isOneToOne: false
            referencedRelation: "candidates"
            referencedColumns: ["id"]
          },
        ]
      }
      candidate_scores: {
        Row: {
          ai_summary: string | null
          candidate_id: string
          created_at: string
          criteria_scores: Json
          id: string
          job_id: string
          overall_score: number
        }
        Insert: {
          ai_summary?: string | null
          candidate_id: string
          created_at?: string
          criteria_scores?: Json
          id?: string
          job_id: string
          overall_score?: number
        }
        Update: {
          ai_summary?: string | null
          candidate_id?: string
          created_at?: string
          criteria_scores?: Json
          id?: string
          job_id?: string
          overall_score?: number
        }
        Relationships: [
          {
            foreignKeyName: "candidate_scores_candidate_id_fkey"
            columns: ["candidate_id"]
            isOneToOne: false
            referencedRelation: "candidates"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "candidate_scores_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "jobs"
            referencedColumns: ["id"]
          },
        ]
      }
      candidate_tags: {
        Row: {
          candidate_id: string
          tag_id: string
        }
        Insert: {
          candidate_id: string
          tag_id: string
        }
        Update: {
          candidate_id?: string
          tag_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "candidate_tags_candidate_id_fkey"
            columns: ["candidate_id"]
            isOneToOne: false
            referencedRelation: "candidates"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "candidate_tags_tag_id_fkey"
            columns: ["tag_id"]
            isOneToOne: false
            referencedRelation: "tags"
            referencedColumns: ["id"]
          },
        ]
      }
      candidates: {
        Row: {
          city: string | null
          created_at: string
          email: string
          id: string
          linkedin_url: string | null
          name: string
          phone: string | null
          profile_id: string | null
          summary: string | null
        }
        Insert: {
          city?: string | null
          created_at?: string
          email: string
          id?: string
          linkedin_url?: string | null
          name: string
          phone?: string | null
          profile_id?: string | null
          summary?: string | null
        }
        Update: {
          city?: string | null
          created_at?: string
          email?: string
          id?: string
          linkedin_url?: string | null
          name?: string
          phone?: string | null
          profile_id?: string | null
          summary?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "candidates_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      companies: {
        Row: {
          ambiente_trabalho: string | null
          beneficios: string[] | null
          cnpj: string
          created_at: string
          descricao: string | null
          diferenciais: string[] | null
          endereco: string | null
          id: string
          instagram_url: string | null
          linkedin_url: string | null
          logo_url: string | null
          missao: string | null
          modelo_trabalho: string | null
          nome_fantasia: string
          politicas_dei: string | null
          proposito: string | null
          razao_social: string
          setor: string | null
          status_onboarding: string
          tamanho: string | null
          telefone_comercial: string | null
          updated_at: string
          valores: string | null
          visao: string | null
          website: string | null
        }
        Insert: {
          ambiente_trabalho?: string | null
          beneficios?: string[] | null
          cnpj: string
          created_at?: string
          descricao?: string | null
          diferenciais?: string[] | null
          endereco?: string | null
          id?: string
          instagram_url?: string | null
          linkedin_url?: string | null
          logo_url?: string | null
          missao?: string | null
          modelo_trabalho?: string | null
          nome_fantasia: string
          politicas_dei?: string | null
          proposito?: string | null
          razao_social: string
          setor?: string | null
          status_onboarding?: string
          tamanho?: string | null
          telefone_comercial?: string | null
          updated_at?: string
          valores?: string | null
          visao?: string | null
          website?: string | null
        }
        Update: {
          ambiente_trabalho?: string | null
          beneficios?: string[] | null
          cnpj?: string
          created_at?: string
          descricao?: string | null
          diferenciais?: string[] | null
          endereco?: string | null
          id?: string
          instagram_url?: string | null
          linkedin_url?: string | null
          logo_url?: string | null
          missao?: string | null
          modelo_trabalho?: string | null
          nome_fantasia?: string
          politicas_dei?: string | null
          proposito?: string | null
          razao_social?: string
          setor?: string | null
          status_onboarding?: string
          tamanho?: string | null
          telefone_comercial?: string | null
          updated_at?: string
          valores?: string | null
          visao?: string | null
          website?: string | null
        }
        Relationships: []
      }
      company_members: {
        Row: {
          cargo: string | null
          company_id: string
          created_at: string
          id: string
          role_empresa: Database["public"]["Enums"]["role_empresa"]
          updated_at: string
          user_id: string
        }
        Insert: {
          cargo?: string | null
          company_id: string
          created_at?: string
          id?: string
          role_empresa?: Database["public"]["Enums"]["role_empresa"]
          updated_at?: string
          user_id: string
        }
        Update: {
          cargo?: string | null
          company_id?: string
          created_at?: string
          id?: string
          role_empresa?: Database["public"]["Enums"]["role_empresa"]
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "company_members_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "company_members_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      job_templates: {
        Row: {
          created_at: string
          department: string | null
          description: string | null
          id: string
          required_skills: string[] | null
          score_weights: Json | null
          screening_questions: Json | null
          seniority: string | null
          title: string
          updated_at: string
          work_model: string | null
        }
        Insert: {
          created_at?: string
          department?: string | null
          description?: string | null
          id?: string
          required_skills?: string[] | null
          score_weights?: Json | null
          screening_questions?: Json | null
          seniority?: string | null
          title: string
          updated_at?: string
          work_model?: string | null
        }
        Update: {
          created_at?: string
          department?: string | null
          description?: string | null
          id?: string
          required_skills?: string[] | null
          score_weights?: Json | null
          screening_questions?: Json | null
          seniority?: string | null
          title?: string
          updated_at?: string
          work_model?: string | null
        }
        Relationships: []
      }
      jobs: {
        Row: {
          created_at: string
          deadline: string | null
          department: string | null
          description: string | null
          headcount: number
          id: string
          location: string | null
          required_skills: string[] | null
          salary_max: number | null
          salary_min: number | null
          score_weights: Json | null
          seniority: string | null
          status: string
          title: string
          type: string | null
          updated_at: string
          work_model: string | null
        }
        Insert: {
          created_at?: string
          deadline?: string | null
          department?: string | null
          description?: string | null
          headcount?: number
          id?: string
          location?: string | null
          required_skills?: string[] | null
          salary_max?: number | null
          salary_min?: number | null
          score_weights?: Json | null
          seniority?: string | null
          status?: string
          title: string
          type?: string | null
          updated_at?: string
          work_model?: string | null
        }
        Update: {
          created_at?: string
          deadline?: string | null
          department?: string | null
          description?: string | null
          headcount?: number
          id?: string
          location?: string | null
          required_skills?: string[] | null
          salary_max?: number | null
          salary_min?: number | null
          score_weights?: Json | null
          seniority?: string | null
          status?: string
          title?: string
          type?: string | null
          updated_at?: string
          work_model?: string | null
        }
        Relationships: []
      }
      profiles: {
        Row: {
          created_at: string
          email: string
          full_name: string
          id: string
          phone: string | null
          updated_at: string
          user_type: Database["public"]["Enums"]["user_type"]
        }
        Insert: {
          created_at?: string
          email: string
          full_name: string
          id: string
          phone?: string | null
          updated_at?: string
          user_type: Database["public"]["Enums"]["user_type"]
        }
        Update: {
          created_at?: string
          email?: string
          full_name?: string
          id?: string
          phone?: string | null
          updated_at?: string
          user_type?: Database["public"]["Enums"]["user_type"]
        }
        Relationships: []
      }
      screening_answers: {
        Row: {
          answer: string
          application_id: string
          created_at: string
          id: string
          question_id: string
        }
        Insert: {
          answer?: string
          application_id: string
          created_at?: string
          id?: string
          question_id: string
        }
        Update: {
          answer?: string
          application_id?: string
          created_at?: string
          id?: string
          question_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "screening_answers_application_id_fkey"
            columns: ["application_id"]
            isOneToOne: false
            referencedRelation: "applications"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "screening_answers_question_id_fkey"
            columns: ["question_id"]
            isOneToOne: false
            referencedRelation: "screening_questions"
            referencedColumns: ["id"]
          },
        ]
      }
      screening_questions: {
        Row: {
          id: string
          job_id: string
          options: Json | null
          order_index: number
          question: string
          required: boolean
          type: string
        }
        Insert: {
          id?: string
          job_id: string
          options?: Json | null
          order_index?: number
          question: string
          required?: boolean
          type?: string
        }
        Update: {
          id?: string
          job_id?: string
          options?: Json | null
          order_index?: number
          question?: string
          required?: boolean
          type?: string
        }
        Relationships: [
          {
            foreignKeyName: "screening_questions_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "jobs"
            referencedColumns: ["id"]
          },
        ]
      }
      stage_templates: {
        Row: {
          assunto: string
          corpo: string
          created_at: string
          enviar_automatico: boolean
          id: string
          stage_id: string
          updated_at: string
        }
        Insert: {
          assunto: string
          corpo: string
          created_at?: string
          enviar_automatico?: boolean
          id?: string
          stage_id: string
          updated_at?: string
        }
        Update: {
          assunto?: string
          corpo?: string
          created_at?: string
          enviar_automatico?: boolean
          id?: string
          stage_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "stage_templates_stage_id_fkey"
            columns: ["stage_id"]
            isOneToOne: true
            referencedRelation: "stages"
            referencedColumns: ["id"]
          },
        ]
      }
      stages: {
        Row: {
          acoes: string | null
          criterios_avanco: string | null
          id: string
          job_id: string
          name: string
          objetivo: string | null
          order_index: number
          responsavel_padrao: string | null
          sla_dias: number | null
        }
        Insert: {
          acoes?: string | null
          criterios_avanco?: string | null
          id?: string
          job_id: string
          name: string
          objetivo?: string | null
          order_index: number
          responsavel_padrao?: string | null
          sla_dias?: number | null
        }
        Update: {
          acoes?: string | null
          criterios_avanco?: string | null
          id?: string
          job_id?: string
          name?: string
          objetivo?: string | null
          order_index?: number
          responsavel_padrao?: string | null
          sla_dias?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "stages_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "jobs"
            referencedColumns: ["id"]
          },
        ]
      }
      tags: {
        Row: {
          id: string
          name: string
        }
        Insert: {
          id?: string
          name: string
        }
        Update: {
          id?: string
          name?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      default_playbook_for_stage: {
        Args: { _stage_name: string }
        Returns: {
          acoes: string
          criterios_avanco: string
          objetivo: string
          responsavel_padrao: string
          sla_dias: number
        }[]
      }
      default_template_for_stage: {
        Args: { _stage_name: string }
        Returns: {
          assunto: string
          corpo: string
        }[]
      }
      is_company_admin: {
        Args: { _company_id: string; _user_id: string }
        Returns: boolean
      }
      is_company_member: {
        Args: { _company_id: string; _user_id: string }
        Returns: boolean
      }
    }
    Enums: {
      role_empresa: "admin" | "membro"
      user_type: "candidato" | "empresa" | "recrutador"
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
      role_empresa: ["admin", "membro"],
      user_type: ["candidato", "empresa", "recrutador"],
    },
  },
} as const
