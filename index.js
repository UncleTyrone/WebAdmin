const express = require('express');
const passport = require('passport');
const DiscordStrategy = require('passport-discord').Strategy;
const session = require('express-session');
const config = require('./config');
const mongoose = require('mongoose')
const app = express();
const port = 3000;
const axios = require('axios');
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
// Passport configuration
const allowedDiscordIDs = ['1138891011855224942', '896932648465883187', '1238135759979155599'];
passport.use(new DiscordStrategy({
    clientID: config.discord.clientID,
    clientSecret: config.discord.clientSecret,
    callbackURL: config.discord.callbackURL,
    scope: config.discord.scope
}, (accessToken, refreshToken, profile, done) => {
    // Check if the authenticated user's ID is in the allowed list
    console.log(profile)
    if (allowedDiscordIDs.includes(profile.id)) {
        return done(null, profile);
    } else {
        return done(null, false, { message: 'Unauthorized' });
    }
}));



mongoose.connect(config.mongoURI, { useNewUrlParser: true, useUnifiedTopology: true })
    .then(() => console.log('MongoDB connected'))
    .catch(err => console.log(err));

passport.serializeUser((user, done) => {
    done(null, user);
});

passport.deserializeUser((obj, done) => {
    done(null, obj);
});

// Express session middleware
app.use(session({
    secret: 'lolololggehuiaghiaukbn',
    resave: false,
    saveUninitialized: false
}));

// Initialize passport
app.use(passport.initialize());
app.use(passport.session());

// Set EJS as the templating engine
app.set('view engine', 'ejs');

// Serve static files from the "public" directory
app.use(express.static('public'));

// Define the login route
app.get('/', (req, res) => {
    res.render('login');
});

// Define the Discord authentication routes
app.get('/auth/discord', passport.authenticate('discord'));

app.get('/auth/discord/callback', passport.authenticate('discord', {
    failureRedirect: '/'
}), (req, res) => {
    // Successful authentication, redirect to dashboard.
    res.redirect('/dashboard');
});

// Middleware to ensure user is authenticated
function ensureAuthenticated(req, res, next) {
    if (req.isAuthenticated()) {
        return next();
    }
    res.redirect('/');
}

// Dashboard route
app.get('/dashboard', ensureAuthenticated, (req, res) => {
    res.render('dashboard', { user: req.user });
});

app.get('/ban', ensureAuthenticated, (req, res) => {
    res.render('ban', { user: req.user });
});
// Define other routes (ban, kick, unban, view-bans, logout)
const Ban = require('./models/Ban')

function calculateDeleteAt(banLength) {
    const now = new Date();
    switch (banLength) {
        case "1 day":
            return new Date(now.getTime() + 24 * 60 * 60 * 1000);
        case "3 days":
            return new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000);
        case "5 days":
            return new Date(now.getTime() + 5 * 24 * 60 * 60 * 1000);
        case "1 week":
            return new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
        case "2 weeks":
            return new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000);
        case "1 month":
            return new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
        case "2 months":
            return new Date(now.getTime() + 60 * 24 * 60 * 60 * 1000);
        case "6 months":
            return new Date(now.getTime() + 182 * 24 * 60 * 60 * 1000);
        case "1 year":
            return new Date(now.getTime() + 365 * 24 * 60 * 60 * 1000);
        case "Permanent":
            return new Date(9999, 0, 1); // A far future date
        default:
            return new Date();
    }
}

async function getRobloxIdFromUsername(name) {
    try {
        const response = await axios.post(`https://users.roblox.com/v1/usernames/users`, {
            "usernames": [name],
            "excludeBannedUsers": true
        });
        const data = response.data.data[0];
        return data.id;
    } catch (err) {
        return 1; // Return 1 if not found
    }
}

app.post('/ban', ensureAuthenticated, async (req, res) => {
    const { username, reason, notes, banLength } = req.body;

    // Get Roblox ID from username
    const robloxId = await getRobloxIdFromUsername(username);

    // Calculate deleteAt
    const deleteAt = calculateDeleteAt(banLength);

    const newBan = new Ban({ username, robloxId, reason, notes, banLength, deleteAt });

    console.log(req.body);

    try {
        await newBan.save();
        res.redirect('/dashboard');
    } catch (err) {
        res.status(500).send('Error saving ban data');
    }
});


const Kick = require('./models/Kick'); // Import the Kick model

// Kick route
app.get('/kick', ensureAuthenticated, (req, res) => {
    res.render('kick', { user: req.user });
});
const PendingAction = require('./models/PendingAction')
app.post('/kick', ensureAuthenticated, async (req, res) => {
    const { username, reason } = req.body;
    const robloxId = await getRobloxIdFromUsername(username); // Get Roblox ID

    const newKick = new Kick({ username, reason });

    const pendingAction = new PendingAction({ actionType: 'kick', robloxId, reason });

    try {
        await newKick.save();
        await pendingAction.save();
        res.redirect('/dashboard');
    } catch (err) {
        res.status(500).send('Error saving kick data');
    }
});

// Unban route
app.get('/unban', ensureAuthenticated, async (req, res) => {
    try {
        const bans = await Ban.find({});
        res.render('unban', { bans, user: req.user });
    } catch (err) {
        res.status(500).send('Error retrieving bans');
    }
});

app.get('/unban/:id', ensureAuthenticated, async (req, res) => {
    try {
        const ban = await Ban.findById(req.params.id);
        res.render('unban-detail', { ban, user: req.user });
    } catch (err) {
        res.status(500).send('Error retrieving ban details');
    }
});
app.post('/unban/:id', ensureAuthenticated, async (req, res) => {
    const robloxId = req.body.robloxId;
    const reason = req.body.reason || "Unbanned by admin";

    const pendingAction = new PendingAction({
        actionType: 'unban',
        robloxId: robloxId,
        reason: reason
    });

    try {
        await Ban.findByIdAndDelete(req.params.id);
        await pendingAction.save();
        res.redirect('/unban');
    } catch (err) {
        res.status(500).send('Error unbanning user');
    }
});



app.get('/view-bans', ensureAuthenticated, (req, res) => {
    res.send('View Bans page');
});

app.get('/logout', (req, res) => {
    req.logout((err) => {
        if (err) { return next(err); }
        res.redirect('/');
    });
});

app.listen(port, () => {
    console.log(`Server is running on http://localhost:${port}`);
});

// API endpoint to list all bans
app.get('/api/bans', async (req, res) => {
    try {
        const bans = await Ban.find({});
        res.json(bans);
    } catch (err) {
        res.status(500).send('Error retrieving bans');
    }
});

async function checkAndDeleteExpiredBans() {
    try {
        const now = new Date();
        await Ban.deleteMany({ deleteAt: { $lte: now } });
        console.log('Checked and deleted expired bans');
    } catch (err) {
        console.error('Error checking and deleting expired bans', err);
    }
}

// Set interval to check and delete expired bans every 5 minutes
setInterval(checkAndDeleteExpiredBans, 5 * 60 * 1000);

app.get('/api/pending-actions', async (req, res) => {
    try {
        const actions = await PendingAction.find({});
        res.json(actions);
    } catch (err) {
        res.status(500).send('Error retrieving pending actions');
    }
});

// API endpoint to delete a completed action
app.delete('/api/pending-actions/:id', async (req, res) => {
    try {
        await PendingAction.findByIdAndDelete(req.params.id);
        res.status(200).send('Pending action deleted');
    } catch (err) {
        res.status(500).send('Error deleting pending action');
    }
});

// Function to check and delete expired bans
async function checkAndDeleteExpiredBans() {
    try {
        const now = new Date();
        await Ban.deleteMany({ deleteAt: { $lte: now } });
        console.log('Checked and deleted expired bans');
    } catch (err) {
        console.error('Error checking and deleting expired bans', err);
    }
}