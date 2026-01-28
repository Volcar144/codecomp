import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'placeholder-key';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Type definitions for our database tables
export type Database = {
  public: {
    Tables: {
      competitions: {
        Row: {
          id: string;
          title: string;
          description: string;
          rules: string;
          start_date: string;
          end_date: string;
          creator_id: string;
          allowed_languages: string[];
          status: string;
          is_public: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: Omit<Database['public']['Tables']['competitions']['Row'], 'id' | 'created_at' | 'updated_at'>;
        Update: Partial<Database['public']['Tables']['competitions']['Insert']>;
      };
      submissions: {
        Row: {
          id: string;
          competition_id: string;
          user_id: string;
          code: string;
          language: string;
          status: 'pending' | 'running' | 'passed' | 'failed';
          score: number;
          submitted_at: string;
        };
        Insert: Omit<Database['public']['Tables']['submissions']['Row'], 'id' | 'submitted_at'>;
        Update: Partial<Database['public']['Tables']['submissions']['Insert']>;
      };
      test_cases: {
        Row: {
          id: string;
          competition_id: string;
          input: string;
          expected_output: string;
          points: number;
          is_hidden: boolean;
          created_at: string;
        };
        Insert: Omit<Database['public']['Tables']['test_cases']['Row'], 'id' | 'created_at'>;
        Update: Partial<Database['public']['Tables']['test_cases']['Insert']>;
      };
    };
  };
};
