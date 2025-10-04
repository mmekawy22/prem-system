// src/types.ts

export interface Purchase {
  id: number;
  supplier: string; // ممكن نلغيها لو عندنا supplier_name
  date: string;     // ممكن نلغيها لو عندنا created_at
  total: number;

  // الحقول الخاصة بالواجهة (من Purchases.tsx)
  created_at: string;
  supplier_name: string;
  total_amount: number;
  user_name: string;

  items: { 
    name: string; 
    quantity: number; 
    price: number 
  }[];
}

export interface Supplier {
  id: number;
  name: string;
}

export interface Product {
  id: number;
  name: string;
  stock: number;
  price: number;
  cost_price: number;
  wholesale_price?: number;
  min_stock?: number;
  category?: string;
  barcode?: string;
}

export interface PurchaseItemDetail {
  id: number;
  product_name: string;
  barcode: string;
  quantity: number;
  cost_price: number;
  retail_price: number;
}
export interface PurchaseHistoryItem {
  id: number;
  created_at: string;
  supplier_name: string;
  total_amount: number;
  user_name: string;
}
// src/types.ts

// src/types.ts
export type Row = {
  product_id: number;
  product_name: string;
  barcode?: string | null;
  category?: string | null;
  stock?: number | null;
  sold_qty: number;
  returned_qty: number;
  net_qty: number;
  revenue: number;
};

export type SoldProductsResponse = {
  data: Row[];
  page: number;
  perPage: number;
  totalCount: number;
};


