import React from 'react';
import BarcodePrint from './BarcodePrint';

// This interface now includes quantity
interface Item {
  id?: number;
  name: string;
  barcode: string;
  price: number;
  quantity: number; // The quantity from the invoice item
}

interface BarcodeSheetProps {
  items: Item[];
}

function BarcodeSheet({ items }: BarcodeSheetProps) {
  // This is the new logic:
  // We create a new flat array that repeats each item based on its quantity.
  // For example, if we have one item with quantity: 3,
  // this will create an array of 3 identical items to be printed.
  const allItemsToPrint = items.flatMap(item => 
    Array(item.quantity).fill(item)
  );

  return (
    <div>
      <style>
        {`
          @media print {
            @page { size: A4; margin: 1cm; }
            body { -webkit-print-color-adjust: exact; }
          }
        `}
      </style>
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(4, 1fr)',
        gap: '20px',
      }}>
        {/* We now map over the new array to print all barcodes */}
        {allItemsToPrint.map((item, index) => (
          <BarcodePrint key={`${item.id}-${index}`} product={item} />
        ))}
      </div>
    </div>
  );
}

export default BarcodeSheet;