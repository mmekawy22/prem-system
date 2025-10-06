const express = require('express');
const mysql = require('mysql2/promise');
const cors = require('cors');
const bcrypt = require('bcrypt');
const saltRounds = 10;
const fs = require('fs/promises');
const path = require('path');

const app = express();
const port = 3001;

app.use(cors());
app.use(express.json({ limit: '10mb' }));

const dbConfig = {
    host: 'localhost',
    user: 'root',
    password: '',
    database: 'pos_db',
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0,
    decimalNumbers: true
};

const pool = mysql.createPool(dbConfig);

app.get('/', (req, res) => {
    res.json({ message: 'Backend Server is running!' });
});
// TEST 1: Get purchases ONLY
app.get('/api/test1', async (req, res) => {
    try {
        const [results] = await pool.execute('SELECT * FROM purchases');
        console.log(`Test 1 (Purchases Only) Found: ${results.length} rows`);
        res.json(results);
    } catch (e) { res.status(500).json({ error: e.message }); }
});

// TEST 2: Join with Suppliers
app.get('/api/test2', async (req, res) => {
    try {
        const [results] = await pool.execute(`
            SELECT p.id, s.name as supplier_name 
            FROM purchases p 
            LEFT JOIN suppliers s ON p.supplier_id = s.id
        `);
        console.log(`Test 2 (With Suppliers) Found: ${results.length} rows`);
        res.json(results);
    } catch (e) { res.status(500).json({ error: e.message }); }
});

// TEST 3: Join with Products (The likely problem)
app.get('/api/test3', async (req, res) => {
    try {
        const [results] = await pool.execute(`
            SELECT p.id
            FROM purchases p
            LEFT JOIN purchase_items pi ON p.id = pi.purchase_id
            LEFT JOIN products pr ON pi.product_id = pr.id
        `);
         console.log(`Test 3 (With Products) Found: ${results.length} rows`);
        res.json(results);
    } catch (e) { res.status(500).json({ error: e.message }); }
});
// AUTHENTICATION
app.post('/api/login', async (req, res) => {
    const { username, password } = req.body;
    if (!username || !password) return res.status(400).json({ error: 'Username and password are required.' });
    try {
        const [users] = await pool.execute('SELECT * FROM users WHERE username = ?', [username]);
        if (users.length === 0) return res.status(401).json({ error: 'Invalid username or password' });
        const user = users[0];
        const passwordMatch = await bcrypt.compare(password, user.password);
        if (!passwordMatch) return res.status(401).json({ error: 'Invalid username or password' });
        const { password: _, ...userWithoutPassword } = user;
        res.json({ message: 'Login successful!', user: userWithoutPassword });
    } catch (error) {
        console.error("Login error:", error);
        res.status(500).json({ error: 'An internal server error occurred.' });
    }
});

// Products CRUD
app.get('/api/products', async (req, res) => {
    try {
        const [rows] = await pool.execute('SELECT * FROM products ORDER BY name ASC');
        res.json(rows);
    } catch (error) {
        console.error("Fetch products error:", error);
        res.status(500).json({ error: 'Failed to fetch products.' });
    }
});
// GET all unique product categories
app.get('/api/products/categories', async (req, res) => {
    try {
        const [rows] = await pool.execute("SELECT DISTINCT category FROM products WHERE category IS NOT NULL AND category != '' ORDER BY category ASC");
        // Extract just the category names into a simple array
        const categories = rows.map(row => row.category);
        res.json(categories);
    } catch (error) {
        console.error("Fetch categories error:", error);
        res.status(500).json({ error: 'Failed to fetch categories.' });
    }
});

app.post('/api/products', async (req, res) => {
    const p = req.body;
    let barcodeToSave = p.barcode; // Use the barcode from the frontend by default

    try {
        // If the barcode from the frontend is empty or missing, generate a new one
        if (!barcodeToSave) {
            let isUnique = false;
            while (!isUnique) {
                // 1. Generate a new 4-digit barcode
                const newBarcode = Math.floor(1000 + Math.random() * 9000).toString();

                // 2. Check if this barcode already exists in the database
                const [rows] = await pool.execute(
                    'SELECT id FROM products WHERE barcode = ?',
                    [newBarcode]
                );

                // 3. If no rows are returned, the barcode is unique
                if (rows.length === 0) {
                    barcodeToSave = newBarcode; // Set the unique barcode for saving
                    isUnique = true; // Exit the loop
                }
                // If it's not unique, the loop will run again
            }
        }

        const [result] = await pool.execute(
            'INSERT INTO products (name, barcode, category, cost, price, wholesale_price, stock, min_stock) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
            [p.name, barcodeToSave, p.category, p.cost, p.price, p.wholesale_price, p.stock, p.min_stock]
        );

        res.status(201).json({ id: result.insertId, ...p, barcode: barcodeToSave });

    } catch (error) {
        console.error('Insert product error:', error);
        res.status(500).json({ error: 'Failed to create product.' });
    }
});

app.put('/api/products/:id', async (req, res) => {
    const { id } = req.params;
    const p = req.body;
    try {
        await pool.execute(
            'UPDATE products SET name=?, barcode=?, category=?, cost=?, price=?, wholesale_price=?, stock=?, min_stock=? WHERE id=?',
            [p.name, p.barcode, p.category, p.cost, p.price, p.wholesale_price, p.stock, p.min_stock, id]
        );
        res.status(200).json({ id: Number(id), ...p });
    } catch (error) {
        console.error("Update product error:", error);
        res.status(500).json({ error: 'Failed to update product.' });
    }
});

app.delete('/api/products/:id', async (req, res) => {
    const { id } = req.params;
    try {
        await pool.execute('DELETE FROM products WHERE id = ?', [id]);
        res.status(204).send();
    } catch (error) {
        console.error("Delete product error:", error);
        res.status(500).json({ error: 'Failed to delete product.' });
    }
});

// Reports
app.get('/api/reports/summary', async (req, res) => {
    const { startDate, endDate } = req.query;
    if (!startDate || !endDate) return res.status(400).json({ error: 'Start date and end date are required.' });
    const startTimestamp = new Date(startDate).getTime();
    const endTimestamp = new Date(`${endDate}T23:59:59.999Z`).getTime();
    const connection = await pool.getConnection();
    try {
        const params = [startTimestamp, endTimestamp];
        const summaryQuery = `
            SELECT COUNT(id) as transaction_count, SUM(final_total) as total_revenue,
            (SELECT SUM(ti.quantity) FROM transaction_items tiJOIN transactions t ON ti.transaction_id = t.id WHERE t.timestamp BETWEEN ? AND ? AND t.type = 'sale' AND t.status = 'closed') as total_items_sold,
            (SELECT SUM(ti.quantity * p.cost) FROM transaction_items ti JOIN products p ON ti.product_id = p.id JOIN transactions t ON ti.transaction_id = t.id WHERE t.timestamp BETWEEN ? AND ?) as total_cogs
            WHERE timestamp BETWEEN ? AND ? AND type = 'sale' AND status = 'closed';
`;
        const [summaryRows] = await connection.execute(summaryQuery, [...params, ...params, ...params]);
        const summary = summaryRows[0];
        summary.gross_profit = (summary.total_revenue || 0) - (summary.total_cogs || 0);
        const salesOverTimeQuery = `SELECT DATE(FROM_UNIXTIME(timestamp / 1000)) as date, SUM(final_total) as daily_revenue FROM transactions WHERE timestamp BETWEEN ? AND ? AND type = 'sale' AND t.status = 'closed' GROUP BY date ORDER BY date ASC;`;
        const [salesOverTime] = await connection.execute(salesOverTimeQuery, params);
        const topProductsQuery = `SELECT p.name, SUM(ti.quantity) as total_quantity FROM transaction_items ti JOIN products p ON ti.product_id = p.id JOIN transactions t ON ti.transaction_id = t.id WHERE t.timestamp BETWEEN ? AND ? AND t.type = 'sale' AND t.status = 'closed' GROUP BY p.name ORDER BY total_quantity DESC LIMIT 5;`;
        const [topProducts] = await connection.execute(topProductsQuery, params);
        const worstProductsQuery = `
            SELECT p.name, COALESCE(SUM(ti.quantity), 0) as total_quantity FROM products p
            LEFT JOIN (
                SELECT ti_inner.product_id, ti_inner.quantity FROM transaction_items ti_inner JOIN transactions t_inner ON ti_inner.transaction_id = t_inner.id WHERE t_inner.timestamp BETWEEN ? AND ? AND t_inner.type = 'sale' AND t.status = 'closed'
            ) AS ti ON p.id = ti.product_id
            GROUP BY p.name ORDER BY total_quantity ASC, p.name ASC LIMIT 5;`;
        const [worstProducts] = await connection.execute(worstProductsQuery, params);
        const salesByCategoryQuery = `
            SELECT p.category, SUM(ti.price * ti.quantity) as total_revenue FROM transaction_items ti JOIN products p ON ti.product_id = p.id JOIN transactions t ON ti.transaction_id = t.id
            WHERE t.timestamp BETWEEN ? AND ? AND t.type = 'sale' AND t.status = 'closed' AND p.category IS NOT NULL AND p.category != '' GROUP BY p.category ORDER BY total_revenue DESC;`;
        const [salesByCategory] = await connection.execute(salesByCategoryQuery, params);
        res.json({ summary, salesOverTime, topProducts, worstProducts, salesByCategory });
    } catch (error) {
        console.error("Report generation error:", error);
        res.status(500).json({ error: 'Failed to generate report.' });
    } finally {
        connection.release();
    }
});

app.get('/api/reports/low-stock', async (req, res) => {
    const connection = await pool.getConnection();
    try {
        const smartQuery = `
            SELECT p.id, p.name, p.stock, p.min_stock, (p.min_stock - p.stock) AS shortage, p.cost, s.name AS supplier_name,
            (SELECT SUM(ti.quantity) FROM transaction_items ti JOIN transactions t ON ti.transaction_id = t.id WHERE ti.product_id = p.id AND t.timestamp >= (UNIX_TIMESTAMP(NOW() - INTERVAL 30 DAY) * 1000)) AS sales_last_30_days
            FROM products p
            LEFT JOIN (
                SELECT pi.product_id, MAX(pu.supplier_id) as last_supplier_id FROM purchase_items pi JOIN purchases pu ON pi.purchase_id = pu.id GROUP BY pi.product_id
            ) AS last_purchase ON p.id = last_purchase.product_id
            LEFT JOIN suppliers s ON last_purchase.last_supplier_id = s.id
            WHERE p.stock < p.min_stock ORDER BY shortage DESC;`;
        const [rows] = await connection.execute(smartQuery);
        const smartReport = rows.map(item => {
            const salesVelocity = item.sales_last_30_days || 0;
            const daysOfStockLeft = salesVelocity > 0 ? (item.stock / (salesVelocity / 30)).toFixed(1) : 'N/A';
            const recommendedReorder = Math.max(0, Math.ceil(salesVelocity - item.stock));
            return { ...item, sales_velocity_30d: salesVelocity, days_of_stock_left: daysOfStockLeft, recommended_reorder_qty: recommendedReorder };
        });
        res.json(smartReport);
    } catch (error) {
        console.error("Low stock report generation error:", error);
        res.status(500).json({ error: 'Failed to generate low stock report.' });
    } finally {
        connection.release();
    }
});

// Customers CRUD
app.get('/api/customers', async (req, res) => {
    try {
        const [rows] = await pool.execute('SELECT * FROM customers ORDER BY name ASC');
        res.json(rows);
    } catch (error) {
        console.error("Fetch customers error:", error);
        res.status(500).json({ error: 'Failed to fetch customers.' });
    }
});

app.post('/api/customers', async (req, res) => {
    const { name, phone, email, address } = req.body;
    if (!name) return res.status(400).json({ error: 'Customer name is required.' });
    try {
        const [result] = await pool.execute(
            'INSERT INTO customers (name, phone, email, address) VALUES (?, ?, ?, ?)',
            [name, phone || null, email || null, address || null]
        );
        res.status(201).json({ id: result.insertId, name, phone, email, address });
    } catch (error) {
        console.error("Insert customer error:", error);
        res.status(500).json({ error: 'Failed to create customer.' });
    }
});

app.put('/api/customers/:id', async (req, res) => {
    const { id } = req.params;
    const { name, phone, email, address } = req.body;
    if (!name) return res.status(400).json({ error: 'Customer name is required.' });
    try {
        await pool.execute(
            'UPDATE customers SET name = ?, phone = ?, email = ?, address = ? WHERE id = ?',
            [name, phone || null, email || null, address || null, id]
        );
        res.status(200).json({ id: Number(id), name, phone, email, address });
    } catch (error) {
        console.error("Update customer error:", error);
        res.status(500).json({ error: 'Failed to update customer.' });
    }
});

app.delete('/api/customers/:id', async (req, res) => {
    const { id } = req.params;
    try {
        await pool.execute('DELETE FROM customers WHERE id = ?', [id]);
        res.status(204).send();
    } catch (error) {
        console.error("Delete customer error:", error);
        res.status(500).json({ error: 'Failed to delete customer.' });
    }
});

// Suppliers CRUD
app.get('/api/suppliers', async (req, res) => {
    try {
        const [rows] = await pool.execute('SELECT * FROM suppliers ORDER BY name ASC');
        res.json(rows);
    } catch (error) {
        console.error("Fetch suppliers error:", error);
        res.status(500).json({ error: 'Failed to fetch suppliers.' });
    }
});

app.post('/api/suppliers', async (req, res) => {
    const { name, contact_person, phone, email, address } = req.body;
    if (!name) return res.status(400).json({ error: 'Supplier name is required.' });
    try {
        const [result] = await pool.execute(
            'INSERT INTO suppliers (name, contact_person, phone, email, address) VALUES (?, ?, ?, ?, ?)',
            [name, contact_person || null, phone || null, email || null, address || null]
        );
        res.status(201).json({ id: result.insertId, name, contact_person, phone, email, address });
    } catch (error) {
        console.error("Insert supplier error:", error);
        res.status(500).json({ error: 'Failed to create supplier.' });
    }
});

app.put('/api/suppliers/:id', async (req, res) => {
    const { id } = req.params;
    const { name, contact_person, phone, email, address } = req.body;
    if (!name) return res.status(400).json({ error: 'Supplier name is required.' });
    try {
        await pool.execute(
            'UPDATE suppliers SET name = ?, contact_person = ?, phone = ?, email = ?, address = ? WHERE id = ?',
            [name, contact_person || null, phone || null, email || null, address || null, id]
        );
        res.status(200).json({ id: Number(id), name, contact_person, phone, email, address });
    } catch (error) {
        console.error("Update supplier error:", error);
        res.status(500).json({ error: 'Failed to update supplier.' });
    }
});

app.delete('/api/suppliers/:id', async (req, res) => {
    const { id } = req.params;
    try {
        await pool.execute('DELETE FROM suppliers WHERE id = ?', [id]);
        res.status(204).send();
    } catch (error) {
        console.error("Delete supplier error:", error);
        res.status(500).json({ error: 'Failed to delete supplier.' });
    }
});

// Users CRUD (with Granular Permissions)
app.get('/api/users', async (req, res) => {
    try {
        const [rows] = await pool.execute('SELECT id, username, role, permissions, created_at FROM users');
        res.json(rows);
    } catch (error) {
        console.error("Fetch users error:", error);
        res.status(500).json({ error: 'Failed to fetch users.' });
    }
});

app.post('/api/users', async (req, res) => {
    const { username, password, role, permissions } = req.body;
    if (!username || !password || !role) return res.status(400).json({ error: 'Username, password, and role are required.' });
    try {
        const hashedPassword = await bcrypt.hash(password, saltRounds);
        const permissionsString = permissions ? JSON.stringify(permissions) : null;
        const [result] = await pool.execute('INSERT INTO users (username, password, role, permissions) VALUES (?, ?, ?, ?)', [username, hashedPassword, role, permissionsString]);
        res.status(201).json({ id: result.insertId, username, role, permissions: permissionsString });
    } catch (error) {
        if (error.code === 'ER_DUP_ENTRY') return res.status(409).json({ error: 'This username is already taken.' });
        console.error("Insert user error:", error);
        res.status(500).json({ error: 'Failed to create user.' });
    }
});

app.put('/api/users/:id', async (req, res) => {
    const { id } = req.params;
    const { username, role, password, permissions } = req.body;
    if (!username || !role) return res.status(400).json({ error: 'Username and role are required.' });
   const permissionsString = permissions ? JSON.stringify(permissions) : null;
    try {
        if (password && password.trim() !== '') {
            const hashedPassword = await bcrypt.hash(password, saltRounds);
            await pool.execute('UPDATE users SET username = ?, role = ?, permissions = ?, password = ? WHERE id = ?', [username, role, permissionsString, hashedPassword, id]);
        } else {
            await pool.execute('UPDATE users SET username = ?, role = ?, permissions = ? WHERE id = ?', [username, role, permissionsString, id]);
        }
        res.status(200).json({ message: 'User updated successfully' });
    } catch (error) {
        console.error("Update user error:", error);
        res.status(500).json({ error: 'Failed to update user.' });
    }
});

app.delete('/api/users/:id', async (req, res) => {
    const { id } = req.params;
    try {
        const [admins] = await pool.execute("SELECT COUNT(*) as adminCount FROM users WHERE role = 'admin'");
        if (admins[0].adminCount <= 1) {
            const [userToDelete] = await pool.execute("SELECT role FROM users WHERE id = ?", [id]);
            if (userToDelete.length > 0 && userToDelete[0].role === 'admin') {
                return res.status(403).json({ error: 'Cannot delete the last remaining admin.' });
            }
        }
        await pool.execute('DELETE FROM users WHERE id = ?', [id]);
        res.status(204).send();
    } catch (error) {
        console.error("Delete user error:", error);
        res.status(500).json({ error: 'Failed to delete user.' });
    }
});

// Purchases
app.get('/api/purchases', async (req, res) => {
    try {
        const query = `SELECT p.*, s.name as supplier_name FROM purchases p LEFT JOIN suppliers s ON p.supplier_id = s.id ORDER BY p.created_at DESC`;
        const [rows] = await pool.execute(query);
        res.json(rows);
    } catch (error) {
        console.error("Fetch purchases error:", error);
        res.status(500).json({ error: 'Failed to fetch purchase history.' });
    }
});

// In server.js
app.get('/api/purchases/:id', async (req, res) => {
    const { id } = req.params;
    try {
        // The only change is JOIN has been replaced with LEFT JOIN
        const itemsQuery = `
            SELECT pi.*, p.name as product_name, p.barcode, p.price as retail_price 
            FROM purchase_items pi 
            LEFT JOIN products p ON pi.product_id = p.id 
            WHERE pi.purchase_id = ?
        `;
        const [items] = await pool.execute(itemsQuery, [id]);
        res.json(items);
    } catch (error) {
        console.error(`Fetch purchase details error for id ${id}:`, error);
        res.status(500).json({ error: 'Failed to fetch purchase details.' });
    }
});

app.post('/api/purchases', async (req, res) => {
    const { supplier_id, user_id, total_amount, items } = req.body;
    if (!supplier_id || !user_id || !items || items.length === 0) {
        return res.status(400).json({ error: 'Missing required purchase data.' });
    }
    const connection = await pool.getConnection();
    try {
        await connection.beginTransaction();
        const [purchaseResult] = await connection.execute(
            'INSERT INTO purchases (supplier_id, user_id, total_amount) VALUES (?, ?, ?)',
            [supplier_id, user_id, total_amount]
        );
        const newPurchaseId = purchaseResult.insertId;
        for (const item of items) {
            await connection.execute(
                'INSERT INTO purchase_items (purchase_id, product_id, quantity, cost_price) VALUES (?, ?, ?, ?)',
                [newPurchaseId, item.product_id, item.quantity, item.cost_price]
            );
            await connection.execute('UPDATE products SET stock = stock + ? WHERE id = ?', [item.quantity, item.product_id]);
        }
        await connection.commit();
        res.status(201).json({ message: 'Purchase recorded successfully', purchaseId: newPurchaseId });
    } catch (error) {
        await connection.rollback();
        console.error("Create purchase error:", error);
        res.status(500).json({ error: 'Failed to record purchase.' });
    } finally {
        connection.release();
    }
});
// GET /api/reports/sold-products
app.get('/api/reports/sold-products', async (req, res) => {
  const { start, end, category, q, page = 1, perPage = 50 } = req.query;
  // تحويل للتايمستامب (ms)
  // server.js (داخل route)
const startTs = start ? Number(new Date(start).setHours(0,0,0,0)) : 0;
const endTs = end ? Number(new Date(end).setHours(23,59,59,999)) : Date.now();
  const offset = (Math.max(1, Number(page)) - 1) * Number(perPage);

  const connection = await pool.getConnection();
  try {
    // تجميع المبيعات خلال الفترة
    const salesAggQuery = `
      SELECT ti.product_id, SUM(ti.quantity) AS sold_qty, SUM(ti.quantity * ti.price) AS revenue
      FROM transaction_items ti
      JOIN transactions t ON ti.transaction_id = t.id
WHERE t.type = 'sale' AND t.status = 'closed' AND t.timestamp BETWEEN ? AND ?      GROUP BY ti.product_id
    `;

    // تجميع المرتجعات خلال الفترة
    const returnsAggQuery = `
      SELECT ri.product_id, SUM(ri.quantity) AS returned_qty
      FROM return_items ri
      JOIN returns r ON ri.return_id = r.id
      WHERE r.timestamp BETWEEN ? AND ?
      GROUP BY ri.product_id
    `;

    // النتيجة الأساسية — نربط مع products ونطبّق فلتر الاسم/باركود/القسم
    let mainQuery = `
      SELECT 
        p.id AS product_id,
        p.name AS product_name,
        p.barcode,
        p.category,
        p.stock,
        COALESCE(s.sold_qty, 0) AS sold_qty,
        COALESCE(s.revenue, 0) AS revenue,
        COALESCE(r.returned_qty, 0) AS returned_qty,
        (COALESCE(s.sold_qty, 0) - COALESCE(r.returned_qty, 0)) AS net_qty
     FROM products p
JOIN (${salesAggQuery}) s ON p.id = s.product_id
LEFT JOIN (${returnsAggQuery}) r ON p.id = r.product_id

    `;

    // شروط البحث
    const filters = [];
    const params = [startTs, endTs, startTs, endTs]; // salesAgg params then returnsAgg params

    if (category) {
      filters.push('p.category = ?');
      params.push(category);
    }

    if (q) {
      filters.push('(p.name LIKE ? OR p.barcode LIKE ?)');
      const pattern = `%${q}%`;
      params.push(pattern, pattern);
    }

    if (filters.length) {
      mainQuery += ' WHERE ' + filters.join(' AND ');
    }

    // ترتيب بحسب الأكثر مبيعًا (الصافي) ثم تقييد الصفوف (pagination)
    mainQuery += ` ORDER BY net_qty DESC LIMIT ? OFFSET ?`;
    params.push(Number(perPage), offset);

    // تنفيذ
    const [rows] = await connection.execute(mainQuery, params);

    // (اختياري) احسب إجمالي المنتجات المطابقة (لإظهار عدد الصفحات) - استعلام بسيط
    let totalCount = null;
    try {
      let countQuery = `SELECT COUNT(*) as cnt FROM products p`;
      const countParams = [];
      if (filters.length) {
        countQuery += ' WHERE ' + filters.join(' AND ');
        // filters used earlier rely on params order; but the sales/returns params were first — adjust:
        // For count we only need category/q filters — use local params derived from req.query
        const countLocalParams = [];
        if (category) countLocalParams.push(category);
        if (q) countLocalParams.push(`%${q}%`, `%${q}%`);
        const [countRows] = await connection.execute(countQuery, countLocalParams);
        totalCount = countRows[0].cnt;
      } else {
        const [countRows] = await connection.execute(countQuery);
        totalCount = countRows[0].cnt;
      }
    } catch (e) {
      totalCount = null;
    }

    res.json({ data: rows, page: Number(page), perPage: Number(perPage), totalCount });
  } catch (error) {
    console.error('Failed to fetch sold-products report:', error);
    res.status(500).json({ error: 'Failed to fetch sold-products report.' });
  } finally {
    connection.release();
  }
});

// Purchases
// *** MODIFIED: This endpoint now handles all search and list functionality ***
// ==============================
// Search Purchases (Smart/Unified History)
// ==============================
app.get('/api/purchases/search', async (req, res) => {
    res.setHeader('Cache-Control', 'no-cache');
    
    // نستقبل مصطلح البحث ونوع البحث
    const { term, type } = req.query; 

    // الاستعلام الأساسي: يبدأ بعرض جميع المشتريات مع اسم المورد واسم المستخدم
    let query = `
        SELECT p.id, p.created_at, p.total_amount, s.name as supplier_name, u.username as user_name
        FROM purchases p
        LEFT JOIN suppliers s ON p.supplier_id = s.id
        LEFT JOIN users u ON p.user_id = u.id
    `;
    const params = [];
    const conditions = [];

    const trimmedTerm = term ? term.trim() : '';

    // إذا كان هناك مصطلح بحث، نقوم بإنشاء شروط البحث
    if (trimmedTerm !== '') {
        const searchTerm = `%${trimmedTerm}%`;
        
        // التعامل مع أنواع البحث المختلفة
        if (type === 'invoiceId' && !isNaN(parseInt(trimmedTerm, 10))) {
            // البحث برقم الفاتورة (مطابقة تامة)
            conditions.push(`p.id = ?`);
            params.push(parseInt(trimmedTerm, 10));

        } else if (type === 'supplierName') {
            // البحث باسم المورد
            conditions.push(`s.name LIKE ?`);
            params.push(searchTerm);

        } else if (type === 'productName' || type === 'productBarcode') {
            // البحث باسم المنتج أو الباركود يتطلب الانضمام إلى جدول purchase_items و products
            
            // نغير الاستعلام الأساسي لاستخدام DISTINCT لتجنب تكرار الفواتير
            query = `
                SELECT DISTINCT p.id, p.created_at, p.total_amount, s.name as supplier_name, u.username as user_name
                FROM purchases p
                LEFT JOIN suppliers s ON p.supplier_id = s.id
                LEFT JOIN users u ON p.user_id = u.id
                JOIN purchase_items pi ON p.id = pi.purchase_id
                JOIN products pr ON pi.product_id = pr.id
            `;

            if (type === 'productName') {
                conditions.push(`pr.name LIKE ?`);
            } else { // productBarcode
                conditions.push(`pr.barcode LIKE ?`);
            }
            params.push(searchTerm);
        }
    }
    
    // إضافة شروط WHERE إن وجدت (في حالة البحث)
    if (conditions.length > 0) {
        query += ' WHERE ' + conditions.join(' AND ');
    }
    
    // إضافة الترتيب والحد. يتم تطبيق هذا سواء كان البحث مفعلاً أو كان لعرض السجل بالكامل.
    query += ' ORDER BY p.created_at DESC LIMIT 100'; 

    try {
        const [results] = await pool.execute(query, params);
        res.json(results);
    } catch (error) {
        console.error('Advanced purchase search error:', error);
        res.status(500).json({ error: 'A database error occurred during advanced search.' });
    }
});



// Product History
app.get('/api/products/:id/history', async (req, res) => {
    const { id } = req.params;
    try {
        const query = `
            SELECT 'Sale' as type, t.id as related_id, t.timestamp, ti.quantity * -1 as quantity_change, CONCAT('Sale to customer #', t.customer_id) as notes FROM transactions t JOIN transaction_items ti ON t.id = ti.transaction_id WHERE ti.product_id = ? AND t.type = 'sale' AND t.status = 'closed'
            UNION ALL
            SELECT 'Purchase' as type, p.id as related_id, UNIX_TIMESTAMP(p.created_at) * 1000 as timestamp, pi.quantity as quantity_change, CONCAT('Purchase from supplier #', p.supplier_id) as notes FROM purchases p JOIN purchase_items pi ON p.id = pi.purchase_id WHERE pi.product_id = ?
            UNION ALL
            SELECT 'Return' as type, r.id as related_id, r.timestamp, ri.quantity as quantity_change, CONCAT('Return on invoice #', r.original_transaction_id) as notes FROM returns r JOIN return_items ri ON r.id = ri.return_id WHERE ri.product_id = ?
            ORDER BY timestamp DESC`;
        const [rows] = await pool.execute(query, [id, id, id]);
        res.json(rows);
    } catch (error) {
        console.error(`Fetch product history error for id ${id}:`, error);
        res.status(500).json({ error: 'Failed to fetch product history.' });
    }
});

// Expenses CRUD
app.get('/api/expenses', async (req, res) => {
    try {
        const query = `SELECT e.*, u.username FROM expenses e JOIN users u ON e.user_id = u.id ORDER BY e.expense_date DESC`;
        const [rows] = await pool.execute(query);
        res.json(rows);
    } catch (error) {
        console.error("Fetch expenses error:", error);
        res.status(500).json({ error: 'Failed to fetch expenses.' });
    }
});

app.post('/api/expenses', async (req, res) => {
    const { description, amount, category, expense_date, user_id } = req.body;
    if (!description || !amount || !expense_date || !user_id) return res.status(400).json({ error: 'Missing required expense data.' });
    try {
        const [result] = await pool.execute(
            'INSERT INTO expenses (description, amount, category, expense_date, user_id) VALUES (?, ?, ?, ?, ?)',
            [description, amount, category || null, expense_date, user_id]
        );
        res.status(201).json({ id: result.insertId, description, amount, category, expense_date, user_id });
    } catch (error) {
        console.error("Insert expense error:", error);
        res.status(500).json({ error: 'Failed to create expense.' });
    }
});

app.put('/api/expenses/:id', async (req, res) => {
    const { id } = req.params;
    const { description, amount, category, expense_date } = req.body;
    if (!description || !amount || !expense_date) return res.status(400).json({ error: 'Missing required expense data.' });
    try {
        await pool.execute(
            'UPDATE expenses SET description = ?, amount = ?, category = ?, expense_date = ? WHERE id = ?',
            [description, amount, category || null, expense_date, id]
        );
        res.status(200).json({ id: Number(id), description, amount, category, expense_date });
    } catch (error) {
        console.error("Update expense error:", error);
        res.status(500).json({ error: 'Failed to update expense.' });
    }
});

app.delete('/api/expenses/:id', async (req, res) => {
    const { id } = req.params;
    try {
        await pool.execute('DELETE FROM expenses WHERE id = ?', [id]);
        res.status(204).send();
    } catch (error) {
        console.error("Delete expense error:", error);
        res.status(500).json({ error: 'Failed to delete expense.' });
    }
});
// فواتير البيع المعلقة: GET /api/pending-sales
app.get('/api/pending-sales', async (req, res) => {
    try {
        const [rows] = await pool.execute(
            `SELECT t.id, u.username AS seller, c.name AS customer, t.final_total, DATE(FROM_UNIXTIME(t.timestamp / 1000)) AS date
             FROM transactions t
             LEFT JOIN users u ON t.user_id = u.id
             LEFT JOIN customers c ON t.customer_id = c.id
             WHERE t.type = 'sale' AND t.status = 'pending'
             ORDER BY t.timestamp DESC`
        );
        res.json(rows);
    } catch (error) {
        console.error("Fetch pending sales error:", error);
        res.status(500).json({ error: 'تعذر جلب الفواتير المعلقة.' });
    }
});

// تقفيل الفواتير المحددة: POST /api/close-sales
app.post('/api/close-sales', async (req, res) => {
    const { ids } = req.body;
    if (!Array.isArray(ids) || ids.length === 0) {
        return res.status(400).json({ message: "يرجى إرسال معرفات الفواتير" });
    }
    try {
        // توليد قائمة علامات استفهام بحسب عدد العناصر
        const placeholders = ids.map(() => '?').join(',');
        // تحقق أن جميع الفواتير فعلاً معلقة
        const [rows] = await pool.execute(
            `SELECT id FROM transactions WHERE id IN (${placeholders}) AND type = 'sale' AND status = 'pending'`,
            ids
        );
        if (rows.length === 0) {
            return res.status(404).json({ message: "لم يتم العثور على فواتير معلقة بهذا المعرف." });
        }
        // تحديث حالة الفواتير
        await pool.execute(
            `UPDATE transactions SET status = 'closed' WHERE id IN (${placeholders}) AND type = 'sale' AND status = 'pending'`,
            ids
        );
        res.json({ message: "تم تقفيل الفواتير بنجاح ✅" });
    } catch (error) {
        console.error("Close sales error:", error);
        res.status(500).json({ message: "حدث خطأ أثناء التقفيل" });
    }
});
// Settings
app.get('/api/settings', async (req, res) => {
    try {
        const [rows] = await pool.execute('SELECT * FROM settings WHERE id = 1');
        if (rows.length === 0) return res.status(404).json({ error: 'Settings not found.' });
        res.json(rows[0]);
    } catch (error) {
        console.error("Fetch settings error:", error);
        res.status(500).json({ error: 'Failed to fetch settings.' });
    }
});

app.put('/api/settings', async (req, res) => {
    const settings = req.body;
    try {
        if (settings.store_logo && settings.store_logo.startsWith('data:image')) {
            const base64Data = settings.store_logo.replace(/^data:image\/\w+;base64,/, "");
            const buffer = Buffer.from(base64Data, 'base64');
            const extension = settings.store_logo.split(';')[0].split('/')[1];
            const fileName = `logo-${Date.now()}.${extension}`;
            const uploadsDir = path.join(__dirname, 'public/uploads');
            await fs.mkdir(uploadsDir, { recursive: true }); // Ensure directory exists
            const imagePath = path.join(uploadsDir, fileName);
            await fs.writeFile(imagePath, buffer);
            settings.store_logo = `/uploads/${fileName}`;
        }
        const sql = `
            UPDATE settings SET 
                store_name = ?, store_logo = ?, address = ?, phone = ?, 
                email = ?, website = ?, receipt_footer = ?, currency_symbol = ?, 
                currency_code = ?, tax_rate = ?, enable_discounts = ?, tax_mode = ?,
                allow_overselling = ?, enable_wholesale = ?, default_customer_id = ?
            WHERE id = 1`;
        await pool.execute(sql, [
            settings.store_name, settings.store_logo, settings.address, settings.phone,
            settings.email, settings.website, settings.receipt_footer, settings.currency_symbol,
            settings.currency_code, settings.tax_rate, settings.enable_discounts, settings.tax_mode,
            settings.allow_overselling, settings.enable_wholesale, settings.default_customer_id
        ]);
        res.json({ message: 'Settings updated successfully!' });
    } catch (error) {
        console.error("Update settings error:", error);
        res.status(500).json({ error: 'Failed to update settings.' });
    }
});

// All Transactions
app.get('/api/all-transactions', async (req, res) => {
    try {
        const query = `
            (SELECT 'sale' AS type, t.id, t.final_total AS amount, FROM_UNIXTIME(t.timestamp / 1000) AS date, CONCAT('Sale #', t.id) AS description, c.name AS party 
             FROM transactions t 
             LEFT JOIN customers c ON t.customer_id = c.id 
             WHERE t.type = 'sale' AND t.status = 'closed')
            UNION ALL
            (SELECT 'return' AS type, r.id, -r.total_amount AS amount, FROM_UNIXTIME(r.timestamp / 1000) AS date, CONCAT('Return for sale #', r.original_transaction_id) AS description, NULL AS party FROM returns r)
            UNION ALL
            (SELECT 'purchase' AS type, p.id, -p.total_amount AS amount, p.created_at AS date, CONCAT('Purchase from ', s.name) AS description, s.name AS party FROM purchases p JOIN suppliers s ON p.supplier_id = s.id)
            UNION ALL
            (SELECT 'expense' AS type, e.id, -e.amount AS amount, e.created_at AS date, e.description, e.category AS party FROM expenses e)
            ORDER BY date DESC`;
        const [rows] = await pool.execute(query);
        res.json(rows);
    } catch (error) {
        console.error("Fetch all transactions error:", error);
        res.status(500).json({ error: 'Failed to fetch all transactions.' });
    }
});
// =================================================================
// --- Smart Inventory Counting ---
// =================================================================

// Get a printable worksheet for a potential count
app.get('/api/inventory/worksheet', async (req, res) => {
    const { count_type, count_scope } = req.query;
    
    let query = "SELECT name, barcode, price, stock FROM products";
    const params = [];

    if (count_type === 'CATEGORY' && count_scope) {
        query += " WHERE category = ?";
        params.push(count_scope);
    } else if (count_type === 'SUPPLIER' && count_scope) {
        query = `
            SELECT p.name, p.barcode, p.price, p.stock 
            FROM products p
            WHERE p.id IN (
                SELECT DISTINCT pi.product_id 
                FROM purchase_items pi
                JOIN purchases pu ON pi.purchase_id = pu.id
                WHERE pu.supplier_id = ?
            )
        `;
        params.push(count_scope);
    }
    query += " ORDER BY name ASC";

    try {
        const [products] = await pool.execute(query, params);
        res.json(products);
    } catch (error) {
        console.error("Fetch worksheet error:", error);
        res.status(500).json({ error: 'Failed to fetch worksheet data.' });
    }
});

// Get the currently active (in-progress) inventory count
app.get('/api/inventory/counts/active', async (req, res) => {
    const connection = await pool.getConnection();
    try {
        const [counts] = await connection.execute("SELECT * FROM inventory_counts WHERE status = 'IN_PROGRESS' ORDER BY created_at DESC LIMIT 1");
        if (counts.length === 0) {
            return res.json(null);
        }
        const activeCount = counts[0];
        const [items] = await connection.execute(
            `SELECT ici.*, p.name, p.barcode, p.cost FROM inventory_count_items ici JOIN products p ON ici.product_id = p.id WHERE ici.inventory_count_id = ? ORDER BY p.name`,
            [activeCount.id]
        );
        res.json({ ...activeCount, items });
    } catch (error) {
        console.error("Fetch active count error:", error);
        res.status(500).json({ error: 'Failed to fetch active inventory count.' });
    } finally {
        connection.release();
    }
});

// Start a new inventory count
app.post('/api/inventory/counts/start', async (req, res) => {
    const { user_id, count_type, count_scope } = req.body;
    const connection = await pool.getConnection();
    try {
        await connection.beginTransaction();
        const [existing] = await connection.execute("SELECT id FROM inventory_counts WHERE status = 'IN_PROGRESS'");
        if (existing.length > 0) {
            await connection.rollback();
            return res.status(409).json({ error: 'An inventory count is already in progress.' });
        }
        
        const [result] = await connection.execute(
            "INSERT INTO inventory_counts (user_id, count_type, count_scope, status) VALUES (?, ?, ?, 'IN_PROGRESS')", 
            [user_id, count_type || 'ALL', count_scope || null]
        );
        const newCountId = result.insertId;

        let productQuery = "SELECT id, stock FROM products";
        const params = [];
        if (count_type === 'CATEGORY' && count_scope) {
            productQuery += " WHERE category = ?";
            params.push(count_scope);
        } else if (count_type === 'SUPPLIER' && count_scope) {
            productQuery = `
                SELECT id, stock FROM products 
                WHERE id IN (
                    SELECT DISTINCT pi.product_id 
                    FROM purchase_items pi JOIN purchases pu ON pi.purchase_id = pu.id 
                    WHERE pu.supplier_id = ?
                )`;
            params.push(count_scope);
        }

        const [products] = await connection.execute(productQuery, params);
        if (products.length === 0) {
            await connection.rollback();
            return res.status(404).json({ error: 'No products found for the selected filter.' });
        }

        const itemInsertPromises = products.map(p => {
            const sql = "INSERT INTO inventory_count_items (inventory_count_id, product_id, expected_quantity) VALUES (?, ?, ?)";
            return connection.execute(sql, [newCountId, p.id, p.stock]);
        });
        await Promise.all(itemInsertPromises);
        
        await connection.commit();
        res.status(201).json({ inventory_count_id: newCountId, message: 'Inventory count started successfully.' });
    } catch (error) {
        await connection.rollback();
        console.error("Start count error:", error);
        res.status(500).json({ error: 'Failed to start inventory count.' });
    } finally {
        connection.release();
    }
});

// Update the counted quantity for a single item
app.put('/api/inventory/counts/items/:id', async (req, res) => {
    const { id } = req.params;
    const { counted_quantity } = req.body;
    try {
        await pool.execute(
            "UPDATE inventory_count_items SET counted_quantity = ? WHERE id = ?", 
            [counted_quantity, id]
        );
        res.json({ message: 'Item count updated.' });
    } catch (error) {
        console.error("Update count item error:", error);
        res.status(500).json({ error: 'Failed to update item count.' });
    }
});

// Finalize an inventory count and update all stock levels
app.post('/api/inventory/counts/:id/finalize', async (req, res) => {
    const { id } = req.params;
    const connection = await pool.getConnection();
    try {
        await connection.beginTransaction();

        const [items] = await connection.execute(
            `SELECT ici.product_id, ici.counted_quantity, ici.expected_quantity, p.cost 
             FROM inventory_count_items ici 
             JOIN products p ON ici.product_id = p.id 
             WHERE ici.inventory_count_id = ?`, 
            [id]
        );

        let totalVarianceValue = 0;
        const updatePromises = items.map(item => {
            const counted = item.counted_quantity ?? item.expected_quantity;
            const variance = counted - item.expected_quantity;
            totalVarianceValue += variance * item.cost;
            return connection.execute("UPDATE products SET stock = ? WHERE id = ?", [counted, item.product_id]);
        });
        await Promise.all(updatePromises);

        await connection.execute(
            "UPDATE inventory_counts SET status = 'COMPLETED', finalized_at = NOW() WHERE id = ?", 
            [id]
        );

        await connection.commit();
        res.json({ message: 'Inventory count finalized successfully!', totalVarianceValue });
    } catch (error) {
        await connection.rollback();
        console.error("Finalize count error:", error);
        res.status(500).json({ error: 'Failed to finalize inventory count.' });
    } finally {
        connection.release();
    }
});

// TRANSACTIONS (Sales, Returns, Search, Details)
app.get('/api/transactions/search', async (req, res) => {
    const { id, startDate, endDate } = req.query;
    const connection = await pool.getConnection();
    try {
        let query = `SELECT t.id, t.final_total, t.discount, t.notes, t.timestamp, u.username, c.name as customer_name FROM transactions t JOIN users u ON t.user_id = u.id LEFT JOIN customers c ON t.customer_id = c.id`;
        const params = [];
        if (id) {
            query += ' WHERE t.id = ?';
            params.push(id);
        } else if (startDate && endDate) {
            const startTimestamp = new Date(startDate).getTime();
            const endTimestamp = new Date(`${endDate}T23:59:59.999Z`).getTime();
            query += ' WHERE t.timestamp BETWEEN ? AND ?';
            params.push(startTimestamp, endTimestamp);
        }
        query += ' ORDER BY t.timestamp DESC';
        const [rows] = await connection.execute(query, params);
        const processedRows = await Promise.all(rows.map(async (row) => {
            const [items] = await connection.execute('SELECT product_id, item_name, quantity, price FROM transaction_items WHERE transaction_id = ?', [row.id]);
            const [payments] = await connection.execute('SELECT payment_method, amount FROM transaction_payment_methods WHERE transaction_id = ?', [row.id]);
            return { ...row, items, payment_methods: payments };
        }));
        res.json(processedRows);
    } catch (error) {
        console.error('Transaction search error:', error);
        res.status(500).json({ error: 'Failed to search transactions.' });
    } finally {
        connection.release();
    }
});
// CREATE RETURN (إضافة مرتجع)

// CREATE RETURN (إضافة مرتجع)
app.post('/api/returns', async (req, res) => {
    const { original_transaction_id, items, payment_methods, user_id } = req.body;

    if (
        !original_transaction_id ||
        !Array.isArray(items) || items.length === 0 ||
        !Array.isArray(payment_methods) || payment_methods.length === 0 ||
        !user_id
    ) {
        return res.status(400).json({
            error: 'Original Transaction ID, items, payment methods, and user_id are required.'
        });
    }

    const connection = await pool.getConnection();
    try {
        await connection.beginTransaction();

        // ✅ إجمالي المرتجع
        const total_amount = items.reduce((sum, item) => sum + (item.price * item.quantity), 0);

        // ✅ الوقت الحالي بالـ milliseconds
        const timestamp = Date.now();

        // ✅ إدخال سجل المرتجع
        const insertReturnQuery = `
            INSERT INTO returns (original_transaction_id, user_id, total_amount, notes, timestamp) 
            VALUES (?, ?, ?, ?, ?)
        `;
        const [returnResult] = await connection.execute(insertReturnQuery, [
            original_transaction_id,
            user_id,
            total_amount,
            'Returned from POS',
            timestamp
        ]);

        const return_id = returnResult.insertId;

        // ✅ المنتجات المرتجعة
        const insertItemQuery = `
            INSERT INTO return_items (return_id, product_id, quantity, price_at_return)
            VALUES (?, ?, ?, ?)
        `;
    for (let item of items) {
        const productId = item.product_id;  
            // 1. إدخال سجل المرتجع (لجميع الأصناف بما فيها اليدوية)
            await connection.execute(insertItemQuery, [
                return_id,
                productId,
                item.quantity,
                item.price
            ]);

            // 2. تحديث المخزون (فقط للمنتجات التي لديها ID صالح)
            if (productId && productId > 0) {
                await connection.execute(
                    'UPDATE products SET stock = stock + ? WHERE id = ?',
                    [item.quantity, productId]
                );
            }
        }

        // ✅ وسائل الدفع
        const insertPaymentQuery = `
            INSERT INTO return_payment_methods (return_id, payment_method, amount) 
            VALUES (?, ?, ?)
        `;
        for (let pm of payment_methods) {
            await connection.execute(insertPaymentQuery, [
                return_id,
                pm.method,
                pm.amount
            ]);
        }

        await connection.commit();

        res.status(201).json({
            message: 'Return processed successfully',
            return_id,
            total_amount,
            items,
            payment_methods,
            timestamp
        });
    } catch (error) {
        await connection.rollback();
        console.error("Failed to process return:", error);
        res.status(500).json({ error: 'Failed to process return.' });
    } finally {
        connection.release();
    }
});


app.get('/api/transactions/:id', async (req, res) => {
    const { id } = req.params;
    const connection = await pool.getConnection();
    try {
        // 1- بيانات الفاتورة الأصلية
        const transactionQuery = `
            SELECT t.*, c.name as customer_name, u.username as user_name
            FROM transactions t
            LEFT JOIN customers c ON t.customer_id = c.id
            LEFT JOIN users u ON t.user_id = u.id
            WHERE t.id = ?
        `;
        const [transactionRows] = await connection.execute(transactionQuery, [id]);
        if (transactionRows.length === 0) 
            return res.status(404).json({ error: 'Transaction not found.' });

        const transaction = transactionRows[0];

        // 2- الأصناف المباعة
        const itemsQuery = `
            SELECT ti.*, p.name as productName 
            FROM transaction_items ti
            LEFT JOIN products p ON ti.product_id = p.id
            WHERE ti.transaction_id = ?
        `;
        const [itemsRows] = await connection.execute(itemsQuery, [id]);
        transaction.items = itemsRows.map(item => ({
            ...item,
            name: item.productName || item.item_name
        }));

        // 3- طرق الدفع
        const paymentsQuery = `
            SELECT payment_method, amount 
            FROM transaction_payment_methods 
            WHERE transaction_id = ?
        `;
        const [payments] = await connection.execute(paymentsQuery, [id]);
        transaction.payment_methods = payments;

        // 4- المرتجعات المرتبطة بالفاتورة
        const returnsQuery = `
            SELECT r.*, u.username as return_user 
            FROM returns r
            LEFT JOIN users u ON r.user_id = u.id
            WHERE r.original_transaction_id = ?
        `;
        const [returnsRows] = await connection.execute(returnsQuery, [id]);

        for (let ret of returnsRows) {
            // أصناف المرتجع
            const [returnItems] = await connection.execute(
                `SELECT ri.*, p.name as productName 
                 FROM return_items ri
                 LEFT JOIN products p ON ri.product_id = p.id
                 WHERE ri.return_id = ?`, 
                [ret.id]
            );
            ret.items = returnItems.map(item => ({
                ...item,
                name: item.productName
            }));

            // طرق الدفع للمرتجع
            const [returnPayments] = await connection.execute(
                `SELECT payment_method, amount 
                 FROM return_payment_methods 
                 WHERE return_id = ?`,
                [ret.id]
            );
            ret.payment_methods = returnPayments;
        }

        transaction.returns = returnsRows;

        res.json(transaction);

    } catch (error) {
        console.error(`Fetch transaction ${id} error:`, error);
        res.status(500).json({ error: 'Failed to fetch transaction details.' });
    } finally {
        connection.release();
    }
});



app.post('/api/transactions', async (req, res) => {
    const { total, final_total, discount, payment_methods, notes, is_delivery, user_id, customer_id, items } = req.body;
    if (!items || items.length === 0) return res.status(400).json({ error: 'Cannot process a sale with no items.' });
    const connection = await pool.getConnection();
    try {
        await connection.beginTransaction();
        const transactionSql = `INSERT INTO transactions (\`total\`, \`final_total\`, \`discount\`, \`notes\`, \`is_delivery\`, \`user_id\`, \`customer_id\`, \`type\`, \`timestamp\`) VALUES (?, ?, ?, ?, ?, ?, ?, 'sale', ?)`;
        const transactionResult = await connection.execute(transactionSql, [total, final_total, discount, notes, is_delivery, user_id, customer_id || null, Date.now()]);
        const newTransactionId = transactionResult[0].insertId;
        for (const payment of payment_methods) {
            await connection.execute(`INSERT INTO transaction_payment_methods (transaction_id, payment_method, amount) VALUES (?, ?, ?)`, [newTransactionId, payment.method, payment.amount]);
        }
        for (const item of items) {
            if (item.id > 0) {
                await connection.execute(`INSERT INTO transaction_items (transaction_id, product_id, quantity, price, discount) VALUES (?, ?, ?, ?, ?)`, [newTransactionId, item.id, item.quantity, item.price, 0]);
                await connection.execute('UPDATE products SET stock = stock - ? WHERE id = ?', [item.quantity, item.id]);
            } else {
                await connection.execute(`INSERT INTO transaction_items (transaction_id, product_id, quantity, price, discount, item_name, item_price) VALUES (?, ?, ?, ?, ?, ?, ?)`, [newTransactionId, null, item.quantity, item.price, 0, item.name, item.price]);
            }
        }
        await connection.commit();
        res.status(201).json({ message: 'Sale processed successfully', transactionId: newTransactionId });
    } catch (error) {
        await connection.rollback();
        console.error("Create sale error:", error);
        res.status(500).json({ error: 'Failed to process sale.' });
    } finally {
        connection.release();
    }
});





// SHIFT MANAGEMENT
app.post('/api/shifts/close', async (req, res) => {
    const { actual_cash, actual_card, user_id } = req.body;
    if (actual_cash === undefined || actual_card === undefined || !user_id) {
        return res.status(400).json({ error: 'Actual cash, card, and user_id are required.' });
    }

    const connection = await pool.getConnection();
    try {
        // آخر شفت منتهي
        const [lastShifts] = await connection.execute('SELECT end_time FROM shifts ORDER BY end_time DESC LIMIT 1');
        const startTime = lastShifts.length > 0 ? lastShifts[0].end_time : 0;
        const endTime = new Date().getTime();
        const params = [startTime, endTime];

        // المبيعات حسب وسيلة الدفع
        const salesQuery = `
            SELECT 
                SUM(CASE WHEN payment_method = 'cash' THEN amount ELSE 0 END) as total_cash,
                SUM(CASE WHEN payment_method = 'card' THEN amount ELSE 0 END) as total_card,
                SUM(CASE WHEN payment_method = 'wallet' THEN amount ELSE 0 END) as total_wallet,
                SUM(CASE WHEN payment_method = 'instapay' THEN amount ELSE 0 END) as total_instapay,
                SUM(CASE WHEN payment_method = 'credit' THEN amount ELSE 0 END) as total_credit
            FROM transaction_payment_methods tpm
            JOIN transactions t ON tpm.transaction_id = t.id
           WHERE t.type = 'sale' AND t.status = 'closed' AND t.timestamp BETWEEN ? AND ?;
        `;
        const [salesRows] = await connection.execute(salesQuery, params);
        const expectedSales = salesRows[0];

        // المرتجعات حسب وسيلة الدفع
        const returnsByMethodQuery = `
            SELECT rpm.payment_method, SUM(rpm.amount) as total
            FROM return_payment_methods rpm
            JOIN returns r ON rpm.return_id = r.id
            WHERE r.timestamp BETWEEN ? AND ?
            GROUP BY rpm.payment_method;
        `;
        const [returnsByMethodRows] = await connection.execute(returnsByMethodQuery, params);

        const returnsByMethod = {
            cash: 0,
            card: 0,
            wallet: 0,
            instapay: 0,
            credit: 0
        };
        returnsByMethodRows.forEach(row => {
            returnsByMethod[row.payment_method] = row.total || 0;
        });

        // المصروفات
        const expensesQuery = `
            SELECT SUM(amount) as total_expenses 
            FROM expenses 
            WHERE created_at >= FROM_UNIXTIME(? / 1000) 
              AND created_at <= FROM_UNIXTIME(? / 1000);
        `;
        const [expensesRows] = await connection.execute(expensesQuery, params);
        const totalExpenses = expensesRows[0].total_expenses || 0;

        // الحسابات النهائية
        const expected_cash = (expectedSales.total_cash || 0) - (returnsByMethod.cash || 0) - totalExpenses;
        const expected_card = (expectedSales.total_card || 0) - (returnsByMethod.card || 0);
        const expected_wallet = (expectedSales.total_wallet || 0) - (returnsByMethod.wallet || 0);
        const expected_instapay = (expectedSales.total_instapay || 0) - (returnsByMethod.instapay || 0);
        const expected_credit = (expectedSales.total_credit || 0) - (returnsByMethod.credit || 0);

        const variance = (parseFloat(actual_cash) + parseFloat(actual_card)) - (expected_cash + expected_card);

        // إدخال الشفت الجديد
        const insertQuery = `
            INSERT INTO shifts 
            (user_id, start_time, end_time, expected_cash, actual_cash, expected_card, actual_card, variance, status, expected_wallet, expected_instapay, expected_credit, total_expenses)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'CLOSED', ?, ?, ?, ?);
        `;
        const [insertResult] = await connection.execute(insertQuery, [
            user_id, startTime, endTime,
            expected_cash, parseFloat(actual_cash),
            expected_card, parseFloat(actual_card),
            variance, expected_wallet,
            expected_instapay, expected_credit,
            totalExpenses
        ]);

        const newShiftId = insertResult.insertId;

        // اسم المستخدم
        const [users] = await connection.execute('SELECT username FROM users WHERE id = ?', [user_id]);
        const username = users.length > 0 ? users[0].username : 'Unknown';

        const finalShiftReport = {
            id: newShiftId,
            user_id,
            username,
            start_time: startTime,
            end_time: endTime,
            expected_cash,
            actual_cash: parseFloat(actual_cash),
            expected_card,
            actual_card: parseFloat(actual_card),
            variance,
            expected_wallet,
            expected_instapay,
            expected_credit,
            total_expenses: totalExpenses
        };

        res.status(201).json(finalShiftReport);
    } catch (error) {
        console.error("Failed to close shift:", error);
        res.status(500).json({ error: 'Failed to close shift.' });
    } finally {
        connection.release();
    }
});




app.get('/api/shifts/history', async (req, res) => {
    const { date } = req.query;
    if (!date) return res.status(400).json({ error: 'Date query parameter is required.' });
    const startOfDay = new Date(date).setHours(0, 0, 0, 0);
    const endOfDay = new Date(date).setHours(23, 59, 59, 999);
    const connection = await pool.getConnection();
    try {
        const query = `SELECT s.*, u.username FROM shifts s JOIN users u ON s.user_id = u.id WHERE s.end_time BETWEEN ? AND ? ORDER BY s.end_time DESC;`;
        const [shifts] = await connection.execute(query, [startOfDay, endOfDay]);
        res.json(shifts);
    } catch (error) {
        console.error("Failed to fetch shift history:", error);
        res.status(500).json({ error: 'Failed to fetch shift history.' });
    } finally {
        connection.release();
    }
});

// Final Error Handlers
app.use((req, res, next) => {
    res.status(404).json({ error: `Route not found: ${req.originalUrl}` });
});

app.use((err, req, res, next) => {
    console.error('--- UNHANDLED SERVER ERROR ---');
    console.error(err.stack);
    console.error('-----------------------------');
    res.status(500).json({ error: 'An internal server error occurred.' });
});


// Start Server
app.listen(port, () => {
    console.log(`✅ Server is stable and listening on http://localhost:${port}`);
});