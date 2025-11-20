import React from 'react';
import BarcodePrint from './BarcodePrint';

interface Item {
  id?: number;
  name: string;
  barcode: string;
  price: number;
  quantity: number; 
}

interface BarcodeSheetProps {
  items: Item[];
}

function BarcodeSheet({ items }: BarcodeSheetProps) {
  const allItemsToPrint = items.flatMap(item => 
    Array(item.quantity).fill(item)
  );

  return (
    <div>
      <style>
        {`
          @media print {
            body {
              margin: 0;
              padding: 0;
            }
            .barcode-label-wrapper {
              page-break-after: always !important;
            }
            
            /* * هذا هو التعديل الجديد:
             * يمنع إضافة صفحة جديدة (فارغة) بعد آخر ليبل
             */
            .barcode-label-wrapper:last-child {
              page-break-after: auto !important;
            }
          }
        `}
      </style>
      
      <div>
        {allItemsToPrint.map((item, index) => (
          <div key={`${item.id}-${index}`} className="barcode-label-wrapper">
            <BarcodePrint product={item} />
          </div>
        ))}
      </div>
    </div>
  );
}

export default BarcodeSheet;