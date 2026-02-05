const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const db = require('./db');

const app = express();
const PORT = process.env.PORT || 5000;
const JWT_SECRET = 'tsocial-secret-key';

app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(morgan('dev'));

// --- Middleware ---

const authMiddleware = (req, res, next) => {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ error: 'Oturum açmanız gerekiyor.' });
    }
    const token = authHeader.split(' ')[1];
    try {
        const decoded = jwt.verify(token, JWT_SECRET);

        // Check if suspended
        const user = db.prepare('SELECT is_suspended FROM users WHERE id = ?').get(decoded.id);
        if (user && user.is_suspended) {
            return res.status(403).json({ error: 'Hesabınız askıya alınmıştır.' });
        }

        req.user = decoded; // { id, handle }

        // Update user activity timestamp silently
        db.prepare('UPDATE users SET last_active = CURRENT_TIMESTAMP WHERE id = ?').run(decoded.id);

        next();
    } catch (error) {
        return res.status(401).json({ error: 'Geçersiz oturum.' });
    }
};

const adminMiddleware = (req, res, next) => {
    authMiddleware(req, res, () => {
        const user = db.prepare('SELECT is_admin FROM users WHERE id = ?').get(req.user.id);
        if (user && user.is_admin) {
            next();
        } else {
            res.status(403).json({ error: 'Bu işlem için yetkiniz yok.' });
        }
    });
};

// --- Authentication API ---

// Register
app.post('/api/auth/register', async (req, res) => {
    const { name, handle, password } = req.body;
    try {
        const hashedPassword = await bcrypt.hash(password, 10);
        const info = db.prepare(`
            INSERT INTO users (name, handle, password, joinDate, followers, following, postsCount)
            VALUES (?, ?, ?, ?, ?, ?, ?)
        `).run(name, handle, hashedPassword, 'Şubat 2026', '0', '0', '0');

        const token = jwt.sign({ id: info.lastInsertRowid, handle }, JWT_SECRET, { expiresIn: '24h' });
        res.status(201).json({ token, handle, name });
    } catch (error) {
        console.error('Registration error:', error);
        if (error.code && error.code.startsWith('SQLITE_CONSTRAINT')) {
            return res.status(400).json({ error: 'Bu kullanıcı adı zaten alınmış.' });
        }
        res.status(500).json({ error: 'Kayıt sırasında bir hata oluştu.' });
    }
});

// Login
app.post('/api/auth/login', async (req, res) => {
    const { handle, password } = req.body;
    try {
        const user = db.prepare('SELECT * FROM users WHERE handle = ?').get(handle);
        if (!user || !(await bcrypt.compare(password, user.password))) {
            return res.status(401).json({ error: 'Hatalı kullanıcı adı veya şifre.' });
        }

        if (user.is_suspended) {
            const admin = db.prepare('SELECT name FROM users WHERE handle = ?').get(user.suspended_by);
            return res.status(403).json({
                error: 'Hesabınız askıya alınmıştır.',
                reason: user.suspension_reason || 'Kullanım koşullarının ihlali.',
                suspendedBy: user.suspended_by || 'Sistem',
                adminName: admin ? admin.name : 'TSocial Yetkilisi',
                userName: user.name,
                isSuspended: true,
                appealStatus: user.appeal_status,
                appealText: user.appeal_text
            });
        }

        const token = jwt.sign({ id: user.id, handle: user.handle, isAdmin: !!user.is_admin }, JWT_SECRET, { expiresIn: '24h' });
        res.json({ token, handle: user.handle, name: user.name, isAdmin: !!user.is_admin });
    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({ error: 'Giriş sırasında bir hata oluştu.' });
    }
});

// Submit Appeal
app.post('/api/auth/appeal', async (req, res) => {
    const { handle, password, appealText } = req.body;
    try {
        const user = db.prepare('SELECT * FROM users WHERE handle = ?').get(handle);
        if (!user || !(await bcrypt.compare(password, user.password))) {
            return res.status(401).json({ error: 'Doğrulama başarısız.' });
        }

        if (!user.is_suspended) {
            return res.status(400).json({ error: 'Bu hesap askıda değil.' });
        }

        if (user.appeal_status === 'pending') {
            return res.status(400).json({ error: 'Zaten bekleyen bir itirazınız var.' });
        }

        if (user.appeal_status === 'rejected') {
            return res.status(400).json({ error: 'İtiraz hakkınız tükenmiş.' });
        }

        db.prepare('UPDATE users SET appeal_status = ?, appeal_text = ? WHERE id = ?')
            .run('pending', appealText, user.id);

        res.json({ success: true, message: 'İtirazınız başarıyla alındı. İncelendikten sonra bilgilendirileceksiniz.' });
    } catch (error) {
        console.error('Appeal error details:', error.message);
        console.error(error.stack);
        res.status(500).json({ error: 'İtiraz gönderilirken bir hata oluştu: ' + error.message });
    }
});

// --- API Endpoints ---

// Get User Profile (Dynamic)
app.get('/api/profile', (req, res) => {
    const handle = req.query.handle; // Optional: view other profiles
    const authHeader = req.headers.authorization;

    let targetHandle = handle;

    // If no handle provided, try to get from token
    if (!targetHandle && authHeader && authHeader.startsWith('Bearer ')) {
        try {
            const token = authHeader.split(' ')[1];
            const decoded = jwt.verify(token, JWT_SECRET);
            targetHandle = decoded.handle;
        } catch (e) { }
    }

    if (!targetHandle) return res.status(400).json({ error: 'Handle required' });

    const user = db.prepare('SELECT id, name, handle, bio, location, website, joinDate, avatar, banner, followers, following, postsCount, is_admin, last_active FROM users WHERE handle = ?').get(targetHandle);
    if (!user) return res.status(404).json({ error: 'User not found' });
    res.json({
        ...user,
        isAdmin: !!user.is_admin
    });
});

// Update User Profile (Protected)
app.put('/api/profile', authMiddleware, (req, res) => {
    const { name, bio, location, website } = req.body;
    const handle = req.user.handle;

    db.prepare('UPDATE users SET name = ?, bio = ?, location = ?, website = ? WHERE handle = ?')
        .run(name, bio, location, website, handle);

    db.prepare('UPDATE posts SET username = ? WHERE handle = ?').run(name, handle);

    res.json({ success: true });
});

// Get All Posts
app.get('/api/posts', (req, res) => {
    // Optional auth to check isLiked
    const authHeader = req.headers.authorization;
    let userId = null;
    if (authHeader && authHeader.startsWith('Bearer ')) {
        try {
            const token = authHeader.split(' ')[1];
            const decoded = jwt.verify(token, JWT_SECRET);
            userId = decoded.id;
        } catch (e) {
            // ignore invalid token for public feed
        }
    }

    const posts = db.prepare('SELECT * FROM posts ORDER BY created_at DESC').all();
    const formattedPosts = posts.map(p => {
        let isLiked = false;
        let isBookmarked = false;
        if (userId) {
            isLiked = !!db.prepare('SELECT 1 FROM post_likes WHERE user_id = ? AND post_id = ?').get(userId, p.id);
            isBookmarked = !!db.prepare('SELECT 1 FROM bookmarks WHERE user_id = ? AND post_id = ?').get(userId, p.id);
        }
        return {
            ...p,
            isLiked,
            isBookmarked,
            stats: {
                likes: p.likes,
                comments: p.comments,
                reposts: p.reposts,
                views: p.views
            }
        };
    });
    res.json(formattedPosts);
});

// Create Post (Protected)
app.post('/api/posts', authMiddleware, (req, res) => {
    const { content, image, parent_id } = req.body;
    const handle = req.user.handle;
    const user = db.prepare('SELECT * FROM users WHERE handle = ?').get(handle);

    const info = db.prepare(`
        INSERT INTO posts (user_id, username, handle, avatar, time, content, image, parent_id)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run(user.id, user.name, user.handle, user.avatar, 'Şimdi', content, image, parent_id || null);

    // If it's a reply, increment comment count of parent
    if (parent_id) {
        db.prepare('UPDATE posts SET comments = comments + 1 WHERE id = ?').run(parent_id);
    }

    const newPost = db.prepare('SELECT * FROM posts WHERE id = ?').get(info.lastInsertRowid);
    res.status(201).json({
        ...newPost,
        stats: { likes: 0, comments: 0, reposts: 0, views: '0' }
    });
});

// Get Replies for a Post
app.get('/api/posts/:id/replies', (req, res) => {
    const { id } = req.params;
    const authHeader = req.headers.authorization;
    let userId = null;
    if (authHeader && authHeader.startsWith('Bearer ')) {
        try {
            const token = authHeader.split(' ')[1];
            const decoded = jwt.verify(token, JWT_SECRET);
            userId = decoded.id;
        } catch (e) { }
    }

    const replies = db.prepare('SELECT * FROM posts WHERE parent_id = ? ORDER BY created_at ASC').all(id);
    const formattedReplies = replies.map(p => {
        let isLiked = false;
        let isBookmarked = false;
        if (userId) {
            isLiked = !!db.prepare('SELECT 1 FROM post_likes WHERE user_id = ? AND post_id = ?').get(userId, p.id);
            isBookmarked = !!db.prepare('SELECT 1 FROM bookmarks WHERE user_id = ? AND post_id = ?').get(userId, p.id);
        }
        return {
            ...p,
            isLiked,
            isBookmarked,
            stats: { likes: p.likes, comments: p.comments, reposts: p.reposts, views: p.views }
        };
    });
    res.json(formattedReplies);
});


// Like/Unlike Post
app.post('/api/posts/:id/like', authMiddleware, (req, res) => {
    const { id } = req.params;
    const userId = req.user.id;

    // Check if already liked
    const existingLike = db.prepare('SELECT id FROM post_likes WHERE user_id = ? AND post_id = ?').get(userId, id);

    if (existingLike) {
        // Unlike
        db.prepare('DELETE FROM post_likes WHERE user_id = ? AND post_id = ?').run(userId, id);
        db.prepare('UPDATE posts SET likes = MAX(0, likes - 1) WHERE id = ?').run(id);
        res.json({ success: true, liked: false });
    } else {
        // Like
        db.prepare('INSERT INTO post_likes (user_id, post_id) VALUES (?, ?)').run(userId, id);
        db.prepare('UPDATE posts SET likes = likes + 1 WHERE id = ?').run(id);
        res.json({ success: true, liked: true });
    }
});

// Bookmark/Unbookmark Post
app.post('/api/posts/:id/bookmark', authMiddleware, (req, res) => {
    const { id } = req.params;
    const userId = req.user.id;

    const existingBookmark = db.prepare('SELECT id FROM bookmarks WHERE user_id = ? AND post_id = ?').get(userId, id);

    if (existingBookmark) {
        db.prepare('DELETE FROM bookmarks WHERE user_id = ? AND post_id = ?').run(userId, id);
        res.json({ success: true, bookmarked: false });
    } else {
        db.prepare('INSERT INTO bookmarks (user_id, post_id) VALUES (?, ?)').run(userId, id);
        res.json({ success: true, bookmarked: true });
    }
});

// Get User's Bookmarked Posts
app.get('/api/bookmarks', authMiddleware, (req, res) => {
    const userId = req.user.id;

    const posts = db.prepare(`
        SELECT p.* FROM posts p
        JOIN bookmarks b ON p.id = b.post_id
        WHERE b.user_id = ?
        ORDER BY b.created_at DESC
    `).all(userId);

    const formattedPosts = posts.map(p => {
        const isLiked = !!db.prepare('SELECT 1 FROM post_likes WHERE user_id = ? AND post_id = ?').get(userId, p.id);
        return {
            ...p,
            isLiked,
            isBookmarked: true,
            stats: { likes: p.likes, comments: p.comments, reposts: p.reposts, views: p.views }
        };
    });
    res.json(formattedPosts);
});

// Get User's Liked Posts
app.get('/api/profile/likes', (req, res) => {
    const { handle } = req.query;
    const user = db.prepare('SELECT id FROM users WHERE handle = ?').get(handle);
    if (!user) return res.status(404).json({ error: 'User not found' });

    // Optional auth to check isLiked for the viewer
    const authHeader = req.headers.authorization;
    let viewerId = null;
    if (authHeader && authHeader.startsWith('Bearer ')) {
        try {
            const token = authHeader.split(' ')[1];
            const decoded = jwt.verify(token, JWT_SECRET);
            viewerId = decoded.id;
        } catch (e) { }
    }

    const posts = db.prepare(`
        SELECT p.* FROM posts p
        JOIN post_likes l ON p.id = l.post_id
        WHERE l.user_id = ?
        ORDER BY l.created_at DESC
    `).all(user.id);

    const formattedPosts = posts.map(p => {
        let isLiked = false;
        let isBookmarked = false;
        if (viewerId) {
            isLiked = !!db.prepare('SELECT 1 FROM post_likes WHERE user_id = ? AND post_id = ?').get(viewerId, p.id);
            isBookmarked = !!db.prepare('SELECT 1 FROM bookmarks WHERE user_id = ? AND post_id = ?').get(viewerId, p.id);
        }
        return {
            ...p,
            isLiked,
            isBookmarked,
            stats: { likes: p.likes, comments: p.comments, reposts: p.reposts, views: p.views }
        };
    });
    res.json(formattedPosts);
});

// Get User's Replies
app.get('/api/profile/replies', (req, res) => {
    const { handle } = req.query;
    // For now, we define replies as posts where parent_id is NOT NULL
    // In a future phase we will implement the actual reply functionality
    // But we filter by handle to show that user's replies
    const posts = db.prepare('SELECT * FROM posts WHERE handle = ? AND parent_id IS NOT NULL ORDER BY created_at DESC').all(handle);

    // Optional auth (same as above, maybe factor this out later if reused more)
    const authHeader = req.headers.authorization;
    let viewerId = null;
    if (authHeader && authHeader.startsWith('Bearer ')) {
        try {
            const token = authHeader.split(' ')[1];
            const decoded = jwt.verify(token, JWT_SECRET);
            viewerId = decoded.id;
        } catch (e) { }
    }

    res.json(posts.map(p => ({
        ...p,
        isLiked: viewerId ? !!db.prepare('SELECT 1 FROM post_likes WHERE user_id = ? AND post_id = ?').get(viewerId, p.id) : false,
        isBookmarked: viewerId ? !!db.prepare('SELECT 1 FROM bookmarks WHERE user_id = ? AND post_id = ?').get(viewerId, p.id) : false,
        stats: { likes: p.likes, comments: p.comments, reposts: p.reposts, views: p.views }
    })));
});

// (Moved app.listen to the bottom)

// --- Explore & Search API ---

app.get('/api/explore', (req, res) => {
    const { q } = req.query;

    // Optional auth to check isLiked/isBookmarked
    const authHeader = req.headers.authorization;
    let userId = null;
    if (authHeader && authHeader.startsWith('Bearer ')) {
        try {
            const token = authHeader.split(' ')[1];
            const decoded = jwt.verify(token, JWT_SECRET);
            userId = decoded.id;
        } catch (e) { }
    }

    let posts;
    if (q) {
        posts = db.prepare('SELECT * FROM posts WHERE content LIKE ? ORDER BY created_at DESC').all(`%${q}%`);
    } else {
        posts = db.prepare('SELECT * FROM posts ORDER BY created_at DESC LIMIT 20').all();
    }

    const trending = [
        { id: 1, tag: '#ReactJS', count: '0' },
        { id: 2, tag: '#AI', count: '0' },
        { id: 3, tag: '#TSocial', count: '0' },
        { id: 4, tag: '#WebDev', count: '0' },
    ];

    res.json({
        posts: posts.map(p => {
            let isLiked = false;
            let isBookmarked = false;
            if (userId) {
                isLiked = !!db.prepare('SELECT 1 FROM post_likes WHERE user_id = ? AND post_id = ?').get(userId, p.id);
                isBookmarked = !!db.prepare('SELECT 1 FROM bookmarks WHERE user_id = ? AND post_id = ?').get(userId, p.id);
            }
            return {
                ...p,
                isLiked,
                isBookmarked,
                stats: { likes: p.likes, comments: p.comments, reposts: p.reposts, views: p.views }
            };
        }),
        trending
    });
});
// --- Messaging API ---

// Get all conversations list
app.get('/api/messages', authMiddleware, (req, res) => {
    const userId = req.user.id;
    // Find all users I've chatted with
    const conversations = db.prepare(`
        SELECT DISTINCT u.id, u.name, u.handle, u.avatar, u.last_active 
        FROM users u
        JOIN messages m ON (u.id = m.sender_id OR u.id = m.receiver_id)
        WHERE (m.sender_id = ? OR m.receiver_id = ?) AND u.id != ?
    `).all(userId, userId, userId);

    res.json(conversations);
});

// Get chat history with a specific handle
app.get('/api/messages/:handle', authMiddleware, (req, res) => {
    const myId = req.user.id;
    const otherUser = db.prepare('SELECT id FROM users WHERE handle = ?').get(req.params.handle);

    if (!otherUser) return res.status(404).json({ error: 'User not found' });

    const messages = db.prepare(`
        SELECT * FROM messages 
        WHERE (sender_id = ? AND receiver_id = ?) OR (sender_id = ? AND receiver_id = ?)
        ORDER BY created_at ASC
    `).all(myId, otherUser.id, otherUser.id, myId);

    res.json(messages);
});

// Send a message
app.post('/api/messages', authMiddleware, (req, res) => {
    const { receiverHandle, content } = req.body;
    const senderId = req.user.id;
    const receiver = db.prepare('SELECT id FROM users WHERE handle = ?').get(receiverHandle);

    if (!receiver) return res.status(404).json({ error: 'Receiver not found' });

    const info = db.prepare(`
        INSERT INTO messages (sender_id, receiver_id, content)
        VALUES (?, ?, ?)
    `).run(senderId, receiver.id, content);

    const newMessage = db.prepare('SELECT * FROM messages WHERE id = ?').get(info.lastInsertRowid);
    res.status(201).json(newMessage);
});
// --- Admin Endpoints ---

app.get('/api/admin/stats', adminMiddleware, (req, res) => {
    const userCount = db.prepare('SELECT COUNT(*) as count FROM users').get().count;
    const postCount = db.prepare('SELECT COUNT(*) as count FROM posts').get().count;
    const todayPostCount = db.prepare("SELECT COUNT(*) as count FROM posts WHERE created_at >= date('now')").get().count;

    res.json({
        totalUsers: userCount,
        totalPosts: postCount,
        postsToday: todayPostCount
    });
});

app.get('/api/admin/users', adminMiddleware, (req, res) => {
    const users = db.prepare('SELECT id, name, handle, postsCount, is_admin, joinDate, is_suspended, suspension_reason FROM users').all();
    console.log(`[Admin] Fetching user list. Total users found: ${users.length}`);
    res.json(users.map(u => ({ ...u, isAdmin: !!u.is_admin, isSuspended: !!u.is_suspended })));
});

app.delete('/api/admin/users/:id', adminMiddleware, (req, res) => {
    const { id } = req.params;
    const { reason } = req.body;
    console.log(`[Admin] Suspension request for ID: ${id} by Admin: ${req.user.handle}`);

    if (parseInt(id) === req.user.id) {
        return res.status(400).json({ error: 'Kendi hesabınızı askıya alamazsınız.' });
    }

    const user = db.prepare('SELECT handle FROM users WHERE id = ?').get(id);
    if (!user) {
        console.log(`[Admin] Suspension failed: User ID ${id} not found.`);
        return res.status(404).json({ error: 'Kullanıcı bulunamadı.' });
    }

    if (user.handle === 'tsocial') {
        return res.status(400).json({ error: 'Sistem hesabı askıya alınamaz.' });
    }

    const info = db.prepare('UPDATE users SET is_suspended = 1, suspension_reason = ?, suspended_by = ? WHERE id = ?').run(reason || 'Kural ihlali.', req.user.handle, id);
    console.log(`[Admin] User @${user.handle} suspended. Database changes: ${info.changes}`);
    res.json({ success: true, message: 'Hesap askıya alındı.' });
});

app.post('/api/admin/users/:id/unsuspend', adminMiddleware, (req, res) => {
    const { id } = req.params;
    db.prepare('UPDATE users SET is_suspended = 0, suspension_reason = NULL, appeal_status = NULL, appeal_text = NULL WHERE id = ?').run(id);
    res.json({ success: true, message: 'Hesap engeli kaldırıldı.' });
});

app.get('/api/admin/appeals', adminMiddleware, (req, res) => {
    const appeals = db.prepare(`
        SELECT id, name, handle, appeal_status, appeal_text, suspension_reason 
        FROM users 
        WHERE appeal_status = 'pending'
    `).all();
    res.json(appeals);
});

app.post('/api/admin/appeals/:userId/resolve', adminMiddleware, (req, res) => {
    const { userId } = req.params;
    const { action } = req.body; // 'approve' or 'reject'

    const user = db.prepare('SELECT handle FROM users WHERE id = ?').get(userId);
    if (!user) return res.status(404).json({ error: 'Kullanıcı bulunamadı.' });

    if (action === 'approve') {
        db.prepare('UPDATE users SET is_suspended = 0, suspension_reason = NULL, appeal_status = NULL, appeal_text = NULL WHERE id = ?').run(userId);
        res.json({ success: true, message: 'İtiraz onaylandı, hesap erişime açıldı.' });
    } else {
        db.prepare('UPDATE users SET appeal_status = ? WHERE id = ?').run('rejected', userId);
        res.json({ success: true, message: 'İtiraz reddedildi.' });
    }
});

app.put('/api/admin/users/:id/role', adminMiddleware, (req, res) => {
    const { id } = req.params;
    const { isAdmin } = req.body;
    console.log(`[Admin] Toggle role for ID: ${id}, New Admin: ${isAdmin}`);

    const user = db.prepare('SELECT handle FROM users WHERE id = ?').get(id);
    if (!user) {
        console.log(`[Admin] User with ID ${id} not found in database.`);
        return res.status(404).json({ error: 'Kullanıcı bulunamadı.' });
    }

    // Prevent demoting tsocial
    if (user.handle === 'tsocial' && !isAdmin) {
        return res.status(400).json({ error: 'Ana yönetici yetkisi alınamaz.' });
    }

    db.prepare('UPDATE users SET is_admin = ? WHERE id = ?').run(isAdmin ? 1 : 0, id);
    console.log(`[Admin] Role updated successfully for @${user.handle}`);
    res.json({ success: true, isAdmin });
});

app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});
