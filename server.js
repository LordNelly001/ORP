// server.js - SHADOW LURKERS BACKEND WITH EMAIL
const express = require('express');
const nodemailer = require('nodemailer');
const cors = require('cors');
const sqlite3 = require('sqlite3').verbose();

const app = express();
const PORT = 3000;

// ============================================
// CONFIGURATION
// ============================================
const CONFIG = {
    EMAIL_USER: 'shadowlurkers229@gmail.com',
    EMAIL_PASS: 'vbjrnxynwwpcxbxe',
    FRONTEND_URL: 'http://localhost:5500'
};

// ============================================
// MIDDLEWARE
// ============================================
app.use(cors({
    origin: CONFIG.FRONTEND_URL,
    credentials: true
}));
app.use(express.json());

// ============================================
// DATABASE SETUP
// ============================================
const db = new sqlite3.Database('./shadow_lurkers.db', (err) => {
    if (err) console.error('Database error:', err);
    else {
        console.log('✅ Database connected');
        initDatabase();
    }
});

function initDatabase() {
    db.run(`CREATE TABLE IF NOT EXISTS initiates (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT,
        age INTEGER,
        gender TEXT,
        phone TEXT,
        email TEXT,
        telegram TEXT,
        moniker TEXT,
        role TEXT,
        skills TEXT,
        oat TEXT UNIQUE,
        status TEXT DEFAULT 'pending',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`);
    console.log('✅ Database tables ready');
}

// ============================================
// EMAIL SETUP
// ============================================
const emailTransporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: CONFIG.EMAIL_USER,
        pass: CONFIG.EMAIL_PASS
    }
});

emailTransporter.verify((error) => {
    if (error) console.error('❌ Email error:', error);
    else console.log('✅ Email service ready');
});

// ============================================
// API ENDPOINTS
// ============================================

// Health check
app.get('/api/health', (req, res) => {
    res.json({ status: 'active', message: 'Shadow Lurkers Veil is active' });
});

// Send confirmation email
app.post('/api/send-email', async (req, res) => {
    try {
        const { email, name, oat, moniker, role } = req.body;
        
        if (!email || !name) {
            return res.status(400).json({ error: 'Missing required fields' });
        }
        
        const mailOptions = {
            from: `"Shadow Lurkers" <${CONFIG.EMAIL_USER}>`,
            to: email,
            subject: '𓃼 Shadow Lurkers - Initiation Received 𓃼',
            html: `
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <title>Shadow Lurkers - Initiation Received</title>
</head>
<body style="margin:0; padding:0; background-color:#050008; font-family:'Courier New', monospace; color:#e0e0e0;">
    <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#050008;">
        <tr>
            <td align="center">
                <table width="600" cellpadding="0" cellspacing="0" style="margin:40px auto; border:2px solid #ff003c; background:#0b0012; box-shadow:0 0 30px rgba(255,0,60,0.3);">
                    <tr>
                        <td align="center" style="padding:30px; background:url('https://i.ibb.co/3515rVy5/file-1439.jpg') center/cover;">
                            <h1 style="margin:0; color:#ff003c; font-size:36px; letter-spacing:4px; text-shadow:0 0 15px #ff003c;">𓃼 SHADOW LURKERS 𓃼</h1>
                            <p style="margin-top:10px; color:#c77dff; font-size:16px;">Initiation Received by the Veil</p>
                        </td>
                    </tr>
                    <tr>
                        <td style="padding:30px;">
                            <p style="font-size:18px; line-height:1.6; color:#ff3366; text-align:center;">☬ THE SHADOWS HAVE ACKNOWLEDGED YOU ☬</p>
                            
                            <p style="font-size:16px; line-height:1.6;">Greetings, <strong style="color:#ff003c;">${name}</strong>,</p>
                            
                            <p style="font-size:16px; line-height:1.6;">Your initiation has been successfully received by the Veil. The Elders have been notified and will review your application shortly.</p>
                            
                            <div style="margin:30px 0; padding:20px; border:1px solid #ff003c; background:#120015; text-align:center;">
                                <p style="margin:0; font-size:14px; color:#aaa;">Your Official Assigned Tag (OAT)</p>
                                <p style="margin:10px 0 0; font-size:24px; color:#ff003c; letter-spacing:2px;">${oat}</p>
                            </div>
                            
                            <div style="margin:30px 0; padding:20px; border:1px solid #c77dff; background:#120015; text-align:center;">
                                <p style="margin:0; font-size:14px; color:#aaa;">Your Shadow Moniker</p>
                                <p style="margin:10px 0 0; font-size:20px; color:#c77dff;">${moniker}</p>
                            </div>
                            
                            <table width="100%" style="margin:20px 0;">
                                <tr>
                                    <td style="padding:10px; border:1px solid #330033;">
                                        <strong style="color:#c77dff;">Shadow Archetype:</strong> ${role}
                                    </td>
                                </tr>
                            </table>
                            
                            <p style="font-size:16px; line-height:1.6;">What happens next:</p>
                            <ul style="color:#bbb; line-height:1.8;">
                                <li>The Elders will convene to review your application</li>
                                <li>You will receive a verdict via email within 24-48 hours</li>
                                <li>If approved, you'll receive further instructions for joining the Veil</li>
                                <li>Your OAT will be permanently recorded in the Silent Ledger</li>
                            </ul>
                            
                            <p style="font-size:14px; color:#c77dff; text-align:center; margin:30px 0;">
                                "The shadows remember every soul that passes through the Veil."
                            </p>
                            
                            <p style="font-size:14px; color:#888; text-align:center;">
                                𓃼 Stand vigilant. The Veil watches. 𓃼
                            </p>
                        </td>
                    </tr>
                    <tr>
                        <td align="center" style="padding:20px; background:#08000d; color:#555; font-size:12px;">
                            𓃼≛⃝͙𓃼 Shadow Lurkers Network 𓃼≛⃝͙𓃼<br>
                            This message was generated automatically by the Veil.
                        </td>
                    </tr>
                </table>
            </td>
        </tr>
    </table>
</body>
</html>
            `
        };
        
        await emailTransporter.sendMail(mailOptions);
        
        // Save to database
        db.run(`INSERT INTO initiates (name, age, gender, phone, email, telegram, moniker, role, skills, oat)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                [name, req.body.age, req.body.gender, req.body.phone, email, req.body.telegram, moniker, role, req.body.skills, oat]);
        
        res.json({ success: true, message: 'Email sent and record saved' });
        
    } catch (error) {
        console.error('Email error:', error);
        res.status(500).json({ error: 'Failed to send email' });
    }
});

// ============================================
// START SERVER
// ============================================
app.listen(PORT, () => {
    console.log(`
╔══════════════════════════════════════════════╗
   𓃼 SHADOW LURKERS VEIL SERVER ACTIVATED 𓃼
   Port: ${PORT}
   Email: shadowlurkers229@gmail.com
   Time: ${new Date().toLocaleString()}
╚══════════════════════════════════════════════╝
    `);
});
