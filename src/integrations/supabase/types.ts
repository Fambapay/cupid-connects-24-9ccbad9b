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
      admin_emails: {
        Row: {
          created_at: string
          email: string
        }
        Insert: {
          created_at?: string
          email: string
        }
        Update: {
          created_at?: string
          email?: string
        }
        Relationships: []
      }
      app_config: {
        Row: {
          key: string
          updated_at: string
          value: Json
        }
        Insert: {
          key: string
          updated_at?: string
          value: Json
        }
        Update: {
          key?: string
          updated_at?: string
          value?: Json
        }
        Relationships: []
      }
      audit_logs: {
        Row: {
          action: string
          actor_email: string | null
          actor_id: string
          created_at: string
          id: string
          meta: Json
          target_id: string | null
          target_kind: string | null
        }
        Insert: {
          action: string
          actor_email?: string | null
          actor_id: string
          created_at?: string
          id?: string
          meta?: Json
          target_id?: string | null
          target_kind?: string | null
        }
        Update: {
          action?: string
          actor_email?: string | null
          actor_id?: string
          created_at?: string
          id?: string
          meta?: Json
          target_id?: string | null
          target_kind?: string | null
        }
        Relationships: []
      }
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
      match_reads: {
        Row: {
          last_read_at: string
          match_id: string
          user_id: string
        }
        Insert: {
          last_read_at?: string
          match_id: string
          user_id: string
        }
        Update: {
          last_read_at?: string
          match_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "match_reads_match_id_fkey"
            columns: ["match_id"]
            isOneToOne: false
            referencedRelation: "matches"
            referencedColumns: ["id"]
          },
        ]
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
      notification_preferences: {
        Row: {
          email_enabled: boolean
          notify_like: boolean
          notify_match: boolean
          notify_message: boolean
          notify_promo: boolean
          push_enabled: boolean
          updated_at: string
          user_id: string
        }
        Insert: {
          email_enabled?: boolean
          notify_like?: boolean
          notify_match?: boolean
          notify_message?: boolean
          notify_promo?: boolean
          push_enabled?: boolean
          updated_at?: string
          user_id: string
        }
        Update: {
          email_enabled?: boolean
          notify_like?: boolean
          notify_match?: boolean
          notify_message?: boolean
          notify_promo?: boolean
          push_enabled?: boolean
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      profile_contact: {
        Row: {
          phone: string | null
          profile_id: string
          updated_at: string
        }
        Insert: {
          phone?: string | null
          profile_id: string
          updated_at?: string
        }
        Update: {
          phone?: string | null
          profile_id?: string
          updated_at?: string
        }
        Relationships: []
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
          is_seed: boolean
          is_verified: boolean
          last_active_at: string | null
          latitude: number | null
          longitude: number | null
          membership_expires_at: string | null
          membership_status: string
          membership_tier: string
          name: string | null
          onboarding_completed: boolean
          onboarding_step: number
          seed_active: boolean
          updated_at: string
          welcome_bonus_granted_at: string | null
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
          is_seed?: boolean
          is_verified?: boolean
          last_active_at?: string | null
          latitude?: number | null
          longitude?: number | null
          membership_expires_at?: string | null
          membership_status?: string
          membership_tier?: string
          name?: string | null
          onboarding_completed?: boolean
          onboarding_step?: number
          seed_active?: boolean
          updated_at?: string
          welcome_bonus_granted_at?: string | null
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
          is_seed?: boolean
          is_verified?: boolean
          last_active_at?: string | null
          latitude?: number | null
          longitude?: number | null
          membership_expires_at?: string | null
          membership_status?: string
          membership_tier?: string
          name?: string | null
          onboarding_completed?: boolean
          onboarding_step?: number
          seed_active?: boolean
          updated_at?: string
          welcome_bonus_granted_at?: string | null
        }
        Relationships: []
      }
      push_subscriptions: {
        Row: {
          auth: string
          created_at: string
          endpoint: string
          id: string
          last_used_at: string
          p256dh: string
          user_agent: string | null
          user_id: string
        }
        Insert: {
          auth: string
          created_at?: string
          endpoint: string
          id?: string
          last_used_at?: string
          p256dh: string
          user_agent?: string | null
          user_id: string
        }
        Update: {
          auth?: string
          created_at?: string
          endpoint?: string
          id?: string
          last_used_at?: string
          p256dh?: string
          user_agent?: string | null
          user_id?: string
        }
        Relationships: []
      }
      reports: {
        Row: {
          created_at: string
          details: string | null
          id: string
          match_id: string | null
          reason: string
          reported_id: string
          reporter_id: string
          reviewed_at: string | null
          reviewed_by: string | null
          status: string
        }
        Insert: {
          created_at?: string
          details?: string | null
          id?: string
          match_id?: string | null
          reason: string
          reported_id: string
          reporter_id: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
        }
        Update: {
          created_at?: string
          details?: string | null
          id?: string
          match_id?: string | null
          reason?: string
          reported_id?: string
          reporter_id?: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
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
          last_boost_refill_date: string | null
          last_super_refill_date: string | null
          super_like_balance: number
          updated_at: string
          user_id: string
        }
        Insert: {
          boost_balance?: number
          created_at?: string
          last_boost_refill_date?: string | null
          last_super_refill_date?: string | null
          super_like_balance?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          boost_balance?: number
          created_at?: string
          last_boost_refill_date?: string | null
          last_super_refill_date?: string | null
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
      delete_email: {
        Args: { message_id: number; queue_name: string }
        Returns: boolean
      }
      dispatch_notification: {
        Args: { _kind: string; _payload: Json }
        Returns: undefined
      }
      enqueue_email: {
        Args: { payload: Json; queue_name: string }
        Returns: number
      }
      get_my_phone: { Args: never; Returns: string }
      grant_credits: {
        Args: { _pack_kind: string; _quantity: number; _user_id: string }
        Returns: Json
      }
      is_admin: { Args: { _uid: string }; Returns: boolean }
      is_match_member: {
        Args: { _match_id: string; _user_id: string }
        Returns: boolean
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
      read_email_batch: {
        Args: { batch_size: number; queue_name: string; vt: number }
        Returns: {
          message: Json
          msg_id: number
          read_ct: number
        }[]
      }
      refill_all_active_memberships: { Args: never; Returns: number }
      refill_membership_credits: { Args: { _user_id: string }; Returns: Json }
      refill_my_credits: { Args: never; Returns: Json }
      rewind_last_swipe: { Args: never; Returns: Json }
      touch_last_active: { Args: never; Returns: undefined }
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
