export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
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
      app_admins: {
        Row: {
          created_at: string
          created_by: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          user_id?: string
        }
        Relationships: []
      }
      dining_tables: {
        Row: {
          created_at: string
          id: number
          is_active: boolean
          name: string
          public_token: string
          restaurant_id: number
        }
        Insert: {
          created_at?: string
          id?: never
          is_active?: boolean
          name: string
          public_token?: string
          restaurant_id: number
        }
        Update: {
          created_at?: string
          id?: never
          is_active?: boolean
          name?: string
          public_token?: string
          restaurant_id?: number
        }
        Relationships: [
          {
            foreignKeyName: "dining_tables_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "restaurants"
            referencedColumns: ["id"]
          },
        ]
      }
      menu_categories: {
        Row: {
          created_at: string
          description: string | null
          id: number
          is_active: boolean
          menu_id: number
          name: string
          restaurant_id: number
          sort_order: number
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: never
          is_active?: boolean
          menu_id: number
          name: string
          restaurant_id: number
          sort_order?: number
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: never
          is_active?: boolean
          menu_id?: number
          name?: string
          restaurant_id?: number
          sort_order?: number
        }
        Relationships: [
          {
            foreignKeyName: "menu_categories_menu_id_restaurant_id_fkey"
            columns: ["menu_id", "restaurant_id"]
            isOneToOne: false
            referencedRelation: "menus"
            referencedColumns: ["id", "restaurant_id"]
          },
        ]
      }
      menu_items: {
        Row: {
          allergens: string[]
          category_id: number
          created_at: string
          description: string | null
          emoji: string | null
          id: number
          image_url: string | null
          is_available: boolean
          name: string
          price_cents: number
          restaurant_id: number
          sort_order: number
          updated_at: string
        }
        Insert: {
          allergens?: string[]
          category_id: number
          created_at?: string
          description?: string | null
          emoji?: string | null
          id?: never
          image_url?: string | null
          is_available?: boolean
          name: string
          price_cents: number
          restaurant_id: number
          sort_order?: number
          updated_at?: string
        }
        Update: {
          allergens?: string[]
          category_id?: number
          created_at?: string
          description?: string | null
          emoji?: string | null
          id?: never
          image_url?: string | null
          is_available?: boolean
          name?: string
          price_cents?: number
          restaurant_id?: number
          sort_order?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "menu_items_category_id_restaurant_id_fkey"
            columns: ["category_id", "restaurant_id"]
            isOneToOne: false
            referencedRelation: "menu_categories"
            referencedColumns: ["id", "restaurant_id"]
          },
        ]
      }
      menus: {
        Row: {
          created_at: string
          id: number
          is_active: boolean
          name: string
          published_at: string | null
          restaurant_id: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: never
          is_active?: boolean
          name: string
          published_at?: string | null
          restaurant_id: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: never
          is_active?: boolean
          name?: string
          published_at?: string | null
          restaurant_id?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "menus_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "restaurants"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          created_at: string
          email: string | null
          email_confirmed_at: string | null
          full_name: string | null
          id: string
          last_sign_in_at: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          email?: string | null
          email_confirmed_at?: string | null
          full_name?: string | null
          id: string
          last_sign_in_at?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          email?: string | null
          email_confirmed_at?: string | null
          full_name?: string | null
          id?: string
          last_sign_in_at?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      restaurant_members: {
        Row: {
          created_at: string
          restaurant_id: number
          role: string
          user_id: string
        }
        Insert: {
          created_at?: string
          restaurant_id: number
          role?: string
          user_id: string
        }
        Update: {
          created_at?: string
          restaurant_id?: number
          role?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "restaurant_members_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "restaurants"
            referencedColumns: ["id"]
          },
        ]
      }
      restaurants: {
        Row: {
          accent_color: string
          cover_image_url: string | null
          created_at: string
          currency_code: string
          description: string | null
          id: number
          is_published: boolean
          locale: string
          logo_url: string | null
          name: string
          slug: string
          timezone: string
          updated_at: string
        }
        Insert: {
          accent_color?: string
          cover_image_url?: string | null
          created_at?: string
          currency_code?: string
          description?: string | null
          id?: never
          is_published?: boolean
          locale?: string
          logo_url?: string | null
          name: string
          slug: string
          timezone?: string
          updated_at?: string
        }
        Update: {
          accent_color?: string
          cover_image_url?: string | null
          created_at?: string
          currency_code?: string
          description?: string | null
          id?: never
          is_published?: boolean
          locale?: string
          logo_url?: string | null
          name?: string
          slug?: string
          timezone?: string
          updated_at?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      admin_delete_user: {
        Args: { delete_owned_restaurants?: boolean; target_user_id: string }
        Returns: undefined
      }
      create_restaurant: {
        Args: {
          restaurant_description?: string
          restaurant_name: string
          restaurant_slug: string
        }
        Returns: {
          accent_color: string
          cover_image_url: string | null
          created_at: string
          currency_code: string
          description: string | null
          id: number
          is_published: boolean
          locale: string
          logo_url: string | null
          name: string
          slug: string
          timezone: string
          updated_at: string
        }
        SetofOptions: {
          from: "*"
          to: "restaurants"
          isOneToOne: true
          isSetofReturn: false
        }
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

