const pool = require('../config/db');
const { v4: uuidv4 } = require('uuid');
const crypto = require('crypto');

// Cancellation policy
const CANCEL_HOURS = 24;
const CANCEL_FEE = 15.00;
const NOSHOW_FEE = 25.00;
const DEPOSIT_AMOUNT = 25.00; // $25 deposit required at booking

// Stripe
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

// Helper: generate secure token
function generateToken() {
  return crypto.randomBytes(32).toString('hex');
}

// Helper: format phone for display
function formatPhone(phone) {
  if (!phone) return '';
  const cleaned = phone.replace(/\D/g, '');
  if (cleaned.length === 10) {
    return `(${cleaned.slice(0,3)}) ${cleaned.slice(3,6)}-${cleaned.slice(6)}`;
  }
  return phone;
}

// POST /api/booking/salon/:slug/create-deposit-intent
// Creates a Stripe Payment Intent for $25 deposit
exports.createDepositIntent = async (req, res) => {
  try {
    const { slug } = req.params;
    const { client_name, client_email } = req.body;

    const { rows: salonRows } = await pool.query(
      `SELECT id, name FROM salons WHERE slug = $1 AND active = true`, [slug]
    );
    if (!salonRows.length) return res.status(404).json({ error: 'Salon not found' });

    const paymentIntent = await stripe.paymentIntents.create({
      amount: Math.round(DEPOSIT_AMOUNT * 100), // $25.00 in cents
      currency: 'usd',
      metadata: {
        salon_slug: slug,
        salon_name: salonRows[0].name,
        client_name: client_name || '',
        type: 'booking_deposit',
      },
      description: `Depósito de cita - ${salonRows[0].name}`,
      receipt_email: client_email || undefined,
    });

    res.json({
      clientSecret: paymentIntent.client_secret,
      deposit_amount: DEPOSIT_AMOUNT,
    });
  } catch (err) {
    console.error('Stripe error:', err);
    res.status(500).json({ error: 'Error procesando el depósito' });
  }
};

// GET /api/booking/salon/:slug
// Returns salon info + cancellation policy
exports.getSalonInfo = async (req, res) => {
  try {
    const { slug } = req.params;
    const { rows } = await pool.query(
      `SELECT id, name, phone, address, timezone, open_time, close_time, open_days FROM salons WHERE slug = $1 AND active = true`,
      [slug]
    );
    if (!rows.length) return res.status(404).json({ error: 'Salon not found' });

    const salon = rows[0];
    res.json({
      ...salon,
      cancellation_policy: {
        hours: CANCEL_HOURS,
        fee: CANCEL_FEE,
        noshow_fee: NOSHOW_FEE,
        text: `Cancelaciones con menos de ${CANCEL_HOURS} horas de anticipación tienen un cargo de $${CANCEL_FEE}. No-shows se cobran $${NOSHOW_FEE}.`
      }
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
};

// GET /api/booking/salon/:slug/services
exports.getServices = async (req, res) => {
  try {
    const { slug } = req.params;
    const { rows: salon } = await pool.query(`SELECT id FROM salons WHERE slug = $1`, [slug]);
    if (!salon.length) return res.status(404).json({ error: 'Salon not found' });

    const { rows } = await pool.query(
      `SELECT id, name, category, description, price, duration_minutes, color
       FROM services WHERE salon_id = $1 AND active = true ORDER BY category, name`,
      [salon[0].id]
    );
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
};

// GET /api/booking/salon/:slug/staff
exports.getStaff = async (req, res) => {
  try {
    const { slug } = req.params;
    const { rows: salon } = await pool.query(`SELECT id FROM salons WHERE slug = $1`, [slug]);
    if (!salon.length) return res.status(404).json({ error: 'Salon not found' });

    const { rows } = await pool.query(
      `SELECT id, name, avatar_url FROM users
       WHERE salon_id = $1 AND role = 'technician' AND active = true ORDER BY name`,
      [salon[0].id]
    );
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
};

// GET /api/booking/salon/:slug/availability?date=YYYY-MM-DD&technician_id=...&service_id=...
exports.getAvailability = async (req, res) => {
  try {
    const { slug } = req.params;
    const { date, technician_id, service_id } = req.query;

    if (!date) return res.status(400).json({ error: 'date is required' });

    const { rows: salonRows } = await pool.query(
      `SELECT id, open_time, close_time, open_days, timezone FROM salons WHERE slug = $1`,
      [slug]
    );
    if (!salonRows.length) return res.status(404).json({ error: 'Salon not found' });
    const salon = salonRows[0];

    // Get service duration
    let duration = 60;
    if (service_id) {
      const { rows: svc } = await pool.query(
        `SELECT duration_minutes FROM services WHERE id = $1 AND salon_id = $2`,
        [service_id, salon.id]
      );
      if (svc.length) duration = svc[0].duration_minutes;
    }

    // Build slots from open_time to close_time in 30-min increments
    const [openH, openM] = salon.open_time.split(':').map(Number);
    const [closeH, closeM] = salon.close_time.split(':').map(Number);
    const openMinutes = openH * 60 + openM;
    const closeMinutes = closeH * 60 + closeM;

    const slots = [];
    for (let m = openMinutes; m + duration <= closeMinutes; m += 30) {
      const h = Math.floor(m / 60);
      const min = m % 60;
      slots.push(`${String(h).padStart(2,'0')}:${String(min).padStart(2,'0')}`);
    }

    // Get existing appointments for the day (all techs or specific tech)
    const dayStart = `${date}T00:00:00`;
    const dayEnd = `${date}T23:59:59`;

    const techFilter = technician_id ? `AND technician_id = $4` : '';
    const params = [salon.id, dayStart, dayEnd];
    if (technician_id) params.push(technician_id);

    const { rows: existing } = await pool.query(
      `SELECT start_time, end_time, technician_id FROM appointments
       WHERE salon_id = $1 AND start_time >= $2 AND start_time <= $3
       AND status NOT IN ('cancelled') ${techFilter}`,
      params
    );

    // Get blocked times
    const blockParams = [salon.id, dayStart, dayEnd];
    if (technician_id) blockParams.push(technician_id);
    const blockFilter = technician_id ? `AND technician_id = $4` : '';
    const { rows: blocked } = await pool.query(
      `SELECT start_time, end_time FROM blocked_times
       WHERE salon_id = $1 AND start_time >= $2 AND end_time <= $3 ${blockFilter}`,
      blockParams
    );

    // Mark unavailable slots
    const available = slots.filter(slot => {
      const [sh, sm] = slot.split(':').map(Number);
      const slotStart = new Date(`${date}T${slot}:00`);
      const slotEnd = new Date(slotStart.getTime() + duration * 60000);

      // Check existing appointments
      for (const appt of existing) {
        const aStart = new Date(appt.start_time);
        const aEnd = new Date(appt.end_time);
        if (slotStart < aEnd && slotEnd > aStart) return false;
      }
      // Check blocked times
      for (const b of blocked) {
        const bStart = new Date(b.start_time);
        const bEnd = new Date(b.end_time);
        if (slotStart < bEnd && slotEnd > bStart) return false;
      }
      // Don't allow past slots
      if (slotStart < new Date()) return false;

      return true;
    });

    res.json({ date, slots: available, duration });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
};

// POST /api/booking/salon/:slug/reserve
// Body: { client_name, client_email, client_phone, service_id, technician_id, date, time,
//         payment_method, zelle_sender_name, terms_accepted, terms_ip }
exports.createReservation = async (req, res) => {
  const client = await pool.connect();
  try {
    const { slug } = req.params;
    const {
      client_name, client_email, client_phone,
      service_id, technician_id, date, time,
      payment_method, zelle_sender_name,
      terms_accepted, terms_ip
    } = req.body;

    // Validate required fields
    if (!client_name || !client_phone || !service_id || !date || !time) {
      return res.status(400).json({ error: 'Faltan campos requeridos' });
    }
    if (!terms_accepted) {
      return res.status(400).json({ error: 'Debes aceptar los términos de cancelación' });
    }

    const card_last4 = '';
    const card_brand = '';

    const { rows: salonRows } = await client.query(
      `SELECT id, name, phone, timezone FROM salons WHERE slug = $1 AND active = true`,
      [slug]
    );
    if (!salonRows.length) return res.status(404).json({ error: 'Salon not found' });
    const salon = salonRows[0];

    // Get service
    const { rows: svcRows } = await client.query(
      `SELECT id, name, price, duration_minutes FROM services WHERE id = $1 AND salon_id = $2 AND active = true`,
      [service_id, salon.id]
    );
    if (!svcRows.length) return res.status(400).json({ error: 'Servicio no encontrado' });
    const service = svcRows[0];

    // Get technician (optional — if not specified, pick any available)
    let tech = null;
    if (technician_id) {
      const { rows: techRows } = await client.query(
        `SELECT id, name FROM users WHERE id = $1 AND salon_id = $2 AND role = 'technician' AND active = true`,
        [technician_id, salon.id]
      );
      if (!techRows.length) return res.status(400).json({ error: 'Técnica no encontrada' });
      tech = techRows[0];
    } else {
      // Auto-assign: pick first available technician
      const { rows: techRows } = await client.query(
        `SELECT id, name FROM users WHERE salon_id = $1 AND role = 'technician' AND active = true LIMIT 1`,
        [salon.id]
      );
      if (techRows.length) tech = techRows[0];
    }

    const startTime = new Date(`${date}T${time}:00`);
    const endTime = new Date(startTime.getTime() + service.duration_minutes * 60000);

    // Check for conflicts
    const { rows: conflicts } = await client.query(
      `SELECT id FROM appointments
       WHERE technician_id = $1 AND status NOT IN ('cancelled')
       AND start_time < $2 AND end_time > $3`,
      [tech?.id, endTime, startTime]
    );
    if (conflicts.length) {
      return res.status(409).json({ error: 'Ese horario ya no está disponible. Por favor elige otro.' });
    }

    // Upsert client
    let clientId;
    const { rows: existingClient } = await client.query(
      `SELECT id FROM clients WHERE salon_id = $1 AND (phone = $2 OR (email IS NOT NULL AND email = $3))`,
      [salon.id, client_phone, client_email || '']
    );
    if (existingClient.length) {
      clientId = existingClient[0].id;
    } else {
      const { rows: newClient } = await client.query(
        `INSERT INTO clients (id, salon_id, name, email, phone) VALUES ($1, $2, $3, $4, $5) RETURNING id`,
        [uuidv4(), salon.id, client_name, client_email || null, client_phone]
      );
      clientId = newClient[0].id;
    }

    // Generate cancel & confirm tokens
    const cancelToken = generateToken();
    const confirmToken = generateToken();

    // Create appointment
    const apptId = uuidv4();
    await client.query(
      `INSERT INTO appointments (
        id, salon_id, client_id, technician_id, service_id,
        client_name, client_phone, client_email,
        service_name, service_price, duration_minutes,
        start_time, end_time, status, payment_method,
        notes
      ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16)`,
      [
        apptId, salon.id, clientId, tech?.id, service.id,
        client_name, client_phone, client_email || null,
        service.name, service.price, service.duration_minutes,
        startTime, endTime, 'pending', 'pending',
        JSON.stringify({
          booking_source: 'online',
          terms_accepted: terms_accepted,
          terms_accepted_at: new Date().toISOString(),
          terms_ip: terms_ip || 'unknown',
          card_last4: card_last4 || null,
          card_brand: card_brand || null,
          cancel_token: cancelToken,
          confirm_token: confirmToken,
          cancel_fee: CANCEL_FEE,
          noshow_fee: NOSHOW_FEE,
          cancel_policy_hours: CANCEL_HOURS,
          deposit_amount: DEPOSIT_AMOUNT,
          deposit_method: payment_method || 'zelle',
          deposit_status: 'pending_verification',
          zelle_sender_name: zelle_sender_name || client_name
        })
      ]
    );

    // Format response
    const confirmUrl = `${process.env.FRONTEND_URL}/book/confirm/${confirmToken}`;
    const cancelUrl = `${process.env.FRONTEND_URL}/book/cancel/${cancelToken}`;

    res.status(201).json({
      success: true,
      appointment: {
        id: apptId,
        client_name,
        service_name: service.name,
        technician_name: tech?.name || 'A confirmar',
        start_time: startTime,
        end_time: endTime,
        duration_minutes: service.duration_minutes,
        price: service.price,
      },
      cancel_url: cancelUrl,
      confirm_url: confirmUrl,
      message: `¡Cita confirmada! ${formatPhone(salon.phone)} — ${salon.name}`,
      policy: `Recuerda: cancelaciones con menos de ${CANCEL_HOURS}h tienen cargo de $${CANCEL_FEE}.`
    });

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  } finally {
    client.release();
  }
};

// GET /api/booking/confirm/:token
exports.confirmReservation = async (req, res) => {
  try {
    const { token } = req.params;
    const { rows } = await pool.query(
      `SELECT id, client_name, service_name, start_time, status, notes
       FROM appointments WHERE notes::jsonb->>'confirm_token' = $1`,
      [token]
    );
    if (!rows.length) return res.status(404).json({ error: 'Cita no encontrada' });
    const appt = rows[0];

    if (appt.status === 'cancelled') {
      return res.json({ success: false, message: 'Esta cita ya fue cancelada.' });
    }

    await pool.query(`UPDATE appointments SET status = 'confirmed' WHERE id = $1`, [appt.id]);
    res.json({
      success: true,
      message: '¡Cita confirmada!',
      appointment: {
        client_name: appt.client_name,
        service_name: appt.service_name,
        start_time: appt.start_time,
      }
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
};

// POST /api/booking/salon/:slug/cancel/:token
exports.cancelReservation = async (req, res) => {
  try {
    const { token } = req.params;
    const { rows } = await pool.query(
      `SELECT id, client_name, service_name, start_time, status, notes, salon_id
       FROM appointments WHERE notes::jsonb->>'cancel_token' = $1`,
      [token]
    );
    if (!rows.length) return res.status(404).json({ error: 'Cita no encontrada' });
    const appt = rows[0];

    if (appt.status === 'cancelled') {
      return res.json({ success: false, already_cancelled: true, message: 'Esta cita ya fue cancelada.' });
    }

    // Check if within cancellation window
    const now = new Date();
    const apptTime = new Date(appt.start_time);
    const hoursUntil = (apptTime - now) / (1000 * 60 * 60);
    const lateCancellation = hoursUntil < CANCEL_HOURS && hoursUntil > 0;
    const noShow = hoursUntil <= 0;

    let fee = 0;
    let feeReason = null;
    if (noShow) {
      fee = NOSHOW_FEE;
      feeReason = 'no_show';
    } else if (lateCancellation) {
      fee = CANCEL_FEE;
      feeReason = 'late_cancellation';
    }

    // Cancel appointment
    await pool.query(
      `UPDATE appointments SET status = 'cancelled',
       notes = notes::jsonb || $1::jsonb
       WHERE id = $2`,
      [JSON.stringify({
        cancelled_at: now.toISOString(),
        cancellation_fee: fee,
        cancellation_reason: feeReason,
        hours_notice: Math.round(hoursUntil)
      }), appt.id]
    );

    const notes = appt.notes ? JSON.parse(appt.notes) : {};
    res.json({
      success: true,
      cancelled: true,
      fee_charged: fee > 0,
      fee_amount: fee,
      fee_reason: feeReason,
      card_last4: notes.card_last4 || null,
      message: fee > 0
        ? `Cita cancelada. Se aplicará un cargo de $${fee} a tu tarjeta terminada en ${notes.card_last4 || '****'}.`
        : 'Cita cancelada sin cargo. ¡Hasta pronto!',
      appointment: {
        client_name: appt.client_name,
        service_name: appt.service_name,
        start_time: appt.start_time,
      }
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
};
