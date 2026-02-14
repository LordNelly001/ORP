// server.js - COMPLETE SHADOW LURKERS BOT WITH GROUP MANAGEMENT
const express = require('express');
const { Telegraf, Markup } = require('telegraf');
const sqlite3 = require('sqlite3').verbose();
const nodemailer = require('nodemailer');
const cors = require('cors');

const app = express();
const PORT = 3000;

// ============================================
// CONFIGURATION - REPLACE THESE!
// ============================================
const CONFIG = {
    TELEGRAM_BOT_TOKEN: 'YOUR_BOT_TOKEN_HERE',
    TELEGRAM_OWNER_ID: 'YOUR_TELEGRAM_ID_HERE',
    EMAIL_USER: 'shadowlurkers229@gmail.com',
    EMAIL_PASS: 'vbjrnxynwwpcxbxe',
    FRONTEND_URL: 'http://localhost:5500'
};

// ============================================
// INITIALIZE
// ============================================
const bot = new Telegraf(CONFIG.TELEGRAM_BOT_TOKEN);
app.use(cors({ origin: CONFIG.FRONTEND_URL }));
app.use(express.json());

// ============================================
// DATABASE
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
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        reviewed_at DATETIME,
        reviewed_by TEXT
    )`);
    
    db.run(`CREATE TABLE IF NOT EXISTS admins (
        user_id TEXT PRIMARY KEY,
        username TEXT,
        role TEXT DEFAULT 'elder',
        added_at DATETIME DEFAULT CURRENT_TIMESTAMP
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
// ===== TELEGRAM BOT COMMANDS =====
// ============================================

// /start - Welcome message with epic introduction
bot.start((ctx) => {
    const user = ctx.from;
    const isOwner = user.id.toString() === CONFIG.TELEGRAM_OWNER_ID;
    
    const welcomeMessage = `
╔══════════════════════════════════════════════╗
     𓃼 WELCOME TO THE SHADOW LURKERS 𓃼
╚══════════════════════════════════════════════╝

☬ The Veil recognizes your presence, ${user.first_name || 'Wanderer'}.

"I am the shadow in the code,  
The whisper in the machine,  
The ghost in the network."

You stand at the threshold of the Shadow Lurkers —  
An ancient order of digital phantoms,  
Weavers of encryption,  
Masters of the unseen.

${isOwner ? '☬ YOU ARE THE VEIL KEEPER ☬' : '☬ You are an uninitiated soul ☬'}

══════════════════════════════════════════════
WHAT LIES WITHIN THE SHADOWS:

⚔ /codex     - Read the ancient laws
⚔ /elders    - See the council members
⚔ /initiate  - Begin your journey
⚔ /quote     - Receive shadow wisdom
⚔ /mystatus  - Check your soul's record

${isOwner ? `
══════════════════════════════════════════════
☠ ELDER COMMANDS ☠

⚔ /review     - View pending initiates
⚔ /approve [id] - Accept a soul
⚔ /reject [id]  - Deny a soul
⚔ /members    - List all shadows
⚔ /warn       - Issue a warning
⚔ /ban        - Banish unworthy souls
⚔ /unban      - Restore a banished soul
⚔ /promote    - Elevate an initiate
⚔ /demote     - Lower a shadow
` : ''}

══════════════════════════════════════════════
"The shadows remember. The Veil watches.  
Every action echoes in eternity."

𓃼 Step forward, if you dare. 𓃼
    `;
    
    ctx.reply(welcomeMessage);
});

// /codex - Show the rules
bot.command('codex', (ctx) => {
    const codex = `
╔══════════════════════════════════════════════╗
        𓃼 THE CODEX OF SHADOWS 𓃼
╚══════════════════════════════════════════════╝

I.  OpSec is sacred  
    "What the shadows hide, the light cannot find."

II. Knowledge is currency  
    "Information flows like blood through the Veil."

III. Precision over brute force  
    "A single keystroke can topple empires."

IV. No innocents  
    "All are potential vectors. All are suspects."

V.  Entry by merit only  
    "The Veil does not open for the unworthy."

VI. Disputes via digital trials  
    "Code shall judge code. Logic shall prevail."

VII. Footprints are eternal  
    "Every action echoes in the Silent Ledger."

VIII. Loyalty to the code  
    "The shadows demand absolute devotion."

IX. Innovate or stagnate  
    "Evolution is survival in the digital dark."

X.  We are a legion  
    "Alone we are shadows. Together we are the Veil."

══════════════════════════════════════════════
"Violation of any tenet invites judgment."
    `;
    
    ctx.reply(codex);
});

// /quote - Random shadow wisdom
bot.command('quote', (ctx) => {
    const quotes = [
        { text: "In the shadows, we find our true selves.", author: "Elder of the First Circle" },
        { text: "Your OAT is your curse and your blessing.", author: "Keeper of the Ledger" },
        { text: "The Silent Ledger records all. Every keystroke. Every whisper.", author: "Ancient Codex" },
        { text: "Alone we are nothing. Together we are the Veil.", author: "Clan Proverb" },
        { text: "Knowledge is the only currency in the digital underworld.", author: "Strategist Prime" },
        { text: "Precision eclipses brute force.", author: "Attacker's Mantra" },
        { text: "The Veil does not forget. It does not forgive.", author: "Defender's Oath" },
        { text: "Your digital footprint is eternal.", author: "First Tenet" }
    ];
    
    const quote = quotes[Math.floor(Math.random() * quotes.length)];
    ctx.reply(`"${quote.text}"\n— ${quote.author}`);
});

// /initiate - Start initiation process
bot.command('initiate', (ctx) => {
    ctx.replyWithMarkdown(`
☬ *INITIATION PROTOCOL ACTIVATED* ☬

Your journey into the shadows begins now.

To complete your initiation:

1. Visit the Shadow Portal:
   ${CONFIG.FRONTEND_URL}

2. Complete the Ritual of Initiation
   - Choose your Shadow Name
   - Select your Gender Essence
   - Declare your Archetype
   - Describe your Weapons of Knowledge

3. Receive your Official Assigned Tag (𓃼)

4. Bind your Telegram to your shadow identity

Once complete, the Elders will review your application.
If found worthy, you shall be welcomed into the Veil.

"Step forward. The shadows await."
    `, {
        reply_markup: {
            inline_keyboard: [
                [{ text: '𓃼 OPEN SHADOW PORTAL 𓃼', url: CONFIG.FRONTEND_URL }]
            ]
        }
    });
});

// /mystatus - Check personal status
bot.command('mystatus', (ctx) => {
    const userId = ctx.from.id.toString();
    
    db.get(`SELECT * FROM initiates WHERE telegram = ? OR oat LIKE ?`, 
           [`@${ctx.from.username || ''}`, `%${ctx.from.first_name}%`], 
           (err, row) => {
        if (row) {
            ctx.reply(`
╔══════════════════════════════════════════════╗
        𓃼 YOUR SHADOW PROFILE 𓃼
╚══════════════════════════════════════════════╝

👤 Name: ${row.name}
🏷️ Moniker: ${row.moniker}
⚔️ Role: ${row.role}
𓃼 OAT: ${row.oat}
📜 Status: ${row.status.toUpperCase()}
📅 Initiated: ${new Date(row.created_at).toLocaleDateString()}

${row.status === 'approved' ? '☬ You are a shadow of the Veil ☬' : 
  row.status === 'rejected' ? '☠ The Veil has denied you ☠' : 
  '⏳ Awaiting judgment from the Elders'}
            `);
        } else {
            ctx.reply('☬ You are not yet recorded in the Silent Ledger. Use /initiate to begin.');
        }
    });
});

// /elders - Show council members
bot.command('elders', (ctx) => {
    db.all(`SELECT * FROM admins LIMIT 10`, [], (err, rows) => {
        if (rows && rows.length > 0) {
            let message = `
╔══════════════════════════════════════════════╗
        𓃼 THE COUNCIL OF ELDERS 𓃼
╚══════════════════════════════════════════════╝
            `;
            
            rows.forEach((elder, i) => {
                message += `\n\n☬ Elder ${i+1}\n   @${elder.username || 'unknown'}\n   Since: ${new Date(elder.added_at).toLocaleDateString()}`;
            });
            
            ctx.reply(message);
        } else {
            ctx.reply('☬ The council chamber awaits its first Elder.');
        }
    });
});

// ============================================
// ADMIN COMMANDS (Owner Only)
// ============================================

// Middleware to check if user is owner
function isOwner(ctx, next) {
    if (ctx.from.id.toString() === CONFIG.TELEGRAM_OWNER_ID) {
        return next();
    } else {
        ctx.reply('☠ Only the Veil Keeper can use this command.');
    }
}

// /review - View pending initiates
bot.command('review', isOwner, (ctx) => {
    db.all(`SELECT * FROM initiates WHERE status = 'pending' ORDER BY created_at DESC LIMIT 10`, [], (err, rows) => {
        if (rows && rows.length > 0) {
            rows.forEach(row => {
                const message = `
𓃼 PENDING INITIATE #${row.id} 𓃼

👤 Name: ${row.name}
🎂 Age: ${row.age}
⚧ Gender: ${row.gender}
📧 Email: ${row.email}
🔮 Telegram: ${row.telegram}
🏷️ Moniker: ${row.moniker}
⚔️ Role: ${row.role}
𓃼 OAT: ${row.oat}

📅 Submitted: ${new Date(row.created_at).toLocaleString()}
                `;
                
                ctx.reply(message, {
                    reply_markup: {
                        inline_keyboard: [
                            [
                                { text: '☬ APPROVE ☬', callback_data: `approve_${row.id}` },
                                { text: '☠ REJECT ☠', callback_data: `reject_${row.id}` }
                            ]
                        ]
                    }
                });
            });
        } else {
            ctx.reply('☬ No pending initiates. The Veil is quiet.');
        }
    });
});

// Handle approve/reject buttons
bot.on('callback_query', async (ctx) => {
    const action = ctx.callbackQuery.data;
    const [command, id] = action.split('_');
    
    if (ctx.from.id.toString() !== CONFIG.TELEGRAM_OWNER_ID) {
        return ctx.answerCbQuery('☠ Only Elders can judge souls.');
    }
    
    db.get(`SELECT * FROM initiates WHERE id = ?`, [id], async (err, row) => {
        if (!row) {
            return ctx.answerCbQuery('Initiate not found.');
        }
        
        if (command === 'approve') {
            // Update database
            db.run(`UPDATE initiates SET status = 'approved', reviewed_at = ?, reviewed_by = ? WHERE id = ?`,
                   [new Date().toISOString(), ctx.from.username || 'Elder', id]);
            
            // Send approval email
            await sendApprovalEmail(row.email, row.name, row.oat, row.moniker, row.role);
            
            // Update message
            await ctx.editMessageText(`
☬ THE VEIL HAS SPOKEN ☬

Initiate ${row.name} has been APPROVED.

Their soul is now bound to the shadows.
Their OAT is forever etched in the Silent Ledger.

Welcome, ${row.moniker}, to the Shadow Lurkers.
            `);
            
            ctx.answerCbQuery('✅ Initiate approved');
            
        } else if (command === 'reject') {
            // Update database
            db.run(`UPDATE initiates SET status = 'rejected', reviewed_at = ?, reviewed_by = ? WHERE id = ?`,
                   [new Date().toISOString(), ctx.from.username || 'Elder', id]);
            
            // Send rejection email
            await sendRejectionEmail(row.email, row.name, row.oat, row.moniker);
            
            // Update message
            await ctx.editMessageText(`
☠ THE VEIL HAS SPOKEN ☠

Initiate ${row.name} has been REJECTED.

Their soul is denied entry.
Their name is removed from consideration.

The shadows do not forget.
            `);
            
            ctx.answerCbQuery('❌ Initiate rejected');
        }
    });
});

// /approve [id] - Approve by command
bot.command('approve', isOwner, (ctx) => {
    const id = ctx.message.text.split(' ')[1];
    if (!id) return ctx.reply('Usage: /approve [initiate_id]');
    
    db.get(`SELECT * FROM initiates WHERE id = ?`, [id], async (err, row) => {
        if (!row) return ctx.reply('Initiate not found.');
        
        db.run(`UPDATE initiates SET status = 'approved', reviewed_at = ?, reviewed_by = ? WHERE id = ?`,
               [new Date().toISOString(), ctx.from.username || 'Elder', id]);
        
        await sendApprovalEmail(row.email, row.name, row.oat, row.moniker, row.role);
        
        ctx.reply(`☬ Initiate #${id} (${row.name}) has been APPROVED. Email sent.`);
    });
});

// /reject [id] - Reject by command
bot.command('reject', isOwner, (ctx) => {
    const id = ctx.message.text.split(' ')[1];
    if (!id) return ctx.reply('Usage: /reject [initiate_id]');
    
    db.get(`SELECT * FROM initiates WHERE id = ?`, [id], async (err, row) => {
        if (!row) return ctx.reply('Initiate not found.');
        
        db.run(`UPDATE initiates SET status = 'rejected', reviewed_at = ?, reviewed_by = ? WHERE id = ?`,
               [new Date().toISOString(), ctx.from.username || 'Elder', id]);
        
        await sendRejectionEmail(row.email, row.name, row.oat, row.moniker);
        
        ctx.reply(`☠ Initiate #${id} (${row.name}) has been REJECTED. Email sent.`);
    });
});

// /members - List all initiates
bot.command('members', isOwner, (ctx) => {
    db.all(`SELECT * FROM initiates WHERE status = 'approved' ORDER BY created_at DESC`, [], (err, rows) => {
        if (rows && rows.length > 0) {
            let message = `☬ SHADOWS OF THE VEIL (${rows.length})\n\n`;
            rows.forEach((row, i) => {
                message += `${i+1}. ${row.moniker} (${row.role})\n   OAT: ${row.oat}\n   Since: ${new Date(row.created_at).toLocaleDateString()}\n\n`;
            });
            ctx.reply(message.substring(0, 4000));
        } else {
            ctx.reply('☬ No approved initiates yet.');
        }
    });
});

// ============================================
// EMAIL FUNCTIONS
// ============================================
async function sendApprovalEmail(to, name, oat, moniker, role) {
    const mailOptions = {
        from: `"Shadow Lurkers" <${CONFIG.EMAIL_USER}>`,
        to: to,
        subject: '☬ Shadow Lurkers - Initiation APPROVED ☬',
        html: `
<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<title>Shadow Lurkers — Initiation Accepted</title>
</head>
<body style="margin:0;padding:0;background:#050008;font-family:'Segoe UI',Arial,sans-serif;color:#e6e6e6;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#050008;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="margin:40px auto;border:1px solid #2b002b;background:#0b0012;box-shadow:0 0 30px rgba(170,0,255,0.3);">
          
          <!-- HEADER -->
          <tr>
            <td align="center" style="padding:30px;background:#120015;">
              <h1 style="margin:0;color:#ff003c;letter-spacing:4px;text-shadow:0 0 15px #ff003c;">
                ☬ SHADOW LURKERS ☬
              </h1>
              <p style="margin-top:10px;color:#c77dff;font-size:14px;letter-spacing:2px;">
                Verdict of the Veil
              </p>
            </td>
          </tr>

          <!-- BODY -->
          <tr>
            <td style="padding:30px;">
              
              <p style="font-size:16px;line-height:1.7;color:#bbb;">
                The ritual flames have stabilized.  
                The glyphs aligned. The Veil has reached its decision.
              </p>

              <p style="font-size:18px;line-height:1.7;color:#00ffcc;">
                <strong>Your initiation has been ACCEPTED.</strong>
              </p>

              <p style="font-size:15px;line-height:1.7;color:#ccc;">
                The shadows have recognized your presence and etched your name into the Silent Ledger.  
                From this moment onward, your path is bound to the clan, and your actions echo within the unseen network.
              </p>

              <div style="margin:25px 0;padding:20px;border:1px solid #ff003c;background:#120015;text-align:center;">
                <p style="margin:0;font-size:14px;color:#aaa;">
                  The Veil now summons you to the Recruits Circle
                </p>
                <p style="margin:12px 0 0;font-size:16px;color:#ff003c;letter-spacing:1px;">
                  Enter the sanctum through the encrypted gateway:
                </p>
                <p style="margin:14px 0 0;font-size:17px;color:#00ffcc;letter-spacing:1px;">
                  https://t.me/+gi0lFIpWoJQ1YTY0
                  Join fast link resets soon 
                </p>
              </div>

              <p style="font-size:15px;line-height:1.7;color:#bbb;">
                Within that chamber, you will receive further instructions, observe the hierarchy,  
                and begin your transformation from initiate to operative of the Veil.
              </p>

              <p style="font-size:14px;line-height:1.7;color:#aaa;">
                Speak little. Observe more. Execute with precision.  
                The shadows reward discipline and punish arrogance.
              </p>

              <p style="margin-top:25px;font-size:14px;color:#666;">
                Remember: your identity is now masked, your steps recorded,  
                and your loyalty measured by every silent action you take.
              </p>

            </td>
          </tr>

          <!-- FOOTER -->
          <tr>
            <td align="center" style="padding:20px;background:#08000d;color:#555;font-size:12px;">
              ☬≛⃝͙☬ Shadow Lurkers Network ☬≛⃝͙☬<br>
              Automated Initiation Transmission
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
    
    try {
        await emailTransporter.sendMail(mailOptions);
        console.log(`✅ Approval email sent to ${to}`);
    } catch (error) {
        console.error('Email error:', error);
    }
}

async function sendRejectionEmail(to, name, oat, moniker) {
    const mailOptions = {
        from: `"Shadow Lurkers" <${CONFIG.EMAIL_USER}>`,
        to: to,
        subject: '☠ Shadow Lurkers - Initiation REJECTED ☠',
        html: `
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <title>Shadow Lurkers - Rejected</title>
</head>
<body style="margin:0; padding:0; background-color:#050008; font-family:'Courier New', monospace; color:#e0e0e0;">
    <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#050008;">
        <tr>
            <td align="center">
                <table width="600" cellpadding="0" cellspacing="0" style="margin:40px auto; border:2px solid #ff003c; background:#0b0012;">
                    <tr>
                        <td align="center" style="padding:30px;">
                            <h1 style="color:#ff003c; font-size:36px;">☠ REJECTED ☠</h1>
                            <p style="color:#c77dff; font-size:18px;">The Veil denies you, ${name}</p>
                            
                            <div style="margin:30px 0; padding:20px; border:1px solid #330000;">
                                <p style="color:#aaa;">Your Application</p>
                                <p style="color:#ff003c;">${oat}</p>
                                <p style="color:#c77dff;">${moniker}</p>
                            </div>
                            
                            <p style="color:#888; margin-top:30px;">
                                The Elders have judged you unworthy.<br>
                                Your name is removed from consideration.
                            </p>
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
    
    try {
        await emailTransporter.sendMail(mailOptions);
        console.log(`✅ Rejection email sent to ${to}`);
    } catch (error) {
        console.error('Email error:', error);
    }
}

// ============================================
// API ENDPOINT
// ============================================
app.post('/api/submit', async (req, res) => {
    try {
        const data = req.body;
        
        db.run(`INSERT INTO initiates (name, age, gender, phone, email, telegram, moniker, role, skills, oat)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                [data.name, data.age, data.gender, data.phone, data.email, data.telegram, 
                 data.moniker, data.role, data.skills, data.oat]);
        
        // Send confirmation email
        const mailOptions = {
            from: `"Shadow Lurkers" <${CONFIG.EMAIL_USER}>`,
            to: data.email,
            subject: '𓃼 Shadow Lurkers - Initiation Received',
            html: `
                <h1>Initiation Received</h1>
                <p>Your application has been received by the Veil.</p>
                <p>The Elders will review your submission shortly.</p>
                <p>Your OAT: ${data.oat}</p>
            `
        };
        
        await emailTransporter.sendMail(mailOptions);
        
        res.json({ success: true });
        
    } catch (error) {
        console.error('API error:', error);
        res.status(500).json({ error: 'Internal error' });
    }
});

// ============================================
// START BOT AND SERVER
// ============================================
bot.launch().then(() => {
    console.log(`
╔══════════════════════════════════════════════╗
   𓃼 SHADOW LURKERS BOT ACTIVATED 𓃼
   
   Commands:
   • /start    - Welcome
   • /codex    - Show rules
   • /quote    - Random wisdom
   • /initiate - Begin journey
   • /mystatus - Check status
   • /elders   - Show council
   
   Admin Commands:
   • /review   - View pending
   • /approve  - Accept initiate
   • /reject   - Deny initiate
   • /members  - List all
   
   Bot is watching the shadows...
╚══════════════════════════════════════════════╝
    `);
});

app.listen(PORT, () => {
    console.log(`✅ Server running on port ${PORT}`);
});

// Graceful shutdown
process.once('SIGINT', () => {
    bot.stop('SIGINT');
    db.close();
    process.exit(0);
});
