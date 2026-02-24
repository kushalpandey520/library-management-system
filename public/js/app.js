// ===== API Base URL =====
const API = '/api';

// ===== DOM Elements =====
const sidebar = document.getElementById('sidebar');
const menuToggle = document.getElementById('menuToggle');
const pageTitle = document.getElementById('pageTitle');
const pageSubtitle = document.getElementById('pageSubtitle');
const dateDisplay = document.getElementById('dateDisplay');
const menuItems = document.querySelectorAll('.sidebar-menu li[data-page]');

// ===== Initialize =====
document.addEventListener('DOMContentLoaded', () => {
    displayDate();
    displayGreeting();
    loadDashboard();
    setupEventListeners();
    setDefaultDueDate();
});

// ===== Time-aware greeting =====
function displayGreeting() {
    const hour = new Date().getHours();
    const el = document.getElementById('greeting');
    if (!el) return;
    if (hour < 12) el.textContent = 'Good morning!';
    else if (hour < 17) el.textContent = 'Good afternoon!';
    else el.textContent = 'Good evening!';
}

// ===== Display Current Date =====
function displayDate() {
    const now = new Date();
    dateDisplay.textContent = now.toLocaleDateString('en-US', {
        weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
    });
}

// ===== Set Default Due Date (14 days from now) =====
function setDefaultDueDate() {
    const dueDate = new Date();
    dueDate.setDate(dueDate.getDate() + 14);
    document.getElementById('issueDueDate').value = dueDate.toISOString().split('T')[0];
}

// ===== Event Listeners =====
function setupEventListeners() {
    // Sidebar toggle
    menuToggle.addEventListener('click', () => {
        sidebar.classList.toggle('collapsed');
        sidebar.classList.toggle('show');
    });

    // Navigation
    menuItems.forEach(item => {
        item.addEventListener('click', () => {
            const page = item.dataset.page;
            navigateTo(page);
        });
    });

    // Book search
    document.getElementById('bookSearch').addEventListener('input', debounce(searchBooks, 300));

    // Member search
    document.getElementById('memberSearch').addEventListener('input', debounce(searchMembers, 300));

    // Book form
    document.getElementById('bookForm').addEventListener('submit', handleBookSubmit);

    // Member form
    document.getElementById('memberForm').addEventListener('submit', handleMemberSubmit);

    // Issue form
    document.getElementById('issueForm').addEventListener('submit', handleIssueSubmit);
}

// ===== Navigation =====
function navigateTo(page) {
    // Update menu
    menuItems.forEach(item => item.classList.remove('active'));
    document.querySelector(`[data-page="${page}"]`).classList.add('active');

    // Update pages
    document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
    document.getElementById(`page-${page}`).classList.add('active');

    // Update title & subtitle
    const pages = {
        dashboard: { title: 'Dashboard', sub: 'Here\u2019s what\u2019s happening at the library today.' },
        books:     { title: 'Books', sub: 'Browse, add, or edit the catalog.' },
        members:   { title: 'Members', sub: 'Manage your library members.' },
        issue:     { title: 'Check Out', sub: 'Lend a book to a member.' },
        returns:   { title: 'Check In', sub: 'Process book returns.' },
        history:   { title: 'Ledger', sub: 'Full transaction history.' }
    };
    const info = pages[page] || { title: page, sub: '' };
    pageTitle.textContent = info.title;
    pageSubtitle.textContent = info.sub;

    // Load page data
    switch (page) {
        case 'dashboard': loadDashboard(); break;
        case 'books': loadBooks(); break;
        case 'members': loadMembers(); break;
        case 'issue': loadIssueForm(); break;
        case 'returns': loadReturns(); break;
        case 'history': loadHistory(); break;
    }

    // Close sidebar on mobile
    if (window.innerWidth <= 768) {
        sidebar.classList.remove('show');
    }
}

// ===== Dashboard =====
async function loadDashboard() {
    try {
        const [statsRes, transRes] = await Promise.all([
            fetch(`${API}/transactions/stats/dashboard`),
            fetch(`${API}/transactions`)
        ]);

        const stats = await statsRes.json();
        const transactions = await transRes.json();

        document.getElementById('statTotalBooks').textContent = stats.totalBooks;
        document.getElementById('statTotalCopies').textContent = stats.totalCopies;
        document.getElementById('statAvailable').textContent = stats.availableCopies;
        document.getElementById('statMembers').textContent = stats.totalMembers;
        document.getElementById('statIssued').textContent = stats.issuedBooks;
        document.getElementById('statOverdue').textContent = stats.overdueBooks;

        // Recent transactions
        const tbody = document.getElementById('recentTransactions');
        if (transactions.length === 0) {
            tbody.innerHTML = `<tr><td colspan="5"><div class="empty-state"><i class="fas fa-inbox"></i><p>No transactions yet</p></div></td></tr>`;
        } else {
            tbody.innerHTML = transactions.slice(0, 5).map(t => `
                <tr>
                    <td>${escapeHtml(t.book_title)}</td>
                    <td>${escapeHtml(t.member_name)}</td>
                    <td>${formatDate(t.issue_date)}</td>
                    <td>${formatDate(t.due_date)}</td>
                    <td><span class="badge ${getBadgeClass(t.status)}">${t.status}</span></td>
                </tr>
            `).join('');
        }
    } catch (err) {
        showToast('Failed to load dashboard data', 'error');
    }
}

// ===== Books =====
async function loadBooks() {
    try {
        const res = await fetch(`${API}/books`);
        const books = await res.json();
        renderBooks(books);
    } catch (err) {
        showToast('Failed to load books', 'error');
    }
}

async function searchBooks() {
    const query = document.getElementById('bookSearch').value.trim();
    if (!query) return loadBooks();

    try {
        const res = await fetch(`${API}/books/search?q=${encodeURIComponent(query)}`);
        const books = await res.json();
        renderBooks(books);
    } catch (err) {
        showToast('Search failed', 'error');
    }
}

function renderBooks(books) {
    const tbody = document.getElementById('booksTable');
    if (books.length === 0) {
        tbody.innerHTML = `<tr><td colspan="7"><div class="empty-state"><i class="fas fa-book"></i><p>No books found</p></div></td></tr>`;
        return;
    }
    tbody.innerHTML = books.map(b => `
        <tr>
            <td><strong>${escapeHtml(b.title)}</strong></td>
            <td>${escapeHtml(b.author)}</td>
            <td>${escapeHtml(b.isbn)}</td>
            <td>${escapeHtml(b.genre || '-')}</td>
            <td>${b.total_copies}</td>
            <td><span class="badge ${b.available_copies > 0 ? 'badge-success' : 'badge-danger'}">${b.available_copies}</span></td>
            <td>
                <div class="actions-cell">
                    <button class="btn btn-sm btn-icon btn-primary" onclick="editBook(${b.id})" title="Edit">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button class="btn btn-sm btn-icon btn-danger" onclick="deleteBook(${b.id})" title="Delete">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
            </td>
        </tr>
    `).join('');
}

function openBookModal(book = null) {
    document.getElementById('bookModalTitle').textContent = book ? 'Edit Book' : 'Add Book';
    document.getElementById('bookForm').reset();
    document.getElementById('bookId').value = book ? book.id : '';

    if (book) {
        document.getElementById('bookTitle').value = book.title;
        document.getElementById('bookAuthor').value = book.author;
        document.getElementById('bookIsbn').value = book.isbn;
        document.getElementById('bookPublisher').value = book.publisher || '';
        document.getElementById('bookYear').value = book.year_published || '';
        document.getElementById('bookGenre').value = book.genre || '';
        document.getElementById('bookCopies').value = book.total_copies;
    }

    document.getElementById('bookModal').classList.add('active');
}

function closeBookModal() {
    document.getElementById('bookModal').classList.remove('active');
}

async function editBook(id) {
    try {
        const res = await fetch(`${API}/books/${id}`);
        const book = await res.json();
        openBookModal(book);
    } catch (err) {
        showToast('Failed to load book details', 'error');
    }
}

async function handleBookSubmit(e) {
    e.preventDefault();
    const id = document.getElementById('bookId').value;
    const data = {
        title: document.getElementById('bookTitle').value,
        author: document.getElementById('bookAuthor').value,
        isbn: document.getElementById('bookIsbn').value,
        publisher: document.getElementById('bookPublisher').value,
        year_published: document.getElementById('bookYear').value || null,
        genre: document.getElementById('bookGenre').value,
        total_copies: parseInt(document.getElementById('bookCopies').value)
    };

    try {
        const url = id ? `${API}/books/${id}` : `${API}/books`;
        const method = id ? 'PUT' : 'POST';
        const res = await fetch(url, {
            method,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        });

        const result = await res.json();
        if (!res.ok) throw new Error(result.error);

        showToast(result.message, 'success');
        closeBookModal();
        loadBooks();
    } catch (err) {
        showToast(err.message, 'error');
    }
}

async function deleteBook(id) {
    if (!confirm('Are you sure you want to delete this book?')) return;

    try {
        const res = await fetch(`${API}/books/${id}`, { method: 'DELETE' });
        const result = await res.json();
        if (!res.ok) throw new Error(result.error);

        showToast(result.message, 'success');
        loadBooks();
    } catch (err) {
        showToast(err.message, 'error');
    }
}

// ===== Members =====
async function loadMembers() {
    try {
        const res = await fetch(`${API}/members`);
        const members = await res.json();
        renderMembers(members);
    } catch (err) {
        showToast('Failed to load members', 'error');
    }
}

async function searchMembers() {
    const query = document.getElementById('memberSearch').value.trim();
    if (!query) return loadMembers();

    try {
        const res = await fetch(`${API}/members/search?q=${encodeURIComponent(query)}`);
        const members = await res.json();
        renderMembers(members);
    } catch (err) {
        showToast('Search failed', 'error');
    }
}

function renderMembers(members) {
    const tbody = document.getElementById('membersTable');
    if (members.length === 0) {
        tbody.innerHTML = `<tr><td colspan="6"><div class="empty-state"><i class="fas fa-users"></i><p>No members found</p></div></td></tr>`;
        return;
    }
    tbody.innerHTML = members.map(m => `
        <tr>
            <td><strong>${escapeHtml(m.name)}</strong></td>
            <td>${escapeHtml(m.email)}</td>
            <td>${escapeHtml(m.phone || '-')}</td>
            <td>${formatDate(m.membership_date)}</td>
            <td><span class="badge ${m.status === 'active' ? 'badge-success' : 'badge-danger'}">${m.status}</span></td>
            <td>
                <div class="actions-cell">
                    <button class="btn btn-sm btn-icon btn-primary" onclick="editMember(${m.id})" title="Edit">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button class="btn btn-sm btn-icon btn-danger" onclick="deleteMember(${m.id})" title="Delete">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
            </td>
        </tr>
    `).join('');
}

function openMemberModal(member = null) {
    document.getElementById('memberModalTitle').textContent = member ? 'Edit Member' : 'Add Member';
    document.getElementById('memberForm').reset();
    document.getElementById('memberId').value = member ? member.id : '';

    if (member) {
        document.getElementById('memberName').value = member.name;
        document.getElementById('memberEmail').value = member.email;
        document.getElementById('memberPhone').value = member.phone || '';
        document.getElementById('memberAddress').value = member.address || '';
        document.getElementById('memberStatus').value = member.status;
    }

    document.getElementById('memberModal').classList.add('active');
}

function closeMemberModal() {
    document.getElementById('memberModal').classList.remove('active');
}

async function editMember(id) {
    try {
        const res = await fetch(`${API}/members/${id}`);
        const member = await res.json();
        openMemberModal(member);
    } catch (err) {
        showToast('Failed to load member details', 'error');
    }
}

async function handleMemberSubmit(e) {
    e.preventDefault();
    const id = document.getElementById('memberId').value;
    const data = {
        name: document.getElementById('memberName').value,
        email: document.getElementById('memberEmail').value,
        phone: document.getElementById('memberPhone').value,
        address: document.getElementById('memberAddress').value,
        status: document.getElementById('memberStatus').value
    };

    try {
        const url = id ? `${API}/members/${id}` : `${API}/members`;
        const method = id ? 'PUT' : 'POST';
        const res = await fetch(url, {
            method,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        });

        const result = await res.json();
        if (!res.ok) throw new Error(result.error);

        showToast(result.message, 'success');
        closeMemberModal();
        loadMembers();
    } catch (err) {
        showToast(err.message, 'error');
    }
}

async function deleteMember(id) {
    if (!confirm('Are you sure you want to delete this member?')) return;

    try {
        const res = await fetch(`${API}/members/${id}`, { method: 'DELETE' });
        const result = await res.json();
        if (!res.ok) throw new Error(result.error);

        showToast(result.message, 'success');
        loadMembers();
    } catch (err) {
        showToast(err.message, 'error');
    }
}

// ===== Issue Book =====
async function loadIssueForm() {
    try {
        const [booksRes, membersRes] = await Promise.all([
            fetch(`${API}/books`),
            fetch(`${API}/members`)
        ]);

        const books = await booksRes.json();
        const members = await membersRes.json();

        const bookSelect = document.getElementById('issueBook');
        bookSelect.innerHTML = '<option value="">-- Select a Book --</option>' +
            books.filter(b => b.available_copies > 0).map(b =>
                `<option value="${b.id}">${escapeHtml(b.title)} by ${escapeHtml(b.author)} (${b.available_copies} available)</option>`
            ).join('');

        const memberSelect = document.getElementById('issueMember');
        memberSelect.innerHTML = '<option value="">-- Select a Member --</option>' +
            members.filter(m => m.status === 'active').map(m =>
                `<option value="${m.id}">${escapeHtml(m.name)} (${escapeHtml(m.email)})</option>`
            ).join('');

        setDefaultDueDate();
    } catch (err) {
        showToast('Failed to load form data', 'error');
    }
}

async function handleIssueSubmit(e) {
    e.preventDefault();
    const data = {
        book_id: parseInt(document.getElementById('issueBook').value),
        member_id: parseInt(document.getElementById('issueMember').value),
        due_date: document.getElementById('issueDueDate').value
    };

    try {
        const res = await fetch(`${API}/transactions/issue`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        });

        const result = await res.json();
        if (!res.ok) throw new Error(result.error);

        showToast(result.message, 'success');
        document.getElementById('issueForm').reset();
        loadIssueForm();
    } catch (err) {
        showToast(err.message, 'error');
    }
}

// ===== Returns =====
async function loadReturns() {
    try {
        const res = await fetch(`${API}/transactions/active`);
        const transactions = await res.json();

        const tbody = document.getElementById('returnsTable');
        if (transactions.length === 0) {
            tbody.innerHTML = `<tr><td colspan="6"><div class="empty-state"><i class="fas fa-check-circle"></i><p>No books currently issued</p></div></td></tr>`;
            return;
        }

        tbody.innerHTML = transactions.map(t => {
            const isOverdue = new Date(t.due_date) < new Date();
            return `
                <tr>
                    <td><strong>${escapeHtml(t.book_title)}</strong></td>
                    <td>${escapeHtml(t.member_name)}</td>
                    <td>${formatDate(t.issue_date)}</td>
                    <td>${formatDate(t.due_date)}</td>
                    <td><span class="badge ${isOverdue ? 'badge-danger' : 'badge-warning'}">${isOverdue ? 'overdue' : 'issued'}</span></td>
                    <td>
                        <button class="btn btn-sm btn-success" onclick="returnBook(${t.id})">
                            <i class="fas fa-undo"></i> Return
                        </button>
                    </td>
                </tr>
            `;
        }).join('');
    } catch (err) {
        showToast('Failed to load active issues', 'error');
    }
}

async function returnBook(id) {
    if (!confirm('Confirm book return?')) return;

    try {
        const res = await fetch(`${API}/transactions/return/${id}`, { method: 'POST' });
        const result = await res.json();
        if (!res.ok) throw new Error(result.error);

        let msg = result.message;
        if (result.fine > 0) {
            msg += ` | Fine: $${result.fine.toFixed(2)}`;
        }
        showToast(msg, 'success');
        loadReturns();
    } catch (err) {
        showToast(err.message, 'error');
    }
}

// ===== History =====
async function loadHistory() {
    try {
        const res = await fetch(`${API}/transactions`);
        const transactions = await res.json();

        const tbody = document.getElementById('historyTable');
        if (transactions.length === 0) {
            tbody.innerHTML = `<tr><td colspan="7"><div class="empty-state"><i class="fas fa-history"></i><p>No transaction history</p></div></td></tr>`;
            return;
        }

        tbody.innerHTML = transactions.map(t => `
            <tr>
                <td><strong>${escapeHtml(t.book_title)}</strong></td>
                <td>${escapeHtml(t.member_name)}</td>
                <td>${formatDate(t.issue_date)}</td>
                <td>${formatDate(t.due_date)}</td>
                <td>${t.return_date ? formatDate(t.return_date) : '-'}</td>
                <td>${t.fine > 0 ? '$' + parseFloat(t.fine).toFixed(2) : '-'}</td>
                <td><span class="badge ${getBadgeClass(t.status)}">${t.status}</span></td>
            </tr>
        `).join('');
    } catch (err) {
        showToast('Failed to load history', 'error');
    }
}

// ===== Utility Functions =====
function showToast(message, type = 'success') {
    const toast = document.getElementById('toast');
    toast.textContent = message;
    toast.className = `toast ${type} show`;
    setTimeout(() => toast.classList.remove('show'), 3000);
}

function formatDate(dateStr) {
    if (!dateStr) return '-';
    return new Date(dateStr).toLocaleDateString('en-US', {
        year: 'numeric', month: 'short', day: 'numeric'
    });
}

function getBadgeClass(status) {
    switch (status) {
        case 'issued': return 'badge-warning';
        case 'returned': return 'badge-success';
        case 'overdue': return 'badge-danger';
        default: return 'badge-info';
    }
}

function escapeHtml(str) {
    if (!str) return '';
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
}

function debounce(func, wait) {
    let timeout;
    return function (...args) {
        clearTimeout(timeout);
        timeout = setTimeout(() => func.apply(this, args), wait);
    };
}
