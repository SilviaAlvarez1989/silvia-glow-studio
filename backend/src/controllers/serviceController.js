const pool = require('../config/db');

// GET /api/services
const getServices = async (req, res) => {
  const { salonId } = req.user;
  try {
    const result = await pool.query(
      `SELECT * FROM services WHERE salon_id = $1 AND active = true ORDER BY category, name`,
      [salonId]
    );
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
};

// POST /api/services
const createService = async (req, res) => {
  const { salonId } = req.user;
  const { name, category, description, price, duration_minutes, color } = req.body;
  if (!name || !price || !duration_minutes)
    return res.status(400).json({ error: 'name, price, duration_minutes required' });
  try {
    const result = await pool.query(
      `INSERT INTO services (salon_id, name, category, description, price, duration_minutes, color)
       VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING *`,
      [salonId, name, category || null, description || null, price, duration_minutes, color || '#ec4899']
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
};

// PATCH /api/services/:id
const updateService = async (req, res) => {
  const { id } = req.params;
  const { salonId } = req.user;
  const { name, category, description, price, duration_minutes, color, active } = req.body;
  try {
    const fields = [];
    const params = [id, salonId];
    let i = 3;
    if (name !== undefined) { fields.push(`name = $${i++}`); params.push(name); }
    if (category !== undefined) { fields.push(`category = $${i++}`); params.push(category); }
    if (description !== undefined) { fields.push(`description = $${i++}`); params.push(description); }
    if (price !== undefined) { fields.push(`price = $${i++}`); params.push(price); }
    if (duration_minutes !== undefined) { fields.push(`duration_minutes = $${i++}`); params.push(duration_minutes); }
    if (color !== undefined) { fields.push(`color = $${i++}`); params.push(color); }
    if (active !== undefined) { fields.push(`active = $${i++}`); params.push(active); }
    if (!fields.length) return res.status(400).json({ error: 'No fields to update' });
    const result = await pool.query(
      `UPDATE services SET ${fields.join(', ')} WHERE id = $1 AND salon_id = $2 RETURNING *`,
      params
    );
    if (!result.rows.length) return res.status(404).json({ error: 'Service not found' });
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
};

// DELETE /api/services/:id (soft delete)
const deleteService = async (req, res) => {
  const { id } = req.params;
  const { salonId } = req.user;
  try {
    await pool.query(
      `UPDATE services SET active = false WHERE id = $1 AND salon_id = $2`,
      [id, salonId]
    );
    res.json({ message: 'Service deactivated' });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
};

module.exports = { getServices, createService, updateService, deleteService };
