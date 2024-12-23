module.exports = {
    discord: {
        clientID: 'CLIEND_ID',
        clientSecret: 'CLIENT_SECRET',
        callbackURL: 'http://UR_DOMAIN_OR_IP/auth/discord/callback',
        scope: ['identify', 'email', 'guilds']
    },
    mongoURI: 'MONGODB_URI' 
};
