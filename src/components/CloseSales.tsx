import React, { useEffect, useState } from "react";
import { getPendingSalesAPI, closeSelectedSalesAPI } from "../services/api";

type PendingSale = {
  id: number;
  seller: string;
  customer: string;
  final_total: number;
  date: string;
};

const CloseSales: React.FC = () => {
  const [pendingSales, setPendingSales] = useState<PendingSale[]>([]);
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string>("");
  const [success, setSuccess] = useState<string>("");

  // جلب الفواتير المعلقة من السيرفر
  const fetchPendingSales = async () => {
    setLoading(true);
    setError("");
    try {
      const data = await getPendingSalesAPI();
      setPendingSales(data);
    } catch (err: any) {
      setError(err.message || "حدث خطأ أثناء جلب الفواتير");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPendingSales();
  }, []);

  // تحديد فاتورة واحدة
  const handleSelect = (id: number) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    );
  };

  // تحديد الكل/إلغاء تحديد الكل
  const handleSelectAll = () => {
    if (selectedIds.length === pendingSales.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(pendingSales.map((s) => s.id));
    }
  };

  // تقفيل الفواتير المختارة
  const handleCloseSales = async () => {
    if (selectedIds.length === 0) {
      setSuccess("");
      setError("اختر فواتير لتقفلها");
      return;
    }
    setError("");
    setSuccess("");
    try {
      await closeSelectedSalesAPI(selectedIds);
      setSuccess("تم تقفيل الفواتير بنجاح ✅");
      setSelectedIds([]);
      fetchPendingSales();
    } catch (err: any) {
      setError(err.message || "حدث خطأ أثناء التقفيل");
    }
  };

  return (
    <div className="max-w-3xl mx-auto mt-8 px-2" dir="rtl">
      <h2 className="text-2xl font-bold mb-6 text-right">
        تقفيل المبيعات المعلقة
      </h2>
      {error && (
        <div className="mb-4 bg-red-100 border border-red-400 text-red-700 px-4 py-2 rounded text-right">
          {error}
        </div>
      )}
      {success && (
        <div className="mb-4 bg-green-100 border border-green-400 text-green-700 px-4 py-2 rounded text-right">
          {success}
        </div>
      )}
      {loading ? (
        <div className="text-center text-lg">جاري تحميل الفواتير...</div>
      ) : pendingSales.length === 0 ? (
        <div className="text-center text-lg">لا توجد فواتير معلقة</div>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full border rounded shadow">
            <thead>
              <tr className="bg-gray-200">
                <th className="px-3 py-2 text-right">
                  <input
                    type="checkbox"
                    checked={
                      selectedIds.length === pendingSales.length &&
                      pendingSales.length > 0
                    }
                    onChange={handleSelectAll}
                  />
                </th>
                <th className="px-3 py-2 text-right">رقم الفاتورة</th>
                <th className="px-3 py-2 text-right">البائع</th>
                <th className="px-3 py-2 text-right">العميل</th>
                <th className="px-3 py-2 text-right">الإجمالي</th>
                <th className="px-3 py-2 text-right">التاريخ</th>
              </tr>
            </thead>
            <tbody>
              {pendingSales.map((sale, idx) => (
                <tr
                  key={sale.id}
                  className={idx % 2 === 0 ? "bg-gray-50" : "bg-white"}
                >
                  <td className="px-3 py-2 text-center">
                    <input
                      type="checkbox"
                      checked={selectedIds.includes(sale.id)}
                      onChange={() => handleSelect(sale.id)}
                    />
                  </td>
                  <td className="px-3 py-2 text-right">{sale.id}</td>
                  <td className="px-3 py-2 text-right">{sale.seller}</td>
                  <td className="px-3 py-2 text-right">{sale.customer}</td>
                  <td className="px-3 py-2 text-right">{sale.final_total}</td>
                  <td className="px-3 py-2 text-right">{sale.date}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <div className="mt-6 flex justify-end">
        <button
          className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700 transition"
          onClick={handleCloseSales}
          disabled={loading || pendingSales.length === 0}
        >
          تقفيل الفواتير المحددة
        </button>
      </div>
    </div>
  );
};

export default CloseSales;