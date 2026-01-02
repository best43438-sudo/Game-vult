// --- Updated Routes for Login & Register ---

// Handle Registration
app.post('/api/register', async (req, res) => {
    try {
        const { username, ff_id, whatsapp, password } = req.body;
        const existing = await User.findOne({ ff_id });
        if (existing) return res.send("ID already registered. <a href='/'>Go back</a>");

        const newUser = new User({ username, ff_id, whatsapp, password });
        await newUser.save();
        res.send("Registration Successful! <a href='/'>Login now</a>");
    } catch (err) {
        console.error(err);
        res.status(500).send("Registration failed. Check your database connection.");
    }
});

// Handle Login
app.post('/api/login', async (req, res) => {
    try {
        const { ff_id, password } = req.body;
        const user = await User.findOne({ ff_id, password });

        if (user) {
            res.send(`
                <body style="background:#0f172a; color:white; text-align:center; padding:50px; font-family:sans-serif;">
                    <h1 style="color:#facc15">Welcome, ${user.username}!</h1>
                    <p>Free Fire ID: ${user.ff_id}</p>
                    <div style="background:#1e293b; padding:20px; border-radius:10px; margin-top:20px;">
                        <h3>Your Dashboard</h3>
                        <p>Status: Registered</p>
                    </div>
                    <br><a href="/" style="color:#94a3b8;">Logout</a>
                </body>
            `);
        } else {
            res.send("Invalid ID or Password. <a href='/'>Try again</a>");
        }
    } catch (err) {
        res.status(500).send("Login error.");
    }
});
