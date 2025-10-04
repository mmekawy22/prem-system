import React, { forwardRef } from 'react';
// ✅ أضف هذا السطر في الأعلى لكي يستخدم الملف التعريف الصحيح
import type { Product } from '../../db';



interface PrintProps {
    products: Product[];
}

export const InventoryListPrint = forwardRef<HTMLDivElement, PrintProps>(({ products }, ref) => {
    return (
        <div ref={ref} className="p-4 bg-white text-black">
            <h1 className="text-xl font-bold text-center mb-4">Inventory List</h1>
            <p className="text-sm text-center mb-4">Date: {new Date().toLocaleDateString()}</p>
            <table className="w-full text-sm border-collapse border border-gray-400">
                <thead>
                    <tr className="bg-gray-200">
                        <th className="border border-gray-300 p-2 text-left">Barcode</th>
                        <th className="border border-gray-300 p-2 text-left">Name</th>
                        <th className="border border-gray-300 p-2 text-left">Category</th>
                        <th className="border border-gray-300 p-2 text-center">Stock</th>
                        <th className="border border-gray-300 p-2 text-right">Price</th>
                    </tr>
                </thead>
                <tbody>
                    {products.map((p, index) => (
                        <tr key={index} className="break-inside-avoid">
                            <td className="border border-gray-300 p-2 font-mono">{p.barcode}</td>
                            <td className="border border-gray-300 p-2">{p.name}</td>
                            <td className="border border-gray-300 p-2">{p.category}</td>
                            <td className="border border-gray-300 p-2 text-center">{p.stock}</td>
                            <td className="border border-gray-300 p-2 text-right">{Number(p.price).toFixed(2)}</td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
});