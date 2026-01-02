require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const session = require('express-session');
const path = require('path');
const app = express();

app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(express.static(__dirname));

app.use(session({
    secret: 'gv-mobile-secure-2026',
    resave: false,
    saveUninitialized: true
}));

mongoose.connect(process.env.MONGO_URI).then(() => console.log("DB Connected"));

// --- SCHEMAS ---
const Config = mongoose.model('Config', new mongoose.Schema({
    announcement: { type: String, default: "Welcome to Game Vault!" },
    liveStreamUrl: { type: String, default: "" },
    roomId: { type: String, default: "---" },
    roomPass: { type: String, default: "---" },
    standings: [{ teamName: String, points: Number, kills: Number }]
}));

const User = mongoose.model('User', new mongoose.Schema({
    username: String, ff_id: String, whatsapp: String, password: String,
    teamId: { type: mongoose.Schema.Types.ObjectId, ref: 'Team', default: null },
    isTeamApproved: { type: Boolean, default: false },
    isVerified: { type: Boolean, default: false },
    role: { type: String, default: 'player' } // Set to 'admin' manually in DB for yourself
}));

const Team = mongoose.model('Team', new mongoose.Schema({
    name: { type: String, unique: true },
    banner: { type: String, default: 'https://images.unsplash.com/photo-1542751371-adc38448a05e?w=400' },
    leaderId: mongoose.Schema.Types.ObjectId,
    status: { type: String, default: 'pending' },
    messages: [{ sender: String, text: String, time: { type: Date, default: Date.now } }]
}));

const LOGO_URL = "https://i.ibb.co/XZwKXFDF/logo.png"; 

// --- MOBILE DASHBOARD ---
app.get('/dashboard', async (req, res) => {
    if (!req.session.userId) return res.redirect('/');
    const user = await User.findById(req.session.userId).populate('teamId');
    const config = await Config.findOne() || await Config.create({});
    const approvedTeams = await Team.find({ status: 'approved' });

    res.send(`
<!DOCTYPE html>
<html>
<head>
    <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=0">
    <script src="https://cdn.tailwindcss.com"></script>
    <style>
        body { background-color: #0f172a; color: white; -webkit-tap-highlight-color: transparent; }
        .bottom-nav { position: fixed; bottom: 0; left: 0; right: 0; background: #1e293b; border-top: 1px solid #334155; display: flex; justify-content: space-around; padding: 12px; z-index: 100; }
        .active-tab { color: #eab308; }
    </style>
</head>
<body class="pb-24">

    <div class="p-4 flex justify-between items-center bg-[#1e293b] sticky top-0 z-50">
        <div class="flex items-center gap-2">
            <img src="${LOGO_URL}" class="w-8 h-8">
            <h1 class="font-black text-yellow-500 italic uppercase">GAME VAULT</h1>
        </div>
        ${user.role === 'admin' ? '<a href="/admin-members" class="text-[10px] bg-red-600 px-2 py-1 rounded font-bold">ADMIN</a>' : ''}
    </div>

    <div class="bg-yellow-500 text-black text-[10px] font-black p-2 text-center uppercase tracking-tighter">
        📢 ${config.announcement}
    </div>

    <div class="p-4 space-y-6">
        <div class="bg-slate-800 rounded-2xl p-4 border border-slate-700 shadow-lg">
            <p class="text-[10px] text-slate-400 font-bold uppercase">Room Information</p>
            <div class="flex justify-between items-end mt-2">
                <div>
                    <h2 class="text-xl font-mono font-bold text-yellow-500">${config.roomId}</h2>
                    <p class="text-xs text-slate-300">PASS: ${config.roomPass}</p>
                </div>
                <button onclick="window.location.href='https://wa.me/?text=Room ID: ${config.roomId} Pass: ${config.roomPass}'" class="bg-green-600 p-2 rounded-lg text-[10px] font-bold">SHARE WA</button>
            </div>
        </div>

        <div class="bg-slate-800 rounded-2xl border border-slate-700 overflow-hidden">
            <div class="bg-slate-700 p-3 text-[10px] font-bold uppercase tracking-widest flex justify-between">
                <span>Squad Radio: ${user.teamId ? user.teamId.name : 'No Squad'}</span>
                <span class="text-green-500">● LIVE</span>
            </div>
            <div class="p-4">
                <div class="h-48 overflow-y-auto space-y-3 mb-4 text-sm">
                    ${user.teamId && user.isTeamApproved ? 
                        user.teamId.messages.slice(-10).map(m => `<div class="bg-slate-900 p-2 rounded-lg border-l-2 border-yellow-500"><b>${m.sender}:</b> ${m.text}</div>`).join('') 
                        : '<p class="text-slate-500 text-center py-10 italic">Join a squad to chat</p>'}
                </div>
                <form action="/api/team-chat" method="POST" class="flex gap-2">
                    <input type="text" name="message" placeholder="Message..." class="flex-1 bg-slate-900 rounded-xl p-3 text-xs outline-none">
                    <button class="bg-yellow-500 text-black px-4 rounded-xl font-bold">➜</button>
                </form>
            </div>
        </div>
    </div>

    <div class="bottom-nav">
        <button class="active-tab text-xs font-bold">🏠<br>Home</button>
        <button onclick="window.location.href='https://take.app/gamevult1'" class="text-slate-400 text-xs font-bold">💎<br>Store</button>
        <button onclick="window.location.href='/logout'" class="text-red-400 text-xs font-bold">🚪<br>Exit</button>
    </div>

</body>
</html>
    `);
});

// --- ADMIN LOGIN FIX ---
// To make yourself admin, you can add this temporary route and visit it once:
app.get('/make-me-admin/:ffid', async (req, res) => {
    await User.findOneAndUpdate({ff_id: req.params.ffid}, {role: 'admin'});
    res.send("You are now Admin. Go back to login.");
});

app.get('/admin-members', async (req, res) => {
    if (!req.session.userId) return res.redirect('/');
    const user = await User.findById(req.session.userId);
    if (user.role !== 'admin') return res.send("Access Denied");
    
    const config = await Config.findOne();
    const teams = await Team.find();
    res.send(`
        <body style="background:#000;color:#fff;padding:20px;font-family:sans-serif;">
            <h1>Admin Panel</h1>
            <form action="/admin/update-room" method="POST">
                ID: <input name="roomId" value="${config.roomId}"><br>
                PASS: <input name="roomPass" value="${config.roomPass}"><br>
                <button>Update Room</button>
            </form>
            <hr>
            <h3>Manage Teams</h3>
            ${teams.map(t => `<p>${t.name} <a href="/admin/approve-team/${t._id}" style="color:lime">[Approve]</a></p>`).join('')}
            <a href="/dashboard">Back to App</a>
        </body>
    `);
});

app.post('/api/register', async (req, res) => {
    const newUser = new User(req.body);
    await newUser.save();
    res.send('Success! <a href="/">Login</a>');
});

app.post('/api/login', async (req, res) => {
    const user = await User.findOne({ff_id: req.body.ff_id, password: req.body.password});
    if (user) { req.session.userId = user._id; res.redirect('/dashboard'); }
    else { res.send('Fail'); }
});

app.post('/admin/update-room', async (req, res) => {
    await Config.findOneAndUpdate({}, {roomId: req.body.roomId, roomPass: req.body.roomPass});
    res.redirect('/admin-members');
});

app.get('/logout', (req, res) => { req.session.destroy(); res.redirect('/'); });
app.listen(process.env.PORT || 3000);
