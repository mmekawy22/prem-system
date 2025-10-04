import Dexie, { Table } from 'dexie';

// --- INTERFACES ---

export interface User {
  id?: number;
  username: string;
  password_hash: string;
  role: string;
  created_at?: string;
}

export interface Product {
  id?: number;
  name: string;
  barcode?: string | null;
  category?: string;
  cost?: number;
  price: number;
  wholesale_price?: number;
  stock: number;
  min_stock?: number;
  supplier_id?: number | null;
}

export interface Customer {
  id?: number;
  name: string;
  phone?: string;
  email?: string;
  address?: string;
  loyalty_points?: number;
  created_at?: string;
}

export interface Supplier {
  id?: number;
  name: string;
  contact_person?: string;
  phone?: string;
  email?: string;
  address?: string;
  created_at?: string;
}
// Add these interfaces to src/db/index.ts

export interface PurchaseHistoryItem {
    id: number;
    supplier_id: number;
    user_id: number;
    total_amount: number;
    status: string;
    created_at: string;
    supplier_name: string;
}

export interface PurchaseItemDetail {
    id?: number; // جعل الـ id اختياريًا أيضًا إذا كنت تتعامل مع عناصر غير محفوظة
    purchase_id: number;
    product_id: number | undefined; // ✅ التعديل الرئيسي: يسمح بالقيمة 'undefined'
    // أو يمكن استخدام: product_id?: number;
    quantity: number;
    cost_price: number;
    product_name: string;
    barcode: string;
    retail_price: number;
}

export interface Transaction {
  id?: number;
  timestamp: number;
  date?: string; // This property is used in some older components
  items?: any[]; 
  total: number;
  discount: number;
  final_total: number;
  payment_methods: any[];
  type: 'sale' | 'purchase' | 'return';
  user_id: number;
  customer_id?: number;
  supplier_id?: number; // ✅ The missing property
  notes?: string;
  is_delivery?: boolean;
  customer?: Customer; 
  user?: User;
}

export interface TransactionItem {
  id?: number;
  transaction_id: number;
  product_id: number;
  quantity: number;
  price: number;
  discount: number;
}

export interface Return {
  id?: number;
  original_transaction_id: number;
  returned_items: { productId: number, quantity: number, price: number }[];
  total_refunded: number;
}

export interface Expense {
  id?: number;
  amount: number;
  description: string;
  date: string;
  category: string;
  user_id?: number;
  timestamp?: number;
}

export interface Shift {
  id?: number;
  start_time: number;
  end_time: number;
  user_id: number;
  username: string;
  expected_cash: number;
  actual_cash: number;
  expected_card: number;
  actual_card: number;
  variance: number;
}

export interface Setting {
  id?: number;
  shop_name: string;
  contact_info?: string;
  logo_base64?: string;
}


// --- DATABASE CLASS ---

export class POSDatabase extends Dexie {
  users!: Table<User>;
  products!: Table<Product>;
  customers!: Table<Customer>;
  suppliers!: Table<Supplier>;
  transactions!: Table<Transaction>;
  transactionItems!: Table<TransactionItem>;
  returns!: Table<Return>;
  expenses!: Table<Expense>;
  shifts!: Table<Shift>;
  settings!: Table<Setting>;

  constructor() {
    super('pos-database'); 
    
    this.version(25).stores({ // Increased version number to handle schema changes
      users: '++id, username',
      products: '++id, barcode, name', 
      customers: '++id, phone',
      suppliers: '++id, name',
      transactions: '++id, type, user_id, timestamp',
      transactionItems: '++id, transaction_id, product_id',
      returns: '++id, original_transaction_id',
      expenses: '++id, timestamp',
      shifts: '++id, end_time, user_id',
      settings: '++id',
    });

    this.on('populate', async () => {
      await this.settings.add({
        id: 1,
        shop_name: 'My Shop',
      });
      await this.users.add({
        username: 'admin',
        password_hash: 'admin123', // ✅ Corrected property name
        role: 'admin',
      });
    });
  }
}

export const db = new POSDatabase();

export async function generateUniqueBarcode(): Promise<string> {
  while (true) {
    // ✅ هذه الصيغة تضمن دائمًا رقمًا من 4 خانات فقط
    const newBarcode = Math.floor(1000 + Math.random() * 9000).toString();
    
    const existingProduct = await db.products.where('barcode').equals(newBarcode).first();
    
    if (!existingProduct) {
      return newBarcode;
    }
  }
}