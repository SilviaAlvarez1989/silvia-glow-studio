const pool = require('../config/db');
const bcrypt = require('bcryptjs');

// GET /api/staff
const getStaff = async (req, res) => {
  const { salonId } = req.user;
  try {
    const result = await pool.query(
      `SELECT id, name, email, phone, role, avatar_url, active, created_at
       FROM users WHERE salon_id = $1 ORDER BY role, name`,
      [salonId]
    );
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
};

// POST /api/staff
const createStaff = async (req, res) => {
  const { salonId } = req.user;
  const { name, email, phone, role, password } = req.body;
  if (!name || !email || !role || !password)
    return res.status(400).json({ error: 'name, email, role, password required' });
  try {
    const hash = await bcrypt.hash(password, 10);
    const result = await pool.query(
      `INSERT INTO users (salon_id, name, email, phone, password_hash, role)
       VALUES ($1,$2,$3,$4,$5,$6) RETURNING id, name, email, phone, role, active`,
      [salonId, name, email.toLowerCase(), phone || null, hash, role]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    if (err.code === '23505') return res.status(409).json({ error: 'Email already exists' });
    res.status(500).json({ error: 'Server error' });
  }
};

// PATCH /api/staff/:id
const updateStaff = async (req, res) => {
  const { id } = req.params;
  const { salonId } = req.user;
  const { name, phone, role, active, password } = req.body;
  try {
    const fields = [];
    const params = [id, salonId];
    let i = 3;
    if (name !== undefined) { fields.push(`name = $${i++}`); params.push(name); }
    if (phone !== undefined) { fields.push(`phone = $${i++}`); params.push(phone); }
    if (role !== undefined) { fields.push(`role = $${i++}`); params.push(role); }
    if (active !== undefined) { fields.push(`active = $${i++}`); params.push(active); }
    if (password) {
      const hash = await bcrypt.hash(password, 10);
      fields.push(`password_hash = $${i++}`); params.push(hash);
    }
    if (!fields.length) return res.status(400).json({ error: 'No fields to update' });
    const result = await pool.query(
      `UPDATE users SET ${fields.join(', ')} WHERE id = $1 AND salon_id = $2
       RETURNING id, name, email, phone, role, active`,
      params
    );
    if (!result.rows.length) return res.status(404).json({ error: 'Staff not found' });
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
};

module.exports = { getStaff, createStaff, updateStaff };
