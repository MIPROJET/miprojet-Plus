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
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      access_requests: {
        Row: {
          admin_notes: string | null
          created_at: string
          id: string
          message: string | null
          project_id: string
          reviewed_at: string | null
          reviewed_by: string | null
          status: string | null
          user_id: string
        }
        Insert: {
          admin_notes?: string | null
          created_at?: string
          id?: string
          message?: string | null
          project_id: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string | null
          user_id: string
        }
        Update: {
          admin_notes?: string | null
          created_at?: string
          id?: string
          message?: string | null
          project_id?: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "access_requests_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "access_requests_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "public_projects"
            referencedColumns: ["id"]
          },
        ]
      }
      connection_requests: {
        Row: {
          admin_notes: string | null
          created_at: string
          id: string
          meeting_at: string | null
          meeting_link: string | null
          message: string | null
          opportunity_id: string | null
          project_id: string | null
          request_type: string
          requester_id: string
          reviewed_at: string | null
          reviewed_by: string | null
          status: string
          target_id: string | null
          updated_at: string
        }
        Insert: {
          admin_notes?: string | null
          created_at?: string
          id?: string
          meeting_at?: string | null
          meeting_link?: string | null
          message?: string | null
          opportunity_id?: string | null
          project_id?: string | null
          request_type?: string
          requester_id: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          target_id?: string | null
          updated_at?: string
        }
        Update: {
          admin_notes?: string | null
          created_at?: string
          id?: string
          meeting_at?: string | null
          meeting_link?: string | null
          message?: string | null
          opportunity_id?: string | null
          project_id?: string | null
          request_type?: string
          requester_id?: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          target_id?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      contributions: {
        Row: {
          amount: number
          created_at: string
          currency: string | null
          id: string
          payment_id: string | null
          project_id: string | null
          status: string | null
          user_id: string
        }
        Insert: {
          amount?: number
          created_at?: string
          currency?: string | null
          id?: string
          payment_id?: string | null
          project_id?: string | null
          status?: string | null
          user_id: string
        }
        Update: {
          amount?: number
          created_at?: string
          currency?: string | null
          id?: string
          payment_id?: string | null
          project_id?: string | null
          status?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "contributions_payment_id_fkey"
            columns: ["payment_id"]
            isOneToOne: false
            referencedRelation: "payments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contributions_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contributions_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "public_projects"
            referencedColumns: ["id"]
          },
        ]
      }
      database_backups: {
        Row: {
          backup_name: string
          backup_type: string | null
          created_at: string
          created_by: string | null
          error_message: string | null
          file_size: string | null
          format: string | null
          id: string
          size_bytes: number | null
          status: string | null
          tables_included: string[] | null
        }
        Insert: {
          backup_name: string
          backup_type?: string | null
          created_at?: string
          created_by?: string | null
          error_message?: string | null
          file_size?: string | null
          format?: string | null
          id?: string
          size_bytes?: number | null
          status?: string | null
          tables_included?: string[] | null
        }
        Update: {
          backup_name?: string
          backup_type?: string | null
          created_at?: string
          created_by?: string | null
          error_message?: string | null
          file_size?: string | null
          format?: string | null
          id?: string
          size_bytes?: number | null
          status?: string | null
          tables_included?: string[] | null
        }
        Relationships: []
      }
      email_campaigns: {
        Row: {
          ai_prompt: string | null
          created_at: string
          created_by: string | null
          failed_count: number | null
          html: string
          id: string
          preheader: string | null
          recipients_count: number | null
          scheduled_at: string | null
          segment: string
          segment_filter: Json | null
          sent_at: string | null
          sent_count: number | null
          status: string
          subject: string
          updated_at: string
        }
        Insert: {
          ai_prompt?: string | null
          created_at?: string
          created_by?: string | null
          failed_count?: number | null
          html: string
          id?: string
          preheader?: string | null
          recipients_count?: number | null
          scheduled_at?: string | null
          segment?: string
          segment_filter?: Json | null
          sent_at?: string | null
          sent_count?: number | null
          status?: string
          subject: string
          updated_at?: string
        }
        Update: {
          ai_prompt?: string | null
          created_at?: string
          created_by?: string | null
          failed_count?: number | null
          html?: string
          id?: string
          preheader?: string | null
          recipients_count?: number | null
          scheduled_at?: string | null
          segment?: string
          segment_filter?: Json | null
          sent_at?: string | null
          sent_count?: number | null
          status?: string
          subject?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "email_campaigns_created_by_profiles_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      email_events: {
        Row: {
          created_at: string
          event_type: string
          id: string
          payload: Json
          provider: string
          provider_message_id: string | null
          recipient_email: string | null
        }
        Insert: {
          created_at?: string
          event_type: string
          id?: string
          payload: Json
          provider: string
          provider_message_id?: string | null
          recipient_email?: string | null
        }
        Update: {
          created_at?: string
          event_type?: string
          id?: string
          payload?: Json
          provider?: string
          provider_message_id?: string | null
          recipient_email?: string | null
        }
        Relationships: []
      }
      email_logs: {
        Row: {
          bounced_at: string | null
          campaign_id: string | null
          clicked_at: string | null
          complained_at: string | null
          delivered_at: string | null
          error: string | null
          id: string
          kind: string
          last_event: string | null
          metadata: Json | null
          opened_at: string | null
          provider: string | null
          provider_id: string | null
          recipient_email: string
          recipient_user_id: string | null
          sent_at: string | null
          status: string
          subject: string | null
        }
        Insert: {
          bounced_at?: string | null
          campaign_id?: string | null
          clicked_at?: string | null
          complained_at?: string | null
          delivered_at?: string | null
          error?: string | null
          id?: string
          kind?: string
          last_event?: string | null
          metadata?: Json | null
          opened_at?: string | null
          provider?: string | null
          provider_id?: string | null
          recipient_email: string
          recipient_user_id?: string | null
          sent_at?: string | null
          status?: string
          subject?: string | null
        }
        Update: {
          bounced_at?: string | null
          campaign_id?: string | null
          clicked_at?: string | null
          complained_at?: string | null
          delivered_at?: string | null
          error?: string | null
          id?: string
          kind?: string
          last_event?: string | null
          metadata?: Json | null
          opened_at?: string | null
          provider?: string | null
          provider_id?: string | null
          recipient_email?: string
          recipient_user_id?: string | null
          sent_at?: string | null
          status?: string
          subject?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "email_logs_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "email_campaigns"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "email_logs_recipient_user_id_profiles_fkey"
            columns: ["recipient_user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      email_provider_usage: {
        Row: {
          created_at: string
          daily_limit: number
          id: string
          provider: string
          sent_count: number
          updated_at: string
          usage_date: string
        }
        Insert: {
          created_at?: string
          daily_limit: number
          id?: string
          provider: string
          sent_count?: number
          updated_at?: string
          usage_date?: string
        }
        Update: {
          created_at?: string
          daily_limit?: number
          id?: string
          provider?: string
          sent_count?: number
          updated_at?: string
          usage_date?: string
        }
        Relationships: []
      }
      email_queue: {
        Row: {
          attempts: number
          bypass_unsubscribe_check: boolean | null
          campaign_id: string | null
          created_at: string
          from_address: string | null
          html: string
          id: string
          kind: string | null
          last_error: string | null
          recipient_user_id: string | null
          reply_to: string | null
          scheduled_for: string
          sent_at: string | null
          status: string
          subject: string
          text_content: string | null
          to_email: string
          unsubscribe_url: string | null
          updated_at: string
        }
        Insert: {
          attempts?: number
          bypass_unsubscribe_check?: boolean | null
          campaign_id?: string | null
          created_at?: string
          from_address?: string | null
          html: string
          id?: string
          kind?: string | null
          last_error?: string | null
          recipient_user_id?: string | null
          reply_to?: string | null
          scheduled_for?: string
          sent_at?: string | null
          status?: string
          subject: string
          text_content?: string | null
          to_email: string
          unsubscribe_url?: string | null
          updated_at?: string
        }
        Update: {
          attempts?: number
          bypass_unsubscribe_check?: boolean | null
          campaign_id?: string | null
          created_at?: string
          from_address?: string | null
          html?: string
          id?: string
          kind?: string | null
          last_error?: string | null
          recipient_user_id?: string | null
          reply_to?: string | null
          scheduled_for?: string
          sent_at?: string | null
          status?: string
          subject?: string
          text_content?: string | null
          to_email?: string
          unsubscribe_url?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      email_templates: {
        Row: {
          created_at: string
          description: string | null
          html: string
          id: string
          is_system: boolean | null
          name: string
          subject: string | null
          updated_at: string
          variables: Json | null
        }
        Insert: {
          created_at?: string
          description?: string | null
          html: string
          id?: string
          is_system?: boolean | null
          name: string
          subject?: string | null
          updated_at?: string
          variables?: Json | null
        }
        Update: {
          created_at?: string
          description?: string | null
          html?: string
          id?: string
          is_system?: boolean | null
          name?: string
          subject?: string | null
          updated_at?: string
          variables?: Json | null
        }
        Relationships: []
      }
      email_unsubscribes: {
        Row: {
          created_at: string
          email: string
          id: string
          reason: string | null
          source: string | null
        }
        Insert: {
          created_at?: string
          email: string
          id?: string
          reason?: string | null
          source?: string | null
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          reason?: string | null
          source?: string | null
        }
        Relationships: []
      }
      entities: {
        Row: {
          city: string | null
          contact_email: string | null
          contact_phone: string | null
          country: string | null
          cover_url: string | null
          cover_url_mobile: string | null
          created_at: string
          description: string | null
          entity_type: string | null
          founded_year: number | null
          gallery_urls: string[] | null
          id: string
          is_public: boolean | null
          legal_form: string | null
          logo_url: string | null
          mp_score: number | null
          name: string
          recommendation_level: string | null
          sector: string | null
          slug: string
          socials: Json | null
          tagline: string | null
          team_size: string | null
          updated_at: string
          website_url: string | null
        }
        Insert: {
          city?: string | null
          contact_email?: string | null
          contact_phone?: string | null
          country?: string | null
          cover_url?: string | null
          cover_url_mobile?: string | null
          created_at?: string
          description?: string | null
          entity_type?: string | null
          founded_year?: number | null
          gallery_urls?: string[] | null
          id?: string
          is_public?: boolean | null
          legal_form?: string | null
          logo_url?: string | null
          mp_score?: number | null
          name: string
          recommendation_level?: string | null
          sector?: string | null
          slug: string
          socials?: Json | null
          tagline?: string | null
          team_size?: string | null
          updated_at?: string
          website_url?: string | null
        }
        Update: {
          city?: string | null
          contact_email?: string | null
          contact_phone?: string | null
          country?: string | null
          cover_url?: string | null
          cover_url_mobile?: string | null
          created_at?: string
          description?: string | null
          entity_type?: string | null
          founded_year?: number | null
          gallery_urls?: string[] | null
          id?: string
          is_public?: boolean | null
          legal_form?: string | null
          logo_url?: string | null
          mp_score?: number | null
          name?: string
          recommendation_level?: string | null
          sector?: string | null
          slug?: string
          socials?: Json | null
          tagline?: string | null
          team_size?: string | null
          updated_at?: string
          website_url?: string | null
        }
        Relationships: []
      }
      entity_governance: {
        Row: {
          bio: string | null
          created_at: string
          full_name: string
          id: string
          is_strategic: boolean | null
          linkedin_url: string | null
          project_id: string | null
          role_title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          bio?: string | null
          created_at?: string
          full_name: string
          id?: string
          is_strategic?: boolean | null
          linkedin_url?: string | null
          project_id?: string | null
          role_title: string
          updated_at?: string
          user_id: string
        }
        Update: {
          bio?: string | null
          created_at?: string
          full_name?: string
          id?: string
          is_strategic?: boolean | null
          linkedin_url?: string | null
          project_id?: string | null
          role_title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      entity_products: {
        Row: {
          created_at: string
          description: string | null
          id: string
          market: string | null
          name: string
          project_id: string | null
          revenue_share_pct: number | null
          user_id: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          market?: string | null
          name: string
          project_id?: string | null
          revenue_share_pct?: number | null
          user_id: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          market?: string | null
          name?: string
          project_id?: string | null
          revenue_share_pct?: number | null
          user_id?: string
        }
        Relationships: []
      }
      faqs: {
        Row: {
          answer: string
          category: string | null
          created_at: string
          id: string
          is_active: boolean | null
          question: string
          sort_order: number | null
          updated_at: string
        }
        Insert: {
          answer: string
          category?: string | null
          created_at?: string
          id?: string
          is_active?: boolean | null
          question: string
          sort_order?: number | null
          updated_at?: string
        }
        Update: {
          answer?: string
          category?: string | null
          created_at?: string
          id?: string
          is_active?: boolean | null
          question?: string
          sort_order?: number | null
          updated_at?: string
        }
        Relationships: []
      }
      form_progress: {
        Row: {
          created_at: string
          current_step: number | null
          data: Json | null
          form_type: string
          id: string
          is_completed: boolean | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          current_step?: number | null
          data?: Json | null
          form_type: string
          id?: string
          is_completed?: boolean | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          current_step?: number | null
          data?: Json | null
          form_type?: string
          id?: string
          is_completed?: boolean | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      investor_prospects: {
        Row: {
          admin_notes: string | null
          country: string | null
          created_at: string
          email: string
          engagement_type: string[] | null
          equity_share_pct: number | null
          expected_return_pct: number | null
          full_name: string
          id: string
          investment_capacity: string | null
          message: string | null
          phone: string | null
          project_id: string
          status: string | null
          time_horizon: string | null
          updated_at: string
          user_id: string | null
          wants_equity: boolean | null
        }
        Insert: {
          admin_notes?: string | null
          country?: string | null
          created_at?: string
          email: string
          engagement_type?: string[] | null
          equity_share_pct?: number | null
          expected_return_pct?: number | null
          full_name: string
          id?: string
          investment_capacity?: string | null
          message?: string | null
          phone?: string | null
          project_id: string
          status?: string | null
          time_horizon?: string | null
          updated_at?: string
          user_id?: string | null
          wants_equity?: boolean | null
        }
        Update: {
          admin_notes?: string | null
          country?: string | null
          created_at?: string
          email?: string
          engagement_type?: string[] | null
          equity_share_pct?: number | null
          expected_return_pct?: number | null
          full_name?: string
          id?: string
          investment_capacity?: string | null
          message?: string | null
          phone?: string | null
          project_id?: string
          status?: string | null
          time_horizon?: string | null
          updated_at?: string
          user_id?: string | null
          wants_equity?: boolean | null
        }
        Relationships: []
      }
      invoices: {
        Row: {
          created_at: string
          created_by: string | null
          currency: string | null
          due_date: string | null
          id: string
          invoice_number: string
          items: Json | null
          notes: string | null
          paid_at: string | null
          service_request_id: string | null
          status: string | null
          subtotal: number | null
          tax_amount: number | null
          tax_rate: number | null
          total: number | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          currency?: string | null
          due_date?: string | null
          id?: string
          invoice_number: string
          items?: Json | null
          notes?: string | null
          paid_at?: string | null
          service_request_id?: string | null
          status?: string | null
          subtotal?: number | null
          tax_amount?: number | null
          tax_rate?: number | null
          total?: number | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          currency?: string | null
          due_date?: string | null
          id?: string
          invoice_number?: string
          items?: Json | null
          notes?: string | null
          paid_at?: string | null
          service_request_id?: string | null
          status?: string | null
          subtotal?: number | null
          tax_amount?: number | null
          tax_rate?: number | null
          total?: number | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "invoices_service_request_id_fkey"
            columns: ["service_request_id"]
            isOneToOne: false
            referencedRelation: "service_requests"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoices_user_id_profiles_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      leads: {
        Row: {
          additional_info: Json | null
          city: string | null
          company_name: string | null
          country: string | null
          created_at: string
          difficulties: string | null
          email: string
          entity_type: string | null
          first_name: string
          id: string
          interested_sectors: string[] | null
          investment_capacity: string | null
          last_name: string
          lead_source: string
          needs: string | null
          phone: string | null
          risk_tolerance: string | null
          sector: string | null
          source_id: string | null
          user_id: string | null
          wants_foundation_participation: boolean | null
          wants_project_proposals: boolean | null
          whatsapp: string | null
        }
        Insert: {
          additional_info?: Json | null
          city?: string | null
          company_name?: string | null
          country?: string | null
          created_at?: string
          difficulties?: string | null
          email: string
          entity_type?: string | null
          first_name: string
          id?: string
          interested_sectors?: string[] | null
          investment_capacity?: string | null
          last_name: string
          lead_source?: string
          needs?: string | null
          phone?: string | null
          risk_tolerance?: string | null
          sector?: string | null
          source_id?: string | null
          user_id?: string | null
          wants_foundation_participation?: boolean | null
          wants_project_proposals?: boolean | null
          whatsapp?: string | null
        }
        Update: {
          additional_info?: Json | null
          city?: string | null
          company_name?: string | null
          country?: string | null
          created_at?: string
          difficulties?: string | null
          email?: string
          entity_type?: string | null
          first_name?: string
          id?: string
          interested_sectors?: string[] | null
          investment_capacity?: string | null
          last_name?: string
          lead_source?: string
          needs?: string | null
          phone?: string | null
          risk_tolerance?: string | null
          sector?: string | null
          source_id?: string | null
          user_id?: string | null
          wants_foundation_participation?: boolean | null
          wants_project_proposals?: boolean | null
          whatsapp?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "leads_user_id_profiles_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      maintenance_log: {
        Row: {
          action: string
          created_at: string
          enabled: boolean
          id: string
          reason: string | null
          source: string | null
          triggered_by: string | null
          triggered_by_email: string | null
        }
        Insert: {
          action: string
          created_at?: string
          enabled: boolean
          id?: string
          reason?: string | null
          source?: string | null
          triggered_by?: string | null
          triggered_by_email?: string | null
        }
        Update: {
          action?: string
          created_at?: string
          enabled?: boolean
          id?: string
          reason?: string | null
          source?: string | null
          triggered_by?: string | null
          triggered_by_email?: string | null
        }
        Relationships: []
      }
      messages: {
        Row: {
          content: string
          created_at: string
          id: string
          is_read: boolean | null
          project_id: string | null
          sender_email: string | null
          sender_id: string | null
          sender_name: string | null
          subject: string | null
        }
        Insert: {
          content: string
          created_at?: string
          id?: string
          is_read?: boolean | null
          project_id?: string | null
          sender_email?: string | null
          sender_id?: string | null
          sender_name?: string | null
          subject?: string | null
        }
        Update: {
          content?: string
          created_at?: string
          id?: string
          is_read?: boolean | null
          project_id?: string | null
          sender_email?: string | null
          sender_id?: string | null
          sender_name?: string | null
          subject?: string | null
        }
        Relationships: []
      }
      mp_certifications: {
        Row: {
          admin_notes: string | null
          certification_type: string | null
          certified_at: string | null
          content_hash: string | null
          created_at: string
          expires_at: string | null
          id: string
          project_id: string
          report_url: string | null
          scoring_id: string | null
          short_id: string | null
          signed_payload: Json | null
          status: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          admin_notes?: string | null
          certification_type?: string | null
          certified_at?: string | null
          content_hash?: string | null
          created_at?: string
          expires_at?: string | null
          id?: string
          project_id: string
          report_url?: string | null
          scoring_id?: string | null
          short_id?: string | null
          signed_payload?: Json | null
          status?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          admin_notes?: string | null
          certification_type?: string | null
          certified_at?: string | null
          content_hash?: string | null
          created_at?: string
          expires_at?: string | null
          id?: string
          project_id?: string
          report_url?: string | null
          scoring_id?: string | null
          short_id?: string | null
          signed_payload?: Json | null
          status?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "mp_certifications_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "mp_projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "mp_certifications_scoring_id_fkey"
            columns: ["scoring_id"]
            isOneToOne: false
            referencedRelation: "mp_scoring_results"
            referencedColumns: ["id"]
          },
        ]
      }
      mp_financial_records: {
        Row: {
          amount: number
          category: string | null
          created_at: string
          currency: string | null
          description: string | null
          id: string
          project_id: string
          receipt_path: string | null
          record_date: string
          record_type: string
          updated_at: string
          user_id: string
        }
        Insert: {
          amount?: number
          category?: string | null
          created_at?: string
          currency?: string | null
          description?: string | null
          id?: string
          project_id: string
          receipt_path?: string | null
          record_date?: string
          record_type?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          amount?: number
          category?: string | null
          created_at?: string
          currency?: string | null
          description?: string | null
          id?: string
          project_id?: string
          receipt_path?: string | null
          record_date?: string
          record_type?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "mp_financial_records_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "mp_projects"
            referencedColumns: ["id"]
          },
        ]
      }
      mp_funder_connections: {
        Row: {
          contact_info: string | null
          contacted_at: string | null
          created_at: string
          funder_name: string
          funder_type: string | null
          id: string
          notes: string | null
          project_id: string | null
          responded_at: string | null
          status: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          contact_info?: string | null
          contacted_at?: string | null
          created_at?: string
          funder_name: string
          funder_type?: string | null
          id?: string
          notes?: string | null
          project_id?: string | null
          responded_at?: string | null
          status?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          contact_info?: string | null
          contacted_at?: string | null
          created_at?: string
          funder_name?: string
          funder_type?: string | null
          id?: string
          notes?: string | null
          project_id?: string | null
          responded_at?: string | null
          status?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "mp_funder_connections_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "mp_projects"
            referencedColumns: ["id"]
          },
        ]
      }
      mp_introductions: {
        Row: {
          admin_notes: string | null
          amount_requested: number | null
          created_at: string
          id: string
          needs: string
          project_id: string
          status: string
          target_name: string | null
          target_sector: string | null
          target_type: string
          updated_at: string
          user_id: string
        }
        Insert: {
          admin_notes?: string | null
          amount_requested?: number | null
          created_at?: string
          id?: string
          needs: string
          project_id: string
          status?: string
          target_name?: string | null
          target_sector?: string | null
          target_type: string
          updated_at?: string
          user_id: string
        }
        Update: {
          admin_notes?: string | null
          amount_requested?: number | null
          created_at?: string
          id?: string
          needs?: string
          project_id?: string
          status?: string
          target_name?: string | null
          target_sector?: string | null
          target_type?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "mp_introductions_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "mp_projects"
            referencedColumns: ["id"]
          },
        ]
      }
      mp_project_media: {
        Row: {
          caption: string | null
          created_at: string
          id: string
          kind: string
          project_id: string
          storage_path: string
          taken_at: string | null
          user_id: string
        }
        Insert: {
          caption?: string | null
          created_at?: string
          id?: string
          kind?: string
          project_id: string
          storage_path: string
          taken_at?: string | null
          user_id: string
        }
        Update: {
          caption?: string | null
          created_at?: string
          id?: string
          kind?: string
          project_id?: string
          storage_path?: string
          taken_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "mp_project_media_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "mp_projects"
            referencedColumns: ["id"]
          },
        ]
      }
      mp_project_team: {
        Row: {
          bio: string | null
          contact_email: string | null
          contact_phone: string | null
          created_at: string
          expertise: string | null
          full_name: string
          id: string
          is_external: boolean
          organization: string | null
          photo_url: string | null
          project_id: string
          role_title: string | null
          sort_order: number
          updated_at: string
          user_id: string
        }
        Insert: {
          bio?: string | null
          contact_email?: string | null
          contact_phone?: string | null
          created_at?: string
          expertise?: string | null
          full_name: string
          id?: string
          is_external?: boolean
          organization?: string | null
          photo_url?: string | null
          project_id: string
          role_title?: string | null
          sort_order?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          bio?: string | null
          contact_email?: string | null
          contact_phone?: string | null
          created_at?: string
          expertise?: string | null
          full_name?: string
          id?: string
          is_external?: boolean
          organization?: string | null
          photo_url?: string | null
          project_id?: string
          role_title?: string | null
          sort_order?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "mp_project_team_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "mp_projects"
            referencedColumns: ["id"]
          },
        ]
      }
      mp_projects: {
        Row: {
          activity_type: string | null
          annual_revenue: number | null
          budget_initial: number | null
          city: string | null
          commercialization: string | null
          complexity_level: string
          country: string | null
          cover_url: string | null
          created_at: string
          creation_date: string | null
          description: string | null
          display_id: string | null
          employees_count: number | null
          governance: Json | null
          has_accounting: boolean | null
          has_bank_account: boolean | null
          has_business_plan: boolean | null
          id: string
          is_public: boolean
          journey: string
          legal_status: string | null
          logo_url: string | null
          maturite: string | null
          monitoring_evaluation: string | null
          monthly_expenses: number | null
          objectif: string | null
          product_description: string | null
          profile_kind: string
          project_type: string | null
          publish_when_eligible: boolean
          sector: string | null
          short_pitch: string | null
          status: string | null
          target_customers: string | null
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          activity_type?: string | null
          annual_revenue?: number | null
          budget_initial?: number | null
          city?: string | null
          commercialization?: string | null
          complexity_level?: string
          country?: string | null
          cover_url?: string | null
          created_at?: string
          creation_date?: string | null
          description?: string | null
          display_id?: string | null
          employees_count?: number | null
          governance?: Json | null
          has_accounting?: boolean | null
          has_bank_account?: boolean | null
          has_business_plan?: boolean | null
          id?: string
          is_public?: boolean
          journey?: string
          legal_status?: string | null
          logo_url?: string | null
          maturite?: string | null
          monitoring_evaluation?: string | null
          monthly_expenses?: number | null
          objectif?: string | null
          product_description?: string | null
          profile_kind?: string
          project_type?: string | null
          publish_when_eligible?: boolean
          sector?: string | null
          short_pitch?: string | null
          status?: string | null
          target_customers?: string | null
          title: string
          updated_at?: string
          user_id: string
        }
        Update: {
          activity_type?: string | null
          annual_revenue?: number | null
          budget_initial?: number | null
          city?: string | null
          commercialization?: string | null
          complexity_level?: string
          country?: string | null
          cover_url?: string | null
          created_at?: string
          creation_date?: string | null
          description?: string | null
          display_id?: string | null
          employees_count?: number | null
          governance?: Json | null
          has_accounting?: boolean | null
          has_bank_account?: boolean | null
          has_business_plan?: boolean | null
          id?: string
          is_public?: boolean
          journey?: string
          legal_status?: string | null
          logo_url?: string | null
          maturite?: string | null
          monitoring_evaluation?: string | null
          monthly_expenses?: number | null
          objectif?: string | null
          product_description?: string | null
          profile_kind?: string
          project_type?: string | null
          publish_when_eligible?: boolean
          sector?: string | null
          short_pitch?: string | null
          status?: string | null
          target_customers?: string | null
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      mp_recommendations: {
        Row: {
          category: string
          created_at: string
          description: string | null
          done_at: string | null
          id: string
          project_id: string
          recommended_action: string | null
          related_service_code: string | null
          severity: string
          source: string
          status: string
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          category: string
          created_at?: string
          description?: string | null
          done_at?: string | null
          id?: string
          project_id: string
          recommended_action?: string | null
          related_service_code?: string | null
          severity?: string
          source?: string
          status?: string
          title: string
          updated_at?: string
          user_id: string
        }
        Update: {
          category?: string
          created_at?: string
          description?: string | null
          done_at?: string | null
          id?: string
          project_id?: string
          recommended_action?: string | null
          related_service_code?: string | null
          severity?: string
          source?: string
          status?: string
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "mp_recommendations_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "mp_projects"
            referencedColumns: ["id"]
          },
        ]
      }
      mp_scoring_results: {
        Row: {
          answers: Json | null
          created_at: string
          faiblesses: string[] | null
          forces: string[] | null
          id: string
          is_active: boolean | null
          niveau: string | null
          project_id: string
          recommandations: string[] | null
          score_financier: number | null
          score_global: number | null
          score_impact: number | null
          score_juridique: number | null
          score_marche: number | null
          score_technique: number | null
          updated_at: string
          user_id: string
        }
        Insert: {
          answers?: Json | null
          created_at?: string
          faiblesses?: string[] | null
          forces?: string[] | null
          id?: string
          is_active?: boolean | null
          niveau?: string | null
          project_id: string
          recommandations?: string[] | null
          score_financier?: number | null
          score_global?: number | null
          score_impact?: number | null
          score_juridique?: number | null
          score_marche?: number | null
          score_technique?: number | null
          updated_at?: string
          user_id: string
        }
        Update: {
          answers?: Json | null
          created_at?: string
          faiblesses?: string[] | null
          forces?: string[] | null
          id?: string
          is_active?: boolean | null
          niveau?: string | null
          project_id?: string
          recommandations?: string[] | null
          score_financier?: number | null
          score_global?: number | null
          score_impact?: number | null
          score_juridique?: number | null
          score_marche?: number | null
          score_technique?: number | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "mp_scoring_results_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "mp_projects"
            referencedColumns: ["id"]
          },
        ]
      }
      mp_service_catalog: {
        Row: {
          category: string
          code: string
          created_at: string
          currency: string
          description: string | null
          duration: string | null
          id: string
          is_active: boolean
          level_required: string | null
          price: number
          short_description: string | null
          sort_order: number
          title: string
          updated_at: string
        }
        Insert: {
          category: string
          code: string
          created_at?: string
          currency?: string
          description?: string | null
          duration?: string | null
          id?: string
          is_active?: boolean
          level_required?: string | null
          price?: number
          short_description?: string | null
          sort_order?: number
          title: string
          updated_at?: string
        }
        Update: {
          category?: string
          code?: string
          created_at?: string
          currency?: string
          description?: string | null
          duration?: string | null
          id?: string
          is_active?: boolean
          level_required?: string | null
          price?: number
          short_description?: string | null
          sort_order?: number
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      mp_service_request_history: {
        Row: {
          changed_by: string | null
          created_at: string
          from_status: string | null
          id: string
          note: string | null
          request_id: string
          to_status: string
        }
        Insert: {
          changed_by?: string | null
          created_at?: string
          from_status?: string | null
          id?: string
          note?: string | null
          request_id: string
          to_status: string
        }
        Update: {
          changed_by?: string | null
          created_at?: string
          from_status?: string | null
          id?: string
          note?: string | null
          request_id?: string
          to_status?: string
        }
        Relationships: [
          {
            foreignKeyName: "mp_service_request_history_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "mp_user_service_requests"
            referencedColumns: ["id"]
          },
        ]
      }
      mp_support_tickets: {
        Row: {
          admin_response: string | null
          attachments: Json
          category: string
          created_at: string
          id: string
          message: string
          plan_at_creation: Database["public"]["Enums"]["mp_plan_tier"]
          priority: string
          status: string
          subject: string
          updated_at: string
          user_id: string
        }
        Insert: {
          admin_response?: string | null
          attachments?: Json
          category?: string
          created_at?: string
          id?: string
          message: string
          plan_at_creation?: Database["public"]["Enums"]["mp_plan_tier"]
          priority?: string
          status?: string
          subject: string
          updated_at?: string
          user_id: string
        }
        Update: {
          admin_response?: string | null
          attachments?: Json
          category?: string
          created_at?: string
          id?: string
          message?: string
          plan_at_creation?: Database["public"]["Enums"]["mp_plan_tier"]
          priority?: string
          status?: string
          subject?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      mp_user_plans: {
        Row: {
          created_at: string
          expires_at: string | null
          started_at: string
          tier: Database["public"]["Enums"]["mp_plan_tier"]
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          expires_at?: string | null
          started_at?: string
          tier?: Database["public"]["Enums"]["mp_plan_tier"]
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          expires_at?: string | null
          started_at?: string
          tier?: Database["public"]["Enums"]["mp_plan_tier"]
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      mp_user_service_requests: {
        Row: {
          admin_notes: string | null
          amount_quoted: number | null
          completed_at: string | null
          created_at: string
          id: string
          message: string | null
          project_id: string | null
          scheduled_at: string | null
          service_id: string
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          admin_notes?: string | null
          amount_quoted?: number | null
          completed_at?: string | null
          created_at?: string
          id?: string
          message?: string | null
          project_id?: string | null
          scheduled_at?: string | null
          service_id: string
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          admin_notes?: string | null
          amount_quoted?: number | null
          completed_at?: string | null
          created_at?: string
          id?: string
          message?: string | null
          project_id?: string | null
          scheduled_at?: string | null
          service_id?: string
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "mp_user_service_requests_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "mp_projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "mp_user_service_requests_service_id_fkey"
            columns: ["service_id"]
            isOneToOne: false
            referencedRelation: "mp_service_catalog"
            referencedColumns: ["id"]
          },
        ]
      }
      mp_voice_usage: {
        Row: {
          count: number
          created_at: string
          id: string
          updated_at: string
          user_id: string
          year_month: string
        }
        Insert: {
          count?: number
          created_at?: string
          id?: string
          updated_at?: string
          user_id: string
          year_month: string
        }
        Update: {
          count?: number
          created_at?: string
          id?: string
          updated_at?: string
          user_id?: string
          year_month?: string
        }
        Relationships: []
      }
      news: {
        Row: {
          archived_at: string | null
          author_id: string | null
          author_name: string | null
          category: string | null
          content: string
          created_at: string
          email_segment: string | null
          email_sent_at: string | null
          excerpt: string | null
          id: string
          image_url: string | null
          is_featured: boolean | null
          published_at: string | null
          send_by_email: boolean
          short_slug: string | null
          status: string | null
          title: string
          updated_at: string
          video_url: string | null
          views_count: number | null
        }
        Insert: {
          archived_at?: string | null
          author_id?: string | null
          author_name?: string | null
          category?: string | null
          content: string
          created_at?: string
          email_segment?: string | null
          email_sent_at?: string | null
          excerpt?: string | null
          id?: string
          image_url?: string | null
          is_featured?: boolean | null
          published_at?: string | null
          send_by_email?: boolean
          short_slug?: string | null
          status?: string | null
          title: string
          updated_at?: string
          video_url?: string | null
          views_count?: number | null
        }
        Update: {
          archived_at?: string | null
          author_id?: string | null
          author_name?: string | null
          category?: string | null
          content?: string
          created_at?: string
          email_segment?: string | null
          email_sent_at?: string | null
          excerpt?: string | null
          id?: string
          image_url?: string | null
          is_featured?: boolean | null
          published_at?: string | null
          send_by_email?: boolean
          short_slug?: string | null
          status?: string | null
          title?: string
          updated_at?: string
          video_url?: string | null
          views_count?: number | null
        }
        Relationships: []
      }
      newsletter_subscribers: {
        Row: {
          created_at: string
          email: string
          full_name: string | null
          id: string
          is_active: boolean
          metadata: Json | null
          source: string | null
          unsubscribe_token: string | null
          unsubscribed_at: string | null
          welcomed_at: string | null
        }
        Insert: {
          created_at?: string
          email: string
          full_name?: string | null
          id?: string
          is_active?: boolean
          metadata?: Json | null
          source?: string | null
          unsubscribe_token?: string | null
          unsubscribed_at?: string | null
          welcomed_at?: string | null
        }
        Update: {
          created_at?: string
          email?: string
          full_name?: string | null
          id?: string
          is_active?: boolean
          metadata?: Json | null
          source?: string | null
          unsubscribe_token?: string | null
          unsubscribed_at?: string | null
          welcomed_at?: string | null
        }
        Relationships: []
      }
      notifications: {
        Row: {
          created_at: string
          id: string
          is_read: boolean | null
          link: string | null
          message: string | null
          metadata: Json | null
          title: string
          type: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_read?: boolean | null
          link?: string | null
          message?: string | null
          metadata?: Json | null
          title: string
          type?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          is_read?: boolean | null
          link?: string | null
          message?: string | null
          metadata?: Json | null
          title?: string
          type?: string | null
          user_id?: string
        }
        Relationships: []
      }
      opportunities: {
        Row: {
          amount_max: number | null
          amount_min: number | null
          author_id: string | null
          author_name: string | null
          category: string | null
          contact_email: string | null
          contact_phone: string | null
          content: string
          created_at: string
          currency: string | null
          deadline: string | null
          description: string | null
          eligibility: string | null
          email_segment: string | null
          email_sent_at: string | null
          external_link: string | null
          id: string
          image_url: string | null
          is_active: boolean | null
          is_featured: boolean | null
          is_premium: boolean | null
          location: string | null
          opportunity_type: string | null
          published_at: string | null
          send_by_email: boolean
          short_slug: string | null
          status: string | null
          title: string
          updated_at: string
          views_count: number | null
        }
        Insert: {
          amount_max?: number | null
          amount_min?: number | null
          author_id?: string | null
          author_name?: string | null
          category?: string | null
          contact_email?: string | null
          contact_phone?: string | null
          content?: string
          created_at?: string
          currency?: string | null
          deadline?: string | null
          description?: string | null
          eligibility?: string | null
          email_segment?: string | null
          email_sent_at?: string | null
          external_link?: string | null
          id?: string
          image_url?: string | null
          is_active?: boolean | null
          is_featured?: boolean | null
          is_premium?: boolean | null
          location?: string | null
          opportunity_type?: string | null
          published_at?: string | null
          send_by_email?: boolean
          short_slug?: string | null
          status?: string | null
          title: string
          updated_at?: string
          views_count?: number | null
        }
        Update: {
          amount_max?: number | null
          amount_min?: number | null
          author_id?: string | null
          author_name?: string | null
          category?: string | null
          contact_email?: string | null
          contact_phone?: string | null
          content?: string
          created_at?: string
          currency?: string | null
          deadline?: string | null
          description?: string | null
          eligibility?: string | null
          email_segment?: string | null
          email_sent_at?: string | null
          external_link?: string | null
          id?: string
          image_url?: string | null
          is_active?: boolean | null
          is_featured?: boolean | null
          is_premium?: boolean | null
          location?: string | null
          opportunity_type?: string | null
          published_at?: string | null
          send_by_email?: boolean
          short_slug?: string | null
          status?: string | null
          title?: string
          updated_at?: string
          views_count?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "opportunities_author_id_profiles_fkey"
            columns: ["author_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      payments: {
        Row: {
          amount: number
          created_at: string
          currency: string | null
          id: string
          metadata: Json | null
          payment_method: string | null
          payment_reference: string | null
          project_id: string | null
          service_request_id: string | null
          status: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          amount?: number
          created_at?: string
          currency?: string | null
          id?: string
          metadata?: Json | null
          payment_method?: string | null
          payment_reference?: string | null
          project_id?: string | null
          service_request_id?: string | null
          status?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          amount?: number
          created_at?: string
          currency?: string | null
          id?: string
          metadata?: Json | null
          payment_method?: string | null
          payment_reference?: string | null
          project_id?: string | null
          service_request_id?: string | null
          status?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "payments_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payments_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "public_projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payments_project_id_projects_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payments_project_id_projects_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "public_projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payments_service_request_id_fkey"
            columns: ["service_request_id"]
            isOneToOne: false
            referencedRelation: "service_requests"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payments_user_id_profiles_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      platform_documents: {
        Row: {
          access_level: string | null
          associated_form: string | null
          category: string | null
          cover_path: string | null
          cover_url: string | null
          created_at: string
          created_by: string | null
          description: string | null
          download_count: number | null
          file_path: string | null
          file_size: number | null
          file_type: string | null
          file_url: string | null
          id: string
          is_active: boolean | null
          requires_login: boolean | null
          short_slug: string | null
          target_audience: string | null
          title: string
          updated_at: string
        }
        Insert: {
          access_level?: string | null
          associated_form?: string | null
          category?: string | null
          cover_path?: string | null
          cover_url?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          download_count?: number | null
          file_path?: string | null
          file_size?: number | null
          file_type?: string | null
          file_url?: string | null
          id?: string
          is_active?: boolean | null
          requires_login?: boolean | null
          short_slug?: string | null
          target_audience?: string | null
          title: string
          updated_at?: string
        }
        Update: {
          access_level?: string | null
          associated_form?: string | null
          category?: string | null
          cover_path?: string | null
          cover_url?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          download_count?: number | null
          file_path?: string | null
          file_size?: number | null
          file_type?: string | null
          file_url?: string | null
          id?: string
          is_active?: boolean | null
          requires_login?: boolean | null
          short_slug?: string | null
          target_audience?: string | null
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "platform_documents_created_by_profiles_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      platform_settings: {
        Row: {
          category: string | null
          created_at: string
          id: string
          key: string
          updated_at: string
          value: string | null
        }
        Insert: {
          category?: string | null
          created_at?: string
          id?: string
          key: string
          updated_at?: string
          value?: string | null
        }
        Update: {
          category?: string | null
          created_at?: string
          id?: string
          key?: string
          updated_at?: string
          value?: string | null
        }
        Relationships: []
      }
      profiles: {
        Row: {
          account_status: string | null
          annual_revenue: number | null
          avatar_url: string | null
          bio: string | null
          business_model: string | null
          city: string | null
          company_name: string | null
          country: string | null
          created_at: string
          email: string | null
          employees_count: number | null
          first_name: string | null
          founding_year: number | null
          id: string
          is_verified: boolean | null
          last_name: string | null
          legal_form: string | null
          mp_onboarded_at: string | null
          phone: string | null
          referral_code: string | null
          referred_by_code: string | null
          referred_by_user_id: string | null
          sector: string | null
          share_capital: number | null
          suspended_at: string | null
          suspended_reason: string | null
          total_commissions: number | null
          total_referrals: number | null
          unsubscribe_token: string | null
          updated_at: string
          user_type: string
          website: string | null
          whatsapp: string | null
        }
        Insert: {
          account_status?: string | null
          annual_revenue?: number | null
          avatar_url?: string | null
          bio?: string | null
          business_model?: string | null
          city?: string | null
          company_name?: string | null
          country?: string | null
          created_at?: string
          email?: string | null
          employees_count?: number | null
          first_name?: string | null
          founding_year?: number | null
          id: string
          is_verified?: boolean | null
          last_name?: string | null
          legal_form?: string | null
          mp_onboarded_at?: string | null
          phone?: string | null
          referral_code?: string | null
          referred_by_code?: string | null
          referred_by_user_id?: string | null
          sector?: string | null
          share_capital?: number | null
          suspended_at?: string | null
          suspended_reason?: string | null
          total_commissions?: number | null
          total_referrals?: number | null
          unsubscribe_token?: string | null
          updated_at?: string
          user_type?: string
          website?: string | null
          whatsapp?: string | null
        }
        Update: {
          account_status?: string | null
          annual_revenue?: number | null
          avatar_url?: string | null
          bio?: string | null
          business_model?: string | null
          city?: string | null
          company_name?: string | null
          country?: string | null
          created_at?: string
          email?: string | null
          employees_count?: number | null
          first_name?: string | null
          founding_year?: number | null
          id?: string
          is_verified?: boolean | null
          last_name?: string | null
          legal_form?: string | null
          mp_onboarded_at?: string | null
          phone?: string | null
          referral_code?: string | null
          referred_by_code?: string | null
          referred_by_user_id?: string | null
          sector?: string | null
          share_capital?: number | null
          suspended_at?: string | null
          suspended_reason?: string | null
          total_commissions?: number | null
          total_referrals?: number | null
          unsubscribe_token?: string | null
          updated_at?: string
          user_type?: string
          website?: string | null
          whatsapp?: string | null
        }
        Relationships: []
      }
      project_evaluations: {
        Row: {
          actions_structuration: string[] | null
          answers: Json | null
          certified_at: string | null
          created_at: string
          faiblesses: string[] | null
          forces: string[] | null
          id: string
          interpretation: string | null
          is_active: boolean | null
          is_certified: boolean | null
          messages_strategiques: string[] | null
          niveau: string | null
          niveau_maturite: number | null
          parcours_recommande: string | null
          prochaines_etapes: string[] | null
          project_id: string
          recommandations: string[] | null
          resume: string | null
          score_equipe: number | null
          score_financier: number | null
          score_global: number | null
          score_impact: number | null
          score_juridique: number | null
          score_marche: number | null
          score_maturite: number | null
          score_porteur: number | null
          score_projet: number | null
          score_technique: number | null
          updated_at: string
          user_id: string
        }
        Insert: {
          actions_structuration?: string[] | null
          answers?: Json | null
          certified_at?: string | null
          created_at?: string
          faiblesses?: string[] | null
          forces?: string[] | null
          id?: string
          interpretation?: string | null
          is_active?: boolean | null
          is_certified?: boolean | null
          messages_strategiques?: string[] | null
          niveau?: string | null
          niveau_maturite?: number | null
          parcours_recommande?: string | null
          prochaines_etapes?: string[] | null
          project_id: string
          recommandations?: string[] | null
          resume?: string | null
          score_equipe?: number | null
          score_financier?: number | null
          score_global?: number | null
          score_impact?: number | null
          score_juridique?: number | null
          score_marche?: number | null
          score_maturite?: number | null
          score_porteur?: number | null
          score_projet?: number | null
          score_technique?: number | null
          updated_at?: string
          user_id: string
        }
        Update: {
          actions_structuration?: string[] | null
          answers?: Json | null
          certified_at?: string | null
          created_at?: string
          faiblesses?: string[] | null
          forces?: string[] | null
          id?: string
          interpretation?: string | null
          is_active?: boolean | null
          is_certified?: boolean | null
          messages_strategiques?: string[] | null
          niveau?: string | null
          niveau_maturite?: number | null
          parcours_recommande?: string | null
          prochaines_etapes?: string[] | null
          project_id?: string
          recommandations?: string[] | null
          resume?: string | null
          score_equipe?: number | null
          score_financier?: number | null
          score_global?: number | null
          score_impact?: number | null
          score_juridique?: number | null
          score_marche?: number | null
          score_maturite?: number | null
          score_porteur?: number | null
          score_projet?: number | null
          score_technique?: number | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "project_evaluations_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_evaluations_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "public_projects"
            referencedColumns: ["id"]
          },
        ]
      }
      project_team: {
        Row: {
          bio: string | null
          created_at: string
          display_order: number | null
          full_name: string
          id: string
          photo_url: string | null
          project_id: string
          role_title: string
        }
        Insert: {
          bio?: string | null
          created_at?: string
          display_order?: number | null
          full_name: string
          id?: string
          photo_url?: string | null
          project_id: string
          role_title: string
        }
        Update: {
          bio?: string | null
          created_at?: string
          display_order?: number | null
          full_name?: string
          id?: string
          photo_url?: string | null
          project_id?: string
          role_title?: string
        }
        Relationships: [
          {
            foreignKeyName: "project_team_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_team_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "public_projects"
            referencedColumns: ["id"]
          },
        ]
      }
      project_updates: {
        Row: {
          author_id: string | null
          content: string
          created_at: string
          id: string
          project_id: string
          title: string | null
        }
        Insert: {
          author_id?: string | null
          content: string
          created_at?: string
          id?: string
          project_id: string
          title?: string | null
        }
        Update: {
          author_id?: string | null
          content?: string
          created_at?: string
          id?: string
          project_id?: string
          title?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "project_updates_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_updates_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "public_projects"
            referencedColumns: ["id"]
          },
        ]
      }
      projects: {
        Row: {
          amount_requested: number | null
          category: string | null
          city: string | null
          country: string | null
          cover_url: string | null
          cover_url_mobile: string | null
          created_at: string
          currency: string | null
          current_funding: number | null
          description: string | null
          display_id: string | null
          documents: Json | null
          expected_roi: number | null
          fonds_disponibles: string | null
          funding_goal: number | null
          funding_types: string[] | null
          funds_raised: number | null
          gallery_urls: string[] | null
          id: string
          image_url: string | null
          is_public: boolean | null
          logo_url: string | null
          mp_score: number | null
          owner_id: string
          public_summary: string | null
          recommendation_level: string | null
          repayment_capacity: string | null
          risk_score: string | null
          sector: string | null
          short_slug: string | null
          slug: string | null
          status: string | null
          tagline: string | null
          title: string
          updated_at: string
          website_url: string | null
        }
        Insert: {
          amount_requested?: number | null
          category?: string | null
          city?: string | null
          country?: string | null
          cover_url?: string | null
          cover_url_mobile?: string | null
          created_at?: string
          currency?: string | null
          current_funding?: number | null
          description?: string | null
          display_id?: string | null
          documents?: Json | null
          expected_roi?: number | null
          fonds_disponibles?: string | null
          funding_goal?: number | null
          funding_types?: string[] | null
          funds_raised?: number | null
          gallery_urls?: string[] | null
          id?: string
          image_url?: string | null
          is_public?: boolean | null
          logo_url?: string | null
          mp_score?: number | null
          owner_id: string
          public_summary?: string | null
          recommendation_level?: string | null
          repayment_capacity?: string | null
          risk_score?: string | null
          sector?: string | null
          short_slug?: string | null
          slug?: string | null
          status?: string | null
          tagline?: string | null
          title: string
          updated_at?: string
          website_url?: string | null
        }
        Update: {
          amount_requested?: number | null
          category?: string | null
          city?: string | null
          country?: string | null
          cover_url?: string | null
          cover_url_mobile?: string | null
          created_at?: string
          currency?: string | null
          current_funding?: number | null
          description?: string | null
          display_id?: string | null
          documents?: Json | null
          expected_roi?: number | null
          fonds_disponibles?: string | null
          funding_goal?: number | null
          funding_types?: string[] | null
          funds_raised?: number | null
          gallery_urls?: string[] | null
          id?: string
          image_url?: string | null
          is_public?: boolean | null
          logo_url?: string | null
          mp_score?: number | null
          owner_id?: string
          public_summary?: string | null
          recommendation_level?: string | null
          repayment_capacity?: string | null
          risk_score?: string | null
          sector?: string | null
          short_slug?: string | null
          slug?: string | null
          status?: string | null
          tagline?: string | null
          title?: string
          updated_at?: string
          website_url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "projects_owner_id_profiles_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      referrals: {
        Row: {
          commission_amount: number | null
          commission_rate: number | null
          completed_at: string | null
          created_at: string
          id: string
          paid_at: string | null
          referee_id: string | null
          referral_code: string
          referral_link: string | null
          referrer_id: string
          status: string | null
        }
        Insert: {
          commission_amount?: number | null
          commission_rate?: number | null
          completed_at?: string | null
          created_at?: string
          id?: string
          paid_at?: string | null
          referee_id?: string | null
          referral_code: string
          referral_link?: string | null
          referrer_id: string
          status?: string | null
        }
        Update: {
          commission_amount?: number | null
          commission_rate?: number | null
          completed_at?: string | null
          created_at?: string
          id?: string
          paid_at?: string | null
          referee_id?: string | null
          referral_code?: string
          referral_link?: string | null
          referrer_id?: string
          status?: string | null
        }
        Relationships: []
      }
      service_requests: {
        Row: {
          admin_notes: string | null
          company_name: string | null
          created_at: string
          description: string | null
          funding_needed: number | null
          has_business_plan: boolean | null
          id: string
          project_stage: string | null
          sector: string | null
          service_type: string
          status: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          admin_notes?: string | null
          company_name?: string | null
          created_at?: string
          description?: string | null
          funding_needed?: number | null
          has_business_plan?: boolean | null
          id?: string
          project_stage?: string | null
          sector?: string | null
          service_type: string
          status?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          admin_notes?: string | null
          company_name?: string | null
          created_at?: string
          description?: string | null
          funding_needed?: number | null
          has_business_plan?: boolean | null
          id?: string
          project_stage?: string | null
          sector?: string | null
          service_type?: string
          status?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      subscription_plans: {
        Row: {
          created_at: string
          currency: string | null
          description: string | null
          duration_days: number | null
          duration_type: string | null
          features: Json | null
          id: string
          is_active: boolean | null
          name: string
          price: number
          sort_order: number | null
          target_profile: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          currency?: string | null
          description?: string | null
          duration_days?: number | null
          duration_type?: string | null
          features?: Json | null
          id?: string
          is_active?: boolean | null
          name: string
          price?: number
          sort_order?: number | null
          target_profile?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          currency?: string | null
          description?: string | null
          duration_days?: number | null
          duration_type?: string | null
          features?: Json | null
          id?: string
          is_active?: boolean | null
          name?: string
          price?: number
          sort_order?: number | null
          target_profile?: string
          updated_at?: string
        }
        Relationships: []
      }
      tender_import_batches: {
        Row: {
          created_at: string | null
          duplicate_rows: number | null
          filename: string
          id: string
          imported_rows: number | null
          total_rows: number | null
        }
        Insert: {
          created_at?: string | null
          duplicate_rows?: number | null
          filename: string
          id?: string
          imported_rows?: number | null
          total_rows?: number | null
        }
        Update: {
          created_at?: string | null
          duplicate_rows?: number | null
          filename?: string
          id?: string
          imported_rows?: number | null
          total_rows?: number | null
        }
        Relationships: []
      }
      tender_interests: {
        Row: {
          created_at: string
          email: string
          entreprise: string | null
          id: string
          message: string | null
          nom: string
          pays: string | null
          secteur: string | null
          telephone: string | null
          tender_id: string
        }
        Insert: {
          created_at?: string
          email: string
          entreprise?: string | null
          id?: string
          message?: string | null
          nom: string
          pays?: string | null
          secteur?: string | null
          telephone?: string | null
          tender_id: string
        }
        Update: {
          created_at?: string
          email?: string
          entreprise?: string | null
          id?: string
          message?: string | null
          nom?: string
          pays?: string | null
          secteur?: string | null
          telephone?: string | null
          tender_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "tender_interests_tender_id_fkey"
            columns: ["tender_id"]
            isOneToOne: false
            referencedRelation: "tenders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tender_interests_tender_id_fkey"
            columns: ["tender_id"]
            isOneToOne: false
            referencedRelation: "tenders_public"
            referencedColumns: ["id"]
          },
        ]
      }
      tender_subscribers: {
        Row: {
          active: boolean | null
          created_at: string | null
          email: string
          id: string
        }
        Insert: {
          active?: boolean | null
          created_at?: string | null
          email: string
          id?: string
        }
        Update: {
          active?: boolean | null
          created_at?: string | null
          email?: string
          id?: string
        }
        Relationships: []
      }
      tenders: {
        Row: {
          country: string | null
          country_code: string | null
          country_name: string | null
          created_at: string | null
          deadline: string | null
          id: string
          notice_deadline: string | null
          notice_title: string
          sector: string | null
          slug: string | null
          status: string | null
          summary: string | null
          summary_en: string | null
          summary_fr: string | null
          title_en: string | null
          title_fr: string | null
          updated_at: string | null
          view_count: number
          views_count: number | null
        }
        Insert: {
          country?: string | null
          country_code?: string | null
          country_name?: string | null
          created_at?: string | null
          deadline?: string | null
          id?: string
          notice_deadline?: string | null
          notice_title: string
          sector?: string | null
          slug?: string | null
          status?: string | null
          summary?: string | null
          summary_en?: string | null
          summary_fr?: string | null
          title_en?: string | null
          title_fr?: string | null
          updated_at?: string | null
          view_count?: number
          views_count?: number | null
        }
        Update: {
          country?: string | null
          country_code?: string | null
          country_name?: string | null
          created_at?: string | null
          deadline?: string | null
          id?: string
          notice_deadline?: string | null
          notice_title?: string
          sector?: string | null
          slug?: string | null
          status?: string | null
          summary?: string | null
          summary_en?: string | null
          summary_fr?: string | null
          title_en?: string | null
          title_fr?: string | null
          updated_at?: string | null
          view_count?: number
          views_count?: number | null
        }
        Relationships: []
      }
      testimonials: {
        Row: {
          avatar_url: string | null
          content: string
          country: string | null
          created_at: string
          id: string
          name: string
          published: boolean
          rating: number | null
          role: string | null
          updated_at: string
          user_id: string | null
        }
        Insert: {
          avatar_url?: string | null
          content: string
          country?: string | null
          created_at?: string
          id?: string
          name: string
          published?: boolean
          rating?: number | null
          role?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          avatar_url?: string | null
          content?: string
          country?: string | null
          created_at?: string
          id?: string
          name?: string
          published?: boolean
          rating?: number | null
          role?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Relationships: []
      }
      user_journeys: {
        Row: {
          created_at: string
          current_step: number
          id: string
          journey_type: string
          project_id: string | null
          status: string | null
          step_data: Json | null
          steps_completed: number[] | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          current_step?: number
          id?: string
          journey_type: string
          project_id?: string | null
          status?: string | null
          step_data?: Json | null
          steps_completed?: number[] | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          current_step?: number
          id?: string
          journey_type?: string
          project_id?: string | null
          status?: string | null
          step_data?: Json | null
          steps_completed?: number[] | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_roles_user_id_profiles_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      user_subscriptions: {
        Row: {
          auto_renew: boolean | null
          created_at: string
          expires_at: string | null
          id: string
          payment_id: string | null
          payment_method: string | null
          payment_reference: string | null
          plan_id: string
          started_at: string | null
          status: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          auto_renew?: boolean | null
          created_at?: string
          expires_at?: string | null
          id?: string
          payment_id?: string | null
          payment_method?: string | null
          payment_reference?: string | null
          plan_id: string
          started_at?: string | null
          status?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          auto_renew?: boolean | null
          created_at?: string
          expires_at?: string | null
          id?: string
          payment_id?: string | null
          payment_method?: string | null
          payment_reference?: string | null
          plan_id?: string
          started_at?: string | null
          status?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_subscriptions_payment_id_fkey"
            columns: ["payment_id"]
            isOneToOne: false
            referencedRelation: "payments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_subscriptions_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "subscription_plans"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_subscriptions_user_id_profiles_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      public_projects: {
        Row: {
          amount_requested: number | null
          city: string | null
          country: string | null
          cover_url: string | null
          created_at: string | null
          currency: string | null
          display_id: string | null
          expected_roi: number | null
          funding_types: string[] | null
          id: string | null
          logo_url: string | null
          mp_score: number | null
          public_summary: string | null
          recommendation_level: string | null
          repayment_capacity: string | null
          sector: string | null
          short_slug: string | null
          status: string | null
          title: string | null
        }
        Insert: {
          amount_requested?: number | null
          city?: string | null
          country?: string | null
          cover_url?: string | null
          created_at?: string | null
          currency?: string | null
          display_id?: string | null
          expected_roi?: number | null
          funding_types?: string[] | null
          id?: string | null
          logo_url?: string | null
          mp_score?: number | null
          public_summary?: string | null
          recommendation_level?: string | null
          repayment_capacity?: string | null
          sector?: string | null
          short_slug?: string | null
          status?: string | null
          title?: string | null
        }
        Update: {
          amount_requested?: number | null
          city?: string | null
          country?: string | null
          cover_url?: string | null
          created_at?: string | null
          currency?: string | null
          display_id?: string | null
          expected_roi?: number | null
          funding_types?: string[] | null
          id?: string | null
          logo_url?: string | null
          mp_score?: number | null
          public_summary?: string | null
          recommendation_level?: string | null
          repayment_capacity?: string | null
          sector?: string | null
          short_slug?: string | null
          status?: string | null
          title?: string | null
        }
        Relationships: []
      }
      tenders_public: {
        Row: {
          country: string | null
          country_code: string | null
          country_name: string | null
          created_at: string | null
          deadline: string | null
          id: string | null
          notice_deadline: string | null
          sector: string | null
          slug: string | null
          status: string | null
          summary: string | null
          summary_en: string | null
          summary_fr: string | null
          title: string | null
          title_en: string | null
          title_fr: string | null
          updated_at: string | null
          view_count: number | null
          views: number | null
          views_count: number | null
        }
        Insert: {
          country?: string | null
          country_code?: string | null
          country_name?: string | null
          created_at?: string | null
          deadline?: string | null
          id?: string | null
          notice_deadline?: string | null
          sector?: string | null
          slug?: string | null
          status?: string | null
          summary?: string | null
          summary_en?: string | null
          summary_fr?: string | null
          title?: string | null
          title_en?: string | null
          title_fr?: string | null
          updated_at?: string | null
          view_count?: number | null
          views?: number | null
          views_count?: number | null
        }
        Update: {
          country?: string | null
          country_code?: string | null
          country_name?: string | null
          created_at?: string | null
          deadline?: string | null
          id?: string | null
          notice_deadline?: string | null
          sector?: string | null
          slug?: string | null
          status?: string | null
          summary?: string | null
          summary_en?: string | null
          summary_fr?: string | null
          title?: string | null
          title_en?: string | null
          title_fr?: string | null
          updated_at?: string | null
          view_count?: number | null
          views?: number | null
          views_count?: number | null
        }
        Relationships: []
      }
    }
    Functions: {
      archive_expired_tenders: { Args: never; Returns: undefined }
      build_short_slug: {
        Args: { _prefix: string; _rank: number; _ts: string }
        Returns: string
      }
      current_user_has_role: { Args: { _role: string }; Returns: boolean }
      get_admin_payments: {
        Args: never
        Returns: {
          amount: number
          created_at: string
          currency: string
          email: string
          first_name: string
          id: string
          last_name: string
          metadata: Json
          payment_method: string
          payment_reference: string
          phone: string
          status: string
          updated_at: string
          user_id: string
        }[]
      }
      get_agricapital_partition: { Args: never; Returns: Json }
      get_opportunity_contacts: {
        Args: { p_id: string }
        Returns: {
          contact_email: string
          contact_phone: string
          external_link: string
        }[]
      }
      has_active_subscription: { Args: { _user_id: string }; Returns: boolean }
      has_role: { Args: { _role: string; _user_id: string }; Returns: boolean }
      increment_email_provider_usage: {
        Args: { _provider: string }
        Returns: number
      }
      increment_tender_views: { Args: { _id: string }; Returns: undefined }
      is_any_admin: { Args: { _user_id: string }; Returns: boolean }
      is_email_unsubscribed: { Args: { _email: string }; Returns: boolean }
      pick_email_provider: { Args: never; Returns: string }
      unaccent: { Args: { "": string }; Returns: string }
      user_profile_type: { Args: { _user_id: string }; Returns: string }
      verify_certificate_public: {
        Args: { _short_id: string }
        Returns: {
          certified_at: string
          content_hash: string
          short_id: string
          signed_payload: Json
          status: string
        }[]
      }
    }
    Enums: {
      mp_plan_tier: "free" | "growth" | "partner"
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
      mp_plan_tier: ["free", "growth", "partner"],
    },
  },
} as const
