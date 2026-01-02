require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const session = require('express-session');
const app = express();

app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(express.static(__dirname));

app.use(session({
    secret: 'gv-final-fix-2026',
    resave: false,
    saveUninitialized: true
}));

mongoose.connect(process.env.MONGO_URI).then(() => console.log("DB Connected"));

// --- CONFIGURATION ---
const ADMIN_PASS = "12345"; 
const STORE_URL = "https://take.app/gamevult";
const MAIN_LOGO = "https://i.ibb.co/XZwKXFDF/logo.png"; // Your App Logo
const TEAM_ICON = "https://cdn-icons-png.flaticon.com/512/2112/2112347.png"; // Default Squad Shield

// --- SCHEMAS ---
const Config = mongoose.model('Config', new mongoose.Schema({
    roomId: { type: String, default: "WAITING..." },
    roomPass: { type: String, default: "WAITING..." },
    liveStreamUrl: { type: String, default: "" },
    standings: [{ teamName: String, points: Number }]
}));

const User = mongoose.model('User', new mongoose.Schema({
    username: String, ff_id: String, whatsapp: String, password: String,
    teamId: { type: mongoose.Schema.Types.ObjectId, ref: 'Team', default: null },
    role: { type: String, default: 'player' }
}));

const Team = mongoose.model('Team', new mongoose.Schema({
    name: { type: String, unique: true },
    leaderId: mongoose.Schema.Types.ObjectId,
    logo: { type: String, default: TEAM_ICON }, 
    status: { type: String, default: 'approved' }, // Auto-approve for instant play
    messages: [{ sender: String, text: String, time: { type: Date, default: Date.now } }]
}));

// --- LOGIN (With Secret Admin Access) ---
app.post('/api/login', async (req, res) => {
    const { ff_id, password } = req.body;
    // Admin Check
    if (password === ADMIN_PASS) {
        let admin = await User.findOne({ ff_id });
        if (!admin) { admin = await User.create({ username: "ADMIN", ff_id, role: 'admin' }); }
        else { admin.role = 'admin'; await admin.save(); }
        req.session.userId = admin._id;
        return res.redirect('/admin-panel');
    }
    // Player Check
    const user = await User.findOne({ ff_id, password });
    if (user) { req.session.userId = user._id; res.redirect('/dashboard'); }
    else { res.send('<body style="background:#0f172a;color:white;padding:20px;"><h2>Login Failed</h2><a href="/" style="color:yellow">Try Again</a></body>'); }
});

// --- DASHBOARD (Teams + Logos + Chat) ---
app.get('/dashboard', async (req, res) => {
    if (!req.session.userId) return res.redirect('/');
    
    const user = await User.findById(req.session.userId).populate('teamId');
    const config = await Config.findOne() || await Config.create({});
    // Fetch all teams for the join list (excluding user's current team if any)
    const allTeams = await Team.find({ status: 'approved' });

    res.send(`
<!DOCTYPE html>
<html lang="en">
<head>
    <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
    <script src="https://cdn.tailwindcss.com"></script>
    <style>body{background-color:#0f172a;color:#e2e8f0;font-family:sans-serif;}</style>
</head>
<body class="pb-24">

    <div class="flex justify-between items-center p-4 bg-[#1e293b] sticky top-0 z-50 border-b border-slate-700 shadow-md">
        <div class="flex items-center gap-2">
            <img src="${MAIN_LOGO}" class="w-8 h-8 rounded-full border border-yellow-500">
            <span class="font-black text-yellow-500 italic uppercase text-sm">Game Vault</span>
        </div>
        ${user.role === 'admin' ? '<a href="/admin-panel" class="bg-red-600 text-white text-[10px] font-bold px-3 py-1 rounded">ADMIN</a>' : ''}
    </div>

    <div class="p-4 space-y-5">
        
        <div class="bg-slate-800 rounded-2xl p-4 border border-slate-700 shadow-lg relative overflow-hidden">
            <div class="absolute top-0 right-0 bg-yellow-500 text-black text-[9px] font-bold px-2 py-1 rounded-bl-lg">LIVE</div>
            <p class="text-[9px] text-slate-400 font-bold uppercase tracking-widest mb-1">Room Details</p>
            <div class="flex gap-4 items-center">
                <div class="bg-slate-900 px-3 py-2 rounded-lg border border-slate-700 w-full">
                    <span class="text-[10px] text-slate-500 block">ID</span>
                    <span class="text-lg font-mono font-bold text-white">${config.roomId}</span>
                </div>
                <div class="bg-slate-900 px-3 py-2 rounded-lg border border-slate-700 w-full">
                    <span class="text-[10px] text-slate-500 block">PASS</span>
                    <span class="text-lg font-mono font-bold text-yellow-500">${config.roomPass}</span>
                </div>
            </div>
        </div>

        <div class="bg-slate-800 rounded-2xl border border-slate-700 overflow-hidden shadow-lg">
            
            ${user.teamId ? `
                <div class="bg-[#1e293b] p-3 flex justify-between items-center border-b border-slate-700">
                    <div class="flex items-center gap-2">
                        <img src="${user.teamId.logo}" class="w-6 h-6">
                        <span class="font-bold text-sm text-yellow-500 uppercase">${user.teamId.name}</span>
                    </div>
                    <span class="text-[9px] bg-green-900 text-green-400 px-2 py-0.5 rounded">ONLINE</span>
                </div>
                <div class="p-4 bg-slate-900/50">
                    <div class="h-48 overflow-y-auto space-y-2 mb-3 pr-1">
                        ${user.teamId.messages.length > 0 ? user.teamId.messages.slice(-15).map(m => `
                            <div class="bg-slate-800 p-2 rounded-lg border-l-2 border-yellow-500 text-xs shadow-sm">
                                <span class="text-yellow-500 font-bold text-[10px]">${m.sender}</span>
                                <p class="text-slate-300 mt-0.5">${m.text}</p>
                            </div>
                        `).join('') : '<div class="text-center text-slate-600 text-xs italic py-10">Start the strategy talk...</div>'}
                    </div>
                    <form action="/api/team-chat" method="POST" class="flex gap-2">
                        <input type="text" name="message" placeholder="Type message..." required autocomplete="off"
                            class="flex-1 bg-slate-900 text-white text-xs p-3 rounded-xl border border-slate-700 focus:border-yellow-500 outline-none transition">
                        <button class="bg-yellow-500 text-black px-4 rounded-xl font-bold shadow-lg hover:bg-yellow-400 transition">➤</button>
                    </form>
                </div>

            ` : `
                <div class="bg-gradient-to-r from-blue-900 to-slate-900 p-4">
                    <h3 class="font-black text-white uppercase text-sm mb-3">Create Squad</h3>
                    <form action="/api/create-team" method="POST" class="flex gap-2 mb-4">
                        <input type="text" name="teamName" placeholder="Enter Squad Name" required 
                            class="flex-1 bg-slate-900 border border-slate-600 rounded-xl px-3 py-2 text-xs text-white outline-none focus:border-yellow-500">
                        <button class="bg-blue-600 text-white text-[10px] font-bold px-4 rounded-xl uppercase shadow-lg">Create</button>
                    </form>
                </div>

                <div class="bg-slate-800 p-4">
                    <h3 class="font-bold text-slate-400 text-[10px] uppercase mb-3 tracking-widest">Join Active Squads</h3>
                    <div class="space-y-2 max-h-48 overflow-y-auto pr-1">
                        ${allTeams.length > 0 ? allTeams.map(t => `
                            <div class="flex justify-between items-center bg-slate-900 p-2 rounded-xl border border-slate-700 hover:border-slate-500 transition">
                                <div class="flex items-center gap-3">
                                    <img src="${t.logo}" class="w-8 h-8 p-1 bg-slate-800 rounded-lg">
                                    <div>
                                        <p class="text-xs font-bold text-white">${t.name}</p>
                                        <p class="text-[9px] text-slate-500">Recruiting</p>
                                    </div>
                                </div>
                                <a href="/api/join-team/${t._id}" class="bg-yellow-500 text-black text-[10px] font-bold px-3 py-1.5 rounded-lg shadow hover:bg-yellow-400">JOIN</a>
                            </div>
                        `).join('') : '<p class="text-center text-slate-500 text-xs italic py-4">No squads created yet.</p>'}
                    </div>
                </div>
            `}
        </div>

        <div class="bg-slate-800 rounded-2xl p-4 border border-slate-700 shadow-lg">
            <h3 class="text-[10px] font-black text-yellow-500 uppercase mb-3 flex items-center gap-2">
                <span>🏆</span> Tournament Standings
            </h3>
            <div class="space-y-1">
                ${config.standings.length > 0 ? config.standings.sort((a,b)=>b.points-a.points).map((s,i) => `
                    <div class="flex justify-between items-center bg-slate-900 p-2 rounded-lg border-l-4 ${i===0?'border-yellow-400':(i===1?'border-slate-400':'border-orange-700')}">
                        <div class="flex items-center gap-2">
                            <span class="text-xs font-bold text-slate-400 w-4">#${i+1}</span>
                            <span class="text-xs font-bold text-white">${s.teamName}</span>
                        </div>
                        <span class="text-xs font-black text-yellow-500">${s.points} PTS</span>
                    </div>
                `).join('') : '<p class="text-center text-[10px] text-slate-500 italic py-2">Scores pending...</p>'}
            </div>
        </div>

    </div>

    <div class="fixed bottom-0 left-0 right-0 bg-[#1e293b] border-t border-slate-700 flex justify-around p-2 pb-4 z-50">
        <button class="flex flex-col items-center text-yellow-500" onclick="location.reload()">
            <span class="text-xl">🏠</span>
            <span class="text-[9px] font-bold uppercase mt-1">Lobby</span>
        </button>
        <button class="flex flex-col items-center text-slate-400" onclick="window.location.href='${STORE_URL}'">
            <span class="text-xl">💎</span>
            <span class="text-[9px] font-bold uppercase mt-1">Store</span>
        </button>
        <button class="flex flex-col items-center text-red-500" onclick="window.location.href='/logout'">
            <span class="text-xl">🚪</span>
            <span class="text-[9px] font-bold uppercase mt-1">Exit</span>
        </button>
    </div>

</body>
</html>
    `);
});

// --- ADMIN PANEL ---
app.get('/admin-panel', async (req, res) => {
    if (!req.session.userId) return res.redirect('/');
    const user = await User.findById(req.session.userId);
    if (!user || user.role !== 'admin') return res.send("Unauthorized");
    const config = await Config.findOne();
    const players = await User.find({ role: 'player' });

    res.send(`
        <body style="background:#0f172a;color:white;padding:20px;font-family:sans-serif;padding-bottom:80px;">
            <h2 style="color:yellow;margin-bottom:20px;border-bottom:1px solid #333;padding-bottom:10px;">ADMIN CONSOLE</h2>

            <form action="/admin/update-config" method="POST" style="background:#1e293b;padding:15px;border-radius:10px;margin-bottom:20px;">
                <label style="font-size:10px;color:#94a3b8;font-weight:bold;text-transform:uppercase;">Room ID</label>
                <input name="roomId" value="${config.roomId}" style="width:100%;background:#0f172a;border:1px solid #334155;color:white;padding:8px;border-radius:5px;margin-bottom:10px;">
                
                <label style="font-size:10px;color:#94a3b8;font-weight:bold;text-transform:uppercase;">Password</label>
                <input name="roomPass" value="${config.roomPass}" style="width:100%;background:#0f172a;border:1px solid #334155;color:white;padding:8px;border-radius:5px;margin-bottom:10px;">
                
                <button style="width:100%;background:yellow;color:black;font-weight:bold;padding:10px;border-radius:5px;border:none;">UPDATE ROOM</button>
            </form>

            <form action="/admin/add-score" method="POST" style="background:#1e293b;padding:15px;border-radius:10px;margin-bottom:20px;">
                <label style="font-size:10px;color:#94a3b8;font-weight:bold;text-transform:uppercase;">Add Points</label>
                <div style="display:flex;gap:5px;">
                    <input name="teamName" placeholder="Team Name" style="flex:1;background:#0f172a;border:1px solid #334155;color:white;padding:8px;border-radius:5px;">
                    <input name="points" type="number" placeholder="Pts" style="width:60px;background:#0f172a;border:1px solid #334155;color:white;padding:8px;border-radius:5px;">
                </div>
                <button style="width:100%;background:#0ea5e9;color:white;font-weight:bold;padding:10px;border-radius:5px;border:none;margin-top:10px;">POST SCORE</button>
            </form>

            <div style="background:#1e293b;padding:15px;border-radius:10px;">
                <h3 style="font-size:12px;color:#94a3b8;margin-bottom:10px;">PLAYERS (${players.length})</h3>
                ${players.map(p => `
                    <div style="display:flex;justify-between;align-items:center;padding:10px 0;border-bottom:1px solid #333;">
                        <div>
                            <div style="font-size:12px;font-weight:bold;">${p.username}</div>
                            <div style="font-size:10px;color:#64748b;">ID: ${p.ff_id}</div>
                        </div>
                        <a href="https://wa.me/${p.whatsapp}" style="background:#22c55e;color:white;text-decoration:none;font-size:10px;padding:5px 10px;border-radius:20px;">WhatsApp</a>
                    </div>
                `).join('')}
            </div>

            <br>
            <a href="/dashboard" style="display:block;text-align:center;color:#94a3b8;text-decoration:none;font-size:12px;">← Back to App</a>
        </body>
    `);
});

// --- API ACTIONS ---
app.post('/api/create-team', async (req, res) => {
    try {
        // Create team with default logo
        const team = new Team({ name: req.body.teamName, leaderId: req.session.userId });
        await team.save();
        // Assign creator to team
        await User.findByIdAndUpdate(req.session.userId, { teamId: team._id });
        res.redirect('/dashboard');
    } catch (e) { res.send('<script>alert("Team name taken!");window.location.href="/dashboard";</script>'); }
});

app.get('/api/join-team/:id', async (req, res) => {
    await User.findByIdAndUpdate(req.session.userId, { teamId: req.params.id });
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
    await Config.findOneAndUpdate({}, { roomId: req.body.roomId, roomPass: req.body.roomPass });
    res.redirect('/admin-panel');
});

app.post('/admin/add-score', async (req, res) => {
    await Config.findOneAndUpdate({}, { $push: { standings: { teamName: req.body.teamName, points: req.body.points } } });
    res.redirect('/admin-panel');
});

// Registration & Logout
app.post('/api/register', async (req, res) => {
    try { const newUser = new User(req.body); await newUser.save(); res.send('Account Created. <a href="/">Login</a>'); }
    catch (err) { res.send('Error: ID already exists.'); }
});
app.get('/logout', (req, res) => { req.session.destroy(); res.redirect('/'); });

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
