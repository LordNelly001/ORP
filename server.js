// server.js - COMPLETE WORKING BACKEND WITH TELEGRAM & EMAIL
const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const nodemailer = require('nodemailer');
const sqlite3 = require('sqlite3').verbose();
const { Telegraf } = require('telegraf');

// ============================================
// CONFIGURATION - REPLACE THESE WITH YOUR VALUES
// ============================================
const CONFIG = {
    PORT: 3000,
    FRONTEND_URL: 'http://localhost:5500',
    
    // TELEGRAM CONFIG - REPLACE THESE
    TELEGRAM_BOT_TOKEN: '8454644932:AAHCQ9JosCjJNQ_DL0XjoVSQ60L7YmrIX5g', // Get from @BotFather
    TELEGRAM_ADMIN_CHAT_ID: '8379700820', // Get from @userinfobot
    
    // EMAIL CONFIG - USE THE PROVIDED CREDENTIALS
    EMAIL_USER: 'shadowlurkers229@gmail.com',
    EMAIL_PASS: 'vbjrnxynwwpcxbxe',
    
    // SECURITY
    RATE_LIMIT_WINDOW: 15 * 60 * 1000,
    RATE_LIMIT_MAX: 50,
    
    // DATABASE
    DB_PATH: './shadow_lurkers.db'
};

// ============================================
// INITIALIZE APPLICATION
// ============================================
const app = express();

// Middleware
app.use(helmet());
app.use(cors({
    origin: CONFIG.FRONTEND_URL,
    credentials: true
}));
app.use(bodyParser.json());

// Rate limiting
const limiter = rateLimit({
    windowMs: CONFIG.RATE_LIMIT_WINDOW,
    max: CONFIG.RATE_LIMIT_MAX,
    message: { error: 'Too many requests from this IP' }
});
app.use('/api/', limiter);

// ============================================
// DATABASE SETUP
// ============================================
const db = new sqlite3.Database(CONFIG.DB_PATH, (err) => {
    if (err) {
        console.error('Database connection error:', err.message);
    } else {
        console.log('Connected to database');
        initializeDatabase();
    }
});

function initializeDatabase() {
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
            reviewed_by TEXT
        )
    `);
}

// ============================================
// EMAIL SERVICE - WORKING WITH PROVIDED CREDENTIALS
// ============================================
const emailTransporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: CONFIG.EMAIL_USER,
        pass: CONFIG.EMAIL_PASS
    }
});

// Verify email connection
emailTransporter.verify((error) => {
    if (error) {
        console.error('Email service error:', error);
    } else {
        console.log('Email service ready');
    }
});

// ============================================
// TELEGRAM BOT - WORKING BOT
// ============================================
let bot;
try {
    if (CONFIG.TELEGRAM_BOT_TOKEN && CONFIG.TELEGRAM_BOT_TOKEN !== 'YOUR_BOT_TOKEN_HERE') {
        bot = new Telegraf(CONFIG.TELEGRAM_BOT_TOKEN);
        console.log('Telegram bot initialized');
    } else {
        console.log('Telegram bot token not configured');
        bot = null;
    }
} catch (error) {
    console.error('Telegram bot error:', error.message);
    bot = null;
}

// Store admin sessions
const adminSessions = new Map();

// /start command for admin
if (bot) {
    bot.start((ctx) => {
        const adminName = ctx.from.first_name || 'Shadow Architect';
        const adminOAT = `${adminName}᭄ˢʰᵃᵈᵒʷ`;
        const telegramId = ctx.from.id.toString();
        
        adminSessions.set(telegramId, {
            id: telegramId,
            name: adminName,
            oat: adminOAT
        });
        
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
        
        ctx.reply(welcomeMessage);
    });
}

// ============================================
// API ENDPOINTS - WORKING SUBMISSION
// ============================================

// Health check
app.get('/api/health', (req, res) => {
    res.json({
        status: 'active',
        service: 'Shadow Lurkers Veil',
        timestamp: new Date().toISOString()
    });
});

// Submit initiation - WORKING ENDPOINT
app.post('/api/submit', async (req, res) => {
    console.log('📥 Received submission:', req.body);
    
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
        
        // Validation
        if (!name || name.trim().length < 2) {
            return res.status(400).json({ error: 'Name must be at least 2 characters' });
        }
        
        if (!age || age < 16 || age > 99) {
            return res.status(400).json({ error: 'Age must be between 16 and 99' });
        }
        
        if (!phone || phone.replace(/\D/g, '').length < 10) {
            return res.status(400).json({ error: 'Valid phone number required' });
        }
        
        if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
            return res.status(400).json({ error: 'Valid email required' });
        }
        
        if (!telegram || !telegram.startsWith('@')) {
            return res.status(400).json({ error: 'Telegram must start with @' });
        }
        
        if (!moniker || !moniker.startsWith('᭄ˢʰᵃᵈᵒʷ')) {
            return res.status(400).json({ error: 'Invalid moniker format' });
        }
        
        if (!role || !['Strategist', 'Attacker', 'Defender'].includes(role)) {
            return res.status(400).json({ error: 'Valid role required' });
        }
        
        if (!skills || skills.trim().length < 10) {
            return res.status(400).json({ error: 'Skills description too short' });
        }
        
        // Check for duplicates
        db.get(
            `SELECT COUNT(*) as count FROM initiates WHERE telegram = ? OR oat = ?`,
            [telegram, oat],
            (err, row) => {
                if (err) {
                    console.error('Database error:', err);
                    return res.status(500).json({ error: 'Database error' });
                }
                
                if (row.count > 0) {
                    return res.status(409).json({ error: 'Initiate already exists' });
                }
                
                // Save to database
                db.run(
                    `INSERT INTO initiates 
                     (name, age, phone, email, telegram, moniker, role, skills, oat, ip, user_agent, status)
                     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending')`,
                    [name, age, phone, email, telegram, moniker, role, skills, oat, ip, userAgent || 'Unknown'],
                    function(err) {
                        if (err) {
                            console.error('Insert error:', err);
                            return res.status(500).json({ error: 'Failed to save initiation' });
                        }
                        
                        const initiateId = this.lastID;
                        
                        // Send Telegram notification
                        sendTelegramNotification(initiateId, {
                            name, age, phone, email, telegram, moniker, role, skills, oat
                        });
                        
                        res.json({
                            success: true,
                            message: 'Initiation received by the Veil',
                            initiateId,
                            oat,
                            status: 'pending'
                        });
                    }
                );
            }
        );
        
    } catch (error) {
        console.error('Submission error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// ============================================
// TELEGRAM NOTIFICATION - WORKING FUNCTION
// ============================================
async function sendTelegramNotification(initiateId, data) {
    if (!bot || !CONFIG.TELEGRAM_ADMIN_CHAT_ID || CONFIG.TELEGRAM_ADMIN_CHAT_ID === 'YOUR_CHAT_ID_HERE') {
        console.log('Telegram not configured, skipping notification');
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
        
        console.log(`Telegram notification sent for initiate ${initiateId}`);
        
    } catch (error) {
        console.error('Telegram notification error:', error.message);
    }
}

// ============================================
// TELEGRAM CALLBACK HANDLERS - WORKING
// ============================================
if (bot) {
    bot.on('callback_query', async (ctx) => {
        const callbackData = ctx.callbackQuery.data;
        const [action, initiateId] = callbackData.split('_');
        
        console.log(`Processing ${action} for initiate ${initiateId}`);
        
        try {
            // Get initiate data
            db.get('SELECT * FROM initiates WHERE id = ?', [initiateId], async (err, row) => {
                if (err || !row) {
                    await ctx.answerCbQuery('Initiate not found');
                    return;
                }
                
                const admin = adminSessions.get(ctx.from.id.toString()) || { name: 'Unknown Elder' };
                
                if (action === 'approve') {
                    // Update database
                    db.run(
                        'UPDATE initiates SET status = ?, reviewed_at = ?, reviewed_by = ? WHERE id = ?',
                        ['approved', new Date().toISOString(), admin.name, initiateId]
                    );
                    
                    // Send approval email
                    await sendApprovalEmail(row.email, row.name, row.role, row.oat, row.moniker);
                    
                    // Update Telegram message
                    await ctx.editMessageText(
                        `☬ The Veil has acknowledged a new Initiate ☬\n\n` +
                        `Name: ${row.name}᭄ˢʰᵃᵈᵒʷ\n` +
                        `Moniker: ${row.moniker}\n` +
                        `Role: ${row.role}\n` +
                        `OAT: ${row.oat}\n\n` +
                        `The shadows have marked this soul.\n` +
                        `Prepare to guide them, Elders.`
                    );
                    
                    await ctx.answerCbQuery('Initiate approved');
                    
                } else if (action === 'reject') {
                    // Update database
                    db.run(
                        'UPDATE initiates SET status = ?, reviewed_at = ?, reviewed_by = ? WHERE id = ?',
                        ['rejected', new Date().toISOString(), admin.name, initiateId]
                    );
                    
                    // Send rejection email
                    await sendRejectionEmail(row.email, row.name, row.role, row.oat, row.moniker);
                    
                    // Update Telegram message
                    await ctx.editMessageText(
                        `☠ The Void rejects a soul ☠\n\n` +
                        `Name: ${row.name}᭄ˢʰᵃᵈᵒʷ\n` +
                        `Moniker: ${row.moniker}\n` +
                        `Role: ${row.role}\n` +
                        `OAT: ${row.oat}\n\n` +
                        `Their ritual was flawed.\n` +
                        `The shadows remember, but the Veil denies passage.`
                    );
                    
                    await ctx.answerCbQuery('Initiate rejected');
                }
            });
        } catch (error) {
            console.error('Callback error:', error);
            await ctx.answerCbQuery('Error processing request');
        }
    });
}

// ============================================
// EMAIL FUNCTIONS - WORKING WITH GMAIL
// ============================================
async function sendApprovalEmail(to, name, role, oat, moniker) {
    try {
        const mailOptions = {
            from: `"Shadow Lurkers" <${CONFIG.EMAIL_USER}>`,
            to: to,
            subject: '☬ Shadow Lurkers — Initiation Approved',
            html: `
<!DOCTYPE html>
<html>
<body style="background:#000;color:#fff;font-family:Arial;">
<div style="max-width:600px;margin:auto;padding:20px;border:2px solid #ff003c;">
    <h1 style="color:#ff003c;text-align:center;">☬ SHADOW LURKERS ☬</h1>
    <h2 style="color:#c77dff;text-align:center;">Initiation Approved</h2>
    
    <p>The shadows have spoken. Your application has been <strong style="color:#00ffcc;">APPROVED</strong>.</p>
    
    <div style="border:1px solid #ff003c;padding:15px;margin:20px 0;text-align:center;">
        <p style="color:#aaa;">Your Official Assigned Tag (OAT)</p>
        <p style="color:#ff003c;font-size:24px;font-weight:bold;">${oat}</p>
    </div>
    
    <div style="border:1px solid #c77dff;padding:15px;margin:20px 0;text-align:center;">
        <p style="color:#aaa;">Your Shadow Moniker</p>
        <p style="color:#c77dff;font-size:20px;">${moniker}</p>
    </div>
    
    <p>Wear your OAT with pride. Your moniker is your shadow-name. Await further instructions.</p>
    <p style="color:#666;font-size:12px;text-align:center;">The void watches. Every action is recorded.</p>
</div>
</body>
</html>
            `
        };
        
        await emailTransporter.sendMail(mailOptions);
        console.log(`Approval email sent to ${to}`);
        return true;
    } catch (error) {
        console.error('Email error:', error);
        return false;
    }
}

async function sendRejectionEmail(to, name, role, oat, moniker) {
    try {
        const mailOptions = {
            from: `"Shadow Lurkers" <${CONFIG.EMAIL_USER}>`,
            to: to,
            subject: '☠ Shadow Lurkers — Application Denied',
            html: `
<!DOCTYPE html>
<html>
<body style="background:#000;color:#fff;font-family:Arial;">
<div style="max-width:600px;margin:auto;padding:20px;border:2px solid #ff003c;">
    <h1 style="color:#ff003c;text-align:center;">SHADOW LURKERS</h1>
    <h2 style="color:#c77dff;text-align:center;">Application Denied</h2>
    
    <p>The system has completed its evaluation.</p>
    <p>Your application has been <strong style="color:#ff003c;">REJECTED</strong>.</p>
    
    <div style="border:1px solid #330000;padding:15px;margin:20px 0;">
        <p style="color:#888;">Name: ${name}</p>
        <p style="color:#888;">Moniker: ${moniker}</p>
        <p style="color:#888;">OAT: ${oat}</p>
    </div>
    
    <p style="color:#666;">Do not reply to this message. No appeal process exists.</p>
</div>
</body>
</html>
            `
        };
        
        await emailTransporter.sendMail(mailOptions);
        console.log(`Rejection email sent to ${to}`);
        return true;
    } catch (error) {
        console.error('Email error:', error);
        return false;
    }
}

// ============================================
// START SERVER
// ============================================
const server = app.listen(CONFIG.PORT, () => {
    console.log(`
╔══════════════════════════════════════════════╗
  ☬ SHADOW LURKERS VEIL SERVER ACTIVATED ☬
  Port: ${CONFIG.PORT}
  Time: ${new Date().toISOString()}
╚══════════════════════════════════════════════╝
    `);
    
    // Start Telegram bot
    if (bot) {
        bot.launch().then(() => {
            console.log('Telegram Bot activated');
        }).catch(err => {
            console.error('Telegram Bot error:', err.message);
        });
    }
});

// Graceful shutdown
process.once('SIGINT', () => {
    console.log('\nShutting down...');
    if (bot) bot.stop();
    server.close();
    process.exit(0);
});
