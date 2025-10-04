import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../context/UserContext';
import { FiEdit, FiTrash2 } from 'react-icons/fi';

// ✅ 1. تعريف واجهة البيانات التي تأتي من الخادم
interface Expense {
    id: number;
    description: string;
    amount: number;
    category: string;
    expense_date: string; // The backend will send this as a string
    user_id: number;
    username: string; // We get this from the JOIN query in the backend
}

// ✅ 2. تعريف الرابط الأساسي للـ API
const API_URL = 'http://localhost:3001/api';

function Expenses() {
    const { t } = useTranslation();
    const { user } = useAuth();
    
    const [expenses, setExpenses] = useState<Expense[]>([]);
    const [newExpense, setNewExpense] = useState({
        amount: '',
        category: '',
        description: '',
        expense_date: new Date().toISOString().split('T')[0]
    });
    const [loading, setLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingExpense, setEditingExpense] = useState<Expense | null>(null);

    // ✅ 3. تعديل دالة جلب البيانات لتستخدم الـ API
    const fetchExpenses = async () => {
        setLoading(true);
        try {
            const response = await fetch(`${API_URL}/expenses`);
            if (!response.ok) throw new Error('Network response was not ok');
            const data: Expense[] = await response.json();
            setExpenses(data);
        } catch (error) {
            console.error("Failed to fetch expenses:", error);
            alert(t('expenses.fetchError', 'Failed to load expenses.'));
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchExpenses();
    }, []);

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        const { name, value } = e.target;
        if (isModalOpen && editingExpense) {
            setEditingExpense({ ...editingExpense, [name]: value });
        } else {
            setNewExpense(prev => ({ ...prev, [name]: value }));
        }
    };

    // ✅ 4. تعديل دالة الإضافة لتستخدم الـ API
    const handleAddExpense = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newExpense.category || !newExpense.amount || Number(newExpense.amount) <= 0 || !user) {
            alert(t('expenses.validationError', 'Category and a valid amount are required.'));
            return;
        }
        try {
            const response = await fetch(`${API_URL}/expenses`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    ...newExpense,
                    amount: Number(newExpense.amount),
                    user_id: user.id,
                }),
            });
            if (!response.ok) throw new Error('Failed to add expense');
            
            alert(t('expenses.addSuccess', 'Expense added successfully!'));
            setNewExpense({ amount: '', category: '', description: '', expense_date: new Date().toISOString().split('T')[0] });
            fetchExpenses(); // Refresh list
        } catch (error) {
            console.error("Failed to add expense:", error);
            alert(t('expenses.addError', 'Failed to add expense.'));
        }
    };
    
    // ✅ 5. تعديل دالة الحذف لتستخدم الـ API
    const handleDeleteExpense = async (id: number) => {
        if (window.confirm(t('expenses.confirmDelete', 'Are you sure you want to delete this expense?'))) {
            try {
                const response = await fetch(`${API_URL}/expenses/${id}`, { method: 'DELETE' });
                if (!response.ok) throw new Error('Failed to delete expense');

                alert(t('expenses.deleteSuccess', 'Expense deleted successfully!'));
                fetchExpenses(); // Refresh list
            } catch (error) {
                console.error("Failed to delete expense:", error);
                alert(t('expenses.deleteError', 'Failed to delete expense.'));
            }
        }
    };

    const handleEditClick = (expense: Expense) => {
        setEditingExpense({
            ...expense,
            // Ensure date is in YYYY-MM-DD format for the input field
            expense_date: new Date(expense.expense_date).toISOString().split('T')[0]
        });
        setIsModalOpen(true);
    };

    const handleModalClose = () => {
        setIsModalOpen(false);
        setEditingExpense(null);
    };

    // ✅ 6. تعديل دالة التحديث لتستخدم الـ API
    const handleUpdateExpense = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!editingExpense || !editingExpense.id) return;
        try {
            const response = await fetch(`${API_URL}/expenses/${editingExpense.id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    ...editingExpense,
                    amount: Number(editingExpense.amount)
                }),
            });
            if (!response.ok) throw new Error('Failed to update expense');
            
            alert(t('expenses.updateSuccess', 'Expense updated successfully!'));
            handleModalClose();
            fetchExpenses(); // Refresh list
        } catch (error) {
            console.error("Failed to update expense:", error);
            alert(t('expenses.updateError', 'Failed to update expense.'));
        }
    };

    return (
        <div className="p-6 bg-gray-50 dark:bg-slate-900 min-h-screen">
            <h2 className="text-3xl font-bold mb-6 text-slate-800 dark:text-slate-200">{t('expenses.title', 'Expense Management')}</h2>

            <div className="bg-white dark:bg-slate-800 p-6 rounded-xl shadow-lg mb-8">
                <h3 className="text-xl font-semibold mb-4 text-slate-700 dark:text-slate-300">{t('expenses.addNew', 'Add New Expense')}</h3>
                <form onSubmit={handleAddExpense} className="grid grid-cols-1 md:grid-cols-5 gap-4 items-end">
                    <input type="date" name="expense_date" value={newExpense.expense_date} onChange={handleInputChange} className="p-2 border rounded bg-gray-50 dark:bg-slate-700 dark:text-slate-300 dark:border-slate-600" required />
                    <input type="text" name="category" value={newExpense.category} onChange={handleInputChange} placeholder={t('expenses.category', 'Category (e.g., Rent)')} className="p-2 border rounded dark:bg-slate-700 dark:text-slate-300 dark:border-slate-600" required />
                    <input type="number" step="0.01" name="amount" value={newExpense.amount} onChange={handleInputChange} placeholder={t('expenses.amount', 'Amount')} className="p-2 border rounded dark:bg-slate-700 dark:text-slate-300 dark:border-slate-600" required />
                    <input type="text" name="description" value={newExpense.description} onChange={handleInputChange} placeholder={t('expenses.description', 'Description (Optional)')} className="p-2 border rounded md:col-span-1 dark:bg-slate-700 dark:text-slate-300 dark:border-slate-600" />
                    <button type="submit" className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded-lg transition-colors w-full">
                        {t('expenses.save', 'Save Expense')}
                    </button>
                </form>
            </div>

            <div className="bg-white dark:bg-slate-800 p-6 rounded-xl shadow-lg">
                <h3 className="text-xl font-semibold mb-4 text-slate-700 dark:text-slate-300">{t('expenses.list', 'Expense List')}</h3>
                <div className="overflow-x-auto">
                    <table className="min-w-full bg-white dark:bg-slate-800">
                        <thead className="bg-gray-100 dark:bg-slate-700">
                            <tr>
                                <th className="py-3 px-4 border-b dark:border-slate-600 text-left text-slate-600 dark:text-slate-300">Date</th>
                                <th className="py-3 px-4 border-b dark:border-slate-600 text-left text-slate-600 dark:text-slate-300">Category</th>
                                <th className="py-3 px-4 border-b dark:border-slate-600 text-left text-slate-600 dark:text-slate-300">Description</th>
                                <th className="py-3 px-4 border-b dark:border-slate-600 text-right text-slate-600 dark:text-slate-300">Amount</th>
                                <th className="py-3 px-4 border-b dark:border-slate-600 text-left text-slate-600 dark:text-slate-300">Added By</th>
                                <th className="py-3 px-4 border-b dark:border-slate-600 text-center text-slate-600 dark:text-slate-300">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="text-slate-700 dark:text-slate-400">
                            {loading ? (
                                <tr><td colSpan={6} className="text-center p-4">Loading...</td></tr>
                            ) : (
                                expenses.map(expense => (
                                    <tr key={expense.id} className="hover:bg-gray-50 dark:hover:bg-slate-700">
                                        <td className="py-3 px-4 border-b dark:border-slate-600">{new Date(expense.expense_date).toLocaleDateString()}</td>
                                        <td className="py-3 px-4 border-b dark:border-slate-600">{expense.category}</td>
                                        <td className="py-3 px-4 border-b dark:border-slate-600">{expense.description}</td>
                                        <td className="py-3 px-4 border-b dark:border-slate-600 text-right font-mono">{Number(expense.amount).toFixed(2)} EGP</td>
                                        <td className="py-3 px-4 border-b dark:border-slate-600">{expense.username}</td>
                                        <td className="py-3 px-4 border-b dark:border-slate-600 text-center">
                                            <button onClick={() => handleEditClick(expense)} className="text-blue-500 hover:text-blue-700 p-2 rounded-full hover:bg-blue-100 dark:hover:bg-slate-600 mr-2"><FiEdit /></button>
                                            <button onClick={() => handleDeleteExpense(expense.id!)} className="text-red-500 hover:text-red-700 p-2 rounded-full hover:bg-red-100 dark:hover:bg-slate-600"><FiTrash2 /></button>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {isModalOpen && editingExpense && (
                <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50">
                    <div className="bg-white dark:bg-slate-800 p-6 rounded-lg shadow-xl w-full max-w-lg">
                        <h3 className="text-2xl font-bold mb-6 text-slate-800 dark:text-slate-200">{t('expenses.editTitle', 'Edit Expense')}</h3>
                        <form onSubmit={handleUpdateExpense} className="space-y-4">
                            <input type="date" name="expense_date" value={editingExpense.expense_date} onChange={handleInputChange} className="w-full p-2 border rounded dark:bg-slate-700 dark:text-slate-300 dark:border-slate-600" required />
                            <input type="text" name="category" value={editingExpense.category} onChange={handleInputChange} placeholder="Category" className="w-full p-2 border rounded dark:bg-slate-700 dark:text-slate-300 dark:border-slate-600" required />
                            <input type="number" step="0.01" name="amount" value={editingExpense.amount} onChange={handleInputChange} placeholder="Amount" className="w-full p-2 border rounded dark:bg-slate-700 dark:text-slate-300 dark:border-slate-600" required />
                            <textarea name="description" value={editingExpense.description || ''} onChange={handleInputChange} placeholder="Description" className="w-full p-2 border rounded dark:bg-slate-700 dark:text-slate-300 dark:border-slate-600" rows={3}></textarea>
                            <div className="mt-8 flex justify-end gap-4">
                                <button type="button" onClick={handleModalClose} className="bg-gray-200 hover:bg-gray-300 dark:bg-slate-600 dark:hover:bg-slate-500 text-black dark:text-white font-bold py-2 px-6 rounded-lg">Cancel</button>
                                <button type="submit" className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-6 rounded-lg">Save Changes</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}

export default Expenses;