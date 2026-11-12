import type { GalleryItem, Profile, ProfileLink } from "./profile";

type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type Database = {
  __InternalSupabase: { PostgrestVersion: "12" };
  public: {
    Tables: {
      profiles: {
        Row: Profile & { created_at: string; updated_at: string };
        Insert: {
          user_id: string;
          username: string;
          full_name?: string;
          job_title?: string;
          company?: string;
          bio?: string;
          photo_url?: string | null;
          logo_url?: string | null;
          theme_template?: Profile["theme_template"];
          theme_color?: string;
          language?: Profile["language"];
          services?: Json;
          plan?: Profile["plan"];
          is_published?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          username?: string;
          full_name?: string;
          job_title?: string;
          company?: string;
          bio?: string;
          photo_url?: string | null;
          logo_url?: string | null;
          theme_template?: Profile["theme_template"];
          theme_color?: string;
          language?: Profile["language"];
          services?: Json;
          plan?: Profile["plan"];
          is_published?: boolean;
          updated_at?: string;
        };
        Relationships: [];
      };
      links: {
        Row: ProfileLink & { id: string; user_id: string };
        Insert: { id?: string; user_id: string; kind: ProfileLink["kind"]; value: string; sort_order?: number };
        Update: { kind?: ProfileLink["kind"]; value?: string; sort_order?: number };
        Relationships: [];
      };
      gallery_items: {
        Row: GalleryItem & { created_at: string };
        Insert: { id?: string; user_id: string; image_url: string; alt_text?: string; sort_order?: number; created_at?: string };
        Update: { image_url?: string; alt_text?: string; sort_order?: number };
        Relationships: [];
      };
      visits: {
        Row: {
          id: number;
          user_id: string;
          event_type: "page_view" | "contact_save" | "button_click";
          target: string | null;
          device_type: "mobile" | "tablet" | "desktop" | "unknown";
          occurred_at: string;
        };
        Insert: {
          id?: never;
          user_id: string;
          event_type: "page_view" | "contact_save" | "button_click";
          target?: string | null;
          device_type?: "mobile" | "tablet" | "desktop" | "unknown";
          occurred_at?: string;
        };
        Update: never;
        Relationships: [];
      };
      orders: {
        Row: {
          id: string;
          customer_id: string;
          quantity: number;
          card_type: "pvc" | "metal" | "wood";
          status: "new" | "printing" | "shipped" | "delivered";
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          customer_id: string;
          quantity: number;
          card_type: "pvc" | "metal" | "wood";
          status?: "new" | "printing" | "shipped" | "delivered";
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          customer_id?: string;
          quantity?: number;
          card_type?: "pvc" | "metal" | "wood";
          status?: "new" | "printing" | "shipped" | "delivered";
          updated_at?: string;
        };
        Relationships: [];
      };
    };
    Views: { [_ in never]: never };
    Functions: {
      record_profile_event: {
        Args: { p_username: string; p_event_type: string; p_device_type: string; p_target: string | null };
        Returns: undefined;
      };
    };
    Enums: { [_ in never]: never };
    CompositeTypes: { [_ in never]: never };
  };
};

export type DatabaseJson = Json;
