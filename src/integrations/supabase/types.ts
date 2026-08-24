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
  graphql_public: {
    Tables: {
      [_ in never]: never
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      graphql: {
        Args: {
          extensions?: Json
          operationName?: string
          query?: string
          variables?: Json
        }
        Returns: Json
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
  public: {
    Tables: {
      admin_activity_logs: {
        Row: {
          action: string
          actor_user_id: string
          after_data: Json | null
          before_data: Json | null
          created_at: string
          entity_id: string | null
          entity_type: string
          id: string
          metadata: Json
        }
        Insert: {
          action: string
          actor_user_id: string
          after_data?: Json | null
          before_data?: Json | null
          created_at?: string
          entity_id?: string | null
          entity_type: string
          id?: string
          metadata?: Json
        }
        Update: {
          action?: string
          actor_user_id?: string
          after_data?: Json | null
          before_data?: Json | null
          created_at?: string
          entity_id?: string | null
          entity_type?: string
          id?: string
          metadata?: Json
        }
        Relationships: []
      }
      customer_addresses: {
        Row: {
          city: string
          country_code: string
          created_at: string
          customer_id: string
          id: string
          is_default_billing: boolean
          is_default_shipping: boolean
          label: string
          line1: string
          line2: string | null
          phone: string | null
          postal_code: string
          recipient_name: string | null
          state_region: string | null
          updated_at: string
        }
        Insert: {
          city: string
          country_code?: string
          created_at?: string
          customer_id: string
          id?: string
          is_default_billing?: boolean
          is_default_shipping?: boolean
          label?: string
          line1: string
          line2?: string | null
          phone?: string | null
          postal_code: string
          recipient_name?: string | null
          state_region?: string | null
          updated_at?: string
        }
        Update: {
          city?: string
          country_code?: string
          created_at?: string
          customer_id?: string
          id?: string
          is_default_billing?: boolean
          is_default_shipping?: boolean
          label?: string
          line1?: string
          line2?: string | null
          phone?: string | null
          postal_code?: string
          recipient_name?: string | null
          state_region?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "customer_addresses_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customer_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      customer_profiles: {
        Row: {
          created_at: string
          email: string
          first_name: string | null
          id: string
          last_name: string | null
          last_sign_in_at: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          email: string
          first_name?: string | null
          id: string
          last_name?: string | null
          last_sign_in_at?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          email?: string
          first_name?: string | null
          id?: string
          last_name?: string | null
          last_sign_in_at?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      customer_routines: {
        Row: {
          created_at: string
          customer_id: string
          id: string
          is_active: boolean
          name: string
          notes: string | null
          schedule: Json
          updated_at: string
        }
        Insert: {
          created_at?: string
          customer_id: string
          id?: string
          is_active?: boolean
          name: string
          notes?: string | null
          schedule?: Json
          updated_at?: string
        }
        Update: {
          created_at?: string
          customer_id?: string
          id?: string
          is_active?: boolean
          name?: string
          notes?: string | null
          schedule?: Json
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "customer_routines_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customer_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      ingredients: {
        Row: {
          benefits: Json | null
          confidence_score: number | null
          created_at: string
          dosage: string | null
          evidence_strength: string | null
          id: string
          ingredient_name: string
          product_handle: string
          sources: Json | null
          summary: string | null
          updated_at: string
        }
        Insert: {
          benefits?: Json | null
          confidence_score?: number | null
          created_at?: string
          dosage?: string | null
          evidence_strength?: string | null
          id?: string
          ingredient_name: string
          product_handle: string
          sources?: Json | null
          summary?: string | null
          updated_at?: string
        }
        Update: {
          benefits?: Json | null
          confidence_score?: number | null
          created_at?: string
          dosage?: string | null
          evidence_strength?: string | null
          id?: string
          ingredient_name?: string
          product_handle?: string
          sources?: Json | null
          summary?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      inventory_products: {
        Row: {
          available_for_sale: boolean
          cap_color: string | null
          created_at: string
          currency_code: string
          description: string
          enable_3d_viewer: boolean
          fill_color: string | null
          full_description: string | null
          handle: string
          id: string
          images: Json
          model_3d_url: string | null
          price: number
          sort_order: number
          title: string
          upc: string | null
          updated_at: string
          variant_id: string | null
        }
        Insert: {
          available_for_sale?: boolean
          cap_color?: string | null
          created_at?: string
          currency_code?: string
          description?: string
          enable_3d_viewer?: boolean
          fill_color?: string | null
          full_description?: string | null
          handle: string
          id?: string
          images?: Json
          model_3d_url?: string | null
          price: number
          sort_order?: number
          title: string
          upc?: string | null
          updated_at?: string
          variant_id?: string | null
        }
        Update: {
          available_for_sale?: boolean
          cap_color?: string | null
          created_at?: string
          currency_code?: string
          description?: string
          enable_3d_viewer?: boolean
          fill_color?: string | null
          full_description?: string | null
          handle?: string
          id?: string
          images?: Json
          model_3d_url?: string | null
          price?: number
          sort_order?: number
          title?: string
          upc?: string | null
          updated_at?: string
          variant_id?: string | null
        }
        Relationships: []
      }
      order_items: {
        Row: {
          created_at: string
          currency_code: string
          id: string
          image_url: string | null
          line_total: number | null
          order_id: string
          product_handle: string
          product_title: string
          quantity: number
          unit_price: number
          variant_id: string | null
        }
        Insert: {
          created_at?: string
          currency_code?: string
          id?: string
          image_url?: string | null
          line_total?: number | null
          order_id: string
          product_handle: string
          product_title: string
          quantity: number
          unit_price: number
          variant_id?: string | null
        }
        Update: {
          created_at?: string
          currency_code?: string
          id?: string
          image_url?: string | null
          line_total?: number | null
          order_id?: string
          product_handle?: string
          product_title?: string
          quantity?: number
          unit_price?: number
          variant_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "order_items_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      order_status_events: {
        Row: {
          changed_by: string | null
          created_at: string
          id: string
          next_status: string
          note: string | null
          order_id: string
          previous_status: string | null
        }
        Insert: {
          changed_by?: string | null
          created_at?: string
          id?: string
          next_status: string
          note?: string | null
          order_id: string
          previous_status?: string | null
        }
        Update: {
          changed_by?: string | null
          created_at?: string
          id?: string
          next_status?: string
          note?: string | null
          order_id?: string
          previous_status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "order_status_events_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      orders: {
        Row: {
          client_order_token: string | null
          created_at: string
          currency_code: string
          customer_email: string | null
          external_id: string | null
          fulfilled_at: string | null
          id: string
          item_count: number
          shipping_address: string | null
          status: string
          stripe_payment_intent_id: string | null
          total_amount: number
          tracking_carrier: string | null
          tracking_number: string | null
          tracking_sent_at: string | null
          tracking_url: string | null
          updated_at: string
        }
        Insert: {
          client_order_token?: string | null
          created_at?: string
          currency_code?: string
          customer_email?: string | null
          external_id?: string | null
          fulfilled_at?: string | null
          id?: string
          item_count?: number
          shipping_address?: string | null
          status?: string
          stripe_payment_intent_id?: string | null
          total_amount: number
          tracking_carrier?: string | null
          tracking_number?: string | null
          tracking_sent_at?: string | null
          tracking_url?: string | null
          updated_at?: string
        }
        Update: {
          client_order_token?: string | null
          created_at?: string
          currency_code?: string
          customer_email?: string | null
          external_id?: string | null
          fulfilled_at?: string | null
          id?: string
          item_count?: number
          shipping_address?: string | null
          status?: string
          stripe_payment_intent_id?: string | null
          total_amount?: number
          tracking_carrier?: string | null
          tracking_number?: string | null
          tracking_sent_at?: string | null
          tracking_url?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      user_sessions: {
        Row: {
          auth_session_id: string
          created_at: string
          email: string | null
          id: string
          last_seen_at: string
          revoke_reason: string | null
          revoked_at: string | null
          revoked_by: string | null
          user_agent: string | null
          user_id: string
        }
        Insert: {
          auth_session_id: string
          created_at?: string
          email?: string | null
          id?: string
          last_seen_at?: string
          revoke_reason?: string | null
          revoked_at?: string | null
          revoked_by?: string | null
          user_agent?: string | null
          user_id: string
        }
        Update: {
          auth_session_id?: string
          created_at?: string
          email?: string | null
          id?: string
          last_seen_at?: string
          revoke_reason?: string | null
          revoked_at?: string | null
          revoked_by?: string | null
          user_agent?: string | null
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      is_admin_user: { Args: { target_user_id?: string }; Returns: boolean }
      revoke_all_user_sessions: {
        Args: { p_reason?: string; p_target_user_id: string }
        Returns: number
      }
      revoke_user_session: {
        Args: { p_reason?: string; p_session_record_id: string }
        Returns: string
      }
      upsert_current_session: {
        Args: { p_email?: string; p_user_agent?: string }
        Returns: string
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
  graphql_public: {
    Enums: {},
  },
  public: {
    Enums: {},
  },
} as const
