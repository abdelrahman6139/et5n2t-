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
    // 0. Cleanup (Optional but recommended for dev seeding)
    // ============================================================================
    console.log('🧹 Cleaning up tables...');
    try {
      await client.query('DELETE FROM order_items');
      await client.query('DELETE FROM orders');
      await client.query('DELETE FROM expenses');
    } catch (e) {
      console.log('Cleanup warning:', e.message);
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
    await client.query(`DELETE FROM main_categories CASCADE`);
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
      await client.query(`DELETE FROM halls CASCADE`);
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

      await client.query(`DELETE FROM drivers`);
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
      await client.query(`DELETE FROM suppliers`);
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
        await client.query(`DELETE FROM inventory_items`);
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
