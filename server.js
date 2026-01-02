// ... (Previous code for schemas and login remains the same) ...

// --- ADMIN PANEL (Updated with Player List) ---
app.get('/admin-panel', async (req, res) => {
    if (!req.session.userId) return res.redirect('/');
    const user = await User.findById(req.session.userId);
    if (!user || user.role !== 'admin') return res.send("Access Denied");
    
    const config = await Config.findOne();
    const pendingTeams = await Team.find({ status: 'pending' });
    const allPlayers = await User.find({ role: 'player' }); // Get all registered players

    res.send(`
        <!DOCTYPE html>
        <html>
        <head>
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <script src="https://cdn.tailwindcss.com"></script>
        </head>
        <body class="bg-[#0f172a] text-white p-4 font-sans pb-20">
            <h2 class="text-xl font-black text-yellow-500 mb-6 uppercase tracking-tighter">Admin Console</h2>
            
            <form action="/admin/update-config" method="POST" class="bg-[#1e293b] p-4 rounded-2xl mb-6 shadow-xl border border-slate-700">
                <p class="text-[10px] font-bold text-slate-400 mb-4 uppercase">Match Control</p>
                <div class="space-y-3">
                    <input name="roomId" value="${config.roomId}" placeholder="Room ID" class="w-full bg-[#0f172a] p-3 rounded-xl text-sm border border-slate-800 outline-none focus:border-yellow-500">
                    <input name="roomPass" value="${config.roomPass}" placeholder="Room Password" class="w-full bg-[#0f172a] p-3 rounded-xl text-sm border border-slate-800 outline-none focus:border-yellow-500">
                    <button type="submit" class="w-full bg-yellow-500 text-black py-3 rounded-xl font-bold uppercase text-xs tracking-widest">Update Live Details</button>
                </div>
            </form>

            <div class="bg-[#1e293b] p-4 rounded-2xl mb-6 shadow-xl border border-slate-700">
                <p class="text-[10px] font-bold text-slate-400 mb-4 uppercase">Registered Players (${allPlayers.length})</p>
                <div class="max-h-64 overflow-y-auto space-y-2">
                    ${allPlayers.map(p => `
                        <div class="flex justify-between items-center bg-[#0f172a] p-3 rounded-xl border border-slate-800">
                            <div>
                                <p class="text-xs font-bold">${p.username}</p>
                                <p class="text-[10px] text-slate-500">ID: ${p.ff_id}</p>
                            </div>
                            <a href="https://wa.me/${p.whatsapp}" target="_blank" class="bg-green-600/20 text-green-500 p-2 rounded-lg text-[10px] font-bold border border-green-600/30">
                                WHATSAPP
                            </a>
                        </div>
                    `).join('') || '<p class="text-xs text-slate-500">No players registered yet.</p>'}
                </div>
            </div>

            <div class="bg-[#1e293b] p-4 rounded-2xl shadow-xl border border-slate-700">
                <p class="text-[10px] font-bold text-slate-400 mb-4 uppercase">Pending Squads</p>
                ${pendingTeams.map(t => `
                    <div class="flex justify-between items-center bg-[#0f172a] p-3 rounded-xl mb-2">
                        <span class="text-xs font-bold">${t.name}</span>
                        <a href="/admin/approve-team/${t._id}" class="bg-blue-600 px-4 py-2 rounded-lg text-[10px] font-bold uppercase">Approve</a>
                    </div>
                `).join('') || '<p class="text-xs text-slate-500">No pending squads.</p>'}
            </div>

            <div class="mt-8 flex flex-col gap-4">
                <a href="/dashboard" class="text-center text-yellow-500 text-xs font-bold uppercase tracking-widest">← Back to Dashboard</a>
                <a href="/logout" class="text-center text-red-500 text-xs font-bold uppercase tracking-widest">Logout Admin</a>
            </div>
        </body>
        </html>
    `);
});
