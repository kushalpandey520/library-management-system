const express = require('express');
const router = express.Router();
const pool = require('../config/db');

// Get all transactions with book and member details
router.get('/', async (req, res) => {
    try {
        const [rows] = await pool.query(`
            SELECT t.*, b.title AS book_title, b.isbn, m.name AS member_name, m.email AS member_email
            FROM transactions t
            JOIN books b ON t.book_id = b.id
            JOIN members m ON t.member_id = m.id
            ORDER BY t.created_at DESC
        `);
        res.json(rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Get active (issued) transactions
router.get('/active', async (req, res) => {
    try {
        const [rows] = await pool.query(`
            SELECT t.*, b.title AS book_title, b.isbn, m.name AS member_name, m.email AS member_email
            FROM transactions t
            JOIN books b ON t.book_id = b.id
            JOIN members m ON t.member_id = m.id
            WHERE t.status = 'issued'
            ORDER BY t.due_date ASC
        `);
        res.json(rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Get overdue transactions
router.get('/overdue', async (req, res) => {
    try {
        // Update overdue status first
        await pool.query(`
            UPDATE transactions SET status = 'overdue'
            WHERE status = 'issued' AND due_date < CURDATE()
        `);

        const [rows] = await pool.query(`
            SELECT t.*, b.title AS book_title, b.isbn, m.name AS member_name, m.email AS member_email,
                   DATEDIFF(CURDATE(), t.due_date) AS days_overdue
            FROM transactions t
            JOIN books b ON t.book_id = b.id
            JOIN members m ON t.member_id = m.id
            WHERE t.status = 'overdue'
            ORDER BY t.due_date ASC
        `);
        res.json(rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Issue a book
router.post('/issue', async (req, res) => {
    const connection = await pool.getConnection();
    try {
        await connection.beginTransaction();

        const { book_id, member_id, due_date } = req.body;

        // Check if book is available
        const [book] = await connection.query('SELECT * FROM books WHERE id = ?', [book_id]);
        if (book.length === 0) {
            await connection.rollback();
            return res.status(404).json({ error: 'Book not found' });
        }
        if (book[0].available_copies <= 0) {
            await connection.rollback();
            return res.status(400).json({ error: 'No copies available for this book' });
        }

        // Check if member exists and is active
        const [member] = await connection.query('SELECT * FROM members WHERE id = ?', [member_id]);
        if (member.length === 0) {
            await connection.rollback();
            return res.status(404).json({ error: 'Member not found' });
        }
        if (member[0].status !== 'active') {
            await connection.rollback();
            return res.status(400).json({ error: 'Member account is inactive' });
        }

        // Check if member already has this book issued
        const [existing] = await connection.query(
            'SELECT * FROM transactions WHERE book_id = ? AND member_id = ? AND status IN ("issued", "overdue")',
            [book_id, member_id]
        );
        if (existing.length > 0) {
            await connection.rollback();
            return res.status(400).json({ error: 'Member already has this book issued' });
        }

        // Create transaction
        const [result] = await connection.query(
            'INSERT INTO transactions (book_id, member_id, due_date) VALUES (?, ?, ?)',
            [book_id, member_id, due_date]
        );

        // Decrease available copies
        await connection.query(
            'UPDATE books SET available_copies = available_copies - 1 WHERE id = ?',
            [book_id]
        );

        await connection.commit();
        res.status(201).json({ id: result.insertId, message: 'Book issued successfully' });
    } catch (err) {
        await connection.rollback();
        res.status(500).json({ error: err.message });
    } finally {
        connection.release();
    }
});

// Return a book
router.post('/return/:id', async (req, res) => {
    const connection = await pool.getConnection();
    try {
        await connection.beginTransaction();

        // Get the transaction
        const [transaction] = await connection.query(
            'SELECT * FROM transactions WHERE id = ? AND status IN ("issued", "overdue")',
            [req.params.id]
        );

        if (transaction.length === 0) {
            await connection.rollback();
            return res.status(404).json({ error: 'Active transaction not found' });
        }

        const txn = transaction[0];
        const returnDate = new Date();
        let fine = 0;

        // Calculate fine if overdue ($1 per day)
        const dueDate = new Date(txn.due_date);
        if (returnDate > dueDate) {
            const daysOverdue = Math.ceil((returnDate - dueDate) / (1000 * 60 * 60 * 24));
            fine = daysOverdue * 1.00;
        }

        // Update transaction
        await connection.query(
            'UPDATE transactions SET status = "returned", return_date = CURDATE(), fine = ? WHERE id = ?',
            [fine, req.params.id]
        );

        // Increase available copies
        await connection.query(
            'UPDATE books SET available_copies = available_copies + 1 WHERE id = ?',
            [txn.book_id]
        );

        await connection.commit();
        res.json({ message: 'Book returned successfully', fine });
    } catch (err) {
        await connection.rollback();
        res.status(500).json({ error: err.message });
    } finally {
        connection.release();
    }
});

// Dashboard stats
router.get('/stats/dashboard', async (req, res) => {
    try {
        const [totalBooks] = await pool.query('SELECT COUNT(*) AS count FROM books');
        const [totalMembers] = await pool.query('SELECT COUNT(*) AS count FROM members WHERE status = "active"');
        const [issuedBooks] = await pool.query('SELECT COUNT(*) AS count FROM transactions WHERE status IN ("issued", "overdue")');
        const [overdueBooks] = await pool.query('SELECT COUNT(*) AS count FROM transactions WHERE status = "overdue"');
        const [totalCopies] = await pool.query('SELECT COALESCE(SUM(total_copies), 0) AS count FROM books');
        const [availableCopies] = await pool.query('SELECT COALESCE(SUM(available_copies), 0) AS count FROM books');

        res.json({
            totalBooks: totalBooks[0].count,
            totalMembers: totalMembers[0].count,
            issuedBooks: issuedBooks[0].count,
            overdueBooks: overdueBooks[0].count,
            totalCopies: totalCopies[0].count,
            availableCopies: availableCopies[0].count
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;
