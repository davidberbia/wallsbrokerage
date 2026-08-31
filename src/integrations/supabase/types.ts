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
      assets: {
        Row: {
          asset_class: string | null
          brochure_url: string | null
          city: string | null
          created_at: string
          description: string | null
          id: string
          owner_id: string
          price: number | null
          reference: string | null
          region: string | null
          status: string
          strategy: string | null
          surface: number | null
          title: string
          updated_at: string
          yield_pct: number | null
        }
        Insert: {
          asset_class?: string | null
          brochure_url?: string | null
          city?: string | null
          created_at?: string
          description?: string | null
          id?: string
          owner_id?: string
          price?: number | null
          reference?: string | null
          region?: string | null
          status?: string
          strategy?: string | null
          surface?: number | null
          title: string
          updated_at?: string
          yield_pct?: number | null
        }
        Update: {
          asset_class?: string | null
          brochure_url?: string | null
          city?: string | null
          created_at?: string
          description?: string | null
          id?: string
          owner_id?: string
          price?: number | null
          reference?: string | null
          region?: string | null
          status?: string
          strategy?: string | null
          surface?: number | null
          title?: string
          updated_at?: string
          yield_pct?: number | null
        }
        Relationships: []
      }
      brochure_sends: {
        Row: {
          asset_id: string
          channel: string
          id: string
          investor_id: string
          notes: string | null
          owner_id: string
          sent_at: string
        }
        Insert: {
          asset_id: string
          channel?: string
          id?: string
          investor_id: string
          notes?: string | null
          owner_id?: string
          sent_at?: string
        }
        Update: {
          asset_id?: string
          channel?: string
          id?: string
          investor_id?: string
          notes?: string | null
          owner_id?: string
          sent_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "brochure_sends_asset_id_fkey"
            columns: ["asset_id"]
            isOneToOne: false
            referencedRelation: "assets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "brochure_sends_investor_id_fkey"
            columns: ["investor_id"]
            isOneToOne: false
            referencedRelation: "investors"
            referencedColumns: ["id"]
          },
        ]
      }
      investors: {
        Row: {
          asset_classes: string[]
          budget_max: number | null
          budget_min: number | null
          city: string | null
          company: string | null
          country: string | null
          created_at: string
          email: string | null
          financing: string | null
          full_name: string
          holding_horizon: string | null
          id: string
          min_yield: number | null
          notes: string | null
          owner_id: string
          phone: string | null
          regions: string[]
          status: string
          strategies: string[]
          updated_at: string
        }
        Insert: {
          asset_classes?: string[]
          budget_max?: number | null
          budget_min?: number | null
          city?: string | null
          company?: string | null
          country?: string | null
          created_at?: string
          email?: string | null
          financing?: string | null
          full_name: string
          holding_horizon?: string | null
          id?: string
          min_yield?: number | null
          notes?: string | null
          owner_id?: string
          phone?: string | null
          regions?: string[]
          status?: string
          strategies?: string[]
          updated_at?: string
        }
        Update: {
          asset_classes?: string[]
          budget_max?: number | null
          budget_min?: number | null
          city?: string | null
          company?: string | null
          country?: string | null
          created_at?: string
          email?: string | null
          financing?: string | null
          full_name?: string
          holding_horizon?: string | null
          id?: string
          min_yield?: number | null
          notes?: string | null
          owner_id?: string
          phone?: string | null
          regions?: string[]
          status?: string
          strategies?: string[]
          updated_at?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
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
