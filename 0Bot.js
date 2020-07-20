//process.argv[2] = "0b0t.org"

if (process.argv.length !== 3) {
    console.log('Usage : node <scriptname>.js <host>')
    process.exit(1)
}

const server = process.argv[2];

const fs = require('fs');
const mineflayer = require('mineflayer');
const Discord = require('discord.js');
const dotenv = require('dotenv');
dotenv.config();

const discordLink = "https://discord.gg/WmXCfTA";
const changeTopicToStats = true;

const doAdvertising = false;
const promoted = "0b0t.org";

// TODO MESSAGE QUEUE
//var messageQueue = [];
//var maxMessageQueueLength = 5;

const intervalDiscordTopic = 30 * 2; // seconds
const intervalMove = 10 * 2; // seconds
const intervalBroadcast = 60 * 2; // seconds
const waitOnCrash = 120 * 5; // seconds

let lastTimeMoved = -1; // ts
let lastTimeBroadcast = -1; // ts
const maxrandom = 5; // 0-5 seconds added to movement interval (randomly)

let moving = 0;
let movingDir = 0;

let tps = "";
let topic = server + " | Connecting... | Last Update: " + utcDateTime() + " UTC";

const pi = 3.14159;

const whiteList = [
    "1_p",
    "x0z0",
    "0bop"
];

const channels = require('./channels.json'); //JSON.parse(fs.readFileSync('channels.json').toString());
const broadcasts = fs.readFileSync('promotion.txt').toString().split("\n");

let session
try {
    session = JSON.parse(fs.readFileSync('session.json', 'utf8'))
} catch (err) {
}

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

    console.log("Logged in as Discord Bot " + discordBot.user.tag + ".");
    discordConnected = true;

    discordBot.user.setActivity('0b0t.org', {
        type: 'PLAYING'
    }).then(() => console.log('Changed presence'));

    const channel = getDiscordChannel(server);

    if (channel != null) {
        channel.send(":white_check_mark: **Bridge for server '" + server + "' has started**");
    }

});


// MINECRAFT BOT
let minecraftBot;
// CHAT DISCORD -> GAME
discordBot.on('message', msg => {

    if (discordConnected && msg.author.id !== discordBot.user.id) {
        if (msg.channel.id === channels[server]) {
            if (msg.content.startsWith("!")) {
                const channel = getDiscordChannel(server);

                if (msg.content.toLowerCase() === "!help") {
                    channel.send(":arrow_forward: Commands are: !help.");
                } else {
                    channel.send(":warning: Unknown Command!");
                }
            } else {
                const message = "[" + msg.author.username + "]" + ": " + msg.content;

                minecraftBot.chat(message.substr(0, 240));
            }
        }
    }

});

discordBot.login(process.env.discordToken); // TODO: do not ignore returned promise then()
relog();

// TODO NAVIGATION
//const navigatePlugin = require('mineflayer-navigate')(mineflayer);
//navigatePlugin(minecraftBot);

function relog() {
    console.log("Attempting to (re)connect...");
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
    if (discordConnected && changeTopicToStats) {
        if (minecraftConnected && minecraftBot.players !== undefined && minecraftBot.players != null) {
            topic = server + " | " + sizeOf(minecraftBot.players) + "/" + minecraftBot.game.maxPlayers + " Players online | " + tps + "Last Update: " + utcDateTime() + " UTC | Type in the channel to communicate with the server";
        }

        if (getDiscordChannel(server).topic !== topic && topic != null)
            getDiscordChannel(server).setTopic(topic); // TODO: do not ignore returned promise then()

        minecraftBot.chat("/tps");
    }
}

function bindEvents(minecraftBot) {
    // SAVED SESSION
    minecraftBot._client.on('session', () => {
        fs.writeFileSync('session.json', JSON.stringify(minecraftBot._client.session))
    })

    // MINECRAFT BOT LOGIN
    minecraftBot.on('login', function () {
        // Channel Topic
        setInterval(updateDiscordTopic, intervalDiscordTopic * 1000);

        minecraftConnected = 1;

        console.log("Logged in as Minecraft Bot " + process.env.minecraftUsername + "!");

        // Anti Afk
        // TODO Move/Navigation
        setInterval(function () {
            if (movingDir === 1) {
                //minecraftBot.navigate.to(minecraftBot.entity.position.offset(-2, 0, 2));
                movingDir = 0;
            } else {
                //minecraftBot.navigate.to(minecraftBot.entity.position.offset(2, 0, -2));
                movingDir = 1;
            }
        }, intervalMove * 1000);

        setInterval(autoEquipEatTotem, 50)
    });

    // CHAT GAME -> DISCORD
    minecraftBot.on('chat', function (username, message) {
        if (username === minecraftBot.username) return;

        if (username === "queue") {
            topic = server + " | Queue: " + message + " | Last Update: " + utcDateTime() + " UTC";
        } else if (username === "15m") {
            tps = "TPS: " + message + " | ";
        } else if (message.toLowerCase() === "~discord" || message.toLowerCase() === "!discord" || message.toLowerCase() === "?discord") {
            minecraftBot.chat("> Join " + discordLink + " for the " + server + " discord chat bridge.");
        } else if (message.toLowerCase() === "~leave" && whiteList.includes(username.toLowerCase())) {
            minecraftBot.quit();
        } else if (discordConnected) {
            const channel = getDiscordChannel(server);

            if (channel != null) {
                const color = mod(hashCode(username), 16777215);

                const embed = new Discord.MessageEmbed()
                    .setAuthor(username, "https://minotar.net/avatar/" + username)
                    .setDescription(message)
                    .setColor(color)
                    .setFooter(utcDateTime());

                channel.send(embed);
            }
        }
    });

    // TPA REQUEST
    minecraftBot.on('message', msg => {
        const regex = "^([a-zA-Z0-9_]{3,16}) wants to teleport to you\.$";
        const found = msg.toString().match(regex);

        if (found != null) {
            if (whiteList.includes(found[1].toLowerCase())) {
                minecraftBot.chat("/tpy " + found[1]);
                console.log(found[1] + " teleported.");
            } else {
                console.log(found[1] + " is not allowed to teleport.");
            }
        }
    });

    // BOT HEALTH - TODO select food
    minecraftBot.on('health', function () {
        let food = minecraftBot.food
        let health = minecraftBot.health

        // minecraftBot.it // wtf is this?

        if (health < 20) {
            minecraftBot.activateItem();
            console.log('eat something because low health')
        } else if (food < 17) {
            minecraftBot.activateItem();
            console.log('eat something because hunger')
        }
    })

    // BOT CRONJOBS
    minecraftBot.on('time', function () {
        if (!minecraftConnected) return;
        let randomadd;
        // Look Around
        if (lastTimeMoved < 0) {
            lastTimeMoved = minecraftBot.time.age;
        } else {
            randomadd = Math.random() * 20 + maxrandom;
            const interval = intervalMove * 20 + randomadd;

            if (minecraftBot.time.age - lastTimeMoved > interval) {
                if (moving === 1) {
                    minecraftBot.setControlState('sneak', true);
                    minecraftBot._client.write('arm_animation', {hand: 0});
                    moving = 0;
                } else {
                    const yaw = Math.random() * pi - (0.5 * pi);
                    const pitch = Math.random() * pi - (0.5 * pi);
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

    // BOT SPAWN
    minecraftBot.on('spawn', function () {
        minecraftConnected = true;
        updateDiscordTopic();
    });

    // BOT KICK
    minecraftBot.on('kicked', function (reason) {
        const jsonReason = JSON.parse(reason);

        console.log("Minecraft bot was kicked for " + jsonReason.text);

        const channel = getDiscordChannel(server);

        if (channel != null) {
            channel.send(":angry: **Bridge for server '" + server + "' was kicked with the reason: " + jsonReason.text + "**");
        }
    });

    // BOT DISCO
    minecraftBot.on('end', function () {
        minecraftConnected = false;
        console.log("Minecraft bot has ended! Attempting to reconnect in 30 s...");

        const channel = getDiscordChannel(server);

        if (channel != null) {
            topic = server + " | Disconnected | Last Update: " + utcDateTime() + " UTC";
            channel.send(":warning: **Bridge for server '" + server + "' disconnected! Attempting to reconnect in 30 s...**");
        }

        setTimeout(relog, 30000);
    });

    // BOT ERROR
    minecraftBot.on('error', function (err) {
        minecraftConnected = false;
        console.log("Minecraft bot error '" + err.errno + "'.");

        const channel = getDiscordChannel(server);

        if (channel != null) {
            topic = server + " | Error | Last Update: " + utcDateTime() + " UTC";
            channel.send(":sos: **Bridge for server '" + server + "' had the error: " + err.errno + "**");
        }
    });
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

function exitHandler(options, exitCode) {
    discordConnected = false;
    minecraftConnected = false;

    const channel = getDiscordChannel(server);

    if (channel != null) {
        topic = server + " | Offline | Last Update: " + utcDateTime() + " UTC";
        channel.send(":octagonal_sign: **Bridge for server '" + server + "' has stopped**");
        channel.setTopic(topic); // TODO: do not ignore returned promise then()
    }
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
/**
 * Sleeps for a given amount of milliseconds
 * @param milliseconds
 */
function sleep(milliseconds) {
    const start = new Date().getTime();

    for (let i = 0; i < 1e14; i++) {
        if ((new Date().getTime() - start) > milliseconds) {
            break;
        }
    }
}

/**
 * Size of an array
 * @param data array
 */
function sizeOf(data) {
    let size = 0;

    for (let i in data) {
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

function mod(x, m) {
    return (x % m + m) % m;
}
