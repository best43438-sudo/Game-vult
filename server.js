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
    secret: 'gv-pro-ultra-2026',
    resave: false,
    saveUninitialized: true
}));

mongoose.connect(process.env.MONGO_URI).then(() => console.log("DB Connected"));

// --- SCHEMAS ---
const Config = mongoose.model('Config', new mongoose.Schema({
    announcement: { type: String, default: "Welcome to Game Vault! Tournament starting soon." },
    liveStreamUrl: { type: String, default: "" }
}));

const User = mongoose.model('User', new mongoose.Schema({
    username: String, ff_id: String, whatsapp: String, password: String,
    teamId: { type: mongoose.Schema.Types.ObjectId, ref: 'Team', default: null },
    isTeamApproved: { type: Boolean, default: false },
    isVerified: { type: Boolean, default: false } // NEW: Verified Badge
}));

const Team = mongoose.model('Team', new mongoose.Schema({
    name: { type: String, unique: true },
    banner: { type: String, default: 'https://images.unsplash.com/photo-1542751371-adc38448a05e?w=400' },
    leaderId: mongoose.Schema.Types.ObjectId,
    status: { type: String, default: 'pending' },
    messages: [{ sender: String, text: String, time: { type: Date, default: Date.now } }]
}));

const LOGO_URL = "https://i.ibb.co/XZwKXFDF/logo.png"; 

// --- ROUTES ---
app.get('/', (req, res) => res.sendFile(path.join(__dirname, 'index.html')));

app.post('/api/login', async (req, res) => {
    const { ff_id, password } = req.body;
    const user = await User.findOne({ ff_id, password });
    if (user) { req.session.userId = user._id; res.redirect('/dashboard'); }
    else { res.send('Failed. <a href="/">Back</a>'); }
});

app.get('/dashboard', async (req, res) => {
    if (!req.session.userId) return res.redirect('/');
    const user = await User.findById(req.session.userId).populate('teamId');
    const config = await Config.findOne() || await Config.create({});
    const approvedTeams = await Team.find({ status: 'approved' });

    res.send(`
        <!DOCTYPE html><html><head><meta name="viewport" content="width=device-width, initial-scale=1.0"><script src="https://cdn.tailwindcss.com"></script></head>
        <body class="bg-[#0f172a] text-white p-4 font-sans pb-24">
            <div class="max-w-md mx-auto">
                
                <div class="bg-yellow-500 text-black text-[10px] font-black p-2 rounded-lg mb-4 text-center animate-pulse">
                    📢 ${config.announcement}
                </div>

                <header class="flex items-center justify-between bg-[#1e293b] p-4 rounded-2xl mb-6 border border-slate-700 shadow-2xl">
                    <div class="flex items-center gap-3">
                        <img src="${LOGO_URL}" class="w-10 h-10 object-contain">
                        <div>
                            <h1 class="font-black text-yellow-500 italic text-lg leading-none">GAME VAULT</h1>
                            <p class="text-[9px] text-slate-400">PLAYER: ${user.username} ${user.isVerified ? '<span class="text-yellow-500">✅</span>' : ''}</p>
                        </div>
                    </div>
                    <a href="/logout" class="bg-red-500/20 text-red-400 text-[10px] font-bold px-3 py-1 rounded-lg">EXIT</a>
                </header>

                ${config.liveStreamUrl ? `
                <div class="mb-6 bg-black rounded-2xl overflow-hidden border border-red-600 shadow-lg shadow-red-900/20">
                    <div class="bg-red-600 text-white text-[9px] font-bold px-3 py-1 animate-pulse flex justify-between">
                        <span>LIVE MATCH</span>
                        <span>WATCHING NOW</span>
                    </div>
                    <iframe class="w-full h-48" src="${config.liveStreamUrl.replace("watch?v=", "embed/")}" frameborder="0" allowfullscreen></iframe>
                </div>
                ` : ''}

                <div class="grid grid-cols-2 gap-3 mb-6">
                    <a href="https://take.app/gamevult1" class="bg-blue-600 p-4 rounded-2xl font-black text-center text-xs">DIAMOND STORE</a>
                    <a href="https://wa.me/23233429470" class="bg-green-600 p-4 rounded-2xl font-black text-center text-xs">CONTACT ADMIN</a>
                </div>

                ${user.teamId ? `
                    <div class="bg-[#1e293b] rounded-3xl overflow-hidden border border-yellow-500/20 mb-6">
                        <img src="${user.teamId.banner}" class="w-full h-24 object-cover opacity-60">
                        <div class="p-4 flex justify-between items-center">
                            <h3 class="text-lg font-black text-yellow-500 italic">${user.teamId.name}</h3>
                            <span class="text-[9px] bg-yellow-500/20 text-yellow-500 px-2 py-1 rounded">${user.teamId.status.toUpperCase()}</span>
                        </div>
                    </div>

                    ${user.isTeamApproved ? `
                        <div class="bg-[#1e293b] p-5 rounded-2xl border border-slate-700 mb-6">
                            <h4 class="text-[10px] font-bold text-slate-500 mb-4 uppercase">SQUAD RADIO</h4>
                            <div class="h-40 overflow-y-auto mb-4 space-y-2 pr-2">
                                ${user.teamId.messages.slice(-10).map(m => `
                                    <div class="bg-[#0f172a] p-2 rounded-lg border-l-2 border-yellow-500">
                                        <b class="text-[9px] text-yellow-500">${m.sender}:</b> <span class="text-xs text-slate-300">${m.text}</span>
                                    </div>
                                `).join('') || '<p class="text-xs italic text-slate-600 text-center">No messages...</p>'}
                            </div>
                            <form action="/api/team-chat" method="POST" class="flex gap-2">
                                <input type="text" name="message" placeholder="Type here..." required class="flex-1 bg-[#0f172a] border border-slate-700 rounded-xl p-3 text-xs">
                                <button class="bg-yellow-500 text-black px-4 rounded-xl font-black text-xs">SEND</button>
                            </form>
                        </div>
                    ` : ''}
                ` : `
                    <div class="bg-[#1e293b] p-6 rounded-3xl border border-slate-700 text-center">
                        <p class="text-xs text-slate-400 mb-4 italic">You are currently a Free Agent</p>
                        <div class="space-y-3">
                            ${approvedTeams.map(t => `<div class="flex justify-between items-center bg-[#0f172a] p-3 rounded-2xl border border-slate-800">
                                <span class="text-xs font-bold">${t.name}</span>
                                <a href="/api/join-team/${t._id}" class="bg-yellow-500 text-black px-4 py-1.5 rounded-xl text-[10px] font-black uppercase">Join</a>
                            </div>`).join('') || '<p class="text-[10px]">No squads active. Create your own!</p>'}
                        </div>
                    </div>
                `}
            </div>
        </body></html>
    `);
});

// --- ADMIN PANEL ---
app.get('/admin-members', async (req, res) => {
    const teams = await Team.find({});
    const users = await User.find({});
    const config = await Config.findOne() || await Config.create({});
    res.send(`
        <body style="background:#000;color:#fff;font-family:sans-serif;padding:20px;">
        <h1>ADMIN CONTROL</h1>
        <form action="/admin/update-config" method="POST" style="background:#222;padding:15px;border-radius:10px;">
            <h3>Update Tournament News</h3>
            <input name="announcement" value="${config.announcement}" style="width:100%;padding:10px;"><br><br>
            <h3>Live Stream URL (YouTube)</h3>
            <input name="liveStreamUrl" value="${config.liveStreamUrl}" placeholder="https://youtube.com/watch?v=..." style="width:100%;padding:10px;"><br><br>
            <button type="submit" style="padding:10px;background:yellow;font-weight:bold;">UPDATE WEBSITE</button>
        </form>

        <h2>TEAMS</h2>
        ${teams.map(t => `<p>${t.name} - <a href="/admin/approve-team/${t._id}" style="color:lime">APPROVE</a> | <a href="/admin/delete-team/${t._id}" style="color:red">DELETE</a></p>`).join('')}
        
        <h2>PLAYERS</h2>
        ${users.map(u => `<p>${u.username} (${u.ff_id}) - ${u.isVerified ? 'VERIFIED' : `<a href="/admin/verify-user/${u._id}" style="color:cyan">VERIFY ✅</a>`}</p>`).join('')}
        </body>
    `);
});

// --- API ACTIONS ---
app.post('/admin/update-config', async (req, res) => {
    await Config.findOneAndUpdate({}, { announcement: req.body.announcement, liveStreamUrl: req.body.liveStreamUrl });
    res.redirect('/admin-members');
});
app.get('/admin/verify-user/:id', async (req, res) => {
    await User.findByIdAndUpdate(req.params.id, { isVerified: true });
    res.redirect('/admin-members');
});
app.get('/admin/approve-team/:id', async (req, res) => {
    await Team.findByIdAndUpdate(req.params.id, { status: 'approved' });
    res.redirect('/admin-members');
});
app.get('/admin/delete-team/:id', async (req, res) => {
    await User.updateMany({ teamId: req.params.id }, { teamId: null, isTeamApproved: false });
    await Team.findByIdAndDelete(req.params.id);
    res.redirect('/admin-members');
});

app.post('/api/team-chat', async (req, res) => {
    const user = await User.findById(req.session.userId);
    if (user && user.teamId && user.isTeamApproved) {
        await Team.findByIdAndUpdate(user.teamId, { $push: { messages: { sender: user.username, text: req.body.message } } });
    }
    res.redirect('/dashboard');
});

app.get('/api/join-team/:id', async (req, res) => {
    await User.findByIdAndUpdate(req.session.userId, { teamId: req.params.id, isTeamApproved: false });
    res.redirect('/dashboard');
});

app.get('/logout', (req, res) => { req.session.destroy(); res.redirect('/'); });
app.listen(process.env.PORT || 3000);
