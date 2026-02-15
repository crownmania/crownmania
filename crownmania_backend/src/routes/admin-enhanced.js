/**
 * Enhanced admin routes - add after existing routes in admin.js
 */

// ============================================
// PROTECTED: Audit Logs
// ============================================

/**
 * GET /api/admin/audit-logs
 * Query audit logs with filters
 */
router.get('/audit-logs', requireAdmin, async (req, res) => {
    try {
        const { event, userId, from, to, limit = 100 } = req.query;

        let query = db.collection('auditLogs');

        if (event) {
            query = query.where('event', '==', event);
        }

        if (userId) {
            query = query.where('userId', '==', userId);
        }

        if (from) {
            query = query.where('timestamp', '>=', new Date(from));
        }

        if (to) {
            query = query.where('timestamp', '<=', new Date(to));
        }

        query = query.orderBy('timestamp', 'desc').limit(parseInt(limit));

        const snapshot = await query.get();

        const logs = snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data(),
            timestamp: doc.data().timestamp?.toDate().toISOString()
        }));

        res.json({ logs, count: logs.length });
    } catch (error) {
        logger.error('Error fetching audit logs:', error);
        res.status(500).json({ error: 'Failed to fetch audit logs' });
    }
});

// ============================================
// PROTECTED: Content Management
// ============================================

/**
 * GET /api/admin/content
 * List all token-gated content
 */
router.get('/content', requireAdmin, async (req, res) => {
    try {
        const snapshot = await db.collection('content').get();

        const content = snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data(),
            createdAt: doc.data().createdAt?.toDate().toISOString(),
            publishedAt: doc.data().publishedAt?.toDate().toISOString()
        }));

        res.json({ content, count: content.length });
    } catch (error) {
        logger.error('Error fetching content:', error);
        res.status(500).json({ error: 'Failed to fetch content' });
    }
});

/**
 * POST /api/admin/content
 * Create new token-gated content
 */
router.post('/content', requireAdmin, async (req, res) => {
    try {
        const { title, type, url, accessRules, notifyOwners = true } = req.body;

        if (!title || !type || !url) {
            return res.status(400).json({ error: 'Title, type, and URL are required' });
        }

        const contentData = {
            title,
            type, // video, image, audio, link
            url,
            accessRules: accessRules || {},
            notifyOwners,
            createdAt: new Date(),
            publishedAt: new Date(),
            createdBy: req.user?.uid || 'admin'
        };

        const contentRef = await db.collection('content').add(contentData);

        // Log content creation
        await db.collection('auditLogs').add({
            event: 'content_created',
            contentId: contentRef.id,
            adminId: req.user?.uid,
            timestamp: new Date()
        });

        // Trigger notifications if requested
        if (notifyOwners) {
            // Call internal webhook to send notifications
            // This would be handled asynchronously
            logger.info(`Content drop notifications queued for ${contentRef.id}`);
        }

        res.json({
            success: true,
            contentId: contentRef.id,
            content: { id: contentRef.id, ...contentData }
        });
    } catch (error) {
        logger.error('Error creating content:', error);
        res.status(500).json({ error: 'Failed to create content' });
    }
});

/**
 * DELETE /api/admin/content/:id
 * Delete token-gated content
 */
router.delete('/content/:id', requireAdmin, async (req, res) => {
    try {
        const { id } = req.params;

        await db.collection('content').doc(id).delete();

        // Log deletion
        await db.collection('auditLogs').add({
            event: 'content_deleted',
            contentId: id,
            adminId: req.user?.uid,
            timestamp: new Date()
        });

        res.json({ success: true, message: 'Content deleted successfully' });
    } catch (error) {
        logger.error('Error deleting content:', error);
        res.status(500).json({ error: 'Failed to delete content' });
    }
});

// ============================================
// PROTECTED: User Management
// ============================================

/**
 * GET /api/admin/users
 * List all users with pagination
 */
router.get('/users', requireAdmin, async (req, res) => {
    try {
        const { limit = 50, startAfter } = req.query;

        let query = db.collection('users').limit(parseInt(limit));

        if (startAfter) {
            const lastDoc = await db.collection('users').doc(startAfter).get();
            query = query.startAfter(lastDoc);
        }

        const snapshot = await query.get();

        const users = snapshot.docs.map(doc => {
            const data = doc.data();
            return {
                id: doc.id,
                walletAddress: data.walletAddress,
                name: data.name,
                email: data.emailPlain, // Masked version
                phone: data.phonePlain,
                profileComplete: data.profileComplete,
                role: data.role,
                createdAt: data.createdAt?.toDate().toISOString()
            };
        });

        res.json({ users, count: users.length });
    } catch (error) {
        logger.error('Error fetching users:', error);
        res.status(500).json({ error: 'Failed to fetch users' });
    }
});

/**
 * GET /api/admin/users/:walletAddress/collectibles
 * Get all collectibles owned by a user
 */
router.get('/users/:walletAddress/collectibles', requireAdmin, async (req, res) => {
    try {
        const { walletAddress } = req.params;

        const snapshot = await db.collection('collectibles')
            .where('ownerId', '==', walletAddress.toLowerCase())
            .get();

        const collectibles = snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data(),
            claimedAt: doc.data().createdAt?.toDate().toISOString()
        }));

        res.json({ collectibles, count: collectibles.length });
    } catch (error) {
        logger.error('Error fetching user collectibles:', error);
        res.status(500).json({ error: 'Failed to fetch collectibles' });
    }
});

/**
 * PATCH /api/admin/users/:walletAddress/role
 * Update user role (promote to admin)
 */
router.patch('/users/:walletAddress/role', requireAdmin, async (req, res) => {
    try {
        const { walletAddress } = req.params;
        const { role } = req.body;

        if (!role || !['user', 'admin'].includes(role)) {
            return res.status(400).json({ error: 'Invalid role. Must be "user" or "admin"' });
        }

        const userSnapshot = await db.collection('users')
            .where('walletAddress', '==', walletAddress.toLowerCase())
            .limit(1)
            .get();

        if (userSnapshot.empty) {
            return res.status(404).json({ error: 'User not found' });
        }

        const userDoc = userSnapshot.docs[0];
        await db.collection('users').doc(userDoc.id).update({
            role,
            updatedAt: new Date()
        });

        // Log role change
        await db.collection('auditLogs').add({
            event: 'user_role_updated',
            targetUser: walletAddress,
            newRole: role,
            adminId: req.user?.uid,
            timestamp: new Date()
        });

        logger.info(`User ${walletAddress} role updated to ${role} by admin`);

        res.json({ success: true, message: `User role updated to ${role}` });
    } catch (error) {
        logger.error('Error updating user role:', error);
        res.status(500).json({ error: 'Failed to update user role' });
    }
});

// Add these routes to the existing admin.js file before the export statement
