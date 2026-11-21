// Sample data: one administrator, one student and 12 reports
require('dotenv').config();
const { pool, testConnection } = require('../config/database');
const User = require('../models/User');
const Item = require('../models/Item');

const items = [
  { title: 'Black Dell Laptop Charger', description: '65W Dell charger with a small white sticker on the plug.', category: 'Electronics', type: 'found', location: 'Library, 2nd floor', daysAgo: 2 },
  { title: 'Blue Water Bottle', description: 'Blue Milton bottle, 1 litre, name written in marker.', category: 'Other', type: 'lost', location: 'Canteen', daysAgo: 1 },
  { title: 'Student ID Card', description: 'ID card in a transparent holder with a red lanyard.', category: 'ID Card', type: 'found', location: 'Main Gate Security Desk', daysAgo: 3 },
  { title: 'Brown Leather Wallet', description: 'Brown wallet with an ATM card and around 300 rupees inside.', category: 'Wallet', type: 'lost', location: 'Basketball Court', daysAgo: 4 },
  { title: 'Data Structures Textbook', description: 'Cormen CLRS hard cover, name written on the first page.', category: 'Books', type: 'found', location: 'Block B, Room 204', daysAgo: 5 },
  { title: 'Hostel Room Keys', description: 'Two keys on a steel ring with a small Ganesha keychain.', category: 'Keys', type: 'lost', location: 'Hostel Block C', daysAgo: 2 },
  { title: 'Black Wireless Earbuds', description: 'Boat earbuds in a black case, the left one has a scratch.', category: 'Electronics', type: 'lost', location: 'Bus Stop', daysAgo: 6 },
  { title: 'Grey Hoodie', description: 'Grey hoodie, size M, with a college fest logo printed on it.', category: 'Clothing', type: 'found', location: 'Sports Complex', daysAgo: 7 },
  { title: 'Scientific Calculator', description: 'Casio fx-991EX with the name written on the back in marker.', category: 'Electronics', type: 'found', location: 'Exam Hall 3', daysAgo: 8 },
  { title: 'Silver Wrist Watch', description: 'Silver analog watch with a metal strap and a scratched glass.', category: 'Accessories', type: 'lost', location: 'Auditorium', daysAgo: 9 },
  { title: 'Badminton Racket', description: 'Yonex racket with a blue grip, the cover is missing.', category: 'Sports', type: 'found', location: 'Indoor Stadium', daysAgo: 10 },
  { title: 'Prescription Glasses', description: 'Black frame glasses inside a blue hard case.', category: 'Accessories', type: 'lost', location: 'Central Library', daysAgo: 11 },
];

const run = async () => {
  const ok = await testConnection();
  if (!ok) process.exit(1);

  try {
    await pool.query('delete from app_v2.recovery_requests');
    await pool.query('delete from app_v2.items');
    await pool.query('delete from app_v2.users');
    console.log('Old data cleared');

    if (!process.env.ADMIN_EMAIL || !process.env.DEMO_EMAIL) {
      throw new Error('Set ADMIN_EMAIL and DEMO_EMAIL in server/.env before seeding');
    }
    if (!process.env.ADMIN_PASSWORD || process.env.ADMIN_PASSWORD.length < 8) {
      throw new Error('Set ADMIN_PASSWORD (at least 8 characters) in server/.env before seeding');
    }
    if (!process.env.DEMO_PASSWORD || process.env.DEMO_PASSWORD.length < 6) {
      throw new Error('Set DEMO_PASSWORD (at least 6 characters) in server/.env before seeding');
    }

    const admin = await User.create({
      name: 'Administrator',
      email: process.env.ADMIN_EMAIL,
      password: process.env.ADMIN_PASSWORD,
    });
    await pool.query(`update app_v2.users set role = 'admin' where id = $1`, [admin.id]);

    const demo = await User.create({
      name: 'Demo Student',
      email: process.env.DEMO_EMAIL,
      studentId: 'SAI2026001',
      password: process.env.DEMO_PASSWORD,
    });

    for (let i = 0; i < items.length; i += 1) {
      const it = items[i];
      const d = new Date();
      d.setDate(d.getDate() - it.daysAgo);
      await Item.create({
        ...it,
        eventDate: d.toISOString().slice(0, 10),
        identifyingFeatures: '',
        reportedBy: i % 2 === 0 ? demo.id : admin.id,
      });
    }

    console.log(`${items.length} sample items created`);
    console.log(`Admin account: ${admin.email} (password from ADMIN_PASSWORD in .env)`);
    console.log(`Student account: ${demo.email} (password from DEMO_PASSWORD in .env)`);
  } catch (error) {
    console.error('Seed failed:', error.message);
    process.exitCode = 1;
  } finally {
    await pool.end();
  }
};

run();
