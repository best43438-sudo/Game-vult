require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const session = require('express-session');
const path = require('path');
const app = express();

app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(express.static(__dirname));

// Login Session Setup
app.use(session({
    secret: 'gamevault-2026-secret',
    resave: false,
    saveUninitialized: true
}));

// Database Connection
mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log("DB Connected"))
  .catch(err => console.log(err));

// Database Schemas
const User = mongoose.model('User', new mongoose.Schema({
    username: String, ff_id: String, whatsapp: String, password: String,
    teamId: { type: mongoose.Schema.Types.ObjectId, ref: 'Team', default: null }
}));

const Team = mongoose.model('Team', new mongoose.Schema({
    name: { type: String, unique: true },
    leaderId: mongoose.Schema.Types.ObjectId,
    members: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }]
}));

// --- ROUTES ---

// Login Logic
app.post('/api/login', async (req, res) => {
    const { ff_id, password } = req.body;
    const user = await User.findOne({ ff_id, password });
    if (user) {
        req.session.userId = user._id;
        res.redirect('/dashboard');
    } else {
        res.send('Login Failed. <a href="/">Try Again</a>');
    }
});

// Create Team Logic
app.post('/api/create-team', async (req, res) => {
    if (!req.session.userId) return res.redirect('/');
    try {
        const team = new Team({ 
            name: req.body.teamName, 
            leaderId: req.session.userId, 
            members: [req.session.userId] 
        });
        await team.save();
        await User.findByIdAndUpdate(req.session.userId, { teamId: team._id });
        res.redirect('/dashboard');
    } catch (e) { res.send("Team Name Taken!"); }
});

// Dashboard
app.get('/dashboard', async (req, res) => {
    if (!req.session.userId) return res.redirect('/');
    
    const user = await User.findById(req.session.userId).populate('teamId');
    const freePlayers = await User.find({ teamId: null, _id: { $ne: req.session.userId } });
    const channelLink = "https://whatsapp.com/channel/0029VbBtk6qLtOj3hUikXI0q";

    const playerListHTML = freePlayers.map(p => `
        <div class="flex justify-between items-center bg-slate-800 p-3 rounded-lg mb-2 border border-slate-700">
            <div><p class="font-bold text-sm">${p.username}</p><p class="text-[10px] text-slate-500">ID: ${p.ff_id}</p></div>
            <a href="https://wa.me/${p.whatsapp.replace(/\D/g,'')}" class="bg-green-600 text-[10px] px-3 py-1 rounded-full font-bold">WHATSAPP</a>
        </div>
    `).join('');

    res.send(`
        <!DOCTYPE html>
        <html>
        <head><meta name="viewport" content="width=device-width, initial-scale=1.0"><script src="https://cdn.tailwindcss.com"></script></head>
        <body class="bg-slate-950 text-white p-4 font-sans">
            <div class="max-w-md mx-auto">
                <div class="flex justify-between items-center mb-6">
                    <h1 class="text-xl font-black text-yellow-500 italic">GAME VAULT</h1>
                    <a href="/logout" class="text-xs text-slate-500">Logout</a>
                </div>

                <a href="${channelLink}" target="_blank" class="block mb-6 p-4 bg-green-600 rounded-2xl text-center shadow-lg">
                    <h4 class="font-black text-sm uppercase italic">Official WhatsApp Channel</h4>
                    <p class="text-[10px] opacity-90 font-bold uppercase tracking-widest">Join for Match IDs</p>
                </a>

                <div class="mb-6 bg-slate-900 p-5 rounded-2xl border border-slate-800">
                    <h3 class="font-black text-xs text-blue-400 uppercase tracking-widest mb-4">Available Players</h3>
                    <div class="max-h-52 overflow-y-auto">${playerListHTML || '<p class="text-xs text-slate-600 italic">Searching for players...</p>'}</div>
                </div>

                ${user.teamId ? `
                    <div class="bg-slate-800 p-5 rounded-xl border border-yellow-500/50">
                        <p class="text-[10px] text-slate-500 uppercase font-bold">Your Squad</p>
                        <h3 class="text-yellow-500 font-black uppercase text-lg italic">${user.teamId.name}</h3>
                    </div>
                ` : `
                    <form action="/api/create-team" method="POST" class="bg-slate-800 p-5 rounded-2xl border border-slate-700">
                        <h3 class="font-bold text-xs mb-3 uppercase">Start a Team</h3>
                        <input type="text" name="teamName" placeholder="Team Name" required class="w-full bg-slate-900 border border-slate-700 p-3 rounded-xl text-xs mb-3 outline-none">
                        <button class="w-full bg-yellow-500 text-black font-black py-3 rounded-xl text-xs uppercase">Create Squad</button>
                    </form>
                `}
            </div>
        </body>
        </html>
    `);
});

app.get('/logout', (req, res) => { req.session.destroy(); res.redirect('/'); });

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log('Live'));
