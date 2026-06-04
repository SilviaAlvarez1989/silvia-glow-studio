const pool = require('../config/db');

// GET /api/dashboard
const getDashboard = async (req, res) => {
  const { salonId } = req.user;
  const today = new Date().toISOString().split('T')[0];

  try {
    const [todayAppts, pendingPayments, totalClients, monthRevenue, upcomingAppts] = await Promise.all([
      // Today's appointments
      pool.query(
        `SELECT COUNT(*) FROM appointments
         WHERE salon_id = $1
           AND DATE(start_time AT TIME ZONE 'America/New_York') = $2
           AND status NOT IN ('cancelled','no_show')`,
        [salonId, today]
      ),
      // Pending payments
      pool.query(
        `SELECT COUNT(*) FROM appointments
         WHERE salon_id = $1 AND payment_status = 'pending' AND status = 'completed'`,
        [salonId]
      ),
      // Total clients
      pool.query(`SELECT COUNT(*) FROM clients WHERE salon_id = $1`, [salonId]),
      // This month revenue
      pool.query(
        `SELECT COALESCE(SUM(service_price), 0) as total
         FROM appointments
         WHERE salon_id = $1
           AND payment_status = 'paid'
           AND DATE_TRUNC('month', start_time) = DATE_TRUNC('month', NOW())`,
        [salonId]
      ),
      // Next 5 upcoming appointments
      pool.query(
        `SELECT a.*, u.name as technician_name
         FROM appointments a
         LEFT JOIN users u ON u.id = a.technician_id
         WHERE a.salon_id = $1
           AND a.start_time >= NOW()
           AND a.status IN ('pending','confirmed')
         ORDER BY a.start_time ASC LIMIT 5`,
        [salonId]
      ),
    ]);

    res.json({
      todayCount: parseInt(todayAppts.rows[0].count),
      pendingPayments: parseInt(pendingPayments.rows[0].count),
      totalClients: parseInt(totalClients.rows[0].count),
      monthRevenue: parseFloat(monthRevenue.rows[0].total),
      upcomingAppointments: upcomingAppts.rows,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
};

// GET /api/dashboard/revenue?period=week|month|year
const getRevenue = async (req, res) => {
  const { salonId } = req.user;
  const { period = 'month' } = req.query;

  try {
    let groupBy, dateFilter;
    if (period === 'week') {
      groupBy = `DATE(start_time AT TIME ZONE 'America/New_York')`;
      dateFilter = `start_time >= NOW() - INTERVAL '7 days'`;
    } else if (period === 'year') {
      groupBy = `DATE_TRUNC('month', start_time AT TIME ZONE 'America/New_York')`;
      dateFilter = `start_time >= NOW() - INTERVAL '12 months'`;
    } else {
      groupBy = `DATE(start_time AT TIME ZONE 'America/New_York')`;
      dateFilter = `start_time >= NOW() - INTERVAL '30 days'`;
    }

    const result = await pool.query(
      `SELECT ${groupBy} as date,
              COUNT(*) as appointments,
              COALESCE(SUM(service_price), 0) as revenue
       FROM appointments
       WHERE salon_id = $1
         AND payment_status = 'paid'
         AND ${dateFilter}
       GROUP BY ${groupBy}
       ORDER BY date ASC`,
      [salonId]
    );

    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
};

module.exports = { getDashboard, getRevenue };
