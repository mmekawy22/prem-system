import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import type { Customer } from '../../db';

const API_URL = 'http://192.168.1.20:3001';
// [START_ADDITION]
// نوع البيانات الذي نتوقع استقباله من الـ
// endpoint الجديد
type CustomerHistoryItem = {
  type: 'Sale' | 'Return';
  timestamp: number;
  reference_id: number;
  product_name: string;
  quantity: number;
  price: number;
};
// [END_ADDITION]

function Customers() {
  const { t } = useTranslation();
  
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [newCustomer, setNewCustomer] = useState({ name: '', phone: '', email: '', address: '' });
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);
// [START_ADDITION]
  // State لإدارة نافذة السجل
  const [isHistoryModalOpen, setIsHistoryModalOpen] = useState(false);
  const [historyData, setHistoryData] = useState<CustomerHistoryItem[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  // [END_ADDITION]
// [START_ADDITION]
  // State جديد لمصطلح البحث
  const [searchTerm, setSearchTerm] = useState('');
  // [END_ADDITION]
 // [START_MODIFICATION]
  // تعديل دالة جلب العملاء لتقبل مصطلح البحث
  const fetchCustomers = async (currentSearchTerm: string) => {
    setLoading(true);
    try {
      // بناء الرابط مع مصطلح البحث
      const url = new URL(`${API_URL}/api/customers`);
      if (currentSearchTerm) {
        url.searchParams.append('q', currentSearchTerm);
      }

      const response = await fetch(url.toString());
      if (!response.ok) throw new Error('Network response was not ok');
      const data = await response.json();
      setCustomers(data);
    } catch (error) {
      console.error("Failed to fetch customers:", error);
      alert(t('customers.fetchError', 'Failed to fetch customers.'));
    } finally {
      setLoading(false);
    }
  };
  // [END_MODIFICATION]

 // [START_MODIFICATION]
  // تعديل useEffect لاستدعاء البحث عند تغيير searchTerm
  // مع إضافة "debounce" (تأخير) 300ms
  useEffect(() => {
    const delayDebounceFn = setTimeout(() => {
      // هذا الكود سيعمل بعد 300ms من توقف المستخدم عن الكتابة
      fetchCustomers(searchTerm);
    }, 300); // 300ms delay

    // إلغاء المؤقت إذا كتب المستخدم حرفاً جديداً
    return () => clearTimeout(delayDebounceFn);
  }, [searchTerm]); // إعادة التشغيل عند تغيير searchTerm
  // [END_MODIFICATION]

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setNewCustomer(prev => ({ ...prev, [name]: value }));
  };

  const handleAddCustomer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCustomer.name) {
      alert(t('customers.nameRequired', 'Customer name is required.'));
      return;
    }
    try {
        const response = await fetch(`${API_URL}/api/customers`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(newCustomer)
        });
        if (!response.ok) throw new Error('Failed to create customer');
      
      alert(t('customers.addSuccess', 'Customer added successfully!'));
      setNewCustomer({ name: '', phone: '', email: '', address: '' });
     fetchCustomers(searchTerm);
    } catch (error) {
      console.error("Failed to add customer:", error);
      alert(t('customers.addError', 'Failed to add customer.'));
    }
  };

  const handleDeleteCustomer = async (id: number) => {
    if (window.confirm(t('customers.confirmDelete', 'Are you sure you want to delete this customer?'))) {
      try {
        const response = await fetch(`${API_URL}/api/customers/${id}`, { method: 'DELETE' });
        if (!response.ok) throw new Error('Failed to delete customer');
        
        alert(t('customers.deleteSuccess', 'Customer deleted successfully!'));
        fetchCustomers(searchTerm);
      } catch (error) {
        console.error("Failed to delete customer:", error);
        alert(t('customers.deleteError', 'Failed to delete customer.'));
      }
    }
  };

  const handleEditClick = (customer: Customer) => {
    setEditingCustomer(customer);
    setIsModalOpen(true);
  };

  const handleModalClose = () => {
    setIsModalOpen(false);
    setEditingCustomer(null);
  };

  const handleModalChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    if (editingCustomer) {
      setEditingCustomer({ ...editingCustomer, [name]: value });
    }
  };

  const handleUpdateCustomer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingCustomer || !editingCustomer.id) return;
    try {
        const response = await fetch(`${API_URL}/api/customers/${editingCustomer.id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(editingCustomer)
        });
        if (!response.ok) throw new Error('Failed to update customer');

      alert(t('customers.updateSuccess', 'Customer updated successfully!'));
      handleModalClose();
      fetchCustomers(searchTerm);
    } catch (error) {
      console.error("Failed to update customer:", error);
      alert(t('customers.updateError', 'Failed to update customer.'));
    }
  };
// [START_ADDITION]
  // دالة فتح نافذة السجل وجلب البيانات
  const handleHistoryClick = async (customer: Customer) => {
    if (!customer.id) return;
    setSelectedCustomer(customer);
    setIsHistoryModalOpen(true);
    setHistoryLoading(true);
    setHistoryData([]); // تفريغ البيانات القديمة

    try {
      const response = await fetch(`${API_URL}/api/customers/${customer.id}/product-history`);
      if (!response.ok) throw new Error('Failed to fetch history');
      const data: CustomerHistoryItem[] = await response.json();
      setHistoryData(data);
    } catch (error) {
      console.error("Failed to fetch customer history:", error);
      alert(t('customers.history.fetchError', 'Failed to fetch customer history.'));
    } finally {
      setHistoryLoading(false);
    }
  };

  const handleHistoryModalClose = () => {
    setIsHistoryModalOpen(false);
    setSelectedCustomer(null);
    setHistoryData([]);
  };
  // [END_ADDITION]

  return (
    <div className="p-6">
      <h2 className="text-2xl font-bold mb-4">{t('customers.title', 'Customer Management')}</h2>

      <div className="bg-white p-4 rounded-lg shadow-md mb-6">
        <h3 className="text-xl font-semibold mb-4">{t('customers.addNew', 'Add New Customer')}</h3>
        <form onSubmit={handleAddCustomer} className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <input type="text" name="name" value={newCustomer.name} onChange={handleInputChange} placeholder={t('customers.name', 'Name')} className="p-2 border rounded" required />
          <input type="tel" name="phone" value={newCustomer.phone} onChange={handleInputChange} placeholder={t('customers.phone', 'Phone')} className="p-2 border rounded" />
          <input type="email" name="email" value={newCustomer.email} onChange={handleInputChange} placeholder={t('customers.email', 'Email')} className="p-2 border rounded md:col-span-2" />
          <textarea name="address" value={newCustomer.address} onChange={handleInputChange} placeholder={t('customers.address', 'Address')} className="p-2 border rounded md:col-span-2" rows={2}></textarea>
          <button type="submit" className="md:col-span-2 bg-blue-500 hover:bg-blue-600 text-white font-bold py-2 px-4 rounded">
            {t('customers.save', 'Save Customer')}
          </button>
        </form>
      </div>

      <div className="bg-white p-4 rounded-lg shadow-md">
        <h3 className="text-xl font-semibold mb-4">{t('customers.list', 'Customer List')}</h3>
{/* [START_ADDITION] */}
        {/* إضافة حقل البحث */}
        <div className="mb-4">
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder={t('customers.searchPlaceholder', 'Search by name, phone, or email...')}
            className="w-full p-2 border rounded"
          />
        </div>
        {/* [END_ADDITION] */}
        <div className="overflow-x-auto">
          <table className="min-w-full bg-white">
            <thead className="bg-gray-100">
              <tr>
                <th className="py-2 px-4 border-b text-left">{t('customers.name', 'Name')}</th>
                <th className="py-2 px-4 border-b text-left">{t('customers.phone', 'Phone')}</th>
                <th className="py-2 px-4 border-b text-left">{t('customers.email', 'Email')}</th>
                <th className="py-2 px-4 border-b text-center">{t('customers.points', 'Loyalty Points')}</th>
                <th className="py-2 px-4 border-b text-center">{t('customers.actions', 'Actions')}</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={5} className="text-center p-4">Loading...</td></tr>
              ) : (
                customers.map(customer => (
                  <tr key={customer.id}>
                    <td className="py-2 px-4 border-b">{customer.name}</td>
                    <td className="py-2 px-4 border-b">{customer.phone}</td>
                      <td className="py-2 px-4 border-b">{customer.email}</td>
                    <td className="py-2 px-4 border-b text-center">{customer.loyalty_points}</td>
                    <td className="py-2 px-4 border-b text-center">
                      {/* [START_ADDITION] تعديل الأزرار */}
                      <button onClick={() => handleEditClick(customer)} className="text-blue-500 hover:underline mr-4">{t('customers.actions.edit', 'Edit')}</button>
                      <button onClick={() => handleHistoryClick(customer)} className="text-green-500 hover:underline mr-4">{t('customers.actions.history', 'History')}</button>
                      <button onClick={() => handleDeleteCustomer(customer.id!)} className="text-red-500 hover:underline">{t('customers.actions.delete', 'Delete')}</button>
                      {/* [END_ADDITION] */}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {isModalOpen && editingCustomer && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-lg shadow-xl w-full max-w-lg">
            <h3 className="text-2xl font-bold mb-4">{t('customers.editTitle', 'Edit Customer')}</h3>
            <form onSubmit={handleUpdateCustomer}>
              <div className="space-y-4">
                <input type="text" name="name" value={editingCustomer.name} onChange={handleModalChange} placeholder={t('customers.name', 'Name')} className="w-full p-2 border rounded" required />
                <input type="tel" name="phone" value={editingCustomer.phone || ''} onChange={handleModalChange} placeholder={t('customers.phone', 'Phone')} className="w-full p-2 border rounded" />
                <input type="email" name="email" value={editingCustomer.email || ''} onChange={handleModalChange} placeholder={t('customers.email', 'Email')} className="w-full p-2 border rounded" />
                <textarea name="address" value={editingCustomer.address || ''} onChange={handleModalChange} placeholder={t('customers.address', 'Address')} className="w-full p-2 border rounded" rows={3}></textarea>
              </div>
              <div className="mt-6 flex justify-end gap-4">
                <button type="button" onClick={handleModalClose} className="bg-gray-300 hover:bg-gray-400 text-black font-bold py-2 px-4 rounded">Cancel</button>
                <button type="submit" className="bg-blue-500 hover:bg-blue-600 text-white font-bold py-2 px-4 rounded">Save Changes</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* [START_ADDITION] */}
      {/* نافذة عرض سجل المشتريات */}
      {isHistoryModalOpen && selectedCustomer && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-lg shadow-xl w-full max-w-3xl"> {/* حجم أكبر */}
            <h3 className="text-2xl font-bold mb-4">
              {t('customers.history.title', 'Purchase History for: {customerName}', { customerName: selectedCustomer.name })}
            </h3>
            <div className="overflow-y-auto max-h-[60vh]"> {/* لجعل الجدول قابل للتمرير */}
              {historyLoading ? (
                <p className="text-center p-4">{t('customers.history.loading', 'Loading history...')}</p>
              ) : historyData.length === 0 ? (
                <p className="text-center p-4">{t('customers.history.empty', 'No history found for this customer.')}</p>
              ) : (
                <table className="min-w-full bg-white text-sm">
                  <thead className="bg-gray-100 sticky top-0">
                    <tr>
                      <th className="py-2 px-3 border-b text-left">{t('customers.history.date', 'Date')}</th>
                      <th className="py-2 px-3 border-b text-left">{t('customers.history.type', 'Type')}</th>
                      <th className="py-2 px-3 border-b text-left">{t('customers.history.product', 'Product')}</th>
                      <th className="py-2 px-3 border-b text-center">{t('customers.history.quantity', 'Quantity')}</th>
                      <th className="py-2 px-3 border-b text-right">{t('customers.history.price', 'Unit Price')}</th>
                    </tr>
                D </thead>
                  <tbody>
                    {historyData.map((item, index) => (
                      <tr key={index} className="hover:bg-gray-50">
                        <td className="py-2 px-3 border-b">{new Date(item.timestamp).toLocaleString()}</td>
                        <td className="py-2 px-3 border-b">
                          {item.type === 'Sale' ? (
                            <span className="text-green-600 font-medium">{t('customers.history.types.sale', 'Sale')}</span>
                          ) : (
                            <span className="text-red-600 font-medium">{t('customers.history.types.return', 'Return')}</span>
                          )}
                        </td>
                        <td className="py-2 px-3 border-b">{item.product_name}</td>
                        <td className="py-2 px-3 border-b text-center font-medium">
                          {/* عرض المرتجع بالسالب */}
                          {item.type === 'Sale' ? item.quantity : -item.quantity}
                        </td>
                        <td className="py-2 px-3 border-b text-right">{item.price.toFixed(2)}</td>
g                     </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
            <div className="mt-6 flex justify-end">
              <button type="button" onClick={handleHistoryModalClose} className="bg-gray-300 hover:bg-gray-400 text-black font-bold py-2 px-4 rounded">
                {t('customers.history.close', 'Close')}
              </button>
            </div>
          </div>
        </div>
      )}
      {/* [END_ADDITION] */}

    </div>
  );
}

export default Customers;