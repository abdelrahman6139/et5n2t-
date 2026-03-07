import express from 'express';
import pool from '../db.js';
import { authenticateToken } from '../middleware/auth.js';

const router = express.Router();

// ==================== HIERARCHICAL MENU ENDPOINT ====================

// Get complete menu hierarchy (nested structure)
router.get('/hierarchy', async (req, res) => {
  try {
    const mainCategoriesResult = await pool.query(
      'SELECT * FROM main_categories ORDER BY name'
    );

    const subCategoriesResult = await pool.query(
      'SELECT * FROM sub_categories ORDER BY main_category_id, name'
    );

    const categoriesResult = await pool.query(
      'SELECT * FROM categories ORDER BY sub_category_id, name'
    );

    const menuItemsResult = await pool.query(
      'SELECT * FROM menu_items ORDER BY name'
    );

    const allItems = menuItemsResult.rows;

    // Build nested structure with directItems at every level
    const hierarchy = mainCategoriesResult.rows.map(mainCat => ({
      ...mainCat,
      // Items attached directly to this main category (no sub, no cat)
      directItems: allItems.filter(item =>
        item.main_category_id == mainCat.id && !item.sub_category_id && !item.category_id
      ),
      subCategories: subCategoriesResult.rows
        .filter(subCat => subCat.main_category_id == mainCat.id)
        .map(subCat => ({
          ...subCat,
          // Items attached directly to this sub category (no cat)
          directItems: allItems.filter(item =>
            item.sub_category_id == subCat.id && !item.category_id
          ),
          categories: categoriesResult.rows
            .filter(cat => cat.sub_category_id == subCat.id)
            .map(cat => ({
              ...cat,
              items: allItems.filter(item => item.category_id == cat.id)
            }))
        }))
    }));

    // Find fully uncategorized items (no main, no sub, no cat)
    const uncategorizedItems = allItems.filter(item =>
      !item.category_id && !item.sub_category_id && !item.main_category_id
    );

    // Always add "Uncategorized" hierarchy so users can select it
    hierarchy.push({
      id: -1,
      name: 'غير مصنف', // Uncategorized
      directItems: [],
      subCategories: [{
        id: -1,
        name: 'عام', // General
        main_category_id: -1,
        directItems: [],
        categories: [{
          id: -1,
          name: 'عام', // General
          sub_category_id: -1,
          items: uncategorizedItems
        }]
      }]
    });

    res.json({
      success: true,
      data: hierarchy
    });
  } catch (error) {
    console.error('Get menu hierarchy error:', error);
    res.status(500).json({ error: 'Failed to fetch menu hierarchy' });
  }
});

// ==================== FLAT MENU ENDPOINT ====================
// Get all menu data (flat structure)
router.get('/', async (req, res) => {
  try {
    const mainCategoriesResult = await pool.query(
      'SELECT * FROM main_categories ORDER BY name'
    );

    const subCategoriesResult = await pool.query(
      'SELECT * FROM sub_categories ORDER BY main_category_id, name'
    );

    const categoriesResult = await pool.query(
      'SELECT * FROM categories ORDER BY sub_category_id, name'
    );

    const menuItemsResult = await pool.query(
      'SELECT * FROM menu_items ORDER BY category_id, name'
    );

    res.json({
      success: true,
      data: {
        mainCategories: mainCategoriesResult.rows,
        subCategories: subCategoriesResult.rows,
        categories: categoriesResult.rows,
        menuItems: menuItemsResult.rows
      }
    });
  } catch (error) {
    console.error('Get menu error:', error);
    res.status(500).json({ error: 'Failed to fetch menu' });
  }
});

// ==================== MAIN CATEGORIES CRUD ====================
// Create main category
router.post('/main-categories', authenticateToken, async (req, res) => {
  try {
    const { name } = req.body;
    const result = await pool.query(
      'INSERT INTO main_categories (name) VALUES ($1) RETURNING *',
      [name]
    );
    res.status(201).json({ success: true, data: result.rows[0] });
  } catch (error) {
    console.error('Create main category error:', error);
    res.status(500).json({ error: 'Failed to create main category' });
  }
});

// Update main category
router.put('/main-categories/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { name } = req.body;
    const result = await pool.query(
      'UPDATE main_categories SET name = $1 WHERE id = $2 RETURNING *',
      [name, id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Main category not found' });
    }
    res.json({ success: true, data: result.rows[0] });
  } catch (error) {
    console.error('Update main category error:', error);
    res.status(500).json({ error: 'Failed to update main category' });
  }
});

// Delete main category
router.delete('/main-categories/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query(
      'DELETE FROM main_categories WHERE id = $1 RETURNING *',
      [id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Main category not found' });
    }
    res.json({ success: true, message: 'Main category deleted successfully' });
  } catch (error) {
    console.error('Delete main category error:', error);
    res.status(500).json({ error: 'Failed to delete main category' });
  }
});

// ==================== SUB CATEGORIES CRUD ====================
// Get sub categories by main category
router.get('/main-categories/:mainCategoryId/sub-categories', async (req, res) => {
  try {
    const { mainCategoryId } = req.params;
    const result = await pool.query(
      'SELECT * FROM sub_categories WHERE main_category_id = $1 ORDER BY name',
      [mainCategoryId]
    );
    res.json({ success: true, data: result.rows });
  } catch (error) {
    console.error('Get sub categories error:', error);
    res.status(500).json({ error: 'Failed to fetch sub categories' });
  }
});

// Create sub category
router.post('/sub-categories', authenticateToken, async (req, res) => {
  try {
    const { name, mainCategoryId } = req.body;
    const result = await pool.query(
      'INSERT INTO sub_categories (name, main_category_id) VALUES ($1, $2) RETURNING *',
      [name, mainCategoryId]
    );
    res.status(201).json({ success: true, data: result.rows[0] });
  } catch (error) {
    console.error('Create sub category error:', error);
    res.status(500).json({ error: 'Failed to create sub category' });
  }
});

// Update sub category
router.put('/sub-categories/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { name, mainCategoryId } = req.body;
    const result = await pool.query(
      'UPDATE sub_categories SET name = COALESCE($1, name), main_category_id = COALESCE($2, main_category_id) WHERE id = $3 RETURNING *',
      [name, mainCategoryId, id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Sub category not found' });
    }
    res.json({ success: true, data: result.rows[0] });
  } catch (error) {
    console.error('Update sub category error:', error);
    res.status(500).json({ error: 'Failed to update sub category' });
  }
});

// Delete sub category
router.delete('/sub-categories/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query(
      'DELETE FROM sub_categories WHERE id = $1 RETURNING *',
      [id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Sub category not found' });
    }
    res.json({ success: true, message: 'Sub category deleted successfully' });
  } catch (error) {
    console.error('Delete sub category error:', error);
    res.status(500).json({ error: 'Failed to delete sub category' });
  }
});

// ==================== CATEGORIES CRUD ====================
// Get categories by sub category
router.get('/sub-categories/:subCategoryId/categories', async (req, res) => {
  try {
    const { subCategoryId } = req.params;
    const result = await pool.query(
      'SELECT * FROM categories WHERE sub_category_id = $1 ORDER BY name',
      [subCategoryId]
    );
    res.json({ success: true, data: result.rows });
  } catch (error) {
    console.error('Get categories error:', error);
    res.status(500).json({ error: 'Failed to fetch categories' });
  }
});

// Create category
router.post('/categories', authenticateToken, async (req, res) => {
  try {
    const { name, subCategoryId } = req.body;
    const result = await pool.query(
      'INSERT INTO categories (name, sub_category_id) VALUES ($1, $2) RETURNING *',
      [name, subCategoryId]
    );
    res.status(201).json({ success: true, data: result.rows[0] });
  } catch (error) {
    console.error('Create category error:', error);
    res.status(500).json({ error: 'Failed to create category' });
  }
});

// Update category
router.put('/categories/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { name, subCategoryId } = req.body;
    const result = await pool.query(
      'UPDATE categories SET name = COALESCE($1, name), sub_category_id = COALESCE($2, sub_category_id) WHERE id = $3 RETURNING *',
      [name, subCategoryId, id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Category not found' });
    }
    res.json({ success: true, data: result.rows[0] });
  } catch (error) {
    console.error('Update category error:', error);
    res.status(500).json({ error: 'Failed to update category' });
  }
});

// Delete category
router.delete('/categories/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query(
      'DELETE FROM categories WHERE id = $1 RETURNING *',
      [id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Category not found' });
    }
    res.json({ success: true, message: 'Category deleted successfully' });
  } catch (error) {
    console.error('Delete category error:', error);
    res.status(500).json({ error: 'Failed to delete category' });
  }
});

// ==================== MENU ITEMS CRUD ====================
// Get menu items by category
router.get('/categories/:categoryId/items', async (req, res) => {
  try {
    const { categoryId } = req.params;
    const result = await pool.query(
      'SELECT * FROM menu_items WHERE category_id = $1 ORDER BY name',
      [categoryId]
    );
    res.json({ success: true, data: result.rows });
  } catch (error) {
    console.error('Get category menu error:', error);
    res.status(500).json({ error: 'Failed to fetch menu items' });
  }
});

// Create new menu item
router.post('/items', authenticateToken, async (req, res) => {
  try {
    const { name, price, categoryId, subCategoryId, mainCategoryId, printer, imageUrl } = req.body;
    // Determine which level the item belongs to:
    // categoryId > subCategoryId > mainCategoryId (most specific wins, others null)
    const catId = categoryId || null;
    const subCatId = !catId ? (subCategoryId || null) : null;
    const mainCatId = !catId && !subCatId ? (mainCategoryId || null) : null;

    const result = await pool.query(
      `INSERT INTO menu_items (name, price, category_id, sub_category_id, main_category_id, printer, image_url)
       VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
      [name, price, catId, subCatId, mainCatId, printer || 'Kitchen', imageUrl || null]
    );
    res.status(201).json({ success: true, data: result.rows[0] });
  } catch (error) {
    console.error('Create menu item error:', error);
    res.status(500).json({ error: 'Failed to create menu item' });
  }
});

// Update menu item
router.put('/items/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { name, price, isActive, categoryId, subCategoryId, mainCategoryId, parentLevel, printer, imageUrl } = req.body;

    // Determine which IDs to set based on parentLevel
    let catId = null;
    let subCatId = null;
    let mainCatId = null;

    if (parentLevel === 'category') {
      catId = categoryId || null;
    } else if (parentLevel === 'sub') {
      subCatId = subCategoryId || null;
    } else if (parentLevel === 'main') {
      mainCatId = mainCategoryId || null;
    }
    // if parentLevel === 'root', all remain null

    // If parentLevel is NOT provided, it's a legacy or simple update (don't change categories)
    if (!parentLevel) {
      const result = await pool.query(
        `UPDATE menu_items 
         SET name = COALESCE($1, name),
             price = COALESCE($2, price),
             is_active = COALESCE($3, is_active),
             printer = COALESCE($4, printer),
             image_url = COALESCE($5, image_url)
         WHERE id = $6
         RETURNING *`,
        [name, price, isActive, printer, imageUrl, id]
      );
      if (result.rows.length === 0) {
        return res.status(404).json({ error: 'Menu item not found' });
      }
      return res.json({ success: true, data: result.rows[0] });
    }

    // Full hierarchical update
    const result = await pool.query(
      `UPDATE menu_items 
       SET name = COALESCE($1, name),
           price = COALESCE($2, price),
           is_active = COALESCE($3, is_active),
           printer = COALESCE($4, printer),
           image_url = COALESCE($5, image_url),
           category_id = $6,
           sub_category_id = $7,
           main_category_id = $8
       WHERE id = $9
       RETURNING *`,
      [name, price, isActive, printer, imageUrl, catId, subCatId, mainCatId, id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Menu item not found' });
    }
    res.json({ success: true, data: result.rows[0] });
  } catch (error) {
    console.error('Update menu item error:', error);
    res.status(500).json({ error: 'Failed to update menu item' });
  }
});

// Delete menu item
router.delete('/items/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query(
      'DELETE FROM menu_items WHERE id = $1 RETURNING *',
      [id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Menu item not found' });
    }
    res.json({ success: true, message: 'Menu item deleted successfully' });
  } catch (error) {
    console.error('Delete menu item error:', error);
    if (error.code === '23503') {
      res.status(400).json({ error: 'Cannot delete menu item with existing orders' });
    } else {
      res.status(500).json({ error: 'Failed to delete menu item' });
    }
  }
});

export default router;
