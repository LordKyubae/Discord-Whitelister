const Rcon = require('rcon');
const { Client } = require('discord.js');
const { default: axios } = require('axios');

require('dotenv').config();
var db = new (require('sqlite3').verbose()).Database('data.db');

function handleDiscordResponse(message, data, response) {
    if (response == ('Added ' + data.name + ' to the whitelist')) {
        db.run('INSERT INTO records (discord, minecraft, created_at) VALUES (?, ?, ?)', [message.author.id, data.id, require('moment').now()]);
        message.react('allow:970241085051916339');
    } else {
        message.react('deny:970241085215473684');
    }
}

let discord = new Client({ intents: ['GUILDS', 'GUILD_MEMBERS', 'GUILD_MESSAGES'] });
discord.login(process.env.DISCORD_TOKEN);

discord.on('messageCreate', (message) => {
    if (message.channelId != process.env.DISCORD_CHANNEL_ID) return;

    axios.get('https://api.mojang.com/users/profiles/minecraft/' + message.cleanContent).then(res => {
        if (res.data.id != undefined) {
            let rcon = new Rcon(process.env.RCON_HOST, process.env.RCON_PORT, process.env.RCON_PASSWORD, {
                challenge: false
            });

            rcon.on('auth', function () {
                rcon.send('whitelist add ' + res.data.name);
            }).on('response', function (str) {
                handleDiscordResponse(message, res.data, str);
            });

            rcon.connect();
        }
    });
});

require('http').createServer((req, res) => {
    res.writeHead(200, 'OK', [
        "Content-Type", "text/html"
    ]);
    res.write('<html><head><style>table { font-family: arial, sans-serif; border-collapse: collapse; width: 100%; } td, th { border: 1px solid #dddddd; text-align: left; padding: 8px; } tr:nth-child(even) { background-color: #dddddd; }</style></head>');
    res.write('<body><table>')
    res.write('<tr><th>Discord ID</th><th>Minecraft ID</th><th>Date Added To The Whitelist</th></tr>')
    db.each('SELECT * FROM records', (err, row) => {
        res.write('<tr><td><a href=\'https://lookup.guru/' + row.discord + '\'>' + row.discord + '</a></td><td><a href=\'https://mcuuid.net/?q=' + row.minecraft + '\'>' + row.minecraft + '</a></td><td>' + require('moment')(row.created_at).toDate() + '</td></tr>');
    }, () => {
        res.write('</table></body></html>');
        res.end();
    });
}).listen(process.env.HTTP_PORT, process.env.HTTP_ADDRESS);