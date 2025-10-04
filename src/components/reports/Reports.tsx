import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { ResponsiveContainer, LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend } from 'recharts';
import { FiAlertTriangle, FiPrinter } from 'react-icons/fi';

// --- Interfaces ---
interface ReportSummary {
    transaction_count: number;
    total_revenue: number;
    total_items_sold: number;
    gross_profit: number;
}
interface SalesOverTime {
    date: string;
    daily_revenue: number;
}
interface ProductPerformance {
    name: string;
    total_quantity: number;
}
interface SalesByCategory {
    category: string;
    total_revenue: number;
}
interface ReportData {
    summary: ReportSummary;
    salesOverTime: SalesOverTime[];
    topProducts: ProductPerformance[];
    worstProducts: ProductPerformance[];
    salesByCategory: SalesByCategory[];
}
interface SmartLowStockItem {
    id: number;
    name: string;
    stock: number;
    min_stock: number;
    shortage: number;
    supplier_name: string | null;
    sales_velocity_30d: number;
    days_of_stock_left: string | number;
    recommended_reorder_qty: number;
}

const API_URL = 'http://localhost:3001/api';

// --- Main Component ---
function Reports() {
    const { t } = useTranslation();
    const [startDate, setStartDate] = useState(new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0]);
    const [endDate, setEndDate] = useState(new Date().toISOString().split('T')[0]);
    const [loading, setLoading] = useState(false);
    
    const [activeTab, setActiveTab] = useState('summary');
    
    const [reportData, setReportData] = useState<ReportData | null>(null);
    const [lowStockData, setLowStockData] = useState<SmartLowStockItem[] | null>(null);

    const fetchFinancialReport = async () => {
        setLoading(true);
        setReportData(null);
        try {
            const response = await fetch(`${API_URL}/reports/summary?startDate=${startDate}&endDate=${endDate}`);
            if (!response.ok) throw new Error('Failed to fetch summary report');
            const data: ReportData = await response.json();
            setReportData(data);
        } catch (error) {
            console.error("Failed to generate report:", error);
            alert('Failed to generate summary report.');
        } finally {
            setLoading(false);
        }
    };

    const fetchLowStockReport = async () => {
        setLoading(true);
        setLowStockData(null);
        try {
            const response = await fetch(`${API_URL}/reports/low-stock`);
            if (!response.ok) throw new Error('Failed to fetch low stock report');
            const data: SmartLowStockItem[] = await response.json();
            setLowStockData(data);
        } catch (error) {
            console.error("Failed to generate low stock report:", error);
            alert('Failed to generate low stock report.');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (activeTab === 'summary') {
            fetchFinancialReport();
        } else if (activeTab === 'lowStock') {
            fetchLowStockReport();
        }
    }, [startDate, endDate, activeTab]);

    const setDateRange = (period: 'today' | 'week' | 'month') => {
        const today = new Date();
        let start = new Date();
        if (period === 'today') { /* start is already today */ } 
        else if (period === 'week') { start.setDate(today.getDate() - today.getDay()); }
        else if (period === 'month') { start = new Date(today.getFullYear(), today.getMonth(), 1); }
        setStartDate(start.toISOString().split('T')[0]);
        setEndDate(today.toISOString().split('T')[0]);
    };

    return (
        <div className="p-6 bg-gray-50 dark:bg-slate-900 min-h-screen">
            <div className="flex justify-between items-center mb-6 no-print">
                <h2 className="text-3xl font-bold text-slate-800 dark:text-slate-200">{t('reports.title', 'Reports')}</h2>
                <button
                    onClick={() => window.print()}
                    className="bg-gray-500 hover:bg-gray-600 text-white font-bold py-2 px-4 rounded-lg flex items-center gap-2 transition-colors"
                >
                    <FiPrinter />
                    <span>{t('reports.printReport', 'Print Report')}</span>
                </button>
            </div>

            <div className="flex border-b border-slate-200 dark:border-slate-700 mb-6 no-print">
                <button onClick={() => setActiveTab('summary')} className={`py-2 px-4 ${activeTab === 'summary' ? 'border-b-2 border-blue-500 text-blue-600 dark:text-blue-400 font-semibold' : 'text-slate-500 dark:text-slate-400'}`}>{t('reports.salesAndProfit', 'Sales & Profit')}</button>
                <button onClick={() => setActiveTab('lowStock')} className={`py-2 px-4 ${activeTab === 'lowStock' ? 'border-b-2 border-blue-500 text-blue-600 dark:text-blue-400 font-semibold' : 'text-slate-500 dark:text-slate-400'}`}>{t('reports.smartLowStock', 'Smart Low Stock')}</button>
            </div>

            <div className="printable-area">
                {activeTab === 'summary' && (
                    <div>
                        <div className="bg-white dark:bg-slate-800 p-4 rounded-xl shadow-lg mb-8 no-print">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <label className="text-sm font-medium text-slate-600 dark:text-slate-400">{t('reports.dateRange', 'Date Range')}</label>
                                    <div className="flex items-center mt-1">
                                        <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} className="p-2 border rounded-md dark:bg-slate-700 dark:border-slate-600" />
                                        <span className="mx-2 text-slate-500">{t('reports.to', 'to')}</span>
                                        <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} className="p-2 border rounded-md dark:bg-slate-700 dark:border-slate-600" />
                                    </div>
                                </div>
                                <div>
                                    <label className="text-sm font-medium text-slate-600 dark:text-slate-400">{t('reports.quickFilters', 'Quick Filters')}</label>
                                    <div className="flex space-x-2 mt-1">
                                        <button onClick={() => setDateRange('today')} className="px-3 py-2 text-sm bg-gray-100 dark:bg-slate-700 rounded-md hover:bg-gray-200 dark:hover:bg-slate-600">{t('reports.today', 'Today')}</button>
                                        <button onClick={() => setDateRange('week')} className="px-3 py-2 text-sm bg-gray-100 dark:bg-slate-700 rounded-md hover:bg-gray-200 dark:hover:bg-slate-600">{t('reports.thisWeek', 'This Week')}</button>
                                        <button onClick={() => setDateRange('month')} className="px-3 py-2 text-sm bg-gray-100 dark:bg-slate-700 rounded-md hover:bg-gray-200 dark:hover:bg-slate-600">{t('reports.thisMonth', 'This Month')}</button>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {loading && <p className="text-center p-10 text-slate-500">{t('reports.loadingFinancial', 'Loading financial report...')}</p>}
                        {!loading && reportData && (
                            <div className="space-y-8">
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                                    <SummaryCard title={t('reports.totalRevenue', 'Total Revenue')} value={reportData.summary.total_revenue} format="currency" color="blue" />
                                    <SummaryCard title={t('reports.grossProfit', 'Gross Profit')} value={reportData.summary.gross_profit} format="currency" color="green" />
                                    <SummaryCard title={t('reports.numberOfSales', 'Number of Sales')} value={reportData.summary.transaction_count} format="number" color="purple" />
                                    <SummaryCard title={t('reports.itemsSold', 'Items Sold')} value={reportData.summary.total_items_sold} format="number" color="yellow" />
                                </div>

                                <div className="grid grid-cols-1 lg:grid-cols-5 gap-8">
                                    <div className="lg:col-span-3 bg-white dark:bg-slate-800 p-6 rounded-xl shadow-lg">
                                        <h3 className="text-xl font-semibold mb-4 text-slate-800 dark:text-slate-200">{t('reports.revenueOverTime', 'Revenue Over Time')}</h3>
                                        <ResponsiveContainer width="100%" height={300}><LineChart data={reportData.salesOverTime}><CartesianGrid strokeDasharray="3 3" strokeOpacity={0.2} /><XAxis dataKey="date" tickFormatter={(str) => new Date(str).toLocaleDateString()} /><YAxis /><Tooltip formatter={(value: number) => `${value.toFixed(2)} EGP`} /><Legend /><Line type="monotone" dataKey="daily_revenue" name={t('reports.dailyRevenue', 'Daily Revenue')} stroke="#3b82f6" strokeWidth={2} /></LineChart></ResponsiveContainer>
                                    </div>
                                    <div className="lg:col-span-2 bg-white dark:bg-slate-800 p-6 rounded-xl shadow-lg">
                                        <h3 className="text-xl font-semibold mb-4 text-slate-800 dark:text-slate-200">{t('reports.salesByCategory', 'Sales by Category')}</h3>
                                        <ResponsiveContainer width="100%" height={300}>
                                            <BarChart data={reportData.salesByCategory} layout="vertical" margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                                                <CartesianGrid strokeDasharray="3 3" strokeOpacity={0.2} />
                                                <XAxis type="number" />
                                                <YAxis type="category" dataKey="category" width={80} tick={{ fontSize: 12 }} />
                                                <Tooltip formatter={(value: number) => `${value.toFixed(2)} EGP`} />
                                                <Bar dataKey="total_revenue" name={t('reports.revenue', 'Revenue')} fill="#8884d8" />
                                            </BarChart>
                                        </ResponsiveContainer>
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                                    <div className="bg-white dark:bg-slate-800 p-6 rounded-xl shadow-lg">
                                        <h3 className="text-xl font-semibold mb-4 text-green-600 dark:text-green-400">{t('reports.top5Selling', 'Top 5 Selling Products')}</h3>
                                        <div className="space-y-4">{reportData.topProducts.map((p, i) => <div key={`top-${i}`} className="flex justify-between items-center"><span className="text-slate-600 dark:text-slate-300">{p.name}</span><span className="font-bold bg-gray-100 dark:bg-slate-700 px-2 py-1 rounded-md text-sm">{p.total_quantity} {t('reports.units', 'units')}</span></div>)}</div>
                                    </div>
                                    <div className="bg-white dark:bg-slate-800 p-6 rounded-xl shadow-lg">
                                        <h3 className="text-xl font-semibold mb-4 text-red-500 dark:text-red-400">{t('reports.worst5Selling', 'Worst 5 Selling Products')}</h3>
                                        <div className="space-y-4">{reportData.worstProducts.map((p, i) => <div key={`worst-${i}`} className="flex justify-between items-center"><span className="text-slate-600 dark:text-slate-300">{p.name}</span><span className="font-bold bg-gray-100 dark:bg-slate-700 px-2 py-1 rounded-md text-sm">{p.total_quantity} {t('reports.units', 'units')}</span></div>)}</div>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                )}
                
                {activeTab === 'lowStock' && (
                    <div className="bg-white dark:bg-slate-800 p-6 rounded-xl shadow-lg">
                        <h3 className="text-2xl font-bold mb-4 text-slate-800 dark:text-slate-200">
                            <FiAlertTriangle className="inline-block mr-2 text-yellow-500" />
                            {t('reports.lowStockTitle', 'Smart Low Stock Report')}
                        </h3>
                        {loading && <p className="text-center p-10 text-slate-500">{t('reports.analyzingData', 'Analyzing inventory and sales data...')}</p>}
                        {!loading && lowStockData && (
                            <div className="overflow-x-auto">
                                <table className="min-w-full text-sm">
                                    <thead className="bg-gray-100 dark:bg-slate-700">
                                        <tr>
                                            <th className="py-3 px-4 text-left">{t('reports.product', 'Product')}</th>
                                            <th className="py-3 px-4 text-center">{t('reports.stockCurrentMin', 'Stock (Current / Min)')}</th>
                                            <th className="py-3 px-4 text-center">{t('reports.shortage', 'Shortage')}</th>
                                            <th className="py-3 px-4 text-center">{t('reports.salesLast30d', 'Sales (Last 30d)')}</th>
                                            <th className="py-3 px-4 text-center">{t('reports.estDaysLeft', 'Est. Days Left')}</th>
                                            <th className="py-3 px-4 text-center text-blue-600 dark:text-blue-400">{t('reports.recommendedReorder', 'Recommended Reorder')}</th>
                                            <th className="py-3 px-4 text-left">{t('reports.supplier', 'Supplier')}</th>
                                        </tr>
                                    </thead>
                                    <tbody className="text-slate-700 dark:text-slate-400">
                                        {lowStockData.map(item => (
                                            <tr key={item.id} className="hover:bg-gray-50 dark:hover:bg-slate-700/50 border-b dark:border-slate-700">
                                                <td className="py-3 px-4 font-semibold">{item.name}</td>
                                                <td className="py-3 px-4 text-center font-mono"><span className="font-bold text-red-500">{item.stock}</span> / {item.min_stock}</td>
                                                <td className="py-3 px-4 text-center font-mono font-bold text-orange-500">{item.shortage}</td>
                                                <td className="py-3 px-4 text-center font-mono">{item.sales_velocity_30d}</td>
                                                <td className="py-3 px-4 text-center font-mono">{item.days_of_stock_left}</td>
                                                <td className="py-3 px-4 text-center font-mono font-bold text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/50">{item.recommended_reorder_qty}</td>
                                                <td className="py-3 px-4">{item.supplier_name || 'N/A'}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
                        {!loading && (!lowStockData || lowStockData.length === 0) && <p className="text-center p-10 text-slate-500">{t('reports.noLowStock', 'Great! No products are currently below their minimum stock level.')}</p>}
                    </div>
                )}
            </div>
        </div>
    );
}

// --- Helper Components ---
const SummaryCard = ({ title, value, format = 'currency', color = 'gray' }: { title: string, value: number, format: 'currency' | 'number', color: string }) => {
    const { t } = useTranslation(); // Helper component also needs access to t
    const colorClasses = {
        blue: 'text-blue-600 dark:text-blue-400',
        green: 'text-green-600 dark:text-green-400',
        purple: 'text-purple-600 dark:text-purple-400',
        yellow: 'text-yellow-600 dark:text-yellow-400',
    }[color] || 'text-gray-600 dark:text-gray-400';
    return <div className="bg-white dark:bg-slate-800 p-5 rounded-xl shadow-lg"><h3 className="text-slate-500 dark:text-slate-400 text-sm font-medium">{t(title, title)}</h3><p className={`text-3xl font-bold mt-1 ${colorClasses}`}>{format === 'currency' ? (value || 0).toFixed(2) + ' EGP' : (value || 0)}</p></div>;
};

export default Reports;