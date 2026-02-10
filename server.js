// server.js - SHADOW LURKERS BACKEND - BUG FIXED VERSION

const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const nodemailer = require('nodemailer');
const sqlite3 = require('sqlite3').verbose();
const { Telegraf } = require('telegraf');

// ============================================
// CONFIGURATION - All settings here
// ============================================
const CONFIG = {
    PORT: 3000,
    FRONTEND_URL: 'http://localhost:5500',
    
    // Telegram Configuration
    TELEGRAM_BOT_TOKEN: 'YOUR_BOT_TOKEN_HERE', // Replace with your token
    TELEGRAM_ADMIN_CHAT_ID: 'YOUR_CHAT_ID_HERE', // Replace with your chat ID
    
    // Email Configuration
    EMAIL_USER: 'shadowlurkers229@gmail.com',
    EMAIL_PASS: 'vbjrnxynwwpcxbxe',
    
    // Security
    RATE_LIMIT_WINDOW: 15 * 60 * 1000, // 15 minutes
    RATE_LIMIT_MAX: 100,
    
    // Database
    DB_PATH: './shadow_lurkers.db'
};

// ============================================
// INITIALIZE APPLICATION
// ============================================
const app = express();

// Security middleware
app.use(helmet({
    contentSecurityPolicy: false // Disable for demo, enable in production
}));

// FIXED: CORS configuration
app.use(cors({
    origin: CONFIG.FRONTEND_URL,
    credentials: true,
    methods: ['GET', 'POST', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization']
}));

// FIXED: Body parser with limits
app.use(bodyParser.json({ limit: '1mb' }));
app.use(bodyParser.urlencoded({ extended: true, limit: '1mb' }));

// Rate limiting
const limiter = rateLimit({
    windowMs: CONFIG.RATE_LIMIT_WINDOW,
    max: CONFIG.RATE_LIMIT_MAX,
    message: JSON.stringify({
        error: 'Too many requests from this IP. The Veil is watching.',
        code: 429
    }),
    standardHeaders: true,
    legacyHeaders: false
});

app.use('/api/', limiter);

// ============================================
// DATABASE SETUP - FIXED
// ============================================
const db = new sqlite3.Database(CONFIG.DB_PATH, (err) => {
    if (err) {
        console.error('☠ Database connection error:', err.message);
    } else {
        console.log('☬ Connected to Shadow Lurkers database');
        initializeDatabase();
    }
});

function initializeDatabase() {
    // FIXED: Initiates table with moniker field
    db.run(`
        CREATE TABLE IF NOT EXISTS initiates (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            age INTEGER NOT NULL,
            phone TEXT NOT NULL,
            email TEXT NOT NULL,
            telegram TEXT NOT NULL,
            moniker TEXT NOT NULL,
            role TEXT NOT NULL,
            skills TEXT NOT NULL,
            oat TEXT NOT NULL UNIQUE,
            ip TEXT,
            user_agent TEXT,
            status TEXT DEFAULT 'pending',
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            reviewed_at DATETIME,
            reviewed_by TEXT,
            notes TEXT,
            INDEX idx_status (status),
            INDEX idx_created (created_at)
        )
    `);
    
    // Admins table
    db.run(`
        CREATE TABLE IF NOT EXISTS admins (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            telegram_id TEXT UNIQUE NOT NULL,
            name TEXT NOT NULL,
            oat TEXT NOT NULL,
            role TEXT DEFAULT 'elder',
            permissions TEXT DEFAULT 'approve,reject,view',
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            last_active DATETIME,
            UNIQUE(telegram_id)
        )
    `);
    
    // Logs table
    db.run(`
        CREATE TABLE IF NOT EXISTS audit_logs (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            action TEXT NOT NULL,
            user_id INTEGER,
            target_id INTEGER,
            details TEXT,
            ip TEXT,
            user_agent TEXT,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
    `);
    
    // Create indexes
    db.run('CREATE INDEX IF NOT EXISTS idx_action ON audit_logs(action)');
    db.run('CREATE INDEX IF NOT EXISTS idx_created_logs ON audit_logs(created_at)');
}

// ============================================
// EMAIL SERVICE - FIXED
// ============================================
let emailTransporter;
try {
    emailTransporter = nodemailer.createTransport({
        service: 'gmail',
        auth: {
            user: CONFIG.EMAIL_USER,
            pass: CONFIG.EMAIL_PASS
        }
    });
    
    // Verify email connection on startup
    emailTransporter.verify((error) => {
        if (error) {
            console.error('☠ Email service error:', error.message);
        } else {
            console.log('☬ Email service ready');
        }
    });
} catch (error) {
    console.error('☠ Failed to create email transporter:', error.message);
    emailTransporter = null;
}

// ============================================
// TELEGRAM BOT - FIXED
// ============================================
let bot;
try {
    if (CONFIG.TELEGRAM_BOT_TOKEN && CONFIG.TELEGRAM_BOT_TOKEN !== 'YOUR_BOT_TOKEN_HERE') {
        bot = new Telegraf(CONFIG.TELEGRAM_BOT_TOKEN);
        console.log('☬ Telegram bot initialized');
    } else {
        console.log('⚠ Telegram bot token not configured');
        bot = null;
    }
} catch (error) {
    console.error('☠ Telegram bot initialization error:', error.message);
    bot = null;
}

// Admin session store
const adminSessions = new Map();

// FIXED: /start command for admin
if (bot) {
    bot.start((ctx) => {
        const adminName = ctx.from.first_name || 'Shadow Architect';
        const adminOAT = `${adminName}᭄ˢʰᵃᵈᵒʷ`;
        const telegramId = ctx.from.id.toString();
        
        // Store admin session
        adminSessions.set(telegramId, {
            id: telegramId,
            name: adminName,
            oat: adminOAT,
            lastActive: new Date().toISOString()
        });
        
        // Save to database
        db.run(
            `INSERT OR REPLACE INTO admins (telegram_id, name, oat, last_active) 
             VALUES (?, ?, ?, CURRENT_TIMESTAMP)`,
            [telegramId, adminName, adminOAT],
            (err) => {
                if (err) {
                    console.error('Admin save error:', err.message);
                }
            }
        );
        
        const welcomeMessage = `
╔══════════════════════════════════════════════╗
                 ⚚ ☬ Welcome, Shadow Architect ☬

The Veil recognizes your presence, Eldritch Overseer.  
All eyes of the shadow now obey your command.

You may:

⚔ Review new Initiates and their OAT pledges  
☠ Approve the worthy, cast the unworthy into silence  
☾ Track clan members and their ranks  
☬ Monitor operations and enforce the code  

Remember: the shadows are eternal,  
the Veil is watching,  
and every action leaves a trace in the Silent Ledger.

Stand vigilant, ${adminOAT}.  
Your dominion begins now.

☬ Command the shadows. Shape the Veil. ☬
╚══════════════════════════════════════════════╝
        `;
        
        ctx.reply(welcomeMessage).catch(err => {
            console.error('Telegram reply error:', err.message);
        });
    });
}

// ============================================
// API ENDPOINTS - FIXED
// ============================================

// Health check
app.get('/api/health', (req, res) => {
    res.json({
        status: 'active',
        service: 'Shadow Lurkers Veil',
        timestamp: new Date().toISOString(),
        version: '1.0.0',
        telegram: !!bot,
        email: !!emailTransporter
    });
});

// Submit initiation form - FIXED with moniker
app.post('/api/submit', async (req, res) => {
    try {
        const {
            name,
            age,
            phone,
            email,
            telegram,
            moniker,
            role,
            skills,
            oat,
            userAgent
        } = req.body;
        
        const ip = req.ip || req.headers['x-forwarded-for'] || req.connection.remoteAddress;
        
        // FIXED: Validation with proper checks
        const errors = [];
        
        if (!name || name.trim().length < 2) {
            errors.push('Name must be at least 2 characters');
        }
        
        if (!age || age < 16 || age > 99) {
            errors.push('Age must be between 16 and 99');
        }
        
        if (!phone || phone.replace(/\D/g, '').length < 10) {
            errors.push('Valid phone number required');
        }
        
        if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
            errors.push('Valid email required');
        }
        
        // FIXED: Telegram must start with @
        if (!telegram || !telegram.startsWith('@')) {
            errors.push('Telegram must start with @');
        }
        
        // FIXED: Moniker must include the tag
        if (!moniker || !moniker.startsWith('᭄ˢʰᵃᵈᵒʷ')) {
            errors.push('Moniker must include the shadow tag');
        }
        
        if (!role || !['Strategist', 'Attacker', 'Defender'].includes(role)) {
            errors.push('Valid role selection required');
        }
        
        if (!skills || skills.trim().length < 10) {
            errors.push('Skills description must be at least 10 characters');
        }
        
        if (!oat || !oat.endsWith('᭄ˢʰᵃᵈᵒʷ')) {
            errors.push('Invalid OAT format');
        }
        
        if (errors.length > 0) {
            return res.status(400).json({
                error: 'Validation failed',
                details: errors
            });
        }
        
        // Check for duplicate Telegram or OAT
        db.get(
            `SELECT COUNT(*) as count FROM initiates 
             WHERE telegram = ? OR oat = ?`,
            [telegram.trim(), oat.trim()],
            (err, row) => {
                if (err) {
                    console.error('Database error:', err);
                    return res.status(500).json({ error: 'Database error' });
                }
                
                if (row.count > 0) {
                    return res.status(409).json({
                        error: 'Initiate already exists in the Silent Ledger'
                    });
                }
                
                // Save to database
                db.run(
                    `INSERT INTO initiates 
                     (name, age, phone, email, telegram, moniker, role, skills, oat, ip, user_agent, status)
                     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending')`,
                    [
                        name.trim(), 
                        parseInt(age), 
                        phone.trim(), 
                        email.trim(), 
                        telegram.trim(),
                        moniker.trim(),
                        role, 
                        skills.trim(), 
                        oat.trim(), 
                        ip, 
                        userAgent || 'Unknown'
                    ],
                    function(err) {
                        if (err) {
                            console.error('Insert error:', err.message);
                            return res.status(500).json({ error: 'Failed to save initiation' });
                        }
                        
                        const initiateId = this.lastID;
                        
                        // Log the submission
                        logAudit('initiation_submitted', null, initiateId, {
                            name: name.trim(),
                            telegram: telegram.trim(),
                            moniker: moniker.trim(),
                            oat: oat.trim()
                        });
                        
                        // Send Telegram notification if bot is available
                        if (bot && CONFIG.TELEGRAM_ADMIN_CHAT_ID && CONFIG.TELEGRAM_ADMIN_CHAT_ID !== 'YOUR_CHAT_ID_HERE') {
                            sendTelegramNotification(initiateId, {
                                name: name.trim(),
                                age: parseInt(age),
                                phone: phone.trim(),
                                email: email.trim(),
                                telegram: telegram.trim(),
                                moniker: moniker.trim(),
                                role,
                                skills: skills.trim(),
                                oat: oat.trim()
                            });
                        }
                        
                        res.json({
                            success: true,
                            message: 'Initiation received by the Veil',
                            initiateId,
                            oat: oat.trim(),
                            moniker: moniker.trim(),
                            status: 'pending'
                        });
                    }
                );
            }
        );
        
    } catch (error) {
        console.error('Submission error:', error);
        res.status(500).json({
            error: 'Internal server error',
            message: 'The Veil encountered an anomaly'
        });
    }
});

// Get initiation status
app.get('/api/status/:id', (req, res) => {
    const initiateId = req.params.id;
    
    if (!initiateId || isNaN(parseInt(initiateId))) {
        return res.status(400).json({ error: 'Invalid initiate ID' });
    }
    
    db.get(
        `SELECT id, name, telegram, moniker, oat, status, created_at, reviewed_at, reviewed_by
         FROM initiates WHERE id = ?`,
        [initiateId],
        (err, row) => {
            if (err) {
                console.error('Database error:', err);
                return res.status(500).json({ error: 'Database error' });
            }
            
            if (!row) {
                return res.status(404).json({ error: 'Initiate not found' });
            }
            
            res.json({
                id: row.id,
                name: row.name,
                telegram: row.telegram,
                moniker: row.moniker,
                oat: row.oat,
                status: row.status,
                created: row.created_at,
                reviewed: row.reviewed_at,
                reviewer: row.reviewed_by
            });
        }
    );
});

// ============================================
// TELEGRAM NOTIFICATION FUNCTIONS - FIXED
// ============================================
async function sendTelegramNotification(initiateId, data) {
    if (!bot || !CONFIG.TELEGRAM_ADMIN_CHAT_ID) {
        console.log('⚠ Telegram bot not configured, skipping notification');
        return;
    }
    
    try {
        const message = `
🔥 NEW SHADOW LURKER INITIATE 🔥
☬≛⃝͙☬

👤 Name: ${data.name}
🎂 Age: ${data.age}
📞 Phone: ${data.phone}
📧 Email: ${data.email}

🔮 Telegram: ${data.telegram}
🏷️ Moniker: ${data.moniker}
⚔️ Role: ${data.role}

🧠 Skills:
${data.skills}

🪪 OAT:
${data.oat}

📜 Code Accepted: ✅
🕯 Status: Awaiting Judgment
        `;
        
        await bot.telegram.sendMessage(
            CONFIG.TELEGRAM_ADMIN_CHAT_ID,
            message,
            {
                parse_mode: 'HTML',
                reply_markup: {
                    inline_keyboard: [
                        [
                            { 
                                text: '☬ APPROVE INITIATE ☬', 
                                callback_data: `approve_${initiateId}`
                            }
                        ],
                        [
                            { 
                                text: '✖ REJECT & PURGE ✖', 
                                callback_data: `reject_${initiateId}`
                            }
                        ]
                    ]
                }
            }
        );
        
        console.log(`☬ Telegram notification sent for initiate ${initiateId}`);
        
    } catch (error) {
        console.error('Telegram notification error:', error.message);
    }
}

// FIXED: Handle callback queries
if (bot) {
    bot.on('callback_query', async (ctx) => {
        const callbackData = ctx.callbackQuery.data;
        const [action, initiateId] = callbackData.split('_');
        const telegramId = ctx.from.id.toString();
        const admin = adminSessions.get(telegramId);
        
        if (!admin) {
            try {
                await ctx.answerCbQuery('Unauthorized. Not recognized as an Elder.');
            } catch (e) {
                console.error('Callback query error:', e.message);
            }
            return;
        }
        
        try {
            // Get initiate data
            db.get('SELECT * FROM initiates WHERE id = ?', [initiateId], async (err, row) => {
                if (err || !row) {
                    try {
                        await ctx.answerCbQuery('Initiate not found in the Silent Ledger');
                    } catch (e) {
                        console.error('Callback answer error:', e.message);
                    }
                    return;
                }
                
                const timestamp = new Date().toISOString();
                
                if (action === 'approve') {
                    // Update database
                    db.run(
                        `UPDATE initiates SET 
                         status = 'approved', 
                         reviewed_at = ?, 
                         reviewed_by = ? 
                         WHERE id = ?`,
                        [timestamp, admin.name, initiateId],
                        async (updateErr) => {
                            if (updateErr) {
                                console.error('Update error:', updateErr.message);
                                return;
                            }
                            
                            // Send approval email
                            if (emailTransporter) {
                                await sendApprovalEmail(row.email, row.name, row.role, row.oat, row.moniker);
                            }
                            
                            // Update Telegram message
                            try {
                                await ctx.editMessageText(
                                    `☬ The Veil has acknowledged a new Initiate ☬\n\n` +
                                    `Name: ${row.name}\n` +
                                    `Moniker: ${row.moniker}\n` +
                                    `OAT: ${row.oat}\n` +
                                    `Role: ${row.role}\n\n` +
                                    `The shadows have marked this soul.\n` +
                                    `Prepare to guide them, Elders.`
                                );
                            } catch (editErr) {
                                console.error('Edit message error:', editErr.message);
                            }
                            
                            // Log approval
                            logAudit('initiate_approved', telegramId, initiateId, {
                                admin: admin.name,
                                initiate: row.name,
                                moniker: row.moniker,
                                oat: row.oat
                            });
                            
                            try {
                                await ctx.answerCbQuery('Initiate approved. The shadows have marked them.');
                            } catch (answerErr) {
                                console.error('Answer callback error:', answerErr.message);
                            }
                        }
                    );
                    
                } else if (action === 'reject') {
                    // Update database
                    db.run(
                        `UPDATE initiates SET 
                         status = 'rejected', 
                         reviewed_at = ?, 
                         reviewed_by = ? 
                         WHERE id = ?`,
                        [timestamp, admin.name, initiateId],
                        async (updateErr) => {
                            if (updateErr) {
                                console.error('Update error:', updateErr.message);
                                return;
                            }
                            
                            // Send rejection email
                            if (emailTransporter) {
                                await sendRejectionEmail(row.email, row.name, row.role, row.oat, row.moniker);
                            }
                            
                            // Update Telegram message
                            try {
                                await ctx.editMessageText(
                                    `☠ The Void rejects a soul ☠\n\n` +
                                    `Name: ${row.name}\n` +
                                    `Moniker: ${row.moniker}\n` +
                                    `OAT: ${row.oat}\n` +
                                    `Role: ${row.role}\n\n` +
                                    `Their ritual was flawed.\n` +
                                    `The shadows remember, but the Veil denies passage.`
                                );
                            } catch (editErr) {
                                console.error('Edit message error:', editErr.message);
                            }
                            
                            // Log rejection
                            logAudit('initiate_rejected', telegramId, initiateId, {
                                admin: admin.name,
                                initiate: row.name,
                                moniker: row.moniker,
                                oat: row.oat
                            });
                            
                            try {
                                await ctx.answerCbQuery('Initiate rejected. The Veil denies passage.');
                            } catch (answerErr) {
                                console.error('Answer callback error:', answerErr.message);
                            }
                        }
                    );
                }
            });
        } catch (error) {
            console.error('Callback query processing error:', error);
            try {
                await ctx.answerCbQuery('Error processing request. The Veil trembles.');
            } catch (e) {
                console.error('Final callback error:', e.message);
            }
        }
    });
}

// ============================================
// EMAIL FUNCTIONS - FIXED
// ============================================
async function sendApprovalEmail(to, name, role, oat, moniker) {
    if (!emailTransporter) {
        console.error('☠ Email transporter not available');
        return false;
    }
    
    const mailOptions = {
        from: `"Shadow Lurkers" <${CONFIG.EMAIL_USER}>`,
        to: to,
        subject: '☬ Shadow Lurkers — Initiation Approved',
        html: generateApprovalEmailHTML(name, role, oat, moniker)
    };
    
    try {
        await emailTransporter.sendMail(mailOptions);
        console.log(`☬ Approval email sent to ${to}`);
        return true;
    } catch (error) {
        console.error('Email sending error:', error.message);
        return false;
    }
}

async function sendRejectionEmail(to, name, role, oat, moniker) {
    if (!emailTransporter) {
        console.error('☠ Email transporter not available');
        return false;
    }
    
    const mailOptions = {
        from: `"Shadow Lurkers" <${CONFIG.EMAIL_USER}>`,
        to: to,
        subject: '☠ Shadow Lurkers — Application Denied',
        html: generateRejectionEmailHTML(name, role, oat, moniker)
    };
    
    try {
        await emailTransporter.sendMail(mailOptions);
        console.log(`☠ Rejection email sent to ${to}`);
        return true;
    } catch (error) {
        console.error('Email sending error:', error.message);
        return false;
    }
}

function generateApprovalEmailHTML(name, role, oat, moniker) {
    return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<title>Shadow Lurkers — Initiation Approved</title>
</head>
<body style="margin:0;padding:0;background-color:#050008;font-family:'Segoe UI',Arial,sans-serif;color:#e6e6e6;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#050008;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="margin:40px auto;border:1px solid #2b002b;background:#0b0012;box-shadow:0 0 30px rgba(170,0,255,0.3);">
          <tr>
            <td align="center" style="padding:30px;background:url('https://i.ibb.co/3515rVy5/file-1439.jpg') center/cover;">
              <h1 style="margin:0;color:#ff003c;letter-spacing:4px;text-shadow:0 0 15px #ff003c;">☬ SHADOW LURKERS ☬</h1>
              <p style="margin-top:10px;color:#c77dff;font-size:14px;">Initiation Verdict</p>
            </td>
          </tr>
          <tr>
            <td style="padding:30px;">
              <p style="font-size:16px;line-height:1.6;">The shadows have spoken.</p>
              <p style="font-size:16px;line-height:1.6;color:#00ffcc;"><strong>Your application has been APPROVED.</strong></p>
              <p style="font-size:15px;line-height:1.6;">Your identity is now bound to the clan. The mark has been carved into the system.</p>
              
              <div style="margin:20px 0;padding:15px;border:1px solid #ff003c;background:#120015;text-align:center;">
                <p style="margin:0;font-size:14px;color:#aaa;">Your Official Assigned Tag (OAT)</p>
                <p style="margin:10px 0 0;font-size:18px;color:#ff003c;letter-spacing:2px;">${oat}</p>
              </div>
              
              <div style="margin:20px 0;padding:15px;border:1px solid #c77dff;background:#120015;text-align:center;">
                <p style="margin:0;font-size:14px;color:#aaa;">Your Shadow Moniker</p>
                <p style="margin:10px 0 0;font-size:16px;color:#c77dff;letter-spacing:1px;">${moniker}</p>
              </div>
              
              <p style="font-size:14px;color:#bbb;line-height:1.6;">Wear your OAT with pride. Your moniker is your shadow-name. Await further instructions through secure channels.</p>
              <p style="margin-top:30px;font-size:13px;color:#666;">The void watches. Every action is recorded.</p>
            </td>
          </tr>
          <tr>
            <td align="center" style="padding:20px;background:#08000d;color:#555;font-size:12px;">☬≛⃝͙☬ Shadow Lurkers Network ☬≛⃝͙☬<br>This message was generated automatically.</td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

function generateRejectionEmailHTML(name, role, oat, moniker) {
    return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<title>Shadow Lurkers — Application Denied</title>
</head>
<body style="margin:0;padding:0;background-color:#040004;font-family:'Segoe UI',Arial,sans-serif;color:#e0e0e0;">
  <table width="100%" cellpadding="0" cellspacing="0">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="margin:40px auto;border:1px solid #2a0000;background:#0a0008;box-shadow:0 0 25px rgba(255,0,0,0.25);">
          <tr>
            <td align="center" style="padding:30px;background:#120008;">
              <h1 style="margin:0;color:#ff003c;letter-spacing:3px;">SHADOW LURKERS</h1>
              <p style="margin-top:8px;color:#888;font-size:14px;">Application Verdict</p>
            </td>
          </tr>
          <tr>
            <td style="padding:30px;">
              <p style="font-size:16px;line-height:1.6;">The system has completed its evaluation.</p>
              <p style="font-size:16px;line-height:1.6;color:#ff003c;"><strong>Your application has been REJECTED.</strong></p>
              <p style="font-size:14px;line-height:1.6;color:#bbb;">The requirements were not met. Access is denied.</p>
              
              <div style="margin:20px 0;padding:15px;border:1px solid #330000;background:#100006;">
                <p style="margin:0;font-size:13px;color:#888;">
                  Your submission:<br>
                  Name: ${name}<br>
                  Moniker: ${moniker}<br>
                  OAT: ${oat}
                </p>
              </div>
              
              <p style="font-size:13px;color:#666;">Do not reply to this message. No appeal process exists.</p>
            </td>
          </tr>
          <tr>
            <td align="center" style="padding:18px;background:#070004;color:#555;font-size:12px;">Shadow Lurkers Network<br>Automated System Message</td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

// ============================================
// AUDIT LOGGING - FIXED
// ============================================
function logAudit(action, userId, targetId, details) {
    const ip = 'system';
    const userAgent = 'server';
    
    db.run(
        `INSERT INTO audit_logs (action, user_id, target_id, details, ip, user_agent)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [action, userId, targetId, JSON.stringify(details), ip, userAgent],
        (err) => {
            if (err) {
                console.error('Audit log error:', err.message);
            }
        }
    );
}

// ============================================
// ERROR HANDLING MIDDLEWARE - FIXED
// ============================================
app.use((err, req, res, next) => {
    console.error('☠ Unhandled error:', err);
    res.status(500).json({
        error: 'Internal server error',
        message: 'The Veil has encountered an unexpected anomaly'
    });
});

// 404 handler
app.use((req, res) => {
    res.status(404).json({
        error: 'Not found',
        message: 'The path you seek does not exist in the shadows'
    });
});

// ============================================
// START SERVER - FIXED
// ============================================
const server = app.listen(CONFIG.PORT, () => {
    console.log(`
╔══════════════════════════════════════════════╗
  ☬ SHADOW LURKERS VEIL SERVER ACTIVATED ☬
  Port: ${CONFIG.PORT}
  Frontend: ${CONFIG.FRONTEND_URL}
  Database: ${CONFIG.DB_PATH}
  Time: ${new Date().toISOString()}
╚══════════════════════════════════════════════╝
    `);
    
    // Launch Telegram bot if configured
    if (bot) {
        bot.launch().then(() => {
            console.log('☬ Telegram Bot activated and listening...');
        }).catch(err => {
            console.error('☠ Telegram Bot failed to launch:', err.message);
            console.log('⚠ Continuing without Telegram bot...');
        });
    } else {
        console.log('⚠ Telegram bot not configured, running without bot features');
    }
});

// ============================================
// GRACEFUL SHUTDOWN - FIXED
// ============================================
function shutdown() {
    console.log('\n☬ Shutting down Shadow Veil Server...');
    
    // Stop Telegram bot
    if (bot) {
        bot.stop();
    }
    
    // Close database
    db.close((err) => {
        if (err) {
            console.error('☠ Database close error:', err.message);
        } else {
            console.log('☬ Database connection closed');
        }
        
        // Close server
        server.close(() => {
            console.log('☬ Server shut down gracefully');
            process.exit(0);
        });
    });
}

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);

// ============================================
// EXPORT FOR TESTING
// ============================================
module.exports = {
    app,
    CONFIG,
    db,
    bot
};
