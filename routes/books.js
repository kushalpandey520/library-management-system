const express = require('express');
const router = express.Router();
const pool = require('../config/db');

// Get all books
router.get('/', async (req, res) => {
    try {
        const [rows] = await pool.query('SELECT * FROM books ORDER BY title');
        res.json(rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Search books
router.get('/search', async (req, res) => {
    try {
        const { q } = req.query;
        const [rows] = await pool.query(
            'SELECT * FROM books WHERE title LIKE ? OR author LIKE ? OR isbn LIKE ? OR genre LIKE ?',
            [`%${q}%`, `%${q}%`, `%${q}%`, `%${q}%`]
        );
        res.json(rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Get single book
router.get('/:id', async (req, res) => {
    try {
        const [rows] = await pool.query('SELECT * FROM books WHERE id = ?', [req.params.id]);
        if (rows.length === 0) return res.status(404).json({ error: 'Book not found' });
        res.json(rows[0]);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Add a book
router.post('/', async (req, res) => {
    try {
        const { title, author, isbn, publisher, year_published, genre, total_copies } = req.body;
        const [result] = await pool.query(
            'INSERT INTO books (title, author, isbn, publisher, year_published, genre, total_copies, available_copies) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
            [title, author, isbn, publisher, year_published, genre, total_copies, total_copies]
        );
        res.status(201).json({ id: result.insertId, message: 'Book added successfully' });
    } catch (err) {
        if (err.code === 'ER_DUP_ENTRY') {
            return res.status(400).json({ error: 'A book with this ISBN already exists' });
        }
        res.status(500).json({ error: err.message });
    }
});

// Update a book
router.put('/:id', async (req, res) => {
    try {
        const { title, author, isbn, publisher, year_published, genre, total_copies } = req.body;

        // Get current book to calculate available copies adjustment
        const [current] = await pool.query('SELECT * FROM books WHERE id = ?', [req.params.id]);
        if (current.length === 0) return res.status(404).json({ error: 'Book not found' });

        const diff = total_copies - current[0].total_copies;
        const newAvailable = current[0].available_copies + diff;

        if (newAvailable < 0) {
            return res.status(400).json({ error: 'Cannot reduce total copies below currently issued count' });
        }

        await pool.query(
            'UPDATE books SET title=?, author=?, isbn=?, publisher=?, year_published=?, genre=?, total_copies=?, available_copies=? WHERE id=?',
            [title, author, isbn, publisher, year_published, genre, total_copies, newAvailable, req.params.id]
        );
        res.json({ message: 'Book updated successfully' });
    } catch (err) {
        if (err.code === 'ER_DUP_ENTRY') {
            return res.status(400).json({ error: 'A book with this ISBN already exists' });
        }
        res.status(500).json({ error: err.message });
    }
});

// Delete a book
router.delete('/:id', async (req, res) => {
    try {
        const [result] = await pool.query('DELETE FROM books WHERE id = ?', [req.params.id]);
        if (result.affectedRows === 0) return res.status(404).json({ error: 'Book not found' });
        res.json({ message: 'Book deleted successfully' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;
