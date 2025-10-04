import React, { useState, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import type { Product, User, Transaction, Customer } from '../../db';
import Receipt from '../receipt/Receipt';
import { useAuth } from '../../context/UserContext';
import { usePOS } from '../../context/POSContext';
import { useHotkeys } from 'react-hotkeys-hook';

// --- Interfaces ---
type CartItem = Product & { quantity: number };

interface Payment {
    method: string;
    amount: number;
}

const API_URL = 'http://localhost:3001';

const POS: React.FC = () => {
    const { user } = useAuth();
    const { t } = useTranslation();
    const {
        sessions,
        activeSessionId,
        setActiveSessionId,
        handleNewSession,
        handleCloseSession,
        addToCart: contextAddToCart,
        removeFromCart,
        updateQuantity,
        updateCartForActiveSession,
        getActiveCart,
        toggleWholesale
    } = usePOS();
    
    const activeSession = sessions.find(s => s.id === activeSessionId) || sessions[0];
    const activeCart = activeSession?.cart || [];
    
    const [allProducts, setAllProducts] = useState<Product[]>([]);
    const [filteredProducts, setFilteredProducts] = useState<Product[]>([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [barcode, setBarcode] = useState('');
    const [loading, setLoading] = useState(false);
    const [showReceipt, setShowReceipt] = useState(false);
    const [currentTransaction, setCurrentTransaction] = useState<any | null>(null);
    const [isCheckoutModalOpen, setCheckoutModalOpen] = useState(false);
    const [payments, setPayments] = useState<Payment[]>([{ method: 'cash', amount: 0 }]);
    const [notes, setNotes] = useState('');
    const [isDelivery, setIsDelivery] = useState(false);
    const [customers, setCustomers] = useState<Customer[]>([]);
    const [customerSearch, setCustomerSearch] = useState('');
    const [selectedCustomerId, setSelectedCustomerId] = useState<number | undefined>(undefined);
    const [isAddCustomerModalOpen, setAddCustomerModalOpen] = useState(false);
    const [newCustomer, setNewCustomer] = useState({ name: '', phone: '', address: '' });
    const [isManualSaleModalOpen, setManualSaleModalOpen] = useState(false);
    const [manualItem, setManualItem] = useState({ name: '', price: '' });
    
    const [isEditItemModalOpen, setEditItemModalOpen] = useState(false);
    const [editingItem, setEditingItem] = useState<CartItem | null>(null);

    const [discountType, setDiscountType] = useState<'percentage' | 'fixed'>('fixed');
    const [discountValue, setDiscountValue] = useState(0);

    const barcodeRef = useRef<HTMLInputElement>(null);
    const searchRef = useRef<HTMLInputElement>(null);

    useHotkeys('f12', (e) => { e.preventDefault(); barcodeRef.current?.select(); }, []);
    useHotkeys('ctrl+m', (e) => { e.preventDefault(); handleOpenManualSaleModal(); }, []);
    useHotkeys('ctrl+s', (e) => { 
        e.preventDefault(); 
        if(isCheckoutModalOpen) {
            const completeSaleButton = document.getElementById('complete-sale-button');
            completeSaleButton?.click();
        }
    }, { enableOnFormTags: true, enabled: isCheckoutModalOpen });
    useHotkeys('esc', () => {
        if (isCheckoutModalOpen) setCheckoutModalOpen(false);
        if (isManualSaleModalOpen) setManualSaleModalOpen(false);
        if (isAddCustomerModalOpen) setAddCustomerModalOpen(false);
        if (isEditItemModalOpen) setEditItemModalOpen(false);
        if (showReceipt) handleCloseReceipt();
    }, [isCheckoutModalOpen, isManualSaleModalOpen, isAddCustomerModalOpen, showReceipt, isEditItemModalOpen]);

    const fetchProductsFromAPI = async () => {
        setLoading(true);
        try {
            const response = await fetch(`${API_URL}/api/products`);
            if (!response.ok) throw new Error('Failed to connect to the backend server.');
            const productsData = await response.json();
            setAllProducts(productsData);
        } catch (error) {
            console.error("Failed to fetch products:", error);
            alert("Error: Could not fetch product data from the server. Please ensure the backend is running.");
        } finally {
            setLoading(false);
        }
    };
    
    const fetchCustomersFromAPI = async () => {
        try {
            const response = await fetch(`${API_URL}/api/customers`);
            if (!response.ok) throw new Error('Failed to fetch customers');
            const customerData = await response.json();
            setCustomers(customerData);
        } catch (error) {
            console.error("Failed to fetch customers:", error);
            alert("Could not fetch customers from server.");
        }
    };
    
    useEffect(() => {
        fetchProductsFromAPI();
        fetchCustomersFromAPI();
    }, []);

    useEffect(() => {
        if (!searchTerm.trim()) {
            setFilteredProducts([]);
            return;
        }
        const lowercasedFilter = searchTerm.toLowerCase();
        const filtered = allProducts.filter(product =>
          product.name.toLowerCase().includes(lowercasedFilter) ||
          (product.barcode && product.barcode.includes(lowercasedFilter))
        );
        setFilteredProducts(filtered);
    }, [searchTerm, allProducts]);

    const filteredCustomers = customers.filter(c => {
        const searchTermClean = customerSearch.toLowerCase().trim();
        if (!searchTermClean) return false;
        const nameMatch = c.name.toLowerCase().includes(searchTermClean);
        const phoneMatch = c.phone && c.phone.trim().includes(searchTermClean);
        return nameMatch || phoneMatch;
    });

    useEffect(() => {
        if (filteredCustomers.length === 1) {
            setSelectedCustomerId(filteredCustomers[0].id);
        }
    }, [filteredCustomers]);

    const addToCart = (product: Product) => {
        contextAddToCart(product);
    };

    const handleBarcodeChange = (e: React.ChangeEvent<HTMLInputElement>) => setBarcode(e.target.value);
    const handleBarcodeSubmit = () => {
        if (!barcode.trim()) return;
        const product = allProducts.find(p => p.barcode === barcode.trim());
        if (product) {
            addToCart(product);
            setBarcode('');
        } else {
            alert(t('pos.productNotFound'));
        }
    };
    
    const calculateTotal = () => activeCart.reduce((total, item) => total + (Number(item.price) * item.quantity), 0);
    
    const handleOpenCheckout = async () => {
        if (activeCart.length === 0) {
            alert(t('pos.cartEmptyCheckout'));
            return;
        }
        await fetchCustomersFromAPI();
        const cartTotal = calculateTotal();
        setPayments([{ method: 'cash', amount: cartTotal }]);
        setSelectedCustomerId(undefined);
        setNotes('');
        setIsDelivery(false);
        setCustomerSearch('');
        setDiscountType('fixed');
        setDiscountValue(0);
        setCheckoutModalOpen(true);
    };

    const handleFinalizeSale = async (subtotal: number, discountAmount: number, finalTotal: number) => {
        if (!user) return;
        const totalPaid = payments.reduce((sum, p) => sum + Number(p.amount || 0), 0);

        if (totalPaid < finalTotal) {
            alert('The total amount paid is less than the final total.'); // This can be translated too
            return;
        }

        const transactionPayload = {
            total: subtotal,
            discount: discountAmount,
            final_total: finalTotal,
            payment_methods: payments,
            user_id: user.id!,
            notes: notes,
            is_delivery: isDelivery,
            customer_id: selectedCustomerId,
            items: activeCart
        };

        try {
            const response = await fetch(`${API_URL}/api/transactions`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(transactionPayload)
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || 'Failed to save transaction on the server.');
            }
            
            const result = await response.json();
            const transactionId = result.transactionId;

            await fetchProductsFromAPI();
            
            const selectedCustomer = customers.find(c => c.id === selectedCustomerId);

            const completeTransactionForReceipt = {
                id: transactionId,
                type: 'sale',
                date: new Date().toISOString(),
                timestamp: Date.now(),
                ...transactionPayload,
                items: activeCart,
                customer: selectedCustomer,
                user: user
            };

            setCurrentTransaction(completeTransactionForReceipt);
            updateCartForActiveSession([]);
            setCheckoutModalOpen(false);
            setShowReceipt(true);
            
            if (sessions.length > 1) {
                handleCloseSession(activeSessionId);
            }

        } catch (error) {
            console.error('Checkout error:', error);
            alert(`${t('pos.checkoutError')} ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    };
    
    const handlePaymentChange = (index: number, field: 'method' | 'amount', value: string | number) => {
        const newPayments = [...payments];
        newPayments[index] = { ...newPayments[index], [field]: value };
        setPayments(newPayments);
    };

    const addPaymentMethod = () => setPayments([...payments, { method: 'card', amount: 0 }]);
    const removePaymentMethod = (index: number) => setPayments(payments.filter((_, i) => i !== index));

    const handleAddNewCustomer = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newCustomer.name) {
            alert('Customer name is required.');
            return;
        }
        try {
            const response = await fetch(`${API_URL}/api/customers`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(newCustomer)
            });
            if (!response.ok) throw new Error('Failed to create new customer');
            
            const newlyAddedCustomer = await response.json();
            
            await fetchCustomersFromAPI();
            setSelectedCustomerId(newlyAddedCustomer.id);
            setAddCustomerModalOpen(false);
            setNewCustomer({ name: '', phone: '', address: '' });
        } catch (error) {
            console.error('Failed to add customer:', error);
            alert('Error adding customer.');
        }
    };

    const handleNewCustomerChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        const { name, value } = e.target;
        setNewCustomer(prev => ({ ...prev, [name]: value }));
    };
    
    const handleCloseReceipt = () => {
        setShowReceipt(false);
        setCurrentTransaction(null);
    };
    
    const handleOpenManualSaleModal = () => {
        setManualItem({ name: '', price: '' });
        setManualSaleModalOpen(true);
    };

    const handleManualItemChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target;
        setManualItem(prev => ({ ...prev, [name]: value }));
    };

    const handleManualSaleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!manualItem.name || !manualItem.price || Number(manualItem.price) <= 0) {
            alert("Please enter a valid name and price.");
            return;
        }
        const manualCartItem: CartItem = {
            id: Date.now() * -1,
            name: manualItem.name,
            price: Number(manualItem.price),
            quantity: 1,
            barcode: 'MANUAL',
            cost: Number(manualItem.price),
            stock: 999,
            min_stock: 0,
            wholesale_price: Number(manualItem.price),
            category: 'Manual Sale'
        };
        updateCartForActiveSession([...activeCart, manualCartItem]);
        setManualSaleModalOpen(false);
    };

    const handleOpenEditModal = (item: CartItem) => {
        setEditingItem({ ...item });
        setEditItemModalOpen(true);
    };

    const handleEditItemChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (!editingItem) return;
        const { name, value } = e.target;
        setEditingItem({
            ...editingItem,
            [name]: name === 'price' ? Number(value) : value,
        });
    };

    const handleUpdateEditedItem = () => {
        if (!editingItem) return;
        const newCart = activeCart.map(item => 
            (item.id === editingItem.id) ? editingItem : item
        );
        updateCartForActiveSession(newCart);
        setEditItemModalOpen(false);
        setEditingItem(null);
    };

    if (!user) { return <div className="p-6 text-center">Loading user information...</div>; }
    
    return (
        <div className="p-6 dark:bg-slate-900">
            {showReceipt && currentTransaction && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                    <div className="bg-white p-6 rounded-lg shadow-xl w-full max-w-sm">
                        <div className="printable-area">
                            <Receipt transaction={currentTransaction} />
                        </div>
                        <div className="mt-4 flex gap-4 no-print">
                            <button onClick={() => window.print()} className="w-full bg-blue-500 text-white p-2 rounded-lg">{t('pos.printReceipt', 'Print Receipt')}</button>
                            <button onClick={handleCloseReceipt} className="w-full bg-gray-500 text-white p-2 rounded-lg">{t('pos.closeReceipt', 'Close')}</button>
                        </div>
                    </div>
                </div>
            )}
            
            <h2 className="text-3xl font-bold text-slate-800 dark:text-slate-200 mb-6">{t('pos.title')}</h2>
            
            <input ref={barcodeRef} type="text" placeholder={t('pos.scanBarcode')} value={barcode} onChange={handleBarcodeChange} onKeyPress={(e) => e.key === 'Enter' && handleBarcodeSubmit()} autoFocus className="w-full p-3 mb-4 border rounded-lg dark:bg-slate-700 dark:border-slate-600"/>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-white dark:bg-slate-800 p-4 rounded-lg shadow-md">
                    <div className="flex gap-4 mb-4">
                        <input ref={searchRef} type="text" placeholder={t('pos.searchByNameOrBarcode')} value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="w-full p-2 border rounded dark:bg-slate-700 dark:border-slate-600"/>
                        <button onClick={handleOpenManualSaleModal} className="bg-orange-500 hover:bg-orange-600 text-white p-2 rounded whitespace-nowrap">{t('pos.manualSale')}</button>
                    </div>
                    {loading ? (<div>{t('pos.loading')}</div>) : (
                        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 min-h-[60vh] overflow-y-auto custom-scrollbar">
                            {filteredProducts.map(product => (<div key={product.id} className="border dark:border-slate-700 rounded-lg p-2 text-center cursor-pointer hover:bg-gray-100 dark:hover:bg-slate-700" onClick={() => addToCart(product)}>
                                <div className="font-semibold dark:text-slate-200">{product.name}</div>
                                <div className="text-gray-600 dark:text-gray-400">{Number(product.price).toFixed(2)} EGP</div>
                                <div className="text-sm text-gray-500 dark:text-gray-400">{t('pos.stock')}: {product.stock}</div>
                            </div>))}
                            {searchTerm.trim() === '' && !loading && (
                                <div className="col-span-full text-center p-8 text-slate-400 flex flex-col items-center justify-center">
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 mb-2 text-slate-300" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
                                    <span>{t('pos.startTyping')}</span>
                                </div>
                            )}
                            {searchTerm.trim() !== '' && filteredProducts.length === 0 && !loading && (
                                <div className="col-span-full text-center p-8 text-slate-400">
                                    <span>{t('pos.productNotFound')}</span>
                                </div>
                            )}
                        </div>
                    )}
                </div>
                
                <div className="bg-white dark:bg-slate-800 p-4 rounded-lg shadow-md flex flex-col">
                   <div className="flex border-b dark:border-slate-700 mb-2 flex-wrap items-center justify-between">
                        <div className="flex items-center">
                           {sessions.map((session) => (
                               <div key={session.id} className="relative group">
                                   <button onClick={() => setActiveSessionId(session.id)} className={`py-2 px-4 text-sm font-medium ${activeSessionId === session.id ? 'border-b-2 border-blue-500 text-blue-600 dark:text-blue-400' : 'text-gray-500 dark:text-gray-400 hover:text-gray-700'}`}>{session.name} {session.cart.length > 0 ? `(${session.cart.length})` : ''}</button>
                                   {sessions.length > 1 && (<button onClick={(e) => { e.stopPropagation(); handleCloseSession(session.id);}} className="absolute top-0 right-0 p-1 bg-gray-200 dark:bg-slate-600 rounded-full leading-none text-red-500 hover:text-red-700 opacity-0 group-hover:opacity-100 transition-opacity" title={`Close ${session.name}`}><svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg></button>)}
                               </div>
                           ))}
                           <button onClick={handleNewSession} className="py-2 px-3 text-blue-500 hover:bg-blue-100 dark:hover:bg-slate-700 rounded-full font-bold text-lg" title="New Session">+</button>
                        </div>
                        <div className="flex items-center space-x-2 p-2">
                            <label htmlFor="wholesaleToggle" className="font-medium text-slate-700 dark:text-slate-300 select-none">{t('pos.wholesaleSale')}</label>
                            <input type="checkbox" id="wholesaleToggle" className="h-5 w-5 rounded" checked={activeSession?.isWholesale || false} onChange={() => toggleWholesale(activeSessionId)} />
                        </div>
                    </div>
                    <h3 className="text-xl font-semibold mb-4 dark:text-white">{t('pos.shoppingCart')}</h3>
                    <div className="flex-grow overflow-y-auto max-h-[50vh] mb-4 custom-scrollbar">
                        {activeCart.length === 0 ? (<p className="dark:text-slate-400">{t('pos.emptyCart')}</p>) : (
                            activeCart.map(item => (
                                <div key={item.id} className="flex justify-between items-center mb-2 p-2 border-b dark:border-slate-700">
                                    <div onClick={() => handleOpenEditModal(item)} className="cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-700 p-1 rounded-md flex-1">
                                        <div className="font-semibold dark:text-white">{item.name}</div>
                                        <div className="text-sm text-gray-500 dark:text-gray-400">{Number(item.price).toFixed(2)} EGP x {item.quantity}</div>
                                    </div>
                                    <div className="flex items-center">
                                        <button onClick={() => updateQuantity(item.id!, item.quantity - 1)} className="px-2 border dark:border-slate-600 rounded-l">-</button>
                                        <input type="number" min="1" value={item.quantity} onChange={(e) => updateQuantity(item.id!, parseInt(e.target.value))} className="w-12 text-center border-t border-b dark:bg-slate-700 dark:border-slate-600 dark:text-white"/>
                                        <button onClick={() => updateQuantity(item.id!, item.quantity + 1)} className="px-2 border dark:border-slate-600 rounded-r">+</button>
                                       <button onClick={() => removeFromCart(item.id!)} className="text-red-500 font-bold ml-3">X</button>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                    <div className="font-bold text-xl mb-4 dark:text-white">{t('pos.total')}: {calculateTotal().toFixed(2)} EGP</div>
                    <div className="grid grid-cols-2 gap-2">
                        <button className="bg-blue-500 text-white p-3 rounded-lg w-full" onClick={handleOpenCheckout} disabled={activeCart.length === 0}>{t('pos.checkout')}</button>
                        <button className="bg-red-500 text-white p-3 rounded-lg w-full" onClick={() => updateCartForActiveSession([])} disabled={activeCart.length === 0}>{t('pos.clearCart')}</button>
                    </div>
                </div>
            </div>
            
            {/* --- All Modals --- */}
            {isCheckoutModalOpen && (() => {
                const subtotal = calculateTotal();
                const discountAmount = discountType === 'percentage' ? subtotal * (Math.max(0, discountValue) / 100) : Math.max(0, discountValue);
                const finalTotal = subtotal - discountAmount;
                const selectedCustomerDetails = customers.find(c => c.id === selectedCustomerId);
                return (
                    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                        <div className="bg-white dark:bg-slate-800 p-6 rounded-lg shadow-xl w-full max-w-3xl">
                            <h2 className="text-2xl font-bold mb-4 dark:text-white">{t('pos.finalizeSaleTitle')}</h2>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                <div className="space-y-4">
                                    <h3 className="text-lg font-semibold dark:text-white">{t('pos.payment')}</h3>
                                    {payments.map((payment, index) => ( <div key={index} className="flex items-center gap-2"> <select value={payment.method} onChange={e => handlePaymentChange(index, 'method', e.target.value)} className="p-2 border rounded w-full dark:bg-slate-700 dark:border-slate-600 dark:text-white"> <option value="cash">Cash</option> <option value="card">Card</option> <option value="wallet">E-Wallet</option> <option value="instapay">InstaPay</option> <option value="credit">On Account</option> </select> <input type="number" value={payment.amount || ''} onChange={e => handlePaymentChange(index, 'amount', Number(e.target.value))} className="p-2 border rounded w-full dark:bg-slate-700 dark:border-slate-600 dark:text-white" placeholder="Amount"/> {payments.length > 1 && <button onClick={() => removePaymentMethod(index)} className="text-red-500 font-bold">X</button>} </div> ))}
                                    <button onClick={addPaymentMethod} className="text-sm text-blue-500 hover:text-blue-400">{t('pos.addAnotherPayment')}</button>
                                    <hr className="dark:border-slate-600 my-2"/>
                                    <div>
                                        <h3 className="text-lg font-semibold dark:text-white">{t('pos.discount')}</h3>
                                        <div className="flex items-center gap-2 mt-2">
                                            <select value={discountType} onChange={e => setDiscountType(e.target.value as any)} className="p-2 border rounded dark:bg-slate-700 dark:border-slate-600 dark:text-white"> <option value="fixed">EGP</option> <option value="percentage">%</option> </select>
                                            <input type="number" value={discountValue || ''} onChange={e => setDiscountValue(Number(e.target.value))} className="p-2 border rounded w-full dark:bg-slate-700 dark:border-slate-600 dark:text-white" placeholder={t('pos.discountValue')}/>
                                        </div>
                                    </div>
                                    <hr className="dark:border-slate-600 my-2"/>
                                    <div className="space-y-2 font-medium dark:text-slate-300">
                                        <div className="flex justify-between"><span>{t('pos.subtotal')}:</span><span>{subtotal.toFixed(2)} EGP</span></div>
                                        <div className="flex justify-between text-red-500"><span>{t('pos.discount')}:</span><span>- {discountAmount.toFixed(2)} EGP</span></div>
                                        <div className="flex justify-between text-2xl font-bold text-blue-600 dark:text-blue-400 border-t dark:border-slate-600 pt-2 mt-2"><span>{t('pos.totalDue')}:</span><span>{finalTotal.toFixed(2)} EGP</span></div>
                                        <div className="flex justify-between text-lg"><span>{t('pos.totalPaid')}:</span><span>{payments.reduce((sum, p) => sum + Number(p.amount || 0), 0).toFixed(2)} EGP</span></div>
                                    </div>
                                </div>
                                <div className="space-y-4">
                                    <h3 className="text-lg font-semibold dark:text-white">{t('general.details')}</h3>
                                    <div>
                                        <div className="flex justify-between items-center">
                                            <label className="dark:text-slate-300">{t('pos.assignToCustomer')}</label>
                                            <button type="button" onClick={() => setAddCustomerModalOpen(true)} className="text-sm text-blue-500 hover:text-blue-400 font-semibold">{t('pos.addNewCustomer')}</button>
                                        </div>
                                        <input type="text" placeholder={t('pos.searchCustomer')} value={customerSearch} onChange={e => setCustomerSearch(e.target.value)} className="w-full p-2 border rounded mt-1 dark:bg-slate-700 dark:border-slate-600"/>
                                        <select value={selectedCustomerId || ''} onChange={e => setSelectedCustomerId(Number(e.target.value))} className="w-full p-2 border rounded mt-1 dark:bg-slate-700 dark:border-slate-600 dark:text-white">
                                            <option value="">{t('pos.noCustomer')}</option>
                                            {filteredCustomers.map(c => <option key={c.id} value={c.id!}>{c.name} ({c.phone})</option>)}
                                        </select>
                                        
                                        {selectedCustomerDetails && selectedCustomerDetails.address && (
                                            <div className="mt-2 p-2 bg-slate-100 dark:bg-slate-700 rounded">
                                                <p className="text-sm font-medium text-slate-600 dark:text-slate-300">{t('general.address')}:</p>
                                                <p className="text-sm text-slate-800 dark:text-slate-200">{selectedCustomerDetails.address}</p>
                                            </div>
                                        )}
                                    </div>
                                    <div>
                                        <label className="dark:text-slate-300">{t('general.notes')} (Optional)</label>
                                        <textarea value={notes} onChange={e => setNotes(e.target.value)} className="w-full p-2 border rounded mt-1 dark:bg-slate-700 dark:border-slate-600" rows={3}></textarea>
                                    </div>
                                    <div className="flex items-center">
                                        <input type="checkbox" checked={isDelivery} onChange={e => setIsDelivery(e.target.checked)} id="delivery-check" className="h-4 w-4"/>
                                        <label htmlFor="delivery-check" className="ml-2 dark:text-slate-300">{t('pos.deliveryOrder')}</label>
                                    </div>
                                </div>
                            </div>
                            <div className="mt-6 flex justify-end gap-4">
                                <button type="button" onClick={() => setCheckoutModalOpen(false)} className="bg-gray-300 dark:bg-slate-600 text-black dark:text-white font-bold py-2 px-4 rounded">{t('general.cancel')}</button>
                                <button id="complete-sale-button" onClick={() => handleFinalizeSale(subtotal, discountAmount, finalTotal)} className="bg-green-500 text-white font-bold py-2 px-4 rounded">{t('pos.completeSale')}</button>
                            </div>
                        </div>
                    </div>
                );
            })()}
            {isAddCustomerModalOpen && (<div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50"><div className="bg-white dark:bg-slate-800 p-6 rounded-lg shadow-xl w-full max-w-md">
                <h3 className="text-xl font-bold mb-4 dark:text-white">{t('customers.addNewCustomer')}</h3>
                <form onSubmit={handleAddNewCustomer}><div className="space-y-4">
                    <div><label className="block dark:text-slate-300">{t('general.name')}</label><input name="name" type="text" value={newCustomer.name} onChange={handleNewCustomerChange} className="w-full p-2 border rounded mt-1 dark:bg-slate-700 dark:border-slate-600" required/></div>
                    <div><label className="block dark:text-slate-300">{t('general.phone')} (Optional)</label><input name="phone" type="tel" value={newCustomer.phone} onChange={handleNewCustomerChange} className="w-full p-2 border rounded mt-1 dark:bg-slate-700 dark:border-slate-600"/></div>
                    <div><label className="block dark:text-slate-300">{t('general.address')} (Optional)</label><textarea name="address" value={newCustomer.address} onChange={handleNewCustomerChange} className="w-full p-2 border rounded mt-1 dark:bg-slate-700 dark:border-slate-600" rows={2}></textarea></div>
                </div><div className="mt-6 flex justify-end gap-4">
                    <button type="button" onClick={() => setAddCustomerModalOpen(false)} className="bg-gray-300 dark:bg-slate-600 text-black dark:text-white font-bold py-2 px-4 rounded">{t('general.cancel')}</button>
                    <button type="submit" className="bg-blue-500 text-white font-bold py-2 px-4 rounded">{t('customers.saveCustomer')}</button>
                </div></form>
            </div></div>)}
            {isManualSaleModalOpen && (<div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"><div className="bg-white p-6 rounded-lg shadow-xl w-full max-w-md">
                <h3 className="text-xl font-bold mb-4">{t('pos.manualSale')}</h3>
                <form onSubmit={handleManualSaleSubmit}><div className="space-y-4">
                    <div><label className="block font-medium">{t('general.name')}</label><input type="text" name="name" value={manualItem.name} onChange={handleManualItemChange} className="w-full p-2 border rounded mt-1" required autoFocus/></div>
                    <div><label className="block font-medium">{t('general.price')}</label><input type="number" name="price" value={manualItem.price} onChange={handleManualItemChange} className="w-full p-2 border rounded mt-1" required/></div>
                </div><div className="mt-6 flex justify-end gap-4">
                    <button type="button" onClick={() => setManualSaleModalOpen(false)} className="bg-gray-300 text-black font-bold py-2 px-4 rounded">{t('general.cancel')}</button>
                    <button type="submit" className="bg-green-500 text-white font-bold py-2 px-4 rounded">{t('pos.addToCart', 'Add to Cart')}</button>
                </div></form>
            </div></div>)}
             {isEditItemModalOpen && editingItem && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                    <div className="bg-white dark:bg-slate-800 p-6 rounded-lg shadow-xl w-full max-w-md">
                        <h3 className="text-xl font-bold mb-4 dark:text-white">{t('pos.editCartItem', 'Edit Cart Item')}</h3>
                        <div className="space-y-4">
                            <div>
                                <label className="block font-medium dark:text-slate-300">{t('general.name')}</label>
                                <input type="text" name="name" value={editingItem.name} onChange={handleEditItemChange} className="w-full p-2 border rounded mt-1 dark:bg-slate-700 dark:border-slate-600 dark:text-white"/>
                            </div>
                             <div>
                                <label className="block font-medium dark:text-slate-300">{t('general.price')}</label>
                                <input type="number" name="price" value={editingItem.price} onChange={handleEditItemChange} className="w-full p-2 border rounded mt-1 dark:bg-slate-700 dark:border-slate-600 dark:text-white"/>
                            </div>
                        </div>
                        <div className="mt-6 flex justify-end gap-4">
                            <button type="button" onClick={() => setEditItemModalOpen(false)} className="bg-gray-300 dark:bg-slate-600 text-black dark:text-white font-bold py-2 px-4 rounded">{t('general.cancel')}</button>
                            <button type="button" onClick={handleUpdateEditedItem} className="bg-green-500 text-white font-bold py-2 px-4 rounded">{t('pos.saveChanges', 'Save Changes')}</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

export default POS;