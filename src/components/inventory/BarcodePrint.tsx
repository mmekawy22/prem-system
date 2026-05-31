import Barcode from 'react-barcode';
import React from 'react';

interface Product {
  name: string;
  barcode: string;
  price: number;
}

interface BarcodePrintProps {
  product: Product;
}

function BarcodePrint({ product }: BarcodePrintProps) {
  return (
    <>
      <style>
        {`
          @media print {
            @page {
              size: 37mm 10mm;
              margin: 0;
            }
            body {
              margin: 0;
              padding: 0;
              overflow: hidden;
            }
          }
        `}
      </style>

      <div
        style={{
          width: '37mm',
          height: '10mm',
          display: 'flex',
          flexDirection: 'column',
          backgroundColor: 'white',
          fontFamily: 'Arial, sans-serif',
          border: '0.1mm solid #000',
          boxSizing: 'border-box',
          overflow: 'hidden'
        }}
      >
        {/* الجزء العلوي: مقسم لخانة اسم وخانة (سعر + رقم) */}
        <div style={{ 
          display: 'flex', 
          width: '100%', 
          height: '5mm', // زيادة ارتفاع الجزء العلوي لاستيعاب السعر والرقم
          borderBottom: '0.1mm solid #000' 
        }}>
          {/* خانة اسم المنتج */}
          <div style={{ 
            flex: 1.5, 
            padding: '0 1mm', 
            borderRight: '0.1mm solid #000', 
            display: 'flex',
            alignItems: 'center',
            overflow: 'hidden'
          }}>
            <span style={{ 
              fontSize: '11px', 
              fontWeight: 'bold', 
              display: '-webkit-box',
              WebkitLineClamp: 2,
              WebkitBoxOrient: 'vertical',
              overflow: 'hidden',
              lineHeight: '1.1'
            }}>
              {product.name}
            </span>
          </div>

          {/* خانة السعر ورقم الكود (تحت بعض) */}
          <div style={{ 
            flex: 1, 
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
            alignItems: 'center',
            padding: '0 0.5mm'
          }}>
            {/* السعر في الأعلى */}
            <div style={{ 
              fontSize: '8.5px', 
              fontWeight: '900', 
              color: '#FF0000',
              borderBottom: '0.1mm solid #eee', // خط وهمي خفيف للفصل
              width: '100%',
              textAlign: 'center'
            }}>
             {Math.trunc(product.price)}LE
            </div>
            {/* رقم الكود مباشرة تحت السعر */}
            <div style={{ 
              fontSize: '9px', 
              fontWeight: '700', 
              color: '#000',
              width: '100%',
              textAlign: 'center',
              marginTop: '0.2mm'
            }}>
              {product.barcode}
            </div>
          </div>
        </div>

        {/* الجزء السفلي: رسمة الباركود فقط */}
        <div style={{ 
          flex: 1, 
          width: '100%', 
          display: 'flex', 
          justifyContent: 'center', 
          alignItems: 'center',
          padding: '0.2mm 0'
        }}>
          <Barcode
            value={product.barcode}
            width={1.2} // عرض أكبر للخطوط لسهولة المسح
            height={15} // ارتفاع الرسمة يملأ المساحة المتبقية
            margin={0}
            displayValue={false} // إخفاء الرقم من الأسفل تماماً
          />
        </div>
      </div>
    </>
  );
}

export default BarcodePrint;