import React, { useState, useEffect, useRef, ReactNode } from 'react';
import { useReactToPrint } from 'react-to-print';
import { PrintWorksheet } from './PrintWorksheet'; // ✅ المسار صحيح لأن الملفين في نفس الفولدر
import { FiPrinter, FiList } from 'react-icons/fi';

const API_URL = 'http://localhost:3001/api';

interface DropdownItem {
    id: number | string;
    name: string;
}

const InventoryWorksheetPage: React.FC = () => {
    const [filterType, setFilterType] = useState('ALL');
    const [categories, setCategories] = useState<string[]>([]);
    const [suppliers, setSuppliers] = useState<DropdownItem[]>([]);
    const [selectedScope, setSelectedScope] = useState('');

    const [worksheetData, setWorksheetData] = useState<any[] | null>(null);
    const [worksheetTitle, setWorksheetTitle] = useState('');
    const [isLoading, setIsLoading] = useState(false);

    const worksheetRef = useRef<HTMLDivElement>(null);

    // ✅ استخدام react-to-print
    const handlePrint = useReactToPrint({
        content: () => worksheetRef.current,
    });

    // ✅ تحميل البيانات الخاصة بالفلاتر
    useEffect(() => {
        const fetchDropdownData = async () => {
            try {
                const [categoriesRes, suppliersRes] = await Promise.all([
                    fetch(`${API_URL}/products/categories`),
                    fetch(`${API_URL}/suppliers`)
                ]);
                const categoriesData = await categoriesRes.json();
                const suppliersData = await suppliersRes.json();
                setCategories(categoriesData);
                setSuppliers(suppliersData);
            } catch (error) {
                console.error("Fetch dropdown data error:", error);
                alert('Could not load categories or suppliers for filtering.');
            }
        };
        fetchDropdownData();
    }, []);

    // ✅ جلب بيانات الجرد
    const handleGenerateWorksheet = async () => {
        setIsLoading(true);
        setWorksheetData(null);

        let url = `${API_URL}/inventory/worksheet?count_type=${filterType}`;
        let title = 'All Products';

        if (selectedScope) {
            url += `&count_scope=${encodeURIComponent(selectedScope)}`;
            if (filterType === 'CATEGORY') {
                title = `Category: ${selectedScope}`;
            } else if (filterType === 'SUPPLIER') {
                const supplier = suppliers.find(s => s.id.toString() === selectedScope);
                title = `Supplier: ${supplier?.name}`;
            }
        }

        try {
            const response = await fetch(url);
            const data = await response.json();
            if (data.length === 0) {
                alert('No products found for this filter.');
            }
            setWorksheetTitle(title);
            setWorksheetData(data);
        } catch (error) {
            console.error("Error fetching worksheet:", error);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="p-6">
            <h2 className="text-2xl font-bold mb-4">Print Inventory Worksheet</h2>

            {/* ✅ الجزء اللي هيتطبع */}
            {worksheetData && (
                <div style={{ display: 'none' }}>
                    <PrintWorksheet ref={worksheetRef} products={worksheetData} title={worksheetTitle} />
                </div>
            )}

            {/* ✅ فلاتر البحث والأزرار */}
            <div className="bg-white p-4 rounded-lg shadow-md mb-6">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
                    <SelectField 
                        label="Filter By" 
                        value={filterType} 
                        onChange={(e: React.ChangeEvent<HTMLSelectElement>) => { 
                            setFilterType(e.target.value); 
                            setSelectedScope(''); 
                        }}
                    >
                        <option value="ALL">All Products</option>
                        <option value="CATEGORY">Category</option>
                        <option value="SUPPLIER">Supplier</option>
                    </SelectField>

                    {filterType === 'CATEGORY' && (
                        <SelectField 
                            label="Select Category" 
                            value={selectedScope} 
                            onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setSelectedScope(e.target.value)}
                        >
                            <option value="">-- Select --</option>
                            {categories.map(c => <option key={c} value={c}>{c}</option>)}
                        </SelectField>
                    )}

                    {filterType === 'SUPPLIER' && (
                        <SelectField 
                            label="Select Supplier" 
                            value={selectedScope} 
                            onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setSelectedScope(e.target.value)}
                        >
                            <option value="">-- Select --</option>
                            {suppliers.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                        </SelectField>
                    )}

                    <div className="md:col-start-3 flex gap-2">
                        <button 
                            onClick={handleGenerateWorksheet} 
                            disabled={isLoading} 
                            className="bg-blue-500 text-white font-bold py-2 px-4 rounded w-full flex items-center justify-center gap-2"
                        >
                            <FiList /> {isLoading ? 'Generating...' : 'Generate List'}
                        </button>
                        <button 
                            onClick={handlePrint} 
                            disabled={!worksheetData || worksheetData.length === 0} 
                            className="bg-gray-600 text-white font-bold py-2 px-4 rounded w-full flex items-center justify-center gap-2 disabled:bg-gray-300"
                        >
                            <FiPrinter /> Print
                        </button>
                    </div>
                </div>
            </div>

            {/* ✅ جدول عرض المنتجات */}
            <div className="bg-white p-4 rounded-lg shadow-md">
                <h3 className="text-xl font-semibold mb-4">Product List</h3>
                <div className="overflow-x-auto max-h-[65vh]">
                    <table className="min-w-full text-sm">
                        <thead className="bg-gray-100 sticky top-0">
                            <tr>
                                <th className="py-2 px-3 text-left">Product Name</th>
                                <th className="py-2 px-3 text-center">Barcode</th>
                                <th className="py-2 px-3 text-center">System Quantity</th>
                            </tr>
                        </thead>
                        <tbody>
                            {worksheetData ? (
                                worksheetData.length > 0 ? (
                                    worksheetData.map((product, index) => (
                                        <tr key={index} className="border-b">
                                            <td className="py-2 px-3">{product.name}</td>
                                            <td className="py-2 px-3 text-center font-mono">{product.barcode}</td>
                                            <td className="py-2 px-3 text-center">{product.stock}</td>
                                        </tr>
                                    ))
                                ) : (
                                    <tr><td colSpan={3} className="text-center p-4">No products to display.</td></tr>
                                )
                            ) : (
                                <tr><td colSpan={3} className="text-center p-4 text-gray-500">Generate a list to see products here.</td></tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};

// ✅ مكوّن SelectField
interface SelectFieldProps {
    label: string;
    children: ReactNode;
    [key: string]: any;
}

const SelectField: React.FC<SelectFieldProps> = ({ label, children, ...props }) => (
    <div>
        <label className="block text-sm font-medium text-gray-700">{label}</label>
        <select {...props} className="mt-1 block w-full p-2 border border-gray-300 rounded-md">
            {children}
        </select>
    </div>
);

export default InventoryWorksheetPage;
