export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  public: {
    Tables: {
      content_items: {
        Row: {
          author: string | null
          content: string | null
          created_at: string | null
          external_id: string | null
          fetched_at: string | null
          id: string
          metadata: Json | null
          source_created_at: string | null
          source_type: string
          title: string | null
          updated_at: string | null
          url: string | null
          user_id: string
        }
        Insert: {
          author?: string | null
          content?: string | null
          created_at?: string | null
          external_id?: string | null
          fetched_at?: string | null
          id?: string
          metadata?: Json | null
          source_created_at?: string | null
          source_type: string
          title?: string | null
          updated_at?: string | null
          url?: string | null
          user_id: string
        }
        Update: {
          author?: string | null
          content?: string | null
          created_at?: string | null
          external_id?: string | null
          fetched_at?: string | null
          id?: string
          metadata?: Json | null
          source_created_at?: string | null
          source_type?: string
          title?: string | null
          updated_at?: string | null
          url?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "content_items_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      function_logs: {
        Row: {
          error_message: string | null
          executed_at: string | null
          execution_time: unknown | null
          function_name: string | null
          id: number
          result: string | null
        }
        Insert: {
          error_message?: string | null
          executed_at?: string | null
          execution_time?: unknown | null
          function_name?: string | null
          id?: never
          result?: string | null
        }
        Update: {
          error_message?: string | null
          executed_at?: string | null
          execution_time?: unknown | null
          function_name?: string | null
          id?: never
          result?: string | null
        }
        Relationships: []
      }
      ingest_content_feb: {
        Row: {
          content_body: string | null
          content_title: string | null
          created_at: string | null
          error_message: string | null
          extracted_post_url: string | null
          id: string
          metadata: Json | null
          original_author: string | null
          original_url: string | null
          platform_post_id: string | null
          platform_specific_data: Json | null
          post_url: string | null
          processed: boolean | null
          social_media_author: string | null
          social_media_content: string | null
          social_media_published_at: string | null
          social_media_type: string | null
          source_created_at: string | null
          source_platform: string | null
          source_type: string
          updated_at: string | null
          url_author: string | null
          url_content: string | null
          url_published_at: string | null
          url_title: string | null
          user_id: string
        }
        Insert: {
          content_body?: string | null
          content_title?: string | null
          created_at?: string | null
          error_message?: string | null
          extracted_post_url?: string | null
          id?: string
          metadata?: Json | null
          original_author?: string | null
          original_url?: string | null
          platform_post_id?: string | null
          platform_specific_data?: Json | null
          post_url?: string | null
          processed?: boolean | null
          social_media_author?: string | null
          social_media_content?: string | null
          social_media_published_at?: string | null
          social_media_type?: string | null
          source_created_at?: string | null
          source_platform?: string | null
          source_type: string
          updated_at?: string | null
          url_author?: string | null
          url_content?: string | null
          url_published_at?: string | null
          url_title?: string | null
          user_id: string
        }
        Update: {
          content_body?: string | null
          content_title?: string | null
          created_at?: string | null
          error_message?: string | null
          extracted_post_url?: string | null
          id?: string
          metadata?: Json | null
          original_author?: string | null
          original_url?: string | null
          platform_post_id?: string | null
          platform_specific_data?: Json | null
          post_url?: string | null
          processed?: boolean | null
          social_media_author?: string | null
          social_media_content?: string | null
          social_media_published_at?: string | null
          social_media_type?: string | null
          source_created_at?: string | null
          source_platform?: string | null
          source_type?: string
          updated_at?: string | null
          url_author?: string | null
          url_content?: string | null
          url_published_at?: string | null
          url_title?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ingest_content_feb_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      perplexity_completions: {
        Row: {
          completion: string | null
          created_at: string | null
          duration_ms: number | null
          error_message: string | null
          id: string
          metadata: Json | null
          model: string
          post_id: string
          prompt: string
          request_id: string | null
          request_timestamp: string | null
          status: string
          success: boolean
          tokens_used: number | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          completion?: string | null
          created_at?: string | null
          duration_ms?: number | null
          error_message?: string | null
          id?: string
          metadata?: Json | null
          model: string
          post_id: string
          prompt: string
          request_id?: string | null
          request_timestamp?: string | null
          status?: string
          success?: boolean
          tokens_used?: number | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          completion?: string | null
          created_at?: string | null
          duration_ms?: number | null
          error_message?: string | null
          id?: string
          metadata?: Json | null
          model?: string
          post_id?: string
          prompt?: string
          request_id?: string | null
          request_timestamp?: string | null
          status?: string
          success?: boolean
          tokens_used?: number | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "perplexity_completions_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "content_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "perplexity_completions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      post_summaries: {
        Row: {
          created_at: string | null
          id: string
          post_id: string
          summary: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          post_id: string
          summary: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          post_id?: string
          summary?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "post_summaries_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "content_items"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          created_at: string | null
          email: string
          id: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          email: string
          id: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          email?: string
          id?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      reddit_connections: {
        Row: {
          access_token: string
          created_at: string | null
          id: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          access_token: string
          created_at?: string | null
          id?: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          access_token?: string
          created_at?: string | null
          id?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "reddit_connections_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      reddit_saved_posts: {
        Row: {
          created_at: string | null
          id: string
          reddit_id: string
          subreddit: string
          synced_at: string | null
          title: string
          url: string
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          reddit_id: string
          subreddit: string
          synced_at?: string | null
          title: string
          url: string
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          reddit_id?: string
          subreddit?: string
          synced_at?: string | null
          title?: string
          url?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "reddit_saved_posts_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      social_content_ingests: {
        Row: {
          content_body: string | null
          content_title: string | null
          created_at: string | null
          error_message: string | null
          extracted_url: string | null
          id: string
          metadata: Json | null
          original_author: string | null
          original_url: string | null
          platform_post_id: string | null
          platform_specific_data: Json | null
          processed: boolean | null
          source_created_at: string | null
          source_platform: string | null
          source_type: string
          updated_at: string | null
          url_author: string | null
          url_content: string | null
          url_published_at: string | null
          url_title: string | null
          user_id: string
        }
        Insert: {
          content_body?: string | null
          content_title?: string | null
          created_at?: string | null
          error_message?: string | null
          extracted_url?: string | null
          id?: string
          metadata?: Json | null
          original_author?: string | null
          original_url?: string | null
          platform_post_id?: string | null
          platform_specific_data?: Json | null
          processed?: boolean | null
          source_created_at?: string | null
          source_platform?: string | null
          source_type: string
          updated_at?: string | null
          url_author?: string | null
          url_content?: string | null
          url_published_at?: string | null
          url_title?: string | null
          user_id: string
        }
        Update: {
          content_body?: string | null
          content_title?: string | null
          created_at?: string | null
          error_message?: string | null
          extracted_url?: string | null
          id?: string
          metadata?: Json | null
          original_author?: string | null
          original_url?: string | null
          platform_post_id?: string | null
          platform_specific_data?: Json | null
          processed?: boolean | null
          source_created_at?: string | null
          source_platform?: string | null
          source_type?: string
          updated_at?: string | null
          url_author?: string | null
          url_content?: string | null
          url_published_at?: string | null
          url_title?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "social_content_ingests_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      summaries: {
        Row: {
          category: string | null
          created_at: string | null
          error_message: string | null
          id: string
          post_id: string
          status: string
          summary_content: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          category?: string | null
          created_at?: string | null
          error_message?: string | null
          id?: string
          post_id: string
          status?: string
          summary_content?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          category?: string | null
          created_at?: string | null
          error_message?: string | null
          id?: string
          post_id?: string
          status?: string
          summary_content?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "summaries_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "content_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "summaries_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      user_ingest_emails: {
        Row: {
          cloudmailin_password: string | null
          cloudmailin_target: string | null
          cloudmailin_username: string | null
          created_at: string | null
          email_address: string
          id: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          cloudmailin_password?: string | null
          cloudmailin_target?: string | null
          cloudmailin_username?: string | null
          created_at?: string | null
          email_address: string
          id?: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          cloudmailin_password?: string | null
          cloudmailin_target?: string | null
          cloudmailin_username?: string | null
          created_at?: string | null
          email_address?: string
          id?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_ingest_emails_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      extract_url_from_email: {
        Args: {
          email_body: string
        }
        Returns: string
      }
      log_function_execution: {
        Args: {
          p_function_name: string
          p_result?: string
          p_error_message?: string
        }
        Returns: undefined
      }
      test_url_extraction: {
        Args: {
          content: string
        }
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

type PublicSchema = Database[Extract<keyof Database, "public">]

export type Tables<
  PublicTableNameOrOptions extends
    | keyof (PublicSchema["Tables"] & PublicSchema["Views"])
    | { schema: keyof Database },
  TableName extends PublicTableNameOrOptions extends { schema: keyof Database }
    ? keyof (Database[PublicTableNameOrOptions["schema"]]["Tables"] &
        Database[PublicTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = PublicTableNameOrOptions extends { schema: keyof Database }
  ? (Database[PublicTableNameOrOptions["schema"]]["Tables"] &
      Database[PublicTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : PublicTableNameOrOptions extends keyof (PublicSchema["Tables"] &
        PublicSchema["Views"])
    ? (PublicSchema["Tables"] &
        PublicSchema["Views"])[PublicTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  PublicTableNameOrOptions extends
    | keyof PublicSchema["Tables"]
    | { schema: keyof Database },
  TableName extends PublicTableNameOrOptions extends { schema: keyof Database }
    ? keyof Database[PublicTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = PublicTableNameOrOptions extends { schema: keyof Database }
  ? Database[PublicTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : PublicTableNameOrOptions extends keyof PublicSchema["Tables"]
    ? PublicSchema["Tables"][PublicTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  PublicTableNameOrOptions extends
    | keyof PublicSchema["Tables"]
    | { schema: keyof Database },
  TableName extends PublicTableNameOrOptions extends { schema: keyof Database }
    ? keyof Database[PublicTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = PublicTableNameOrOptions extends { schema: keyof Database }
  ? Database[PublicTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : PublicTableNameOrOptions extends keyof PublicSchema["Tables"]
    ? PublicSchema["Tables"][PublicTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  PublicEnumNameOrOptions extends
    | keyof PublicSchema["Enums"]
    | { schema: keyof Database },
  EnumName extends PublicEnumNameOrOptions extends { schema: keyof Database }
    ? keyof Database[PublicEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = PublicEnumNameOrOptions extends { schema: keyof Database }
  ? Database[PublicEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : PublicEnumNameOrOptions extends keyof PublicSchema["Enums"]
    ? PublicSchema["Enums"][PublicEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof PublicSchema["CompositeTypes"]
    | { schema: keyof Database },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends { schema: keyof Database }
  ? Database[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof PublicSchema["CompositeTypes"]
    ? PublicSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never
