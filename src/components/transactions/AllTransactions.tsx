import React, { useState, useEffect, useMemo } from 'react';
import { useTranslation } from 'react-i18next';

// --- Interfaces & Constants ---
interface TransactionItem {
    type: 'sale' | 'return' | 'purchase' | 'expense';
    id: number;
    amount: number;
    date: string;
    description: string;
    party: string | null;
}
const API_URL = 'http://192.168.1.20:3001/api';

// --- Helper Functions ---
const formatType = (type: string) => type.charAt(0).toUpperCase() + type.slice(1);

const formatDateGroup = (dateStr: string) => {
    const date = new Date(dateStr);
    const today = new Date();
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);

    if (date.toDateString() === today.toDateString()) return 'Today';
    if (date.toDateString() === yesterday.toDateString()) return 'Yesterday';
    return date.toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' });
};

// --- Component ---
function AllTransactions() {
    const { t } = useTranslation();
    
    // --- State Management ---
    const [allItems, setAllItems] = useState<TransactionItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [startDate, setStartDate] = useState(new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0]);
    const [endDate, setEndDate] = useState(new Date().toISOString().split('T')[0]);
    const [typeFilter, setTypeFilter] = useState('all');
    const [searchTerm, setSearchTerm] = useState(''); // ✅ 1. حالة جديدة لمصطلح البحث

    // --- Data Fetching ---
    useEffect(() => {
        const fetchAllTransactions = async () => {
            setLoading(true);
            try {
                const response = await fetch(`${API_URL}/all-transactions`);
                if (!response.ok) throw new Error('Network response was not ok');
                const data: TransactionItem[] = await response.json();
                setAllItems(data);
            } catch (error) {
                console.error("Failed to fetch transactions:", error);
                alert('Failed to load transaction data.');
            } finally {
                setLoading(false);
            }
        };
        fetchAllTransactions();
    }, []);

    // --- Memoized Filtering & Grouping ---
    const groupedItems = useMemo(() => {
        const start = new Date(startDate).getTime();
        const end = new Date(`${endDate}T23:59:59.999Z`).getTime();
        const lowercasedSearch = searchTerm.toLowerCase();

        const filtered = allItems.filter(item => {
            const itemDate = new Date(item.date).getTime();
            // --- Filter Logic ---
            const dateMatch = itemDate >= start && itemDate <= end;
            const typeMatch = typeFilter === 'all' || item.type === typeFilter;
            const searchMatch = searchTerm === '' ||
                item.description.toLowerCase().includes(lowercasedSearch) ||
                (item.party && item.party.toLowerCase().includes(lowercasedSearch));
            
            return dateMatch && typeMatch && searchMatch;
        });

        // ✅ 2. منطق التجميع حسب التاريخ
        return filtered.reduce((acc, item) => {
            const dateKey = item.date.split('T')[0]; // Group by YYYY-MM-DD
            if (!acc[dateKey]) {
                acc[dateKey] = [];
            }
            acc[dateKey].push(item);
            return acc;
        }, {} as Record<string, TransactionItem[]>);

    }, [allItems, startDate, endDate, typeFilter, searchTerm]);

    const summary = useMemo(() => {
        // Flatten the grouped items to calculate summary
        const currentFilteredItems = Object.values(groupedItems).flat();

        const totalSales = currentFilteredItems.filter(i => i.type === 'sale').reduce((sum, item) => sum + item.amount, 0);
        const totalReturns = currentFilteredItems.filter(i => i.type === 'return').reduce((sum, item) => sum + item.amount, 0);
        const totalExpenses = currentFilteredItems.filter(i => i.type === 'expense').reduce((sum, item) => sum + item.amount, 0);
        const netTotal = totalSales + totalReturns + totalExpenses;

        return {
            totalSales,
            totalReturns: Math.abs(totalReturns),
            totalExpenses: Math.abs(totalExpenses),
            netTotal,
        };
    }, [groupedItems]);

    // --- Render Helper ---
    const getTypeStyling = (type: string) => {
        // ... (same as before)
        switch(type) {
            case 'sale': return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200';
            case 'return': return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200';
            case 'purchase': return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200';
            case 'expense': return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200';
            default: return 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200';
        }
    };

    return (
        <div className="p-6 bg-gray-50 dark:bg-slate-900 min-h-screen">
            <h2 className="text-3xl font-bold mb-6 text-slate-800 dark:text-slate-200">{t('transactions.title', 'All Transactions')}</h2>

            {/* --- Summary Cards --- */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                 {/* ... (same as before) */}
                 <div className="bg-white dark:bg-slate-800 p-5 rounded-xl shadow-lg"><h3 className="text-gray-500 dark:text-gray-400">Total Sales</h3><p className="text-2xl font-bold text-green-600">{summary.totalSales.toFixed(2)} EGP</p></div>
                 <div className="bg-white dark:bg-slate-800 p-5 rounded-xl shadow-lg"><h3 className="text-gray-500 dark:text-gray-400">Total Returns</h3><p className="text-2xl font-bold text-yellow-600">{summary.totalReturns.toFixed(2)} EGP</p></div>
                 <div className="bg-white dark:bg-slate-800 p-5 rounded-xl shadow-lg"><h3 className="text-gray-500 dark:text-gray-400">Total Expenses</h3><p className="text-2xl font-bold text-red-600">{summary.totalExpenses.toFixed(2)} EGP</p></div>
                 <div className="bg-white dark:bg-slate-800 p-5 rounded-xl shadow-lg"><h3 className="text-gray-500 dark:text-gray-400">Net Total</h3><p className={`text-2xl font-bold ${summary.netTotal >= 0 ? 'text-blue-600' : 'text-red-600'}`}>{summary.netTotal.toFixed(2)} EGP</p></div>
            </div>

            {/* --- Filter Controls --- */}
            <div className="bg-white dark:bg-slate-800 p-4 rounded-xl shadow-lg mb-6 grid grid-cols-1 md:grid-cols-4 gap-4">
                {/* ✅ 3. إضافة مربع البحث */}
                <input 
                    type="text"
                    value={searchTerm}
                    onChange={e => setSearchTerm(e.target.value)}
                    placeholder="Search by description or party..."
                    className="p-2 border rounded md:col-span-1 dark:bg-slate-700 dark:text-slate-300 dark:border-slate-600"
                />
                <select value={typeFilter} onChange={e => setTypeFilter(e.target.value)} className="p-2 border rounded dark:bg-slate-700 dark:text-slate-300 dark:border-slate-600">
                    <option value="all">All Types</option>
                    <option value="sale">Sale</option>
                    <option value="purchase">Purchase</option>
                    <option value="return">Return</option>
                    <option value="expense">Expense</option>
                </select>
                <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} className="p-2 border rounded dark:bg-slate-700 dark:text-slate-300 dark:border-slate-600" />
                <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} className="p-2 border rounded dark:bg-slate-700 dark:text-slate-300 dark:border-slate-600" />
            </div>

            {/* --- Transactions Table --- */}
            <div className="bg-white dark:bg-slate-800 rounded-xl shadow-lg overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="min-w-full text-sm">
                        <thead className="bg-gray-100 dark:bg-slate-700">
                            <tr>
                                <th className="py-3 px-4 border-b dark:border-slate-600 text-left text-slate-600 dark:text-slate-300">Date</th>
                                <th className="py-3 px-4 border-b dark:border-slate-600 text-left text-slate-600 dark:text-slate-300">Type</th>
                                <th className="py-3 px-4 border-b dark:border-slate-600 text-left text-slate-600 dark:text-slate-300">Details</th>
                                <th className="py-3 px-4 border-b dark:border-slate-600 text-right text-slate-600 dark:text-slate-300">Amount</th>
                            </tr>
                        </thead>
                        {/* ✅ 4. تعديل طريقة عرض الجدول ليدعم التجميع */}
                        <tbody>
                            {loading ? (
                                <tr><td colSpan={4} className="text-center p-6">Loading...</td></tr>
                            ) : Object.keys(groupedItems).length > 0 ? (
                                Object.keys(groupedItems).map(dateKey => (
                                    <React.Fragment key={dateKey}>
                                        <tr className="bg-gray-50 dark:bg-slate-700/50">
                                            <td colSpan={4} className="py-2 px-4 font-bold text-slate-600 dark:text-slate-300">
                                                {formatDateGroup(dateKey)}
                                            </td>
                                        </tr>
                                        {groupedItems[dateKey].map(item => (
                                            <tr key={`${item.type}-${item.id}`} className="hover:bg-gray-50 dark:hover:bg-slate-700/30">
                                                <td className="py-3 px-4 border-t border-b dark:border-slate-600">{new Date(item.date).toLocaleTimeString()}</td>
                                                <td className="py-3 px-4 border-t border-b dark:border-slate-600">
                                                    <span className={`px-2 py-1 text-xs font-semibold rounded-full ${getTypeStyling(item.type)}`}>
                                                        {formatType(item.type)}
                                                    </span>
                                                </td>
                                                <td className="py-3 px-4 border-t border-b dark:border-slate-600">
                                                    {item.description}
                                                    {item.party && <span className="text-xs text-gray-500 dark:text-gray-400 block">({item.party})</span>}
                                                </td>
                                                <td className={`py-3 px-4 border-t border-b dark:border-slate-600 text-right font-mono font-semibold ${item.amount > 0 ? 'text-green-600' : 'text-red-500'}`}>
                                                    {item.amount.toFixed(2)} EGP
                                                </td>
                                            </tr>
                                        ))}
                                    </React.Fragment>
                                ))
                            ) : (
                                <tr><td colSpan={4} className="text-center p-6">No transactions found for the selected criteria.</td></tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}

export default AllTransactions;