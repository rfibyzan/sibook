const express = require('express');
const cors = require('cors');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

// Basic Route
app.get('/', (req, res) => {
  res.json({ 
    message: 'SIBOOK Backend Service is Running!',
    database: 'Supabase Cloud',
    status: 'Ready'
  });
});

app.listen(PORT, () => {
  console.log(`=========================================`);
  console.log(`🚀 SIBOOK Backend Running on port ${PORT}`);
  console.log(`📂 Database: Supabase (Cloud Mode)`);
  console.log(`=========================================`);
});
