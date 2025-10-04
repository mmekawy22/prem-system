import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';

const API_URL = 'http://localhost:3001/api';

// This interface now includes all the advanced settings
interface Settings {
  store_name: string;
  store_logo: string | null;
  address: string;
  phone: string;
  email: string;
  website: string;
  receipt_footer: string;
  currency_symbol: string;
  currency_code: string;
  tax_rate: number;
  enable_discounts: boolean;
  tax_mode: 'inclusive' | 'exclusive';
  allow_overselling: boolean;
  enable_wholesale: boolean;
  default_customer_id: number | null;
}

// A simple interface for the customer dropdown
interface Customer {
    id: number;
    name: string;
}

function SettingsPage() {
    const { t } = useTranslation();
    const [settings, setSettings] = useState<Partial<Settings>>({});
    const [customers, setCustomers] = useState<Customer[]>([]);
    const [loading, setLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);

    useEffect(() => {
        fetchSettings();
        fetchCustomers();
    }, []);

    const fetchSettings = async () => {
        setLoading(true);
        try {
            const response = await fetch(`${API_URL}/settings`);
            if (!response.ok) throw new Error("Could not fetch settings.");
            const data = await response.json();
            setSettings(data);
        } catch (error) {
            console.error(error);
            alert("Failed to load settings.");
        } finally {
            setLoading(false);
        }
    };
    
    const fetchCustomers = async () => {
        try {
            const response = await fetch(`${API_URL}/customers`);
            if (!response.ok) throw new Error("Could not fetch customers.");
            const data = await response.json();
            setCustomers(data);
        } catch (error) {
            console.error(error);
        }
    };

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
        const { name, value, type } = e.target;
        
        let processedValue: string | number | boolean | null = value;

        if (type === 'checkbox') {
            processedValue = (e.target as HTMLInputElement).checked;
        } else if (type === 'number' || name === 'default_customer_id') {
            processedValue = value ? parseFloat(value) : null;
        }

        setSettings(prev => ({ ...prev, [name]: processedValue }));
    };

    const handleLogoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            const file = e.target.files[0];
            const reader = new FileReader();
            reader.onloadend = () => {
                setSettings(prev => ({ ...prev, store_logo: reader.result as string }));
            };
            reader.readAsDataURL(file);
        }
    };

    const handleSave = async () => {
        setIsSaving(true);
        try {
            const response = await fetch(`${API_URL}/settings`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(settings),
            });
            if (!response.ok) throw new Error("Failed to save settings.");
            alert("Settings saved successfully!");
        } catch (error) {
            console.error(error);
            alert("Failed to save settings.");
        } finally {
            setIsSaving(false);
        }
    };

    if (loading) return <div>Loading settings...</div>;

    return (
        <div className="p-6">
            <h2 className="text-2xl font-bold mb-6">{t('settings.title', 'Application Settings')}</h2>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="md:col-span-2 space-y-6">
                    {/* Store Information Section */}
                    <div className="bg-white p-6 rounded-lg shadow-md">
                        <h3 className="text-lg font-semibold border-b pb-2 mb-4">Store Information</h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <InputField label="Store Name" name="store_name" value={settings.store_name} onChange={handleInputChange} />
                            <InputField label="Phone" name="phone" value={settings.phone} onChange={handleInputChange} />
                            <InputField label="Email Address" name="email" value={settings.email} onChange={handleInputChange} type="email" />
                            <InputField label="Website" name="website" value={settings.website} onChange={handleInputChange} />
                            <TextAreaField label="Address" name="address" value={settings.address} onChange={handleInputChange} />
                        </div>
                    </div>

                    {/* Receipt & Currency Section */}
                    <div className="bg-white p-6 rounded-lg shadow-md">
                        <h3 className="text-lg font-semibold border-b pb-2 mb-4">Currency & Receipt</h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <InputField label="Currency Symbol" name="currency_symbol" value={settings.currency_symbol} onChange={handleInputChange} />
                            <InputField label="Currency Code" name="currency_code" value={settings.currency_code} onChange={handleInputChange} />
                            <InputField label="Tax Rate (%)" name="tax_rate" value={settings.tax_rate} onChange={handleInputChange} type="number" step="0.01" />
                            <TextAreaField label="Receipt Footer Message" name="receipt_footer" value={settings.receipt_footer} onChange={handleInputChange} rows={2} />
                        </div>
                    </div>

                    {/* ✅ New Business Logic Section */}
                    <div className="bg-white p-6 rounded-lg shadow-md">
                        <h3 className="text-lg font-semibold border-b pb-2 mb-4">Business Logic</h3>
                        <div className="space-y-4">
                            <SelectField label="Tax Mode" name="tax_mode" value={settings.tax_mode} onChange={handleInputChange} options={[{value: 'exclusive', label: 'Tax is added to item price (Exclusive)'}, {value: 'inclusive', label: 'Item price already includes tax (Inclusive)'}]} />
                            <SelectField label="Default Customer for Sales" name="default_customer_id" value={settings.default_customer_id} onChange={handleInputChange} options={[{value: '', label: 'None - Require customer selection'}, ...customers.map(c => ({ value: c.id, label: c.name }))]} />
                            <CheckboxField label="Allow selling products with zero stock (Overselling)" name="allow_overselling" checked={settings.allow_overselling} onChange={handleInputChange} />
                            <CheckboxField label="Enable product discounts in POS" name="enable_discounts" checked={settings.enable_discounts} onChange={handleInputChange} />
                            <CheckboxField label="Enable wholesale pricing tier" name="enable_wholesale" checked={settings.enable_wholesale} onChange={handleInputChange} />
                        </div>
                    </div>
                </div>

                {/* Right Column: Logo */}
                <div className="md:col-span-1">
                    <div className="bg-white p-6 rounded-lg shadow-md">
                        <h3 className="text-lg font-semibold border-b pb-2 mb-4">Store Logo</h3>
                        <div className="flex flex-col items-center">
                            {settings.store_logo ? <img src={settings.store_logo} alt="Store Logo" className="w-32 h-32 object-contain mb-4 border p-2" /> : <div className="w-32 h-32 bg-gray-100 flex items-center justify-center text-gray-400 mb-4">No Logo</div>}
                            <input type="file" onChange={handleLogoChange} accept="image/png, image/jpeg" className="text-sm" />
                            <p className="text-xs text-gray-500 mt-2">Recommended: PNG format.</p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Save Button */}
            <div className="mt-6 flex justify-end">
                <button onClick={handleSave} disabled={isSaving} className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-6 rounded-lg disabled:bg-blue-400">
                    {isSaving ? 'Saving...' : 'Save Settings'}
                </button>
            </div>
        </div>
    );
}

// ### Define Prop Types ###

// For InputField
interface InputFieldProps {
    label: string;
    name: string;
    value?: string | number;
    onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
    type?: string;
    step?: string | number;
}

// For TextAreaField
interface TextAreaFieldProps {
    label: string;
    name: string;
    value?: string;
    onChange: (e: React.ChangeEvent<HTMLTextAreaElement>) => void;
    rows?: number;
}

// For CheckboxField
interface CheckboxFieldProps {
    label: string;
    name: string;
    checked?: boolean;
    onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
}

// For SelectField options
interface SelectOption {
    value: string | number;
    label: string;
}

// For SelectField
interface SelectFieldProps {
    label:string;
    name: string;
    value?: string | number | null;
    onChange: (e: React.ChangeEvent<HTMLSelectElement>) => void;
    options: SelectOption[];
}


// ### Corrected Helper Components ###

const InputField = ({ label, name, value, onChange, type = 'text', step }: InputFieldProps) => (
    <div>
        <label htmlFor={name} className="block text-sm font-medium text-gray-700">{label}</label>
        <input 
            type={type} 
            id={name} 
            name={name} 
            value={value || ''} 
            onChange={onChange} 
            step={step} 
            className="mt-1 block w-full p-2 border border-gray-300 rounded-md" 
        />
    </div>
);

const TextAreaField = ({ label, name, value, onChange, rows = 3 }: TextAreaFieldProps) => (
    <div className="md:col-span-2">
        <label htmlFor={name} className="block text-sm font-medium text-gray-700">{label}</label>
        <textarea 
            name={name} 
            id={name} 
            value={value || ''} 
            onChange={onChange} 
            className="mt-1 block w-full p-2 border border-gray-300 rounded-md" 
            rows={rows}>
        </textarea>
    </div>
);

const CheckboxField = ({ label, name, checked, onChange }: CheckboxFieldProps) => (
    <div className="flex items-center">
        <input 
            type="checkbox" 
            id={name} 
            name={name} 
            checked={!!checked} 
            onChange={onChange} 
            className="h-4 w-4 rounded" 
        />
        <label htmlFor={name} className="ml-2 block text-sm text-gray-900">{label}</label>
    </div>
);

const SelectField = ({ label, name, value, onChange, options = [] }: SelectFieldProps) => (
     <div>
        <label htmlFor={name} className="block text-sm font-medium text-gray-700">{label}</label>
        <select 
            id={name} 
            name={name} 
            value={value || ''} 
            onChange={onChange} 
            className="mt-1 block w-full p-2 border border-gray-300 rounded-md"
        >
            {options.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
        </select>
    </div>
);

export default SettingsPage;