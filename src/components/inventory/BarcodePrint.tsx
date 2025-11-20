import Barcode from 'react-barcode';

interface Product {
  name: string;
  barcode: string;
  price: number;
}

interface BarcodePrintProps {
  product: Product;
}

// هذا المكون هو ما سيتم طباعته (نسخة مضغوطة لتناسب الليبل)
function BarcodePrint({ product }: BarcodePrintProps) {
  return (
    <div style={{ 
      textAlign: 'center', 
      fontFamily: 'Arial', 
      padding: '1px 0', // هامش داخلي 1 بكسل فقط (فوق وتحت)
      margin: 0,
      width: '100%'
    }}>
      
      {/* ملاحظة: إذا كان اسم المنتج طويلاً، قد يسبب مشكلة.
        يمكنك حذف السطر التالي بالكامل إذا كنت لا تحتاج لاسم المنتج
        (مثل الصورة "8116" التي أرسلتها).
      */}
      <h4 style={{ 
        margin: '0 0 1px 0', // إزالة الهوامش (هامش سفلي 1 بكسل فقط)
        fontSize: '8px'       // خط صغير جداً للاسم
      }}>
        {product.name}
      </h4>
      
      <Barcode 
        value={product.barcode} 
        width={1.5}  // عرض خطوط الباركود (يمكنك تغييره إلى 1.2 أو 1.8 حسب الحاجة)
        height={12}  // *** تقليل ارتفاع الباركود بشكل كبير (كان 40)
        fontSize={10} // حجم الخط أسفل الباركود (الرقم)
        margin={0}    // هامش صغير جداً حول الباركود
        displayValue={true} // للتأكد من عرض الرقم (مثل 8116)
      />
      
      <p style={{ 
        fontWeight: 'bold', 
        margin: '1px 0 0 0', // هامش علوي 1 بكسل فقط
        fontSize: '9px' // تصغير حجم خط السعر
      }}>
        {product.price.toFixed(2)} EGP
      </p>
    </div>
  );
}

export default BarcodePrint;