import React, { forwardRef } from 'react';

interface PrintWorksheetProps {
  products: { name: string; barcode: string; stock: number }[];
  title: string;
}

// ✅ forwardRef عشان react-to-print يقدر يلقط الـ component
export const PrintWorksheet = forwardRef<HTMLDivElement, PrintWorksheetProps>(
  ({ products, title }, ref) => {
    return (
      <div ref={ref} style={{ padding: "40px", fontFamily: "Arial, sans-serif" }}>
        {/* العنوان */}
        <h2 style={{ textAlign: "center", marginBottom: "20px" }}>
          Inventory Worksheet
        </h2>
        <h3 style={{ textAlign: "center", marginBottom: "30px" }}>
          {title}
        </h3>

        {/* جدول المنتجات */}
        <table
          style={{
            width: "100%",
            borderCollapse: "collapse",
            fontSize: "14px",
          }}
        >
          <thead>
            <tr>
              <th style={{ border: "1px solid #000", padding: "8px", textAlign: "left" }}>#</th>
              <th style={{ border: "1px solid #000", padding: "8px", textAlign: "left" }}>Product Name</th>
              <th style={{ border: "1px solid #000", padding: "8px", textAlign: "center" }}>Barcode</th>
              <th style={{ border: "1px solid #000", padding: "8px", textAlign: "center" }}>System Qty</th>
              <th style={{ border: "1px solid #000", padding: "8px", textAlign: "center" }}>Physical Count</th>
              <th style={{ border: "1px solid #000", padding: "8px", textAlign: "center" }}>Notes</th>
            </tr>
          </thead>
          <tbody>
            {products && products.length > 0 ? (
              products.map((product, index) => (
                <tr key={index}>
                  <td style={{ border: "1px solid #000", padding: "6px" }}>{index + 1}</td>
                  <td style={{ border: "1px solid #000", padding: "6px" }}>{product.name}</td>
                  <td style={{ border: "1px solid #000", padding: "6px", textAlign: "center" }}>
                    {product.barcode}
                  </td>
                  <td style={{ border: "1px solid #000", padding: "6px", textAlign: "center" }}>
                    {product.stock}
                  </td>
                  <td style={{ border: "1px solid #000", padding: "6px", textAlign: "center" }}>
                    {/* يكتب الكمية يدوي بعد الطباعة */}
                  </td>
                  <td style={{ border: "1px solid #000", padding: "6px" }}></td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={6} style={{ border: "1px solid #000", padding: "10px", textAlign: "center" }}>
                  No products to display
                </td>
              </tr>
            )}
          </tbody>
        </table>

        {/* تاريخ الطباعة */}
        <div style={{ marginTop: "40px", fontSize: "12px", textAlign: "right" }}>
          Printed at: {new Date().toLocaleString()}
        </div>
      </div>
    );
  }
);

PrintWorksheet.displayName = "PrintWorksheet";
