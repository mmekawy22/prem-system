import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/UserContext';

const API_URL = 'http://192.168.1.20:3001/api';

interface ShiftReport {
  id: number;
  username: string;
  end_time: number;
  expected_cash: number;
  actual_cash: number;
  expected_card: number;
  actual_card: number;
  variance: number;
  expected_wallet: number;
  expected_instapay: number;
  expected_credit: number;
  total_expenses: number;
}

function ClosingShift() {
  // --- 1. التعديل الأول: إحضار دالة logout ---
  const { user, logout } = useAuth(); 
  const [isSaving, setIsSaving] = useState(false);
  const [actual, setActual] = useState({ cash: '', card: '' });
  const [shiftReport, setShiftReport] = useState<ShiftReport | null>(null);

  // --- 2. التعديل الثاني: تغيير اسم ووظيفة الدالة ---
  const handlePrintAndLogout = () => {
    window.print();
    logout(); // استبدال window.location.reload() بـ logout()
  };

  useEffect(() => {
    if (shiftReport) {
      // --- 3. التعديل الثالث: استدعاء الدالة الجديدة ---
      handlePrintAndLogout();
    }
    // أضفنا logout إلى مصفوفة الاعتماديات لاتباع أفضل الممارسات
  }, [shiftReport, logout]);

  const handleSaveShift = async () => {
    if (!user || !actual.cash) {
      alert('Please enter the actual cash amount found in the drawer.');
      return;
    }

    setIsSaving(true);
    try {
      const response = await fetch(`${API_URL}/shifts/close`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          actual_cash: parseFloat(actual.cash) || 0,
          actual_card: parseFloat(actual.card) || 0,
          user_id: user.id,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Server failed to close the shift.');
      }

      const newShiftReport: ShiftReport = await response.json();
      setShiftReport(newShiftReport);

    } catch (error) {
      console.error('Error closing shift:', error);
      alert(`An error occurred while closing the shift: ${error}`);
      setIsSaving(false);
    }
  };
  
  if (shiftReport) {
    return (
        <div className="printable-area bg-white p-6 rounded-lg shadow-md">
          <h2 className="text-2xl font-bold mb-4 text-center">Shift Report</h2>
          <p className="text-center mb-4">
            Closed by: <strong>{shiftReport.username}</strong> on{' '}
            {new Date(shiftReport.end_time).toLocaleString()}
          </p>
          <div className="space-y-2">
            <div className="flex justify-between border-b pb-2">
              <span>Expected Cash (System):</span>
              <strong>{shiftReport.expected_cash.toFixed(2)}</strong>
            </div>
            <div className="flex justify-between border-b pb-2">
              <span>Actual Cash Counted:</span>
              <strong>{shiftReport.actual_cash.toFixed(2)}</strong>
            </div>
            <div className="flex justify-between border-b pb-2">
              <span>Expected Card (System):</span>
              <strong>{shiftReport.expected_card.toFixed(2)}</strong>
            </div>
            <div className="flex justify-between border-b pb-2">
              <span>Actual Card Total:</span>
              <strong>{shiftReport.actual_card.toFixed(2)}</strong>
            </div>
            <div className="flex justify-between border-b pb-2 text-sm text-gray-700">
              <span>E-Wallet (System):</span>
              <strong>{shiftReport.expected_wallet.toFixed(2)}</strong>
            </div>
            <div className="flex justify-between border-b pb-2 text-sm text-gray-700">
              <span>InstaPay (System):</span>
              <strong>{shiftReport.expected_instapay.toFixed(2)}</strong>
            </div>
             <div className="flex justify-between border-b pb-2 text-sm text-gray-700">
              <span>Credit/Receivables (System):</span>
              <strong>{shiftReport.expected_credit.toFixed(2)}</strong>
            </div>
            <div className="flex justify-between border-b pb-2 text-sm text-gray-700">
              <span>Total Expenses:</span>
              <strong>- {shiftReport.total_expenses.toFixed(2)}</strong>
            </div>
            <hr className="my-2" />
            <div
              className={`flex justify-between font-bold text-lg ${
                shiftReport.variance >= 0 ? 'text-green-600' : 'text-red-600'
              }`}
            >
              <span>Variance (Cash/Card):</span>
              <span>{shiftReport.variance.toFixed(2)} EGP</span>
            </div>
          </div>
        </div>
    )
  }

  return (
    <div className="p-6 max-w-lg mx-auto">
      <h2 className="text-2xl font-bold mb-4">Close Shift</h2>
      <div className="bg-white p-6 rounded-lg shadow-md space-y-4">
        <p className="text-sm text-gray-600">
          Enter the final amounts counted from the cash drawer and card machine
          to close the current shift.
        </p>
        <div>
          <h3 className="font-semibold text-lg">
            Enter Actual Counted Amounts
          </h3>
          <div className="mt-2">
            <label className="block">Actual Cash in Drawer:</label>
            <input
              type="number"
              value={actual.cash}
              onChange={(e) =>
                setActual((prev) => ({ ...prev, cash: e.target.value }))
              }
              className="w-full p-2 border rounded mt-1"
              placeholder="0.00"
              autoFocus
            />
          </div>
          <div className="mt-2">
            <label className="block">Actual Card Total:</label>
            <input
              type="number"
              value={actual.card}
              onChange={(e) =>
                setActual((prev) => ({ ...prev, card: e.target.value }))
              }
              className="w-full p-2 border rounded mt-1"
              placeholder="0.00"
            />
          </div>
        </div>
        <button
          onClick={handleSaveShift}
          disabled={isSaving}
          className="w-full bg-green-500 hover:bg-green-600 text-white font-bold p-3 rounded-lg disabled:bg-gray-400"
        >
          {isSaving ? 'Closing...' : 'Save and Print Shift'}
        </button>
      </div>
    </div>
  );
}

export default ClosingShift;