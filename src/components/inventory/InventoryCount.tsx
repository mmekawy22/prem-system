import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../../context/UserContext';
import { FiCheckCircle, FiPlayCircle, FiSearch, FiPrinter } from 'react-icons/fi';
import { useReactToPrint } from 'react-to-print';
import { PrintWorksheet } from './PrintWorksheet';

const API_URL = 'http://192.168.1.20:3001/api';

// --- Interfaces ---
interface CountItem {
    id: number;
    product_id: number;
    name: string;
    barcode: string;
    cost: number;
    expected_quantity: number;
    counted_quantity: number | null;
}

interface InventoryCount {
    id: number;
    count_type: string;
    count_scope: string | null;
    items: CountItem[];
}

interface DropdownItem {
    id: number | string;
    name: string;
}

const InventoryCountPage: React.FC = () => {
    const { user } = useAuth();
    const [activeCount, setActiveCount] = useState<InventoryCount | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [isStartModalOpen, setStartModalOpen] = useState(false);
    
    const [countType, setCountType] = useState('ALL');
    const [categories, setCategories] = useState<string[]>([]);
    const [suppliers, setSuppliers] = useState<DropdownItem[]>([]);
    const [selectedScope, setSelectedScope] = useState('');

    const [worksheetData, setWorksheetData] = useState<any[] | null>(null);
    const [worksheetTitle, setWorksheetTitle] = useState('');

    const barcodeRef = useRef<HTMLInputElement>(null);
    const worksheetRef = useRef<HTMLDivElement>(null);
    
    // @ts-ignore
    const handlePrint = useReactToPrint({
        content: () => worksheetRef.current,
    });

    // ✅ **CORRECTED useEffect for printing**
    // This now runs ONLY when worksheetData is updated.
    useEffect(() => {
        if (worksheetData && worksheetData.length > 0) {
            handlePrint();
            setWorksheetData(null); // Clear data after printing to prevent re-triggering
        }
    }, [worksheetData]);

    const fetchActiveCount = async () => {
        setIsLoading(true);
        try {
            const response = await fetch(`${API_URL}/inventory/counts/active`);
            const data = await response.json();
            setActiveCount(data);
        } catch (error) {
            console.error("Error fetching active count:", error);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchActiveCount();
    }, []);

    const startNewCount = async () => {
        if (!user) return;
        try {
            const body = { user_id: user.id, count_type: countType, count_scope: selectedScope || null };
            const response = await fetch(`${API_URL}/inventory/counts/start`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(body)
            });
            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || 'Failed to start count.');
            }
            await fetchActiveCount();
            setStartModalOpen(false);
        } catch (error) {
            const message = error instanceof Error ? error.message : "An unknown error occurred.";
            alert(`Could not start new count: ${message}`);
        }
    };

    const updateItemCount = async (itemId: number, newQuantityStr: string) => {
        const newQuantity = newQuantityStr === '' ? null : parseInt(newQuantityStr, 10);
        if (newQuantity !== null && isNaN(newQuantity)) return;

        const originalItems = activeCount?.items || [];
        const updatedItems = originalItems.map(item =>
            item.id === itemId ? { ...item, counted_quantity: newQuantity } : item
        );
        if (activeCount) setActiveCount({ ...activeCount, items: updatedItems });

        try {
            await fetch(`${API_URL}/inventory/counts/items/${itemId}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ counted_quantity: newQuantity })
            });
        } catch (error) {
            console.error("Error updating item count:", error);
            if (activeCount) setActiveCount({ ...activeCount, items: originalItems });
        }
    };

    const handleBarcodeScan = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Enter') {
            const barcode = e.currentTarget.value.trim();
            if (!barcode) return;
            const itemToUpdate = activeCount?.items.find(item => item.barcode === barcode);
            if (itemToUpdate) {
                const currentCount = itemToUpdate.counted_quantity ?? 0;
                updateItemCount(itemToUpdate.id, (currentCount + 1).toString());
                document.getElementById(`item-row-${itemToUpdate.id}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' });
            } else {
                alert("Product with this barcode not found in the current count session.");
            }
            e.currentTarget.value = "";
        }
    };

    const finalizeCount = async () => {
        if (!activeCount) return;
        if (window.confirm("FINAL CONFIRMATION:\nAre you sure you want to finalize this count? This will PERMANENTLY update all product stock levels to match your counted quantities. This action cannot be undone.")) {
            try {
                await fetch(`${API_URL}/inventory/counts/${activeCount.id}/finalize`, { method: 'POST' });
                alert("Inventory count finalized successfully!");
                setActiveCount(null);
            } catch (error) {
                console.error("Error finalizing count:", error);
                alert("Could not finalize the count.");
            }
        }
    };
    
    const getWorksheet = async () => {
        let url = `${API_URL}/inventory/worksheet?count_type=${countType}`;
        let title = 'All Products';
        if (selectedScope) {
            url += `&count_scope=${encodeURIComponent(selectedScope)}`;
            if (countType === 'CATEGORY') {
                title = `Category: ${selectedScope}`;
            } else if (countType === 'SUPPLIER') {
                const supplier = suppliers.find(s => s.id.toString() === selectedScope);
                title = `Supplier: ${supplier?.name}`;
            }
        }
        try {
            const response = await fetch(url);
            const data = await response.json();
            if (data.length === 0) {
                alert('No products found for this filter.');
                return;
            }
            setWorksheetTitle(title);
            setWorksheetData(data); // This will now trigger the useEffect for printing
        } catch (error) {
            console.error("Error fetching worksheet:", error);
        }
    };

    const fetchDropdownData = async () => {
        try {
            const [productsRes, suppliersRes] = await Promise.all([
                fetch(`${API_URL}/products`),
                fetch(`${API_URL}/suppliers`)
            ]);
            if (!productsRes.ok || !suppliersRes.ok) throw new Error("Network response was not ok");
            const products = await productsRes.json();
            const suppliersData = await suppliersRes.json();
            const uniqueCategories = [...new Set(products.map((p: any) => p.category).filter((c: any) => c))];
            setCategories(uniqueCategories as string[]);
            setSuppliers(suppliersData);
        } catch (error) {
            console.error("Fetch dropdown data error:", error);
            alert('Could not load categories or suppliers for filtering.');
        }
    };

    const openStartModal = () => {
        fetchDropdownData();
        setCountType('ALL');
        setSelectedScope('');
        setStartModalOpen(true);
    };

    const filteredItems = activeCount?.items.filter(item =>
        item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (item.barcode && item.barcode.includes(searchTerm))
    ) || [];

    const summary = {
        counted: activeCount?.items.filter(i => i.counted_quantity !== null).length || 0,
        total: activeCount?.items.length || 0,
        discrepancies: activeCount?.items.filter(i => i.counted_quantity !== null && i.counted_quantity !== i.expected_quantity).length || 0,
        varianceValue: activeCount?.items.reduce((total, item) => {
            const counted = item.counted_quantity ?? item.expected_quantity;
            const variance = counted - item.expected_quantity;
            return total + (variance * (item.cost || 0));
        }, 0) || 0
    };

    if (isLoading) return <div className="p-6">Loading inventory session...</div>;

    if (!activeCount) {
        return (
            <div className="p-6">
                <div className="text-center bg-white p-8 rounded-lg shadow-md">
                    <FiCheckCircle size={48} className="mx-auto text-green-500 mb-4" />
                    <p className="mb-6">There is no inventory count currently in progress.</p>
                    <button onClick={openStartModal} className="bg-blue-500 text-white font-bold py-3 px-6 rounded-lg flex items-center gap-2 mx-auto">
                        <FiPlayCircle /> Start New Inventory Count
                    </button>
                </div>
                {worksheetData && <div style={{ display: 'none' }}><PrintWorksheet ref={worksheetRef} products={worksheetData} title={worksheetTitle} /></div>}
                {isStartModalOpen && (
                    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                        <div className="bg-white p-6 rounded-lg shadow-xl w-full max-w-lg">
                            <h3 className="text-xl font-bold mb-4">Start New Inventory Count</h3>
                            <div className="space-y-4">
                                <p>Select the scope of products you want to count.</p>
                                <select value={countType} onChange={e => { setCountType(e.target.value); setSelectedScope(''); }} className="w-full p-2 border rounded-md">
                                    <option value="ALL">Count All Products</option>
                                    <option value="CATEGORY">Count by Category</option>
                                    <option value="SUPPLIER">Count by Supplier</option>
                                </select>
                                {countType === 'CATEGORY' && (
                                    <select value={selectedScope} onChange={e => setSelectedScope(e.target.value)} className="w-full p-2 border rounded-md">
                                        <option value="">Select a category...</option>
                                        {categories.map(c => <option key={c} value={c}>{c}</option>)}
                                    </select>
                                )}
                                {countType === 'SUPPLIER' && (
                                    <select value={selectedScope} onChange={e => setSelectedScope(e.target.value)} className="w-full p-2 border rounded-md">
                                        <option value="">Select a supplier...</option>
                                        {suppliers.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                                    </select>
                                )}
                            </div>
                            <div className="mt-6 flex justify-between">
                                <button type="button" onClick={() => setStartModalOpen(false)} className="bg-gray-300 text-black font-bold py-2 px-4 rounded">Cancel</button>
                                <div className="flex gap-2">
                                    <button onClick={getWorksheet} className="bg-gray-600 text-white font-bold py-2 px-4 rounded flex items-center gap-2"><FiPrinter /> Print Worksheet</button>
                                    <button onClick={startNewCount} className="bg-blue-500 text-white font-bold py-2 px-4 rounded">Begin Digital Count</button>
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        );
    }

    return (
        <div className="p-6">
            <h2 className="text-2xl font-bold mb-4">Inventory Count in Progress ({activeCount.count_type}{activeCount.count_scope ? `: ${activeCount.count_scope}` : ''})</h2>
            <div className="grid grid-cols-1 lg:grid-cols-4 gap-4 mb-4">
                <div className="bg-white p-4 rounded-lg shadow-md text-center"><p className="text-sm text-gray-500">Items Counted</p><p className="text-2xl font-bold">{summary.counted} / {summary.total}</p></div>
                <div className="bg-white p-4 rounded-lg shadow-md text-center"><p className="text-sm text-gray-500">Discrepancies Found</p><p className="text-2xl font-bold text-orange-500">{summary.discrepancies}</p></div>
                <div className="bg-white p-4 rounded-lg shadow-md text-center"><p className="text-sm text-gray-500">Variance Value</p><p className={`text-2xl font-bold ${summary.varianceValue >= 0 ? 'text-green-600' : 'text-red-600'}`}>{summary.varianceValue.toFixed(2)} EGP</p></div>
                <div className="bg-green-500 p-4 rounded-lg shadow-md text-center flex items-center justify-center"><button onClick={finalizeCount} className="text-white font-bold w-full h-full">Finalize & Update Stock</button></div>
            </div>
            <div className="bg-white p-4 rounded-lg shadow-md">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                    <div className="relative"><FiSearch className="absolute top-1/2 left-3 -translate-y-1/2 text-gray-400" /><input type="text" placeholder="Search product by name or barcode..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="w-full p-2 pl-10 border rounded-md" /></div>
                    <input ref={barcodeRef} type="text" placeholder="Scan barcode here and press Enter..." onKeyPress={handleBarcodeScan} className="w-full p-2 border rounded-md" autoFocus />
                </div>
                <div className="overflow-x-auto max-h-[60vh]">
                    <table className="min-w-full text-sm">
                        <thead className="bg-gray-100 sticky top-0"><tr>
                            <th className="py-2 px-3 text-left">Product Name</th>
                            <th className="py-2 px-3 text-center">Expected</th>
                            <th className="py-2 px-3 text-center w-32">Counted</th>
                            <th className="py-2 px-3 text-center">Variance</th>
                        </tr></thead>
                        <tbody>
                            {filteredItems.map(item => {
                                const variance = (item.counted_quantity ?? item.expected_quantity) - item.expected_quantity;
                                const varianceColor = variance < 0 ? 'text-red-600' : variance > 0 ? 'text-green-600' : '';
                                return (
                                    <tr key={item.id} id={`item-row-${item.id}`} className="border-b hover:bg-gray-50">
                                        <td className="py-2 px-3 font-medium">{item.name}</td>
                                        <td className="py-2 px-3 text-center">{item.expected_quantity}</td>
                                        <td className="py-2 px-3 text-center">
                                            <input type="number" value={item.counted_quantity ?? ''} onChange={e => updateItemCount(item.id, e.target.value)} className="w-24 text-center p-1 border rounded-md bg-yellow-50" placeholder="0" />
                                        </td>
                                        <td className={`py-2 px-3 text-center font-bold ${varianceColor}`}>{item.counted_quantity !== null ? (variance > 0 ? `+${variance}`: variance) : '-'}</td>
                                    </tr>
                                )
                            })}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};

export default InventoryCountPage;