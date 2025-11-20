import React, { useEffect, useRef, useState } from "react";
import { createRoot } from "react-dom/client";
import { useTranslation } from "react-i18next";
import CreatableSelect from "react-select/creatable";
import { useReactToPrint } from "react-to-print";
import BarcodeSheet from "../inventory/BarcodeSheet";
import { useAuth } from "../../context/UserContext";

import type {
  Supplier,
  Product,
  PurchaseItemDetail,
  PurchaseHistoryItem,
} from "../../types";
import {
  getSuppliersAPI,
  fetchPurchases as fetchPurchasesAPI,
  savePurchaseAPI,
  addNewProductAPI,
  searchPurchasesAPI,
  getPurchaseDetailsAPI,
} from "../../services/api";

const API_BASE = "http://192.168.1.20:3001/api"; // تأكد من وضع IP صحيح للسيرفر

const Purchases: React.FC = () => {
  const { t } = useTranslation();
  const { user } = useAuth();

  // ----- Modes -----
  const [viewMode, setViewMode] = useState<"create" | "search">("create");

  // ----- Create mode state -----
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [selectedSupplierId, setSelectedSupplierId] = useState<number | "">("");
  const [purchaseCart, setPurchaseCart] = useState<
    (Product & { quantity: number; cost_price: number })[]
  >([]);
  const [productSearchTerm, setProductSearchTerm] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  // new product modal
  const [isAddProductModalOpen, setIsAddProductModalOpen] = useState(false);
  const [newProductData, setNewProductData] = useState<{
    name: string;
    price: number | "";
    cost: number | "";
    category: string;
    min_stock: number | "";
    wholesale_price: number | "";
  }>({
    name: "",
    price: "",
    cost: "",
    category: "",
    min_stock: "",
    wholesale_price: "",
  });

  // ----- Search mode state -----
  const [searchType, setSearchType] = useState<
    "invoiceId" | "supplierName" | "productName" | "productBarcode"
  >("invoiceId");
  const [searchTerm, setSearchTerm] = useState("");
  const [submittedSearch, setSubmittedSearch] = useState("");
  const [searchResults, setSearchResults] = useState<PurchaseHistoryItem[]>([]);
  const [selectedInvoiceId, setSelectedInvoiceId] = useState<number | null>(null);
  const [invoiceItems, setInvoiceItems] = useState<PurchaseItemDetail[]>([]);
  const [isLoadingDetails, setIsLoadingDetails] = useState(false);
  const [isDetailsError, setIsDetailsError] = useState(false);

  // ----- Printing -----
  const componentRef = useRef<HTMLDivElement | null>(null);
  const [itemsToPrint, setItemsToPrint] = useState<PurchaseItemDetail[] | null>(null);

  // ======================================================
  // Load initial data: suppliers + products + latest purchases
  // ======================================================
  useEffect(() => {
    const loadInitial = async () => {
      try {
        // suppliers
        try {
          const res = await getSuppliersAPI();
          const data = (res as any).data || res || [];
          setSuppliers(data);
        } catch (err) {
          try {
            const r = await fetch(`${API_BASE}/suppliers`);
            if (r.ok) setSuppliers(await r.json());
          } catch {}
        }

        // products
        try {
          const r = await fetch(`${API_BASE}/products`);
          if (r.ok) {
            const p = await r.json();
            setProducts(p || []);
          }
        } catch (err) {}

        // purchases (latest)
        try {
          const res = await fetchPurchasesAPI();
          const data = (res as any).data || res || [];
          setSearchResults(Array.isArray(data) ? data : []);
        } catch (err) {}
      } catch (error) {}
    };
    loadInitial();
  }, []);

  // ======================================================
  // Helpers for cart (create mode)
  // ======================================================
  const addProductToPurchase = (product: Product) => {
    if (!product || typeof product.id === "undefined" || product.id === null)
      return;
    if (purchaseCart.some((i) => i.id === product.id)) return;
    const item = {
      ...product,
      quantity: 1,
      cost_price: product.cost_price ?? 0,
    };
    setPurchaseCart((prev) => [...prev, item]);
  };

  const updatePurchaseItem = (
    productId: number,
    field: "quantity" | "cost_price",
    value: number
  ) => {
    const numeric = Number(value) || 0;
    setPurchaseCart((prev) =>
      prev.map((it) =>
        it.id === productId ? { ...it, [field]: Math.max(0, numeric) } : it
      )
    );
  };

  const removePurchaseItem = (productId: number) => {
    setPurchaseCart((prev) => prev.filter((it) => it.id !== productId));
  };

  const calculateTotal = () =>
    purchaseCart.reduce((s, it) => s + it.cost_price * it.quantity, 0);

  // ======================================================
  // Save purchase (CREATE)
  // ======================================================
  const handleSavePurchase = async () => {
    if (!selectedSupplierId) {
      alert(t("purchases.alertSelectSupplier", "Please select a supplier."));
      return;
    }
    if (purchaseCart.length === 0) {
      alert(t("purchases.alertAddProducts", "Please add products to purchase."));
      return;
    }

    setIsSaving(true);
    const payload = {
      supplier_id: selectedSupplierId,
      user_id: user?.id,
      total_amount: calculateTotal(),
      items: purchaseCart.map((p) => ({
        product_id: p.id,
        quantity: p.quantity,
        cost_price: p.cost_price,
      })),
    };

    try {
      const res = await savePurchaseAPI(payload).catch((e) => {
        throw e;
      });
      const savedForPrint: PurchaseItemDetail[] = purchaseCart.map((p) => ({
        id: p.id,
        product_name: p.name,
        barcode: p.barcode || "",
        quantity: p.quantity,
        cost_price: p.cost_price,
        retail_price: p.price,
      }));

      setPurchaseCart([]);
      setSelectedSupplierId("");

      const confirmPrint = window.confirm(
        t(
          "purchases.confirmPrintBarcodes",
          "Purchase saved! Print barcodes for items now?"
        )
      );
      if (confirmPrint) {
        setItemsToPrint(savedForPrint);
      } else {
        alert(t("purchases.saveSuccess", "Purchase order saved successfully!"));
      }
    } catch (error: any) {
      alert(
        t(
          "purchases.saveError",
          `Failed to save purchase order: ${error?.message || String(error)}`
        )
      );
    } finally {
      setIsSaving(false);
    }
  };

  // ======================================================
  // Add new product modal
  // ======================================================
  const handleAddNewProduct = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const name = newProductData.name?.trim();
    const price = Number(newProductData.price || 0);
    if (!name || price <= 0) {
      alert("Please provide a name and valid price.");
      return;
    }

    const payload: any = {
      name,
      price,
      cost: Number(newProductData.cost || 0),
      wholesale_price: Number(newProductData.wholesale_price || 0),
      min_stock: Number(newProductData.min_stock || 0),
      category: newProductData.category || "",
      stock: 0,
    };

    try {
      const added = await addNewProductAPI(payload);
      const data = (added as any).data || added;
      if (data) {
        if (Array.isArray(products)) setProducts((p) => [...p, data]);
        else setProducts([data]);
        if (data.id) addProductToPurchase(data as Product);
      }
      setIsAddProductModalOpen(false);
      setNewProductData({
        name: "",
        price: "",
        cost: "",
        category: "",
        min_stock: "",
        wholesale_price: "",
      });
    } catch (err) {
      alert(t("purchases.addNewProductError", "Failed to add new product."));
    }
  };

  // ======================================================
  // Printing barcodes using iframe (itemsToPrint)
  // ======================================================
  useEffect(() => {
    if (!itemsToPrint || itemsToPrint.length === 0) return;

    const printIframe = document.createElement("iframe");
    printIframe.style.position = "absolute";
    printIframe.style.width = "0";
    printIframe.style.height = "0";
    printIframe.style.left = "-9999px";
    printIframe.style.top = "0";
    printIframe.style.border = "none";
    document.body.appendChild(printIframe);

    const doc = printIframe.contentDocument || printIframe.contentWindow?.document;
    if (!doc) {
      document.body.removeChild(printIframe);
      setItemsToPrint(null);
      return;
    }

    const rootContainer = doc.createElement("div");
    doc.body.appendChild(rootContainer);

    try {
      const printable = itemsToPrint.map((it) => ({
        id: it.id,
        name: it.product_name,
        barcode: it.barcode,
        price: it.retail_price,
        quantity: it.quantity,
      }));

      const root = createRoot(rootContainer);
      root.render(<BarcodeSheet items={printable} />);

      setTimeout(() => {
        printIframe.contentWindow?.focus();
        printIframe.contentWindow?.print();

        setTimeout(() => {
          try {
            root.unmount();
          } catch {}
          if (document.body.contains(printIframe)) document.body.removeChild(printIframe);
          setItemsToPrint(null);
        }, 500);
      }, 300);
    } catch (err) {
      if (document.body.contains(printIframe)) document.body.removeChild(printIframe);
      setItemsToPrint(null);
    }
  }, [itemsToPrint]);

  // ======================================================
  // Search purchases + details
  // ======================================================
  const handleSearchSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const term = searchTerm.trim();
    if (!term) return;

    setSubmittedSearch(term);
    try {
      const res = await searchPurchasesAPI(term).catch((err) => {
        throw err;
      });
      const data = (res as any).data || res || [];
      setSearchResults(Array.isArray(data) ? data : []);
    } catch (err) {
      try {
        const url = `${API_BASE}/purchases/search?term=${encodeURIComponent(term)}&type=${encodeURIComponent(searchType)}`;
        const r = await fetch(url);
        if (r.ok) {
          const d = await r.json();
          setSearchResults(Array.isArray(d) ? d : []);
          return;
        }
      } catch {}
      alert(t("purchases.searchError", "Failed to search purchases."));
    }
  };

  // ======================================================
  // تفاصيل الفاتورة عند الضغط على View
  // ======================================================
  const handleSelectInvoice = async (id: number) => {
    setSelectedInvoiceId(id);
    setIsLoadingDetails(true);
    setIsDetailsError(false);
    try {
      const details = await getPurchaseDetailsAPI(id);
      if (Array.isArray(details)) {
        setInvoiceItems(details);
      } else {
        setInvoiceItems([]);
      }
    } catch (err) {
      setInvoiceItems([]);
      setIsDetailsError(true);
    } finally {
      setIsLoadingDetails(false);
    }
  };

  // ======================================================
  // category options
  // ======================================================
  const categoryOptions = Array.from(
    new Set(products.map((p) => p.category).filter(Boolean))
  ).map((c) => ({ value: c!, label: c }));

  // ======================================================
  // Filtered products for add panel
  // ======================================================
  const filteredProducts = productSearchTerm
    ? products.filter(
        (p) =>
          p.name.toLowerCase().includes(productSearchTerm.toLowerCase()) ||
          (p.barcode && p.barcode.includes(productSearchTerm))
      )
    : products.slice(0, 50);

  // ======================================================
  // Render JSX
  // ======================================================
  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-3xl font-bold text-slate-800 dark:text-slate-200">
          {t("purchases.title", "Purchases")}
        </h2>
        <div className="bg-gray-200 dark:bg-slate-700 p-1 rounded-lg">
          <button
            onClick={() => setViewMode("create")}
            className={`px-4 py-2 text-sm font-semibold rounded-md ${
              viewMode === "create"
                ? "bg-white dark:bg-slate-800 text-blue-600"
                : "text-slate-600 dark:text-slate-300"
            }`}
          >
            {t("purchases.createNew", "Create New")}
          </button>
          <button
            onClick={() => setViewMode("search")}
            className={`px-4 py-2 text-sm font-semibold rounded-md ${
              viewMode === "search"
                ? "bg-white dark:bg-slate-800 text-blue-600"
                : "text-slate-600 dark:text-slate-300"
            }`}
          >
            {t("purchases.searchHistory", "Search History")}
          </button>
        </div>
      </div>

      {/* ---------------- CREATE MODE ---------------- */}
      {viewMode === "create" && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-white dark:bg-slate-800 p-4 rounded-lg shadow-md flex flex-col">
            <h3 className="text-2xl font-bold mb-4 dark:text-slate-200">
              {t("purchases.newTitle", "New Purchase Order")}
            </h3>
            <div className="mb-4">
              <label className="block font-semibold mb-1 dark:text-slate-300">
                {t("purchases.supplier", "Supplier")}
              </label>
              <select
                value={selectedSupplierId}
                onChange={(e) => setSelectedSupplierId(Number(e.target.value))}
                className="w-full p-2 border rounded dark:bg-slate-700 dark:border-slate-600 dark:text-slate-300"
              >
                <option value="">{t("purchases.selectSupplier", "Select a supplier")}</option>
                {suppliers.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex-grow max-h-[50vh] overflow-y-auto">
              <table className="min-w-full">
                <thead className="sticky top-0 bg-gray-100 dark:bg-slate-700">
                  <tr>
                    <th className="text-left py-2 px-2">{t("purchases.product", "Product")}</th>
                    <th className="text-center py-2 px-2">{t("purchases.quantity", "Quantity")}</th>
                    <th className="text-center py-2 px-2">{t("purchases.costUnit", "Cost/Unit")}</th>
                    <th className="text-center py-2 px-2">{t("purchases.actions", "Actions")}</th>
                  </tr>
                </thead>
                <tbody className="dark:text-slate-300">
                  {purchaseCart.map((item) => (
                    <tr key={item.id}>
                      <td className="py-2 px-2">{item.name}</td>
                      <td className="py-2 px-2">
                        <input
                          type="number"
                          value={item.quantity}
                          onChange={(e) => updatePurchaseItem(item.id, "quantity", Number(e.target.value))}
                          className="w-20 text-center border rounded dark:bg-slate-700 dark:border-slate-600"
                        />
                      </td>
                      <td className="py-2 px-2">
                        <input
                          type="number"
                          value={item.cost_price}
                          onChange={(e) => updatePurchaseItem(item.id, "cost_price", Number(e.target.value))}
                          className="w-24 text-center border rounded dark:bg-slate-700 dark:border-slate-600"
                        />
                      </td>
                      <td className="py-2 px-2 text-center">
                        <button onClick={() => removePurchaseItem(item.id)} className="text-red-500 font-bold">
                          X
                        </button>
                      </td>
                    </tr>
                  ))}
                  {purchaseCart.length === 0 && (
                    <tr>
                      <td colSpan={4} className="p-4 text-center dark:text-slate-300">
                        {t("purchases.emptyCart", "No products added yet.")}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
            <div className="border-t dark:border-slate-700 mt-auto pt-4">
              <p className="font-bold text-xl text-right dark:text-slate-200">
                {t("purchases.total", "Total")}: {calculateTotal().toFixed(2)} EGP
              </p>
              <button
                onClick={handleSavePurchase}
                disabled={isSaving}
                className="mt-4 w-full bg-blue-500 text-white p-3 rounded-lg disabled:bg-blue-300"
              >
                {isSaving ? t("purchases.saving", "Saving...") : t("purchases.save", "Save Purchase")}
              </button>
            </div>
          </div>
          <div className="bg-white dark:bg-slate-800 p-4 rounded-lg shadow-md">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-xl font-semibold dark:text-slate-200">{t("purchases.addProduct", "Add Products")}</h3>
              <button onClick={() => setIsAddProductModalOpen(true)} className="bg-indigo-500 hover:bg-indigo-600 text-white font-bold py-2 px-3 rounded text-sm">
                {t("purchases.newProduct", "+ New Product")}
              </button>
            </div>
            <input
              type="text"
              placeholder={t("purchases.searchPlaceholder", "Search...")}
              value={productSearchTerm}
              onChange={(e) => setProductSearchTerm(e.target.value)}
              className="w-full p-2 mb-4 border rounded dark:bg-slate-700 dark:border-slate-600"
            />
            <div className="max-h-[65vh] overflow-y-auto">
              {filteredProducts.map((p) => (
                <div key={p.id} onClick={() => addProductToPurchase(p)} className="p-2 border-b dark:border-slate-700 hover:bg-gray-100 dark:hover:bg-slate-700 cursor-pointer flex justify-between dark:text-slate-300">
                  <span>{p.name}</span>
                  <span className="text-gray-500 dark:text-slate-400">{t("purchases.stock", "Stock")}: {p.stock}</span>
                </div>
              ))}
              {filteredProducts.length === 0 && <p className="p-3 text-center dark:text-slate-300">No products found.</p>}
            </div>
            {isAddProductModalOpen && (
              <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                <div className="bg-white dark:bg-slate-800 p-6 rounded-lg shadow-xl w-full max-w-lg">
                  <h3 className="text-2xl font-bold mb-4 dark:text-slate-200">{t("purchases.modalAddTitle", "Add New Product")}</h3>
                  <form onSubmit={(e) => { e.preventDefault(); handleAddNewProduct(); }}>
                    <div className="grid grid-cols-2 gap-4">
                      <input name="name" type="text" value={newProductData.name} onChange={(e) => setNewProductData((p) => ({ ...p, name: e.target.value }))} placeholder={t("purchases.productName", "Product Name")} className="p-2 border rounded col-span-2 dark:bg-slate-700 dark:border-slate-600" required />
                      <input name="price" type="number" value={newProductData.price || ""} onChange={(e) => setNewProductData((p) => ({ ...p, price: e.target.value === "" ? "" : Number(e.target.value) }))} placeholder={t("purchases.retailPrice", "Retail Price")} className="p-2 border rounded dark:bg-slate-700 dark:border-slate-600" required />
                      <input name="cost" type="number" value={newProductData.cost || ""} onChange={(e) => setNewProductData((p) => ({ ...p, cost: e.target.value === "" ? "" : Number(e.target.value) }))} placeholder={t("purchases.cost", "Cost")} className="p-2 border rounded dark:bg-slate-700 dark:border-slate-600" />
                      <CreatableSelect isClearable placeholder={t("purchases.category", "Category")} options={categoryOptions} onChange={(opt: any) => setNewProductData((p) => ({ ...p, category: opt ? opt.value : "" }))} formatCreateLabel={(inputValue: string) => `Create "${inputValue}"`} />
                      <input name="wholesale_price" type="number" value={newProductData.wholesale_price || ""} onChange={(e) => setNewProductData((p) => ({ ...p, wholesale_price: e.target.value === "" ? "" : Number(e.target.value) }))} placeholder={t("purchases.wholesalePrice", "Wholesale Price")} className="p-2 border rounded dark:bg-slate-700 dark:border-slate-600" />
                      <input name="min_stock" type="number" value={newProductData.min_stock || ""} onChange={(e) => setNewProductData((p) => ({ ...p, min_stock: e.target.value === "" ? "" : Number(e.target.value) }))} placeholder={t("purchases.minimumStock", "Minimum Stock")} className="p-2 border rounded dark:bg-slate-700 dark:border-slate-600" />
                    </div>
                    <div className="mt-6 flex justify-end gap-4">
                      <button type="button" onClick={() => setIsAddProductModalOpen(false)} className="bg-gray-300 hover:bg-gray-400 text-black font-bold py-2 px-4 rounded">{t("purchases.modalCancel", "Cancel")}</button>
                      <button type="submit" className="bg-blue-500 hover:bg-blue-600 text-white font-bold py-2 px-4 rounded">{t("purchases.modalSaveAndAdd", "Save and Add to Purchase")}</button>
                    </div>
                  </form>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
      {/* ---------------- SEARCH MODE ---------------- */}
      {viewMode === "search" && (
        <div className="space-y-6">
          <div className="bg-white dark:bg-slate-800 p-4 rounded-lg shadow-md">
            <form onSubmit={handleSearchSubmit} className="flex gap-2 items-center">
              <select value={searchType} onChange={(e) => { setSearchType(e.target.value as any); setSearchTerm(""); }} className="p-2 border rounded dark:bg-slate-700 dark:border-slate-600 dark:text-slate-300 flex-shrink-0">
                <option value="invoiceId">{t("purchases.searchTypes.invoiceId", "Invoice ID")}</option>
                <option value="supplierName">{t("purchases.searchTypes.supplierName", "Supplier Name")}</option>
                <option value="productName">{t("purchases.searchTypes.productName", "Product Name")}</option>
                <option value="productBarcode">{t("purchases.searchTypes.productBarcode", "Product Barcode")}</option>
              </select>
              <input
                type={searchType === "invoiceId" ? "number" : "text"}
                placeholder={searchType === "invoiceId" ? t("purchases.placeholder.invoiceId","Enter Invoice ID") : t("purchases.placeholder.productName","Enter search term")}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="p-2 border rounded w-full dark:bg-slate-700 dark:border-slate-600"
              />
              <button type="submit" className="bg-blue-500 text-white px-6 py-2 rounded flex-shrink-0">
                {t("general.search", "Search")}
              </button>
              {submittedSearch && (
                <button type="button" onClick={() => { setSearchTerm(""); setSubmittedSearch(""); setSearchResults([]); setSelectedInvoiceId(null); }} className="bg-gray-500 text-white px-4 py-2 rounded flex-shrink-0">
                  {t("general.reset","Reset")}
                </button>
              )}
            </form>
          </div>
          {/* Results */}
          <div className="bg-white dark:bg-slate-800 p-4 rounded-lg shadow-md">
            <h3 className="font-semibold mb-2 dark:text-slate-200">{submittedSearch ? `Results for "${submittedSearch}"` : t("purchases.allInvoicesHeader","Latest Purchase Invoices")}</h3>
            {searchResults.length === 0 && submittedSearch.trim() !== "" && <p className="dark:text-slate-300">No results found.</p>}
            {searchResults.length > 0 && (
              <div className="max-h-[60vh] overflow-y-auto">
                <table className="min-w-full text-sm">
                  <thead className="bg-gray-100 dark:bg-slate-700 sticky top-0">
                    <tr>
                      <th className="py-2 px-3 text-left">Invoice ID</th>
                      <th className="py-2 px-3 text-left">Date</th>
                      <th className="py-2 px-3 text-left">Supplier</th>
                      <th className="py-2 px-3 text-right">Total</th>
                      <th className="py-2 px-3 text-center">User</th>
                      <th className="py-2 px-3 text-center">Details</th>
                    </tr>
                  </thead>
                  <tbody className="dark:text-slate-300">
                    {searchResults.map((p: any) => (
                      <tr key={p.id} className="border-b dark:border-slate-700 hover:bg-gray-50 dark:hover:bg-slate-700">
                        <td className="py-2 px-3 font-bold">{p.id}</td>
                        <td className="py-2 px-3">{p.created_at ? new Date(p.created_at).toLocaleDateString() : "-"}</td>
                        <td className="py-2 px-3">{p.supplier_name || p.supplier || "-"}</td>
                        <td className="py-2 px-3 text-right">{Number(p.total_amount ?? p.total ?? 0).toFixed(2)} EGP</td>
                        <td className="py-2 px-3 text-center">{p.user_name || "-"}</td>
                        <td className="py-2 px-3 text-center">
                          <button onClick={() => handleSelectInvoice(p.id)} className="text-blue-500 hover:text-blue-700 font-semibold">View</button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
          {/* Selected invoice details */}
          {selectedInvoiceId && (
            <div className="bg-white dark:bg-slate-800 p-6 rounded-lg shadow-md">
              {isLoadingDetails && <p className="dark:text-slate-300">Loading...</p>}
              {isDetailsError && <p className="text-red-500">Failed to load invoice details.</p>}
              {!isLoadingDetails && !isDetailsError && invoiceItems.length > 0 && (
                <>
                  <div className="flex justify-between items-center mb-4">
                    <h3 className="text-xl font-bold dark:text-slate-200">Invoice #{selectedInvoiceId}</h3>
                    <div>
                      <button onClick={() => setSelectedInvoiceId(null)} className="bg-gray-500 hover:bg-gray-600 text-white font-bold py-2 px-4 rounded mr-2">Back</button>
                    </div>
                  </div>
                  <div className="max-h-[50vh] overflow-y-auto">
                    <table className="min-w-full text-sm">
                      <thead className="bg-gray-100 dark:bg-slate-700 sticky top-0">
                        <tr>
                          <th className="py-2 px-3 text-left">Product Name</th>
                          <th className="py-2 px-3 text-center">Barcode</th>
                          <th className="py-2 px-3 text-right">Quantity</th>
                          <th className="py-2 px-3 text-right">Cost Price</th>
                          <th className="py-2 px-3 text-right">Retail Price</th>
                        </tr>
                      </thead>
                      <tbody className="dark:text-slate-300">
                        {invoiceItems.map((it) => (
                          <tr key={it.id} className="border-b dark:border-slate-700">
                            <td className="py-2 px-3">{it.product_name}</td>
                            <td className="py-2 px-3 text-center">{it.barcode}</td>
                            <td className="py-2 px-3 text-right">{it.quantity}</td>
                            <td className="py-2 px-3 text-right">{it.cost_price.toFixed(2)}</td>
                            <td className="py-2 px-3 text-right">{it.retail_price.toFixed(2)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  <div className="border-t dark:border-slate-700 mt-4 pt-4">
                    <p className="font-bold text-xl text-right dark:text-slate-200">
                      Total: {invoiceItems.reduce((s, it) => s + it.cost_price * it.quantity, 0).toFixed(2)} EGP
                    </p>
                  </div>
                </>
              )}
              {!isLoadingDetails && !isDetailsError && invoiceItems.length === 0 && (
                <p className="dark:text-slate-300">Invoice details not found or empty.</p>
              )}
            </div>
          )}
        </div>
      )}
      {/* Hidden area used by react-to-print */}
      <div style={{ display: "none" }}>
        <div ref={componentRef as any}>
          <h2>Purchase Print</h2>
          <table>
            <thead>
              <tr><th>Product</th><th>Qty</th><th>Cost</th><th>Total</th></tr>
            </thead>
            <tbody>
              {purchaseCart.map((it) => (
                <tr key={it.id}>
                  <td>{it.name}</td>
                  <td>{it.quantity}</td>
                  <td>{it.cost_price.toFixed(2)}</td>
                  <td>{(it.cost_price * it.quantity).toFixed(2)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default Purchases;