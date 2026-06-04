require('dotenv').config();
const express = require('express');
const cors = require('cors');

const app = express();

app.use(cors({
  origin: process.env.FRONTEND_URL || '*',
  credentials: true,
}));
app.use(express.json());

// Routes
app.use('/api/booking', require('./routes/booking'));
app.use('/api/auth', require('./routes/auth'));
app.use('/api/appointments', require('./routes/appointments'));
app.use('/api/services', require('./routes/services'));
app.use('/api/staff', require('./routes/staff'));
app.use('/api/clients', require('./routes/clients'));
app.use('/api/dashboard', require('./routes/dashboard'));

// Health check
app.get('/api/health', (req, res) => res.json({ status: 'ok', app: 'Silvia Glow Studio', version: '2' }));

// One-time setup endpoint — runs schema + seed
app.get('/api/setup', async (req, res) => {
  const { secret } = req.query;
  if (secret !== 'SilviaGlowSetup2024') return res.status(403).json({ error: 'Forbidden' });
  const pool = require('./config/db');
  const fs = require('fs');
  const path = require('path');
  const bcrypt = require('bcryptjs');
  const { v4: uuidv4 } = require('uuid');
  const client = await pool.connect();
  try {
    // Schema
    const schema = fs.readFileSync(path.join(__dirname, 'config/schema.sql'), 'utf8');
    await client.query(schema);
    // Seed salon
    const salonId = uuidv4();
    await client.query(`INSERT INTO salons (id,name,slug,timezone,open_time,close_time,open_days) VALUES ($1,$2,$3,$4,$5,$6,$7) ON CONFLICT (slug) DO NOTHING`,
      [salonId,'Silvia Glow Studio LLC','silvia-glow','America/New_York','08:00','21:00',[1,2,3,4,5,6]]);
    const { rows } = await client.query(`SELECT id FROM salons WHERE slug='silvia-glow'`);
    const sid = rows[0].id;
    // Manager
    const mpass = await bcrypt.hash('manager123', 10);
    await client.query(`INSERT INTO users (id,salon_id,name,email,password_hash,role) VALUES ($1,$2,$3,$4,$5,$6) ON CONFLICT (email) DO NOTHING`,
      [uuidv4(),sid,'Silvia (Manager)','manager@silviaglow.com',mpass,'manager']);
    // Technicians
    const tpass = await bcrypt.hash('tech123', 10);
    for (const [n,e] of [['Técnica 1','tech1@silviaglow.com'],['Técnica 2','tech2@silviaglow.com'],['Técnica 3','tech3@silviaglow.com']]) {
      await client.query(`INSERT INTO users (id,salon_id,name,email,password_hash,role) VALUES ($1,$2,$3,$4,$5,$6) ON CONFLICT (email) DO NOTHING`,[uuidv4(),sid,n,e,tpass,'technician']);
    }
    // Services
    const services = [
      ['Pedi & Mani','Pedi & Mani',30,60],['Pedicure Regular','Pedi & Mani',20,45],['Manicure Regular','Pedi & Mani',30,30],
      ['Pedi & Mani Regular','Pedi & Mani',45,75],['Pedicure & Gel','Pedi & Mani',40,60],['Manicure & Gel','Pedi & Mani',30,45],
      ['Mani, Pedi & Gel','Pedi & Mani',65,90],['Callus Remove','Pedi & Mani',5,15],['One Toenail','Pedi & Mani',6,10],
      ['Fullset Regular','Nails',35,60],['Filling Regular','Nails',30,45],['Fullset Gel Color','Nails',45,75],
      ['Filling Gel Color','Nails',40,60],['Dip Powder','Nails',45,60],['Ombre Nails','Nails',65,90],
      ['Colored Acrylic','Nails',50,75],['Cut','Nails',3,10],['Fix One Nail','Nails',3,10],
      ['Soak Off','Nails',8,20],['Eyebrows','Nails',7,15],
      ['Builder Gel','Gel & Specialty',50,90],['Hard Gel','Gel & Specialty',50,90],['Poly Gel','Gel & Specialty',50,90],
      ['Soft Gel','Gel & Specialty',50,75],['Spa Pedicure','Gel & Specialty',50,75],
      ['Spa Manicure','Gel & Specialty',50,60],['Wax','Gel & Specialty',50,30],
    ];
    for (const [name,cat,price,dur] of services) {
      await client.query(`INSERT INTO services (id,salon_id,name,category,price,duration_minutes) VALUES ($1,$2,$3,$4,$5,$6)`,
        [uuidv4(),sid,name,cat,price,dur]);
    }
    res.json({ ok: true, message: 'Database initialized successfully!' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  } finally {
    client.release();
  }
});

// 404
app.use((req, res) => res.status(404).json({ error: 'Not found' }));

// Error handler
app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ error: 'Internal server error' });
});

// Auto-initialize DB on startup if needed
async function initDB() {
  const pool = require('./config/db');
  const fs = require('fs');
  const path = require('path');
  const bcrypt = require('bcryptjs');
  const { v4: uuidv4 } = require('uuid');
  const client = await pool.connect();
  try {
    // Check if already initialized
    const check = await client.query(`SELECT to_regclass('public.salons') as exists`);
    if (check.rows[0].exists) {
      console.log('✅ DB already initialized');
      // Always keep salon contact info up to date
      await client.query(`UPDATE salons SET phone = '(718) 427-3594', address = '854 E 163rd St, Bronx, NY 10459' WHERE slug = 'silvia-glow'`);
      return;
    }
    // Schema
    const schema = fs.readFileSync(path.join(__dirname, 'config/schema.sql'), 'utf8');
    await client.query(schema);
    console.log('✅ Schema created');
    // Seed salon
    const salonId = uuidv4();
    await client.query(`INSERT INTO salons (id,name,slug,timezone,open_time,close_time,open_days) VALUES ($1,$2,$3,$4,$5,$6,$7) ON CONFLICT (slug) DO NOTHING`,
      [salonId,'Silvia Glow Studio LLC','silvia-glow','America/New_York','08:00','21:00',[1,2,3,4,5,6]]);
    const { rows } = await client.query(`SELECT id FROM salons WHERE slug='silvia-glow'`);
    const sid = rows[0].id;
    // Manager
    const mpass = await bcrypt.hash('manager123', 10);
    await client.query(`INSERT INTO users (id,salon_id,name,email,password_hash,role) VALUES ($1,$2,$3,$4,$5,$6) ON CONFLICT (email) DO NOTHING`,
      [uuidv4(),sid,'Silvia (Manager)','manager@silviaglow.com',mpass,'manager']);
    // Technicians
    const tpass = await bcrypt.hash('tech123', 10);
    for (const [n,e] of [['Técnica 1','tech1@silviaglow.com'],['Técnica 2','tech2@silviaglow.com'],['Técnica 3','tech3@silviaglow.com']]) {
      await client.query(`INSERT INTO users (id,salon_id,name,email,password_hash,role) VALUES ($1,$2,$3,$4,$5,$6) ON CONFLICT (email) DO NOTHING`,[uuidv4(),sid,n,e,tpass,'technician']);
    }
    // Services
    const services = [
      ['Pedi & Mani','Pedi & Mani',30,60],['Pedicure Regular','Pedi & Mani',20,45],['Manicure Regular','Pedi & Mani',30,30],
      ['Pedi & Mani Regular','Pedi & Mani',45,75],['Pedicure & Gel','Pedi & Mani',40,60],['Manicure & Gel','Pedi & Mani',30,45],
      ['Mani, Pedi & Gel','Pedi & Mani',65,90],['Callus Remove','Pedi & Mani',5,15],['One Toenail','Pedi & Mani',6,10],
      ['Fullset Regular','Nails',35,60],['Filling Regular','Nails',30,45],['Fullset Gel Color','Nails',45,75],
      ['Filling Gel Color','Nails',40,60],['Dip Powder','Nails',45,60],['Ombre Nails','Nails',65,90],
      ['Colored Acrylic','Nails',50,75],['Cut','Nails',3,10],['Fix One Nail','Nails',3,10],
      ['Soak Off','Nails',8,20],['Eyebrows','Nails',7,15],
      ['Builder Gel','Gel & Specialty',50,90],['Hard Gel','Gel & Specialty',50,90],['Poly Gel','Gel & Specialty',50,90],
      ['Soft Gel','Gel & Specialty',50,75],['Spa Pedicure','Gel & Specialty',50,75],
      ['Spa Manicure','Gel & Specialty',50,60],['Wax','Gel & Specialty',50,30],
    ];
    for (const [name,cat,price,dur] of services) {
      await client.query(`INSERT INTO services (id,salon_id,name,category,price,duration_minutes) VALUES ($1,$2,$3,$4,$5,$6)`,
        [uuidv4(),sid,name,cat,price,dur]);
    }
    console.log('✅ Seed data loaded — Silvia Glow Studio ready!');
    // Update salon contact info
    await client.query(`UPDATE salons SET phone = '(718) 427-3594', address = '854 E 163rd St, Bronx, NY 10459' WHERE slug = 'silvia-glow'`);
    console.log('✅ Salon contact info updated');
  } catch (err) {
    console.error('❌ DB init error:', err.message);
  } finally {
    client.release();
  }
}

const PORT = process.env.PORT || 4000;
app.listen(PORT, async () => {
  console.log(`🌸 Silvia Glow API running on port ${PORT}`);
  await initDB();
});
