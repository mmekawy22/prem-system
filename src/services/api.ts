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
import { PendingSale } from "../types";

// عدل هنا للـ IP الصحيح لجهاز السيرفر
const API_IP = "192.168.1.20"; // عدل هذا ليطابق جهاز السيرفر الفعلي
const API_PORT = "3001";
const API_BASE = `http://${API_IP}:${API_PORT}/api`;

const api = axios.create({
  baseURL: API_BASE,
});

// ======================= Purchases =======================

// البحث في المشتريات
export const searchPurchasesAPI = async (query: string) => {
  // لاحظ أن السيرفر يستقبل term وليس q
  // إذا كان السيرفر يعمل بـ term، استخدم التالي:
  return await api.get(`/purchases/search?term=${encodeURIComponent(query)}&type=invoiceId`);
  // لو كنت تريد البحث بأنواع أخرى مثل supplierName, productName, productBarcode
  // أضف البراميتر المناسب
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

  // استخدم نفس API_BASE هنا
  const res = await fetch(`${API_BASE}/purchases`, {
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

  const res = await fetch(`${API_BASE}/reports/sold-products?${qs.toString()}`);
  if (!res.ok) throw new Error(await res.text());
  const json = await res.json();
  return json as SoldProductsResponse;
}

// ======================= Suppliers =======================

export async function getSuppliersAPI(): Promise<Supplier[]> {
  const res = await fetch(`${API_BASE}/suppliers`);
  if (!res.ok) throw new Error("Failed to fetch suppliers");
  return res.json();
}

// ======================= Products =======================

export async function getProductsAPI(): Promise<Product[]> {
  const res = await fetch(`${API_BASE}/products`);
  if (!res.ok) throw new Error("Failed to fetch products");
  return res.json();
}

export async function addNewProductAPI(productData: Product): Promise<Product> {
  const res = await fetch(`${API_BASE}/products`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(productData),
  });
  if (!res.ok) throw new Error("Failed to add product");
  return res.json();
}

// ======================= Purchase History =======================

export async function getPurchaseHistoryAPI(): Promise<PurchaseHistoryItem[]> {
  const res = await fetch(`${API_BASE}/purchases/history`);
  if (!res.ok) throw new Error("Failed to fetch purchase history");
  return res.json();
}

// ======================= Pending Sales =======================

// جلب الفواتير المعلقة
export async function getPendingSalesAPI(): Promise<any[]> {
  const res = await fetch(`${API_BASE}/pending-sales`);
  if (!res.ok) throw new Error("تعذر جلب الفواتير المعلقة");
  return res.json();
}

// تقفيل الفواتير المحددة
export async function closeSelectedSalesAPI(ids: number[]): Promise<any> {
  const res = await fetch(`${API_BASE}/close-sales`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ ids }),
  });
  if (!res.ok) {
    const errorMsg = await res.json();
    throw new Error(errorMsg.message || "تعذر تقفيل الفواتير");
  }
  return res.json();
}