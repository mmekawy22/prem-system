import Barcode from 'react-barcode';

interface Product {
  name: string;
  barcode: string;
  price: number;
}

interface BarcodePrintProps {
  product: Product;
}

// هذا المكون هو ما سيتم طباعته
function BarcodePrint({ product }: BarcodePrintProps) {
  return (
    <div style={{ textAlign: 'center', fontFamily: 'Arial', margin: '20px' }}>
      <h4>{product.name}</h4>
      <Barcode value={product.barcode} width={2} height={50} fontSize={16} />
      <p style={{ fontWeight: 'bold', marginTop: '5px' }}>
        Price: {product.price.toFixed(2)} EGP
      </p>
    </div>
  );
}

export default BarcodePrint;