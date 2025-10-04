import React, { useEffect, useState, useCallback } from 'react';
import { getSoldProductsReport } from '../../services/api';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { Row, SoldProductsResponse } from "../../types";



export default function SoldProductsReport() {
  const [start, setStart] = useState<string>(() => new Date().toISOString().slice(0,10));
  const [end, setEnd] = useState<string>(() => new Date().toISOString().slice(0,10));
  const [category, setCategory] = useState<string>('');
  const [q, setQ] = useState<string>('');
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);

  const perPage = 50;

const fetchData = useCallback(async () => {
  setLoading(true);
  try {
    const result = await getSoldProductsReport({ start, end, category, q, page, perPage });
   setRows(result.data || []);

  // دلوقتي TypeScript فاهم إن فيه data
  } catch (err) {
    console.error(err);
    alert('فشل تحميل التقرير');
  } finally {
    setLoading(false);
  }
}, [start, end, category, q, page]);





  useEffect(() => {
    // Debounce بسيطة: تأخير 400ms على البحث
    const handle = setTimeout(fetchData, 300);
    return () => clearTimeout(handle);
  }, [fetchData]);

  const exportCsv = () => {
    const header = ['product_id','product_name','barcode','category','stock','sold_qty','returned_qty','net_qty','revenue'];
    const csv = [
      header.join(','),
      ...rows.map(r => [
        r.product_id, `"${r.product_name.replace(/"/g,'""')}"`, r.barcode || '', r.category || '', r.stock ?? '', r.sold_qty, r.returned_qty, r.net_qty, r.revenue.toFixed(2)
      ].join(','))
    ].join('\n');

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `sold_products_${start}_${end}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const lowStockThreshold = 5;

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-2xl font-bold">تقرير المبيعات حسب المنتج</h2>
        <div className="flex gap-2">
          <button onClick={exportCsv} className="bg-green-600 text-white px-4 py-2 rounded">تصدير CSV</button>
        </div>
      </div>

      <div className="bg-white p-4 rounded shadow mb-6 grid grid-cols-1 md:grid-cols-4 gap-3 items-end">
        <div>
          <label className="block text-sm">من</label>
          <input type="date" value={start} onChange={e => setStart(e.target.value)} className="p-2 border rounded w-full" />
        </div>
        <div>
          <label className="block text-sm">إلى</label>
          <input type="date" value={end} onChange={e => setEnd(e.target.value)} className="p-2 border rounded w-full" />
        </div>
        <div>
          <label className="block text-sm">القسم</label>
          <input placeholder="اسم القسم" value={category} onChange={e => setCategory(e.target.value)} className="p-2 border rounded w-full" />
        </div>
        <div>
          <label className="block text-sm">بحث (اسم أو باركود)</label>
          <input placeholder="Search" value={q} onChange={e => { setQ(e.target.value); setPage(1); }} className="p-2 border rounded w-full" />
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
        <div className="bg-white p-4 rounded shadow">
          <h4 className="font-semibold mb-2">Top Sellers</h4>
          <ol className="list-decimal pl-5">
            {rows.slice(0,5).map(r => (
              <li key={r.product_id} className="mb-1">
                {r.product_name} — <span className="font-bold">{r.net_qty}</span>
              </li>
            ))}
            {rows.length === 0 && <li>لا بيانات</li>}
          </ol>
        </div>

        <div className="bg-white p-4 rounded shadow">
          <h4 className="font-semibold mb-2">ملخص</h4>
          <p>المنتجات المعروضة: <strong>{rows.length}</strong></p>
          <p>إجمالي الإيراد: <strong>{rows.reduce((s,r) => s + (r.revenue||0), 0).toFixed(2)} EGP</strong></p>
        </div>

        <div className="bg-white p-4 rounded shadow">
          <h4 className="font-semibold mb-2">Low stock</h4>
          {rows.filter(r => (r.stock ?? Infinity) <= lowStockThreshold).length === 0 ? (
            <p>لا منتجات ناقصة</p>
          ) : (
            <ul>
              {rows.filter(r => (r.stock ?? Infinity) <= lowStockThreshold).slice(0,5).map(r => (
                <li key={r.product_id} className="mb-1">
                  <span className="text-red-600 font-semibold">{r.product_name}</span> — {r.stock} متبقي
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      <div className="bg-white p-4 rounded shadow mb-6">
        <h4 className="mb-3 font-semibold">Chart — Top 10</h4>
        <div style={{ width: '100%', height: 300 }}>
          <ResponsiveContainer>
            <BarChart data={rows.slice(0,10).map(r => ({ name: r.product_name.length>20 ? r.product_name.slice(0,20)+'...' : r.product_name, net_qty: r.net_qty }))}>
              <XAxis dataKey="name" />
              <YAxis />
              <Tooltip />
              <Bar dataKey="net_qty" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="bg-white p-4 rounded shadow">
        <h4 className="mb-2 font-semibold">قائمة المنتجات</h4>
        {loading ? <p>جاري التحميل...</p> : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead className="bg-gray-100">
                <tr>
                  <th className="py-2 px-3 text-left">المنتج</th>
                  <th className="py-2 px-3 text-left">باركود</th>
                  <th className="py-2 px-3 text-center">المبيع</th>
                  <th className="py-2 px-3 text-center">المرتجع</th>
                  <th className="py-2 px-3 text-center">الصافي</th>
                  <th className="py-2 px-3 text-right">الإيراد</th>
                  <th className="py-2 px-3 text-center">المخزون</th>
                </tr>
              </thead>
              <tbody>
                {rows.map(r => (
                  <tr key={r.product_id} className="border-b hover:bg-gray-50">
                    <td className="py-2 px-3">{r.product_name}</td>
                    <td className="py-2 px-3">{r.barcode}</td>
                    <td className="py-2 px-3 text-center">{r.sold_qty}</td>
                    <td className="py-2 px-3 text-center">{r.returned_qty}</td>
                    <td className={`py-2 px-3 text-center font-semibold ${r.net_qty <= 0 ? 'text-red-600' : 'text-green-600'}`}>{r.net_qty}</td>
                    <td className="py-2 px-3 text-right">{r.revenue.toFixed(2)}</td>
                    <td className="py-2 px-3 text-center">
                      {r.stock != null ? (
                        <span className={r.stock <= lowStockThreshold ? 'text-red-600 font-bold' : ''}>{r.stock}</span>
                      ) : '-'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
