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
      consult_requests: {
        Row: {
          created_at: string
          id: string
          lead_id: string
          pdf_path: string
          result_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          lead_id: string
          pdf_path: string
          result_id: string
        }
        Update: {
          created_at?: string
          id?: string
          lead_id?: string
          pdf_path?: string
          result_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "consult_requests_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "consult_requests_result_id_fkey"
            columns: ["result_id"]
            isOneToOne: false
            referencedRelation: "pnl_results"
            referencedColumns: ["id"]
          },
        ]
      }
      leads: {
        Row: {
          company: string
          created_at: string
          email: string
          id: string
          job_role: string
          mobile: string
          name: string
          pnl_type: string
          upload_nudge_sent_at: string | null
          user_id: string
        }
        Insert: {
          company: string
          created_at?: string
          email: string
          id?: string
          job_role: string
          mobile: string
          name: string
          pnl_type: string
          upload_nudge_sent_at?: string | null
          user_id: string
        }
        Update: {
          company?: string
          created_at?: string
          email?: string
          id?: string
          job_role?: string
          mobile?: string
          name?: string
          pnl_type?: string
          upload_nudge_sent_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      marketing_campaigns: {
        Row: {
          content: Json
          created_at: string
          id: string
          segment_filter: Json
          sent_at: string | null
          sent_by: string | null
          type: string
        }
        Insert: {
          content?: Json
          created_at?: string
          id?: string
          segment_filter?: Json
          sent_at?: string | null
          sent_by?: string | null
          type: string
        }
        Update: {
          content?: Json
          created_at?: string
          id?: string
          segment_filter?: Json
          sent_at?: string | null
          sent_by?: string | null
          type?: string
        }
        Relationships: []
      }
      pnl_results: {
        Row: {
          created_at: string
          id: string
          lead_id: string
          metrics: Json
          upload_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          lead_id: string
          metrics: Json
          upload_id: string
        }
        Update: {
          created_at?: string
          id?: string
          lead_id?: string
          metrics?: Json
          upload_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "pnl_results_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pnl_results_upload_id_fkey"
            columns: ["upload_id"]
            isOneToOne: false
            referencedRelation: "pnl_uploads"
            referencedColumns: ["id"]
          },
        ]
      }
      pnl_uploads: {
        Row: {
          created_at: string
          file_path: string
          id: string
          lead_id: string
        }
        Insert: {
          created_at?: string
          file_path: string
          id?: string
          lead_id: string
        }
        Update: {
          created_at?: string
          file_path?: string
          id?: string
          lead_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "pnl_uploads_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
        ]
      }
      signup_starts: {
        Row: {
          created_at: string
          email: string
          followed_up_at: string | null
          id: string
        }
        Insert: {
          created_at?: string
          email: string
          followed_up_at?: string | null
          id?: string
        }
        Update: {
          created_at?: string
          email?: string
          followed_up_at?: string | null
          id?: string
        }
        Relationships: []
      }
      upload_attempts: {
        Row: {
          company: string | null
          created_at: string
          email: string
          file_name: string
          file_path: string
          file_size: number
          id: string
          reason: string
          user_id: string | null
        }
        Insert: {
          company?: string | null
          created_at?: string
          email: string
          file_name: string
          file_path: string
          file_size: number
          id?: string
          reason: string
          user_id?: string | null
        }
        Update: {
          company?: string | null
          created_at?: string
          email?: string
          file_name?: string
          file_path?: string
          file_size?: number
          id?: string
          reason?: string
          user_id?: string | null
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      is_admin: { Args: never; Returns: boolean }
    }
    Enums: {
      [_ in never]: never
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
    Enums: {},
  },
} as const
