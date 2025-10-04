import { useState } from 'react';
import { useTranslation } from 'react-i18next';
// ✅ تم استبدال استيراد قاعدة البيانات باستيراد useAuth لجلب بيانات المستخدم
import { useAuth } from '../../context/UserContext'; 

// ✅ تم تعديل الواجهات لتناسب البيانات القادمة من الخادم
interface TransactionItemAPI {
  id: number; // This is transaction_items.id
  transaction_id: number;
  product_id: number;
  quantity: number;
  price: number;
  discount: number;
  productName: string;
}

interface FoundTransactionAPI {
  id: number;
  user_id: number;
  timestamp: number;
  items: TransactionItemAPI[];
}

function Returns() {
  const { t } = useTranslation();
  const { user } = useAuth(); // ✅ جلب المستخدم الحالي
  const [searchId, setSearchId] = useState('');
  const [foundTransaction, setFoundTransaction] = useState<FoundTransactionAPI | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [itemsToReturn, setItemsToReturn] = useState<{ [itemId: number]: number }>({});

  // ✅ تم إعادة كتابة دالة البحث بالكامل لتستخدم fetch
  const handleSearch = async () => {
    if (!searchId.trim()) return;
    setLoading(true);
    setError('');
    setFoundTransaction(null);
    setItemsToReturn({});

    try {
      const response = await fetch(`http://localhost:3001/api/transactions/${searchId}`);
      
      if (!response.ok) {
        if (response.status === 404) {
          setError(t('returns.notFound', 'Sale transaction not found with this ID.'));
        } else {
          throw new Error('Server error');
        }
      } else {
        const transactionData: FoundTransactionAPI = await response.json();
        setFoundTransaction(transactionData);
      }
    } catch (err) {
      setError(t('returns.error', 'An error occurred while searching.'));
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleItemCheck = (itemId: number, isChecked: boolean, originalQuantity: number) => {
    const newItemsToReturn = { ...itemsToReturn };
    if (isChecked) {
      newItemsToReturn[itemId] = originalQuantity;
    } else {
      delete newItemsToReturn[itemId];
    }
    setItemsToReturn(newItemsToReturn);
  };

  const handleQuantityChange = (itemId: number, quantity: number, maxQuantity: number) => {
    const newQuantity = Math.max(0, Math.min(quantity, maxQuantity));
    setItemsToReturn(prev => ({ ...prev, [itemId]: newQuantity }));
  };

  // ✅ تم إعادة كتابة دالة الإرجاع بالكامل لتستخدم fetch
const handleReturn = async () => {
  if (!foundTransaction || !user) return;

  // ✅ الفلترة علشان نجيب العناصر اللي المستخدم اختار يرجعها
  const returnedItems = foundTransaction.items.filter(
    item => (itemsToReturn[item.id] || 0) > 0
  );

  if (returnedItems.length === 0) {
    alert(t('returns.noItemsSelected', 'Please select items to return.'));
    return;
  }

  // ✅ حساب الإجمالي
  const totalRefundAmount = returnedItems.reduce((total, item) => {
    return total + (item.price * itemsToReturn[item.id]);
  }, 0);

  // ✅ هنا ضفت payment_methods عشان السيرفر يقبل الطلب
const returnPayload = {
  original_transaction_id: foundTransaction.id,
  user_id: user.id,
items: returnedItems.map(item => ({
  product_id: item.product_id,
  quantity: itemsToReturn[item.id],  // ✅ صح هنا
  price: item.price
})),

  payment_methods: [
    { method: "cash", amount: totalRefundAmount }  // بدل type
  ]
};





  console.log("Return Payload Sent:", returnPayload);
console.log("Return Payload Sent:", JSON.stringify(returnPayload, null, 2));

  try {
    const response = await fetch('http://localhost:3001/api/returns', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(returnPayload),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(errorText || 'Failed to process return on the server.');
    }

    await response.json();
    alert(t('returns.success', 'Return processed successfully!'));

    // Reset the state
    setFoundTransaction(null);
    setSearchId('');
    setItemsToReturn({});

  } catch (err) {
    console.error('Failed to process return:', err);
    setError(t('returns.returnError', 'Failed to process return.'));
  }
};
const calculateRefundTotal = () => {
  if (!foundTransaction) return 0;
  return Object.entries(itemsToReturn).reduce((total, [itemId, quantity]) => {
    const item = foundTransaction.items.find(i => i.id === parseInt(itemId));
    return total + (item ? item.price * quantity : 0);
  }, 0);
};
  return (
    <div className="p-6">
      <h2 className="text-2xl font-bold mb-4">{t('returns.title', 'Sales & Returns')}</h2>
      
      <div className="bg-white p-4 rounded-lg shadow-md mb-6">
        <h3 className="text-xl font-semibold mb-2">{t('returns.findTransaction', 'Find Transaction by ID')}</h3>
        <div className="flex gap-2">
          <input
            type="number"
            value={searchId}
            onChange={(e) => setSearchId(e.target.value)}
            placeholder={t('pos.transactionId', 'Transaction ID')}
            className="p-2 border rounded w-full"
            onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
          />
          <button onClick={handleSearch} disabled={loading} className="bg-blue-500 text-white p-2 rounded w-48">
            {loading ? t('returns.searching', 'Searching...') : t('returns.search', 'Search')}
          </button>
        </div>
        {error && <p className="text-red-500 mt-2">{error}</p>}
      </div>

      {foundTransaction && (
        <div className="bg-white p-4 rounded-lg shadow-md">
          <h3 className="text-xl font-semibold mb-2">
            {t('returns.transactionDetails', 'Transaction Details')} #{foundTransaction.id}
          </h3>
          <p>{t('returns.date', 'Date')}: {new Date(foundTransaction.timestamp).toLocaleString()}</p>
          
          <div className="mt-4">
            <h4 className="font-semibold">{t('returns.itemsToReturn', 'Items to Return')}</h4>
            {foundTransaction.items.map(item => (
              <div key={item.id} className="flex items-center justify-between border-b py-2">
                <div className="flex items-center">
                  <input
                    type="checkbox"
                    checked={!!itemsToReturn[item.id]}
                    onChange={(e) => handleItemCheck(item.id, e.target.checked, item.quantity)}
                    className="mr-3 h-5 w-5"
                  />
                  <span>{item.productName} (Sold: {item.quantity})</span>
                </div>
                <div className="flex items-center gap-2">
                  <label>Quantity:</label>
                  <input
                    type="number"
                    min="0"
                    max={item.quantity}
                    value={itemsToReturn[item.id] ?? 0}
                    onChange={(e) => handleQuantityChange(item.id, parseInt(e.target.value), item.quantity)}
                    disabled={!itemsToReturn[item.id]}
                    className="w-20 p-1 border rounded text-center"
                  />
                </div>
              </div>
            ))}
            
            <p className="font-bold text-right mt-2 text-lg">
              {t('returns.refundTotal', 'Total to Refund')}: {calculateRefundTotal().toFixed(2)} EGP
            </p>
          </div>

          <button onClick={handleReturn} className="bg-orange-500 hover:bg-orange-600 text-white p-2 rounded mt-4 w-full">
            {t('returns.processReturn', 'Process Return')}
          </button>
        </div>
      )}
    </div>
  );
}

export default Returns;