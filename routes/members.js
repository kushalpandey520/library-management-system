const express = require('express');
const router = express.Router();
const pool = require('../config/db');

// Get all members
router.get('/', async (req, res) => {
    try {
        const [rows] = await pool.query('SELECT * FROM members ORDER BY name');
        res.json(rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Search members
router.get('/search', async (req, res) => {
    try {
        const { q } = req.query;
        const [rows] = await pool.query(
            'SELECT * FROM members WHERE name LIKE ? OR email LIKE ? OR phone LIKE ?',
            [`%${q}%`, `%${q}%`, `%${q}%`]
        );
        res.json(rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Get single member
router.get('/:id', async (req, res) => {
    try {
        const [rows] = await pool.query('SELECT * FROM members WHERE id = ?', [req.params.id]);
        if (rows.length === 0) return res.status(404).json({ error: 'Member not found' });
        res.json(rows[0]);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Add a member
router.post('/', async (req, res) => {
    try {
        const { name, email, phone, address } = req.body;
        const [result] = await pool.query(
            'INSERT INTO members (name, email, phone, address) VALUES (?, ?, ?, ?)',
            [name, email, phone, address]
        );
        res.status(201).json({ id: result.insertId, message: 'Member added successfully' });
    } catch (err) {
        if (err.code === 'ER_DUP_ENTRY') {
            return res.status(400).json({ error: 'A member with this email already exists' });
        }
        res.status(500).json({ error: err.message });
    }
});

// Update a member
router.put('/:id', async (req, res) => {
    try {
        const { name, email, phone, address, status } = req.body;
        const [result] = await pool.query(
            'UPDATE members SET name=?, email=?, phone=?, address=?, status=? WHERE id=?',
            [name, email, phone, address, status, req.params.id]
        );
        if (result.affectedRows === 0) return res.status(404).json({ error: 'Member not found' });
        res.json({ message: 'Member updated successfully' });
    } catch (err) {
        if (err.code === 'ER_DUP_ENTRY') {
            return res.status(400).json({ error: 'A member with this email already exists' });
        }
        res.status(500).json({ error: err.message });
    }
});

// Delete a member
router.delete('/:id', async (req, res) => {
    try {
        const [result] = await pool.query('DELETE FROM members WHERE id = ?', [req.params.id]);
        if (result.affectedRows === 0) return res.status(404).json({ error: 'Member not found' });
        res.json({ message: 'Member deleted successfully' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;
