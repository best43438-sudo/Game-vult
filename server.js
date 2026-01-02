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
    secret: 'gv-pro-layout-2026',
    resave: false,
    saveUninitialized: true
}));

mongoose.connect(process.env.MONGO_URI).then(() => console.log("DB Connected"));

// --- SCHEMAS ---
const Config = mongoose.model('Config', new mongoose.Schema({
    announcement: { type: String, default: "Welcome to Game Vault!" },
    liveStreamUrl: { type: String, default: "" },
    roomId: { type: String, default: "---" },
    roomPass: { type: String, default: "---" }
}));

const User = mongoose.model('User', new mongoose.Schema({
    username: String, ff_id: String, whatsapp: String, password: String,
    teamId: { type: mongoose.Schema.Types.ObjectId, ref: 'Team', default: null },
    isTeamApproved: { type: Boolean, default: false },
    isVerified: { type: Boolean, default: false }
}));

const Team = mongoose.model('Team', new mongoose.Schema({
    name: { type: String, unique: true },
    banner: { type: String, default: 'https://images.unsplash.com/photo-1542751371-adc38448a05e?w=400' },
    leaderId: mongoose.Schema.Types.ObjectId,
    status: { type: String, default: 'pending' },
    messages: [{ sender: String, text: String, time: { type: Date, default: Date.now } }]
}));

const LOGO_URL = "https://i.ibb.co/XZwKXFDF/logo.png"; 

// --- DASHBOARD ROUTE ---
app.get('/dashboard', async (req, res) => {
    if (!req.session.userId) return res.redirect('/');
    const user = await User.findById(req.session.userId).populate('teamId');
    const config = await Config.findOne() || await Config.create({});
    const allPlayers = await User.find({}).limit(15); // For the "Player List" column
    const approvedTeams = await Team.find({ status: 'approved' });

    res.send(`
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <script src="https://cdn.tailwindcss.com"></script>
    <style>
        body { background-color: #1a1f2b; color: #e2e8f0; font-family: 'Inter', sans-serif; }
        .sidebar { background-color: #111827; width: 240px; height: 100vh; position: fixed; border-right: 1px solid #1f2937; }
        .main-content { margin-left: 240px; padding: 2rem; }
        .card { background-color: #1f2937; border: 1px solid #374151; border-radius: 0.5rem; }
        .btn-blue { background-color: #3b82f6; color: white; padding: 0.5rem 1rem; border-radius: 0.25rem; font-weight: 600; }
        .btn-yellow { background-color: #eab308; color: black; padding: 0.5rem 1rem; border-radius: 0.25rem; font-weight: 600; }
    </style>
</head>
<body>

    <div class="sidebar flex flex-col p-4">
        <div class="flex items-center gap-2 mb-10">
            <img src="${LOGO_URL}" class="w-8 h-8">
            <h1 class="text-xl font-bold tracking-tighter text-yellow-500">GAME VAULT</h1>
        </div>
        
        <nav class="space-y-4 text-sm font-medium text-slate-400">
            <a href="#" class="flex items-center gap-3 text-white bg-slate-800 p-2 rounded-lg">📊 Dashboard</a>
            <a href="#" class="flex items-center gap-3 hover:text-white p-2">🎮 Matches</a>
            <a href="#" class="flex items-center gap-3 hover:text-white p-2">🏆 Standings</a>
            <a href="https://take.app/gamevult1" class="flex items-center gap-3 hover:text-white p-2">💎 Store</a>
            <a href="/logout" class="flex items-center gap-3 text-red-400 p-2 mt-20">🚪 Logout</a>
        </nav>
    </div>

    <div class="main-content">
        <div class="flex justify-between items-center mb-8 border-b border-slate-700 pb-4">
            <h2 class="text-2xl font-bold">Tournament Control</h2>
            <div class="flex gap-4">
                <button class="btn-blue text-sm">Join Match</button>
                <div class="flex items-center gap-2">
                    <span class="text-xs text-slate-400">${user.username}</span>
                    <div class="w-8 h-8 bg-slate-700 rounded-full flex items-center justify-center">👤</div>
                </div>
            </div>
        </div>

        <div class="grid grid-cols-12 gap-6">
            
            <div class="col-span-8 space-y-6">
                <div class="card p-4 flex justify-between items-center border-l-4 border-blue-500">
                    <div>
                        <p class="text-[10px] uppercase text-slate-500 font-bold">Live Room Details</p>
                        <p class="text-lg font-mono">ID: ${config.roomId} | PASS: ${config.roomPass}</p>
                    </div>
                    <div class="text-right">
                        <p class="text-[10px] text-green-500 font-bold">STATUS</p>
                        <p class="text-sm">WAITING FOR START</p>
                    </div>
                </div>

                <div class="card overflow-hidden">
                    <div class="bg-slate-800/50 p-3 border-b border-slate-700 font-bold text-xs uppercase">Your Squad Management</div>
                    <div class="p-6">
                        ${user.teamId ? `
                            <div class="flex items-center justify-between mb-4">
                                <h3 class="text-xl font-bold text-yellow-500 uppercase">${user.teamId.name}</h3>
                                <span class="bg-blue-500/10 text-blue-500 text-[10px] px-2 py-1 rounded">APPROVED</span>
                            </div>
                            <div class="h-60 bg-slate-900/50 rounded-lg p-4 mb-4 space-y-3 overflow-y-auto text-sm border border-slate-800">
                                ${user.teamId.messages.slice(-10).map(m => `
                                    <div class="flex gap-2">
                                        <span class="font-bold text-yellow-500">${m.sender}:</span>
                                        <span class="text-slate-300">${m.text}</span>
                                    </div>
                                `).join('') || '<p class="text-slate-600 italic">No messages in squad chat...</p>'}
                            </div>
                            <form action="/api/team-chat" method="POST" class="flex gap-2">
                                <input type="text" name="message" placeholder="Message your squad..." class="flex-1 bg-slate-800 border border-slate-700 rounded p-2 text-sm outline-none">
                                <button class="btn-yellow text-sm">SEND</button>
                            </form>
                        ` : `
                            <p class="text-slate-400 mb-4">You are not in a team. Join an active squad below.</p>
                            <div class="grid grid-cols-2 gap-4">
                                ${approvedTeams.map(t => `
                                    <div class="bg-slate-800 p-3 rounded flex justify-between items-center border border-slate-700">
                                        <span class="font-bold text-xs">${t.name}</span>
                                        <a href="/api/join-team/${t._id}" class="text-[10px] bg-white text-black px-2 py-1 rounded font-bold">JOIN</a>
                                    </div>
                                `).join('')}
                            </div>
                        `}
                    </div>
                </div>
            </div>

            <div class="col-span-4">
                <div class="card">
                    <div class="bg-slate-800/50 p-3 border-b border-slate-700 font-bold text-xs uppercase">Active Players</div>
                    <div class="p-2 space-y-1">
                        ${allPlayers.map(p => `
                            <div class="flex items-center gap-3 p-2 hover:bg-slate-800/50 rounded-lg transition-colors">
                                <div class="w-8 h-8 bg-slate-700 rounded-full flex items-center justify-center text-[10px]">👤</div>
                                <div class="flex-1">
                                    <p class="text-xs font-bold">${p.username} ${p.isVerified ? '✅' : ''}</p>
                                    <p class="text-[10px] text-slate-500 italic">ID: ${p.ff_id}</p>
                                </div>
                                <a href="https://wa.me/${p.whatsapp}" class="text-green-500 text-[10px]">WA</a>
                            </div>
                        `).join('')}
                    </div>
                    <div class="p-3 text-center border-t border-slate-700">
                        <button class="text-[10px] text-blue-400 hover:underline">View All Players</button>
                    </div>
                </div>
            </div>

        </div>
    </div>

</body>
</html>
    `);
});

// --- KEEP OTHER API ROUTES FROM PREVIOUS VERSION ---
app.post('/api/register', async (req, res) => {
    try { const newUser = new User(req.body); await newUser.save(); res.send('Done! <a href="/">Login</a>'); } catch (e) { res.send('Error'); }
});
app.post('/api/login', async (req, res) => {
    const user = await User.findOne({ ff_id: req.body.ff_id, password: req.body.password });
    if (user) { req.session.userId = user._id; res.redirect('/dashboard'); } else { res.send('Fail'); }
});
app.post('/api/team-chat', async (req, res) => {
    const user = await User.findById(req.session.userId);
    if (user && user.teamId) { await Team.findByIdAndUpdate(user.teamId, { $push: { messages: { sender: user.username, text: req.body.message } } }); }
    res.redirect('/dashboard');
});
app.get('/logout', (req, res) => { req.session.destroy(); res.redirect('/'); });
app.listen(process.env.PORT || 3000);
