export interface Database {
  public: {
    Tables: {
      categories: {
        Row: {
          id: string;
          name: string;
          description: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          description?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          description?: string | null;
        };
      };
      locations: {
        Row: {
          id: string;
          rack_code: string;
          section: string;
          capacity: number;
          created_at: string;
        };
        Insert: {
          id?: string;
          rack_code: string;
          section: string;
          capacity?: number;
          created_at?: string;
        };
        Update: {
          id?: string;
          rack_code?: string;
          section?: string;
          capacity?: number;
        };
      };
      suppliers: {
        Row: {
          id: string;
          name: string;
          contact: string | null;
          address: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          contact?: string | null;
          address?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          contact?: string | null;
          address?: string | null;
        };
      };
      books: {
        Row: {
          id: string;
          isbn: string;
          title: string;
          author: string;
          category_id: string | null;
          location_id: string | null;
          stock: number;
          price: number;
          created_at: string;
        };
        Insert: {
          id?: string;
          isbn: string;
          title: string;
          author: string;
          category_id?: string | null;
          location_id?: string | null;
          stock?: number;
          price?: number;
          created_at?: string;
        };
        Update: {
          id?: string;
          isbn?: string;
          title?: string;
          author?: string;
          category_id?: string | null;
          location_id?: string | null;
          stock?: number;
          price?: number;
        };
      };
      transactions: {
        Row: {
          id: string;
          type: 'in' | 'out';
          supplier_id: string | null;
          user_id: string | null;
          invoice_number: string | null;
          notes: string | null;
          total_amount: number;
          created_at: string;
        };
        Insert: {
          id?: string;
          type: 'in' | 'out';
          supplier_id?: string | null;
          user_id?: string | null;
          invoice_number?: string | null;
          notes?: string | null;
          total_amount?: number;
          created_at?: string;
        };
        Update: {
          id?: string;
          type?: 'in' | 'out';
          supplier_id?: string | null;
          user_id?: string | null;
          invoice_number?: string | null;
          notes?: string | null;
          total_amount?: number;
        };
      };
      transaction_items: {
        Row: {
          id: string;
          transaction_id: string;
          book_id: string;
          quantity: number;
          unit_price: number;
          created_at: string;
        };
        Insert: {
          id?: string;
          transaction_id: string;
          book_id: string;
          quantity: number;
          unit_price?: number;
          created_at?: string;
        };
        Update: {
          id?: string;
          transaction_id?: string;
          book_id?: string;
          quantity?: number;
          unit_price?: number;
        };
      };
    };
  };
}

// Helper types for easier use in components
export type Category = Database['public']['Tables']['categories']['Row'];
export type Location = Database['public']['Tables']['locations']['Row'];
export type Supplier = Database['public']['Tables']['suppliers']['Row'];
export type Book = Database['public']['Tables']['books']['Row'];
export type Transaction = Database['public']['Tables']['transactions']['Row'];
export type TransactionItem = Database['public']['Tables']['transaction_items']['Row'];
