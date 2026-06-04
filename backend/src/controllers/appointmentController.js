const pool = require('../config/db');

// GET /api/appointments?date=2024-01-15&technicianId=xxx
const getAppointments = async (req, res) => {
  const { date, technicianId, status } = req.query;
  const { salonId } = req.user;

  try {
    let query = `
      SELECT a.*, 
             u.name as technician_name,
             u.avatar_url as technician_avatar
      FROM appointments a
      LEFT JOIN users u ON u.id = a.technician_id
      WHERE a.salon_id = $1
    `;
    const params = [salonId];
    let i = 2;

    if (date) {
      query += ` AND DATE(a.start_time AT TIME ZONE 'America/New_York') = $${i}`;
      params.push(date);
      i++;
    }
    if (technicianId) {
      query += ` AND a.technician_id = $${i}`;
      params.push(technicianId);
      i++;
    }
    if (status) {
      query += ` AND a.status = $${i}`;
      params.push(status);
      i++;
    }

    query += ` ORDER BY a.start_time ASC`;

    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
};

// GET /api/appointments/:id
const getAppointment = async (req, res) => {
  const { id } = req.params;
  const { salonId } = req.user;
  try {
    const result = await pool.query(
      `SELECT a.*, u.name as technician_name
       FROM appointments a
       LEFT JOIN users u ON u.id = a.technician_id
       WHERE a.id = $1 AND a.salon_id = $2`,
      [id, salonId]
    );
    if (!result.rows.length)
      return res.status(404).json({ error: 'Appointment not found' });
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
};

// POST /api/appointments
const createAppointment = async (req, res) => {
  const { salonId } = req.user;
  const {
    clientName, clientPhone, clientEmail,
    serviceId, technicianId,
    startTime, notes, paymentMethod,
  } = req.body;

  if (!clientName || !serviceId || !startTime)
    return res.status(400).json({ error: 'clientName, serviceId, and startTime are required' });

  try {
    // Get service details
    const svcRes = await pool.query(
      `SELECT * FROM services WHERE id = $1 AND salon_id = $2 AND active = true`,
      [serviceId, salonId]
    );
    if (!svcRes.rows.length)
      return res.status(404).json({ error: 'Service not found' });
    const service = svcRes.rows[0];

    const start = new Date(startTime);
    const end = new Date(start.getTime() + service.duration_minutes * 60 * 1000);

    // Check for conflicts
    if (technicianId) {
      const conflict = await pool.query(
        `SELECT id FROM appointments
         WHERE technician_id = $1
           AND status NOT IN ('cancelled','no_show')
           AND (start_time, end_time) OVERLAPS ($2, $3)`,
        [technicianId, start, end]
      );
      if (conflict.rows.length)
        return res.status(409).json({ error: 'Time slot not available for this technician' });
    }

    // Upsert client
    let clientId = null;
    if (clientPhone) {
      const existing = await pool.query(
        `SELECT id FROM clients WHERE salon_id = $1 AND phone = $2`,
        [salonId, clientPhone]
      );
      if (existing.rows.length) {
        clientId = existing.rows[0].id;
      } else {
        const newClient = await pool.query(
          `INSERT INTO clients (salon_id, name, phone, email)
           VALUES ($1, $2, $3, $4) RETURNING id`,
          [salonId, clientName, clientPhone, clientEmail || null]
        );
        clientId = newClient.rows[0].id;
      }
    }

    const result = await pool.query(
      `INSERT INTO appointments
         (salon_id, client_id, technician_id, service_id,
          client_name, client_phone, client_email,
          service_name, service_price, duration_minutes,
          start_time, end_time, status, payment_method, notes)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,'confirmed',$13,$14)
       RETURNING *`,
      [
        salonId, clientId, technicianId || null, serviceId,
        clientName, clientPhone || null, clientEmail || null,
        service.name, service.price, service.duration_minutes,
        start, end, paymentMethod || 'pending', notes || null,
      ]
    );

    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
};

// PATCH /api/appointments/:id
const updateAppointment = async (req, res) => {
  const { id } = req.params;
  const { salonId } = req.user;
  const { status, paymentMethod, paymentStatus, notes, technicianId, startTime } = req.body;

  try {
    const fields = [];
    const params = [id, salonId];
    let i = 3;

    if (status) { fields.push(`status = $${i++}`); params.push(status); }
    if (paymentMethod) { fields.push(`payment_method = $${i++}`); params.push(paymentMethod); }
    if (paymentStatus) { fields.push(`payment_status = $${i++}`); params.push(paymentStatus); }
    if (notes !== undefined) { fields.push(`notes = $${i++}`); params.push(notes); }
    if (technicianId) { fields.push(`technician_id = $${i++}`); params.push(technicianId); }
    if (startTime) {
      // Recalculate end time
      const appt = await pool.query(`SELECT duration_minutes FROM appointments WHERE id = $1`, [id]);
      if (appt.rows.length) {
        const start = new Date(startTime);
        const end = new Date(start.getTime() + appt.rows[0].duration_minutes * 60 * 1000);
        fields.push(`start_time = $${i++}`); params.push(start);
        fields.push(`end_time = $${i++}`); params.push(end);
      }
    }

    if (!fields.length)
      return res.status(400).json({ error: 'No fields to update' });

    const result = await pool.query(
      `UPDATE appointments SET ${fields.join(', ')} WHERE id = $1 AND salon_id = $2 RETURNING *`,
      params
    );
    if (!result.rows.length)
      return res.status(404).json({ error: 'Appointment not found' });

    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
};

// DELETE /api/appointments/:id (cancel)
const cancelAppointment = async (req, res) => {
  const { id } = req.params;
  const { salonId } = req.user;
  try {
    const result = await pool.query(
      `UPDATE appointments SET status = 'cancelled' WHERE id = $1 AND salon_id = $2 RETURNING *`,
      [id, salonId]
    );
    if (!result.rows.length)
      return res.status(404).json({ error: 'Appointment not found' });
    res.json({ message: 'Appointment cancelled', appointment: result.rows[0] });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
};

// GET /api/appointments/availability?date=2024-01-15&serviceId=xxx&technicianId=xxx
const getAvailability = async (req, res) => {
  const { date, serviceId, technicianId } = req.query;
  const { salonId } = req.user;

  if (!date || !serviceId)
    return res.status(400).json({ error: 'date and serviceId required' });

  try {
    const svcRes = await pool.query(`SELECT duration_minutes FROM services WHERE id = $1`, [serviceId]);
    if (!svcRes.rows.length) return res.status(404).json({ error: 'Service not found' });
    const duration = svcRes.rows[0].duration_minutes;

    const salonRes = await pool.query(`SELECT open_time, close_time FROM salons WHERE id = $1`, [salonId]);
    const salon = salonRes.rows[0];

    // Generate slots every 30 min
    const slots = [];
    const [openH, openM] = salon.open_time.split(':').map(Number);
    const [closeH, closeM] = salon.close_time.split(':').map(Number);

    const baseDate = new Date(`${date}T00:00:00`);
    let current = new Date(baseDate);
    current.setHours(openH, openM, 0, 0);
    const closeTime = new Date(baseDate);
    closeTime.setHours(closeH, closeM, 0, 0);

    // Get existing appointments for that day
    const booked = await pool.query(
      `SELECT start_time, end_time, technician_id FROM appointments
       WHERE salon_id = $1
         AND DATE(start_time AT TIME ZONE 'America/New_York') = $2
         AND status NOT IN ('cancelled','no_show')
         ${technicianId ? `AND technician_id = '${technicianId}'` : ''}`,
      [salonId, date]
    );

    while (new Date(current.getTime() + duration * 60000) <= closeTime) {
      const slotEnd = new Date(current.getTime() + duration * 60000);
      const conflict = booked.rows.some(b => {
        const bStart = new Date(b.start_time);
        const bEnd = new Date(b.end_time);
        return current < bEnd && slotEnd > bStart;
      });

      slots.push({
        time: current.toISOString(),
        available: !conflict,
      });

      current = new Date(current.getTime() + 30 * 60000);
    }

    res.json(slots);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
};

module.exports = {
  getAppointments,
  getAppointment,
  createAppointment,
  updateAppointment,
  cancelAppointment,
  getAvailability,
};
