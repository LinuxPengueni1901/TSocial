import express from 'express';
import cors from 'cors';
import morgan from 'morgan';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { db, execute, initializeDatabase } from './_db.js';
import { fileURLToPath } from 'url';

const app = express();
const PORT = process.env.PORT || 5000;
const JWT_SECRET = process.env.JWT_SECRET || process.env.JWT_SECRET_KEY || 'tsocial-secret-key';

app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(morgan('dev'));

// Ensure DB is initialized
app.use(async (req, res, next) => {
    try {
        if (process.env.TURSO_DATABASE_URL) {
            await initializeDatabase();
        }
        next();
    } catch (error) {
        console.error("Initialization Error:", error);
        next(error);
    }
});

// --- Health Check ---
app.get('/api/health', async (req, res) => {
    try {
        const dbCheck = await execute('SELECT 1').catch(e => ({ error: e.message }));
        res.json({
            status: 'ok',
            database: dbCheck.error ? 'disconnected' : 'connected',
            dbError: dbCheck.error,
            env: {
                hasUrl: !!process.env.TURSO_DATABASE_URL,
                hasToken: !!process.env.TURSO_AUTH_TOKEN,
                hasJwtSecret: !!process.env.JWT_SECRET,
                nodeEnv: process.env.NODE_ENV
            },
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        res.status(500).json({ status: 'error', error: error.message });
    }
});

// --- Bcrypt Compatibility Test ---
app.get('/api/test/bcrypt', async (req, res) => {
    try {
        const hash = await bcrypt.hash('test', 10);
        const match = await bcrypt.compare('test', hash);
        res.json({ status: 'ok', hash: 'generated', match });
    } catch (error) {
        res.status(500).json({ status: 'error', message: 'Bcrypt failed', error: error.message });
    }
});

// --- Middleware ---

const authMiddleware = async (req, res, next) => {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ error: 'Oturum açmanız gerekiyor.' });
    }
    const token = authHeader.split(' ')[1];
    try {
        const decoded = jwt.verify(token, JWT_SECRET);

        // Check if suspended
        const userResult = await execute('SELECT is_suspended FROM users WHERE id = ?', [decoded.id]);
        const user = userResult.rows[0];
        if (user && user.is_suspended) {
            return res.status(403).json({ error: 'Hesabınız askıya alınmıştır.' });
        }

        req.user = decoded; // { id, handle }

        // Update user activity timestamp silently
        await execute('UPDATE users SET last_active = CURRENT_TIMESTAMP WHERE id = ?', [decoded.id]);

        next();
    } catch (error) {
        return res.status(401).json({ error: 'Geçersiz oturum.' });
    }
};

const adminMiddleware = async (req, res, next) => {
    await authMiddleware(req, res, async () => {
        const userResult = await execute('SELECT is_admin FROM users WHERE id = ?', [req.user.id]);
        const user = userResult.rows[0];
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
    console.log(`[Auth] Register attempt for handle: ${handle}`);
    try {
        if (!password) return res.status(400).json({ error: 'Şifre gereklidir.' });
        const hashedPassword = await bcrypt.hash(password, 10);
        const result = await execute(`
            INSERT INTO users (name, handle, password, joinDate, followers, following, postsCount)
            VALUES (?, ?, ?, ?, ?, ?, ?)
        `, [name, handle, hashedPassword, 'Şubat 2026', '0', '0', '0']);

        const token = jwt.sign({ id: Number(result.lastInsertRowid), handle }, JWT_SECRET, { expiresIn: '24h' });
        res.status(201).json({ token, handle, name });
    } catch (error) {
        console.error('Registration error details:', error);

        // Handle specific SQLite constraints
        if (error.code === 'SQLITE_CONSTRAINT' || error.message?.includes('UNIQUE constraint failed')) {
            if (error.message?.includes('users.handle')) {
                return res.status(400).json({ error: 'Bu kullanıcı adı zaten alınmış.' });
            }
            return res.status(400).json({ error: 'Bu bilgilerle zaten bir hesap mevcut.' });
        }

        res.status(500).json({
            error: 'Kayıt sırasında teknik bir hata oluştu.',
            details: error.message,
            code: error.code
        });
    }
});

// Login
app.post('/api/auth/login', async (req, res) => {
    const { handle, password } = req.body;
    try {
        const userResult = await execute('SELECT * FROM users WHERE handle = ?', [handle]);
        const user = userResult.rows[0];
        if (!user || !(await bcrypt.compare(password, user.password))) {
            return res.status(401).json({ error: 'Hatalı kullanıcı adı veya şifre.' });
        }

        if (user.is_suspended) {
            const adminResult = await execute('SELECT name FROM users WHERE handle = ?', [user.suspended_by]);
            const admin = adminResult.rows[0];
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
        const userResult = await execute('SELECT * FROM users WHERE handle = ?', [handle]);
        const user = userResult.rows[0];
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

        await execute('UPDATE users SET appeal_status = ?, appeal_text = ? WHERE id = ?', ['pending', appealText, user.id]);

        res.json({ success: true, message: 'İtirazınız başarıyla alındı. İncelendikten sonra bilgilendirileceksiniz.' });
    } catch (error) {
        console.error('Appeal error details:', error.message);
        console.error(error.stack);
        res.status(500).json({ error: 'İtiraz gönderilirken bir hata oluştu: ' + error.message });
    }
});

// --- API Endpoints ---

// Get User Profile (Dynamic)
app.get('/api/profile', async (req, res) => {
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

    const userResult = await execute('SELECT id, name, handle, bio, location, website, joinDate, avatar, banner, followers, following, postsCount, is_admin, last_active FROM users WHERE handle = ?', [targetHandle]);
    const user = userResult.rows[0];
    if (!user) return res.status(404).json({ error: 'User not found' });
    res.json({
        ...user,
        isAdmin: !!user.is_admin
    });
});

// Update User Profile (Protected)
app.put('/api/profile', authMiddleware, async (req, res) => {
    const { name, bio, location, website } = req.body;
    const handle = req.user.handle;

    await execute('UPDATE users SET name = ?, bio = ?, location = ?, website = ? WHERE handle = ?', [name, bio, location, website, handle]);

    await execute('UPDATE posts SET username = ? WHERE handle = ?', [name, handle]);

    res.json({ success: true });
});

// Get All Posts
app.get('/api/posts', async (req, res) => {
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

    const postsResult = await execute('SELECT * FROM posts ORDER BY created_at DESC');
    const posts = postsResult.rows;

    const formattedPosts = await Promise.all(posts.map(async (p) => {
        let isLiked = false;
        let isBookmarked = false;
        if (userId) {
            const likeResult = await execute('SELECT 1 FROM post_likes WHERE user_id = ? AND post_id = ?', [userId, p.id]);
            isLiked = likeResult.rows.length > 0;
            const bookmarkResult = await execute('SELECT 1 FROM bookmarks WHERE user_id = ? AND post_id = ?', [userId, p.id]);
            isBookmarked = bookmarkResult.rows.length > 0;
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
    }));
    res.json(formattedPosts);
});

// Create Post (Protected)
app.post('/api/posts', authMiddleware, async (req, res) => {
    const { content, image, parent_id } = req.body;
    const handle = req.user.handle;
    const userResult = await execute('SELECT * FROM users WHERE handle = ?', [handle]);
    const user = userResult.rows[0];

    const result = await execute(`
        INSERT INTO posts (user_id, username, handle, avatar, time, content, image, parent_id)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `, [user.id, user.name, user.handle, user.avatar, 'Şimdi', content, image, parent_id || null]);

    // If it's a reply, increment comment count of parent
    if (parent_id) {
        await execute('UPDATE posts SET comments = comments + 1 WHERE id = ?', [parent_id]);
    }

    const newPostResult = await execute('SELECT * FROM posts WHERE id = ?', [Number(result.lastInsertRowid)]);
    const newPost = newPostResult.rows[0];
    res.status(201).json({
        ...newPost,
        stats: { likes: 0, comments: 0, reposts: 0, views: '0' }
    });
});

// Get Replies for a Post
app.get('/api/posts/:id/replies', async (req, res) => {
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

    const repliesResult = await execute('SELECT * FROM posts WHERE parent_id = ? ORDER BY created_at ASC', [id]);
    const replies = repliesResult.rows;

    const formattedReplies = await Promise.all(replies.map(async (p) => {
        let isLiked = false;
        let isBookmarked = false;
        if (userId) {
            const likeResult = await execute('SELECT 1 FROM post_likes WHERE user_id = ? AND post_id = ?', [userId, p.id]);
            isLiked = likeResult.rows.length > 0;
            const bookmarkResult = await execute('SELECT 1 FROM bookmarks WHERE user_id = ? AND post_id = ?', [userId, p.id]);
            isBookmarked = bookmarkResult.rows.length > 0;
        }
        return {
            ...p,
            isLiked,
            isBookmarked,
            stats: { likes: p.likes, comments: p.comments, reposts: p.reposts, views: p.views }
        };
    }));
    res.json(formattedReplies);
});


// Like/Unlike Post
app.post('/api/posts/:id/like', authMiddleware, async (req, res) => {
    const { id } = req.params;
    const userId = req.user.id;

    // Check if already liked
    const existingLikeResult = await execute('SELECT id FROM post_likes WHERE user_id = ? AND post_id = ?', [userId, id]);
    const existingLike = existingLikeResult.rows[0];

    if (existingLike) {
        // Unlike
        await execute('DELETE FROM post_likes WHERE user_id = ? AND post_id = ?', [userId, id]);
        await execute('UPDATE posts SET likes = MAX(0, likes - 1) WHERE id = ?', [id]);
        res.json({ success: true, liked: false });
    } else {
        // Like
        await execute('INSERT INTO post_likes (user_id, post_id) VALUES (?, ?)', [userId, id]);
        await execute('UPDATE posts SET likes = likes + 1 WHERE id = ?', [id]);
        res.json({ success: true, liked: true });
    }
});

// Bookmark/Unbookmark Post
app.post('/api/posts/:id/bookmark', authMiddleware, async (req, res) => {
    const { id } = req.params;
    const userId = req.user.id;

    const existingBookmarkResult = await execute('SELECT id FROM bookmarks WHERE user_id = ? AND post_id = ?', [userId, id]);
    const existingBookmark = existingBookmarkResult.rows[0];

    if (existingBookmark) {
        await execute('DELETE FROM bookmarks WHERE user_id = ? AND post_id = ?', [userId, id]);
        res.json({ success: true, bookmarked: false });
    } else {
        await execute('INSERT INTO bookmarks (user_id, post_id) VALUES (?, ?)', [userId, id]);
        res.json({ success: true, bookmarked: true });
    }
});

// Get User's Bookmarked Posts
app.get('/api/bookmarks', authMiddleware, async (req, res) => {
    const userId = req.user.id;

    const postsResult = await execute(`
        SELECT p.* FROM posts p
        JOIN bookmarks b ON p.id = b.post_id
        WHERE b.user_id = ?
        ORDER BY b.created_at DESC
    `, [userId]);
    const posts = postsResult.rows;

    const formattedPosts = await Promise.all(posts.map(async (p) => {
        const likeResult = await execute('SELECT 1 FROM post_likes WHERE user_id = ? AND post_id = ?', [userId, p.id]);
        return {
            ...p,
            isLiked: likeResult.rows.length > 0,
            isBookmarked: true,
            stats: { likes: p.likes, comments: p.comments, reposts: p.reposts, views: p.views }
        };
    }));
    res.json(formattedPosts);
});

// Get User's Liked Posts
app.get('/api/profile/likes', async (req, res) => {
    const { handle } = req.query;
    const userResult = await execute('SELECT id FROM users WHERE handle = ?', [handle]);
    const user = userResult.rows[0];
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

    const postsResult = await execute(`
        SELECT p.* FROM posts p
        JOIN post_likes l ON p.id = l.post_id
        WHERE l.user_id = ?
        ORDER BY l.created_at DESC
    `, [user.id]);
    const posts = postsResult.rows;

    const formattedPosts = await Promise.all(posts.map(async (p) => {
        let isLiked = false;
        let isBookmarked = false;
        if (viewerId) {
            const likeResult = await execute('SELECT 1 FROM post_likes WHERE user_id = ? AND post_id = ?', [viewerId, p.id]);
            isLiked = likeResult.rows.length > 0;
            const bookmarkResult = await execute('SELECT 1 FROM bookmarks WHERE user_id = ? AND post_id = ?', [viewerId, p.id]);
            isBookmarked = bookmarkResult.rows.length > 0;
        }
        return {
            ...p,
            isLiked,
            isBookmarked,
            stats: { likes: p.likes, comments: p.comments, reposts: p.reposts, views: p.views }
        };
    }));
    res.json(formattedPosts);
});

// Get User's Replies
app.get('/api/profile/replies', async (req, res) => {
    const { handle } = req.query;
    const postsResult = await execute('SELECT * FROM posts WHERE handle = ? AND parent_id IS NOT NULL ORDER BY created_at DESC', [handle]);
    const posts = postsResult.rows;

    const authHeader = req.headers.authorization;
    let viewerId = null;
    if (authHeader && authHeader.startsWith('Bearer ')) {
        try {
            const token = authHeader.split(' ')[1];
            const decoded = jwt.verify(token, JWT_SECRET);
            viewerId = decoded.id;
        } catch (e) { }
    }

    const formattedPosts = await Promise.all(posts.map(async (p) => {
        let isLiked = false;
        let isBookmarked = false;
        if (viewerId) {
            const likeResult = await execute('SELECT 1 FROM post_likes WHERE user_id = ? AND post_id = ?', [viewerId, p.id]);
            isLiked = likeResult.rows.length > 0;
            const bookmarkResult = await execute('SELECT 1 FROM bookmarks WHERE user_id = ? AND post_id = ?', [viewerId, p.id]);
            isBookmarked = bookmarkResult.rows.length > 0;
        }
        return {
            ...p,
            isLiked,
            isBookmarked,
            stats: { likes: p.likes, comments: p.comments, reposts: p.reposts, views: p.views }
        };
    }));
    res.json(formattedPosts);
});

// --- Explore & Search API ---

app.get('/api/explore', async (req, res) => {
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

    let postsResult;
    if (q) {
        postsResult = await execute('SELECT * FROM posts WHERE content LIKE ? ORDER BY created_at DESC', [`%${q}%`]);
    } else {
        postsResult = await execute('SELECT * FROM posts ORDER BY created_at DESC LIMIT 20');
    }
    const posts = postsResult.rows;

    const trending = [
        { id: 1, tag: '#ReactJS', count: '0' },
        { id: 2, tag: '#AI', count: '0' },
        { id: 3, tag: '#TSocial', count: '0' },
        { id: 4, tag: '#WebDev', count: '0' },
    ];

    const formattedPosts = await Promise.all(posts.map(async (p) => {
        let isLiked = false;
        let isBookmarked = false;
        if (userId) {
            const likeResult = await execute('SELECT 1 FROM post_likes WHERE user_id = ? AND post_id = ?', [userId, p.id]);
            isLiked = likeResult.rows.length > 0;
            const bookmarkResult = await execute('SELECT 1 FROM bookmarks WHERE user_id = ? AND post_id = ?', [userId, p.id]);
            isBookmarked = bookmarkResult.rows.length > 0;
        }
        return {
            ...p,
            isLiked,
            isBookmarked,
            stats: { likes: p.likes, comments: p.comments, reposts: p.reposts, views: p.views }
        };
    }));

    res.json({
        posts: formattedPosts,
        trending
    });
});
// --- Messaging API ---

// Get all conversations list
app.get('/api/messages', authMiddleware, async (req, res) => {
    const userId = req.user.id;
    // Find all users I've chatted with
    const conversationsResult = await execute(`
        SELECT DISTINCT u.id, u.name, u.handle, u.avatar, u.last_active 
        FROM users u
        JOIN messages m ON (u.id = m.sender_id OR u.id = m.receiver_id)
        WHERE (m.sender_id = ? OR m.receiver_id = ?) AND u.id != ?
    `, [userId, userId, userId]);

    res.json(conversationsResult.rows);
});

// Get chat history with a specific handle
app.get('/api/messages/:handle', authMiddleware, async (req, res) => {
    const myId = req.user.id;
    const otherUserResult = await execute('SELECT id FROM users WHERE handle = ?', [req.params.handle]);
    const otherUser = otherUserResult.rows[0];

    if (!otherUser) return res.status(404).json({ error: 'User not found' });

    const messagesResult = await execute(`
        SELECT * FROM messages 
        WHERE (sender_id = ? AND receiver_id = ?) OR (sender_id = ? AND receiver_id = ?)
        ORDER BY created_at ASC
    `, [myId, otherUser.id, otherUser.id, myId]);

    res.json(messagesResult.rows);
});

// Send a message
app.post('/api/messages', authMiddleware, async (req, res) => {
    const { receiverHandle, content } = req.body;
    const senderId = req.user.id;
    const receiverResult = await execute('SELECT id FROM users WHERE handle = ?', [receiverHandle]);
    const receiver = receiverResult.rows[0];

    if (!receiver) return res.status(404).json({ error: 'Receiver not found' });

    const result = await execute(`
        INSERT INTO messages (sender_id, receiver_id, content)
        VALUES (?, ?, ?)
    `, [senderId, receiver.id, content]);

    const newMessageResult = await execute('SELECT * FROM messages WHERE id = ?', [Number(result.lastInsertRowid)]);
    res.status(201).json(newMessageResult.rows[0]);
});
// --- Admin Endpoints ---

app.get('/api/admin/stats', adminMiddleware, async (req, res) => {
    const userCountResult = await execute('SELECT COUNT(*) as count FROM users');
    const postCountResult = await execute('SELECT COUNT(*) as count FROM posts');
    const todayPostCountResult = await execute("SELECT COUNT(*) as count FROM posts WHERE created_at >= date('now')");

    res.json({
        totalUsers: userCountResult.rows[0].count,
        totalPosts: postCountResult.rows[0].count,
        postsToday: todayPostCountResult.rows[0].count
    });
});

app.get('/api/admin/users', adminMiddleware, async (req, res) => {
    const usersResult = await execute('SELECT id, name, handle, postsCount, is_admin, joinDate, is_suspended, suspension_reason FROM users');
    const users = usersResult.rows;
    console.log(`[Admin] Fetching user list. Total users found: ${users.length}`);
    res.json(users.map(u => ({ ...u, isAdmin: !!u.is_admin, isSuspended: !!u.is_suspended })));
});

app.delete('/api/admin/users/:id', adminMiddleware, async (req, res) => {
    const { id } = req.params;
    const { reason } = req.body;
    console.log(`[Admin] Suspension request for ID: ${id} by Admin: ${req.user.handle}`);

    if (parseInt(id) === req.user.id) {
        return res.status(400).json({ error: 'Kendi hesabınızı askıya alamazsınız.' });
    }

    const userResult = await execute('SELECT handle FROM users WHERE id = ?', [id]);
    const user = userResult.rows[0];
    if (!user) {
        console.log(`[Admin] Suspension failed: User ID ${id} not found.`);
        return res.status(404).json({ error: 'Kullanıcı bulunamadı.' });
    }

    if (user.handle === 'tsocial') {
        return res.status(400).json({ error: 'Sistem hesabı askıya alınamaz.' });
    }

    const result = await execute('UPDATE users SET is_suspended = 1, suspension_reason = ?, suspended_by = ? WHERE id = ?', [reason || 'Kural ihlali.', req.user.handle, id]);
    console.log(`[Admin] User @${user.handle} suspended. Rows affected: ${result.rowsAffected}`);
    res.json({ success: true, message: 'Hesap askıya alındı.' });
});

app.post('/api/admin/users/:id/unsuspend', adminMiddleware, async (req, res) => {
    const { id } = req.params;
    await execute('UPDATE users SET is_suspended = 0, suspension_reason = NULL, appeal_status = NULL, appeal_text = NULL WHERE id = ?', [id]);
    res.json({ success: true, message: 'Hesap engeli kaldırıldı.' });
});

app.get('/api/admin/appeals', adminMiddleware, async (req, res) => {
    const appealsResult = await execute(`
        SELECT id, name, handle, appeal_status, appeal_text, suspension_reason 
        FROM users 
        WHERE appeal_status = 'pending'
    `);
    res.json(appealsResult.rows);
});

app.post('/api/admin/appeals/:userId/resolve', adminMiddleware, async (req, res) => {
    const { userId } = req.params;
    const { action } = req.body; // 'approve' or 'reject'

    const userResult = await execute('SELECT handle FROM users WHERE id = ?', [userId]);
    const user = userResult.rows[0];
    if (!user) return res.status(404).json({ error: 'Kullanıcı bulunamadı.' });

    if (action === 'approve') {
        await execute('UPDATE users SET is_suspended = 0, suspension_reason = NULL, appeal_status = NULL, appeal_text = NULL WHERE id = ?', [userId]);
        res.json({ success: true, message: 'İtiraz onaylandı, hesap erişime açıldı.' });
    } else {
        await execute('UPDATE users SET appeal_status = ? WHERE id = ?', ['rejected', userId]);
        res.json({ success: true, message: 'İtiraz reddedildi.' });
    }
});

app.put('/api/admin/users/:id/role', adminMiddleware, async (req, res) => {
    const { id } = req.params;
    const { isAdmin } = req.body;
    console.log(`[Admin] Toggle role for ID: ${id}, New Admin: ${isAdmin}`);

    const userResult = await execute('SELECT handle FROM users WHERE id = ?', [id]);
    const user = userResult.rows[0];
    if (!user) {
        console.log(`[Admin] User with ID ${id} not found in database.`);
        return res.status(404).json({ error: 'Kullanıcı bulunamadı.' });
    }

    // Prevent demoting tsocial
    if (user.handle === 'tsocial' && !isAdmin) {
        return res.status(400).json({ error: 'Ana yönetici yetkisi alınamaz.' });
    }

    await execute('UPDATE users SET is_admin = ? WHERE id = ?', [isAdmin ? 1 : 0, id]);
    console.log(`[Admin] Role updated successfully for @${user.handle}`);
    res.json({ success: true, isAdmin });
});

// Export for Vercel / Serverless
export default app;

// Only listen if run directly (local development)
// Only listen if run directly (local development)
const isMain = process.env.NODE_ENV !== 'production' || (process.argv[1] && process.argv[1] === fileURLToPath(import.meta.url));
if (isMain && !process.env.VERCEL) {
    app.listen(PORT, () => {
        console.log(`Server running on http://localhost:${PORT}`);
    });
}

// Global error handler for Vercel
app.use((err, req, res, next) => {
    console.error('SERVER ERROR:', err);
    res.status(500).json({
        error: 'Sunucu tarafında beklenmedik bir hata oluştu.',
        message: err.message,
        stack: process.env.NODE_ENV === 'development' ? err.stack : undefined
    });
});
