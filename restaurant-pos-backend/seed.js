import pg from 'pg';
import dotenv from 'dotenv';
import bcrypt from 'bcrypt';

dotenv.config();

const pool = new pg.Pool({
  host: process.env.PGHOST,
  user: process.env.PGUSER,
  password: process.env.PGPASSWORD,
  database: process.env.PGDATABASE,
  port: process.env.PGPORT,
});

async function seedDatabase() {
  const client = await pool.connect();
  try {
    console.log('🌱 Starting database seeding...');

    // ============================================================================
    // 0. Cleanup (proper order respecting foreign keys)
    // ============================================================================
    console.log('🧹 Cleaning up tables...');
    const cleanupTables = [
      'order_item_note_options',
      'order_items',
      'orders',
      'recipe_ingredients',
      'recipes',
      'menu_item_note_options',
      'note_options',
      'menu_items',
      'categories',
      'sub_categories',
      'main_categories',
      'customer_locations',
      'customers',
      'driver_locations',
      'drivers',
      'printers',
      'kitchens',
      'tables',
      'halls',
      'expenses',
      'inventory_items',
      'suppliers',
      'delivery_zones',
      'employees',
      'activity_logs',
      'shifts',
      'business_days',
      'settings',
      'users',
    ];
    for (const t of cleanupTables) {
      try {
        await client.query(`DELETE FROM ${t}`);
      } catch (e) {
        console.log(`  ⚠️  ${t}: ${e.message}`);
      }
    }

    // ============================================================================
    // 1. Create Admin User
    // ============================================================================
    console.log('Creating admin user...');
    const hashedPassword = await bcrypt.hash('admin123', 10);
    await client.query(`DELETE FROM users WHERE username = 'admin'`);
    await client.query(
      `INSERT INTO users (username, password, role, is_active)
       VALUES ('admin', $1, 'Admin', true)`,
      [hashedPassword]
    );
    console.log('✅ Admin user created');

    // ============================================================================
    // 2. Create Main Categories
    // ============================================================================
    console.log('Creating main categories...');
    const mainCats = ['مشروبات', 'أطعمة', 'حلويات', 'مقبلات'];
    for (const cat of mainCats) {
      await client.query(
        `INSERT INTO main_categories (name) VALUES ($1)`,
        [cat]
      );
    }
    console.log('✅ Main categories created');

    // ============================================================================
    // 3. Create Sub-Categories
    // ============================================================================
    console.log('Creating sub-categories...');
    const mainCatResult = await client.query('SELECT * FROM main_categories');
    const mainCatsMap = {};
    mainCatResult.rows.forEach(row => mainCatsMap[row.name] = row.id);

    const subCategories = [
      { name: 'عصائر طبيعية', mainCat: 'مشروبات' },
      { name: 'قهوة', mainCat: 'مشروبات' },
      { name: 'شاي', mainCat: 'مشروبات' },
      { name: 'مشروبات غازية', mainCat: 'مشروبات' },
      { name: 'برجر', mainCat: 'أطعمة' },
      { name: 'بيتزا', mainCat: 'أطعمة' },
      { name: 'كيك', mainCat: 'حلويات' },
      { name: 'سلطات', mainCat: 'مقبلات' }
    ];

    for (const sub of subCategories) {
      await client.query(
        `INSERT INTO sub_categories (name, main_category_id) VALUES ($1, $2)`,
        [sub.name, mainCatsMap[sub.mainCat]]
      );
    }
    console.log('✅ Sub-categories created');

    // ============================================================================
    // 5. Create Halls
    // ============================================================================
    console.log('Creating halls...');
    try {
      const halls = ['صالة 1', 'صالة 2', 'صالة 3'];
      for (const hall of halls) {
        await client.query(`INSERT INTO halls (name) VALUES ($1)`, [hall]);
      }
      console.log('✅ Halls created');

      // ============================================================================
      // 6. Create Tables (FIXED: removed status column)
      // ============================================================================
      console.log('Creating tables...');
      const hallResult = await client.query('SELECT * FROM halls');
      for (const hall of hallResult.rows) {
        for (let i = 1; i <= 10; i++) {
          await client.query(
            `INSERT INTO tables (name, hall_id) VALUES ($1, $2)`,
            [`${i}`, hall.id]
          );
        }
      }
      console.log('✅ Tables created');
    } catch (err) {
      console.log('⚠️  Halls/Tables: ', err.message);
    }

    // ============================================================================
    // 7. Create Drivers (FIXED: removed vehicle and status columns)
    // ============================================================================
    console.log('Creating drivers...');
    try {
      // Ensure password column exists
      await client.query(`ALTER TABLE drivers ADD COLUMN IF NOT EXISTS password VARCHAR(255)`);
      const drivers = [
        { name: 'سائق 1', phone: '0500000001' },
        { name: 'سائق 2', phone: '0500000002' },
        { name: 'سائق 3', phone: '0500000003' }
      ];
      for (const driver of drivers) {
        await client.query(
          `INSERT INTO drivers (name, phone) VALUES ($1, $2)`,
          [driver.name, driver.phone]
        );
      }
      console.log('✅ Drivers created');

      // Activity Logs Table
      await client.query(`
        CREATE TABLE IF NOT EXISTS activity_logs (
          id SERIAL PRIMARY KEY,
          user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
          action VARCHAR(255) NOT NULL,
          entity_type VARCHAR(100),
          entity_id VARCHAR(100),
          details TEXT,
          ip_address VARCHAR(45),
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
      `);
    } catch (err) {
      console.log('⚠️  Drivers: ', err.message);
    }

    // ============================================================================
    // 8. Create Delivery Zones (FIXED: use delivery_fee instead of fee)
    // ============================================================================
    console.log('Creating delivery zones...');
    const zones = [
      { name: 'المنطقة الشمالية', fee: 15.00 },
      { name: 'المنطقة الجنوبية', fee: 20.00 },
      { name: 'المنطقة الشرقية', fee: 20.00 },
      { name: 'المنطقة الغربية', fee: 30.00 }
    ];
    for (const zone of zones) {
      await client.query(
        `INSERT INTO delivery_zones (name, delivery_fee, geojson) VALUES ($1, $2, $3)`,
        [zone.name, zone.fee, '{}']  // Add empty JSON object for geojson
      );
    }


    // ============================================================================
    // 9. Create Suppliers
    // ============================================================================
    console.log('Creating suppliers...');
    try {
      const suppliers = [
        { name: 'مورد المواد الغذائية', contact: 'أحمد', phone: '0501111111' },
        { name: 'مورد المشروبات', contact: 'محمد', phone: '0502222222' },
        { name: 'مورد اللحوم', contact: 'خالد', phone: '0503333333' }
      ];
      for (const supplier of suppliers) {
        await client.query(
          `INSERT INTO suppliers (name, contact_person, phone) VALUES ($1, $2, $3)`,
          [supplier.name, supplier.contact, supplier.phone]
        );
      }
      console.log('✅ Suppliers created');
    } catch (err) {
      console.log('⚠️  Suppliers: ', err.message);
    }

    // ============================================================================
    // 4. Create Categories
    // ============================================================================
    console.log('Creating categories...');
    const subCatResult = await client.query('SELECT * FROM sub_categories');
    const categories = [
      { name: 'عصير برتقال', subCatId: null },
      { name: 'عصير فراولة', subCatId: null },
      { name: 'قهوة عربية', subCatId: null },
      { name: 'كابتشينو', subCatId: null },
      { name: 'لاتيه', subCatId: null },
      { name: 'برجر لحم', subCatId: null },
      { name: 'برجر دجاج', subCatId: null },
      { name: 'بيتزا مارغريتا', subCatId: null },
      { name: 'بيتزا بيبروني', subCatId: null },
      { name: 'سلطة يونانية', subCatId: null },
      { name: 'سلطة سيزر', subCatId: null },
      { name: 'كيك شوكولاتة', subCatId: null },
      { name: 'كيك فانيليا', subCatId: null }
    ];

    const subCatsMap = {};
    subCatResult.rows.forEach(row => subCatsMap[row.name] = row.id);

    // Map each category to its subcategory
    const categoryMapping = {
      'عصير برتقال': 'عصائر طبيعية',
      'عصير فراولة': 'عصائر طبيعية',
      'قهوة عربية': 'قهوة',
      'كابتشينو': 'قهوة',
      'لاتيه': 'قهوة',
      'برجر لحم': 'برجر',
      'برجر دجاج': 'برجر',
      'بيتزا مارغريتا': 'بيتزا',
      'بيتزا بيبروني': 'بيتزا',
      'سلطة يونانية': 'سلطات',
      'سلطة سيزر': 'سلطات',
      'كيك شوكولاتة': 'كيك',
      'كيك فانيليا': 'كيك'
    };

    for (const cat of categories) {
      const subCatName = categoryMapping[cat.name];
      await client.query(
        `INSERT INTO categories (name, sub_category_id) VALUES ($1, $2)`,
        [cat.name, subCatsMap[subCatName]]
      );
    }
    console.log('✅ Categories created');

    // ============================================================================
    // 10. Create Inventory Items
    // ============================================================================
    console.log('Creating inventory items...');
    try {
      const supplierResult = await client.query('SELECT * FROM suppliers LIMIT 1');
      if (supplierResult.rows.length > 0) {
        const defaultSupplierId = supplierResult.rows[0].id;

        const inventoryItems = [
          { name: 'لحم بقري', unit: 'كجم', stock: 50, cost: 80.00 },
          { name: 'دجاج', unit: 'كجم', stock: 40, cost: 30.00 },
          { name: 'خبز', unit: 'حبة', stock: 30, cost: 5.00 },
          { name: 'طماطم', unit: 'كجم', stock: 100, cost: 3.00 },
          { name: 'جبنة موزاريلا', unit: 'كجم', stock: 20, cost: 45.00 }
        ];

        for (const item of inventoryItems) {
          await client.query(
            `INSERT INTO inventory_items (name, unit, stock, cost, supplier_id) 
     VALUES ($1, $2, $3, $4, $5)`,
            [item.name, item.unit, item.stock, item.cost, defaultSupplierId]
          );
        }
        console.log('✅ Inventory items created');
      }
    } catch (err) {
      console.log('⚠️  Inventory: ', err.message);
    }

    // ============================================================================
    // 11. Migration: Ensure expenses has shift_id
    // ============================================================================
    try {
      await client.query(`ALTER TABLE expenses ADD COLUMN IF NOT EXISTS shift_id INTEGER REFERENCES shifts(id)`);
      console.log('✅ Expenses table schema updated (shift_id)');
    } catch (err) {
      console.log('⚠️  Expenses schema: ', err.message);
    }

    // ============================================================================
    // 12. Create Menu Items (IMPORTANT for testing orders!)
    // ============================================================================
    console.log('Creating menu items...');
    try {
      await client.query(`DELETE FROM order_item_note_options`);
    } catch (e) { }
    try {
      await client.query(`DELETE FROM order_items`);
    } catch (e) { }
    try {
      await client.query(`DELETE FROM orders`);
    } catch (e) { }
    try {
      await client.query(`DELETE FROM menu_item_note_options`);
    } catch (e) { }
    try {
      await client.query(`DELETE FROM menu_items`);
    } catch (e) { }

    const catResult = await client.query('SELECT * FROM categories');
    const catsMap = {};
    catResult.rows.forEach(row => catsMap[row.name] = row.id);

    const menuItemsData = [
      { name: 'عصير برتقال طازج', price: 15.00, cat: 'عصير برتقال', printer: 'Bar' },
      { name: 'عصير فراولة طازج', price: 18.00, cat: 'عصير فراولة', printer: 'Bar' },
      { name: 'عصير مانجو', price: 20.00, cat: 'عصير برتقال', printer: 'Bar' },
      { name: 'قهوة عربية', price: 10.00, cat: 'قهوة عربية', printer: 'Bar' },
      { name: 'كابتشينو', price: 18.00, cat: 'كابتشينو', printer: 'Bar' },
      { name: 'لاتيه', price: 20.00, cat: 'لاتيه', printer: 'Bar' },
      { name: 'اسبريسو', price: 12.00, cat: 'قهوة عربية', printer: 'Bar' },
      { name: 'برجر لحم كلاسيك', price: 35.00, cat: 'برجر لحم', printer: 'Kitchen' },
      { name: 'برجر لحم مزدوج', price: 50.00, cat: 'برجر لحم', printer: 'Kitchen' },
      { name: 'برجر دجاج كرسبي', price: 30.00, cat: 'برجر دجاج', printer: 'Kitchen' },
      { name: 'برجر دجاج حار', price: 32.00, cat: 'برجر دجاج', printer: 'Kitchen' },
      { name: 'بيتزا مارغريتا صغيرة', price: 25.00, cat: 'بيتزا مارغريتا', printer: 'Kitchen' },
      { name: 'بيتزا مارغريتا كبيرة', price: 45.00, cat: 'بيتزا مارغريتا', printer: 'Kitchen' },
      { name: 'بيتزا بيبروني', price: 50.00, cat: 'بيتزا بيبروني', printer: 'Kitchen' },
      { name: 'سلطة يونانية', price: 22.00, cat: 'سلطة يونانية', printer: 'Kitchen' },
      { name: 'سلطة سيزر', price: 25.00, cat: 'سلطة سيزر', printer: 'Kitchen' },
      { name: 'كيك شوكولاتة', price: 30.00, cat: 'كيك شوكولاتة', printer: 'Kitchen' },
      { name: 'كيك فانيليا', price: 28.00, cat: 'كيك فانيليا', printer: 'Kitchen' },
      { name: 'تشيز كيك', price: 35.00, cat: 'كيك شوكولاتة', printer: 'Kitchen' },
      { name: 'بيبسي', price: 5.00, cat: 'عصير برتقال', printer: 'Bar' },
    ];

    for (const item of menuItemsData) {
      await client.query(
        `INSERT INTO menu_items (name, price, category_id, printer) VALUES ($1, $2, $3, $4)`,
        [item.name, item.price, catsMap[item.cat] || null, item.printer]
      );
    }
    console.log('✅ Menu items created (20 items)');

    // ============================================================================
    // 13. Create Customers
    // ============================================================================
    console.log('Creating customers...');
    try {
      await client.query(`DELETE FROM customer_locations`);
    } catch (e) { }
    try {
      await client.query(`DELETE FROM customers`);
    } catch (e) { }

    const zoneResult = await client.query('SELECT * FROM delivery_zones LIMIT 1');
    const firstZoneId = zoneResult.rows.length > 0 ? zoneResult.rows[0].id : null;

    const customersData = [
      { phone: '0501234567', firstName: 'أحمد', lastName: 'محمود' },
      { phone: '0509876543', firstName: 'فاطمة', lastName: 'علي' },
      { phone: '0551112222', firstName: 'محمد', lastName: 'خالد' },
      { phone: '0553334444', firstName: 'سارة', lastName: 'حسن' },
      { phone: '0555556666', firstName: 'عمر', lastName: 'سعيد' },
    ];

    for (const c of customersData) {
      const res = await client.query(
        `INSERT INTO customers (phone, first_name, last_name, last_zone_id) VALUES ($1, $2, $3, $4) RETURNING id`,
        [c.phone, c.firstName, c.lastName, firstZoneId]
      );
      // Add a location for each customer
      await client.query(
        `INSERT INTO customer_locations (customer_id, location_name, zone_id, street, building, floor, apartment, kind, is_default)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, true)`,
        [res.rows[0].id, 'المنزل', firstZoneId, 'شارع الملك فهد', '15', '3', '301', 'Home']
      );
    }
    console.log('✅ Customers created (5 customers)');

    // ============================================================================
    // 14. Create Employees
    // ============================================================================
    console.log('Creating employees...');
    try {
      await client.query(`DELETE FROM employees`);
    } catch (e) { }

    const employeesData = [
      { name: 'علي أحمد', role: 'شيف رئيسي', phone: '0511111111' },
      { name: 'سارة عبدالله', role: 'كاشير', phone: '0522222222' },
      { name: 'يوسف خالد', role: 'مقدم طعام', phone: '0533333333' },
      { name: 'نورة سعد', role: 'مساعد مطبخ', phone: '0544444444' },
    ];

    for (const emp of employeesData) {
      await client.query(
        `INSERT INTO employees (name, role, phone) VALUES ($1, $2, $3)`,
        [emp.name, emp.role, emp.phone]
      );
    }
    console.log('✅ Employees created');

    // ============================================================================
    // 15. Create Kitchens & Printers
    // ============================================================================
    console.log('Creating kitchens & printers...');
    try {
      await client.query(`DELETE FROM printers`);
    } catch (e) { }
    try {
      await client.query(`DELETE FROM kitchens`);
    } catch (e) { }

    const kitchensData = [
      { name: 'المطبخ الرئيسي' },
      { name: 'قسم المشويات' },
      { name: 'البار' },
    ];

    for (const k of kitchensData) {
      const res = await client.query(
        `INSERT INTO kitchens (name) VALUES ($1) RETURNING id`,
        [k.name]
      );
      // Create a printer for each kitchen
      await client.query(
        `INSERT INTO printers (name, type, kitchen_id) VALUES ($1, $2, $3)`,
        [`طابعة ${k.name}`, 'Printer', res.rows[0].id]
      );
    }
    console.log('✅ Kitchens & Printers created');

    // ============================================================================
    // 16. Create Note Options
    // ============================================================================
    console.log('Creating note options...');
    try {
      await client.query(`DELETE FROM menu_item_note_options`);
    } catch (e) { }
    try {
      await client.query(`DELETE FROM note_options`);
    } catch (e) { }

    const noteOptionsData = [
      { name: 'بدون بصل', price: 0 },
      { name: 'حار جداً', price: 0 },
      { name: 'إضافة جبنة', price: 5.00 },
      { name: 'إضافة بيض', price: 3.00 },
      { name: 'بدون ملح', price: 0 },
      { name: 'صوص إضافي', price: 2.00 },
    ];

    for (const n of noteOptionsData) {
      await client.query(
        `INSERT INTO note_options (name, price) VALUES ($1, $2)`,
        [n.name, n.price]
      );
    }
    console.log('✅ Note options created');

    // ============================================================================
    // 17. Create Settings
    // ============================================================================
    console.log('Creating settings...');
    const settingsData = [
      { key: 'restaurant_name', value: 'مطعم الريادة' },
      { key: 'tax_rate', value: '15' },
      { key: 'service_charge_rate', value: '0' },
      { key: 'currency', value: 'SAR' },
      { key: 'language', value: 'ar' },
      { key: 'receipt_header', value: 'مطعم الريادة - أهلاً وسهلاً' },
      { key: 'receipt_footer', value: 'شكراً لزيارتكم' },
    ];

    for (const s of settingsData) {
      await client.query(
        `INSERT INTO settings (key, value) VALUES ($1, $2) ON CONFLICT (key) DO UPDATE SET value = $2`,
        [s.key, s.value]
      );
    }
    console.log('✅ Settings created');

    // ============================================================================
    // 18. Create Sample Orders (for testing reports & statistics)
    // ============================================================================
    console.log('Creating sample orders...');
    const allMenuItems = await client.query('SELECT * FROM menu_items');
    const allCustomers = await client.query('SELECT * FROM customers');
    const allTables = await client.query('SELECT * FROM tables LIMIT 5');
    const allDrivers = await client.query('SELECT * FROM drivers');

    if (allMenuItems.rows.length > 0) {
      // Order 1: Dine-in (Completed)
      const order1 = await client.query(
        `INSERT INTO orders (sales_center, status, table_id, hall_id, subtotal, tax, total, payment_method, created_at)
         VALUES ('DineIn', 'Completed', $1, $2, 85.00, 12.75, 97.75, 'cash', NOW() - INTERVAL '2 hours') RETURNING id`,
        [allTables.rows[0]?.id || null, allTables.rows[0]?.hall_id || null]
      );
      // Add items to order 1
      const items1 = allMenuItems.rows.slice(0, 3);
      for (const item of items1) {
        await client.query(
          `INSERT INTO order_items (order_id, item_id, name_snapshot, price, quantity, total, price_at_order)
           VALUES ($1, $2, $3, $4, 1, $4, $4)`,
          [order1.rows[0].id, item.id, item.name, item.price]
        );
      }

      // Order 2: Takeaway (Confirmed)
      const order2 = await client.query(
        `INSERT INTO orders (sales_center, status, subtotal, tax, total, payment_method, created_at)
         VALUES ('Takeaway', 'Confirmed', 65.00, 9.75, 74.75, 'card', NOW() - INTERVAL '1 hour') RETURNING id`
      );
      const items2 = allMenuItems.rows.slice(3, 5);
      for (const item of items2) {
        await client.query(
          `INSERT INTO order_items (order_id, item_id, name_snapshot, price, quantity, total, price_at_order)
           VALUES ($1, $2, $3, $4, 1, $4, $4)`,
          [order2.rows[0].id, item.id, item.name, item.price]
        );
      }

      // Order 3: Delivery (Pending)
      if (allCustomers.rows.length > 0 && allDrivers.rows.length > 0) {
        const order3 = await client.query(
          `INSERT INTO orders (sales_center, status, customer_id, driver_id, subtotal, tax, delivery_fee, total, payment_method, created_at)
           VALUES ('Delivery', 'Pending', $1, $2, 100.00, 15.00, 15.00, 130.00, 'cash', NOW() - INTERVAL '30 minutes') RETURNING id`,
          [allCustomers.rows[0].id, allDrivers.rows[0].id]
        );
        const items3 = allMenuItems.rows.slice(7, 10);
        for (const item of items3) {
          await client.query(
            `INSERT INTO order_items (order_id, item_id, name_snapshot, price, quantity, total, price_at_order)
             VALUES ($1, $2, $3, $4, 1, $4, $4)`,
            [order3.rows[0].id, item.id, item.name, item.price]
          );
        }
      }

      // Order 4: Dine-in (Preparing)
      const order4 = await client.query(
        `INSERT INTO orders (sales_center, status, table_id, hall_id, subtotal, tax, total, payment_method, created_at)
         VALUES ('DineIn', 'Preparing', $1, $2, 120.00, 18.00, 138.00, 'cash', NOW() - INTERVAL '15 minutes') RETURNING id`,
        [allTables.rows[1]?.id || allTables.rows[0]?.id || null, allTables.rows[1]?.hall_id || allTables.rows[0]?.hall_id || null]
      );
      const items4 = allMenuItems.rows.slice(11, 14);
      for (const item of items4) {
        await client.query(
          `INSERT INTO order_items (order_id, item_id, name_snapshot, price, quantity, total, price_at_order)
           VALUES ($1, $2, $3, $4, 2, $5, $4)`,
          [order4.rows[0].id, item.id, item.name, item.price, item.price * 2]
        );
      }

      console.log('✅ Sample orders created (4 orders)');
    }

    // ============================================================================
    // 19. Create Sample Expenses
    // ============================================================================
    console.log('Creating sample expenses...');
    try {
      await client.query(`DELETE FROM expenses`);
    } catch (e) { }

    const expensesData = [
      { category: 'إيجار', description: 'إيجار المحل لهذا الشهر', amount: 15000 },
      { category: 'رواتب', description: 'رواتب الموظفين', amount: 25000 },
      { category: 'مشتريات', description: 'شراء خضروات من المورد', amount: 2500 },
      { category: 'صيانة', description: 'صيانة معدات المطبخ', amount: 800 },
      { category: 'كهرباء', description: 'فاتورة الكهرباء', amount: 3500 },
    ];

    for (const exp of expensesData) {
      await client.query(
        `INSERT INTO expenses (category, description, amount, payment_method) VALUES ($1, $2, $3, 'cash')`,
        [exp.category, exp.description, exp.amount]
      );
    }
    console.log('✅ Expenses created');

    console.log('='.repeat(60));
    console.log('✅ Database seeded successfully!');
    console.log('='.repeat(60));
    console.log('📝 Default Admin Credentials:');
    console.log('   Username: admin');
    console.log('   Password: admin123');
    console.log('⚠️  IMPORTANT: Change this password in production!');
    console.log('='.repeat(60));

  } catch (error) {
    console.error('❌ Seeding failed:', error);
    console.error('Error details:', error.message);
    console.error('Full error:', error);
  } finally {
    client.release();
    await pool.end();
  }
}

seedDatabase();
