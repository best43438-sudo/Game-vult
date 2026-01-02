require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const session = require('express-session');
const path = require('path');
const app = express();

app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(express.static(path.join(__dirname)));

app.use(session({
    secret: 'gamevault-2026-secure',
    resave: false,
    saveUninitialized: true
}));

mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log("DB Connected"))
  .catch(err => console.log(err));

const User = mongoose.model('User', new mongoose.Schema({
    username: String, ff_id: String, whatsapp: String, password: String,
    teamId: { type: mongoose.Schema.Types.ObjectId, ref: 'Team', default: null }
}));

const Team = mongoose.model('Team', new mongoose.Schema({
    name: { type: String, unique: true },
    leaderId: mongoose.Schema.Types.ObjectId,
    members: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }]
}));

app.get('/', (req, res) => res.sendFile(path.join(__dirname, 'index.html')));

app.post('/api/login', async (req, res) => {
    const { ff_id, password } = req.body;
    const user = await User.findOne({ ff_id, password });
    if (user) { req.session.userId = user._id; res.redirect('/dashboard'); }
    else { res.send('Invalid Login. <a href="/">Try again</a>'); }
});

app.get('/dashboard', async (req, res) => {
    if (!req.session.userId) return res.redirect('/');
    const user = await User.findById(req.session.userId).populate('teamId');
    const freePlayers = await User.find({ teamId: null, _id: { $ne: req.session.userId } });
    
    // YOUR LINKS
    const channelLink = "https://whatsapp.com/channel/0029VbBtk6qLtOj3hUikXI0q";
    const storeLink = "https://take.app/gamevult1";
    const customerService = "https://wa.me/23233429470";

    const playerList = freePlayers.map(p => `
        <div class="flex justify-between items-center bg-slate-800 p-3 rounded-lg mb-2 border border-slate-700">
            <div><p class="font-bold text-sm">${p.username}</p><p class="text-[10px] text-slate-500">ID: ${p.ff_id}</p></div>
            <a href="https://wa.me/${p.whatsapp.replace(/\D/g,'')}" class="text-green-400 border border-green-400 text-[10px] px-3 py-1 rounded-full font-bold">MESSAGE</a>
        </div>
    `).join('');

    res.send(`
        <!DOCTYPE html>
        <html>
        <head><meta name="viewport" content="width=device-width, initial-scale=1.0"><script src="https://cdn.tailwindcss.com"></script></head>
        <body class="bg-slate-950 text-white p-4 font-sans pb-10">
            <div class="max-w-md mx-auto">
                <header class="flex justify-between items-center mb-6 bg-slate-900 p-4 rounded-2xl border border-slate-800">
                    <h1 class="text-lg font-black text-yellow-500 italic uppercase">Game Vault</h1>
                    <a href="/logout" class="text-[10px] bg-red-500/10 text-red-400 px-3 py-1 rounded-lg font-bold">LOGOUT</a>
                </header>

                <div class="grid grid-cols-2 gap-3 mb-6">
                    <a href="${channelLink}" target="_blank" class="bg-green-600 p-4 rounded-2xl text-center shadow-lg">
                        <p class="font-black text-[10px] uppercase italic">Official</p>
                        <p class="text-xs font-bold">CHANNEL</p>
                    </a>
                    <a href="${storeLink}" target="_blank" class="bg-blue-600 p-4 rounded-2xl text-center shadow-lg">
                        <p class="font-black text-[10px] uppercase italic">Visit Our</p>
                        <p class="text-xs font-bold">STORE</p>
                    </a>
                </div>

                <a href="${customerService}" target="_blank" class="flex items-center justify-center gap-2 mb-6 p-3 border border-slate-700 rounded-xl bg-slate-900/50">
                    <span class="text-green-500">●</span>
                    <p class="text-[10px] font-bold uppercase tracking-widest text-slate-300">Contact Customer Service</p>
                </a>

                <div class="mb-6 bg-slate-900 p-5 rounded-2xl border border-slate-800 shadow-2xl">
                    <h3 class="font-black text-xs text-blue-400 uppercase tracking-widest mb-4">Players for Recruitment</h3>
                    <div class="max-h-52 overflow-y-auto">${playerList || '<p class="text-xs text-slate-600 italic">No free players found...</p>'}</div>
                </div>

                ${user.teamId ? `
                    <div class="bg-slate-800 p-5 rounded-2xl border border-yellow-500/30">
                        <p class="text-[10px] text-slate-500 font-bold uppercase">Active Squad</p>
                        <h3 class="text-yellow-500 font-black uppercase text-xl italic">${user.teamId.name}</h3>
                    </div>
                ` : `
                    <form action="/api/create-team" method="POST" class="bg-slate-800 p-5 rounded-2xl border border-slate-700">
                        <h3 class="font-bold text-xs mb-3 uppercase tracking-widest">Create a Squad</h3>
                        <input type="text" name="teamName" placeholder="Squad Name" required class="w-full bg-slate-900 border border-slate-700 p-3 rounded-xl text-xs mb-3 text-white outline-none">
                        <button class="w-full bg-yellow-500 text-black font-black py-3 rounded-xl text-xs uppercase shadow-lg shadow-yellow-500/20">Register Team</button>
                    </form>
                `}
            </div>
        </body>
        </html>
    `);
});

app.post('/api/create-team', async (req, res) => {
    if (!req.session.userId) return res.redirect('/');
    try {
        const team = new Team({ name: req.body.teamName, leaderId: req.session.userId, members: [req.session.userId] });
        await team.save();
        await User.findByIdAndUpdate(req.session.userId, { teamId: team._id });
        res.redirect('/dashboard');
    } catch (e) { res.send("Name taken! <a href='/dashboard'>Try again</a>"); }
});

app.get('/logout', (req, res) => { req.session.destroy(); res.redirect('/'); });

// SECRET ADMIN ROUTE TO SEE ALL MEMBERS
app.get('/admin-members', async (req, res) => {
    const users = await User.find({}).populate('teamId');
    res.send(`<h1>Total: ${users.length}</h1>` + users.map(u => `<p>${u.username} - ${u.ff_id} - ${u.whatsapp} (${u.teamId ? u.teamId.name : 'No Team'})</p>`).join(''));
});

app.listen(process.env.PORT || 3000, () => console.log('Live'));
