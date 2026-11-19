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
    PostgrestVersion: "14.17"
  }
  public: {
    Tables: {
      ai_chat_messages: {
        Row: {
          content: string
          created_at: string
          id: string
          page: string | null
          role: string
          user_id: string
        }
        Insert: {
          content: string
          created_at?: string
          id?: string
          page?: string | null
          role: string
          user_id: string
        }
        Update: {
          content?: string
          created_at?: string
          id?: string
          page?: string | null
          role?: string
          user_id?: string
        }
        Relationships: []
      }
      ai_doc_requests: {
        Row: {
          created_at: string
          deal_id: string | null
          id: string
          investor_email: string
          investor_graph_id: string
          investor_name: string | null
          requested: string
          seller_email: string | null
          status: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          deal_id?: string | null
          id?: string
          investor_email: string
          investor_graph_id: string
          investor_name?: string | null
          requested: string
          seller_email?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          deal_id?: string | null
          id?: string
          investor_email?: string
          investor_graph_id?: string
          investor_name?: string | null
          requested?: string
          seller_email?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "ai_doc_requests_deal_id_fkey"
            columns: ["deal_id"]
            isOneToOne: false
            referencedRelation: "deals"
            referencedColumns: ["id"]
          },
        ]
      }
      ai_drafts: {
        Row: {
          attachments: Json
          body_html: string
          created_at: string
          error: string | null
          id: string
          kind: string
          reply_to_graph_id: string | null
          request_id: string | null
          sent_at: string | null
          status: string
          subject: string
          to_email: string
          to_name: string | null
          updated_at: string
        }
        Insert: {
          attachments?: Json
          body_html: string
          created_at?: string
          error?: string | null
          id?: string
          kind: string
          reply_to_graph_id?: string | null
          request_id?: string | null
          sent_at?: string | null
          status?: string
          subject: string
          to_email: string
          to_name?: string | null
          updated_at?: string
        }
        Update: {
          attachments?: Json
          body_html?: string
          created_at?: string
          error?: string | null
          id?: string
          kind?: string
          reply_to_graph_id?: string | null
          request_id?: string | null
          sent_at?: string | null
          status?: string
          subject?: string
          to_email?: string
          to_name?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "ai_drafts_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "ai_doc_requests"
            referencedColumns: ["id"]
          },
        ]
      }
      ai_scan_state: {
        Row: {
          attachments_done: number
          attachments_dup: number
          attachments_skipped: number
          comparables_found: number
          contacts_found: number
          created_at: string
          current_page: string | null
          folder: string
          id: boolean
          last_error: string | null
          last_mail_at: string | null
          lease_until: string | null
          messages_done: number
          news_found: number
          next_link: string | null
          page_offset: number
          status: string
          updated_at: string
        }
        Insert: {
          attachments_done?: number
          attachments_dup?: number
          attachments_skipped?: number
          comparables_found?: number
          contacts_found?: number
          created_at?: string
          current_page?: string | null
          folder?: string
          id?: boolean
          last_error?: string | null
          last_mail_at?: string | null
          lease_until?: string | null
          messages_done?: number
          news_found?: number
          next_link?: string | null
          page_offset?: number
          status?: string
          updated_at?: string
        }
        Update: {
          attachments_done?: number
          attachments_dup?: number
          attachments_skipped?: number
          comparables_found?: number
          contacts_found?: number
          created_at?: string
          current_page?: string | null
          folder?: string
          id?: boolean
          last_error?: string | null
          last_mail_at?: string | null
          lease_until?: string | null
          messages_done?: number
          news_found?: number
          next_link?: string | null
          page_offset?: number
          status?: string
          updated_at?: string
        }
        Relationships: []
      }
      ai_suggestions: {
        Row: {
          created_at: string
          id: string
          page: string | null
          status: string
          suggestion: string
        }
        Insert: {
          created_at?: string
          id?: string
          page?: string | null
          status?: string
          suggestion: string
        }
        Update: {
          created_at?: string
          id?: string
          page?: string | null
          status?: string
          suggestion?: string
        }
        Relationships: []
      }
      ai_usage: {
        Row: {
          cost_eur: number
          created_at: string
          id: string
          task: string
          tokens_in: number
          tokens_out: number
        }
        Insert: {
          cost_eur?: number
          created_at?: string
          id?: string
          task: string
          tokens_in?: number
          tokens_out?: number
        }
        Update: {
          cost_eur?: number
          created_at?: string
          id?: string
          task?: string
          tokens_in?: number
          tokens_out?: number
        }
        Relationships: []
      }
      app_user_connections: {
        Row: {
          connection_key_ciphertext: string
          connector_id: string
          created_at: string
          id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          connection_key_ciphertext: string
          connector_id: string
          created_at?: string
          id?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          connection_key_ciphertext?: string
          connector_id?: string
          created_at?: string
          id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
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
      asset_documents: {
        Row: {
          asset_id: string
          category: string
          created_at: string
          id: string
          name: string
          path: string
          render_pages: Json | null
          sort_order: number
          source_hash: string | null
          updated_at: string
        }
        Insert: {
          asset_id: string
          category?: string
          created_at?: string
          id?: string
          name: string
          path: string
          render_pages?: Json | null
          sort_order?: number
          source_hash?: string | null
          updated_at?: string
        }
        Update: {
          asset_id?: string
          category?: string
          created_at?: string
          id?: string
          name?: string
          path?: string
          render_pages?: Json | null
          sort_order?: number
          source_hash?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "asset_documents_asset_id_fkey"
            columns: ["asset_id"]
            isOneToOne: false
            referencedRelation: "assets"
            referencedColumns: ["id"]
          },
        ]
      }
      assets: {
        Row: {
          address: string | null
          asset_class: string | null
          asset_class_source: string | null
          asset_subclass: string | null
          autofill_sources: Json
          brochure_url: string | null
          city: string | null
          created_at: string
          description: string | null
          ebe: number | null
          ebe_n1: number | null
          ebe_n2: number | null
          family: string | null
          fee_mode: string | null
          fee_payer: string | null
          fee_value: number | null
          hide_street_name: boolean
          hide_street_number: boolean
          hotel_category: string | null
          id: string
          is_portfolio: boolean
          keys_count: number | null
          mandate_end: string | null
          mandate_exclusive: boolean | null
          mandate_start: string | null
          mandate_type: string | null
          nas_year: number | null
          occupant: string | null
          outdoor_surface: number | null
          owner_details: Json
          owner_email: string | null
          owner_id: string | null
          owner_kind: string | null
          owner_name: string | null
          owner_phone: string | null
          parking_count: number | null
          portfolio_lots: Json
          postal_code: string | null
          price: number | null
          publish_on_site: boolean
          reference: string | null
          region: string | null
          rent: number | null
          residential_details: Json
          revenue: number | null
          revenue_n1: number | null
          revenue_n2: number | null
          status: string
          strategy: string | null
          surface: number | null
          title: string
          transaction_type: string | null
          updated_at: string
          weighted_surface: number | null
          yield_pct: number | null
        }
        Insert: {
          address?: string | null
          asset_class?: string | null
          asset_class_source?: string | null
          asset_subclass?: string | null
          autofill_sources?: Json
          brochure_url?: string | null
          city?: string | null
          created_at?: string
          description?: string | null
          ebe?: number | null
          ebe_n1?: number | null
          ebe_n2?: number | null
          family?: string | null
          fee_mode?: string | null
          fee_payer?: string | null
          fee_value?: number | null
          hide_street_name?: boolean
          hide_street_number?: boolean
          hotel_category?: string | null
          id?: string
          is_portfolio?: boolean
          keys_count?: number | null
          mandate_end?: string | null
          mandate_exclusive?: boolean | null
          mandate_start?: string | null
          mandate_type?: string | null
          nas_year?: number | null
          occupant?: string | null
          outdoor_surface?: number | null
          owner_details?: Json
          owner_email?: string | null
          owner_id?: string | null
          owner_kind?: string | null
          owner_name?: string | null
          owner_phone?: string | null
          parking_count?: number | null
          portfolio_lots?: Json
          postal_code?: string | null
          price?: number | null
          publish_on_site?: boolean
          reference?: string | null
          region?: string | null
          rent?: number | null
          residential_details?: Json
          revenue?: number | null
          revenue_n1?: number | null
          revenue_n2?: number | null
          status?: string
          strategy?: string | null
          surface?: number | null
          title: string
          transaction_type?: string | null
          updated_at?: string
          weighted_surface?: number | null
          yield_pct?: number | null
        }
        Update: {
          address?: string | null
          asset_class?: string | null
          asset_class_source?: string | null
          asset_subclass?: string | null
          autofill_sources?: Json
          brochure_url?: string | null
          city?: string | null
          created_at?: string
          description?: string | null
          ebe?: number | null
          ebe_n1?: number | null
          ebe_n2?: number | null
          family?: string | null
          fee_mode?: string | null
          fee_payer?: string | null
          fee_value?: number | null
          hide_street_name?: boolean
          hide_street_number?: boolean
          hotel_category?: string | null
          id?: string
          is_portfolio?: boolean
          keys_count?: number | null
          mandate_end?: string | null
          mandate_exclusive?: boolean | null
          mandate_start?: string | null
          mandate_type?: string | null
          nas_year?: number | null
          occupant?: string | null
          outdoor_surface?: number | null
          owner_details?: Json
          owner_email?: string | null
          owner_id?: string | null
          owner_kind?: string | null
          owner_name?: string | null
          owner_phone?: string | null
          parking_count?: number | null
          portfolio_lots?: Json
          postal_code?: string | null
          price?: number | null
          publish_on_site?: boolean
          reference?: string | null
          region?: string | null
          rent?: number | null
          residential_details?: Json
          revenue?: number | null
          revenue_n1?: number | null
          revenue_n2?: number | null
          status?: string
          strategy?: string | null
          surface?: number | null
          title?: string
          transaction_type?: string | null
          updated_at?: string
          weighted_surface?: number | null
          yield_pct?: number | null
        }
        Relationships: []
      }
      attachment_control: {
        Row: {
          id: boolean
          lease_until: string | null
          paused_reason: string | null
          updated_at: string
        }
        Insert: {
          id?: boolean
          lease_until?: string | null
          paused_reason?: string | null
          updated_at?: string
        }
        Update: {
          id?: boolean
          lease_until?: string | null
          paused_reason?: string | null
          updated_at?: string
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
          bounced_at: string | null
          campaign_id: string | null
          channel: string
          clicked_at: string | null
          delivered_at: string | null
          email_to: string | null
          error: string | null
          id: string
          investor_id: string | null
          notes: string | null
          opened_at: string | null
          owner_id: string | null
          prospect_contact_id: string | null
          provider: string | null
          provider_message_id: string | null
          provider_status: string | null
          resent_at: string | null
          sent_at: string
          status: string
          subject: string | null
          tracking_id: string
        }
        Insert: {
          asset_id: string
          bounced_at?: string | null
          campaign_id?: string | null
          channel?: string
          clicked_at?: string | null
          delivered_at?: string | null
          email_to?: string | null
          error?: string | null
          id?: string
          investor_id?: string | null
          notes?: string | null
          opened_at?: string | null
          owner_id?: string | null
          prospect_contact_id?: string | null
          provider?: string | null
          provider_message_id?: string | null
          provider_status?: string | null
          resent_at?: string | null
          sent_at?: string
          status?: string
          subject?: string | null
          tracking_id?: string
        }
        Update: {
          asset_id?: string
          bounced_at?: string | null
          campaign_id?: string | null
          channel?: string
          clicked_at?: string | null
          delivered_at?: string | null
          email_to?: string | null
          error?: string | null
          id?: string
          investor_id?: string | null
          notes?: string | null
          opened_at?: string | null
          owner_id?: string | null
          prospect_contact_id?: string | null
          provider?: string | null
          provider_message_id?: string | null
          provider_status?: string | null
          resent_at?: string | null
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
          {
            foreignKeyName: "brochure_sends_prospect_contact_id_fkey"
            columns: ["prospect_contact_id"]
            isOneToOne: false
            referencedRelation: "prospect_contacts"
            referencedColumns: ["id"]
          },
        ]
      }
      brochure_settings: {
        Row: {
          key: string
          updated_at: string
          value: Json
        }
        Insert: {
          key: string
          updated_at?: string
          value?: Json
        }
        Update: {
          key?: string
          updated_at?: string
          value?: Json
        }
        Relationships: []
      }
      call_recordings: {
        Row: {
          actions: string | null
          called_at: string | null
          channel: string | null
          contact_name: string | null
          created_at: string
          direction: string | null
          drive_file_id: string
          error: string | null
          file_name: string
          found_comparables: number
          found_contacts: number
          found_news: number
          id: string
          phone: string | null
          size: number | null
          status: string
          summary: string | null
          transcript: string | null
          updated_at: string
        }
        Insert: {
          actions?: string | null
          called_at?: string | null
          channel?: string | null
          contact_name?: string | null
          created_at?: string
          direction?: string | null
          drive_file_id: string
          error?: string | null
          file_name: string
          found_comparables?: number
          found_contacts?: number
          found_news?: number
          id?: string
          phone?: string | null
          size?: number | null
          status?: string
          summary?: string | null
          transcript?: string | null
          updated_at?: string
        }
        Update: {
          actions?: string | null
          called_at?: string | null
          channel?: string | null
          contact_name?: string | null
          created_at?: string
          direction?: string | null
          drive_file_id?: string
          error?: string | null
          file_name?: string
          found_comparables?: number
          found_contacts?: number
          found_news?: number
          id?: string
          phone?: string | null
          size?: number | null
          status?: string
          summary?: string | null
          transcript?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      campaigns: {
        Row: {
          asset_id: string
          body_html: string
          brochure_name: string | null
          brochure_path: string | null
          created_at: string
          documents: Json
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
          documents?: Json
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
          documents?: Json
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
      cfnews_failed_urls: {
        Row: {
          attempts: number
          company_id: string | null
          contact_id: string | null
          created_at: string
          id: string
          kind: string
          last_error: string | null
          last_status: number | null
          page: number | null
          resolved_at: string | null
          retry_requested_at: string | null
          updated_at: string
          url: string
        }
        Insert: {
          attempts?: number
          company_id?: string | null
          contact_id?: string | null
          created_at?: string
          id?: string
          kind: string
          last_error?: string | null
          last_status?: number | null
          page?: number | null
          resolved_at?: string | null
          retry_requested_at?: string | null
          updated_at?: string
          url: string
        }
        Update: {
          attempts?: number
          company_id?: string | null
          contact_id?: string | null
          created_at?: string
          id?: string
          kind?: string
          last_error?: string | null
          last_status?: number | null
          page?: number | null
          resolved_at?: string | null
          retry_requested_at?: string | null
          updated_at?: string
          url?: string
        }
        Relationships: [
          {
            foreignKeyName: "cfnews_failed_urls_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "prospect_companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cfnews_failed_urls_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "prospect_contacts"
            referencedColumns: ["id"]
          },
        ]
      }
      cfnews_scrape: {
        Row: {
          consecutive_listing_404s: number
          cookie: string | null
          cookie_at: string | null
          id: boolean
          last_error: string | null
          lease_until: string | null
          page: number
          pages_done: number
          phase: string
          requests_done: number
          retry_only: boolean
          status: string
          updated_at: string
        }
        Insert: {
          consecutive_listing_404s?: number
          cookie?: string | null
          cookie_at?: string | null
          id?: boolean
          last_error?: string | null
          lease_until?: string | null
          page?: number
          pages_done?: number
          phase?: string
          requests_done?: number
          retry_only?: boolean
          status?: string
          updated_at?: string
        }
        Update: {
          consecutive_listing_404s?: number
          cookie?: string | null
          cookie_at?: string | null
          id?: boolean
          last_error?: string | null
          lease_until?: string | null
          page?: number
          pages_done?: number
          phase?: string
          requests_done?: number
          retry_only?: boolean
          status?: string
          updated_at?: string
        }
        Relationships: []
      }
      commercial_agents: {
        Row: {
          address: string | null
          birth_date: string | null
          contract_fields: Json
          contract_path: string | null
          created_at: string
          email: string
          envelope_id: string | null
          first_name: string
          hidden_from_team: boolean
          id: string
          last_name: string
          phone: string | null
          sees_team: boolean
          signature_status: string | null
          signed_contract_path: string | null
          siren: string | null
          user_id: string | null
        }
        Insert: {
          address?: string | null
          birth_date?: string | null
          contract_fields?: Json
          contract_path?: string | null
          created_at?: string
          email: string
          envelope_id?: string | null
          first_name: string
          hidden_from_team?: boolean
          id?: string
          last_name: string
          phone?: string | null
          sees_team?: boolean
          signature_status?: string | null
          signed_contract_path?: string | null
          siren?: string | null
          user_id?: string | null
        }
        Update: {
          address?: string | null
          birth_date?: string | null
          contract_fields?: Json
          contract_path?: string | null
          created_at?: string
          email?: string
          envelope_id?: string | null
          first_name?: string
          hidden_from_team?: boolean
          id?: string
          last_name?: string
          phone?: string | null
          sees_team?: boolean
          signature_status?: string | null
          signed_contract_path?: string | null
          siren?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      comparables: {
        Row: {
          acquisition_details: Json
          address: string | null
          asset_class: string | null
          asset_id: string | null
          city: string | null
          citycode: string | null
          created_at: string
          deal_date: string | null
          enseigne: string | null
          excerpt: string
          id: string
          kind: string
          lat: number | null
          lon: number | null
          mail_graph_id: string | null
          notes: string | null
          postal_code: string | null
          price: number | null
          price_m2: number | null
          rent: number | null
          rent_m2: number | null
          rent_m2_weighted: number | null
          source: string | null
          street: string | null
          surface: number | null
          updated_at: string
          weighted_surface: number | null
          yield_pct: number | null
        }
        Insert: {
          acquisition_details?: Json
          address?: string | null
          asset_class?: string | null
          asset_id?: string | null
          city?: string | null
          citycode?: string | null
          created_at?: string
          deal_date?: string | null
          enseigne?: string | null
          excerpt?: string
          id?: string
          kind?: string
          lat?: number | null
          lon?: number | null
          mail_graph_id?: string | null
          notes?: string | null
          postal_code?: string | null
          price?: number | null
          price_m2?: number | null
          rent?: number | null
          rent_m2?: number | null
          rent_m2_weighted?: number | null
          source?: string | null
          street?: string | null
          surface?: number | null
          updated_at?: string
          weighted_surface?: number | null
          yield_pct?: number | null
        }
        Update: {
          acquisition_details?: Json
          address?: string | null
          asset_class?: string | null
          asset_id?: string | null
          city?: string | null
          citycode?: string | null
          created_at?: string
          deal_date?: string | null
          enseigne?: string | null
          excerpt?: string
          id?: string
          kind?: string
          lat?: number | null
          lon?: number | null
          mail_graph_id?: string | null
          notes?: string | null
          postal_code?: string | null
          price?: number | null
          price_m2?: number | null
          rent?: number | null
          rent_m2?: number | null
          rent_m2_weighted?: number | null
          source?: string | null
          street?: string | null
          surface?: number | null
          updated_at?: string
          weighted_surface?: number | null
          yield_pct?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "comparables_asset_id_fkey"
            columns: ["asset_id"]
            isOneToOne: false
            referencedRelation: "assets"
            referencedColumns: ["id"]
          },
        ]
      }
      comparables_geo_stage: {
        Row: {
          citycode: string | null
          id: string
          lat: number | null
          lon: number | null
          score: number | null
          street: string | null
        }
        Insert: {
          citycode?: string | null
          id: string
          lat?: number | null
          lon?: number | null
          score?: number | null
          street?: string | null
        }
        Update: {
          citycode?: string | null
          id?: string
          lat?: number | null
          lon?: number | null
          score?: number | null
          street?: string | null
        }
        Relationships: []
      }
      deal_contacts: {
        Row: {
          created_at: string
          deal_id: string
          email: string
          id: string
          investor_id: string | null
          name: string | null
          prospect_contact_id: string | null
          role: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          deal_id: string
          email: string
          id?: string
          investor_id?: string | null
          name?: string | null
          prospect_contact_id?: string | null
          role?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          deal_id?: string
          email?: string
          id?: string
          investor_id?: string | null
          name?: string | null
          prospect_contact_id?: string | null
          role?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "deal_contacts_deal_id_fkey"
            columns: ["deal_id"]
            isOneToOne: false
            referencedRelation: "deals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "deal_contacts_investor_id_fkey"
            columns: ["investor_id"]
            isOneToOne: false
            referencedRelation: "investors"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "deal_contacts_prospect_contact_id_fkey"
            columns: ["prospect_contact_id"]
            isOneToOne: false
            referencedRelation: "prospect_contacts"
            referencedColumns: ["id"]
          },
        ]
      }
      deal_year_goals: {
        Row: {
          goal: number
          updated_at: string
          year: number
        }
        Insert: {
          goal?: number
          updated_at?: string
          year: number
        }
        Update: {
          goal?: number
          updated_at?: string
          year?: number
        }
        Relationships: []
      }
      deals: {
        Row: {
          address: string | null
          amount: number | null
          archive_reason: string | null
          asset_id: string | null
          buyer: string | null
          carry_over: boolean
          company: string | null
          contact_email: string | null
          contact_name: string | null
          contact_phone: string | null
          created_at: string
          enriched_at: string | null
          enrichment: string | null
          expected_payment_at: string | null
          fee_amount: number | null
          fee_pct: number | null
          id: string
          last_activity_at: string | null
          lead_research: Json | null
          lead_status: string
          name: string
          name_key: string | null
          nego1: string | null
          nego2: string | null
          notes: string | null
          operation_nature: string | null
          owner_id: string | null
          owner_siren: string | null
          paid_at: string | null
          probability: number | null
          rent: number | null
          research_failed_at: string | null
          seller: string | null
          snooze_until: string | null
          sort_order: number
          source: string | null
          stage: string
          suggestion: string | null
          surface: number | null
          updated_at: string
          vintage: number
        }
        Insert: {
          address?: string | null
          amount?: number | null
          archive_reason?: string | null
          asset_id?: string | null
          buyer?: string | null
          carry_over?: boolean
          company?: string | null
          contact_email?: string | null
          contact_name?: string | null
          contact_phone?: string | null
          created_at?: string
          enriched_at?: string | null
          enrichment?: string | null
          expected_payment_at?: string | null
          fee_amount?: number | null
          fee_pct?: number | null
          id?: string
          last_activity_at?: string | null
          lead_research?: Json | null
          lead_status?: string
          name: string
          name_key?: string | null
          nego1?: string | null
          nego2?: string | null
          notes?: string | null
          operation_nature?: string | null
          owner_id?: string | null
          owner_siren?: string | null
          paid_at?: string | null
          probability?: number | null
          rent?: number | null
          research_failed_at?: string | null
          seller?: string | null
          snooze_until?: string | null
          sort_order?: number
          source?: string | null
          stage?: string
          suggestion?: string | null
          surface?: number | null
          updated_at?: string
          vintage?: number
        }
        Update: {
          address?: string | null
          amount?: number | null
          archive_reason?: string | null
          asset_id?: string | null
          buyer?: string | null
          carry_over?: boolean
          company?: string | null
          contact_email?: string | null
          contact_name?: string | null
          contact_phone?: string | null
          created_at?: string
          enriched_at?: string | null
          enrichment?: string | null
          expected_payment_at?: string | null
          fee_amount?: number | null
          fee_pct?: number | null
          id?: string
          last_activity_at?: string | null
          lead_research?: Json | null
          lead_status?: string
          name?: string
          name_key?: string | null
          nego1?: string | null
          nego2?: string | null
          notes?: string | null
          operation_nature?: string | null
          owner_id?: string | null
          owner_siren?: string | null
          paid_at?: string | null
          probability?: number | null
          rent?: number | null
          research_failed_at?: string | null
          seller?: string | null
          snooze_until?: string | null
          sort_order?: number
          source?: string | null
          stage?: string
          suggestion?: string | null
          surface?: number | null
          updated_at?: string
          vintage?: number
        }
        Relationships: [
          {
            foreignKeyName: "deals_asset_id_fkey"
            columns: ["asset_id"]
            isOneToOne: false
            referencedRelation: "assets"
            referencedColumns: ["id"]
          },
        ]
      }
      digest_reports: {
        Row: {
          created_at: string
          day: string
          html: string
          id: string
          speech: string
          token: string
        }
        Insert: {
          created_at?: string
          day: string
          html: string
          id?: string
          speech: string
          token?: string
        }
        Update: {
          created_at?: string
          day?: string
          html?: string
          id?: string
          speech?: string
          token?: string
        }
        Relationships: []
      }
      directory_contacts: {
        Row: {
          candidate_id: string | null
          company: string | null
          created_at: string
          email: string | null
          full_name: string | null
          id: string
          job_title: string | null
          kind: string
          notes: string | null
          owner_id: string | null
          phone: string | null
          updated_at: string
        }
        Insert: {
          candidate_id?: string | null
          company?: string | null
          created_at?: string
          email?: string | null
          full_name?: string | null
          id?: string
          job_title?: string | null
          kind?: string
          notes?: string | null
          owner_id?: string | null
          phone?: string | null
          updated_at?: string
        }
        Update: {
          candidate_id?: string | null
          company?: string | null
          created_at?: string
          email?: string | null
          full_name?: string | null
          id?: string
          job_title?: string | null
          kind?: string
          notes?: string | null
          owner_id?: string | null
          phone?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "directory_contacts_candidate_id_fkey"
            columns: ["candidate_id"]
            isOneToOne: false
            referencedRelation: "mailscan_candidates"
            referencedColumns: ["id"]
          },
        ]
      }
      document_share_events: {
        Row: {
          created_at: string
          document_name: string | null
          id: string
          kind: string
          share_id: string
        }
        Insert: {
          created_at?: string
          document_name?: string | null
          id?: string
          kind: string
          share_id: string
        }
        Update: {
          created_at?: string
          document_name?: string | null
          id?: string
          kind?: string
          share_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "document_share_events_share_id_fkey"
            columns: ["share_id"]
            isOneToOne: false
            referencedRelation: "document_shares"
            referencedColumns: ["id"]
          },
        ]
      }
      document_shares: {
        Row: {
          asset_id: string
          created_at: string
          created_by: string | null
          document_ids: string[]
          expires_at: string
          id: string
          recipient: string | null
          revoked_at: string | null
          token: string
        }
        Insert: {
          asset_id: string
          created_at?: string
          created_by?: string | null
          document_ids?: string[]
          expires_at?: string
          id?: string
          recipient?: string | null
          revoked_at?: string | null
          token?: string
        }
        Update: {
          asset_id?: string
          created_at?: string
          created_by?: string | null
          document_ids?: string[]
          expires_at?: string
          id?: string
          recipient?: string | null
          revoked_at?: string | null
          token?: string
        }
        Relationships: [
          {
            foreignKeyName: "document_shares_asset_id_fkey"
            columns: ["asset_id"]
            isOneToOne: false
            referencedRelation: "assets"
            referencedColumns: ["id"]
          },
        ]
      }
      docusign_auth: {
        Row: {
          access_token: string | null
          account_email: string | null
          account_id: string | null
          base_uri: string | null
          env: string
          expires_at: string | null
          id: boolean
          pending_state: string | null
          refresh_token: string | null
          updated_at: string
        }
        Insert: {
          access_token?: string | null
          account_email?: string | null
          account_id?: string | null
          base_uri?: string | null
          env?: string
          expires_at?: string | null
          id?: boolean
          pending_state?: string | null
          refresh_token?: string | null
          updated_at?: string
        }
        Update: {
          access_token?: string | null
          account_email?: string | null
          account_id?: string | null
          base_uri?: string | null
          env?: string
          expires_at?: string | null
          id?: boolean
          pending_state?: string | null
          refresh_token?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      email_queue: {
        Row: {
          attachment_name: string | null
          attachment_path: string | null
          attachments: Json
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
          attachments?: Json
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
          attachments?: Json
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
      extraction_control: {
        Row: {
          deployment_ready: boolean
          id: boolean
          lease_until: string | null
          next_fetch_at: string | null
          paused_reason: string | null
        }
        Insert: {
          deployment_ready?: boolean
          id?: boolean
          lease_until?: string | null
          next_fetch_at?: string | null
          paused_reason?: string | null
        }
        Update: {
          deployment_ready?: boolean
          id?: boolean
          lease_until?: string | null
          next_fetch_at?: string | null
          paused_reason?: string | null
        }
        Relationships: []
      }
      extraction_jobs: {
        Row: {
          created_at: string
          error: string | null
          id: string
          kind: string
          lease_until: string | null
          next_run_at: string
          owner_id: string
          result: Json | null
          status: string
          target_id: string | null
          url: string | null
        }
        Insert: {
          created_at?: string
          error?: string | null
          id?: string
          kind: string
          lease_until?: string | null
          next_run_at?: string
          owner_id: string
          result?: Json | null
          status?: string
          target_id?: string | null
          url?: string | null
        }
        Update: {
          created_at?: string
          error?: string | null
          id?: string
          kind?: string
          lease_until?: string | null
          next_run_at?: string
          owner_id?: string
          result?: Json | null
          status?: string
          target_id?: string | null
          url?: string | null
        }
        Relationships: []
      }
      followup_reminders: {
        Row: {
          id: string
          mail_id: string
          sent_at: string
          tier: number
        }
        Insert: {
          id?: string
          mail_id: string
          sent_at?: string
          tier: number
        }
        Update: {
          id?: string
          mail_id?: string
          sent_at?: string
          tier?: number
        }
        Relationships: [
          {
            foreignKeyName: "followup_reminders_mail_id_fkey"
            columns: ["mail_id"]
            isOneToOne: false
            referencedRelation: "mail_messages"
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
          email_bounced_at: string | null
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
          residential_criteria: Json
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
          email_bounced_at?: string | null
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
          residential_criteria?: Json
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
          email_bounced_at?: string | null
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
          residential_criteria?: Json
          status?: string
          strategies?: string[]
          updated_at?: string
          user_id?: string | null
        }
        Relationships: []
      }
      lead_document_requests: {
        Row: {
          body_text: string
          conversation_id: string | null
          created_at: string
          created_by: string
          deal_id: string
          due_at: string | null
          error: string | null
          id: string
          missing_items: Json
          received_at: string | null
          reminded_at: string | null
          sender_email: string
          sent_at: string | null
          status: string
          subject: string
          to_email: string
        }
        Insert: {
          body_text: string
          conversation_id?: string | null
          created_at?: string
          created_by: string
          deal_id: string
          due_at?: string | null
          error?: string | null
          id?: string
          missing_items?: Json
          received_at?: string | null
          reminded_at?: string | null
          sender_email: string
          sent_at?: string | null
          status?: string
          subject: string
          to_email: string
        }
        Update: {
          body_text?: string
          conversation_id?: string | null
          created_at?: string
          created_by?: string
          deal_id?: string
          due_at?: string | null
          error?: string | null
          id?: string
          missing_items?: Json
          received_at?: string | null
          reminded_at?: string | null
          sender_email?: string
          sent_at?: string | null
          status?: string
          subject?: string
          to_email?: string
        }
        Relationships: [
          {
            foreignKeyName: "lead_document_requests_deal_id_fkey"
            columns: ["deal_id"]
            isOneToOne: false
            referencedRelation: "deals"
            referencedColumns: ["id"]
          },
        ]
      }
      lead_followup_control: {
        Row: {
          enabled: boolean
          id: boolean
        }
        Insert: {
          enabled?: boolean
          id?: boolean
        }
        Update: {
          enabled?: boolean
          id?: boolean
        }
        Relationships: []
      }
      lead_pige_contacts: {
        Row: {
          attempt_at: string | null
          body_text: string
          bounced_at: string | null
          confirmation: string | null
          conversation_id: string | null
          delivered_at: string | null
          email: string
          id: string
          investor_id: string | null
          message_id: string | null
          name: string
          opened_at: string | null
          pige_id: string
          prepared_at: string
          provider_message_id: string | null
          replied_at: string | null
          reply_preview: string | null
          send_error: string | null
          send_state: string
          sent_at: string | null
          subject: string
          sync_error: string | null
        }
        Insert: {
          attempt_at?: string | null
          body_text: string
          bounced_at?: string | null
          confirmation?: string | null
          conversation_id?: string | null
          delivered_at?: string | null
          email: string
          id?: string
          investor_id?: string | null
          message_id?: string | null
          name: string
          opened_at?: string | null
          pige_id: string
          prepared_at?: string
          provider_message_id?: string | null
          replied_at?: string | null
          reply_preview?: string | null
          send_error?: string | null
          send_state?: string
          sent_at?: string | null
          subject: string
          sync_error?: string | null
        }
        Update: {
          attempt_at?: string | null
          body_text?: string
          bounced_at?: string | null
          confirmation?: string | null
          conversation_id?: string | null
          delivered_at?: string | null
          email?: string
          id?: string
          investor_id?: string | null
          message_id?: string | null
          name?: string
          opened_at?: string | null
          pige_id?: string
          prepared_at?: string
          provider_message_id?: string | null
          replied_at?: string | null
          reply_preview?: string | null
          send_error?: string | null
          send_state?: string
          sent_at?: string | null
          subject?: string
          sync_error?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "lead_pige_contacts_investor_id_fkey"
            columns: ["investor_id"]
            isOneToOne: false
            referencedRelation: "investors"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lead_pige_contacts_pige_id_fkey"
            columns: ["pige_id"]
            isOneToOne: false
            referencedRelation: "lead_piges"
            referencedColumns: ["id"]
          },
        ]
      }
      lead_piges: {
        Row: {
          completed_at: string | null
          created_at: string
          created_by: string
          deal_id: string
          due_at: string | null
          id: string
          sender_email: string
          started_at: string | null
        }
        Insert: {
          completed_at?: string | null
          created_at?: string
          created_by: string
          deal_id: string
          due_at?: string | null
          id?: string
          sender_email: string
          started_at?: string | null
        }
        Update: {
          completed_at?: string | null
          created_at?: string
          created_by?: string
          deal_id?: string
          due_at?: string | null
          id?: string
          sender_email?: string
          started_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "lead_piges_deal_id_fkey"
            columns: ["deal_id"]
            isOneToOne: false
            referencedRelation: "deals"
            referencedColumns: ["id"]
          },
        ]
      }
      lead_transfers: {
        Row: {
          created_at: string
          deal_id: string | null
          from_owner: string | null
          id: string
          to_owner: string
          transferred_by: string
        }
        Insert: {
          created_at?: string
          deal_id?: string | null
          from_owner?: string | null
          id?: string
          to_owner: string
          transferred_by: string
        }
        Update: {
          created_at?: string
          deal_id?: string | null
          from_owner?: string | null
          id?: string
          to_owner?: string
          transferred_by?: string
        }
        Relationships: [
          {
            foreignKeyName: "lead_transfers_deal_id_fkey"
            columns: ["deal_id"]
            isOneToOne: false
            referencedRelation: "deals"
            referencedColumns: ["id"]
          },
        ]
      }
      linkedin_invites: {
        Row: {
          contact_id: string
          done_at: string
          user_id: string
        }
        Insert: {
          contact_id: string
          done_at?: string
          user_id: string
        }
        Update: {
          contact_id?: string
          done_at?: string
          user_id?: string
        }
        Relationships: []
      }
      linkedin_job_state: {
        Row: {
          id: boolean
          lease_until: string | null
          paused_reason: string | null
          updated_at: string
        }
        Insert: {
          id?: boolean
          lease_until?: string | null
          paused_reason?: string | null
          updated_at?: string
        }
        Update: {
          id?: boolean
          lease_until?: string | null
          paused_reason?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      linkedin_posts: {
        Row: {
          asset_ids: string[]
          body: string
          chart: Json | null
          created_at: string
          error: string | null
          id: string
          image_path: string | null
          kind: string
          published_at: string | null
          scheduled_for: string
          status: string
          user_id: string
        }
        Insert: {
          asset_ids?: string[]
          body?: string
          chart?: Json | null
          created_at?: string
          error?: string | null
          id?: string
          image_path?: string | null
          kind: string
          published_at?: string | null
          scheduled_for?: string
          status?: string
          user_id: string
        }
        Update: {
          asset_ids?: string[]
          body?: string
          chart?: Json | null
          created_at?: string
          error?: string | null
          id?: string
          image_path?: string | null
          kind?: string
          published_at?: string | null
          scheduled_for?: string
          status?: string
          user_id?: string
        }
        Relationships: []
      }
      linkedin_settings: {
        Row: {
          auto_publish: boolean
          invites_per_day: number
          market_day: number
          next_invite_at: string | null
          reconnect_required: boolean
          rejected_topics: string[]
          specialty: string
          updated_at: string
          user_id: string
        }
        Insert: {
          auto_publish?: boolean
          invites_per_day?: number
          market_day?: number
          next_invite_at?: string | null
          reconnect_required?: boolean
          rejected_topics?: string[]
          specialty?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          auto_publish?: boolean
          invites_per_day?: number
          market_day?: number
          next_invite_at?: string | null
          reconnect_required?: boolean
          rejected_topics?: string[]
          specialty?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      linkedin_sources: {
        Row: {
          created_at: string
          id: string
          url: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          url: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          url?: string
          user_id?: string
        }
        Relationships: []
      }
      mail_attachment_jobs: {
        Row: {
          asset_id: string
          attachment_id: string
          attempts: number
          content_type: string | null
          created_at: string
          doc_type: string | null
          document_id: string | null
          error: string | null
          graph_message_id: string
          id: string
          name: string | null
          size: number | null
          status: string
          updated_at: string
        }
        Insert: {
          asset_id: string
          attachment_id: string
          attempts?: number
          content_type?: string | null
          created_at?: string
          doc_type?: string | null
          document_id?: string | null
          error?: string | null
          graph_message_id: string
          id?: string
          name?: string | null
          size?: number | null
          status?: string
          updated_at?: string
        }
        Update: {
          asset_id?: string
          attachment_id?: string
          attempts?: number
          content_type?: string | null
          created_at?: string
          doc_type?: string | null
          document_id?: string | null
          error?: string | null
          graph_message_id?: string
          id?: string
          name?: string | null
          size?: number | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "mail_attachment_jobs_asset_id_fkey"
            columns: ["asset_id"]
            isOneToOne: false
            referencedRelation: "assets"
            referencedColumns: ["id"]
          },
        ]
      }
      mail_attachments_seen: {
        Row: {
          content_type: string | null
          created_at: string
          error: string | null
          first_graph_id: string | null
          hash: string
          id: string
          name: string | null
          result: Json | null
          size: number | null
          status: string
          updated_at: string
        }
        Insert: {
          content_type?: string | null
          created_at?: string
          error?: string | null
          first_graph_id?: string | null
          hash: string
          id?: string
          name?: string | null
          result?: Json | null
          size?: number | null
          status?: string
          updated_at?: string
        }
        Update: {
          content_type?: string | null
          created_at?: string
          error?: string | null
          first_graph_id?: string | null
          hash?: string
          id?: string
          name?: string | null
          result?: Json | null
          size?: number | null
          status?: string
          updated_at?: string
        }
        Relationships: []
      }
      mail_messages: {
        Row: {
          ai_checked_at: string | null
          attachments_listed_at: string | null
          created_at: string
          deal_id: string | null
          extracted: Json
          folder: string
          from_email: string | null
          from_name: string | null
          graph_id: string
          has_attachments: boolean
          id: string
          linked_manually: boolean
          participants: string[]
          preview: string | null
          received_at: string | null
          subject: string | null
          targets_checked_at: string | null
          to_display: string | null
          updated_at: string
          web_link: string | null
        }
        Insert: {
          ai_checked_at?: string | null
          attachments_listed_at?: string | null
          created_at?: string
          deal_id?: string | null
          extracted?: Json
          folder: string
          from_email?: string | null
          from_name?: string | null
          graph_id: string
          has_attachments?: boolean
          id?: string
          linked_manually?: boolean
          participants?: string[]
          preview?: string | null
          received_at?: string | null
          subject?: string | null
          targets_checked_at?: string | null
          to_display?: string | null
          updated_at?: string
          web_link?: string | null
        }
        Update: {
          ai_checked_at?: string | null
          attachments_listed_at?: string | null
          created_at?: string
          deal_id?: string | null
          extracted?: Json
          folder?: string
          from_email?: string | null
          from_name?: string | null
          graph_id?: string
          has_attachments?: boolean
          id?: string
          linked_manually?: boolean
          participants?: string[]
          preview?: string | null
          received_at?: string | null
          subject?: string | null
          targets_checked_at?: string | null
          to_display?: string | null
          updated_at?: string
          web_link?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "mail_messages_deal_id_fkey"
            columns: ["deal_id"]
            isOneToOne: false
            referencedRelation: "deals"
            referencedColumns: ["id"]
          },
        ]
      }
      mail_sync_state: {
        Row: {
          created_at: string
          delta_link: string | null
          folder: string
          last_error: string | null
          last_sync_at: string | null
          lease_until: string | null
          messages_synced: number
          next_link: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          delta_link?: string | null
          folder: string
          last_error?: string | null
          last_sync_at?: string | null
          lease_until?: string | null
          messages_synced?: number
          next_link?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          delta_link?: string | null
          folder?: string
          last_error?: string | null
          last_sync_at?: string | null
          lease_until?: string | null
          messages_synced?: number
          next_link?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      mailscan_candidates: {
        Row: {
          address: string | null
          company_name: string | null
          created_at: string
          created_contact_id: string | null
          created_investor_id: string | null
          domain: string
          email: string
          enriched_at: string | null
          first_name: string | null
          full_name: string | null
          id: string
          job_title: string | null
          last_seen_at: string | null
          occurrences: number
          owner_id: string | null
          phone: string | null
          status: string
          updated_at: string
        }
        Insert: {
          address?: string | null
          company_name?: string | null
          created_at?: string
          created_contact_id?: string | null
          created_investor_id?: string | null
          domain: string
          email: string
          enriched_at?: string | null
          first_name?: string | null
          full_name?: string | null
          id?: string
          job_title?: string | null
          last_seen_at?: string | null
          occurrences?: number
          owner_id?: string | null
          phone?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          address?: string | null
          company_name?: string | null
          created_at?: string
          created_contact_id?: string | null
          created_investor_id?: string | null
          domain?: string
          email?: string
          enriched_at?: string | null
          first_name?: string | null
          full_name?: string | null
          id?: string
          job_title?: string | null
          last_seen_at?: string | null
          occurrences?: number
          owner_id?: string | null
          phone?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "mailscan_candidates_created_contact_id_fkey"
            columns: ["created_contact_id"]
            isOneToOne: false
            referencedRelation: "prospect_contacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "mailscan_candidates_created_investor_id_fkey"
            columns: ["created_investor_id"]
            isOneToOne: false
            referencedRelation: "investors"
            referencedColumns: ["id"]
          },
        ]
      }
      mailscan_domains: {
        Row: {
          checked_at: string | null
          company_name: string | null
          created_at: string
          domain: string
          id: string
          reason: string | null
          site_url: string | null
          updated_at: string
          verdict: string
        }
        Insert: {
          checked_at?: string | null
          company_name?: string | null
          created_at?: string
          domain: string
          id?: string
          reason?: string | null
          site_url?: string | null
          updated_at?: string
          verdict?: string
        }
        Update: {
          checked_at?: string | null
          company_name?: string | null
          created_at?: string
          domain?: string
          id?: string
          reason?: string | null
          site_url?: string | null
          updated_at?: string
          verdict?: string
        }
        Relationships: []
      }
      mailscan_state: {
        Row: {
          candidates_found: number
          created_at: string
          domains_checked: number
          folder: string
          id: boolean
          last_error: string | null
          lease_until: string | null
          messages_done: number
          next_link: string | null
          scan_from: string | null
          scan_to: string | null
          skipped: number
          status: string
          updated_at: string
        }
        Insert: {
          candidates_found?: number
          created_at?: string
          domains_checked?: number
          folder?: string
          id?: boolean
          last_error?: string | null
          lease_until?: string | null
          messages_done?: number
          next_link?: string | null
          scan_from?: string | null
          scan_to?: string | null
          skipped?: number
          status?: string
          updated_at?: string
        }
        Update: {
          candidates_found?: number
          created_at?: string
          domains_checked?: number
          folder?: string
          id?: boolean
          last_error?: string | null
          lease_until?: string | null
          messages_done?: number
          next_link?: string | null
          scan_from?: string | null
          scan_to?: string | null
          skipped?: number
          status?: string
          updated_at?: string
        }
        Relationships: []
      }
      mandate_templates: {
        Row: {
          body: string
          compliance_notes: string | null
          created_at: string
          exclusive: boolean
          file_name: string | null
          file_path: string | null
          id: string
          kind: string
          sort_order: number
          title: string
          updated_at: string
        }
        Insert: {
          body?: string
          compliance_notes?: string | null
          created_at?: string
          exclusive?: boolean
          file_name?: string | null
          file_path?: string | null
          id?: string
          kind: string
          sort_order?: number
          title: string
          updated_at?: string
        }
        Update: {
          body?: string
          compliance_notes?: string | null
          created_at?: string
          exclusive?: boolean
          file_name?: string | null
          file_path?: string | null
          id?: string
          kind?: string
          sort_order?: number
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      mandates: {
        Row: {
          address: string | null
          agent_id: string | null
          asset_id: string | null
          asset_title: string | null
          created_at: string
          envelope_id: string | null
          expires_at: string | null
          id: string
          number: number
          number_suffix: string
          signature_status: string | null
          signed_at: string | null
          signer_email: string | null
          source: string | null
          start_date: string | null
          status: string
          template_id: string | null
          updated_at: string
        }
        Insert: {
          address?: string | null
          agent_id?: string | null
          asset_id?: string | null
          asset_title?: string | null
          created_at?: string
          envelope_id?: string | null
          expires_at?: string | null
          id?: string
          number?: number
          number_suffix?: string
          signature_status?: string | null
          signed_at?: string | null
          signer_email?: string | null
          source?: string | null
          start_date?: string | null
          status?: string
          template_id?: string | null
          updated_at?: string
        }
        Update: {
          address?: string | null
          agent_id?: string | null
          asset_id?: string | null
          asset_title?: string | null
          created_at?: string
          envelope_id?: string | null
          expires_at?: string | null
          id?: string
          number?: number
          number_suffix?: string
          signature_status?: string | null
          signed_at?: string | null
          signer_email?: string | null
          source?: string | null
          start_date?: string | null
          status?: string
          template_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "mandates_agent_id_fkey"
            columns: ["agent_id"]
            isOneToOne: false
            referencedRelation: "commercial_agents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "mandates_asset_id_fkey"
            columns: ["asset_id"]
            isOneToOne: true
            referencedRelation: "assets"
            referencedColumns: ["id"]
          },
        ]
      }
      manual_sections: {
        Row: {
          body: string
          created_at: string
          id: string
          question: string | null
          tab: string
          title: string
        }
        Insert: {
          body: string
          created_at?: string
          id?: string
          question?: string | null
          tab: string
          title: string
        }
        Update: {
          body?: string
          created_at?: string
          id?: string
          question?: string | null
          tab?: string
          title?: string
        }
        Relationships: []
      }
      nas_files: {
        Row: {
          asset_id: string | null
          category: string | null
          created_at: string
          folder_id: string | null
          id: string
          mode: string
          rel_path: string
          sha256: string
          size_bytes: number | null
          status: string
          storage_path: string | null
        }
        Insert: {
          asset_id?: string | null
          category?: string | null
          created_at?: string
          folder_id?: string | null
          id?: string
          mode?: string
          rel_path: string
          sha256: string
          size_bytes?: number | null
          status?: string
          storage_path?: string | null
        }
        Update: {
          asset_id?: string | null
          category?: string | null
          created_at?: string
          folder_id?: string | null
          id?: string
          mode?: string
          rel_path?: string
          sha256?: string
          size_bytes?: number | null
          status?: string
          storage_path?: string | null
        }
        Relationships: []
      }
      nas_folders: {
        Row: {
          asset_id: string | null
          candidates: Json
          city: string | null
          created_at: string
          folder_path: string
          id: string
          label: string
          status: string
          updated_at: string
          year: string | null
        }
        Insert: {
          asset_id?: string | null
          candidates?: Json
          city?: string | null
          created_at?: string
          folder_path: string
          id?: string
          label: string
          status?: string
          updated_at?: string
          year?: string | null
        }
        Update: {
          asset_id?: string | null
          candidates?: Json
          city?: string | null
          created_at?: string
          folder_path?: string
          id?: string
          label?: string
          status?: string
          updated_at?: string
          year?: string | null
        }
        Relationships: []
      }
      nas_ingest_keys: {
        Row: {
          created_at: string
          id: string
          key_hash: string
          key_hint: string
          last_used_at: string | null
          revoked: boolean
        }
        Insert: {
          created_at?: string
          id?: string
          key_hash: string
          key_hint: string
          last_used_at?: string | null
          revoked?: boolean
        }
        Update: {
          created_at?: string
          id?: string
          key_hash?: string
          key_hint?: string
          last_used_at?: string | null
          revoked?: boolean
        }
        Relationships: []
      }
      news_items: {
        Row: {
          company: string
          created_at: string
          excerpt: string | null
          id: string
          investor_id: string | null
          mail_graph_id: string | null
          prospect_company_id: string | null
          published_at: string
          source: string | null
          title: string
          updated_at: string
        }
        Insert: {
          company: string
          created_at?: string
          excerpt?: string | null
          id?: string
          investor_id?: string | null
          mail_graph_id?: string | null
          prospect_company_id?: string | null
          published_at?: string
          source?: string | null
          title: string
          updated_at?: string
        }
        Update: {
          company?: string
          created_at?: string
          excerpt?: string | null
          id?: string
          investor_id?: string | null
          mail_graph_id?: string | null
          prospect_company_id?: string | null
          published_at?: string
          source?: string | null
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "news_items_investor_id_fkey"
            columns: ["investor_id"]
            isOneToOne: false
            referencedRelation: "investors"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "news_items_prospect_company_id_fkey"
            columns: ["prospect_company_id"]
            isOneToOne: false
            referencedRelation: "prospect_companies"
            referencedColumns: ["id"]
          },
        ]
      }
      prospect_companies: {
        Row: {
          address: string | null
          asset_classes: string[]
          bands: Json
          city: string | null
          contacts_scraped_at: string | null
          converted_at: string | null
          converted_investor_id: string | null
          created_at: string
          id: string
          investor_profile: string | null
          name: string
          owner_id: string | null
          regions: string[]
          sector: string | null
          source_url: string | null
          strategies_by_asset: Json
          updated_at: string
        }
        Insert: {
          address?: string | null
          asset_classes?: string[]
          bands?: Json
          city?: string | null
          contacts_scraped_at?: string | null
          converted_at?: string | null
          converted_investor_id?: string | null
          created_at?: string
          id?: string
          investor_profile?: string | null
          name: string
          owner_id?: string | null
          regions?: string[]
          sector?: string | null
          source_url?: string | null
          strategies_by_asset?: Json
          updated_at?: string
        }
        Update: {
          address?: string | null
          asset_classes?: string[]
          bands?: Json
          city?: string | null
          contacts_scraped_at?: string | null
          converted_at?: string | null
          converted_investor_id?: string | null
          created_at?: string
          id?: string
          investor_profile?: string | null
          name?: string
          owner_id?: string | null
          regions?: string[]
          sector?: string | null
          source_url?: string | null
          strategies_by_asset?: Json
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "prospect_companies_converted_investor_id_fkey"
            columns: ["converted_investor_id"]
            isOneToOne: false
            referencedRelation: "investors"
            referencedColumns: ["id"]
          },
        ]
      }
      prospect_contacts: {
        Row: {
          company_id: string
          created_at: string
          email: string | null
          email_checked_at: string | null
          first_name: string | null
          full_name: string
          id: string
          job_title: string | null
          notes: string | null
          owner_id: string | null
          phone: string | null
          source_url: string | null
          updated_at: string
        }
        Insert: {
          company_id: string
          created_at?: string
          email?: string | null
          email_checked_at?: string | null
          first_name?: string | null
          full_name: string
          id?: string
          job_title?: string | null
          notes?: string | null
          owner_id?: string | null
          phone?: string | null
          source_url?: string | null
          updated_at?: string
        }
        Update: {
          company_id?: string
          created_at?: string
          email?: string | null
          email_checked_at?: string | null
          first_name?: string | null
          full_name?: string
          id?: string
          job_title?: string | null
          notes?: string | null
          owner_id?: string | null
          phone?: string | null
          source_url?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "prospect_contacts_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "prospect_companies"
            referencedColumns: ["id"]
          },
        ]
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
      shared_links: {
        Row: {
          created_at: string
          created_by: string | null
          error: string | null
          found_comparables: number
          found_contacts: number
          found_news: number
          id: string
          note: string | null
          status: string
          summary: string | null
          title: string | null
          url: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          error?: string | null
          found_comparables?: number
          found_contacts?: number
          found_news?: number
          id?: string
          note?: string | null
          status?: string
          summary?: string | null
          title?: string | null
          url: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          error?: string | null
          found_comparables?: number
          found_contacts?: number
          found_news?: number
          id?: string
          note?: string | null
          status?: string
          summary?: string | null
          title?: string | null
          url?: string
        }
        Relationships: []
      }
      sourcing_scanned: {
        Row: {
          created_at: string
          error: string | null
          found: number
          graph_id: string
          pdf_count: number
          subject: string | null
        }
        Insert: {
          created_at?: string
          error?: string | null
          found?: number
          graph_id: string
          pdf_count?: number
          subject?: string | null
        }
        Update: {
          created_at?: string
          error?: string | null
          found?: number
          graph_id?: string
          pdf_count?: number
          subject?: string | null
        }
        Relationships: []
      }
      target_catchup_state: {
        Row: {
          fees_found: number
          id: boolean
          last_error: string | null
          lease_until: string | null
          mails_done: number
          status: string
          targets_found: number
          updated_at: string
        }
        Insert: {
          fees_found?: number
          id?: boolean
          last_error?: string | null
          lease_until?: string | null
          mails_done?: number
          status?: string
          targets_found?: number
          updated_at?: string
        }
        Update: {
          fees_found?: number
          id?: boolean
          last_error?: string | null
          lease_until?: string | null
          mails_done?: number
          status?: string
          targets_found?: number
          updated_at?: string
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
      training_progress: {
        Row: {
          attempts: number
          best_score: number | null
          id: string
          module_slug: string
          passed_at: string | null
          step_index: number
          updated_at: string
          user_id: string
        }
        Insert: {
          attempts?: number
          best_score?: number | null
          id?: string
          module_slug: string
          passed_at?: string | null
          step_index?: number
          updated_at?: string
          user_id?: string
        }
        Update: {
          attempts?: number
          best_score?: number | null
          id?: string
          module_slug?: string
          passed_at?: string | null
          step_index?: number
          updated_at?: string
          user_id?: string
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
      aiscan_schedule: { Args: { _on: boolean }; Returns: undefined }
      aiscan_stop_internal: { Args: never; Returns: undefined }
      asset_family: { Args: { _cls: string }; Returns: string }
      can_see_deal: { Args: { _owner: string }; Returns: boolean }
      can_see_owner: { Args: { _owner: string }; Returns: boolean }
      cfnews_scrape_schedule: { Args: { _on: boolean }; Returns: undefined }
      claim_attachment_lease: { Args: never; Returns: boolean }
      claim_extraction_job: {
        Args: never
        Returns: {
          created_at: string
          error: string | null
          id: string
          kind: string
          lease_until: string | null
          next_run_at: string
          owner_id: string
          result: Json | null
          status: string
          target_id: string | null
          url: string | null
        }[]
        SetofOptions: {
          from: "*"
          to: "extraction_jobs"
          isOneToOne: false
          isSetofReturn: true
        }
      }
      claim_investor_profile: { Args: never; Returns: string }
      claim_lead_document_reminder: { Args: { _id: string }; Returns: boolean }
      claim_lead_research: { Args: { _id: string }; Returns: boolean }
      claim_pige_brevo: { Args: { _id: string }; Returns: boolean }
      claim_role: {
        Args: never
        Returns: Database["public"]["Enums"]["app_role"]
      }
      close_due_piges: { Args: { _deal: string }; Returns: undefined }
      comparable_facets: {
        Args: never
        Returns: {
          asset_class: string
          city: string
          n: number
          street: string
        }[]
      }
      confirm_lead_document_request: {
        Args: { _due: string; _id: string }
        Returns: undefined
      }
      confirm_pige_contact: { Args: { _id: string }; Returns: undefined }
      deal_touch_activity: { Args: { _deal: string }; Returns: undefined }
      directory_to_prospect: {
        Args: { _company: string; _id: string }
        Returns: string
      }
      email_pump_tick: { Args: never; Returns: undefined }
      find_comparables: {
        Args: {
          _big_city: boolean
          _citycode: string
          _class: string
          _lat: number
          _limit?: number
          _lon: number
          _postal: string
          _street: string
        }
        Returns: {
          acquisition_details: Json
          address: string | null
          asset_class: string | null
          asset_id: string | null
          city: string | null
          citycode: string | null
          created_at: string
          deal_date: string | null
          enseigne: string | null
          excerpt: string
          id: string
          kind: string
          lat: number | null
          lon: number | null
          mail_graph_id: string | null
          notes: string | null
          postal_code: string | null
          price: number | null
          price_m2: number | null
          rent: number | null
          rent_m2: number | null
          rent_m2_weighted: number | null
          source: string | null
          street: string | null
          surface: number | null
          updated_at: string
          weighted_surface: number | null
          yield_pct: number | null
        }[]
        SetofOptions: {
          from: "*"
          to: "comparables"
          isOneToOne: false
          isSetofReturn: true
        }
      }
      finish_pige_brevo: {
        Args: {
          _error?: string
          _id: string
          _message?: string
          _state: string
        }
        Returns: undefined
      }
      finish_pige_brevo_internal: {
        Args: { _error: string; _id: string; _message: string; _state: string }
        Returns: undefined
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_known_investor_email: { Args: { p_email: string }; Returns: boolean }
      list_deal_agents: {
        Args: never
        Returns: {
          name: string
          user_id: string
        }[]
      }
      list_lead_recipients: {
        Args: never
        Returns: {
          name: string
          user_id: string
        }[]
      }
      list_mandate_agents: {
        Args: never
        Returns: {
          id: string
          name: string
        }[]
      }
      mail_is_digest: {
        Args: { _from: string; _subject: string }
        Returns: boolean
      }
      mailscan_schedule: { Args: { _on: boolean }; Returns: undefined }
      mailscan_stop_internal: { Args: never; Returns: undefined }
      owner_hidden_from_team: { Args: { _owner: string }; Returns: boolean }
      person_is_investor: {
        Args: { _email: string; _name: string }
        Returns: boolean
      }
      person_is_prospect: {
        Args: { _email: string; _name: string }
        Returns: boolean
      }
      person_key_norm: { Args: { t: string }; Returns: string }
      rate_limit_hit: {
        Args: { _key: string; _limit: number; _window_seconds: number }
        Returns: boolean
      }
      sleep_extractions_if_empty: { Args: never; Returns: undefined }
      start_email_pump: { Args: never; Returns: undefined }
      targets_catchup_unschedule: { Args: never; Returns: undefined }
      transfer_lead: {
        Args: { _deal_id: string; _recipient: string }
        Returns: undefined
      }
      trigger_automation: { Args: { path: string }; Returns: undefined }
      update_pige_message: {
        Args: { _body: string; _id: string; _subject: string }
        Returns: undefined
      }
      wake_extractions: { Args: never; Returns: undefined }
    }
    Enums: {
      app_role: "broker" | "investor" | "viewer" | "admin"
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
      app_role: ["broker", "investor", "viewer", "admin"],
    },
  },
} as const
