import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import type { Supplier } from '../../db';

const API_URL = 'http://localhost:3001';

function Suppliers() {
  const { t } = useTranslation();
  
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [newSupplier, setNewSupplier] = useState({ name: '', contact_person: '', phone: '', email: '', address: '' });
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingSupplier, setEditingSupplier] = useState<Supplier | null>(null);

  const fetchSuppliers = async () => {
    setLoading(true);
    try {
        const response = await fetch(`${API_URL}/api/suppliers`);
        if (!response.ok) throw new Error('Network response was not ok');
        const data = await response.json();
        setSuppliers(data);
    } catch (error) {
        console.error("Failed to fetch suppliers:", error);
        alert(t('suppliers.fetchError', 'Failed to fetch suppliers.'));
    } finally {
        setLoading(false);
    }
  };

  useEffect(() => {
    fetchSuppliers();
  }, []);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setNewSupplier(prev => ({ ...prev, [name]: value }));
  };

  const handleAddSupplier = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSupplier.name) {
      alert(t('suppliers.nameRequired', 'Supplier name is required.'));
      return;
    }
    try {
        const response = await fetch(`${API_URL}/api/suppliers`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(newSupplier)
        });
        if (!response.ok) {
            const errData = await response.json();
            throw new Error(errData.error || 'Failed to create supplier');
        }
      
      alert(t('suppliers.addSuccess', 'Supplier added successfully!'));
      setNewSupplier({ name: '', contact_person: '', phone: '', email: '', address: '' });
      fetchSuppliers();
    } catch (error) {
      console.error("Failed to add supplier:", error);
      alert(t('suppliers.addError', `Failed to add supplier: ${error instanceof Error ? error.message : 'Unknown error'}`));
    }
  };

  const handleDeleteSupplier = async (id: number) => {
    if (window.confirm(t('suppliers.confirmDelete', 'Are you sure you want to delete this supplier?'))) {
      try {
        const response = await fetch(`${API_URL}/api/suppliers/${id}`, { method: 'DELETE' });
        if (!response.ok) throw new Error('Failed to delete supplier');
        
        alert(t('suppliers.deleteSuccess', 'Supplier deleted successfully!'));
        fetchSuppliers();
      } catch (error) {
        console.error("Failed to delete supplier:", error);
        alert(t('suppliers.deleteError', 'Failed to delete supplier.'));
      }
    }
  };

  const handleEditClick = (supplier: Supplier) => {
    setEditingSupplier(supplier);
    setIsModalOpen(true);
  };

  const handleModalClose = () => {
    setIsModalOpen(false);
    setEditingSupplier(null);
  };

  const handleModalChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    if (editingSupplier) {
      setEditingSupplier({ ...editingSupplier, [name]: value });
    }
  };

  const handleUpdateSupplier = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingSupplier || !editingSupplier.id) return;
    try {
        const response = await fetch(`${API_URL}/api/suppliers/${editingSupplier.id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(editingSupplier)
        });
        if (!response.ok) throw new Error('Failed to update supplier');

      alert(t('suppliers.updateSuccess', 'Supplier updated successfully!'));
      handleModalClose();
      fetchSuppliers();
    } catch (error) {
      console.error("Failed to update supplier:", error);
      alert(t('suppliers.updateError', 'Failed to update supplier.'));
    }
  };

  return (
    <div className="p-6">
      <h2 className="text-2xl font-bold mb-4">{t('suppliers.title', 'Supplier Management')}</h2>

      <div className="bg-white p-4 rounded-lg shadow-md mb-6">
        <h3 className="text-xl font-semibold mb-4">{t('suppliers.addNew', 'Add New Supplier')}</h3>
        <form onSubmit={handleAddSupplier} className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <input type="text" name="name" value={newSupplier.name} onChange={handleInputChange} placeholder={t('suppliers.name', 'Company Name')} className="p-2 border rounded md:col-span-2" required />
          <input type="text" name="contact_person" value={newSupplier.contact_person} onChange={handleInputChange} placeholder={t('suppliers.contact_person', 'Contact Person')} className="p-2 border rounded" />
          <input type="tel" name="phone" value={newSupplier.phone} onChange={handleInputChange} placeholder={t('suppliers.phone', 'Phone')} className="p-2 border rounded" />
          <input type="email" name="email" value={newSupplier.email} onChange={handleInputChange} placeholder={t('suppliers.email', 'Email')} className="p-2 border rounded md:col-span-2" />
          <textarea name="address" value={newSupplier.address} onChange={handleInputChange} placeholder={t('suppliers.address', 'Address')} className="p-2 border rounded md:col-span-2" rows={2}></textarea>
          <button type="submit" className="md:col-span-2 bg-blue-500 hover:bg-blue-600 text-white font-bold py-2 px-4 rounded">
            {t('suppliers.save', 'Save Supplier')}
          </button>
        </form>
      </div>

      <div className="bg-white p-4 rounded-lg shadow-md">
        <h3 className="text-xl font-semibold mb-4">{t('suppliers.list', 'Supplier List')}</h3>
        <div className="overflow-x-auto">
          <table className="min-w-full bg-white">
            <thead className="bg-gray-100">
              <tr>
                <th className="py-2 px-4 border-b text-left">{t('suppliers.name', 'Name')}</th>
                <th className="py-2 px-4 border-b text-left">{t('suppliers.contact_person', 'Contact Person')}</th>
                <th className="py-2 px-4 border-b text-left">{t('suppliers.phone', 'Phone')}</th>
                <th className="py-2 px-4 border-b text-center">{t('suppliers.actions', 'Actions')}</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={4} className="text-center p-4">Loading...</td></tr>
              ) : (
                suppliers.map(supplier => (
                  <tr key={supplier.id}>
                    <td className="py-2 px-4 border-b">{supplier.name}</td>
                    <td className="py-2 px-4 border-b">{supplier.contact_person}</td>
                    <td className="py-2 px-4 border-b">{supplier.phone}</td>
                    <td className="py-2 px-4 border-b text-center">
                      <button onClick={() => handleEditClick(supplier)} className="text-blue-500 hover:underline mr-4">Edit</button>
                      <button onClick={() => handleDeleteSupplier(supplier.id!)} className="text-red-500 hover:underline">Delete</button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {isModalOpen && editingSupplier && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-lg shadow-xl w-full max-w-lg">
            <h3 className="text-2xl font-bold mb-4">{t('suppliers.editTitle', 'Edit Supplier')}</h3>
            <form onSubmit={handleUpdateSupplier}>
              <div className="space-y-4">
                <input type="text" name="name" value={editingSupplier.name} onChange={handleModalChange} placeholder={t('suppliers.name', 'Company Name')} className="w-full p-2 border rounded" required />
                <input type="text" name="contact_person" value={editingSupplier.contact_person || ''} onChange={handleModalChange} placeholder={t('suppliers.contact_person', 'Contact Person')} className="w-full p-2 border rounded" />
                <input type="tel" name="phone" value={editingSupplier.phone || ''} onChange={handleModalChange} placeholder={t('suppliers.phone', 'Phone')} className="w-full p-2 border rounded" />
                <input type="email" name="email" value={editingSupplier.email || ''} onChange={handleModalChange} placeholder={t('suppliers.email', 'Email')} className="w-full p-2 border rounded" />
                <textarea name="address" value={editingSupplier.address || ''} onChange={handleModalChange} placeholder={t('suppliers.address', 'Address')} className="w-full p-2 border rounded" rows={3}></textarea>
              </div>
              <div className="mt-6 flex justify-end gap-4">
                <button type="button" onClick={handleModalClose} className="bg-gray-300 hover:bg-gray-400 text-black font-bold py-2 px-4 rounded">Cancel</button>
                <button type="submit" className="bg-blue-500 hover:bg-blue-600 text-white font-bold py-2 px-4 rounded">Save Changes</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default Suppliers;