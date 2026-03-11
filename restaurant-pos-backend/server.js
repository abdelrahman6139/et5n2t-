import express from "express";
import dotenv from "dotenv";
import cors from "cors";
import pool from "./db.js";

// Import all routes
import driverRoutes from "./routes/driverRoutes.js";
import orderRoutes from "./routes/orderRoutes.js";
import authRoutes from "./routes/authRoutes.js";
import menuRoutes from "./routes/menuRoutes.js";
import customerRoutes from "./routes/customerRoutes.js";
import hallRoutes from './routes/hallRoutes.js';
import adminRoutes from './routes/adminRoutes.js';
import driverLocationRoutes from './routes/driverLocationRoutes.js';
import statisticsRoutes from './routes/statisticsRoutes.js';
import expensesRoutes from './routes/expensesRoutes.js';
import kitchenRoutes from './routes/kitchenRoutes.js';
import printerRoutes from './routes/printerRoutes.js';
import zoneRoutes from './routes/zoneRoutes.js';
import employeeRoutes from './routes/employeeRoutes.js';
// Add import
import reportRoutes from './routes/reportRoutes.js';
// Add import
import recipeRoutes from './routes/recipeRoutes.js';
// Add import
import inventoryRoutes from './routes/inventoryRoutes.js';

import shiftRoutes from './routes/shiftRoutes.js';
import businessDayRoutes from './routes/businessDayRoutes.js';

import userRoutes from './routes/userRoutes.js';
import settingsRoutes from './routes/settingsRoutes.js';
import activityRoutes from './routes/activityRoutes.js';
import noteOptionsRoutes from './routes/noteOptionsRoutes.js';
import publicRoutes from './routes/publicRoutes.js';

// Add route




// Add this line with your other routes:



// Add this line with your other routes


dotenv.config();

const app = express();

// Trust proxy when behind Nginx reverse proxy
if (process.env.NODE_ENV === 'production') {
  app.set('trust proxy', 1);
}

// Middleware - CORS configuration for multiple origins
const allowedOrigins = [
  'http://localhost:3000',
  'http://localhost:5173',
  'http://localhost:5174',
  // Production domains
  'http://sahla.lamarpos.cloud',
  'https://sahla.lamarpos.cloud',
  'http://order.lamarpos.cloud',
  'https://order.lamarpos.cloud',
  'http://api.lamarpos.cloud',
  'https://api.lamarpos.cloud',
  'http://lamarpos.cloud',
  'https://lamarpos.cloud',
];

app.use(cors({
  origin: function (origin, callback) {
    // Allow requests with no origin (mobile apps, curl, Postman, etc)
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      console.log('⚠️ CORS blocked origin:', origin);
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true
}));
app.use(express.json());

// Test database connection and run auto-migrations
pool.query('SELECT NOW()', (err, res) => {
  if (err) {
    console.error('❌ Database connection failed:', err);
  } else {
    console.log('✅ Database connected successfully');
    // Auto-migrate: add last_zone_id to customers if missing
    pool.query(`ALTER TABLE customers ADD COLUMN IF NOT EXISTS last_zone_id INTEGER REFERENCES delivery_zones(id) ON DELETE SET NULL`)
      .then(() => console.log('✅ Migration: customers.last_zone_id ensured'))
      .catch(e => console.error('⚠️ Migration warning (last_zone_id):', e.message));

    // Auto-migrate: allow menu items to attach directly to sub or main category
    pool.query(`ALTER TABLE menu_items ADD COLUMN IF NOT EXISTS sub_category_id INTEGER REFERENCES sub_categories(id) ON DELETE SET NULL`)
      .then(() => console.log('✅ Migration: menu_items.sub_category_id ensured'))
      .catch(e => console.error('⚠️ Migration warning (sub_category_id):', e.message));
    pool.query(`ALTER TABLE menu_items ADD COLUMN IF NOT EXISTS main_category_id INTEGER REFERENCES main_categories(id) ON DELETE SET NULL`)
      .then(() => console.log('✅ Migration: menu_items.main_category_id ensured'))
      .catch(e => console.error('⚠️ Migration warning (main_category_id):', e.message));

    // Auto-migrate: widen settings.value to TEXT to support large JSON values (e.g. role_permissions)
    pool.query(`ALTER TABLE settings ALTER COLUMN value TYPE TEXT`)
      .then(() => console.log('✅ Migration: settings.value widened to TEXT'))
      .catch(e => console.error('⚠️ Migration warning (settings.value):', e.message));

    // Auto-migrate: create business_days table for daily closing
    pool.query(`
      CREATE TABLE IF NOT EXISTS business_days (
        id               SERIAL PRIMARY KEY,
        opened_at        TIMESTAMPTZ DEFAULT NOW(),
        closed_at        TIMESTAMPTZ,
        opened_by_id     INTEGER,
        opened_by_name   VARCHAR(150),
        closed_by_id     INTEGER,
        closed_by_name   VARCHAR(150),
        status           VARCHAR(20) DEFAULT 'open',
        total_orders     INTEGER     DEFAULT 0,
        total_sales      DECIMAL(12,2) DEFAULT 0,
        total_cash       DECIMAL(12,2) DEFAULT 0,
        total_card       DECIMAL(12,2) DEFAULT 0,
        total_delivery   DECIMAL(12,2) DEFAULT 0,
        total_expenses   DECIMAL(12,2) DEFAULT 0,
        net_profit       DECIMAL(12,2) DEFAULT 0,
        notes            TEXT
      )
    `)
      .then(() => console.log('✅ Migration: business_days table ensured'))
      .catch(e => console.error('⚠️ Migration warning (business_days):', e.message));
  }
});

// Routes
app.use("/api/drivers", driverRoutes);
app.use("/api/orders", orderRoutes);
app.use("/api/auth", authRoutes);
app.use("/api/menu", menuRoutes);
app.use("/api/customers", customerRoutes);
app.use('/api/halls', hallRoutes);
app.use('/api', adminRoutes);
app.use('/api/tracking', driverLocationRoutes);
app.use('/api/statistics', statisticsRoutes);
app.use('/api/expenses', expensesRoutes);
app.use('/api/kitchens', kitchenRoutes);
app.use('/api/printers', printerRoutes);
app.use('/api/zones', zoneRoutes);
app.use('/api/employees', employeeRoutes);
app.use('/api/reports', reportRoutes);
app.use('/api/recipes', recipeRoutes);
app.use('/api/inventory', inventoryRoutes);
app.use('/api/shifts', shiftRoutes);
app.use('/api/business-days', businessDayRoutes);

app.use('/api/users', userRoutes);
app.use('/api/settings', settingsRoutes);
app.use('/api/activity', activityRoutes);
app.use('/api/note-options', noteOptionsRoutes);
app.use('/api/public', publicRoutes);

app.get("/", (req, res) => {
  res.json({
    message: "Restaurant POS Backend is running ✅",
    version: "1.0.0",
    endpoints: {
      drivers: "/api/drivers",
      orders: "/api/orders",
      auth: "/api/auth",
      menu: "/api/menu",
      customers: "/api/customers",
      admin: "/api/admin"
    }
  });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({
    error: 'Something went wrong!',
    message: err.message
  });
});

// Start server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`✅ Server running on http://localhost:${PORT}`);
});