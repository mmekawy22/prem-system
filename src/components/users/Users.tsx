import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';

const API_URL = 'http://localhost:3001/api';

// This is the full User type including the permissions string from the server
interface User {
  id: number;
  username: string;
  role: string;
  permissions: string; // Stored as a JSON string
}

const allPermissions = [
  'view_dashboard', 'use_pos', 'manage_inventory', 'process_returns',
  'manage_customers', 'manage_suppliers', 'manage_purchases', 'view_all_transactions',
  'manage_expenses', 'manage_users', 'view_reports', 'search_receipts',
  'close_shift', 'view_shift_history', 'manage_settings',"view_sold_products"
];

function Users() {
  const { t } = useTranslation();
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<Partial<User> & { password?: string } | null>(null);
  const [userPermissions, setUserPermissions] = useState<{ [key: string]: boolean }>({});

  const fetchUsers = async () => {
    setLoading(true);
    try {
        const response = await fetch(`${API_URL}/users`);
        if (!response.ok) throw new Error('Failed to fetch users');
        const allUsers = await response.json();
        setUsers(allUsers);
    } catch (error) {
        console.error("Failed to fetch users from server:", error);
        alert('Failed to fetch users.');
    } finally {
        setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const handleOpenModal = (user: User | null = null) => {
    if (user) {
      setEditingUser({ ...user, password: '' });
      // Safely parse permissions from the server
      try {
        setUserPermissions(user.permissions ? JSON.parse(user.permissions) : {});
      } catch {
        setUserPermissions({});
      }
    } else {
      setEditingUser({ username: '', role: 'cashier', password: '' });
      setUserPermissions({});
    }
    setIsModalOpen(true);
  };

  const handleModalClose = () => {
    setIsModalOpen(false);
    setEditingUser(null);
    setUserPermissions({});
  };

  const handleModalChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    if (editingUser) {
      setEditingUser({ ...editingUser, [name]: value });
    }
  };
  
  const handlePermissionChange = (permission: string, isChecked: boolean) => {
    setUserPermissions(prev => ({ ...prev, [permission]: isChecked }));
  };

  const handleSaveUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingUser || !editingUser.username || (!editingUser.id && !editingUser.password)) {
      alert('Username and password are required for new users.');
      return;
    }

    // This is the data object we will send to the backend
    const userData = {
        ...editingUser,
        permissions: userPermissions, // Send as an object
    };

    const url = userData.id ? `${API_URL}/users/${userData.id}` : `${API_URL}/users`;
    const method = userData.id ? 'PUT' : 'POST';

    try {
        const response = await fetch(url, {
            method: method,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(userData),
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || 'Failed to save user.');
        }

        alert(`User ${userData.id ? 'updated' : 'added'} successfully!`);
        handleModalClose();
        fetchUsers();

    } catch (error) {
      console.error("Failed to save user:", error);
      alert(`Failed to save user: ${error}`);
    }
  };

  const handleDeleteUser = async (id: number) => {
    if (window.confirm('Are you sure you want to delete this user? This action cannot be undone.')) {
      try {
          const response = await fetch(`${API_URL}/users/${id}`, { method: 'DELETE' });

          if (!response.ok) {
              const errorData = await response.json();
              throw new Error(errorData.error || 'Failed to delete user.');
          }
          alert('User deleted successfully!');
          fetchUsers();
      } catch (error) {
        console.error("Failed to delete user:", error);
        alert(`Failed to delete user: ${error}`);
      }
    }
  };

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-2xl font-bold">{t('users.title', 'Users & Roles')}</h2>
        <button onClick={() => handleOpenModal()} className="bg-blue-500 hover:bg-blue-600 text-white font-bold py-2 px-4 rounded">
          {t('users.addNew', 'Add New User')}
        </button>
      </div>

      <div className="bg-white p-4 rounded-lg shadow-md overflow-x-auto">
        <table className="min-w-full bg-white">
          <thead className="bg-gray-100">
            <tr>
              <th className="py-2 px-4 border-b text-left">Username</th>
              <th className="py-2 px-4 border-b text-left">Role</th>
              <th className="py-2 px-4 border-b text-center">Actions</th>
            </tr>
          </thead>
          <tbody>
            {users.map(user => (
              <tr key={user.id}>
                <td className="py-2 px-4 border-b">{user.username}</td>
                <td className="py-2 px-4 border-b capitalize">{user.role}</td>
                <td className="py-2 px-4 border-b text-center">
                  <button onClick={() => handleOpenModal(user)} className="text-blue-500 hover:underline mr-4">Edit</button>
                  <button onClick={() => handleDeleteUser(user.id)} className="text-red-500 hover:underline">Delete</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {isModalOpen && editingUser && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-lg shadow-xl w-full max-w-2xl">
            <h3 className="text-2xl font-bold mb-4">{editingUser.id ? 'Edit User' : 'Add New User'}</h3>
            <form onSubmit={handleSaveUser}>
              <div className="grid grid-cols-2 gap-4 mb-4">
                <input type="text" name="username" value={editingUser.username} onChange={handleModalChange} placeholder="Username" className="p-2 border rounded" required />
                <input type="password" name="password" onChange={handleModalChange} placeholder={editingUser.id ? "New Password (optional)" : "Password"} className="p-2 border rounded" required={!editingUser.id} />
                <select name="role" value={editingUser.role} onChange={handleModalChange} className="p-2 border rounded col-span-2">
                  <option value="cashier">Cashier</option>
                  <option value="staff">Staff</option>
                  <option value="admin">Admin</option>
                </select>
              </div>
              
              <h4 className="text-lg font-semibold mt-6 mb-2">Permissions</h4>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-2 border p-4 rounded-md max-h-48 overflow-y-auto">
                {allPermissions.map(perm => (
                  <label key={perm} className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      checked={!!userPermissions[perm]}
                      onChange={(e) => handlePermissionChange(perm, e.target.checked)}
                      className="h-4 w-4"
                    />
                    <span className="text-sm capitalize">{perm.replace(/_/g, ' ')}</span>
                  </label>
                ))}
              </div>

              <div className="mt-6 flex justify-end gap-4">
                <button type="button" onClick={handleModalClose} className="bg-gray-300 hover:bg-gray-400 text-black font-bold py-2 px-4 rounded">Cancel</button>
                <button type="submit" className="bg-blue-500 hover:bg-blue-600 text-white font-bold py-2 px-4 rounded">Save</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default Users;