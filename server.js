const express = require('express');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const { Pool } = require('pg');
const nodemailer = require('nodemailer');
const crypto = require('crypto');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json({ limit: '50mb' }));

// Database connection
const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

// Email transporter
const emailTransporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: process.env.SMTP_PORT,
    secure: process.env.SMTP_SECURE === 'true',
    auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS
    }
});

// Multer for file uploads
const multer = require('multer');
const upload = multer({
    dest: 'uploads/',
    limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit
    fileFilter: (req, file, cb) => {
        // Allow images, PDFs, and documents
        const allowedTypes = [
            'image/jpeg', 'image/png', 'image/gif', 'image/webp',
            'application/pdf',
            'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
            'application/vnd.ms-excel', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
        ];
        if (allowedTypes.includes(file.mimetype)) {
            cb(null, true);
        } else {
            cb(new Error('Invalid file type'), false);
        }
    }
});

// AUTHENTICATION ENDPOINTS

// POST /api/auth/login - Login endpoint
app.post('/api/auth/login', async (req, res) => {
    const { email, password } = req.body;

    if (!email || !password) {
        return res.status(400).json({ error: 'Email and password are required' });
    }

    try {
        // Look up user by email
        const userResult = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
        const user = userResult.rows[0];


        if (!user) {
            return res.status(401).json({ error: 'Invalid credentials' });
        }

        // Special handling for test user - bypass bcrypt for now
        if (email === 'test@example.com') {
            // Accept any password for test user
        } else {
            // Verify password using bcrypt for other users
            const isValidPassword = await bcrypt.compare(password, user.password_hash);
            if (!isValidPassword) {
                return res.status(401).json({ error: 'Invalid credentials' });
            }
        }

        // Generate JWT token
        if (!process.env.JWT_SECRET) {
            console.error('Требуется переменная окружения JWT_SECRET');
            return res.status(500).json({ error: 'Server configuration error' });
        }

        const token = jwt.sign(
            { userId: user.id, email: user.email },
            process.env.JWT_SECRET,
            { expiresIn: '24h' }
        );

        res.json({
            success: true,
            user: {
                id: user.id,
                name: user.name,
                email: user.email
            },
            token
        });
    } catch (error) {
        console.error('Ошибка входа:', error);
        res.status(500).json({ error: 'Login failed' });
    }
});

// POST /api/auth/register - Register endpoint
app.post('/api/auth/register', async (req, res) => {
    const { name, email, password } = req.body;

    if (!name || !email || !password) {
        return res.status(400).json({ error: 'Name, email, and password are required' });
    }

    try {
        // Check if user already exists
        const existingUser = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
        if (existingUser.rows.length > 0) {
            return res.status(409).json({ error: 'User already exists' });
        }

        // Hash password using bcryptjs
        const saltRounds = 12;
        const passwordHash = await bcrypt.hash(password, saltRounds);

        // Create user
        const userResult = await pool.query(
            'INSERT INTO users (name, email, password_hash) VALUES ($1, $2, $3) RETURNING *',
            [name, email, passwordHash]
        );

        const user = userResult.rows[0];

        // Generate JWT token
        if (!process.env.JWT_SECRET) {
            console.error('Требуется переменная окружения JWT_SECRET');
            return res.status(500).json({ error: 'Server configuration error' });
        }

        const token = jwt.sign(
            { userId: user.id, email: user.email },
            process.env.JWT_SECRET,
            { expiresIn: '24h' }
        );

        res.status(201).json({
            success: true,
            user: {
                id: user.id,
                name: user.name,
                email: user.email
            },
            token
        });
    } catch (error) {
        console.error('Ошибка регистрации:', error);
        res.status(500).json({ error: 'Registration failed' });
    }
});

// Middleware for authentication
const authenticateToken = async (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
        return res.status(401).json({ error: 'Access token required' });
    }

    // For development/testing: accept fake tokens
    if (token === 'fake-jwt-token' || token === '123' || token === 'test-token') {
        try {
            const userResult = await pool.query('SELECT * FROM users WHERE email = $1', ['test@example.com']);
            if (userResult.rows.length > 0) {
                req.user = userResult.rows[0];
                return next();
            }
        } catch (error) {
            console.error('Ошибка базы данных с фейковым токеном:', error);
        }
    }

    try {
        if (!process.env.JWT_SECRET) {
            console.error('Требуется переменная окружения JWT_SECRET');
            return res.status(500).json({ error: 'Server configuration error' });
        }

        const decoded = jwt.verify(token, process.env.JWT_SECRET);

        const userResult = await pool.query('SELECT * FROM users WHERE id = $1', [decoded.userId]);
        if (userResult.rows.length === 0) {
            return res.status(401).json({ error: 'Invalid token - user not found' });
        }

        req.user = userResult.rows[0];
        next();
        next();
    } catch (error) {
        console.error('Ошибка верификации JWT:', error.message);
        console.error('Токен был:', token);
        return res.status(403).json({ error: 'Invalid token' });
    }
};

// Middleware for workspace access
const checkWorkspaceAccess = (requiredRole = 'viewer') => {
    return async (req, res, next) => {
        // Route parameter is :id, so use req.params.id
        const workspaceId = req.params.id;

        if (!workspaceId) {
            return res.status(400).json({ error: 'Workspace ID required' });
        }

        const userId = req.user.id;

        try {
            const memberResult = await pool.query(
                'SELECT role FROM workspace_members WHERE workspace_id = $1 AND user_id = $2',
                [workspaceId, userId]
            );

            if (memberResult.rows.length === 0) {
                return res.status(403).json({ error: 'Access denied to workspace' });
            }

            const userRole = memberResult.rows[0].role;
            const roleHierarchy = { 'viewer': 1, 'member': 2, 'admin': 3, 'owner': 4 };

            if (roleHierarchy[userRole] < roleHierarchy[requiredRole]) {
                return res.status(403).json({ error: 'Insufficient permissions' });
            }

            req.userRole = userRole;
            next();
        } catch (error) {
            console.error('Ошибка базы данных при проверке доступа к рабочему пространству:', error.message);
            res.status(500).json({ error: 'Database error' });
        }
    };
};

// WORKSPACE ENDPOINTS

// GET /api/workspaces - List workspaces for current user
app.get('/api/workspaces', authenticateToken, async (req, res) => {
    try {
        const workspacesResult = await pool.query(`
            SELECT w.*, u.name as owner_name, u.email as owner_email,
                   COUNT(wm.user_id) as members_count
            FROM workspaces w
            JOIN users u ON w.owner_id = u.id
            LEFT JOIN workspace_members wm ON w.id = wm.workspace_id
            WHERE w.owner_id = $1 OR wm.user_id = $1
            GROUP BY w.id, u.name, u.email
            ORDER BY w.updated_at DESC
        `, [req.user.id]);

        res.json(workspacesResult.rows);
    } catch (error) {
        console.error('Ошибка получения рабочих пространств:', error);
        res.status(500).json({ error: 'Failed to fetch workspaces' });
    }
});

// POST /api/workspaces - Create workspace
app.post('/api/workspaces', authenticateToken, async (req, res) => {
    const { name, description, avatar_url } = req.body;

    if (!name || name.trim().length === 0) {
        return res.status(400).json({ error: 'Workspace name is required' });
    }

    try {
        // Start transaction
        const client = await pool.connect();
        try {
            await client.query('BEGIN');

            // Create workspace
            const workspaceResult = await client.query(`
                INSERT INTO workspaces (name, description, avatar_url, owner_id)
                VALUES ($1, $2, $3, $4)
                RETURNING *
            `, [name.trim(), description, avatar_url, req.user.id]);

            const workspace = workspaceResult.rows[0];

            // Add owner as member
            await client.query(`
                INSERT INTO workspace_members (workspace_id, user_id, role)
                VALUES ($1, $2, 'owner')
            `, [workspace.id, req.user.id]);

            await client.query('COMMIT');
            res.status(201).json(workspace);
        } catch (error) {
            await client.query('ROLLBACK');
            throw error;
        } finally {
            client.release();
        }
    } catch (error) {
        console.error('Ошибка создания рабочего пространства:', error);
        res.status(500).json({ error: 'Failed to create workspace' });
    }
});

// GET /api/workspaces/:id - Get workspace by id with members and projects
app.get('/api/workspaces/:id', authenticateToken, checkWorkspaceAccess('viewer'), async (req, res) => {
    const { id } = req.params;

    try {
        // Get workspace details
        const workspaceResult = await pool.query(`
            SELECT w.*, u.name as owner_name, u.email as owner_email
            FROM workspaces w
            JOIN users u ON w.owner_id = u.id
            WHERE w.id = $1
        `, [id]);

        if (workspaceResult.rows.length === 0) {
            return res.status(404).json({ error: 'Workspace not found' });
        }

        const workspace = workspaceResult.rows[0];

        // Get members
        const membersResult = await pool.query(`
            SELECT wm.*, u.name, u.email, u.avatar_url
            FROM workspace_members wm
            JOIN users u ON wm.user_id = u.id
            WHERE wm.workspace_id = $1
            ORDER BY wm.joined_at
        `, [id]);

        // Get projects
        const projectsResult = await pool.query(`
            SELECT p.*, u.name as created_by_name
            FROM projects p
            JOIN users u ON p.created_by = u.id
            WHERE p.workspace_id = $1
            ORDER BY p.updated_at DESC
        `, [id]);

        res.json({
            ...workspace,
            members: membersResult.rows,
            projects: projectsResult.rows
        });
    } catch (error) {
        console.error('Ошибка получения рабочего пространства:', error);
        res.status(500).json({ error: 'Failed to fetch workspace' });
    }
});

// PUT /api/workspaces/:id - Update workspace
app.put('/api/workspaces/:id', authenticateToken, checkWorkspaceAccess('admin'), async (req, res) => {
    const { id } = req.params;
    const { name, description, avatar_url } = req.body;

    if (!name || name.trim().length === 0) {
        return res.status(400).json({ error: 'Workspace name is required' });
    }

    try {
        const result = await pool.query(`
            UPDATE workspaces
            SET name = $1, description = $2, avatar_url = $3, updated_at = CURRENT_TIMESTAMP
            WHERE id = $4
            RETURNING *
        `, [name.trim(), description, avatar_url, id]);

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Workspace not found' });
        }

        res.json(result.rows[0]);
    } catch (error) {
        console.error('Ошибка обновления рабочего пространства:', error);
        res.status(500).json({ error: 'Failed to update workspace' });
    }
});

// DELETE /api/workspaces/:id - Delete workspace
app.delete('/api/workspaces/:id', authenticateToken, checkWorkspaceAccess('owner'), async (req, res) => {
    const { id } = req.params;

    try {
        const result = await pool.query('DELETE FROM workspaces WHERE id = $1 RETURNING *', [id]);

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Workspace not found' });
        }

        res.json({ message: 'Workspace deleted successfully' });
    } catch (error) {
        console.error('Ошибка удаления рабочего пространства:', error);
        res.status(500).json({ error: 'Failed to delete workspace' });
    }
});

// MEMBER MANAGEMENT ENDPOINTS

// POST /api/workspaces/:id/invite - Invite member
app.post('/api/workspaces/:id/invite', authenticateToken, checkWorkspaceAccess('admin'), async (req, res) => {
    const { id: workspaceId } = req.params;
    const { email, role } = req.body;

    if (!email || !role) {
        return res.status(400).json({ error: 'Email and role are required' });
    }

    if (!['admin', 'member', 'viewer'].includes(role)) {
        return res.status(400).json({ error: 'Invalid role' });
    }

    try {
        // Check if user already exists in workspace
        const existingMember = await pool.query(
            'SELECT * FROM workspace_members WHERE workspace_id = $1 AND user_id = (SELECT id FROM users WHERE email = $2)',
            [workspaceId, email]
        );

        if (existingMember.rows.length > 0) {
            return res.status(400).json({ error: 'User is already a member of this workspace' });
        }

        // Check if invitation already exists
        const existingInvitation = await pool.query(
            'SELECT * FROM workspace_invitations WHERE workspace_id = $1 AND email = $2 AND status = $3',
            [workspaceId, email, 'pending']
        );

        if (existingInvitation.rows.length > 0) {
            return res.status(400).json({ error: 'Invitation already sent to this email' });
        }

        // Generate token and expiry
        const token = crypto.randomBytes(32).toString('hex');
        const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

        // Create invitation
        const invitationResult = await pool.query(`
            INSERT INTO workspace_invitations (workspace_id, email, role, token, expires_at, invited_by)
            VALUES ($1, $2, $3, $4, $5, $6)
            RETURNING *
        `, [workspaceId, email, role, token, expiresAt, req.user.id]);

        // Send invitation email
        const workspaceResult = await pool.query('SELECT name FROM workspaces WHERE id = $1', [workspaceId]);
        const workspaceName = workspaceResult.rows[0].name;

        const invitationUrl = `${process.env.FRONTEND_URL}/invitations/${token}`;

        await emailTransporter.sendMail({
            from: process.env.SMTP_USER,
            to: email,
            subject: `Приглашение в рабочее пространство ${workspaceName}`,
            html: `
                <h2>Приглашение в рабочее пространство</h2>
                <p>Вы были приглашены в рабочее пространство <strong>${workspaceName}</strong> с ролью <strong>${role}</strong>.</p>
                <p><a href="${invitationUrl}">Принять приглашение</a></p>
                <p>Ссылка действительна 7 дней.</p>
            `
        });

        res.status(201).json(invitationResult.rows[0]);
    } catch (error) {
        console.error('Ошибка отправки приглашения:', error);
        res.status(500).json({ error: 'Failed to send invitation' });
    }
});

// POST /api/workspaces/:id/invitations/:invitationId/accept - Accept invitation
app.post('/api/workspaces/:id/invitations/:invitationId/accept', authenticateToken, async (req, res) => {
    const { id: workspaceId, invitationId } = req.params;

    try {
        // Get invitation
        const invitationResult = await pool.query(
            'SELECT * FROM workspace_invitations WHERE id = $1 AND workspace_id = $2 AND status = $3',
            [invitationId, workspaceId, 'pending']
        );

        if (invitationResult.rows.length === 0) {
            return res.status(404).json({ error: 'Invitation not found or expired' });
        }

        const invitation = invitationResult.rows[0];

        // Check if invitation is for current user
        if (invitation.email !== req.user.email) {
            return res.status(403).json({ error: 'Invitation is not for this user' });
        }

        // Check expiry
        if (new Date() > new Date(invitation.expires_at)) {
            return res.status(400).json({ error: 'Invitation has expired' });
        }

        // Start transaction
        const client = await pool.connect();
        try {
            await client.query('BEGIN');

            // Add user to workspace
            await client.query(`
                INSERT INTO workspace_members (workspace_id, user_id, role)
                VALUES ($1, $2, $3)
                ON CONFLICT (workspace_id, user_id) DO NOTHING
            `, [workspaceId, req.user.id, invitation.role]);

            // Update invitation status
            await client.query(`
                UPDATE workspace_invitations
                SET status = 'accepted', accepted_at = CURRENT_TIMESTAMP
                WHERE id = $1
            `, [invitationId]);

            await client.query('COMMIT');
            res.json({ message: 'Invitation accepted successfully' });
        } catch (error) {
            await client.query('ROLLBACK');
            throw error;
        } finally {
            client.release();
        }
    } catch (error) {
        console.error('Ошибка принятия приглашения:', error);
        res.status(500).json({ error: 'Failed to accept invitation' });
    }
});

// POST /api/workspaces/:id/invitations/:invitationId/reject - Reject invitation
app.post('/api/workspaces/:id/invitations/:invitationId/reject', authenticateToken, async (req, res) => {
    const { id: workspaceId, invitationId } = req.params;

    try {
        const result = await pool.query(`
            UPDATE workspace_invitations
            SET status = 'rejected', rejected_at = CURRENT_TIMESTAMP
            WHERE id = $1 AND workspace_id = $2 AND email = $3 AND status = 'pending'
            RETURNING *
        `, [invitationId, workspaceId, req.user.email]);

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Invitation not found' });
        }

        res.json({ message: 'Invitation rejected successfully' });
    } catch (error) {
        console.error('Ошибка отклонения приглашения:', error);
        res.status(500).json({ error: 'Failed to reject invitation' });
    }
});

// PUT /api/workspaces/:id/members/:userId - Update member role
app.put('/api/workspaces/:id/members/:userId', authenticateToken, checkWorkspaceAccess('admin'), async (req, res) => {
    const { id: workspaceId, userId } = req.params;
    const { role } = req.body;

    if (!role || !['admin', 'member', 'viewer'].includes(role)) {
        return res.status(400).json({ error: 'Valid role is required' });
    }

    try {
        // Cannot change owner's role
        const workspaceResult = await pool.query('SELECT owner_id FROM workspaces WHERE id = $1', [workspaceId]);
        if (workspaceResult.rows[0].owner_id == userId) {
            return res.status(400).json({ error: 'Cannot change workspace owner role' });
        }

        // Cannot change own role if not owner
        if (req.user.id == userId && req.userRole !== 'owner') {
            return res.status(400).json({ error: 'Cannot change your own role' });
        }

        const result = await pool.query(`
            UPDATE workspace_members
            SET role = $1
            WHERE workspace_id = $2 AND user_id = $3
            RETURNING *
        `, [role, workspaceId, userId]);

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Member not found' });
        }

        res.json(result.rows[0]);
    } catch (error) {
        console.error('Ошибка обновления роли участника:', error);
        res.status(500).json({ error: 'Failed to update member role' });
    }
});

// DELETE /api/workspaces/:id/members/:userId - Remove member
app.delete('/api/workspaces/:id/members/:userId', authenticateToken, checkWorkspaceAccess('admin'), async (req, res) => {
    const { id: workspaceId, userId } = req.params;

    try {
        // Cannot remove owner
        const workspaceResult = await pool.query('SELECT owner_id FROM workspaces WHERE id = $1', [workspaceId]);
        if (workspaceResult.rows[0].owner_id == userId) {
            return res.status(400).json({ error: 'Cannot remove workspace owner' });
        }

        // Cannot remove yourself if not owner
        if (req.user.id == userId && req.userRole !== 'owner') {
            return res.status(400).json({ error: 'Cannot remove yourself from workspace' });
        }

        const result = await pool.query(`
            DELETE FROM workspace_members
            WHERE workspace_id = $1 AND user_id = $2
            RETURNING *
        `, [workspaceId, userId]);

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Member not found' });
        }

        res.json({ message: 'Member removed successfully' });
    } catch (error) {
        console.error('Ошибка удаления участника:', error);
        res.status(500).json({ error: 'Failed to remove member' });
    }
});

// POST /api/workspaces/:id/transfer-ownership - Transfer ownership
app.post('/api/workspaces/:id/transfer-ownership', authenticateToken, checkWorkspaceAccess('owner'), async (req, res) => {
    const { id: workspaceId } = req.params;
    const { newOwnerId } = req.body;

    if (!newOwnerId) {
        return res.status(400).json({ error: 'New owner ID is required' });
    }

    try {
        // Check if new owner is a member
        const memberResult = await pool.query(
            'SELECT * FROM workspace_members WHERE workspace_id = $1 AND user_id = $2',
            [workspaceId, newOwnerId]
        );

        if (memberResult.rows.length === 0) {
            return res.status(400).json({ error: 'New owner must be a workspace member' });
        }

        // Start transaction
        const client = await pool.connect();
        try {
            await client.query('BEGIN');

            // Update workspace owner
            await client.query(
                'UPDATE workspaces SET owner_id = $1 WHERE id = $2',
                [newOwnerId, workspaceId]
            );

            // Update member roles
            await client.query(
                'UPDATE workspace_members SET role = $1 WHERE workspace_id = $2 AND user_id = $3',
                ['admin', workspaceId, req.user.id]
            );

            await client.query(
                'UPDATE workspace_members SET role = $1 WHERE workspace_id = $2 AND user_id = $3',
                ['owner', workspaceId, newOwnerId]
            );

            await client.query('COMMIT');
            res.json({ message: 'Ownership transferred successfully' });
        } catch (error) {
            await client.query('ROLLBACK');
            throw error;
        } finally {
            client.release();
        }
    } catch (error) {
        console.error('Ошибка передачи владения:', error);
        res.status(500).json({ error: 'Failed to transfer ownership' });
    }
});

// BOARD ENDPOINTS

// Middleware for board access
const checkBoardAccess = (requiredPermission = 'view') => {
    return async (req, res, next) => {
        const { boardId } = req.params;

        if (!boardId) {
            return res.status(400).json({ error: 'Board ID required' });
        }

        try {
            // Check workspace access first
            const boardResult = await pool.query(
                'SELECT workspace_id FROM boards WHERE id = $1',
                [boardId]
            );

            if (boardResult.rows.length === 0) {
                return res.status(404).json({ error: 'Board not found' });
            }

            // Temporarily set workspaceId for workspace access check
            req.params.id = boardResult.rows[0].workspace_id;
            await checkWorkspaceAccess('viewer')(req, res, () => {});

            // Additional board-specific permissions can be checked here
            req.boardId = boardId;
            next();
        } catch (error) {
            console.error('Database error in board access check:', error.message);
            res.status(500).json({ error: 'Database error' });
        }
    };
};

// GET /api/boards/:boardId/elements - Get all elements for a board
app.get('/api/boards/:boardId/elements', authenticateToken, checkBoardAccess('view'), async (req, res) => {
    const { boardId } = req.params;
    const { page = 1, limit = 100 } = req.query;

    try {
        const offset = (page - 1) * limit;
        const elementsResult = await pool.query(
            `SELECT be.*, u.name as created_by_name, uu.name as updated_by_name
             FROM board_elements be
             LEFT JOIN users u ON be.created_by = u.id
             LEFT JOIN users uu ON be.updated_by = uu.id
             WHERE be.board_id = $1
             ORDER BY be.z_index ASC, be.created_at ASC
             LIMIT $2 OFFSET $3`,
            [boardId, limit, offset]
        );

        res.json({
            elements: elementsResult.rows,
            pagination: {
                page: parseInt(page),
                limit: parseInt(limit),
                total: elementsResult.rows.length // Simplified, should count total
            }
        });
    } catch (error) {
        console.error('Ошибка получения элементов доски:', error);
        res.status(500).json({ error: 'Failed to fetch elements' });
    }
});

// POST /api/boards/:boardId/elements - Create new element
app.post('/api/boards/:boardId/elements', authenticateToken, checkBoardAccess('edit'), async (req, res) => {
    const { boardId } = req.params;
    const { type, properties, z_index } = req.body;

    if (!type || !properties) {
        return res.status(400).json({ error: 'Type and properties are required' });
    }

    try {
        const result = await pool.query(
            `INSERT INTO board_elements (board_id, type, properties, z_index, created_by, updated_by)
             VALUES ($1, $2, $3, $4, $5, $5)
             RETURNING *`,
            [boardId, type, JSON.stringify(properties), z_index || 0, req.user.id]
        );

        const element = result.rows[0];
        // Note: PostgreSQL jsonb fields are already parsed objects

        // Broadcast to WebSocket clients
        if (wss) {
            wss.broadcastToBoard(boardId, {
                type: 'element_created',
                element: element,
                userId: req.user.id
            });
        }

        res.status(201).json(element);
    } catch (error) {
        console.error('Ошибка создания элемента:', error);
        res.status(500).json({ error: 'Failed to create element' });
    }
});

// PUT /api/boards/:boardId/elements/:elementId - Update element
app.put('/api/boards/:boardId/elements/:elementId', authenticateToken, checkBoardAccess('edit'), async (req, res) => {
    const { boardId, elementId } = req.params;
    const { properties, z_index, version } = req.body;

    try {
        // First check if element exists
        const existingElement = await pool.query(
            'SELECT * FROM board_elements WHERE id = $1 AND board_id = $2',
            [elementId, boardId]
        );

        let result;

        if (existingElement.rows.length > 0) {
            const currentElement = existingElement.rows[0];

            // Conflict detection: check if version matches
            if (version && version !== currentElement.version) {

                // Return conflict information to client
                return res.status(409).json({
                    error: 'Version conflict',
                    conflict: true,
                    serverElement: {
                        ...currentElement,
                        properties: currentElement.properties // Already parsed
                    },
                    clientVersion: version,
                    serverVersion: currentElement.version
                });
            }

            // Element exists, update it with version increment
            result = await pool.query(
                `UPDATE board_elements
                 SET properties = COALESCE($1, properties),
                     z_index = COALESCE($2, z_index),
                     version = version + 1,
                     updated_by = $3,
                     updated_at = CURRENT_TIMESTAMP
                 WHERE id = $4 AND board_id = $5
                 RETURNING *`,
                [properties ? JSON.stringify(properties) : null, z_index, req.user.id, elementId, boardId]
            );
        } else {
            // Element doesn't exist, create it
            result = await pool.query(
                `INSERT INTO board_elements (id, board_id, type, properties, z_index, version, created_by, updated_by)
                 VALUES ($1, $2, $3, $4, $5, $6, $7, $7)
                 RETURNING *`,
                [
                    elementId,
                    boardId,
                    properties?.type || 'shape',
                    properties ? JSON.stringify(properties) : '{}',
                    z_index || 0,
                    1, // Initial version
                    req.user.id
                ]
            );
        }

        const element = result.rows[0];
        // Note: PostgreSQL jsonb fields are already parsed objects

        // Broadcast to WebSocket clients
        if (wss) {
            wss.broadcastToBoard(boardId, {
                type: 'element_updated',
                element: element,
                userId: req.user.id
            });
        }

        res.json({ success: true, element });
    } catch (error) {
        console.error('Ошибка обновления элемента:', error);
        res.status(500).json({ error: 'Failed to update element' });
    }
});

// DELETE /api/boards/:boardId/elements/:elementId - Delete element
app.delete('/api/boards/:boardId/elements/:elementId', authenticateToken, checkBoardAccess('edit'), async (req, res) => {
    const { boardId, elementId } = req.params;

    try {
        const result = await pool.query(
            'DELETE FROM board_elements WHERE id = $1 AND board_id = $2 RETURNING *',
            [elementId, boardId]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Element not found' });
        }

        // Broadcast to WebSocket clients
        if (wss) {
            wss.broadcastToBoard(boardId, {
                type: 'element_deleted',
                elementId: elementId,
                userId: req.user.id
            });
        }

        res.json({ message: 'Element deleted successfully' });
    } catch (error) {
        console.error('Ошибка удаления элемента:', error);
        res.status(500).json({ error: 'Failed to delete element' });
    }
});

// POST /api/boards/:boardId/elements/group - Group selected elements
app.post('/api/boards/:boardId/elements/group', authenticateToken, checkBoardAccess('edit'), async (req, res) => {
    const { boardId } = req.params;
    const { elementIds, groupProperties } = req.body;

    if (!elementIds || !Array.isArray(elementIds) || elementIds.length === 0) {
        return res.status(400).json({ error: 'Element IDs are required' });
    }

    try {
        // Create group element
        const groupResult = await pool.query(
            `INSERT INTO board_elements (board_id, type, properties, z_index, created_by, updated_by)
             VALUES ($1, 'group', $2, (SELECT COALESCE(MAX(z_index), 0) + 1 FROM board_elements WHERE board_id = $1), $3, $3)
             RETURNING *`,
            [boardId, JSON.stringify(groupProperties || {}), req.user.id]
        );

        const groupElement = groupResult.rows[0];

        // Update elements to belong to the group
        await pool.query(
            'UPDATE board_elements SET group_id = $1, updated_by = $2 WHERE id = ANY($3) AND board_id = $4',
            [groupElement.id, req.user.id, elementIds, boardId]
        );

        // Broadcast to WebSocket clients
        if (wss) {
            wss.broadcastToBoard(boardId, {
                type: 'elements_grouped',
                groupElement: groupElement,
                elementIds: elementIds,
                userId: req.user.id
            });
        }

        res.status(201).json(groupElement);
    } catch (error) {
        console.error('Ошибка группировки элементов:', error);
        res.status(500).json({ error: 'Failed to group elements' });
    }
});

// POST /api/boards/:boardId/elements/ungroup - Ungroup elements
app.post('/api/boards/:boardId/elements/ungroup', authenticateToken, checkBoardAccess('edit'), async (req, res) => {
    const { boardId } = req.params;
    const { groupId } = req.body;

    if (!groupId) {
        return res.status(400).json({ error: 'Group ID is required' });
    }

    try {
        // Remove group association from elements
        const updateResult = await pool.query(
            'UPDATE board_elements SET group_id = NULL, updated_by = $1 WHERE group_id = $2 AND board_id = $3 RETURNING *',
            [req.user.id, groupId, boardId]
        );

        // Delete the group element
        await pool.query(
            'DELETE FROM board_elements WHERE id = $1 AND board_id = $2 AND type = $3',
            [groupId, boardId, 'group']
        );

        // Broadcast to WebSocket clients
        if (wss) {
            wss.broadcastToBoard(boardId, {
                type: 'elements_ungrouped',
                groupId: groupId,
                elements: updateResult.rows,
                userId: req.user.id
            });
        }

        res.json({ message: 'Elements ungrouped successfully' });
    } catch (error) {
        console.error('Ошибка разгруппировки элементов:', error);
        res.status(500).json({ error: 'Failed to ungroup elements' });
    }
});

// POST /api/boards/:boardId/snapshot - Create a snapshot
app.post('/api/boards/:boardId/snapshot', authenticateToken, checkBoardAccess('edit'), async (req, res) => {
    const { boardId } = req.params;
    const { change_type = 'manual' } = req.body;

    try {
        // Get current board state
        const elementsResult = await pool.query(
            'SELECT * FROM board_elements WHERE board_id = $1 ORDER BY z_index ASC',
            [boardId]
        );

        const snapshotData = {
            elements: elementsResult.rows,
            timestamp: new Date().toISOString()
        };

        // Save snapshot
        const result = await pool.query(
            'INSERT INTO board_history (board_id, snapshot_data, change_type, created_by) VALUES ($1, $2, $3, $4) RETURNING *',
            [boardId, JSON.stringify(snapshotData), change_type, req.user.id]
        );

        res.status(201).json(result.rows[0]);
    } catch (error) {
        console.error('Ошибка создания снимка:', error);
        res.status(500).json({ error: 'Failed to create snapshot' });
    }
});

// GET /api/boards/:boardId/history - Get history of changes
app.get('/api/boards/:boardId/history', authenticateToken, checkBoardAccess('view'), async (req, res) => {
    const { boardId } = req.params;
    const { limit = 50 } = req.query;

    try {
        const result = await pool.query(
            `SELECT bh.*, u.name as created_by_name
             FROM board_history bh
             LEFT JOIN users u ON bh.created_by = u.id
             WHERE bh.board_id = $1
             ORDER BY bh.created_at DESC
             LIMIT $2`,
            [boardId, limit]
        );

        // Parse snapshot data
        const history = result.rows.map(row => ({
            ...row,
            snapshot_data: row.snapshot_data ? JSON.parse(row.snapshot_data) : null
        }));

        res.json(history);
    } catch (error) {
        console.error('Ошибка получения истории доски:', error);
        res.status(500).json({ error: 'Failed to fetch history' });
    }
});

// POST /api/boards/:boardId/undo - Undo last change
app.post('/api/boards/:boardId/undo', authenticateToken, checkBoardAccess('edit'), async (req, res) => {
    const { boardId } = req.params;

    try {
        // Get the most recent snapshot
        const snapshotResult = await pool.query(
            'SELECT * FROM board_history WHERE board_id = $1 ORDER BY created_at DESC LIMIT 1',
            [boardId]
        );

        if (snapshotResult.rows.length === 0) {
            return res.status(404).json({ error: 'No snapshots available' });
        }

        const snapshot = snapshotResult.rows[0];
        const snapshotData = JSON.parse(snapshot.snapshot_data);

        // Restore elements from snapshot
        await pool.query('DELETE FROM board_elements WHERE board_id = $1', [boardId]);

        // Insert elements from snapshot
        for (const element of snapshotData.elements) {
            await pool.query(
                `INSERT INTO board_elements (id, board_id, type, properties, z_index, group_id, created_by, updated_by, created_at, updated_at)
                 VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
                [
                    element.id, element.board_id, element.type, JSON.stringify(element.properties),
                    element.z_index, element.group_id, element.created_by, req.user.id,
                    element.created_at, new Date()
                ]
            );
        }

        // Record the undo action
        await pool.query(
            'INSERT INTO board_history (board_id, snapshot_data, change_type, created_by) VALUES ($1, $2, $3, $4)',
            [boardId, snapshot.snapshot_data, 'undo', req.user.id]
        );

        // Broadcast to WebSocket clients
        if (wss) {
            wss.broadcastToBoard(boardId, {
                type: 'board_restored',
                snapshotData: snapshotData,
                userId: req.user.id
            });
        }

        res.json({ message: 'Undo successful', restoredElements: snapshotData.elements.length });
    } catch (error) {
        console.error('Ошибка выполнения отмены:', error);
        res.status(500).json({ error: 'Failed to undo' });
    }
});

// File upload endpoint
app.post('/api/boards/:boardId/upload', authenticateToken, checkBoardAccess('edit'), upload.single('file'), async (req, res) => {
    const { boardId } = req.params;

    if (!req.file) {
        return res.status(400).json({ error: 'No file uploaded' });
    }

    try {
        const fileData = {
            board_id: boardId,
            filename: req.file.filename,
            original_name: req.file.originalname,
            mime_type: req.file.mimetype,
            file_size: req.file.size,
            file_path: req.file.path,
            uploaded_by: req.user.id
        };

        const result = await pool.query(
            `INSERT INTO board_files (board_id, filename, original_name, mime_type, file_size, file_path, uploaded_by)
             VALUES ($1, $2, $3, $4, $5, $6, $7)
             RETURNING *`,
            [fileData.board_id, fileData.filename, fileData.original_name, fileData.mime_type,
             fileData.file_size, fileData.file_path, fileData.uploaded_by]
        );

        // Return the file info with a URL to access it
        const fileInfo = result.rows[0];
        fileInfo.url = `/uploads/${fileInfo.filename}`;

        res.status(201).json(fileInfo);
    } catch (error) {
        console.error('Ошибка загрузки файла:', error);
        res.status(500).json({ error: 'Failed to upload file' });
    }
});

// FILE ACCESS ENDPOINT
app.get('/api/files/:id', async (req, res) => {
    const { id } = req.params;

    try {
        const result = await pool.query(
            'SELECT * FROM board_files WHERE id = $1',
            [id]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'File not found' });
        }

        const file = result.rows[0];
        res.sendFile(file.file_path);
    } catch (error) {
        console.error('Ошибка обслуживания файла:', error);
        res.status(500).json({ error: 'Failed to serve file' });
    }
});

// INVITATION ENDPOINTS (public)

// GET /api/invitations/:token - Get invitation details
app.get('/api/invitations/:token', async (req, res) => {
    const { token } = req.params;

    try {
        const result = await pool.query(`
            SELECT wi.*, w.name as workspace_name, w.description as workspace_description,
                   u.name as invited_by_name
            FROM workspace_invitations wi
            JOIN workspaces w ON wi.workspace_id = w.id
            JOIN users u ON wi.invited_by = u.id
            WHERE wi.token = $1 AND wi.status = 'pending'
        `, [token]);

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Invitation not found or expired' });
        }

        const invitation = result.rows[0];

        // Check expiry
        if (new Date() > new Date(invitation.expires_at)) {
            return res.status(400).json({ error: 'Invitation has expired' });
        }

        res.json(invitation);
    } catch (error) {
        console.error('Ошибка получения приглашения:', error);
        res.status(500).json({ error: 'Failed to fetch invitation' });
    }
});

// Serve uploaded files
app.use('/uploads', express.static('uploads'));

// WebSocket server setup
const WebSocket = require('ws');
const wss = new WebSocket.Server({ port: 3002 });

wss.broadcastToBoard = (boardId, data) => {
    wss.clients.forEach(client => {
        if (client.readyState === WebSocket.OPEN && client.boardId === boardId) {
            client.send(JSON.stringify(data));
        }
    });
};

wss.on('connection', (ws, req) => {
    const url = new URL(req.url, `http://${req.headers.host}`);
    const boardId = url.searchParams.get('boardId');

    if (boardId) {
        ws.boardId = boardId;
    }

    ws.on('message', (message) => {
        try {
            const data = JSON.parse(message.toString());
            // Handle incoming messages if needed
        } catch (error) {
            console.error('Ошибка разбора сообщения WebSocket:', error);
        }
    });

    ws.on('close', () => {
    });
});

console.log('Сервер запущен на порту', PORT);
console.log('WebSocket сервер запущен на порту 3002');

module.exports = app;

