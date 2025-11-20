import React, { useState, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import ReactDOM from 'react-dom';
import type { Product } from '../../db';
import BarcodeSheet from './BarcodeSheet';
import { Link } from 'react-router-dom';
import * as XLSX from 'xlsx';
import { useReactToPrint } from 'react-to-print';
import { InventoryListPrint } from './InventoryListPrint';
import CreatableSelect from 'react-select/creatable';
import { createRoot } from "react-dom/client";

const API_URL = 'http://192.168.1.20:3001/api';

interface HistoryLog {
    type: string;
    related_id: number;
    timestamp: number;
    quantity_change: number;
    notes: string;
}

function Inventory() {
    const { t } = useTranslation();
    const fileInputRef = useRef<HTMLInputElement>(null);
    const printResultsRef = useRef<HTMLDivElement>(null);
    
    // @ts-ignore
    const handlePrintResults = useReactToPrint({ content: () => printResultsRef.current });

    const [products, setProducts] = useState<Product[]>([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [categories, setCategories] = useState<string[]>([]);
    
    const [newProduct, setNewProduct] = useState<any>({
        name: '', price: '', category: '', wholesale_price: '', cost: '', stock: '', min_stock: '',
    });
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingProduct, setEditingProduct] = useState<Product | null>(null);
    
    const [isPrintModalOpen, setIsPrintModalOpen] = useState(false);
    const [productForPrintModal, setProductForPrintModal] = useState<Product | null>(null);
    const [printQuantity, setPrintQuantity] = useState<number>(1);
    const [itemsToPrint, setItemsToPrint] = useState<any[] | null>(null);

    const [isHistoryModalOpen, setIsHistoryModalOpen] = useState(false);
    const [historyProduct, setHistoryProduct] = useState<Product | null>(null);
    const [historyLogs, setHistoryLogs] = useState<HistoryLog[]>([]);
    
    const fetchProducts = async () => {
        try {
            const response = await fetch(`${API_URL}/products`);
            if (!response.ok) throw new Error("Failed to fetch products");
            const allProducts: Product[] = await response.json();

            // "تنظيف" البيانات لضمان عدم وجود قيم اختيارية أو فارغة
            const sanitizedProducts = allProducts.map(p => ({
                ...p,
                id: p.id || 0,
                name: p.name || '',
                price: p.price || 0,
                stock: p.stock || 0,
                barcode: p.barcode || '',
                category: p.category || '',
                cost: p.cost || 0,
                wholesale_price: p.wholesale_price || 0,
                min_stock: p.min_stock || 0,
                supplier_id: p.supplier_id || null
            }));

            setProducts(sanitizedProducts);

            const uniqueCategories: string[] = [...new Set(sanitizedProducts.map((p: Product) => p.category).filter(Boolean) as string[])];
            setCategories(uniqueCategories);
        } catch (error) {
            console.error("Fetch products error:", error);
            alert("Could not fetch products from the server.");
        }
    };

    useEffect(() => {
        fetchProducts();
    }, []);

  

useEffect(() => {
  if (itemsToPrint && itemsToPrint.length > 0) {
    const printIframe = document.createElement("iframe");
    printIframe.style.cssText = "position:absolute;width:0;height:0;border:0;";
    document.body.appendChild(printIframe);

    const printDocument = printIframe.contentWindow?.document;
    if (printDocument) {
      const printContent = document.createElement("div");
      printDocument.body.appendChild(printContent);

      // ✅ استخدام createRoot بدل ReactDOM.render
      const root = createRoot(printContent);
      root.render(<BarcodeSheet items={itemsToPrint} />);

      setTimeout(() => {
        printIframe.contentWindow?.focus();
        printIframe.contentWindow?.print();
        document.body.removeChild(printIframe);
        setItemsToPrint(null);
      }, 500);
    }
  }
}, [itemsToPrint]);

    const handleExportToExcel = () => {
        const worksheet = XLSX.utils.json_to_sheet(products);
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, "Inventory");
        XLSX.writeFile(workbook, "inventory_export.xlsx");
    };

    const handleOpenPrintModal = (product: Product) => {
        setProductForPrintModal(product);
        setPrintQuantity(1);
        setIsPrintModalOpen(true);
    };
    const handleClosePrintModal = () => setIsPrintModalOpen(false);
    const handleConfirmPrint = () => {
        if (!productForPrintModal || printQuantity < 1) return;
        setItemsToPrint([{ ...productForPrintModal, quantity: printQuantity }]);
        handleClosePrintModal();
    };
    
    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        if (name === 'stock') {
            const stockValue = Number(value);
            let minStock = 0;
            if (stockValue > 2) {
                minStock = Math.floor(stockValue / 2) - 1;
            }
            setNewProduct((prev: any) => ({ ...prev, stock: value, min_stock: minStock }));
        } else {
            setNewProduct((prev: any) => ({ ...prev, [name]: value }));
        }
    };

    const handleModalChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target;
        if (editingProduct) {
            setEditingProduct(prev => (prev ? { ...prev, [name]: value } : null) as Product);
        }
    };
    
    const handleAddProduct = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newProduct.name || !newProduct.price || Number(newProduct.price) <= 0) {
            alert('Please enter at least a name and a valid price.');
            return;
        }
        try {
            const productToSend = { ...newProduct, price: Number(newProduct.price), cost: Number(newProduct.cost || 0), stock: Number(newProduct.stock || 0), wholesale_price: Number(newProduct.wholesale_price || 0), min_stock: Number(newProduct.min_stock || 0) };
            const response = await fetch(`${API_URL}/products`, {
                method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(productToSend)
            });
            if (!response.ok) { const err = await response.json(); throw new Error(err.error || "Failed to add product"); }
            alert('Product added successfully!');
            setNewProduct({ name: '', price: '', category: '', wholesale_price: '', cost: '', stock: '', min_stock: '' });
            fetchProducts();
        } catch (error) {
            alert(`Failed to add product: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    };

    const handleUpdateProduct = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!editingProduct || !editingProduct.id) return;
        try {
            const { id, ...dataToUpdate } = editingProduct;
            const response = await fetch(`${API_URL}/products/${id}`, {
                method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(dataToUpdate)
            });
            if (!response.ok) throw new Error("Failed to update product");
            alert('Product updated successfully!');
            handleModalClose();
            fetchProducts();
        } catch (error) {
            alert('Failed to update product.');
        }
    };

    const handleDeleteProduct = async (id: number) => {
        if (window.confirm('Are you sure you want to delete this product?')) {
            try {
                const response = await fetch(`${API_URL}/products/${id}`, { method: 'DELETE' });
                if (!response.ok) throw new Error("Failed to delete product");
                alert('Product deleted successfully!');
                fetchProducts();
            } catch (error) {
                alert('Failed to delete product.');
            }
        }
    };
    
    const handleEditClick = (product: Product) => { setEditingProduct(product); setIsModalOpen(true); };
    const handleModalClose = () => { setIsModalOpen(false); setEditingProduct(null); };
    const handleImportClick = () => fileInputRef.current?.click();
    const handleFileImport = (event: React.ChangeEvent<HTMLInputElement>) => { alert("Excel import feature is not yet connected to the backend."); };
    
    const handleHistoryClick = async (product: Product) => {
        setHistoryProduct(product);
        setIsHistoryModalOpen(true);
        setHistoryLogs([]);
        try {
            const response = await fetch(`${API_URL}/products/${product.id}/history`);
            if(!response.ok) throw new Error("Failed to fetch product history.");
            const logsData = await response.json();
            setHistoryLogs(logsData);
        } catch(error) {
            alert("Could not load product history.");
            setIsHistoryModalOpen(false);
        }
    };

    const filteredProductList = products.filter(product => {
        const term = searchTerm.toLowerCase().trim();
        if (!term) return true;
        const nameMatch = product.name.toLowerCase().includes(term);
        const barcodeMatch = product.barcode && product.barcode.includes(term);
        const categoryMatch = product.category && product.category.toLowerCase().includes(term);
        return nameMatch || barcodeMatch || categoryMatch;
    });
// We need to format the categories for react-select
const categoryOptions = categories.map(cat => ({ value: cat, label: cat }));

// This function will handle both selecting an existing and creating a new category
const handleCategoryChange = (selectedOption: any) => {
    if (selectedOption) {
        setNewProduct((prev: any) => ({ ...prev, category: selectedOption.value }));
    } else {
        setNewProduct((prev: any) => ({ ...prev, category: '' }));
    }
};

    return (
        <div className="p-6 dark:bg-slate-900">
            <div className="flex justify-between items-center mb-6">
                <h2 className="text-3xl font-bold text-slate-800 dark:text-slate-200">{t('inventory.title')}</h2>
                <div className="flex gap-2">
                    <button onClick={handleExportToExcel} className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-2 px-4 rounded-lg">
                        {t('inventory.exportToExcel', 'Export to Excel')}
                    </button>
                    <input type="file" ref={fileInputRef} onChange={handleFileImport} className="hidden" accept=".xlsx, .xls" />
                    <button onClick={handleImportClick} className="bg-teal-500 hover:bg-teal-600 text-white font-bold py-2 px-4 rounded-lg">
                        {t('inventory.importFromExcel')}
                    </button>
                    <Link to="/inventory/worksheet" className="bg-gray-600 hover:bg-gray-700 text-white font-bold py-2 px-4 rounded-lg">
                        {t('inventory.printWorksheet', 'Print Worksheet')}
                    </Link>
                    <Link to="/inventory/count" className="bg-green-600 hover:bg-green-700 text-white font-bold py-2 px-4 rounded-lg">
                        {t('inventory.startCount', 'Start Count')}
                    </Link>
                </div>
            </div>

            <div className="bg-white dark:bg-slate-800 p-4 rounded-lg shadow-md mb-6">
                <h3 className="text-xl font-semibold mb-4 text-slate-700 dark:text-slate-300">{t('inventory.addNewProduct')}</h3>
                <form onSubmit={handleAddProduct} className="grid grid-cols-1 md:grid-cols-4 lg:grid-cols-8 gap-4 items-center">
                    <input type="text" name="name" value={newProduct.name} onChange={handleInputChange} placeholder={t('inventory.productName')} className="p-2 border rounded" required />
                    <input type="number" step="0.01" name="price" value={newProduct.price} onChange={handleInputChange} placeholder={t('inventory.retailPrice')} className="p-2 border rounded" required />
                    <CreatableSelect
    isClearable
    placeholder={t('inventory.selectOrAddCategory', 'Select or add...')}
    options={categoryOptions}
    value={newProduct.category ? { value: newProduct.category, label: newProduct.category } : null}
    onChange={handleCategoryChange}
    formatCreateLabel={(inputValue) => `${t('inventory.create', 'Create')} "${inputValue}"`}
/>
                    <input type="number" step="0.01" name="wholesale_price" value={newProduct.wholesale_price} onChange={handleInputChange} placeholder={t('inventory.wholesalePrice')} className="p-2 border rounded" />
                    <input type="number" step="0.01" name="cost" value={newProduct.cost} onChange={handleInputChange} placeholder={t('inventory.cost')} className="p-2 border rounded" />
                    <input type="number" name="stock" value={newProduct.stock} onChange={handleInputChange} placeholder={t('inventory.stockQuantity')} className="p-2 border rounded" />
                    <input type="number" name="min_stock" value={newProduct.min_stock} onChange={handleInputChange} placeholder={t('inventory.minimumStock')} className="p-2 border rounded" />
                    <button type="submit" className="bg-blue-500 hover:bg-blue-600 text-white font-bold py-2 px-4 rounded-lg">{t('inventory.saveProduct')}</button>
                </form>
            </div>

            <div className="bg-white dark:bg-slate-800 p-4 rounded-lg shadow-md">
                <div className="flex justify-between items-center mb-4">
                    <h3 className="text-xl font-semibold text-slate-700 dark:text-slate-300">{t('inventory.productList')}</h3>
                    <div className="flex gap-2 items-center">
                        <button onClick={handlePrintResults} disabled={filteredProductList.length === 0} className="bg-gray-600 hover:bg-gray-700 text-white font-bold py-2 px-4 rounded disabled:bg-gray-300">
                            {t('inventory.printResults', 'Print Results')}
                        </button>
                        <input type="text" placeholder={t('inventory.searchByNameOrBarcode')} value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="p-2 border rounded w-80" />
                    </div>
                </div>
                <div className="overflow-x-auto">
                    <table className="min-w-full bg-white dark:bg-slate-800">
                        <thead className="bg-gray-100 dark:bg-slate-700">
                            <tr>
                                <th className="py-2 px-4 text-left">{t('inventory.barcode')}</th>
                                <th className="py-2 px-4 text-left">{t('inventory.name')}</th>
                                <th className="py-2 px-4 text-right">{t('inventory.price')}</th>
                                <th className="py-2 px-4 text-center">{t('inventory.stock')}</th>
                                <th className="py-2 px-4 text-center">{t('inventory.actions')}</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredProductList.map(product => (
                                <tr key={product.id}>
                                    <td className="py-2 px-4">{product.barcode}</td>
                                    <td className="py-2 px-4">{product.name}</td>
                                    <td className="py-2 px-4 text-right">{Number(product.price).toFixed(2)}</td>
                                    <td className="py-2 px-4 text-center">{product.stock}</td>
                                    <td className="py-2 px-4 text-center space-x-2">
                                        <button onClick={() => handleHistoryClick(product)} className="text-purple-500 hover:underline">{t('inventory.history')}</button>
                                        <button onClick={() => handleOpenPrintModal(product)} className="text-green-500 hover:underline">{t('inventory.print')}</button>
                                        <button onClick={() => handleEditClick(product)} className="text-blue-500 hover:underline">{t('inventory.edit')}</button>
                                        <button onClick={() => handleDeleteProduct(product.id!)} className="text-red-500 hover:underline">{t('inventory.delete')}</button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
            
            <div style={{ display: 'none' }}>
                <InventoryListPrint ref={printResultsRef} products={filteredProductList} />
            </div>
            
            {isModalOpen && editingProduct && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                    <div className="bg-white dark:bg-slate-800 p-6 rounded-lg shadow-xl w-full max-w-lg">
                        <h3 className="text-2xl font-bold mb-4">{t('inventory.editTitle', 'Edit Product')}</h3>
                        <form onSubmit={handleUpdateProduct}>
                            <div className="grid grid-cols-2 gap-4">
                                <input type="text" name="name" value={editingProduct.name} onChange={handleModalChange} placeholder={t('inventory.productName')} className="p-2 border rounded" />
                                <input type="number" step="0.01" name="price" value={editingProduct.price} onChange={handleModalChange} placeholder={t('inventory.retailPrice')} className="p-2 border rounded" />
                                <input type="text" name="barcode" value={editingProduct.barcode || ''} onChange={handleModalChange} placeholder={t('inventory.barcode')} className="p-2 border rounded" />
                                <input type="text" name="category" value={editingProduct.category || ''} onChange={handleModalChange} placeholder={t('inventory.category')} className="p-2 border rounded" />
                                <input type="number" step="0.01" name="wholesale_price" value={editingProduct.wholesale_price || ''} onChange={handleModalChange} placeholder={t('inventory.wholesalePrice')} className="p-2 border rounded" />
                                <input type="number" step="0.01" name="cost" value={editingProduct.cost} onChange={handleModalChange} placeholder={t('inventory.cost')} className="p-2 border rounded" />
                                <input type="number" name="stock" value={editingProduct.stock} onChange={handleModalChange} placeholder={t('inventory.stockQuantity')} className="p-2 border rounded" />
                                <input type="number" name="min_stock" value={editingProduct.min_stock || ''} onChange={handleModalChange} placeholder={t('inventory.minimumStock')} className="p-2 border rounded" />
                            </div>
                            <div className="mt-6 flex justify-end gap-4">
                                <button type="button" onClick={handleModalClose} className="bg-gray-300 font-bold py-2 px-4 rounded">{t('general.cancel')}</button>
                                <button type="submit" className="bg-blue-500 text-white font-bold py-2 px-4 rounded">{t('inventory.saveChanges', 'Save Changes')}</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
            
            {isPrintModalOpen && productForPrintModal && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                    <div className="bg-white p-6 rounded-lg shadow-xl w-full max-w-sm">
                        <h3 className="text-xl font-bold mb-4">{t('inventory.printBarcodesTitle', 'Print Barcodes')}</h3>
                        <p className="mb-4">{t('inventory.printQuantityPrompt', 'How many labels for')} <strong>{productForPrintModal.name}</strong>?</p>
                        <div className="mb-4">
                            <label className="block mb-1">{t('inventory.quantityToPrint', 'Quantity to Print:')}</label>
                            <input type="number" min="1" value={printQuantity} onChange={(e) => setPrintQuantity(Number(e.target.value))} className="w-full p-2 border rounded" autoFocus />
                        </div>
                        <div className="mt-6 flex justify-end gap-4">
                            <button type="button" onClick={handleClosePrintModal} className="bg-gray-300 font-bold py-2 px-4 rounded">{t('general.cancel')}</button>
                            <button type="button" onClick={handleConfirmPrint} className="bg-green-500 text-white font-bold py-2 px-4 rounded">{t('general.print')}</button>
                        </div>
                    </div>
                </div>
            )}
            
            {isHistoryModalOpen && historyProduct && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                    <div className="bg-white p-6 rounded-lg shadow-xl w-full max-w-2xl">
                        <h3 className="text-2xl font-bold mb-4">{t('inventory.historyFor', 'History for:')} {historyProduct.name}</h3>
                        <div className="max-h-[60vh] overflow-y-auto">
                            <table className="min-w-full bg-white">
                                <thead className="bg-gray-100 sticky top-0">
                                    <tr>
                                        <th className="py-2 px-4 text-left">{t('general.date')}</th>
                                        <th className="py-2 px-4 text-left">{t('inventory.history.operation', 'Operation')}</th>
                                        <th className="py-2 px-4 text-center">{t('inventory.history.quantityChange', 'Quantity Change')}</th>
                                        <th className="py-2 px-4 text-center">{t('inventory.history.invoiceId', 'Invoice ID')}</th>
                                        <th className="py-2 px-4 text-left">{t('general.notes')}</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {historyLogs.length > 0 ? (
                                        historyLogs.map((log, index) => (
                                            <tr key={index}>
                                                <td className="py-2 px-4">{new Date(log.timestamp).toLocaleString()}</td>
                                                <td className={`py-2 px-4 font-semibold ${log.type === 'Purchase' ? 'text-green-600' : 'text-red-600'}`}>{log.type}</td>
                                                <td className="py-2 px-4 text-center">{log.quantity_change > 0 ? `+${log.quantity_change}` : log.quantity_change}</td>
                                                <td className="py-2 px-4 text-center">#{log.related_id}</td>
                                                <td className="py-2 px-4">{log.notes}</td>
                                            </tr>
                                        ))
                                    ) : (
                                        <tr><td colSpan={5} className="text-center p-4">{t('inventory.history.noHistory', 'No history for this product.')}</td></tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                        <div className="mt-6 flex justify-end">
                            <button onClick={() => setIsHistoryModalOpen(false)} className="bg-gray-300 font-bold py-2 px-4 rounded">{t('general.close')}</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

export default Inventory;