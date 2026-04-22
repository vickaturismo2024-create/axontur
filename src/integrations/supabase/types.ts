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
      account_movements: {
        Row: {
          account_id: string
          account_type: string
          amount: number
          concept: string
          created_at: string
          currency: string
          file_id: string | null
          id: string
          movement_date: string
          movement_type: string
          notes: string | null
          receipt_id: string | null
          reference: string | null
          source_payment_id: string | null
          user_id: string
        }
        Insert: {
          account_id: string
          account_type: string
          amount?: number
          concept?: string
          created_at?: string
          currency?: string
          file_id?: string | null
          id?: string
          movement_date?: string
          movement_type: string
          notes?: string | null
          receipt_id?: string | null
          reference?: string | null
          source_payment_id?: string | null
          user_id: string
        }
        Update: {
          account_id?: string
          account_type?: string
          amount?: number
          concept?: string
          created_at?: string
          currency?: string
          file_id?: string | null
          id?: string
          movement_date?: string
          movement_type?: string
          notes?: string | null
          receipt_id?: string | null
          reference?: string | null
          source_payment_id?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "account_movements_receipt_id_fkey"
            columns: ["receipt_id"]
            isOneToOne: false
            referencedRelation: "file_receipts"
            referencedColumns: ["id"]
          },
        ]
      }
      client_group_members: {
        Row: {
          client_id: string
          group_id: string
          id: string
        }
        Insert: {
          client_id: string
          group_id: string
          id?: string
        }
        Update: {
          client_id?: string
          group_id?: string
          id?: string
        }
        Relationships: [
          {
            foreignKeyName: "client_group_members_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "client_group_members_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "client_groups"
            referencedColumns: ["id"]
          },
        ]
      }
      client_groups: {
        Row: {
          created_at: string
          id: string
          name: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      client_notes: {
        Row: {
          client_id: string
          content: string
          created_at: string
          id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          client_id: string
          content?: string
          created_at?: string
          id?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          client_id?: string
          content?: string
          created_at?: string
          id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "client_notes_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
      clients: {
        Row: {
          address: string | null
          birth_date: string | null
          created_at: string
          cuil_cuit: string | null
          dni: string | null
          dni_expiry: string | null
          email: string | null
          id: string
          locality: string | null
          name: string
          nationality: string | null
          notes: string | null
          passport: string | null
          passport_expiry: string | null
          passport_issue: string | null
          phone: string | null
          phone_mobile: string | null
          phone_work: string | null
          sex: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          address?: string | null
          birth_date?: string | null
          created_at?: string
          cuil_cuit?: string | null
          dni?: string | null
          dni_expiry?: string | null
          email?: string | null
          id?: string
          locality?: string | null
          name?: string
          nationality?: string | null
          notes?: string | null
          passport?: string | null
          passport_expiry?: string | null
          passport_issue?: string | null
          phone?: string | null
          phone_mobile?: string | null
          phone_work?: string | null
          sex?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          address?: string | null
          birth_date?: string | null
          created_at?: string
          cuil_cuit?: string | null
          dni?: string | null
          dni_expiry?: string | null
          email?: string | null
          id?: string
          locality?: string | null
          name?: string
          nationality?: string | null
          notes?: string | null
          passport?: string | null
          passport_expiry?: string | null
          passport_issue?: string | null
          phone?: string | null
          phone_mobile?: string | null
          phone_work?: string | null
          sex?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      email_logs: {
        Row: {
          created_at: string
          error_message: string | null
          file_id: string | null
          id: string
          receipt_id: string | null
          reservation_id: string | null
          sent_at: string
          status: string
          subject: string
          template_type: string
          to_email: string
          user_id: string
        }
        Insert: {
          created_at?: string
          error_message?: string | null
          file_id?: string | null
          id?: string
          receipt_id?: string | null
          reservation_id?: string | null
          sent_at?: string
          status?: string
          subject?: string
          template_type?: string
          to_email: string
          user_id: string
        }
        Update: {
          created_at?: string
          error_message?: string | null
          file_id?: string | null
          id?: string
          receipt_id?: string | null
          reservation_id?: string | null
          sent_at?: string
          status?: string
          subject?: string
          template_type?: string
          to_email?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "email_logs_file_id_fkey"
            columns: ["file_id"]
            isOneToOne: false
            referencedRelation: "files"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "email_logs_receipt_id_fkey"
            columns: ["receipt_id"]
            isOneToOne: false
            referencedRelation: "file_receipts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "email_logs_reservation_id_fkey"
            columns: ["reservation_id"]
            isOneToOne: false
            referencedRelation: "reservations"
            referencedColumns: ["id"]
          },
        ]
      }
      email_send_log: {
        Row: {
          created_at: string
          error_message: string | null
          id: string
          message_id: string | null
          metadata: Json | null
          recipient_email: string
          status: string
          template_name: string
        }
        Insert: {
          created_at?: string
          error_message?: string | null
          id?: string
          message_id?: string | null
          metadata?: Json | null
          recipient_email: string
          status: string
          template_name: string
        }
        Update: {
          created_at?: string
          error_message?: string | null
          id?: string
          message_id?: string | null
          metadata?: Json | null
          recipient_email?: string
          status?: string
          template_name?: string
        }
        Relationships: []
      }
      email_send_state: {
        Row: {
          auth_email_ttl_minutes: number
          batch_size: number
          id: number
          retry_after_until: string | null
          send_delay_ms: number
          transactional_email_ttl_minutes: number
          updated_at: string
        }
        Insert: {
          auth_email_ttl_minutes?: number
          batch_size?: number
          id?: number
          retry_after_until?: string | null
          send_delay_ms?: number
          transactional_email_ttl_minutes?: number
          updated_at?: string
        }
        Update: {
          auth_email_ttl_minutes?: number
          batch_size?: number
          id?: number
          retry_after_until?: string | null
          send_delay_ms?: number
          transactional_email_ttl_minutes?: number
          updated_at?: string
        }
        Relationships: []
      }
      email_unsubscribe_tokens: {
        Row: {
          created_at: string
          email: string
          id: string
          token: string
          used_at: string | null
        }
        Insert: {
          created_at?: string
          email: string
          id?: string
          token: string
          used_at?: string | null
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          token?: string
          used_at?: string | null
        }
        Relationships: []
      }
      file_passengers: {
        Row: {
          birth_date: string | null
          client_id: string | null
          created_at: string
          dni: string | null
          file_id: string
          id: string
          name: string
          nationality: string | null
          notes: string | null
          passport: string | null
          passport_expiry: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          birth_date?: string | null
          client_id?: string | null
          created_at?: string
          dni?: string | null
          file_id: string
          id?: string
          name?: string
          nationality?: string | null
          notes?: string | null
          passport?: string | null
          passport_expiry?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          birth_date?: string | null
          client_id?: string | null
          created_at?: string
          dni?: string | null
          file_id?: string
          id?: string
          name?: string
          nationality?: string | null
          notes?: string | null
          passport?: string | null
          passport_expiry?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "file_passengers_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "file_passengers_file_id_fkey"
            columns: ["file_id"]
            isOneToOne: false
            referencedRelation: "files"
            referencedColumns: ["id"]
          },
        ]
      }
      file_receipt_items: {
        Row: {
          amount: number
          created_at: string
          currency: string
          exchange_rate: number | null
          id: string
          notes: string | null
          payment_method: string | null
          receipt_id: string
          service_currency: string | null
          user_id: string
        }
        Insert: {
          amount?: number
          created_at?: string
          currency?: string
          exchange_rate?: number | null
          id?: string
          notes?: string | null
          payment_method?: string | null
          receipt_id: string
          service_currency?: string | null
          user_id: string
        }
        Update: {
          amount?: number
          created_at?: string
          currency?: string
          exchange_rate?: number | null
          id?: string
          notes?: string | null
          payment_method?: string | null
          receipt_id?: string
          service_currency?: string | null
          user_id?: string
        }
        Relationships: []
      }
      file_receipts: {
        Row: {
          amount: number
          client_name: string
          concept: string
          created_at: string
          currency: string
          file_id: string
          id: string
          notes: string | null
          payment_date: string
          payment_method: string | null
          receipt_number: number
          status: string
          user_id: string
        }
        Insert: {
          amount?: number
          client_name?: string
          concept?: string
          created_at?: string
          currency?: string
          file_id: string
          id?: string
          notes?: string | null
          payment_date?: string
          payment_method?: string | null
          receipt_number?: number
          status?: string
          user_id: string
        }
        Update: {
          amount?: number
          client_name?: string
          concept?: string
          created_at?: string
          currency?: string
          file_id?: string
          id?: string
          notes?: string | null
          payment_date?: string
          payment_method?: string | null
          receipt_number?: number
          status?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "file_receipts_file_id_fkey"
            columns: ["file_id"]
            isOneToOne: false
            referencedRelation: "files"
            referencedColumns: ["id"]
          },
        ]
      }
      file_services: {
        Row: {
          confirmation_number: string | null
          cost: number
          created_at: string
          currency: string
          description: string
          file_id: string
          id: string
          notes: string | null
          payment_due_date: string | null
          price: number
          service_date: string | null
          service_type: string
          status: string
          supplier_id: string | null
          supplier_name: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          confirmation_number?: string | null
          cost?: number
          created_at?: string
          currency?: string
          description?: string
          file_id: string
          id?: string
          notes?: string | null
          payment_due_date?: string | null
          price?: number
          service_date?: string | null
          service_type?: string
          status?: string
          supplier_id?: string | null
          supplier_name?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          confirmation_number?: string | null
          cost?: number
          created_at?: string
          currency?: string
          description?: string
          file_id?: string
          id?: string
          notes?: string | null
          payment_due_date?: string | null
          price?: number
          service_date?: string | null
          service_type?: string
          status?: string
          supplier_id?: string | null
          supplier_name?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "file_services_file_id_fkey"
            columns: ["file_id"]
            isOneToOne: false
            referencedRelation: "files"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "file_services_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "suppliers"
            referencedColumns: ["id"]
          },
        ]
      }
      file_supplier_payments: {
        Row: {
          amount: number
          created_at: string
          currency: string
          file_id: string
          id: string
          notes: string | null
          payment_date: string
          payment_method: string | null
          reference: string | null
          supplier_id: string | null
          supplier_name: string
          user_id: string
        }
        Insert: {
          amount?: number
          created_at?: string
          currency?: string
          file_id: string
          id?: string
          notes?: string | null
          payment_date?: string
          payment_method?: string | null
          reference?: string | null
          supplier_id?: string | null
          supplier_name?: string
          user_id: string
        }
        Update: {
          amount?: number
          created_at?: string
          currency?: string
          file_id?: string
          id?: string
          notes?: string | null
          payment_date?: string
          payment_method?: string | null
          reference?: string | null
          supplier_id?: string | null
          supplier_name?: string
          user_id?: string
        }
        Relationships: []
      }
      files: {
        Row: {
          client_id: string | null
          client_name: string
          created_at: string
          currency: string
          destination: string
          end_date: string | null
          file_number: number
          id: string
          internal_notes: string | null
          legacy_id: string | null
          quote_id: string | null
          start_date: string | null
          status: string
          total_cost: number
          total_price: number
          travelers: number
          updated_at: string
          user_id: string
        }
        Insert: {
          client_id?: string | null
          client_name?: string
          created_at?: string
          currency?: string
          destination?: string
          end_date?: string | null
          file_number?: number
          id?: string
          internal_notes?: string | null
          legacy_id?: string | null
          quote_id?: string | null
          start_date?: string | null
          status?: string
          total_cost?: number
          total_price?: number
          travelers?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          client_id?: string | null
          client_name?: string
          created_at?: string
          currency?: string
          destination?: string
          end_date?: string | null
          file_number?: number
          id?: string
          internal_notes?: string | null
          legacy_id?: string | null
          quote_id?: string | null
          start_date?: string | null
          status?: string
          total_cost?: number
          total_price?: number
          travelers?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "files_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "files_quote_id_fkey"
            columns: ["quote_id"]
            isOneToOne: false
            referencedRelation: "quotes"
            referencedColumns: ["id"]
          },
        ]
      }
      flight_checkins: {
        Row: {
          checked_in_at: string
          flight_segment_id: string
          id: string
          notes: string | null
          passenger_id: string | null
        }
        Insert: {
          checked_in_at?: string
          flight_segment_id: string
          id?: string
          notes?: string | null
          passenger_id?: string | null
        }
        Update: {
          checked_in_at?: string
          flight_segment_id?: string
          id?: string
          notes?: string | null
          passenger_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "flight_checkins_flight_segment_id_fkey"
            columns: ["flight_segment_id"]
            isOneToOne: false
            referencedRelation: "flight_segments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "flight_checkins_passenger_id_fkey"
            columns: ["passenger_id"]
            isOneToOne: false
            referencedRelation: "reservation_passengers"
            referencedColumns: ["id"]
          },
        ]
      }
      flight_segments: {
        Row: {
          airline_code: string
          airline_locator: string | null
          arr_datetime_local: string | null
          booking_class: string | null
          created_at: string
          dep_datetime_local: string | null
          destination_iata: string
          flight_number: string
          has_changes: boolean
          id: string
          is_incomplete: boolean
          origin_iata: string
          raw_text: string | null
          reservation_id: string
          segment_status: string | null
          seq: number
          updated_at: string
        }
        Insert: {
          airline_code?: string
          airline_locator?: string | null
          arr_datetime_local?: string | null
          booking_class?: string | null
          created_at?: string
          dep_datetime_local?: string | null
          destination_iata?: string
          flight_number?: string
          has_changes?: boolean
          id?: string
          is_incomplete?: boolean
          origin_iata?: string
          raw_text?: string | null
          reservation_id: string
          segment_status?: string | null
          seq?: number
          updated_at?: string
        }
        Update: {
          airline_code?: string
          airline_locator?: string | null
          arr_datetime_local?: string | null
          booking_class?: string | null
          created_at?: string
          dep_datetime_local?: string | null
          destination_iata?: string
          flight_number?: string
          has_changes?: boolean
          id?: string
          is_incomplete?: boolean
          origin_iata?: string
          raw_text?: string | null
          reservation_id?: string
          segment_status?: string | null
          seq?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "flight_segments_reservation_id_fkey"
            columns: ["reservation_id"]
            isOneToOne: false
            referencedRelation: "reservations"
            referencedColumns: ["id"]
          },
        ]
      }
      payments: {
        Row: {
          amount: number
          created_at: string
          currency: string
          id: string
          method: string | null
          notes: string | null
          payment_date: string
          quote_id: string
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          amount?: number
          created_at?: string
          currency?: string
          id?: string
          method?: string | null
          notes?: string | null
          payment_date?: string
          quote_id: string
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          amount?: number
          created_at?: string
          currency?: string
          id?: string
          method?: string | null
          notes?: string | null
          payment_date?: string
          quote_id?: string
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          address: string | null
          agency_name: string | null
          created_at: string
          cuit: string | null
          date_format: string
          default_currency: string
          document_expiry_months: number
          email: string | null
          email_reply_to: string
          email_signature: string
          email_templates: Json
          file_prefix: string
          id: string
          logo_url: string | null
          notify_birthdays: boolean
          notify_document_expiry: boolean
          notify_payment_due: boolean
          payment_due_days: number
          pdf_footer_legal: string
          phone: string | null
          receipt_prefix: string
          theme: string
          updated_at: string
          user_id: string
          website: string | null
        }
        Insert: {
          address?: string | null
          agency_name?: string | null
          created_at?: string
          cuit?: string | null
          date_format?: string
          default_currency?: string
          document_expiry_months?: number
          email?: string | null
          email_reply_to?: string
          email_signature?: string
          email_templates?: Json
          file_prefix?: string
          id?: string
          logo_url?: string | null
          notify_birthdays?: boolean
          notify_document_expiry?: boolean
          notify_payment_due?: boolean
          payment_due_days?: number
          pdf_footer_legal?: string
          phone?: string | null
          receipt_prefix?: string
          theme?: string
          updated_at?: string
          user_id: string
          website?: string | null
        }
        Update: {
          address?: string | null
          agency_name?: string | null
          created_at?: string
          cuit?: string | null
          date_format?: string
          default_currency?: string
          document_expiry_months?: number
          email?: string | null
          email_reply_to?: string
          email_signature?: string
          email_templates?: Json
          file_prefix?: string
          id?: string
          logo_url?: string | null
          notify_birthdays?: boolean
          notify_document_expiry?: boolean
          notify_payment_due?: boolean
          payment_due_days?: number
          pdf_footer_legal?: string
          phone?: string | null
          receipt_prefix?: string
          theme?: string
          updated_at?: string
          user_id?: string
          website?: string | null
        }
        Relationships: []
      }
      quote_tag_assignments: {
        Row: {
          id: string
          quote_id: string
          tag_id: string
        }
        Insert: {
          id?: string
          quote_id: string
          tag_id: string
        }
        Update: {
          id?: string
          quote_id?: string
          tag_id?: string
        }
        Relationships: []
      }
      quote_tags: {
        Row: {
          color: string
          created_at: string
          id: string
          name: string
          user_id: string
        }
        Insert: {
          color?: string
          created_at?: string
          id?: string
          name: string
          user_id: string
        }
        Update: {
          color?: string
          created_at?: string
          id?: string
          name?: string
          user_id?: string
        }
        Relationships: []
      }
      quote_versions: {
        Row: {
          created_at: string
          data: Json
          id: string
          quote_id: string
          user_id: string
          version_number: number
        }
        Insert: {
          created_at?: string
          data: Json
          id?: string
          quote_id: string
          user_id: string
          version_number?: number
        }
        Update: {
          created_at?: string
          data?: Json
          id?: string
          quote_id?: string
          user_id?: string
          version_number?: number
        }
        Relationships: [
          {
            foreignKeyName: "quote_versions_quote_id_fkey"
            columns: ["quote_id"]
            isOneToOne: false
            referencedRelation: "quotes"
            referencedColumns: ["id"]
          },
        ]
      }
      quote_views: {
        Row: {
          id: string
          ip_address: string | null
          quote_id: string
          viewed_at: string
        }
        Insert: {
          id?: string
          ip_address?: string | null
          quote_id: string
          viewed_at?: string
        }
        Update: {
          id?: string
          ip_address?: string | null
          quote_id?: string
          viewed_at?: string
        }
        Relationships: []
      }
      quotes: {
        Row: {
          activities: Json | null
          approved_at: string | null
          approved_by_name: string | null
          approved_ip: string | null
          archived: boolean
          client: Json
          cover: Json
          created_at: string
          cruise: Json | null
          favorited: boolean
          ferries: Json | null
          flights: Json
          id: string
          insurance: Json
          itinerary_days: Json
          lodging: Json
          lodgings: Json | null
          pricing: Json
          rental_cars: Json | null
          status: string
          template_id: string | null
          trains: Json | null
          transfers: Json
          trip: Json
          updated_at: string
          user_id: string
        }
        Insert: {
          activities?: Json | null
          approved_at?: string | null
          approved_by_name?: string | null
          approved_ip?: string | null
          archived?: boolean
          client?: Json
          cover?: Json
          created_at?: string
          cruise?: Json | null
          favorited?: boolean
          ferries?: Json | null
          flights?: Json
          id?: string
          insurance?: Json
          itinerary_days?: Json
          lodging?: Json
          lodgings?: Json | null
          pricing?: Json
          rental_cars?: Json | null
          status?: string
          template_id?: string | null
          trains?: Json | null
          transfers?: Json
          trip?: Json
          updated_at?: string
          user_id: string
        }
        Update: {
          activities?: Json | null
          approved_at?: string | null
          approved_by_name?: string | null
          approved_ip?: string | null
          archived?: boolean
          client?: Json
          cover?: Json
          created_at?: string
          cruise?: Json | null
          favorited?: boolean
          ferries?: Json | null
          flights?: Json
          id?: string
          insurance?: Json
          itinerary_days?: Json
          lodging?: Json
          lodgings?: Json | null
          pricing?: Json
          rental_cars?: Json | null
          status?: string
          template_id?: string | null
          trains?: Json | null
          transfers?: Json
          trip?: Json
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "quotes_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "templates"
            referencedColumns: ["id"]
          },
        ]
      }
      reminders: {
        Row: {
          completed: boolean
          created_at: string
          id: string
          message: string
          quote_id: string | null
          reminder_date: string
          updated_at: string
          user_id: string
        }
        Insert: {
          completed?: boolean
          created_at?: string
          id?: string
          message?: string
          quote_id?: string | null
          reminder_date: string
          updated_at?: string
          user_id: string
        }
        Update: {
          completed?: boolean
          created_at?: string
          id?: string
          message?: string
          quote_id?: string | null
          reminder_date?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      reservation_attachments: {
        Row: {
          created_at: string
          file_url: string
          filename: string
          id: string
          reservation_id: string
        }
        Insert: {
          created_at?: string
          file_url?: string
          filename?: string
          id?: string
          reservation_id: string
        }
        Update: {
          created_at?: string
          file_url?: string
          filename?: string
          id?: string
          reservation_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "reservation_attachments_reservation_id_fkey"
            columns: ["reservation_id"]
            isOneToOne: false
            referencedRelation: "reservations"
            referencedColumns: ["id"]
          },
        ]
      }
      reservation_changes: {
        Row: {
          after_value: string | null
          before_value: string | null
          change_type: string
          detected_at: string
          field_name: string
          flight_segment_id: string | null
          id: string
          reservation_id: string
          status: string
        }
        Insert: {
          after_value?: string | null
          before_value?: string | null
          change_type?: string
          detected_at?: string
          field_name?: string
          flight_segment_id?: string | null
          id?: string
          reservation_id: string
          status?: string
        }
        Update: {
          after_value?: string | null
          before_value?: string | null
          change_type?: string
          detected_at?: string
          field_name?: string
          flight_segment_id?: string | null
          id?: string
          reservation_id?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "reservation_changes_flight_segment_id_fkey"
            columns: ["flight_segment_id"]
            isOneToOne: false
            referencedRelation: "flight_segments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reservation_changes_reservation_id_fkey"
            columns: ["reservation_id"]
            isOneToOne: false
            referencedRelation: "reservations"
            referencedColumns: ["id"]
          },
        ]
      }
      reservation_passengers: {
        Row: {
          client_id: string | null
          created_at: string
          document: string | null
          first_name: string | null
          id: string
          last_name: string
          reservation_id: string
          title: string | null
        }
        Insert: {
          client_id?: string | null
          created_at?: string
          document?: string | null
          first_name?: string | null
          id?: string
          last_name?: string
          reservation_id: string
          title?: string | null
        }
        Update: {
          client_id?: string | null
          created_at?: string
          document?: string | null
          first_name?: string | null
          id?: string
          last_name?: string
          reservation_id?: string
          title?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "reservation_passengers_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reservation_passengers_reservation_id_fkey"
            columns: ["reservation_id"]
            isOneToOne: false
            referencedRelation: "reservations"
            referencedColumns: ["id"]
          },
        ]
      }
      reservations: {
        Row: {
          created_at: string
          file_id: string | null
          gds: string | null
          id: string
          legacy_id: string | null
          locator: string | null
          notes: string | null
          raw_text_latest: string | null
          source_type: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          file_id?: string | null
          gds?: string | null
          id?: string
          legacy_id?: string | null
          locator?: string | null
          notes?: string | null
          raw_text_latest?: string | null
          source_type?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          file_id?: string | null
          gds?: string | null
          id?: string
          legacy_id?: string | null
          locator?: string | null
          notes?: string | null
          raw_text_latest?: string | null
          source_type?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "reservations_file_id_fkey"
            columns: ["file_id"]
            isOneToOne: false
            referencedRelation: "files"
            referencedColumns: ["id"]
          },
        ]
      }
      suppliers: {
        Row: {
          created_at: string
          email: string | null
          id: string
          name: string
          notes: string | null
          phone: string | null
          type: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          email?: string | null
          id?: string
          name: string
          notes?: string | null
          phone?: string | null
          type?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          email?: string | null
          id?: string
          name?: string
          notes?: string | null
          phone?: string | null
          type?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      suppressed_emails: {
        Row: {
          created_at: string
          email: string
          id: string
          metadata: Json | null
          reason: string
        }
        Insert: {
          created_at?: string
          email: string
          id?: string
          metadata?: Json | null
          reason: string
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          metadata?: Json | null
          reason?: string
        }
        Relationships: []
      }
      templates: {
        Row: {
          agency_name: string | null
          colors: Json
          created_at: string
          fonts: Json
          footer_text: string | null
          id: string
          is_default: boolean | null
          logo_url: string | null
          name: string
          sections_toggles: Json
          styles: Json
          updated_at: string
          user_id: string
          whatsapp_agents: Json
        }
        Insert: {
          agency_name?: string | null
          colors?: Json
          created_at?: string
          fonts?: Json
          footer_text?: string | null
          id?: string
          is_default?: boolean | null
          logo_url?: string | null
          name: string
          sections_toggles?: Json
          styles?: Json
          updated_at?: string
          user_id: string
          whatsapp_agents?: Json
        }
        Update: {
          agency_name?: string | null
          colors?: Json
          created_at?: string
          fonts?: Json
          footer_text?: string | null
          id?: string
          is_default?: boolean | null
          logo_url?: string | null
          name?: string
          sections_toggles?: Json
          styles?: Json
          updated_at?: string
          user_id?: string
          whatsapp_agents?: Json
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      delete_email: {
        Args: { message_id: number; queue_name: string }
        Returns: boolean
      }
      enqueue_email: {
        Args: { payload: Json; queue_name: string }
        Returns: number
      }
      move_to_dlq: {
        Args: {
          dlq_name: string
          message_id: number
          payload: Json
          source_queue: string
        }
        Returns: number
      }
      next_receipt_number: { Args: { p_user_id: string }; Returns: number }
      owns_client_group: {
        Args: { _group_id: string; _user_id: string }
        Returns: boolean
      }
      owns_flight_segment: {
        Args: { _segment_id: string; _user_id: string }
        Returns: boolean
      }
      owns_quote_tag: {
        Args: { _tag_id: string; _user_id: string }
        Returns: boolean
      }
      owns_reservation: {
        Args: { _reservation_id: string; _user_id: string }
        Returns: boolean
      }
      read_email_batch: {
        Args: { batch_size: number; queue_name: string; vt: number }
        Returns: {
          message: Json
          msg_id: number
          read_ct: number
        }[]
      }
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
