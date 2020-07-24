//
// 0Bot
//

if (process.argv.length < 3) {
    console.log('Usage : node <scriptname>.js <host>')
    process.exit(1)
}

const server = process.argv[2];

const fs = require('fs');
const mineflayer = require('mineflayer');
const navigatePlugin = require('mineflayer-navigate')(mineflayer);
const tpsPlugin = require('./tps.js')(mineflayer)
const Discord = require('discord.js');
const dotenv = require('dotenv');

dotenv.config();

try { setTerminalTitle(hideEmail(process.env.minecraftUsername) + " | " + server) } catch { }

const discordLink = "https://discord.gg/WmXCfTA";
const changeTopicToStats = true;
const logStatusToChat = false;

const doAdvertising = false;
const promoted = "0b0t.org";

const intervalDiscordTopic = 30 * 2; // seconds
const intervalMove = 5; // seconds
const intervalBroadcast = 60 * 2; // seconds
const waitOnCrash = 120 * 5; // seconds

let lastTimeMoved = -1; // ts
let lastTimeBroadcast = -1; // ts
const maxrandom = 5; // 0-5 seconds added to movement interval (randomly)

let moving = 0;

const channels = require('./channels.json');
const broadcasts = fs.readFileSync('promotion.txt').toString().split("\n");

let session
try { session = JSON.parse(fs.readFileSync('session.json', 'utf8')) } catch { }

const minecraftLoginData = {
    host: server,
    port: 25565,
    username: process.env.minecraftUsername,
    password: process.env.minecraftPassword,
    verbose: true,
    version: "1.12.2",
    session
};

// DISCORD BOT
const discordBot = new Discord.Client();

let minecraftConnected = false;
let discordConnected = false;

// DISCORD BOT
discordBot.on('ready', () => {
    console.log("Logged in as Discord bot " + discordBot.user.tag + ".");
    discordConnected = true;

    // Channel Topic
    setInterval(updateDiscordTopic, intervalDiscordTopic * 1000);

    discordBot.user.setActivity('0b0t.org', {
        type: 'PLAYING'
    }).then(() => console.log('Changed presence'));

    if (logStatusToChat) sendToDiscordChat(":white_check_mark: **Bridge for server '" + server + "' has started**", true)
    
    if (!minecraftConnected) setDiscordChannelTopic(":hourglass:  " + server + " | Connecting...");
});

// MINECRAFT BOT
let minecraftBot;

// CHAT DISCORD -> GAME
discordBot.on('message', msg => {
    if (discordConnected && msg.author.id !== discordBot.user.id) {
        if (msg.channel.id === channels[server]) {
            if (msg.content.startsWith("!")) {
                if (msg.content.toLowerCase() === "!help") {
                    sendToDiscordChat(":arrow_forward: Commands are: !help")
                } else {
                    sendToDiscordChat(":warning: Unknown Command!")
                }
            } else {
                const message = "[" + msg.author.username + "]" + ": `" + msg.content;

                minecraftBot.chat(message.substr(0, 240));
            }
        }
    }
});

discordBot.login(process.env.discordToken); // TODO: do not ignore returned promise then()
relog();

function relog() {
    try { minecraftBot.quit(); } catch { }
    console.log("Attempting to (re)connect to " + server + "...");
    minecraftBot = mineflayer.createBot(minecraftLoginData);
    bindEvents(minecraftBot);
}

// TODO AUTO EQUIP + EAT + TOTEM
function autoEquipEatTotem() {
    if (!minecraftConnected) return;

    const handItem = minecraftBot.inventory.findInventoryItem(261); // Bow
    if (handItem) {
        minecraftBot.equip(handItem, 'hand');
        return;
    }

    const headItem = minecraftBot.inventory.findInventoryItem(310, null); // Diamond Helmet
    if (headItem) {
        minecraftBot.equip(headItem, 'head');
        return;
    }

    const chestItem = minecraftBot.inventory.findInventoryItem(311, null); // Diamond Chestplate
    if (chestItem) {
        minecraftBot.equip(chestItem, 'torso');
        return;
    }

    const legsItem = minecraftBot.inventory.findInventoryItem(312, null); // Diamond Leggings
    if (legsItem) {
        minecraftBot.equip(legsItem, 'legs');
        return;
    }

    const feetItem = minecraftBot.inventory.findInventoryItem(313, null); // Diamond Boots
    if (feetItem) {
        minecraftBot.equip(feetItem, 'feet');
        return;
    }

    const offhandItem = minecraftBot.inventory.findInventoryItem(449); // Totem of Undying
    if (offhandItem) {
        minecraftBot.equip(offhandItem, 'off-hand');
    }
}

function updateDiscordTopic() {
    if (changeTopicToStats && minecraftConnected && minecraftBot.players !== undefined && minecraftBot.players != null) {
        setDiscordChannelTopic(":white_check_mark:  " + server + " | " + sizeOf(minecraftBot.players) + "/" + minecraftBot.game.maxPlayers + " Players online | TPS: " + minecraftBot.getTps());
    }
}

function bindEvents(minecraftBot) {
    // NAVIGATION
    navigatePlugin(minecraftBot);

    // TPS
    minecraftBot.loadPlugin(tpsPlugin);

    // SAVED SESSION
    minecraftBot._client.on('session', () => {
        fs.writeFileSync('session.json', JSON.stringify(minecraftBot._client.session))
    })

    // TPA REQUEST
    minecraftBot.chatAddPattern(/^([a-zA-Z0-9_]{3,16}) wants to teleport to you\.$/, "tpRequest", "tpa request");

    minecraftBot.on('tpRequest', function (username) {
        if (isWhitelisted(username)) {
            minecraftBot.chat("/tpy " + username);
            console.log(username + " teleported.");
        }
        else {
            console.log(username + " is not allowed to teleport.");
        }
    });

    // MINECRAFT BOT LOGIN
    minecraftBot.on('login', function () {
        console.log("Logged in as Minecraft bot " + hideEmail(process.env.minecraftUsername) + "!");
    });

    // BOT SPAWN
    minecraftBot.on('spawn', function () {
        minecraftConnected = true;
        updateDiscordTopic();
    });

    // CHAT GAME -> DISCORD
    minecraftBot.on('chat', function (username, message) {
        if (username === minecraftBot.username) return;

        if (username === "queue") {
            setDiscordChannelTopic(":hourglass:  " + server + " | Queue: " + message + "");
        } else if (username === "15m") {
            //tps = "TPS: " + message + " | ";
        } else if (message.toLowerCase() === "~discord" || message.toLowerCase() === "!discord" || message.toLowerCase() === "?discord") {
            minecraftBot.chat("> Join " + discordLink + " for the " + server + " discord chat bridge.");
        } else if (message.toLowerCase() === "~leave" && whiteList.includes(username.toLowerCase())) {
            minecraftBot.quit();
        } else if (discordConnected) {
            const color = posMod(hashCode(username), 16777215);

            const embed = new Discord.MessageEmbed()
                .setAuthor(username, "https://minotar.net/avatar/" + username)
                .setDescription(message)
                .setColor(color)
                .setFooter(utcDateTime());

            sendToDiscordChat(embed)
        }
    });

    // TODO BOT HEALTH - select food
    minecraftBot.on('health', function () {
        //let food = minecraftBot.food
        //let health = minecraftBot.health

        //if (health < 20) {
        //    minecraftBot.activateItem();
        //    console.log('eat something because low health')
        //} else if (food < 17) {
        //    minecraftBot.activateItem();
        //    console.log('eat something because hunger')
        //}
    })

    // BOT CRONJOBS
    minecraftBot.on('time', function () {
        if (!minecraftConnected) return;
        let randomadd;

        // TPS
        // minecraftBot.chat("/tps"); // TODO: needs to be timed somehow

        // ~~~setInterval(autoEquipEatTotem, 50) TODO

        // Look Around
        if (lastTimeMoved < 0) {
            lastTimeMoved = minecraftBot.time.age;
        } else {
            randomadd = Math.random() * 20 + maxrandom;
            const interval = intervalMove * 20 + randomadd;

            if (minecraftBot.time.age - lastTimeMoved > interval) {
                if (moving === 1) {
                    minecraftBot.setControlState('sneak', true);
                    minecraftBot._client.write('arm_animation', { hand: 0 });

                    // Movement
                    try { if (minecraftConnected) minecraftBot.navigate.to(minecraftBot.entity.position.offset(getRandomInt(-2, 2), 0, getRandomInt(-2, 2))); }
                    catch (err) { console.log("Minecraft bot navigation failed!"); }

                    moving = 0;
                } else {
                    const yaw = Math.random() * Math.PI - (0.5 * Math.PI);
                    const pitch = Math.random() * Math.PI - (0.5 * Math.PI);
                    minecraftBot.setControlState('sneak', false);
                    minecraftBot.look(yaw, pitch, false);
                    moving = 1;
                }

                lastTimeMoved = minecraftBot.time.age;
            }
        }

        // Broadcast
        if (doAdvertising) {
            if (lastTimeBroadcast < 0) {
                lastTimeBroadcast = minecraftBot.time.age;
            } else {
                randomadd = Math.random() * 20 + maxrandom;

                const intervalbc = intervalBroadcast * 20 + randomadd;

                if (minecraftBot.time.age - lastTimeBroadcast > intervalbc) {
                    let message = broadcasts[Math.floor(Math.random() * broadcasts.length)];

                    message = message.replace("%server%", server);
                    message = message.replace("%promoted%", promoted);

                    minecraftBot.chat("> " + message);
                    lastTimeBroadcast = minecraftBot.time.age;
                }
            }
        }
    });

    // BOT KICK
    minecraftBot.on('kicked', function (reason) {
        minecraftConnected = false;

        const jsonReason = JSON.parse(reason);

        console.log("Minecraft bot was kicked for " + jsonReason.text);

        setDiscordChannelTopic(":cold_face:  " + server + " | Kicked");

        if (jsonReason.text.toLowerCase() === "timed out") {
            sendToDiscordChat(":cold_face: **Bridge for server '" + server + "' timed out.**", true);
        }
        else {
            sendToDiscordChat(":angry: **Bridge for server '" + server + "' was kicked with the reason: " + jsonReason.text + "**", true);
        }
    });

    // BOT DISCO
    minecraftBot.on('end', function () {
        minecraftConnected = false;

        console.log("Minecraft bot has ended! Attempting to reconnect in 30 s...");

        setDiscordChannelTopic(":warning:  " + server + " | Disconnected");

        sendToDiscordChat(":warning: **Bridge for server '" + server + "' disconnected! Attempting to reconnect in 30 s...**", true);

        setTimeout(relog, 30000);
    });

    // BOT ERROR
    minecraftBot.on('error', function (err) {
        minecraftConnected = false;

        console.log("Minecraft bot error '" + err.errno + "'.");

        setDiscordChannelTopic(":sos:  " + server + " | Error");

        if (err.code === undefined && logStatusToChat) {
            //sendToChat(":sos: **Bridge for server '" + server + "' had an error. Attempting to reconnect in 30 s...**", true);

            setTimeout(relog, 5 * 60 * 1000);
            console.log('Undefined error: Maybe invalid credentials OR bot needs to wait because it relogged too quickly.');
        }
        else {
            sendToDiscordChat(":sos: **Bridge for server '" + server + "' had the error: " + err.errno + "**", true);
        }
    });
}

function setDiscordChannelTopic(topic) {
    if (!discordConnected) return;

    var channel = getDiscordChannel(server);

    if (channel != null && channel.topic !== topic && topic != null) {
        topic = topic + " | Last Update: " + utcDateTime() + " UTC";

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
    console.log("Exception. Waiting " + waitOnCrash + " seconds...");
    console.log(err.stack);

    sleep(waitOnCrash * 1000);
    process.exit();
});

// DISCORD CHANNEL
function getDiscordChannel(channel) {
    let ret = null;
    let first = true;

    const channelId = channels[channel];

    do {
        if (first) {
            first = false;
        } else {
            return console.log("Channel '" + channel + "' is not ready yet...");
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

    setDiscordChannelTopic(":octagonal_sign: " + server + " | Offline");

    try {
        const channel = getDiscordChannel(server);

        if (channel != null && logStatusToChat) {
            channel.send(":octagonal_sign: **Bridge for server '" + server + "' has stopped**");
        }
    } catch { }

    process.exit(1);
}

// do something when app is closing
process.on('exit', exitHandler.bind(null, {}));

// clicking the 'X' on Windows
process.on('SIGHUP', exitHandler.bind(null, {}));

// catches ctrl+c event
process.on('SIGINT', exitHandler.bind(null, {}));

// catches "kill pid" (for example: nodemon restart)
process.on('SIGUSR1', exitHandler.bind(null, {}));
process.on('SIGUSR2', exitHandler.bind(null, {}));

// HELPER
function requireUncached(module) {
    delete require.cache[require.resolve(module)]
    return require(module)
}

function isWhitelisted(username) {
    return requireUncached('./whitelist.json').includes(username.toLowerCase())
}

function getRandomInt(min, max) {
    min = Math.ceil(min);
    max = Math.floor(max);
    return Math.floor(Math.random() * (max - min)) + min;
}

/**
 * Sleeps for a given amount of milliseconds
 * @param milliseconds
 */
function sleep(milliseconds) {
    return new Promise(resolve => setTimeout(resolve, milliseconds));
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
 * formatted utc time
 */
function utcDateTime() {
    const m = new Date();
    return m.getUTCFullYear() + "/" +
        ("0" + (m.getUTCMonth() + 1)).slice(-2) + "/" +
        ("0" + m.getUTCDate()).slice(-2) + " " +
        ("0" + m.getUTCHours()).slice(-2) + ":" +
        ("0" + m.getUTCMinutes()).slice(-2) + ":" +
        ("0" + m.getUTCSeconds()).slice(-2);
}

// java String#hashCode
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
        String.fromCharCode(27) + "]0;" + title + String.fromCharCode(7)
    );
}

function hideEmail(email) {
    return email.replace(/(.{2})(.*)(?=@)/,
        function (_gp1, gp2, gp3) {
            for (let i = 0; i < gp3.length; i++) {
                gp2 += "*";
            } return gp2;
        });
};
