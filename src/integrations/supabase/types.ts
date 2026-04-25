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
      AllFileLog: {
        Row: {
          BRANCH: string | null
          DATE: string | null
          "ENDING BALANCE": number | null
          GRN: string | null
          id: number
          "OFFICE BALANCE": number | null
          "PRODUCT NAME": string | null
          QTY: number | null
          "STARTING BALANCE": number | null
          SUPPLIER: string | null
          TYPE: string | null
        }
        Insert: {
          BRANCH?: string | null
          DATE?: string | null
          "ENDING BALANCE"?: number | null
          GRN?: string | null
          id?: number
          "OFFICE BALANCE"?: number | null
          "PRODUCT NAME"?: string | null
          QTY?: number | null
          "STARTING BALANCE"?: number | null
          SUPPLIER?: string | null
          TYPE?: string | null
        }
        Update: {
          BRANCH?: string | null
          DATE?: string | null
          "ENDING BALANCE"?: number | null
          GRN?: string | null
          id?: number
          "OFFICE BALANCE"?: number | null
          "PRODUCT NAME"?: string | null
          QTY?: number | null
          "STARTING BALANCE"?: number | null
          SUPPLIER?: string | null
          TYPE?: string | null
        }
        Relationships: []
      }
      AllFileProducts: {
        Row: {
          "BOUDOIR BALANCE": number | null
          "BOUDOIR FAVOURITE": string | null
          "BRANCH PRICE": number | null
          "CHIC NAILSPA BALANCE": number | null
          "CHIC NAILSPA FAVOURITE": string | null
          COLOUR: string | null
          "CUSTOMER PRICE": number | null
          id: number
          "NUR YADI BALANCE": number | null
          "NUR YADI FAVOURITE": string | null
          "OFFICE BALANCE": number | null
          "OFFICE FAVOURITE": string | null
          "OFFICE SECTION": string | null
          PAR: number | null
          "PRODUCT NAME": string | null
          "STAFF PRICE": number | null
          SUPPLIER: string | null
          "SUPPLIER PRICE": number | null
          "UNITS/ORDER": number | null
        }
        Insert: {
          "BOUDOIR BALANCE"?: number | null
          "BOUDOIR FAVOURITE"?: string | null
          "BRANCH PRICE"?: number | null
          "CHIC NAILSPA BALANCE"?: number | null
          "CHIC NAILSPA FAVOURITE"?: string | null
          COLOUR?: string | null
          "CUSTOMER PRICE"?: number | null
          id?: number
          "NUR YADI BALANCE"?: number | null
          "NUR YADI FAVOURITE"?: string | null
          "OFFICE BALANCE"?: number | null
          "OFFICE FAVOURITE"?: string | null
          "OFFICE SECTION"?: string | null
          PAR?: number | null
          "PRODUCT NAME"?: string | null
          "STAFF PRICE"?: number | null
          SUPPLIER?: string | null
          "SUPPLIER PRICE"?: number | null
          "UNITS/ORDER"?: number | null
        }
        Update: {
          "BOUDOIR BALANCE"?: number | null
          "BOUDOIR FAVOURITE"?: string | null
          "BRANCH PRICE"?: number | null
          "CHIC NAILSPA BALANCE"?: number | null
          "CHIC NAILSPA FAVOURITE"?: string | null
          COLOUR?: string | null
          "CUSTOMER PRICE"?: number | null
          id?: number
          "NUR YADI BALANCE"?: number | null
          "NUR YADI FAVOURITE"?: string | null
          "OFFICE BALANCE"?: number | null
          "OFFICE FAVOURITE"?: string | null
          "OFFICE SECTION"?: string | null
          PAR?: number | null
          "PRODUCT NAME"?: string | null
          "STAFF PRICE"?: number | null
          SUPPLIER?: string | null
          "SUPPLIER PRICE"?: number | null
          "UNITS/ORDER"?: number | null
        }
        Relationships: []
      }
      Cash: {
        Row: {
          Branch: string | null
          Cash: number | null
          Credit: number | null
          Date: string | null
          Deposit: boolean | null
          Error: number | null
          Explanation: string | null
          id: number
          QR: number | null
          "Total GST": number | null
        }
        Insert: {
          Branch?: string | null
          Cash?: number | null
          Credit?: number | null
          Date?: string | null
          Deposit?: boolean | null
          Error?: number | null
          Explanation?: string | null
          id?: number
          QR?: number | null
          "Total GST"?: number | null
        }
        Update: {
          Branch?: string | null
          Cash?: number | null
          Credit?: number | null
          Date?: string | null
          Deposit?: boolean | null
          Error?: number | null
          Explanation?: string | null
          id?: number
          QR?: number | null
          "Total GST"?: number | null
        }
        Relationships: []
      }
      InputFullTable: {
        Row: {
          "China Price (CNY)": number | null
          "New Price (CNY)": number | null
          "New Price (RM)": number | null
          "Office Stock": number | null
          "Old Price (RM)": number | null
          "Order Qty": number | null
          "Order Value (RM)": number | null
          "Product Name": string
          Savings: number | null
        }
        Insert: {
          "China Price (CNY)"?: number | null
          "New Price (CNY)"?: number | null
          "New Price (RM)"?: number | null
          "Office Stock"?: number | null
          "Old Price (RM)"?: number | null
          "Order Qty"?: number | null
          "Order Value (RM)"?: number | null
          "Product Name": string
          Savings?: number | null
        }
        Update: {
          "China Price (CNY)"?: number | null
          "New Price (CNY)"?: number | null
          "New Price (RM)"?: number | null
          "Office Stock"?: number | null
          "Old Price (RM)"?: number | null
          "Order Qty"?: number | null
          "Order Value (RM)"?: number | null
          "Product Name"?: string
          Savings?: number | null
        }
        Relationships: []
      }
      Inputhalflist: {
        Row: {
          "China Price (CNY)": number | null
          "New Price (CNY)": number | null
          "New Price (RM)": number | null
          "Office Stock": number | null
          "Old Price (RM)": number | null
          "Order Qty": number | null
          "Order Value (RM)": number | null
          "Product Name": string
          Savings: number | null
        }
        Insert: {
          "China Price (CNY)"?: number | null
          "New Price (CNY)"?: number | null
          "New Price (RM)"?: number | null
          "Office Stock"?: number | null
          "Old Price (RM)"?: number | null
          "Order Qty"?: number | null
          "Order Value (RM)"?: number | null
          "Product Name": string
          Savings?: number | null
        }
        Update: {
          "China Price (CNY)"?: number | null
          "New Price (CNY)"?: number | null
          "New Price (RM)"?: number | null
          "Office Stock"?: number | null
          "Old Price (RM)"?: number | null
          "Order Qty"?: number | null
          "Order Value (RM)"?: number | null
          "Product Name"?: string
          Savings?: number | null
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
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
