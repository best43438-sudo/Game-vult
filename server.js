require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const path = require('path');
const app = express();

// Middleware
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(express.static(path.join(__dirname, '/')));

// Database Connection
mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log("MongoDB Connected Successfully"))
  .catch(err => console.log("Database Connection Error: ", err));

// Player Schema
const UserSchema = new mongoose.Schema({
    username: String,
    ff_id: { type: String, unique: true },
    whatsapp: String,
    password: String
});
const User = mongoose.model('User', UserSchema);

// ROUTES
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

// Registration Logic
app.post('/api/register', async (req, res) => {
    try {
        const { username, ff_id, whatsapp, password } = req.body;
        const newUser = new User({ username, ff_id, whatsapp, password });
        await newUser.save();
        res.send('<h1>Registration Successful!</h1><a href="/">Go back to Login</a>');
    } catch (err) {
        res.status(500).send('Registration Failed: ID might already exist.');
    }
});

// Login Logic
app.post('/api/login', async (req, res) => {
    try {
        const { ff_id, password } = req.body;
        const user = await User.findOne({ ff_id: ff_id, password: password });
        if (user) {
            res.send(`<h1>Welcome ${user.username}</h1><p>Your FF ID: ${user.ff_id}</p><a href="/">Logout</a>`);
        } else {
            res.send('<h1>Invalid Login</h1><a href="/">Try again</a>');
        }
    } catch (err) {
        res.status(500).send('Login Error');
    }
});

// Start Server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
