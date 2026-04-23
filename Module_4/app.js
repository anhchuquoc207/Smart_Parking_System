// server.js
const express = require('express');
const mysql = require('mysql2/promise');
const app = express();

// Database connection pool
const pool = mysql.createPool({
    host: 'localhost',
    user: 'your_db_user',
    password: 'your_db_password',
    database: 'occupancy_db'
});

const MAX_CAPACITY = 50; // Set your room's maximum capacity here

// API Endpoint for the signage to call
app.get('/api/occupancy', async (req, res) => {
    try {
        // Example Query: Count the number of people currently checked in
        const [rows] = await pool.query('SELECT COUNT(*) as currentCount FROM logs WHERE status = "entered"');
        
        const currentOccupancy = rows[0].currentCount;

        res.json({
            current: currentOccupancy,
            maxCapacity: MAX_CAPACITY
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Database connection failed' });
    }
});

app.listen(3000, () => {
    console.log('Backend API running on http://localhost:3000');
});
