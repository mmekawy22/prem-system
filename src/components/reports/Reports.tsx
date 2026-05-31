import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { 
    ResponsiveContainer, BarChart, Bar, XAxis, YAxis, 
    CartesianGrid, Tooltip, Legend, Cell 
} from 'recharts';
import { 
    FiAlertTriangle, FiPrinter, FiTrendingUp, FiPackage, 
    FiShoppingCart, FiUsers, FiDollarSign, FiCalendar, FiArrowDown, FiArrowUp 
} from 'react-icons/fi';
import { fetchPurchases, getProductsAPI } from '../../services/api';
import type { Purchase, Product } from '../../types';

const Reports: React.FC = () => {
    const { t } = useTranslation();
    
    // States
    const [purchases, setPurchases] = useState<Purchase[]>([]);
    const [products, setProducts] = useState<Product[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [dateRange, setDateRange] = useState({ start: '', end: '' });
    const [activeTab, setActiveTab] = useState<'overview' | 'inventory' | 'staff' | 'products'>('overview');

    useEffect(() => {
        const loadData = async () => {
            try {
                setIsLoading(true);
                const [purchasesData, productsData] = await Promise.all([
                    fetchPurchases(),
                    getProductsAPI()
                ]);
                setPurchases(Array.isArray(purchasesData) ? purchasesData : []);
                setProducts(Array.isArray(productsData) ? productsData : []);
            } catch (error) {
                console.error("Error loading reports:", error);
            } finally {
                setIsLoading(false);
            }
        };
        loadData();
    }, []);

    // --- العمليات الحسابية (مع حماية كاملة من NaN) ---

    // 1. فلترة البيانات حسب التاريخ
    const filteredPurchases = purchases.filter(p => {
        if (!dateRange.start || !dateRange.end) return true;
        const pDate = new Date(p.created_at).toISOString().split('T')[0];
        return pDate >= dateRange.start && pDate <= dateRange.end;
    });

    // 2. إجمالي المشتريات (المنصرف)
    const totalSpent = filteredPurchases.reduce((acc, curr) => {
        const val = Number(curr.total_amount);
        return acc + (isNaN(val) ? 0 : val);
    }, 0);
    
    // 3. تحليل المخزون والأرباح المتوقعة
    const inventoryStats = products.reduce((acc, p) => {
        const stock = Number(p.stock) || 0;
        const cost = Number(p.cost_price) || 0;
        const price = Number(p.price) || 0;
        
        acc.totalCost += (stock * cost);
        acc.expectedProfit += (stock * (price - cost));
        return acc;
    }, { totalCost: 0, expectedProfit: 0 });

    // 4. تحليل أداء الأصناف (الربحية)
    const productPerformance = products.map(p => {
        const cost = Number(p.cost_price) || 0;
        const price = Number(p.price) || 0;
        return {
            name: p.name || 'غير معروف',
            profitPerUnit: price - cost,
            stock: Number(p.stock) || 0
        };
    });

    const topProfitable = [...productPerformance].sort((a, b) => b.profitPerUnit - a.profitPerUnit);
    const lowProfitable = [...productPerformance].sort((a, b) => a.profitPerUnit - b.profitPerUnit);

    // 5. تحليل أداء الموظفين (بناءً على فواتير المشتريات المُدخلة)
    const staffDataMap = filteredPurchases.reduce((acc: any, curr) => {
        const user = curr.user_name || "موظف غير معروف";
        const amount = Number(curr.total_amount) || 0;
        if (!acc[user]) acc[user] = { name: user, total: 0, count: 0 };
        acc[user].total += amount;
        acc[user].count += 1;
        return acc;
    }, {});

    const staffChartData = Object.values(staffDataMap);

    if (isLoading) return (
        <div className="flex h-screen items-center justify-center dark:bg-slate-900">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
        </div>
    );

    return (
        <div className="p-6 bg-slate-50 dark:bg-slate-900 min-h-screen text-right font-sans" dir="rtl">
            
            {/* Header & Filter Area */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4 no-print">
                <div>
                    <h1 className="text-3xl font-black text-slate-800 dark:text-white">التقارير التحليلية</h1>
                    <p className="text-slate-500 dark:text-slate-400">ملخص الأرباح، أداء الموظفين، ونواقص المخزن</p>
                </div>
                
                <div className="flex flex-wrap gap-3 bg-white dark:bg-slate-800 p-3 rounded-2xl shadow-sm border dark:border-slate-700">
                    <div className="flex items-center gap-2">
                        <span className="text-xs font-bold dark:text-slate-300">من:</span>
                        <input type="date" className="border rounded-lg px-2 py-1 text-sm dark:bg-slate-700 dark:text-white outline-none focus:ring-2 focus:ring-blue-500" 
                               onChange={(e) => setDateRange({...dateRange, start: e.target.value})} />
                    </div>
                    <div className="flex items-center gap-2">
                        <span className="text-xs font-bold dark:text-slate-300">إلى:</span>
                        <input type="date" className="border rounded-lg px-2 py-1 text-sm dark:bg-slate-700 dark:text-white outline-none focus:ring-2 focus:ring-blue-500" 
                               onChange={(e) => setDateRange({...dateRange, end: e.target.value})} />
                    </div>
                    <button onClick={() => window.print()} className="bg-blue-600 text-white px-5 py-2 rounded-xl text-sm font-bold flex items-center gap-2 hover:bg-blue-700 transition-all">
                        <FiPrinter /> طباعة
                    </button>
                </div>
            </div>

            {/* Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                <SummaryCard title="مشتريات الفترة" value={totalSpent} icon={<FiShoppingCart/>} color="blue" suffix="EGP" />
                <SummaryCard title="أرباح المخزن المتوقعة" value={inventoryStats.expectedProfit} icon={<FiTrendingUp/>} color="emerald" suffix="EGP" />
                <SummaryCard title="قيمة المخزون (تكلفة)" value={inventoryStats.totalCost} icon={<FiPackage/>} color="purple" suffix="EGP" />
                <SummaryCard title="إجمالي العمليات" value={filteredPurchases.length} icon={<FiCalendar/>} color="amber" />
            </div>

            {/* Tabs */}
            <div className="flex gap-2 mb-8 bg-white dark:bg-slate-800 p-1.5 rounded-2xl shadow-sm w-fit no-print">
                <TabBtn active={activeTab === 'overview'} onClick={() => setActiveTab('overview')} label="نظرة عامة" />
                <TabBtn active={activeTab === 'products'} onClick={() => setActiveTab('products')} label="تحليل الأداء" />
                <TabBtn active={activeTab === 'staff'} onClick={() => setActiveTab('staff')} label="أداء الموظفين" />
                <TabBtn active={activeTab === 'inventory'} onClick={() => setActiveTab('inventory')} label="النواقص" />
            </div>

            {/* Tab Views */}
            <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                {activeTab === 'overview' && (
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                        <div className="lg:col-span-2 bg-white dark:bg-slate-800 p-6 rounded-3xl shadow-sm border dark:border-slate-700">
                            <h3 className="font-bold text-lg mb-6 dark:text-white">إحصائيات مشتريات الموظفين</h3>
                            <div className="h-[350px]">
                                <ResponsiveContainer width="100%" height="100%">
                                    <BarChart data={staffChartData}>
                                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                                        <XAxis dataKey="name" axisLine={false} tickLine={false} />
                                        <YAxis axisLine={false} tickLine={false} />
                                        <Tooltip cursor={{fill: '#f1f5f9'}} contentStyle={{borderRadius: '12px'}} />
                                        <Bar dataKey="total" fill="#3b82f6" radius={[8, 8, 0, 0]} />
                                    </BarChart>
                                </ResponsiveContainer>
                            </div>
                        </div>
                        <div className="bg-white dark:bg-slate-800 p-6 rounded-3xl shadow-sm border dark:border-slate-700">
                            <h3 className="font-bold text-lg mb-4 dark:text-white">آخر فواتير المشتريات</h3>
                            <div className="space-y-4">
                                {filteredPurchases.slice(0, 7).map(p => (
                                    <div key={p.id} className="flex justify-between items-center p-3 hover:bg-slate-50 dark:hover:bg-slate-700/50 rounded-xl transition-all border-r-4 border-blue-500">
                                        <div>
                                            <p className="font-bold text-sm dark:text-white">#{p.id} - {p.supplier_name || 'مورد عام'}</p>
                                            <p className="text-xs text-slate-400">{p.user_name}</p>
                                        </div>
                                        <span className="font-bold text-blue-600">{Number(p.total_amount).toFixed(2)}</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                )}

                {activeTab === 'products' && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                        <div className="bg-white dark:bg-slate-800 p-6 rounded-3xl border dark:border-slate-700 shadow-sm">
                            <h3 className="font-bold mb-6 flex items-center gap-2 text-emerald-600">
                                <FiArrowUp /> الأصناف الأكثر ربحية (للقطعة)
                            </h3>
                            <div className="space-y-3">
                                {topProfitable.slice(0, 10).map((p, i) => (
                                    <div key={i} className="flex justify-between items-center p-3 rounded-2xl bg-slate-50 dark:bg-slate-700/30">
                                        <span className="text-sm font-bold dark:text-slate-200">{p.name}</span>
                                        <span className="font-black text-emerald-500">+{p.profitPerUnit.toFixed(2)}</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                        <div className="bg-white dark:bg-slate-800 p-6 rounded-3xl border dark:border-slate-700 shadow-sm">
                            <h3 className="font-bold mb-6 flex items-center gap-2 text-red-500">
                                <FiArrowDown /> الأصناف الأقل ربحية (للقطعة)
                            </h3>
                            <div className="space-y-3">
                                {lowProfitable.slice(0, 10).map((p, i) => (
                                    <div key={i} className="flex justify-between items-center p-3 rounded-2xl bg-slate-50 dark:bg-slate-700/30">
                                        <span className="text-sm font-bold dark:text-slate-200">{p.name}</span>
                                        <span className="font-black text-red-400">{p.profitPerUnit.toFixed(2)}</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                )}

                {activeTab === 'staff' && (
                    <div className="bg-white dark:bg-slate-800 p-8 rounded-3xl shadow-sm border dark:border-slate-700">
                        <h3 className="font-black text-xl mb-8 dark:text-white flex items-center gap-2">
                            <FiUsers className="text-purple-500"/> تقرير إنتاجية الموظفين خلال الفترة
                        </h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                            {staffChartData.map((staff: any, i) => (
                                <div key={i} className="p-6 rounded-2xl bg-gradient-to-br from-slate-50 to-white dark:from-slate-700 dark:to-slate-800 border dark:border-slate-600 shadow-sm">
                                    <p className="text-slate-400 text-xs mb-1 font-bold">اسم الموظف</p>
                                    <p className="text-lg font-black dark:text-white mb-4">{staff.name}</p>
                                    <div className="pt-4 border-t dark:border-slate-600">
                                        <p className="text-blue-600 text-xl font-black">{staff.total.toLocaleString()} <span className="text-xs">EGP</span></p>
                                        <p className="text-slate-400 text-xs mt-1">بإجمالي {staff.count} عملية</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {activeTab === 'inventory' && (
                    <div className="bg-white dark:bg-slate-800 p-6 rounded-3xl shadow-sm border dark:border-slate-700 overflow-hidden">
                        <h3 className="font-bold text-lg mb-6 text-red-500 flex items-center gap-2">
                            <FiAlertTriangle /> قائمة النواقص المُلحة
                        </h3>
                        <div className="overflow-x-auto">
                            <table className="w-full">
                                <thead>
                                    <tr className="text-slate-400 text-sm border-b dark:border-slate-700">
                                        <th className="pb-4 text-right pr-4">الصنف</th>
                                        <th className="pb-4 text-center">المخزون الحالي</th>
                                        <th className="pb-4 text-center">الحد الأدنى</th>
                                        <th className="pb-4 text-left pl-4">الحالة</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y dark:divide-slate-700">
                                    {products.filter(p => (Number(p.stock) || 0) <= (Number(p.min_stock) || 5)).map(p => (
                                        <tr key={p.id} className="hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-all">
                                            <td className="py-4 pr-4 dark:text-white font-medium">{p.name}</td>
                                            <td className="py-4 text-center font-bold text-red-500">{p.stock}</td>
                                            <td className="py-4 text-center dark:text-slate-400">{p.min_stock || 5}</td>
                                            <td className="py-4 pl-4 text-left">
                                                <span className="bg-red-100 text-red-600 text-[10px] px-3 py-1 rounded-full font-bold">يجب الشراء</span>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

// --- المكونات المساعدة ---

const SummaryCard = ({ title, value, icon, color, suffix = "" }: any) => {
    const colors: any = {
        blue: "border-blue-500 bg-blue-50/20 text-blue-600",
        emerald: "border-emerald-500 bg-emerald-50/20 text-emerald-600",
        purple: "border-purple-500 bg-purple-50/20 text-purple-600",
        amber: "border-amber-500 bg-amber-50/20 text-amber-600",
    };

    return (
        <div className={`bg-white dark:bg-slate-800 p-6 rounded-3xl shadow-sm border-b-4 ${colors[color]} transition-all hover:translate-y--1`}>
            <div className="flex justify-between items-center">
                <div className="text-left">
                    <p className="text-slate-500 dark:text-slate-400 text-xs font-bold mb-1">{title}</p>
                    <h4 className="text-2xl font-black dark:text-white">
                        {Number(value).toLocaleString()} <span className="text-xs font-normal">{suffix}</span>
                    </h4>
                </div>
                <div className="p-3 rounded-2xl bg-white dark:bg-slate-700 shadow-sm text-2xl">
                    {icon}
                </div>
            </div>
        </div>
    );
};

const TabBtn = ({ active, onClick, label }: any) => (
    <button 
        onClick={onClick}
        className={`py-2 px-6 rounded-xl text-sm font-black transition-all ${
            active 
            ? 'bg-blue-600 text-white shadow-md' 
            : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-200'
        }`}
    >
        {label}
    </button>
);

export default Reports;