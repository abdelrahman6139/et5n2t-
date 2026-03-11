import pg from 'pg';
import dotenv from 'dotenv';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const pool = new pg.Pool({
    host: process.env.PGHOST,
    user: process.env.PGUSER,
    password: process.env.PGPASSWORD,
    database: process.env.PGDATABASE,
    port: process.env.PGPORT,
});

async function setupSchema() {
    const client = await pool.connect();
    try {
        console.log('📐 Reading schema.sql...');
        const schema = readFileSync(join(__dirname, 'schema.sql'), 'utf8');

        console.log('🏗️  Creating all 29 tables...');
        await client.query(schema);

        console.log('✅ All tables created successfully!');
        console.log('👉 Now run: npm run seed');
    } catch (error) {
        console.error('❌ Schema creation failed:', error.message);
    } finally {
        client.release();
        await pool.end();
    }
}

setupSchema();
