import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import type { Transaction, User, Customer } from '../../db';
import Receipt from './Receipt';

const API_URL = 'http://192.168.1.20:3001';

// ✅ This interface is now correct and will not conflict with the base Transaction type
interface TransactionWithDetails extends Omit<Transaction, 'user' | 'customer'> {
    user?: Partial<User>;
    customer?: Partial<Customer>;
    items: any[];
}

function ReceiptSearch() {
    const { t } = useTranslation();
    const [searchType, setSearchType] = useState<'id' | 'product'>('id');
    const [searchTerm, setSearchTerm] = useState('');
    const [searchResults, setSearchResults] = useState<Transaction[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const [showReceiptModal, setShowReceiptModal] = useState(false);
    const [selectedTransaction, setSelectedTransaction] = useState<TransactionWithDetails | null>(null);

    const handleSearch = async () => {
        if (!searchTerm.trim()) return;
        setLoading(true);
        setError('');
        setSearchResults([]);

        try {
            let response;
            if (searchType === 'id') {
                response = await fetch(`${API_URL}/api/transactions/${searchTerm.trim()}`);
            } else {
                const searchParams = new URLSearchParams({ q: searchTerm.trim() });
                response = await fetch(`${API_URL}/api/transactions/search?${searchParams}`);
            }

            if (!response.ok) {
                const errData = await response.json().catch(() => ({ error: 'Search failed' }));
                throw new Error(errData.error || 'Search failed');
            }

            const data = await response.json();
            const foundTransactions = Array.isArray(data) ? data : (data ? [data] : []);

            if (foundTransactions.length > 0) {
                setSearchResults(foundTransactions.sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0)));
            } else {
                setError('No receipts found matching your criteria.');
            }

        } catch (err) {
            console.error("Search Error:", err);
            setError(err instanceof Error ? err.message : 'An error occurred during the search.');
        } finally {
            setLoading(false);
        }
    };
    
    const handleReprint = async (transaction: Transaction) => {
        try {
            const response = await fetch(`${API_URL}/api/transactions/${transaction.id}`);
            if (!response.ok) throw new Error("Could not fetch receipt details.");

            const fullTransactionDetails: TransactionWithDetails = await response.json();
            
            setSelectedTransaction(fullTransactionDetails);
            setShowReceiptModal(true);

        } catch (error) {
            console.error("Reprint error:", error);
            alert("Could not load receipt details for printing.");
        }
    };

    return (
        <div className="p-6">
            <h2 className="text-2xl font-bold mb-4">Search Receipts</h2>
            <div className="bg-white p-4 rounded-lg shadow-md mb-6">
                <div className="flex items-center gap-4 mb-4">
                    <label className="flex items-center gap-2 cursor-pointer">
                        <input type="radio" name="searchType" value="id" checked={searchType === 'id'} onChange={() => setSearchType('id')} />
                        By Receipt ID
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                        <input type="radio" name="searchType" value="product" checked={searchType === 'product'} onChange={() => setSearchType('product')} />
                        By Product Name or Barcode
                    </label>
                </div>
                <div className="flex gap-2">
                    <input
                        type="text"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        placeholder={searchType === 'id' ? 'Enter Receipt ID...' : 'Enter Product Name or Barcode...'}
                        className="p-2 border rounded w-full"
                        onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
                    />
                    <button onClick={handleSearch} disabled={loading} className="bg-blue-500 text-white p-2 rounded w-48 disabled:bg-blue-300">
                        {loading ? 'Searching...' : 'Search'}
                    </button>
                </div>
                {error && <p className="text-red-500 mt-2">{error}</p>}
            </div>

            <div className="bg-white p-4 rounded-lg shadow-md">
                <h3 className="text-xl font-semibold mb-4">Search Results</h3>
                <div className="overflow-x-auto">
                    <table className="min-w-full bg-white">
                        <thead className="bg-gray-100">
                            <tr>
                                <th className="py-2 px-4 border-b text-left">ID</th>
                                <th className="py-2 px-4 border-b text-left">Date</th>
                                <th className="py-2 px-4 border-b text-right">Total</th>
                                <th className="py-2 px-4 border-b text-center">Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {loading ? (
                                <tr><td colSpan={4} className="text-center p-4">Loading...</td></tr>
                            ) : searchResults.length > 0 ? (
                                searchResults.map(tx => (
                                    <tr key={tx.id}>
                                        <td className="py-2 px-4 border-b">#{tx.id}</td>
                                        <td className="py-2 px-4 border-b">{tx.timestamp ? new Date(tx.timestamp).toLocaleString() : 'No Date'}</td>
                                        <td className="py-2 px-4 border-b text-right">{(tx.final_total || tx.total).toFixed(2)} EGP</td>
                                        <td className="py-2 px-4 border-b text-center">
                                            <button onClick={() => handleReprint(tx)} className="text-blue-500 hover:underline">
                                                Reprint
                                            </button>
                                        </td>
                                    </tr>
                                ))
                            ) : (
                                <tr><td colSpan={4} className="text-center p-4">No results to display.</td></tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {showReceiptModal && selectedTransaction && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                    <div className="bg-white p-6 rounded-lg shadow-xl w-full max-w-sm">
                        <div className="printable-area">
                            <Receipt transaction={selectedTransaction} />
                        </div>
                        <div className="mt-4 flex gap-4 no-print">
                            <button onClick={() => window.print()} className="w-full bg-blue-500 text-white p-2 rounded-lg">Print</button>
                            <button onClick={() => setShowReceiptModal(false)} className="w-full bg-gray-500 text-white p-2 rounded-lg">Close</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

export default ReceiptSearch;