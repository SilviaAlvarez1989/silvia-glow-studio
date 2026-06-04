// Seed initial data for Silvia Glow Studio LLC
const pool = require('./db');
const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');

async function seed() {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // Create salon
    const salonId = uuidv4();
    await client.query(`
      INSERT INTO salons (id, name, slug, phone, email, timezone, open_time, close_time, open_days)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      ON CONFLICT (slug) DO NOTHING
    `, [salonId, 'Silvia Glow Studio LLC', 'silvia-glow', '', '', 'America/New_York', '08:00', '21:00', [1,2,3,4,5,6]]);

    // Get actual salon id (in case it already existed)
    const salonRes = await client.query(`SELECT id FROM salons WHERE slug = 'silvia-glow'`);
    const sid = salonRes.rows[0].id;

    // Create manager (Carlos's wife)
    const managerPass = await bcrypt.hash('manager123', 10);
    await client.query(`
      INSERT INTO users (id, salon_id, name, email, phone, password_hash, role)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      ON CONFLICT (email) DO NOTHING
    `, [uuidv4(), sid, 'Silvia (Manager)', 'manager@silviaglow.com', '', managerPass, 'manager']);

    // Create 3 technicians
    const techPass = await bcrypt.hash('tech123', 10);
    const techs = [
      { name: 'Técnica 1', email: 'tech1@silviaglow.com' },
      { name: 'Técnica 2', email: 'tech2@silviaglow.com' },
      { name: 'Técnica 3', email: 'tech3@silviaglow.com' },
    ];
    for (const t of techs) {
      await client.query(`
        INSERT INTO users (id, salon_id, name, email, password_hash, role)
        VALUES ($1, $2, $3, $4, $5, $6)
        ON CONFLICT (email) DO NOTHING
      `, [uuidv4(), sid, t.name, t.email, techPass, 'technician']);
    }

    // Services
    const services = [
      // Pedi & Mani
      { name: 'Pedi & Mani', category: 'Pedi & Mani', price: 30, duration: 60 },
      { name: 'Pedicure Regular', category: 'Pedi & Mani', price: 20, duration: 45 },
      { name: 'Manicure Regular', category: 'Pedi & Mani', price: 30, duration: 30 },
      { name: 'Pedi & Mani Regular', category: 'Pedi & Mani', price: 45, duration: 75 },
      { name: 'Pedicure & Gel', category: 'Pedi & Mani', price: 40, duration: 60 },
      { name: 'Manicure & Gel', category: 'Pedi & Mani', price: 30, duration: 45 },
      { name: 'Mani, Pedi & Gel', category: 'Pedi & Mani', price: 65, duration: 90 },
      { name: 'Callus Remove', category: 'Pedi & Mani', price: 5, duration: 15 },
      { name: 'One Toenail', category: 'Pedi & Mani', price: 6, duration: 10 },
      // Nails
      { name: 'Fullset Regular', category: 'Nails', price: 35, duration: 60 },
      { name: 'Filling Regular', category: 'Nails', price: 30, duration: 45 },
      { name: 'Fullset Gel Color', category: 'Nails', price: 45, duration: 75 },
      { name: 'Filling Gel Color', category: 'Nails', price: 40, duration: 60 },
      { name: 'Dip Powder', category: 'Nails', price: 45, duration: 60 },
      { name: 'Ombre Nails', category: 'Nails', price: 65, duration: 90 },
      { name: 'Colored Acrylic', category: 'Nails', price: 50, duration: 75 },
      { name: 'Cut', category: 'Nails', price: 3, duration: 10 },
      { name: 'Fix One Nail', category: 'Nails', price: 3, duration: 10 },
      { name: 'Soak Off', category: 'Nails', price: 8, duration: 20 },
      { name: 'Eyebrows', category: 'Nails', price: 7, duration: 15 },
      // Gel & Specialty
      { name: 'Builder Gel', category: 'Gel & Specialty', price: 50, duration: 90 },
      { name: 'Hard Gel', category: 'Gel & Specialty', price: 50, duration: 90 },
      { name: 'Poly Gel', category: 'Gel & Specialty', price: 50, duration: 90 },
      { name: 'Soft Gel', category: 'Gel & Specialty', price: 50, duration: 75 },
      { name: 'Spa Pedicure', category: 'Gel & Specialty', price: 50, duration: 75 },
      { name: 'Spa Manicure', category: 'Gel & Specialty', price: 50, duration: 60 },
      { name: 'Wax', category: 'Gel & Specialty', price: 50, duration: 30 },
    ];

    for (const s of services) {
      await client.query(`
        INSERT INTO services (id, salon_id, name, category, price, duration_minutes)
        VALUES ($1, $2, $3, $4, $5, $6)
      `, [uuidv4(), sid, s.name, s.category, s.price, s.duration]);
    }

    await client.query('COMMIT');
    console.log('✅ Seed completed for Silvia Glow Studio LLC');
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('❌ Seed error:', err);
  } finally {
    client.release();
    pool.end();
  }
}

seed();
