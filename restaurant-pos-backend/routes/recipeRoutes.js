import express from 'express';
import pool from '../db.js';
import { authenticateToken } from '../middleware/auth.js';

const router = express.Router();

// Get all recipes with ingredients
router.get('/', authenticateToken, async (req, res) => {
  try {
    const recipesQuery = await pool.query(`
      SELECT 
        r.*,
        m.name as menu_item_name,
        m.price as menu_item_price
      FROM recipes r
      LEFT JOIN menu_items m ON r.menu_item_id = m.id
      ORDER BY r.name
    `);

    const recipes = recipesQuery.rows;

    // Get ingredients for each recipe
    for (let recipe of recipes) {
      const ingredientsQuery = await pool.query(`
        SELECT 
          ri.*,
          ii.name as item_name,
          ii.unit as item_unit,
          ii.cost as item_cost,
          ii.stock as item_stock
        FROM recipe_ingredients ri
        JOIN inventory_items ii ON ri.inventory_item_id = ii.id
        WHERE ri.recipe_id = $1
        ORDER BY ii.name
      `, [recipe.id]);

      recipe.ingredients = ingredientsQuery.rows;
      
      // Calculate total cost
      recipe.calculated_cost = ingredientsQuery.rows.reduce((sum, ing) => {
        const cost = parseFloat(ing.cost_per_unit || ing.item_cost || 0) * parseFloat(ing.quantity);
        return sum + cost;
      }, 0);
    }

    res.json({ success: true, data: recipes });

  } catch (error) {
    console.error('Get recipes error:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch recipes' });
  }
});

// Get single recipe by ID
router.get('/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    
    const recipeQuery = await pool.query(`
      SELECT 
        r.*,
        m.name as menu_item_name
      FROM recipes r
      LEFT JOIN menu_items m ON r.menu_item_id = m.id
      WHERE r.id = $1
    `, [id]);

    if (recipeQuery.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Recipe not found' });
    }

    const recipe = recipeQuery.rows[0];

    // Get ingredients
    const ingredientsQuery = await pool.query(`
      SELECT 
        ri.*,
        ii.name as item_name,
        ii.unit as item_unit,
        ii.cost as item_cost
      FROM recipe_ingredients ri
      JOIN inventory_items ii ON ri.inventory_item_id = ii.id
      WHERE ri.recipe_id = $1
    `, [id]);

    recipe.ingredients = ingredientsQuery.rows;

    res.json({ success: true, data: recipe });

  } catch (error) {
    console.error('Get recipe error:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch recipe' });
  }
});

// Create new recipe with ingredients
router.post('/', authenticateToken, async (req, res) => {
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');

    const { menu_item_id, name, description, ingredients } = req.body;

    if (!name) {
      return res.status(400).json({ success: false, error: 'Recipe name is required' });
    }

    // Calculate total cost
    let totalCost = 0;
    if (ingredients && ingredients.length > 0) {
      for (let ing of ingredients) {
        const cost = parseFloat(ing.cost_per_unit || 0) * parseFloat(ing.quantity || 0);
        totalCost += cost;
      }
    }

    // Insert recipe
    const recipeResult = await client.query(
      `INSERT INTO recipes (menu_item_id, name, description, total_cost)
       VALUES ($1, $2, $3, $4)
       RETURNING *`,
      [menu_item_id, name, description, totalCost]
    );

    const recipe = recipeResult.rows[0];

    // Insert ingredients
    if (ingredients && ingredients.length > 0) {
      for (let ing of ingredients) {
        await client.query(
          `INSERT INTO recipe_ingredients 
           (recipe_id, inventory_item_id, quantity, unit, cost_per_unit)
           VALUES ($1, $2, $3, $4, $5)`,
          [
            recipe.id,
            ing.inventory_item_id,
            ing.quantity,
            ing.unit,
            ing.cost_per_unit
          ]
        );
      }
    }

    await client.query('COMMIT');

    res.status(201).json({ success: true, data: recipe });

  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Create recipe error:', error);
    res.status(500).json({ success: false, error: 'Failed to create recipe' });
  } finally {
    client.release();
  }
});

// Update recipe
router.put('/:id', authenticateToken, async (req, res) => {
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');

    const { id } = req.params;
    const { menu_item_id, name, description, ingredients } = req.body;

    // Calculate total cost
    let totalCost = 0;
    if (ingredients && ingredients.length > 0) {
      for (let ing of ingredients) {
        const cost = parseFloat(ing.cost_per_unit || 0) * parseFloat(ing.quantity || 0);
        totalCost += cost;
      }
    }

    // Update recipe
    const recipeResult = await client.query(
      `UPDATE recipes 
       SET menu_item_id = $1, name = $2, description = $3, 
           total_cost = $4, updated_at = CURRENT_TIMESTAMP
       WHERE id = $5
       RETURNING *`,
      [menu_item_id, name, description, totalCost, id]
    );

    if (recipeResult.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ success: false, error: 'Recipe not found' });
    }

    // Delete old ingredients
    await client.query('DELETE FROM recipe_ingredients WHERE recipe_id = $1', [id]);

    // Insert new ingredients
    if (ingredients && ingredients.length > 0) {
      for (let ing of ingredients) {
        await client.query(
          `INSERT INTO recipe_ingredients 
           (recipe_id, inventory_item_id, quantity, unit, cost_per_unit)
           VALUES ($1, $2, $3, $4, $5)`,
          [id, ing.inventory_item_id, ing.quantity, ing.unit, ing.cost_per_unit]
        );
      }
    }

    await client.query('COMMIT');

    res.json({ success: true, data: recipeResult.rows[0] });

  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Update recipe error:', error);
    res.status(500).json({ success: false, error: 'Failed to update recipe' });
  } finally {
    client.release();
  }
});

// Delete recipe
router.delete('/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    
    const result = await pool.query(
      'DELETE FROM recipes WHERE id = $1 RETURNING id',
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Recipe not found' });
    }

    res.json({ success: true, message: 'Recipe deleted successfully' });

  } catch (error) {
    console.error('Delete recipe error:', error);
    res.status(500).json({ success: false, error: 'Failed to delete recipe' });
  }
});

// Get inventory items (for ingredient selection)
router.get('/inventory/items', authenticateToken, async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT id, name, unit, stock, cost
      FROM inventory_items
      ORDER BY name
    `);

    res.json({ success: true, data: result.rows });

  } catch (error) {
    console.error('Get inventory items error:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch inventory items' });
  }
});

// Get menu items (for recipe linking)
router.get('/menu/items', authenticateToken, async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT id, name, price
      FROM menu_items
      WHERE is_active = true
      ORDER BY name
    `);

    res.json({ success: true, data: result.rows });

  } catch (error) {
    console.error('Get menu items error:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch menu items' });
  }
});

export default router;
