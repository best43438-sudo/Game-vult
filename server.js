require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const session = require('express-session');
const app = express();

app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(express.static(__dirname));

app.use(session({
    secret: 'gv-complete-mobile-2026',
    resave: false,
    saveUninitialized: true
}));

mongoose.connect(process.env.MONGO_URI).then(() => console.log("DB Connected"));

// --- SCHEMAS ---
const Config = mongoose.model('Config', new mongoose.Schema({
    announcement: { type: String, default: "Welcome to Game Vault!" },
    roomId: { type: String, default: "---" },
    roomPass: { type: String, default: "---" },
    liveStreamUrl: { type: String, default: "" },
    standings: [{ teamName: String, points: Number }]
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

// --- DASHBOARD ---
app.get('/dashboard', async (req, res) => {
    if (!req.session.userId) return res.redirect('/');
    const user = await User.findById(req.session.userId).populate('teamId');
    const config = await Config.findOne() || await Config.create({});
    const approvedTeams = await Team.find({ status: 'approved' });

    res.send(`
<!DOCTYPE html>
<html lang="en">
<head>
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <script src="https://cdn.tailwindcss.com"></script>
</head>
<body class="bg-[#0f172a] text-slate-200 pb-24">

    <div class="p-4 flex justify-between items-center bg-[#1e293b] sticky top-0 z-50 shadow-md">
        <div class="flex items-center gap-2">
            <img src="${LOGO_URL}" class="w-8 h-8">
            <h1 class="font-black text-yellow-500 text-sm uppercase italic">Game Vault</h1>
        </div>
        ${user.role === 'admin' ? '<a href="/admin-panel" class="bg-red-600 px-3 py-1 rounded text-[10px] font-bold">ADMIN PANEL</a>' : ''}
    </div>

    <div class="p-4 space-y-4">
        
        ${config.liveStreamUrl ? `
        <div class="rounded-2xl overflow-hidden border-2 border-red-600 bg-black shadow-lg shadow-red-900/20">
            <iframe class="w-full h-48" src="${config.liveStreamUrl.replace("watch?v=", "embed/")}" frameborder="0" allowfullscreen></iframe>
        </div>` : ''}

        <div class="bg-slate-800 p-4 rounded-2xl border border-slate-700 flex justify-between items-center">
            <div>
                <p class="text-[9px] text-slate-400 font-bold uppercase">Room Access</p>
                <p class="text-sm font-mono font-bold text-yellow-500">ID: ${config.roomId} | PW: ${config.roomPass}</p>
            </div>
            <div class="bg-green-600 text-white text-[9px] px-2 py-1 rounded font-bold uppercase">Ready</div>
        </div>

        <div class="bg-slate-800 rounded-2xl border border-slate-700 overflow-hidden">
            <div class="bg-slate-700 p-3 text-[10px] font-bold uppercase tracking-widest text-yellow-500">
                ${user.teamId ? \`Squad: \${user.teamId.name}\` : 'Squad Management'}
            </div>
            <div class="p-4">
                ${user.teamId ? \`
                    <div class="h-40 overflow-y-auto space-y-2 mb-4">
                        \${user.teamId.messages.slice(-10).map(m => \`<div class="text-[11px] bg-slate-900 p-2 rounded border-l-2 border-yellow-500"><b>\${m.sender}:</b> \${m.text}</div>\`).join('') || '<p class="text-[10px] text-center text-slate-500 italic">No messages.</p>'}
                    </div>
                    <form action="/api/team-chat" method="POST" class="flex gap-2">
                        <input type="text" name="message" placeholder="Squad Chat..." class="flex-1 bg-slate-900 rounded-lg p-2 text-xs border border-slate-700 outline-none">
                        <button class="bg-yellow-500 text-black px-4 rounded-lg font-bold">➜</button>
                    </form>
                \` : \`
                    <form action="/api/create-team" method="POST" class="mb-4 space-y-2">
                        <input type="text" name="teamName" placeholder="New Squad Name" required class="w-full bg-slate-900 p-2 rounded-lg text-xs border border-slate-700 outline-none">
                        <button class="w-full bg-blue-600 p-2 rounded-lg text-[10px] font-bold uppercase">Register New Squad</button>
                    </form>
                    <div class="border-t border-slate-700 pt-3">
                        <p class="text-[9px] text-slate-500 font-bold uppercase mb-2">Join Available Squad</p>
                        \${approvedTeams.map(t => \`
                            <div class="flex justify-between items-center bg-slate-900 p-2 rounded mb-1">
                                <span class="text-xs font-bold">\${t.name}</span>
                                <a href="/api/join-team/\${t._id}" class="bg-yellow-500 text-black px-3 py-1 rounded text-[9px] font-bold">JOIN</a>
                            </div>
                        \`).join('') || '<p class="text-[10px] text-slate-600">No squads active.</p>'}
                    </div>
                \`}
            </div>
        </div>

        <div class="bg-slate-800 rounded-2xl p-4 border border-slate-700">
            <h3 class="text-[10px] font-black text-yellow-500 uppercase mb-3 tracking-widest">🏆 Leaderboard</h3>
            <div class="space-y-1">
                ${config.standings.sort((a,b) => b.points - a.points).map((s, i) => `
                <div class="flex justify-between items-center bg-slate-900/50 p-2 rounded border-l-2 ${i < 1 ? 'border-yellow-500' : 'border-slate-700'}">
                    <span class="text-xs font-bold">${i+1}. ${s.teamName}</span>
                    <span class="text-[11px] text-yellow-500 font-black">${s.points} PTS</span>
                </div>
                `).join('') || '<p class="text-center text-[10px] text-slate-500 italic">Scores coming soon...</p>'}
            </div>
        </div>
    </div>

    <div class="fixed bottom-0 left-0 right-0 bg-[#1e293b] border-t border-slate-700 flex justify-around p-3">
        <button class="text-yellow-500 text-center"><span class="block text-xl">🏠</span><span class="text-[9px] font-bold">Home</span></button>
        <button onclick="window.location.href='https://take.app/gamevult1'" class="text-slate-400 text-center"><span class="block text-xl">💎</span><span class="text-[9px] font-bold">Store</span></button>
        <button onclick="window.location.href='/logout'" class="text-red-500 text-center"><span class="block text-xl">🚪</span><span class="text-[9px] font-bold">Exit</span></button>
    </div>

</body>
</html>
    `);
});

// --- ADMIN PANEL ---
app.get('/admin-panel', async (req, res) => {
    const user = await User.findById(req.session.userId);
    if (!user || user.role !== 'admin') return res.send("Denied");
    const config = await Config.findOne();
    const pendingTeams = await Team.find({ status: 'pending' });

    res.send(`
        <body style="background:#0f172a;color:#fff;padding:20px;font-family:sans-serif;">
            <h2 style="color:yellow;">ADMIN CONTROL</h2>
            
            <form action="/admin/update-config" method="POST" style="background:#1e293b;padding:15px;border-radius:10px;margin-bottom:20px;">
                <h3>Room & Stream</h3>
                ID: <input name="roomId" value="${config.roomId}" style="width:100%"><br>
                PW: <input name="roomPass" value="${config.roomPass}" style="width:100%"><br>
                Stream: <input name="liveStreamUrl" value="${config.liveStreamUrl}" style="width:100%"><br>
                <button style="background:yellow;padding:10px;margin-top:10px;width:100%;">Update Main</button>
            </form>

            <form action="/admin/add-score" method="POST" style="background:#1e293b;padding:15px;border-radius:10px;margin-bottom:20px;">
                <h3>Add Team Score</h3>
                Name: <input name="teamName" required style="width:100%"><br>
                Points: <input name="points" type="number" required style="width:100%"><br>
                <button style="background:cyan;padding:10px;margin-top:10px;width:100%;">Add Score</button>
            </form>

            <div style="background:#1e293b;padding:15px;border-radius:10px;">
                <h3>Pending Squads</h3>
                ${pendingTeams.map(t => `<p>${t.name} <a href="/admin/approve-team/${t._id}" style="color:lime">[Approve]</a></p>`).join('') || 'None'}
            </div>
            
            <br><a href="/dashboard" style="color:yellow;display:block;text-align:center;">Back to Home</a>
        </body>
    `);
});

// --- BACKEND LOGIC ---
app.post('/api/create-team', async (req, res) => {
    const team = new Team({ name: req.body.teamName, leaderId: req.session.userId });
    await team.save();
    await User.findByIdAndUpdate(req.session.userId, { teamId: team._id, isTeamApproved: true });
    res.redirect('/dashboard');
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

app.post('/admin/update-config', async (req, res) => {
    await Config.findOneAndUpdate({}, { roomId: req.body.roomId, roomPass: req.body.roomPass, liveStreamUrl: req.body.liveStreamUrl });
    res.redirect('/admin-panel');
});

app.post('/admin/add-score', async (req, res) => {
    await Config.findOneAndUpdate({}, { $push: { standings: { teamName: req.body.teamName, points: req.body.points } } });
    res.redirect('/admin-panel');
});

app.get('/admin/approve-team/:id', async (req, res) => {
    await Team.findByIdAndUpdate(req.params.id, { status: 'approved' });
    res.redirect('/admin-panel');
});

app.post('/api/register', async (req, res) => {
    const newUser = new User(req.body); await newUser.save(); res.send('Done! <a href="/">Login</a>');
});

app.post('/api/login', async (req, res) => {
    const user = await User.findOne({ ff_id: req.body.ff_id, password: req.body.password });
    if (user) { req.session.userId = user._id; res.redirect('/dashboard'); } else { res.send('Fail'); }
});

app.get('/logout', (req, res) => { req.session.destroy(); res.redirect('/'); });
app.listen(process.env.PORT || 3000);
