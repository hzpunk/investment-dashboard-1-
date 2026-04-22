export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[]

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string
          username: string
          avatar_url: string | null
          created_at: string
          role: string | null
        }
        Insert: {
          id: string
          username: string
          avatar_url?: string | null
          created_at?: string
          role?: string | null
        }
        Update: {
          id?: string
          username?: string
          avatar_url?: string | null
          created_at?: string
          role?: string | null
        }
      }
      accounts: {
        Row: {
          id: string
          user_id: string
          name: string
          type: "brokerage" | "bank" | "crypto" | "retirement" | "other"
          balance: number
          currency: string
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          name: string
          type: "brokerage" | "bank" | "crypto" | "retirement" | "other"
          balance?: number
          currency?: string
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          name?: string
          type?: "brokerage" | "bank" | "crypto" | "retirement" | "other"
          balance?: number
          currency?: string
          created_at?: string
        }
      }
      assets: {
        Row: {
          id: string
          symbol: string
          name: string
          type: "stock" | "bond" | "etf" | "crypto" | "commodity" | "other"
          current_price: number
          currency: string
          updated_at: string
        }
        Insert: {
          id?: string
          symbol: string
          name: string
          type: "stock" | "bond" | "etf" | "crypto" | "commodity" | "other"
          current_price: number
          currency: string
          updated_at?: string
        }
        Update: {
          id?: string
          symbol?: string
          name?: string
          type?: "stock" | "bond" | "etf" | "crypto" | "commodity" | "other"
          current_price?: number
          currency?: string
          updated_at?: string
        }
      }
      transactions: {
        Row: {
          id: string
          user_id: string
          account_id: string
          asset_id: string | null
          type: "buy" | "sell" | "dividend" | "interest" | "deposit" | "withdrawal"
          quantity: number | null
          price_per_unit: number | null
          total_amount: number
          fee: number
          currency: string
          date: string
          notes: string | null
        }
        Insert: {
          id?: string
          user_id: string
          account_id: string
          asset_id?: string | null
          type: "buy" | "sell" | "dividend" | "interest" | "deposit" | "withdrawal"
          quantity?: number | null
          price_per_unit?: number | null
          total_amount: number
          fee?: number
          currency: string
          date: string
          notes?: string | null
        }
        Update: {
          id?: string
          user_id?: string
          account_id?: string
          asset_id?: string | null
          type?: "buy" | "sell" | "dividend" | "interest" | "deposit" | "withdrawal"
          quantity?: number | null
          price_per_unit?: number | null
          total_amount?: number
          fee?: number
          currency?: string
          date?: string
          notes?: string | null
        }
      }
      portfolios: {
        Row: {
          id: string
          user_id: string
          name: string
          description: string | null
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          name: string
          description?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          name?: string
          description?: string | null
          created_at?: string
        }
      }
      portfolio_assets: {
        Row: {
          portfolio_id: string
          asset_id: string
          quantity: number
          average_buy_price: number
        }
        Insert: {
          portfolio_id: string
          asset_id: string
          quantity: number
          average_buy_price: number
        }
        Update: {
          portfolio_id?: string
          asset_id?: string
          quantity?: number
          average_buy_price?: number
        }
      }
      exchange_rates: {
        Row: {
          id: string
          from_currency: string
          to_currency: string
          rate: number
          date: string
        }
        Insert: {
          id?: string
          from_currency: string
          to_currency: string
          rate: number
          date: string
        }
        Update: {
          id?: string
          from_currency?: string
          to_currency?: string
          rate?: number
          date?: string
        }
      }
      goals: {
        Row: {
          id: string
          user_id: string
          name: string
          target_amount: number
          current_amount: number
          target_date: string | null
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          name: string
          target_amount: number
          current_amount?: number
          target_date?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          name?: string
          target_amount?: number
          current_amount?: number
          target_date?: string | null
          created_at?: string
        }
      }
      // Admin tables
      admin_settings: {
        Row: {
          id: string
          setting_key: string
          setting_value: string
          description: string | null
          updated_at: string
        }
        Insert: {
          id?: string
          setting_key: string
          setting_value: string
          description?: string | null
          updated_at?: string
        }
        Update: {
          id?: string
          setting_key?: string
          setting_value?: string
          description?: string | null
          updated_at?: string
        }
      }
      user_roles: {
        Row: {
          id: string
          user_id: string
          role: "admin" | "user" | "premium"
          assigned_at: string
        }
        Insert: {
          id?: string
          user_id: string
          role: "admin" | "user" | "premium"
          assigned_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          role?: "admin" | "user" | "premium"
          assigned_at?: string
        }
      }
      audit_logs: {
        Row: {
          id: string
          user_id: string
          action: string
          entity_type: string
          entity_id: string
          details: Json
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          action: string
          entity_type: string
          entity_id: string
          details: Json
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          action?: string
          entity_type?: string
          entity_id?: string
          details?: Json
          created_at?: string
        }
      }
      market_data_cache: {
        Row: {
          id: string
          symbol: string
          data_type: string
          data: Json
          last_updated: string
          expires_at: string
        }
        Insert: {
          id?: string
          symbol: string
          data_type: string
          data: Json
          last_updated?: string
          expires_at?: string
        }
        Update: {
          id?: string
          symbol?: string
          data_type?: string
          data?: Json
          last_updated?: string
          expires_at?: string
        }
      }
    }
  }
}

