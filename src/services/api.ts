// src/services/api.ts
import axios from "axios";
import {
  Supplier,
  Product,
  Purchase,
  PurchaseHistoryItem,
  PurchaseItemDetail,
} from "../types";
import { Row } from "../types";
import { SoldProductsResponse } from "../types";
const api = axios.create({
  baseURL: "http://localhost:3001/api",
});

// ======================= Purchases =======================

// البحث في المشتريات
export const searchPurchasesAPI = async (query: string) => {
  return await api.get(`/purchases/search?q=${query}`);
};

// جلب كل المشتريات
export const fetchPurchases = async (): Promise<Purchase[]> => {
  const res = await api.get("/purchases");
  return res.data;
};

// جلب تفاصيل فاتورة شراء واحدة
export const getPurchaseDetailsAPI = async (
  id: number
): Promise<PurchaseItemDetail[]> => {
  const res = await api.get(`/purchases/${id}`);
  return res.data;
};

// حفظ عملية شراء جديدة
export async function savePurchaseAPI(purchaseData: any): Promise<any> {
  // نفترض إنك مخزن بيانات المستخدم في localStorage بعد تسجيل الدخول
  const user = JSON.parse(localStorage.getItem("user") || "{}");

  // لو مفيش user_id نخليه 1 افتراضي (تقدر تغير ده حسب نظامك)
  const userId = user.id || 1;

  const payload = {
    ...purchaseData,
    user_id: userId,
  };

  const res = await fetch("http://localhost:3001/api/purchases", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    const errorMsg = await res.json();
    throw new Error(errorMsg.error || "Failed to save purchase");
  }

  return res.json();
}
export async function getSoldProductsReport(params: {
  start?: string;
  end?: string;
  category?: string;
  q?: string;
  page?: number;
  perPage?: number;
}): Promise<SoldProductsResponse> {
  const qs = new URLSearchParams();
  Object.entries(params).forEach(([k, v]) => {
    if (v !== undefined && v !== null && v !== "") qs.append(k, String(v));
  });

  // استخدم الـ base URL لو احتجت، أو اعتمد على proxy في vite
  const res = await fetch(`http://localhost:3001/api/reports/sold-products?${qs.toString()}`);
  if (!res.ok) throw new Error(await res.text());
  const json = await res.json();
  return json as SoldProductsResponse;
}


// ======================= Suppliers =======================

export async function getSuppliersAPI(): Promise<Supplier[]> {
  const res = await fetch("http://localhost:3001/api/suppliers");
  if (!res.ok) throw new Error("Failed to fetch suppliers");
  return res.json();
}

// ======================= Products =======================

export async function getProductsAPI(): Promise<Product[]> {
  const res = await fetch("http://localhost:3001/api/products");
  if (!res.ok) throw new Error("Failed to fetch products");
  return res.json();
}

export async function addNewProductAPI(productData: Product): Promise<Product> {
  const res = await fetch("http://localhost:3001/api/products", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(productData),
  });
  if (!res.ok) throw new Error("Failed to add product");
  return res.json();
}

// ======================= Purchase History =======================

export async function getPurchaseHistoryAPI(): Promise<PurchaseHistoryItem[]> {
  const res = await fetch("http://localhost:3001/api/purchases/history");
  if (!res.ok) throw new Error("Failed to fetch purchase history");
  return res.json();
}
