require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const path = require('path');
const app = express();

// --- 1. Middleware ---
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(express.static(path.join(__dirname, '/')));

// --- 2. Database Connection ---
// This uses the variable you will set in Render
mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log("Connected to Game Vault Database"))
  .catch(err => console.error("Database connection error:", err));

// --- 3. Data Models ---
const UserSchema = new mongoose.Schema({
    username: { type: String, required: true },
    ff_id: { type: String, required: true, unique: true },
    whatsapp: { type: String, required: true },
    password: { type: String, required: true },
    team: { type: String, default: null } // Simplified for now
});
const User = mongoose.model('User', UserSchema);

// --- 4. Routes ---

// Serve the Homepage (index.html)
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

// Handle Registration
app.post('/api/register', async (req, res) => {
    try {
        const { username, ff_id, whatsapp, password } = req.body;
        
        // Basic check for existing ID
        const existing = await User.findOne({ ff_id });
        if (existing) {
            return res.send(`
                <body style="background:#0f172a; color:white; font-family:sans-serif; text-align:center; padding:50px;">
                    <h2 style="color:#ef4444">Error: ID Already Registered</h2>
                    <p>The Free Fire ID ${ff_id} is already in our system.</p>
                    <a href="/" style="color:#facc15">Go Back</a>
                </body>
            `);
        }

        const newUser = new User({ username, ff_id, whatsapp, password });
        await newUser.save();
        
        res.send(`
            <body style="background:#0f172a; color:white; font-family:sans-serif; text-align:center; padding:50px;">
                <h2 style="color:#22c55e">Registration Successful!</h2>
                <p>Welcome to the tournament, ${username}.</p>
                <p>Your team leader can now add you using your ID.</p>
                <br>
                <a href="/" style="background:#facc15; color:black; padding:10px 20px; text-decoration:none; border-radius:5px; font-weight:bold;">Return to Home</a>
            </body>
        `);
    } catch (err) {
        res.status(500).send("Registration failed. Please try again.");
    }
});

// Admin View (Secret Route to see players)
// Access this by going to your-url.com/admin-view
app.get('/admin-view', async (req, res) => {
    try {
        const players = await User.find({});
        let rows = players.map(p => `
            <tr style="border-bottom: 1px solid #334155;">
                <td style="padding:10px;">${p.username}</td>
                <td style="padding:10px;">${p.ff_id}</td>
                <td style="padding:10px;">${p.whatsapp}</td>
            </tr>
        `).join('');

        res.send(`
            <body style="background:#0f172a; color:white; font-family:sans-serif; padding:20px;">
                <h1 style="color:#facc15">Registered Players (${players.length})</h1>
                <table style="width:100%; text-align:left; border-collapse: collapse;">
                    <thead style="background:#1e293b; color:#94a3b8;">
                        <tr>
                            <th style="padding:10px;">Username</th>
                            <th style="padding:10px;">FF ID</th>
                            <th style="padding:10px;">WhatsApp</th>
                        </tr>
                    </thead>
                    <tbody>${rows}</tbody>
                </table>
                <br>
                <a href="/" style="color:#94a3b8;">Back to Home</a>
            </body>
        `);
    } catch (err) {
        res.send("Error loading admin view.");
    }
});

// --- 5. Start Server ---
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server live on port ${PORT}`);
});
