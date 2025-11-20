import React from "react";
import { useAuth } from "../../context/UserContext";
import { Setting } from "../../types";

interface ReceiptProps {
  transaction: any;
}

const Receipt: React.FC<ReceiptProps> = ({ transaction }) => {
  const { settings } = useAuth();

  // Use optional chaining (?.) and nullish coalescing (??) for safety
  const {
    id: transactionId,
    items,
    total,
    final_total,
    user,
    customer,
    payment_methods,
    notes,
    timestamp
  } = transaction;

  // ✅ This is the simplified and corrected line
  const paymentMethodsArray = Array.isArray(payment_methods) ? payment_methods : [];

return (
  <div className="text-black text-sm font-mono p-2">
    <div className="text-center">
      {settings?.store_logo && (
        <img
          src={settings.store_logo}
          alt="logo"
          className="mx-auto h-16 w-auto"
        />
      )}

      <h2 className="text-lg font-bold">
        {settings?.store_name || "My Shop"}
      </h2>

      {/* ✅ عرض العنوان ورقم الهاتف لو موجودين */}
      {(settings?.address || settings?.phone) && (
        <p>
          {settings?.address ? settings.address + " " : ""}
          {settings?.phone ? `(${settings.phone})` : ""}
        </p>
      )}

      <p>Date: {new Date(timestamp).toLocaleString()}</p>
      <p>Receipt #: {transactionId}</p>
      <p>Cashier: {user?.username || "N/A"}</p>
   
  </div>
        
        {customer?.name && (
            <div className="mt-4 border-t border-dashed border-black pt-2">
                <p><strong>Customer:</strong> {customer.name}</p>
                {customer.phone && <p><strong>Phone:</strong> {customer.phone}</p>}
            </div>
        )}

        <hr className="my-2 border-dashed border-black"/>
        <div>
            {/* Use (items ?? []) to prevent crashes if items array is missing */}
            {(items ?? []).map((item: any, index: number) => (
                <div key={item.id || index} className="grid grid-cols-3 gap-1">
                    <span className="col-span-2">{item.name || item.productName} (x{item.quantity})</span>
                    <span className="text-right">{(item.price * item.quantity).toFixed(2)}</span>
                </div>
            ))}
        </div>
        <hr className="my-2 border-dashed border-black"/>
        
        <div className="space-y-1 text-right">
            <p>Subtotal: {Number(total || 0).toFixed(2)} EGP</p>
            <p className="font-bold">Total Paid: {Number(final_total || 0).toFixed(2)} EGP</p>
        </div>

        <div className="mt-2 border-t border-dashed border-black pt-2">
            <p className="font-bold">Paid with:</p>
            
            {/* ✅ This is the final, clean map loop */}
            {paymentMethodsArray.map((pm, index) => {
                const methodName = pm.method;
                const displayAmount = parseFloat(pm.amount);

                return (
                    <div key={index} className="flex justify-between w-full">
                        <span className="capitalize">{methodName}</span>
                        <span>{displayAmount.toFixed(2)} EGP</span>
                    </div>
                );
            })}
        </div>

        {notes && (
             <div className="mt-2 border-t border-dashed border-black pt-2 text-center">
                 <p className="font-bold">Notes:</p>
                 <p>{notes}</p>
             </div>
        )}

        <div className="text-center mt-4">
            <p>زيارتكم شرف لنا</p>
        </div>
    </div>
  );
};

export default Receipt;