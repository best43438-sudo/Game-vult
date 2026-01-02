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
    secret: 'gv-mobile-complete-2026',
    resave: false,
    saveUninitialized: true
}));

mongoose.connect(process.env.MONGO_URI).then(() => console.log("DB Connected"));

// --- SCHEMAS ---
const Config = mongoose.model('Config', new mongoose.Schema({
    announcement: { type: String, default: "Welcome to Game Vault!" },
    roomId: { type: String, default: "---" },
    roomPass: { type: String, default: "---" }
}));

const User = mongoose.model('User', new mongoose.Schema({
    username: String, ff_id: String, whatsapp: String, password: String,
    teamId: { type: mongoose.Schema.Types.ObjectId, ref: 'Team', default: null },
    isTeamApproved: { type: Boolean, default: false },
    role: { type: String, default: 'player' }
}));

const Team = mongoose.model('Team', new mongoose.Schema({
    name: { type: String, unique: true },
    leaderId: mongoose.Schema.Types.ObjectId,
    status: { type: String, default: 'pending' },
    messages: [{ sender: String, text: String, time: { type: Date, default: Date.now } }]
}));

const LOGO_URL = "https://i.ibb.co/XZwKXFDF/logo.png"; 

// --- MAIN DASHBOARD ---
app.get('/dashboard', async (req, res) => {
    if (!req.session.userId) return res.redirect('/');
    const user = await User.findById(req.session.userId).populate('teamId');
    const config = await Config.findOne() || await Config.create({});
    const approvedTeams = await Team.find({ status: 'approved' });
    const allPlayers = await User.find({}).limit(10);

    res.send(`
<!DOCTYPE html>
<html lang="en">
<head>
    <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=0">
    <script src="https://cdn.tailwindcss.com"></script>
</head>
<body class="bg-[#0f172a] text-slate-200 pb-24 font-sans">

    <div class="p-4 flex justify-between items-center bg-[#1e293b] border-b border-slate-700 sticky top-0 z-50">
        <div class="flex items-center gap-2">
            <img src="${LOGO_URL}" class="w-8 h-8">
            <h1 class="font-black text-yellow-500 text-sm uppercase italic">Game Vault</h1>
        </div>
        ${user.role === 'admin' ? '<a href="/admin-members" class="bg-red-600 px-3 py-1 rounded text-[10px] font-bold">ADMIN</a>' : ''}
    </div>

    <div class="p-4 space-y-4">
        
        <div class="bg-slate-800 rounded-2xl p-4 border border-slate-700">
            <p class="text-[10px] text-slate-400 font-bold uppercase mb-2">Room Details</p>
            <div class="flex justify-between items-center">
                <h2 class="text-lg font-mono font-bold text-yellow-500">ID: ${config.roomId}</h2>
                <h2 class="text-lg font-mono font-bold text-slate-300">PW: ${config.roomPass}</h2>
            </div>
        </div>

        <div class="bg-slate-800 rounded-2xl border border-slate-700 overflow-hidden">
            <div class="bg-slate-700 p-3 text-[10px] font-bold uppercase tracking-widest">
                ${user.teamId ? `Squad: ${user.teamId.name}` : 'Squad Management'}
            </div>
            
            <div class="p-4">
                ${user.teamId ? `
                    <div class="h-48 overflow-y-auto space-y-2 mb-4">
                        ${user.teamId.messages.length > 0 ? 
                            user.teamId.messages.slice(-15).map(m => `<div class="bg-slate-900 p-2 rounded text-xs border-l-2 border-yellow-500"><b>${m.sender}:</b> ${m.text}</div>`).join('') 
                            : '<p class="text-center text-slate-500 text-[10px] py-10 italic">No messages yet.</p>'}
                    </div>
                    <form action="/api/team-chat" method="POST" class="flex gap-2">
                        <input type="text" name="message" placeholder="Type..." class="flex-1 bg-slate-900 rounded-lg p-2 text-xs outline-none">
                        <button class="bg-yellow-500 text-black px-4 rounded-lg font-bold">➜</button>
                    </form>
                ` : `
                    <div class="space-y-4">
                        <form action="/api/create-team" method="POST" class="space-y-2">
                            <input type="text" name="teamName" placeholder="New Squad Name" required class="w-full bg-slate-900 p-2 rounded-lg text-xs outline-none border border-slate-700">
                            <button class="w-full bg-blue-600 p-2 rounded-lg text-xs font-bold uppercase">Create My Squad</button>
                        </form>
                        <div class="border-t border-slate-700 pt-3">
                            <p class="text-[10px] text-slate-500 uppercase font-bold mb-2 text-center">Join Active Squad</p>
                            ${approvedTeams.length > 0 ? approvedTeams.map(t => `
                                <div class="flex justify-between items-center bg-slate-900 p-2 rounded mb-1">
                                    <span class="text-xs font-bold">${t.name}</span>
                                    <a href="/api/join-team/${t._id}" class="bg-yellow-500 text-black px-3 py-1 rounded text-[10px] font-bold">JOIN</a>
                                </div>
                            `).join('') : '<p class="text-[10px] text-center italic">No teams available</p>'}
                        </div>
                    </div>
                `}
            </div>
        </div>

        <div class="bg-slate-800 rounded-2xl p-4 border border-slate-700">
            <p class="text-[10px] text-slate-400 font-bold uppercase mb-3">Online Players</p>
            <div class="grid grid-cols-2 gap-2">
                ${allPlayers.map(p => `
                    <div class="bg-slate-900 p-2 rounded flex items-center gap-2 border border-slate-700">
                        <div class="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                        <span class="text-[10px] truncate">${p.username}</span>
                    </div>
                `).join('')}
            </div>
        </div>
    </div>

    <div class="fixed bottom-0 left-0 right-0 bg-[#1e293b] border-t border-slate-700 flex justify-around p-3">
        <button class="text-yellow-500 text-center">
            <span class="block text-xl">🏠</span>
            <span class="text-[9px] font-bold">Home</span>
        </button>
        <button onclick="window.location.href='https://take.app/gamevult1'" class="text-slate-400 text-center">
            <span class="block text-xl">💎</span>
            <span class="text-[9px] font-bold">Store</span>
        </button>
        <button onclick="window.location.href='/logout'" class="text-red-500 text-center">
            <span class="block text-xl">🚪</span>
            <span class="text-[9px] font-bold">Logout</span>
        </button>
    </div>

</body>
</html>
    `);
});

// --- CORE LOGIC ---
app.post('/api/create-team', async (req, res) => {
    try {
        const team = new Team({ name: req.body.teamName, leaderId: req.session.userId });
        await team.save();
        await User.findByIdAndUpdate(req.session.userId, { teamId: team._id, isTeamApproved: true });
        res.redirect('/dashboard');
    } catch (e) { res.send('Name Taken'); }
});

app.get('/api/join-team/:id', async (req, res) => {
    await User.findByIdAndUpdate(req.session.userId, { teamId: req.params.id, isTeamApproved: false });
    res.redirect('/dashboard');
});

app.post('/api/team-chat', async (req, res) => {
    const user = await User.findById(req.session.userId);
    if (user && user.teamId) {
        await Team.findByIdAndUpdate(user.teamId, { $push: { messages: { sender: user.username, text: req.body.message } } });
    }
    res.redirect('/dashboard');
});

// (Authentication routes same as before)
app.post('/api/register', async (req, res) => {
    const newUser = new User(req.body);
    await newUser.save();
    res.send('Success! <a href="/">Login</a>');
});
app.post('/api/login', async (req, res) => {
    const user = await User.findOne({ff_id: req.body.ff_id, password: req.body.password});
    if (user) { req.session.userId = user._id; res.redirect('/dashboard'); } else { res.send('Fail'); }
});
app.get('/logout', (req, res) => { req.session.destroy(); res.redirect('/'); });

// Make me admin route
app.get('/make-me-admin/:ffid', async (req, res) => {
    await User.findOneAndUpdate({ff_id: req.params.ffid}, {role: 'admin'});
    res.send("Admin Set.");
});

app.listen(process.env.PORT || 3000);
