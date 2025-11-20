import React, { useState } from 'react';

const API_URL = 'http://192.168.1.20:3001/api';

// Define the structure of a Shift object
interface Shift {
    id: number;
    username: string;
    end_time: number;
    expected_cash: number;
    actual_cash: number;
    expected_card: number;
    actual_card: number;
    variance: number;
}

// A reusable component to display the report details
const ShiftReportDetails: React.FC<{ shift: Shift }> = ({ shift }) => {
    return (
        <div className="printable-area bg-white p-6 rounded-lg shadow-md">
            <h2 className="text-2xl font-bold mb-4 text-center">Shift Report</h2>
            <p className="text-center mb-4">Closed by: <strong>{shift.username}</strong> on {new Date(shift.end_time).toLocaleString()}</p>
            <div className="space-y-2">
                <div className="flex justify-between border-b pb-2"><span>Expected Cash:</span><strong>{shift.expected_cash.toFixed(2)}</strong></div>
                <div className="flex justify-between border-b pb-2"><span>Actual Cash:</span><strong>{shift.actual_cash.toFixed(2)}</strong></div>
                <div className="flex justify-between border-b pb-2"><span>Expected Card:</span><strong>{shift.expected_card.toFixed(2)}</strong></div>
                <div className="flex justify-between border-b pb-2"><span>Actual Card:</span><strong>{shift.actual_card.toFixed(2)}</strong></div>
                <hr className="my-2"/>
                <div className={`flex justify-between font-bold text-lg ${shift.variance >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    <span>Variance (Difference):</span>
                    <span>{shift.variance.toFixed(2)} EGP</span>
                </div>
            </div>
        </div>
    );
};

function ShiftHistory() {
    const [searchDate, setSearchDate] = useState(new Date().toISOString().split('T')[0]);
    const [shifts, setShifts] = useState<Shift[]>([]);
    const [loading, setLoading] = useState(false);
    const [selectedShift, setSelectedShift] = useState<Shift | null>(null);

    const handleSearch = async () => {
        setLoading(true);
        setSelectedShift(null);
        try {
            // ✅ **CORRECTED URL HERE**
            const response = await fetch(`${API_URL}/shifts/history?date=${searchDate}`);
            if (!response.ok) throw new Error("Failed to fetch history");
            const foundShifts: Shift[] = await response.json();
            setShifts(foundShifts);
        } catch (error) {
            console.error("Error fetching shift history:", error);
            alert("Could not load shift history from the server.");
            setShifts([]);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="p-6">
            <h2 className="text-2xl font-bold mb-4">Shift History</h2>

            <div className="bg-white p-4 rounded-lg shadow-md mb-6 no-print">
                <div className="flex gap-2 items-end">
                    <div className="flex-grow">
                        <label htmlFor="searchDate" className="block text-sm font-medium text-gray-700">Select Date</label>
                        <input
                            type="date"
                            id="searchDate"
                            value={searchDate}
                            onChange={(e) => setSearchDate(e.target.value)}
                            className="p-2 border rounded w-full mt-1"
                        />
                    </div>
                    <button onClick={handleSearch} disabled={loading} className="bg-blue-500 text-white p-2 rounded h-10 w-48">
                        {loading ? 'Searching...' : 'Search'}
                    </button>
                </div>
            </div>

            <div className="bg-white p-4 rounded-lg shadow-md">
                <h3 className="text-xl font-semibold mb-4">Search Results</h3>
                <div className="overflow-x-auto">
                    <table className="min-w-full bg-white">
                        <thead className="bg-gray-100">
                            <tr>
                                <th className="py-2 px-4 border-b text-left">Shift ID</th>
                                <th className="py-2 px-4 border-b text-left">Closed By</th>
                                <th className="py-2 px-4 border-b text-left">End Time</th>
                                <th className="py-2 px-4 border-b text-right">Variance</th>
                                <th className="py-2 px-4 border-b text-center">Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {loading ? (
                                <tr><td colSpan={5} className="text-center p-4">Loading...</td></tr>
                            ) : shifts.length > 0 ? (
                                shifts.map(shift => (
                                    <tr key={shift.id}>
                                        <td className="py-2 px-4 border-b">#{shift.id}</td>
                                        <td className="py-2 px-4 border-b">{shift.username}</td>
                                        <td className="py-2 px-4 border-b">{new Date(shift.end_time).toLocaleTimeString()}</td>
                                        <td className={`py-2 px-4 border-b text-right font-semibold ${shift.variance >=0 ? 'text-green-600' : 'text-red-600'}`}>{shift.variance.toFixed(2)}</td>
                                        <td className="py-2 px-4 border-b text-center">
                                            <button onClick={() => setSelectedShift(shift)} className="text-blue-500 hover:underline">
                                                View & Reprint
                                            </button>
                                        </td>
                                    </tr>
                                ))
                            ) : (
                                <tr><td colSpan={5} className="text-center p-4">No shifts found for this date.</td></tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Reprint Modal */}
            {selectedShift && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                    <div className="bg-gray-100 p-6 rounded-lg shadow-xl w-full max-w-md">
                        <ShiftReportDetails shift={selectedShift} />
                        <div className="mt-4 flex gap-4 no-print">
                            <button onClick={() => window.print()} className="w-full bg-blue-500 text-white p-2 rounded-lg">Print</button>
                            <button onClick={() => setSelectedShift(null)} className="w-full bg-gray-500 text-white p-2 rounded-lg">Close</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

export default ShiftHistory;