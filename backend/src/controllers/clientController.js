const pool = require('../config/db');

// GET /api/clients
const getClients = async (req, res) => {
  const { salonId } = req.user;
  const { search } = req.query;
  try {
    let query = `SELECT * FROM clients WHERE salon_id = $1`;
    const params = [salonId];
    if (search) {
      query += ` AND (name ILIKE $2 OR phone ILIKE $2 OR email ILIKE $2)`;
      params.push(`%${search}%`);
    }
    query += ` ORDER BY name ASC`;
    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
};

// GET /api/clients/:id
const getClient = async (req, res) => {
  const { id } = req.params;
  const { salonId } = req.user;
  try {
    const client = await pool.query(
      `SELECT * FROM clients WHERE id = $1 AND salon_id = $2`,
      [id, salonId]
    );
    if (!client.rows.length) return res.status(404).json({ error: 'Client not found' });

    const appointments = await pool.query(
      `SELECT a.*, u.name as technician_name FROM appointments a
       LEFT JOIN users u ON u.id = a.technician_id
       WHERE a.client_id = $1 ORDER BY a.start_time DESC LIMIT 20`,
      [id]
    );

    res.json({ ...client.rows[0], appointments: appointments.rows });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
};

// POST /api/clients
const createClient = async (req, res) => {
  const { salonId } = req.user;
  const { name, phone, email, notes } = req.body;
  if (!name) return res.status(400).json({ error: 'name required' });
  try {
    const result = await pool.query(
      `INSERT INTO clients (salon_id, name, phone, email, notes)
       VALUES ($1,$2,$3,$4,$5) RETURNING *`,
      [salonId, name, phone || null, email || null, notes || null]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
};

// PATCH /api/clients/:id
const updateClient = async (req, res) => {
  const { id } = req.params;
  const { salonId } = req.user;
  const { name, phone, email, notes } = req.body;
  try {
    const fields = [];
    const params = [id, salonId];
    let i = 3;
    if (name !== undefined) { fields.push(`name = $${i++}`); params.push(name); }
    if (phone !== undefined) { fields.push(`phone = $${i++}`); params.push(phone); }
    if (email !== undefined) { fields.push(`email = $${i++}`); params.push(email); }
    if (notes !== undefined) { fields.push(`notes = $${i++}`); params.push(notes); }
    if (!fields.length) return res.status(400).json({ error: 'No fields to update' });
    const result = await pool.query(
      `UPDATE clients SET ${fields.join(', ')} WHERE id = $1 AND salon_id = $2 RETURNING *`,
      params
    );
    if (!result.rows.length) return res.status(404).json({ error: 'Client not found' });
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
};

module.exports = { getClients, getClient, createClient, updateClient };
