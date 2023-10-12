// 0Bot

if (process.argv.length < 3) {
    console.log('Usage : node <scriptname>.js <host>');
    process.exit(1);
}

const server = process.argv[2];

const fs = require('fs');
const mineflayer = require('mineflayer');

const armorManager = require('mineflayer-armor-manager');
const autoEat = require('mineflayer-auto-eat').plugin;
const pathFinder = require('mineflayer-pathfinder').pathfinder;
const Movements = require('mineflayer-pathfinder').Movements;
// ReSharper disable once InconsistentNaming
const { GoalNear } = require('mineflayer-pathfinder').goals;
const { autototem } = require('mineflayer-auto-totem');
const tpsPlugin = require('./tps.js')(mineflayer);
// ReSharper disable twice InconsistentNaming
const { ActivityType, EmbedBuilder } = require('discord.js');

const discord = require('discord.js');

const dotenv = require('dotenv');
dotenv.config();

try { setTerminalTitle(hideEmail(process.env.minecraftUsername) + ' | ' + server) } catch (e) { }

const discordLink = process.env.discordLink;
const changeTopicToStats = true;
const logStatusToChat = false;

const doAdvertising = true;
const promoted = process.env.promotedServer;

const intervalDiscordTopic = 60 * 5; // seconds
const intervalMove = 5; // seconds
const intervalEquip = 5; // seconds
const intervalBroadcast = 60 * 2; // seconds

let lastTimeMoved = -1; // ts
let lastTimeEquipped = -1; // ts
let lastTimeBroadcast = -1; // ts
const maxrandom = 5; // 0-5 seconds added to movement interval (randomly)

let moving = 0;

const channels = require('./channels.json');
const broadcasts = fs.readFileSync('promotion.txt').toString().split('\n');

let session;
try { session = JSON.parse(fs.readFileSync('session.json', 'utf8')) } catch (e) { }

const minecraftLoginData = {
    host: server,
    port: 25565,
    username: process.env.minecraftUsername,
    password: process.env.minecraftPassword,
    verbose: true,
    version: '1.12.2',
    auth: 'microsoft',
    session
};

let defaultMove;

// DISCORD BOT
const discordBot = new discord.Client({
  intents: [
    discord.GatewayIntentBits.Guilds,
    discord.GatewayIntentBits.GuildMessages
  ]
});

let minecraftConnected = false;
let discordConnected = false;

// DISCORD BOT
discordBot.on('ready', () => {
    console.log(`Logged in as Discord bot ${discordBot.user.tag}.`);
    discordConnected = true;

    // Channel Topic
    setInterval(updateDiscordTopic, intervalDiscordTopic * 1000);

    discordBot.user.setPresence({
      activities: [{ name: '0b0t.org', type: ActivityType.Playing }],
      status: 'dnd',
    });

    if (logStatusToChat) sendToDiscordChat(`:white_check_mark: **Bridge for server '${server}' has started**`, true);

    if (!minecraftConnected) setDiscordChannelTopic(`:hourglass:  ${server} | Connecting...`);
});

// MINECRAFT BOT
let minecraftBot;

// CHAT DISCORD -> GAME
discordBot.on('message', msg => {
    if (discordConnected && msg.author.id !== discordBot.user.id) {
        if (msg.channel.id === channels[server]) {
            if (msg.content.startsWith('!')) {
                if (msg.content.toLowerCase() === '!help') {
                    sendToDiscordChat(':arrow_forward: Commands are: !help');
                } else {
                    sendToDiscordChat(':warning: Unknown Command!');
                }
            } else {
                const message = `[${msg.author.username}]: \`${msg.content}`;

                minecraftBot.chat(message.substr(0, 240));
            }
        }
    }
});

discordBot.login(process.env.discordToken); // TODO: do not ignore returned promise then()
relog();

function relog() {
    try { minecraftBot.quit(); } catch (e) { }
    console.log(`Attempting to (re)connect to ${server}...`);
    minecraftBot = mineflayer.createBot(minecraftLoginData);
    bindEvents(minecraftBot);
}

// auto equip
function autoEquip() {
    if (!minecraftConnected) return;

    try {
        minecraftBot.armorManager.equipAll();
    }
    catch (err) { console.log(`Minecraft bot auto equip failed: \n${err}`); }
}

function updateDiscordTopic() {
    if (changeTopicToStats && minecraftConnected && minecraftBot.players !== undefined && minecraftBot.players != null) {
        setDiscordChannelTopic(`:white_check_mark:  ${server} | ${sizeOf(minecraftBot.players)}/${minecraftBot.game.maxPlayers} Players online | TPS: ${minecraftBot.getTps()}`);
    }
}

function bindEvents(bot) {
    // NAVIGATION
    bot.loadPlugin(pathFinder);

    // TPS
    bot.loadPlugin(tpsPlugin);

    // AUTOEAT
    bot.loadPlugin(autoEat);

    // ARMOR MANAGER
    bot.loadPlugin(armorManager);

    // AUTO TOTEM
    bot.loadPlugin(autototem);

    // SAVED SESSION
    bot._client.on('session', () => {
        fs.writeFileSync('session.json', JSON.stringify(bot._client.session));
    });

    bot.on('tpRequest', function (username) {
        if (isWhitelisted(username)) {
            bot.chat(`/tpy ${username}`);
            console.log(`${username} teleported.`);
        }
        else {
            console.log(`${username} is not allowed to teleport.`);
        }
    });

    // MINECRAFT BOT LOGIN
    bot.on('login', function () {
        console.log(`Logged in as Minecraft bot ${hideEmail(process.env.minecraftUsername)}!`);
    });

    // BOT SPAWN
    bot.on('spawn', function () {
        const minecraftData = require('minecraft-data')(bot.version);
        defaultMove = new Movements(bot, minecraftData);
        defaultMove.allow1by1towers = false;
        defaultMove.canDig = false;
        defaultMove.canOpenDoors = false;
        defaultMove.allowSprinting = false;

        bot.autoEat.options.priority = 'foodPoints';
        bot.autoEat.options.bannedFood = [];
        bot.autoEat.options.eatingTimeout = 3;
        // hp stops regenerating when 17 hunger points are reached
        bot.autoEat.options.startAt = 17.5;
        bot.autoEat.enable();

        // TPA REQUEST
        bot.chatAddPattern(/^([a-zA-Z0-9_]{3,16}) wants to teleport to you\.$/, 'tpRequest', 'tpa request');

        minecraftConnected = true;
        updateDiscordTopic();
    });

    // CHAT GAME -> DISCORD
    bot.on('chat', function (username, message) {
        if (username === bot.username) return;

        if (username === 'queue') {
            setDiscordChannelTopic(`:hourglass:  ${server} | Queue: ${message}`);
        } else if (username === 'whispers') {
            // Ignore
        } else if (username === '15m') {
            // Ignore
        } else if (message.toLowerCase().startsWith('/register')) {
            bot.chat(`/register ${process.env.authMePassword} ${process.env.authMePassword}`);
        } else if (message.toLowerCase().startsWith('/login')) {
            bot.chat(`/login ${process.env.authMePassword}`);
        } else if (message.toLowerCase().startsWith('/email')) {
            // Ignore
        } else if (message.toLowerCase() === '~discord' || message.toLowerCase() === '!discord' || message.toLowerCase() === '?discord') {
            bot.chat(`> Join ${discordLink} for the ${server} discord chat bridge.`);
        } else if (message.toLowerCase() === '~tps' || message.toLowerCase() === '!tps' || message.toLowerCase() === '?tps') {
            bot.chat(`> Current approximate tps: ${minecraftBot.getTps()}`);
        } else if (message.toLowerCase() === '~leave' && isWhitelisted(username.toLowerCase())) {
            bot.quit();
        } else if (discordConnected) {
            const color = posMod(hashCode(username), 16777215);

            const embed = new EmbedBuilder()
                .setAuthor({
                  name: username,
                  iconURL: 'https://minotar.net/avatar/' + username
                })
                .setDescription(message)
                .setColor(color)
                .setFooter({ text: utcDateTime() });

            sendToDiscordChat({ embeds: [embed] });
        }
    });

    // DEATH
    bot.on('death', () => {
        console.log(`Bot died at ([${bot.game.dimension}] ${bot.entity.position.x.toFixed(1)}, ${bot.entity.position.y.toFixed(1)}, ${bot.entity.position.z.toFixed(1)}).`);
    });

    // TICK
    bot.on('physicsTick', async () => {
        bot.autototem.equip();
    });

    // BOT CRONJOBS
    bot.on('time', function () {
        if (!minecraftConnected) return;
        let randomadd;

        // Auto equip
        if (lastTimeEquipped < 0) {
            lastTimeEquipped = bot.time.age;
        } else {
            if (bot.time.age - lastTimeEquipped > intervalEquip * 20) {
                autoEquip();
                lastTimeEquipped = bot.time.age;
            }
        }

        // Look around and move
        if (lastTimeMoved < 0) {
            lastTimeMoved = bot.time.age;
        } else {
            randomadd = Math.random() * 20 + maxrandom;
            const interval = intervalMove * 20 + randomadd;

            if (bot.time.age - lastTimeMoved > interval) {
                if (moving === 1) {
                    bot.setControlState('sneak', true);
                    bot._client.write('arm_animation', { hand: 0 });

                    // Movement
                    try {
                        if (minecraftConnected) {
                            const pos = bot.entity.position.offset(getRandomInt(-2, 2), 0, getRandomInt(-2, 2));
                            bot.pathfinder.setMovements(defaultMove);
                            bot.pathfinder.setGoal(new GoalNear(pos.x, pos.y, pos.z, 1));
                        }
                    }
                    catch (err) { console.log(`Minecraft bot navigation failed: \n${err}`); }

                    moving = 0;
                } else {
                    const yaw = Math.random() * Math.PI - (0.5 * Math.PI);
                    const pitch = Math.random() * Math.PI - (0.5 * Math.PI);
                    bot.setControlState('sneak', false);
                    bot.look(yaw, pitch, false);
                    moving = 1;
                }

                lastTimeMoved = bot.time.age;
            }
        }

        // Broadcast
        if (doAdvertising) {
            if (lastTimeBroadcast < 0) {
                lastTimeBroadcast = bot.time.age;
            } else {
                randomadd = Math.random() * 20 + maxrandom;

                const intervalbc = intervalBroadcast * 20 + randomadd;

                if (bot.time.age - lastTimeBroadcast > intervalbc) {
                    let message = broadcasts[Math.floor(Math.random() * broadcasts.length)];

                    message = message.replace('%server%', server);
                    message = message.replace('%promoted%', promoted);
                    message = message.replace('%discord%', discordLink);
                    message = message.replace(/[\r\n]/g, '');

                    bot.chat(`> ${message}`);
                    lastTimeBroadcast = bot.time.age;
                }
            }
        }
    });

    // BOT KICK
    bot.on('kicked', function (reason) {
        minecraftConnected = false;

        const jsonReason = JSON.parse(reason);

        console.log(`Minecraft bot was kicked for ${jsonReason.text}`);

        setDiscordChannelTopic(`:cold_face:  ${server} | Kicked`);

        if (jsonReason.text.toLowerCase() === 'timed out') {
            sendToDiscordChat(`:cold_face: **Bridge for server '${server}' timed out.**`, true);
        }
        else {
            sendToDiscordChat(`:angry: **Bridge for server '${server}' was kicked with the reason: ${jsonReason.text}**`, true);
        }
    });

    // BOT DISCO
    bot.on('end', function () {
        minecraftConnected = false;

        console.log('Minecraft bot has ended! Attempting to reconnect in 30 s...');

        setDiscordChannelTopic(`:warning:  ${server} | Disconnected`);

        sendToDiscordChat(`:warning: **Bridge for server '${server}' disconnected! Attempting to reconnect in 30 s...**`, true);

        setTimeout(relog, 30000);
    });

    // BOT ERROR
    bot.on('error', function (err) {
        minecraftConnected = false;

        console.log(`Minecraft bot error '${err.errno}'.`);

        setDiscordChannelTopic(`:sos:  ${server} | Error`);

        if (err.code === undefined && logStatusToChat) {
            setTimeout(relog, 5 * 60 * 1000);
            console.log('Undefined error: Maybe invalid credentials OR bot needs to wait because it relogged too quickly.');
        }
        else {
            sendToDiscordChat(`:sos: **Bridge for server '${server}' had the error: ${err.errno}**`, true);
        }
    });

    // PLUGIN METHODS
    bot.on('autoeat_started', () => {
        console.log(`Started auto eat at ${bot.health.toFixed(1)} hp and ${bot.food.toFixed(1)} food.`);
    });

    bot.on('autoeat_stopped', () => {
        console.log(`Stopped auto eat at ${bot.health.toFixed(1)} hp and ${bot.food.toFixed(1)} food.`);
    });
}

function setDiscordChannelTopic(topic) {
    if (!discordConnected) return;

    const channel = getDiscordChannel(server);

    if (channel != null && channel.topic !== topic && topic != null) {
        topic = `${topic} | Last Update: ${utcDateTime()} UTC`;

        getDiscordChannel(server).setTopic(topic); // TODO: do not ignore returned promise then()
    }
}

function sendToDiscordChat(message, isStatus = false) {
    try {
        const channel = getDiscordChannel(server);

        if (channel != null && (!isStatus || logStatusToChat)) {
            channel.send(message);
        }
    } catch (err) {
        console.log(err.message);
    }
}

// NODE EXCEPTION
process.on('uncaughtException', function (err) {
    if (err.message.includes('rejected transaction')) {
        console.log(`${err.message}`);
        return;
    }

    console.log(`${err.stack}`);
    process.exit();
});

// DISCORD CHANNEL
function getDiscordChannel(channel) {
    let ret;
    let first = true;

    const channelId = channels[channel];

    do {
        if (first) {
            first = false;
        } else {
            return console.log(`Channel '${channel}' is not ready yet...`);
        }

        ret = discordBot.channels.cache.get(channelId);
    } while (typeof ret === 'undefined' || ret == null);

    return ret;
}

// EXCEPTION
// so the program will not close instantly
process.stdin.resume();

function exitHandler() {
    discordConnected = false;
    minecraftConnected = false;

    setDiscordChannelTopic(`:octagonal_sign: ${server} | Offline`);

    try {
        const channel = getDiscordChannel(server);

        if (channel != null && logStatusToChat) {
            channel.send(`:octagonal_sign: **Bridge for server '${server}' has stopped**`);
        }
    } catch (e) { }

    process.exit(1);
}

// do something when App is closing
process.on('exit', exitHandler.bind(null, {}));

// clicking the 'X' on Windows
process.on('SIGHUP', exitHandler.bind(null, {}));

// catches Ctrl+c event
process.on('SIGINT', exitHandler.bind(null, {}));

// catches "kill PID" (for example: nodemon restart)
process.on('SIGUSR1', exitHandler.bind(null, {}));
process.on('SIGUSR2', exitHandler.bind(null, {}));

// HELPER
function requireUncached(module) {
    delete require.cache[require.resolve(module)];
    return require(module);
}

function isWhitelisted(username) {
    return requireUncached('./whitelist.json').includes(username.toLowerCase());
}

function getRandomInt(min, max) {
    min = Math.ceil(min);
    max = Math.floor(max);
    return Math.floor(Math.random() * (max - min)) + min;
}

/**
 * Size of an array
 * @param data array
 */
function sizeOf(data) {
    let size = 0;

    for (let { } in data) {
        size++;
    }

    return size;
}

/**
 * formatted UTC time
 */
function utcDateTime() {
    const m = new Date();
    return m.getUTCFullYear() + "/" +
        (`0${m.getUTCMonth() + 1}`).slice(-2) + "/" +
        (`0${m.getUTCDate()}`).slice(-2) + " " +
        (`0${m.getUTCHours()}`).slice(-2) + ":" +
        (`0${m.getUTCMinutes()}`).slice(-2) + ":" +
        (`0${m.getUTCSeconds()}`).slice(-2);
}

/**
 * Java String#hashCode
 */
function hashCode(str) {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
        hash = str.charCodeAt(i) + ((hash << 5) - hash);
    }
    return hash;
}

function posMod(x, m) {
    return (x % m + m) % m;
}

function setTerminalTitle(title) {
    process.stdout.write(
        `${String.fromCharCode(27)}]0;${title}${String.fromCharCode(7)}`
    );
}

function hideEmail(email) {
    return email.replace(/(.{2})(.*)(?=@)/,
        function (_gp1, gp2, gp3) {
            for (let i = 0; i < gp3.length; i++) {
                gp2 += '*';
            } return gp2;
        }
    );
};
