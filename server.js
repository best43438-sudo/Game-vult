require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const session = require('express-session');
const path = require('path');
const app = express();

app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(express.static(__dirname));

// Session Setup
app.use(session({
    secret: 'gamevault-secret-key',
    resave: false,
    saveUninitialized: true
}));

// Database Connection
mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log("Database Connected"))
  .catch(err => console.log("DB Error:", err));

// Models
const User = mongoose.model('User', new mongoose.Schema({
    username: String,
    ff_id: String,
    whatsapp: String,
    password: String,
    teamId: { type: mongoose.Schema.Types.ObjectId, ref: 'Team', default: null }
}));

const Team = mongoose.model('Team', new mongoose.Schema({
    name: { type: String, unique: true },
    leaderId: mongoose.Schema.Types.ObjectId,
    members: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }]
}));

// --- ROUTES ---

app.get('/', (req, res) => res.sendFile(path.join(__dirname, 'index.html')));

// Handle Login
app.post('/api/login', async (req, res) => {
    const { ff_id, password } = req.body;
    const user = await User.findOne({ ff_id, password });
    if (user) {
        req.session.userId = user._id;
        res.redirect('/dashboard');
    } else {
        res.send('Invalid Credentials. <a href="/">Go back</a>');
    }
});

// Handle Team Creation
app.post('/api/create-team', async (req, res) => {
    if (!req.session.userId) return res.redirect('/');
    const { teamName } = req.body;
    try {
        const team = new Team({ name: teamName, leaderId: req.session.userId, members: [req.session.userId] });
        await team.save();
        await User.findByIdAndUpdate(req.session.userId, { teamId: team._id });
        res.redirect('/dashboard');
    } catch (err) { res.send("Name taken. <a href='/dashboard'>Try again</a>"); }
});

// Handle Joining Team
app.post('/api/join-team', async (req, res) => {
    if (!req.session.userId) return res.redirect('/');
    const { teamId } = req.body;
    const team = await Team.findById(teamId);
    if (team.members.length < 6) {
        team.members.push(req.session.userId);
        await team.save();
        await User.findByIdAndUpdate(req.session.userId, { teamId: team._id });
    }
    res.redirect('/dashboard');
});

// --- THE DASHBOARD ---
app.get('/dashboard', async (req, res) => {
    if (!req.session.userId) return res.redirect('/');
    
    const user = await User.findById(req.session.userId).populate('teamId');
    const availablePlayers = await User.find({ teamId: null, _id: { $ne: req.session.userId } });
    const allTeams = await Team.find({});
    const channelLink = "https://whatsapp.com/channel/0029VbBtk6qLtOj3hUikXI0q";

    // Player List UI
    const playerList = availablePlayers.map(p => `
        <div class="flex justify-between items-center bg-slate-800/40 p-3 rounded-lg mb-2 border border-slate-700">
            <div><p class="font-bold text-sm">${p.username}</p><p class="text-[10px] text-slate-500">ID: ${p.ff_id}</p></div>
            <a href="https://wa.me/${p.whatsapp.replace(/\D/g,'')}" class="text-green-400 border border-green-400 text-[10px] px-3 py-1 rounded-full font-bold">MESSAGE</a>
        </div>
    `).join('');

    // Team List UI
    const teamOptions = allTeams.map(t => `<option value="${t._id}">${t.name} (${t.members.length}/6)</option>`).join('');

    res.send(`
        <!DOCTYPE html>
        <html>
        <head>
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <script src="https://cdn.tailwindcss.com"></script>
        </head>
        <body class="bg-slate-950 text-white p-4 font-sans pb-10">
            <div class="max-w-md mx-auto">
                <header class="flex justify-between items-center mb-6 bg-slate-900 p-4 rounded-2xl border border-slate-800 shadow-xl">
                    <h1 class="text-lg font-black text-yellow-500 italic">GAME VAULT</h1>
                    <a href="/logout" class="text-[10px] font-bold bg-red-500/10 text-red-400 px-3 py-1 rounded-lg">EXIT</a>
                </header>

                <a href="${channelLink}" target="_blank" class="block mb-8 p-4 bg-green-600 rounded-2xl text-center shadow-lg transform active:scale-95 transition">
                    <h4 class="font-black text-sm uppercase italic">Official WhatsApp Channel</h4>
                    <p class="text-[10px] opacity-80 uppercase font-bold tracking-widest">Join for Tournament Room IDs</p>
                </a>

                <div class="mb-8 bg-slate-900 p-5 rounded-2xl border border-slate-800">
                    <h3 class="font-black text-xs text-blue-400 uppercase tracking-widest mb-4 italic">Available Players (Message Them)</h3>
                    <div class="max-h-52 overflow-y-auto">${playerList || '<p class="text-xs italic text-slate-600">No free agents...</p>'}</div>
                </div>

                ${user.teamId ? `
                    <div class="bg-slate-800 p-5 rounded-xl border border-yellow-500/50">
                        <h3 class="text-yellow-500 font-black mb-1 uppercase text-lg italic">${user.teamId.name}</h3>
                        <p class="text-[10px] text-slate-500 uppercase font-bold">You are in a Squad</p>
                    </div>
                ` : `
                    <div class="space-y-4">
                        <form action="/api/create-team" method="POST" class="bg-slate-800 p-5 rounded-2xl border border-slate-700">
                            <h3 class="font-bold text-xs mb-3 uppercase">Create a Team</h3>
                            <input type="text" name="teamName" placeholder="Enter Team Name" required class="w-full bg-slate-900 border border-slate-700 p-3 rounded-xl text-xs mb-3">
                            <button class="w-full bg-yellow-500 text-black font-black py-3 rounded-xl text-xs uppercase">Start Squad</button>
                        </form>
                        <form action="/api/join-team" method="POST" class="bg-slate-800 p-5 rounded-2xl border border-slate-700">
                            <h3 class="font-bold text-xs mb-3 uppercase tracking-widest text-slate-400">Join a Squad</h3>
                            <select name="teamId" class="w-full bg-slate-900 border border-slate-700 p-3 rounded-xl text-xs mb-3">${teamOptions || '<option>No teams available</option>'}</select>
                            <button class="w-full bg-white text-black font-black py-3 rounded-xl text-xs uppercase">Join Team</button>
                        </form>
                    </div>
                `}
            </div>
        </body>
        </html>
    `);
});

app.get('/logout', (req, res) => { req.session.destroy(); res.redirect('/'); });

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log('Server Active'));
