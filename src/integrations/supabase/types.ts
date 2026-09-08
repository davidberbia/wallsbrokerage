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
      arbitrage_requests: {
        Row: {
          address: string | null
          asset_class: string | null
          city_scope: string | null
          comment: string | null
          created_at: string
          email: string | null
          first_name: string | null
          id: string
          last_name: string | null
          match_count: number | null
          occupancy: string | null
          periphery_scope: string | null
          phone: string | null
          price_meur: number | null
          region: string | null
          rent_annual: number | null
          strategy: string | null
          surface: number | null
        }
        Insert: {
          address?: string | null
          asset_class?: string | null
          city_scope?: string | null
          comment?: string | null
          created_at?: string
          email?: string | null
          first_name?: string | null
          id?: string
          last_name?: string | null
          match_count?: number | null
          occupancy?: string | null
          periphery_scope?: string | null
          phone?: string | null
          price_meur?: number | null
          region?: string | null
          rent_annual?: number | null
          strategy?: string | null
          surface?: number | null
        }
        Update: {
          address?: string | null
          asset_class?: string | null
          city_scope?: string | null
          comment?: string | null
          created_at?: string
          email?: string | null
          first_name?: string | null
          id?: string
          last_name?: string | null
          match_count?: number | null
          occupancy?: string | null
          periphery_scope?: string | null
          phone?: string | null
          price_meur?: number | null
          region?: string | null
          rent_annual?: number | null
          strategy?: string | null
          surface?: number | null
        }
        Relationships: []
      }
      assets: {
        Row: {
          asset_class: string | null
          brochure_url: string | null
          city: string | null
          created_at: string
          description: string | null
          id: string
          owner_id: string | null
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
          owner_id?: string | null
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
          owner_id?: string | null
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
      automation_config: {
        Row: {
          created_at: string
          cron_token: string
          id: boolean
          recap_email: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          cron_token?: string
          id?: boolean
          recap_email?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          cron_token?: string
          id?: boolean
          recap_email?: string
          updated_at?: string
        }
        Relationships: []
      }
      brochure_sends: {
        Row: {
          asset_id: string
          campaign_id: string | null
          channel: string
          delivered_at: string | null
          email_to: string | null
          error: string | null
          id: string
          investor_id: string
          notes: string | null
          opened_at: string | null
          owner_id: string | null
          sent_at: string
          status: string
          subject: string | null
          tracking_id: string
        }
        Insert: {
          asset_id: string
          campaign_id?: string | null
          channel?: string
          delivered_at?: string | null
          email_to?: string | null
          error?: string | null
          id?: string
          investor_id: string
          notes?: string | null
          opened_at?: string | null
          owner_id?: string | null
          sent_at?: string
          status?: string
          subject?: string | null
          tracking_id?: string
        }
        Update: {
          asset_id?: string
          campaign_id?: string | null
          channel?: string
          delivered_at?: string | null
          email_to?: string | null
          error?: string | null
          id?: string
          investor_id?: string
          notes?: string | null
          opened_at?: string | null
          owner_id?: string | null
          sent_at?: string
          status?: string
          subject?: string | null
          tracking_id?: string
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
            foreignKeyName: "brochure_sends_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "campaigns"
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
      campaigns: {
        Row: {
          asset_id: string
          body_html: string
          brochure_name: string | null
          brochure_path: string | null
          created_at: string
          ends_at: string
          id: string
          last_weekly_report_at: string | null
          owner_id: string | null
          recap_sent_at: string | null
          report_j7_sent_at: string | null
          started_at: string
          status: string
          subject: string
          updated_at: string
        }
        Insert: {
          asset_id: string
          body_html?: string
          brochure_name?: string | null
          brochure_path?: string | null
          created_at?: string
          ends_at?: string
          id?: string
          last_weekly_report_at?: string | null
          owner_id?: string | null
          recap_sent_at?: string | null
          report_j7_sent_at?: string | null
          started_at?: string
          status?: string
          subject: string
          updated_at?: string
        }
        Update: {
          asset_id?: string
          body_html?: string
          brochure_name?: string | null
          brochure_path?: string | null
          created_at?: string
          ends_at?: string
          id?: string
          last_weekly_report_at?: string | null
          owner_id?: string | null
          recap_sent_at?: string | null
          report_j7_sent_at?: string | null
          started_at?: string
          status?: string
          subject?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "campaigns_asset_id_fkey"
            columns: ["asset_id"]
            isOneToOne: false
            referencedRelation: "assets"
            referencedColumns: ["id"]
          },
        ]
      }
      email_queue: {
        Row: {
          attachment_name: string | null
          attachment_path: string | null
          attempts: number
          body_html: string
          campaign_id: string | null
          created_at: string
          error: string | null
          id: string
          kind: string
          scheduled_at: string
          send_id: string | null
          sent_at: string | null
          status: string
          subject: string
          to_email: string
          to_name: string | null
        }
        Insert: {
          attachment_name?: string | null
          attachment_path?: string | null
          attempts?: number
          body_html: string
          campaign_id?: string | null
          created_at?: string
          error?: string | null
          id?: string
          kind?: string
          scheduled_at?: string
          send_id?: string | null
          sent_at?: string | null
          status?: string
          subject: string
          to_email: string
          to_name?: string | null
        }
        Update: {
          attachment_name?: string | null
          attachment_path?: string | null
          attempts?: number
          body_html?: string
          campaign_id?: string | null
          created_at?: string
          error?: string | null
          id?: string
          kind?: string
          scheduled_at?: string
          send_id?: string | null
          sent_at?: string | null
          status?: string
          subject?: string
          to_email?: string
          to_name?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "email_queue_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "campaigns"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "email_queue_send_id_fkey"
            columns: ["send_id"]
            isOneToOne: false
            referencedRelation: "brochure_sends"
            referencedColumns: ["id"]
          },
        ]
      }
      investor_criteria: {
        Row: {
          amount_bands: string[]
          asset_class: string
          bubble_id: string | null
          city_scope: string | null
          city_targets: string[]
          created_at: string
          id: string
          investor_id: string
          investor_profile: string | null
          periphery_scope: string | null
          regions: string[]
          strategies: string[]
          updated_at: string
        }
        Insert: {
          amount_bands?: string[]
          asset_class: string
          bubble_id?: string | null
          city_scope?: string | null
          city_targets?: string[]
          created_at?: string
          id?: string
          investor_id: string
          investor_profile?: string | null
          periphery_scope?: string | null
          regions?: string[]
          strategies?: string[]
          updated_at?: string
        }
        Update: {
          amount_bands?: string[]
          asset_class?: string
          bubble_id?: string | null
          city_scope?: string | null
          city_targets?: string[]
          created_at?: string
          id?: string
          investor_id?: string
          investor_profile?: string | null
          periphery_scope?: string | null
          regions?: string[]
          strategies?: string[]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "investor_criteria_investor_id_fkey"
            columns: ["investor_id"]
            isOneToOne: false
            referencedRelation: "investors"
            referencedColumns: ["id"]
          },
        ]
      }
      investors: {
        Row: {
          address: string | null
          asset_classes: string[]
          bubble_id: string | null
          budget_max: number | null
          budget_min: number | null
          city: string | null
          company: string | null
          country: string | null
          created_at: string
          email: string | null
          financing: string | null
          first_name: string | null
          full_name: string
          holding_horizon: string | null
          id: string
          investor_profile: string | null
          job_title: string | null
          min_yield: number | null
          next_review_at: string
          notes: string | null
          owner_id: string | null
          phone: string | null
          postal_code: string | null
          profile_updated_at: string
          regions: string[]
          status: string
          strategies: string[]
          updated_at: string
          user_id: string | null
        }
        Insert: {
          address?: string | null
          asset_classes?: string[]
          bubble_id?: string | null
          budget_max?: number | null
          budget_min?: number | null
          city?: string | null
          company?: string | null
          country?: string | null
          created_at?: string
          email?: string | null
          financing?: string | null
          first_name?: string | null
          full_name: string
          holding_horizon?: string | null
          id?: string
          investor_profile?: string | null
          job_title?: string | null
          min_yield?: number | null
          next_review_at?: string
          notes?: string | null
          owner_id?: string | null
          phone?: string | null
          postal_code?: string | null
          profile_updated_at?: string
          regions?: string[]
          status?: string
          strategies?: string[]
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          address?: string | null
          asset_classes?: string[]
          bubble_id?: string | null
          budget_max?: number | null
          budget_min?: number | null
          city?: string | null
          company?: string | null
          country?: string | null
          created_at?: string
          email?: string | null
          financing?: string | null
          first_name?: string | null
          full_name?: string
          holding_horizon?: string | null
          id?: string
          investor_profile?: string | null
          job_title?: string | null
          min_yield?: number | null
          next_review_at?: string
          notes?: string | null
          owner_id?: string | null
          phone?: string | null
          postal_code?: string | null
          profile_updated_at?: string
          regions?: string[]
          status?: string
          strategies?: string[]
          updated_at?: string
          user_id?: string | null
        }
        Relationships: []
      }
      rate_limits: {
        Row: {
          count: number
          key: string
          window_start: string
        }
        Insert: {
          count?: number
          key: string
          window_start?: string
        }
        Update: {
          count?: number
          key?: string
          window_start?: string
        }
        Relationships: []
      }
      taxonomy_items: {
        Row: {
          active: boolean
          created_at: string
          id: string
          kind: string
          label: string
          sort_order: number
          updated_at: string
        }
        Insert: {
          active?: boolean
          created_at?: string
          id?: string
          kind: string
          label: string
          sort_order?: number
          updated_at?: string
        }
        Update: {
          active?: boolean
          created_at?: string
          id?: string
          kind?: string
          label?: string
          sort_order?: number
          updated_at?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      claim_role: {
        Args: never
        Returns: Database["public"]["Enums"]["app_role"]
      }
      email_pump_tick: { Args: never; Returns: undefined }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      rate_limit_hit: {
        Args: { _key: string; _limit: number; _window_seconds: number }
        Returns: boolean
      }
      start_email_pump: { Args: never; Returns: undefined }
      trigger_automation: { Args: { path: string }; Returns: undefined }
    }
    Enums: {
      app_role: "broker" | "investor" | "viewer"
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
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
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
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
      app_role: ["broker", "investor", "viewer"],
    },
  },
} as const
