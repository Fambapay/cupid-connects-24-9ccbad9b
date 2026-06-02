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
      blocked_users: {
        Row: {
          blocked_id: string
          blocker_id: string
          created_at: string
          id: string
        }
        Insert: {
          blocked_id: string
          blocker_id: string
          created_at?: string
          id?: string
        }
        Update: {
          blocked_id?: string
          blocker_id?: string
          created_at?: string
          id?: string
        }
        Relationships: []
      }
      boosts: {
        Row: {
          created_at: string
          expires_at: string
          id: string
          profile_id: string
        }
        Insert: {
          created_at?: string
          expires_at: string
          id?: string
          profile_id: string
        }
        Update: {
          created_at?: string
          expires_at?: string
          id?: string
          profile_id?: string
        }
        Relationships: []
      }
      credit_purchases: {
        Row: {
          amount_minor: number
          created_at: string
          currency: string
          id: string
          pack_kind: string
          quantity: number
          status: string
          stripe_payment_intent: string | null
          stripe_session_id: string
          user_id: string
        }
        Insert: {
          amount_minor: number
          created_at?: string
          currency?: string
          id?: string
          pack_kind: string
          quantity: number
          status?: string
          stripe_payment_intent?: string | null
          stripe_session_id: string
          user_id: string
        }
        Update: {
          amount_minor?: number
          created_at?: string
          currency?: string
          id?: string
          pack_kind?: string
          quantity?: number
          status?: string
          stripe_payment_intent?: string | null
          stripe_session_id?: string
          user_id?: string
        }
        Relationships: []
      }
      debito_payments: {
        Row: {
          amount: number
          checkout_url: string | null
          completed_at: string | null
          created_at: string
          currency: string
          customer_email: string | null
          debito_payment_id: string | null
          debito_reference: string | null
          debito_transaction_id: string | null
          id: string
          kind: string
          pack_id: string | null
          pack_kind: string | null
          pack_quantity: number | null
          payment_method: string
          phone_hash: string | null
          phone_last4: string | null
          plan_tier: string | null
          raw_response: Json | null
          raw_webhook: Json | null
          source_id: string
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          amount: number
          checkout_url?: string | null
          completed_at?: string | null
          created_at?: string
          currency?: string
          customer_email?: string | null
          debito_payment_id?: string | null
          debito_reference?: string | null
          debito_transaction_id?: string | null
          id?: string
          kind?: string
          pack_id?: string | null
          pack_kind?: string | null
          pack_quantity?: number | null
          payment_method: string
          phone_hash?: string | null
          phone_last4?: string | null
          plan_tier?: string | null
          raw_response?: Json | null
          raw_webhook?: Json | null
          source_id?: string
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          amount?: number
          checkout_url?: string | null
          completed_at?: string | null
          created_at?: string
          currency?: string
          customer_email?: string | null
          debito_payment_id?: string | null
          debito_reference?: string | null
          debito_transaction_id?: string | null
          id?: string
          kind?: string
          pack_id?: string | null
          pack_kind?: string | null
          pack_quantity?: number | null
          payment_method?: string
          phone_hash?: string | null
          phone_last4?: string | null
          plan_tier?: string | null
          raw_response?: Json | null
          raw_webhook?: Json | null
          source_id?: string
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      matches: {
        Row: {
          created_at: string
          id: string
          last_message_at: string
          user_a: string
          user_b: string
        }
        Insert: {
          created_at?: string
          id?: string
          last_message_at?: string
          user_a: string
          user_b: string
        }
        Update: {
          created_at?: string
          id?: string
          last_message_at?: string
          user_a?: string
          user_b?: string
        }
        Relationships: []
      }
      messages: {
        Row: {
          content: string
          created_at: string
          id: string
          match_id: string
          sender_id: string
        }
        Insert: {
          content: string
          created_at?: string
          id?: string
          match_id: string
          sender_id: string
        }
        Update: {
          content?: string
          created_at?: string
          id?: string
          match_id?: string
          sender_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "messages_match_id_fkey"
            columns: ["match_id"]
            isOneToOne: false
            referencedRelation: "matches"
            referencedColumns: ["id"]
          },
        ]
      }
      profile_photos: {
        Row: {
          created_at: string
          id: string
          position: number
          profile_id: string
          storage_path: string
        }
        Insert: {
          created_at?: string
          id?: string
          position?: number
          profile_id: string
          storage_path: string
        }
        Update: {
          created_at?: string
          id?: string
          position?: number
          profile_id?: string
          storage_path?: string
        }
        Relationships: [
          {
            foreignKeyName: "profile_photos_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      profile_prompts: {
        Row: {
          answer: string
          created_at: string
          id: string
          position: number
          profile_id: string
          question: string
        }
        Insert: {
          answer: string
          created_at?: string
          id?: string
          position?: number
          profile_id: string
          question: string
        }
        Update: {
          answer?: string
          created_at?: string
          id?: string
          position?: number
          profile_id?: string
          question?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          age: number | null
          bio: string | null
          birthdate: string | null
          city: string | null
          country: string | null
          created_at: string
          gender: string | null
          id: string
          interested_in: string[]
          interests: string[]
          is_incognito: boolean
          is_paused: boolean
          is_verified: boolean
          latitude: number | null
          longitude: number | null
          membership_expires_at: string | null
          membership_status: string
          membership_tier: string
          name: string | null
          onboarding_completed: boolean
          onboarding_step: number
          phone: string | null
          updated_at: string
        }
        Insert: {
          age?: number | null
          bio?: string | null
          birthdate?: string | null
          city?: string | null
          country?: string | null
          created_at?: string
          gender?: string | null
          id: string
          interested_in?: string[]
          interests?: string[]
          is_incognito?: boolean
          is_paused?: boolean
          is_verified?: boolean
          latitude?: number | null
          longitude?: number | null
          membership_expires_at?: string | null
          membership_status?: string
          membership_tier?: string
          name?: string | null
          onboarding_completed?: boolean
          onboarding_step?: number
          phone?: string | null
          updated_at?: string
        }
        Update: {
          age?: number | null
          bio?: string | null
          birthdate?: string | null
          city?: string | null
          country?: string | null
          created_at?: string
          gender?: string | null
          id?: string
          interested_in?: string[]
          interests?: string[]
          is_incognito?: boolean
          is_paused?: boolean
          is_verified?: boolean
          latitude?: number | null
          longitude?: number | null
          membership_expires_at?: string | null
          membership_status?: string
          membership_tier?: string
          name?: string | null
          onboarding_completed?: boolean
          onboarding_step?: number
          phone?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      swipes: {
        Row: {
          created_at: string
          direction: Database["public"]["Enums"]["swipe_direction"]
          id: string
          swiped_id: string
          swiper_id: string
        }
        Insert: {
          created_at?: string
          direction: Database["public"]["Enums"]["swipe_direction"]
          id?: string
          swiped_id: string
          swiper_id: string
        }
        Update: {
          created_at?: string
          direction?: Database["public"]["Enums"]["swipe_direction"]
          id?: string
          swiped_id?: string
          swiper_id?: string
        }
        Relationships: []
      }
      user_credits: {
        Row: {
          boost_balance: number
          created_at: string
          super_like_balance: number
          updated_at: string
          user_id: string
        }
        Insert: {
          boost_balance?: number
          created_at?: string
          super_like_balance?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          boost_balance?: number
          created_at?: string
          super_like_balance?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      user_settings: {
        Row: {
          age_max: number
          age_min: number
          created_at: string
          distance_radius: number
          min_photos: number
          notifications_enabled: boolean
          require_bio: boolean
          updated_at: string
          user_id: string
        }
        Insert: {
          age_max?: number
          age_min?: number
          created_at?: string
          distance_radius?: number
          min_photos?: number
          notifications_enabled?: boolean
          require_bio?: boolean
          updated_at?: string
          user_id: string
        }
        Update: {
          age_max?: number
          age_min?: number
          created_at?: string
          distance_radius?: number
          min_photos?: number
          notifications_enabled?: boolean
          require_bio?: boolean
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      verification_requests: {
        Row: {
          ai_raw: Json | null
          ai_reason: string | null
          ai_score: number | null
          created_at: string
          id: string
          pose_code: string
          reviewed_at: string | null
          selfie_path: string
          status: string
          user_id: string
        }
        Insert: {
          ai_raw?: Json | null
          ai_reason?: string | null
          ai_score?: number | null
          created_at?: string
          id?: string
          pose_code: string
          reviewed_at?: string | null
          selfie_path: string
          status?: string
          user_id: string
        }
        Update: {
          ai_raw?: Json | null
          ai_reason?: string | null
          ai_score?: number | null
          created_at?: string
          id?: string
          pose_code?: string
          reviewed_at?: string | null
          selfie_path?: string
          status?: string
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      activate_membership_debito: {
        Args: { _days: number; _plan_tier: string; _user_id: string }
        Returns: Json
      }
      consume_boost_credit: { Args: never; Returns: Json }
      consume_super_like_credit: { Args: never; Returns: Json }
      credit_pack_debito: {
        Args: {
          _amount_minor: number
          _currency: string
          _debito_payment_id: string
          _pack_kind: string
          _quantity: number
          _source_id: string
          _user_id: string
        }
        Returns: Json
      }
      grant_credits: {
        Args: { _pack_kind: string; _quantity: number; _user_id: string }
        Returns: Json
      }
      is_match_member: {
        Args: { _match_id: string; _user_id: string }
        Returns: boolean
      }
      rewind_last_swipe: { Args: never; Returns: Json }
    }
    Enums: {
      swipe_direction: "like" | "pass" | "super"
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
      swipe_direction: ["like", "pass", "super"],
    },
  },
} as const
