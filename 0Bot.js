//process.argv[2] = "0b0t.org"

if (process.argv.length != 3) {
    console.log('Usage : node <scriptname>.js <host>')
    process.exit(1)
}

var server = process.argv[2];

const fs = require('fs');
const mineflayer = require('mineflayer');
const Discord = require('discord.js');
const dotenv = require('dotenv');
dotenv.config();

var discordLink = "https://discord.gg/WmXCfTA";
var changeTopicToStats = true;

var doAdvertising = false;
var promoted = "0b0t.org"

// TODO MESSAGE QUEUE
//var messageQueue = [];
//var maxMessageQueueLength = 5;

var intervalDiscordTopic = 30 * 2; // seconds
var intervalMove = 10 * 2; // seconds
var intervalBroadcast = 60 * 2; // seconds
var waitOnCrash = 120 * 5; // seconds

var lastTimeMoved = -1; // ts
var lastTimeBroadcast = -1; // ts
var maxrandom = 5; // 0-5 seconds added to movement interval (randomly)

var moving = 0;
var movingDir = 0;

var tps = "";
var topic = server + " | Connecting... | Last Update: " + utcDateTime() + " UTC";

var pi = 3.14159;

var whiteList = [
    "1_p",
    "x0z0",
    "0bop"
];

var channels = require('./channels.json') //JSON.parse(fs.readFileSync('channels.json').toString());
var broadcasts = fs.readFileSync('promotion.txt').toString().split("\n");

let session
try { session = JSON.parse(fs.readFileSync('session.json', 'utf8')) } catch (err) { }

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

var minecraftConnected = false;
var discordConnected = false;

// DISCORD BOT
discordBot.on('ready', () => {
    console.log("Logged in as Discord Bot " + discordBot.user.tag + ".");
    discordConnected = true;

    if (discordBot.user !== undefined && discordBot.user != null) {
        discordBot.user.setActivity('0b0t.org', {
            type: 'PLAYING'
        });
    }

    var channel = getDiscordChannel(server);

    if (channel != null) {
        channel.send(":white_check_mark: **Bridge for server '" + server + "' has started**");
    }
});

// CHAT DISCORD -> GAME
discordBot.on('message', msg => {
    if (discordConnected && msg.author.id != discordBot.user.id) {
        if (msg.channel.id == channels[server]) {
            if (msg.content.startsWith("!")) {
                var channel = getDiscordChannel(server);

                if (msg.content.toLowerCase() == "!help") {
                    channel.send(":arrow_forward: Commands are: !help.");
                }
                else {
                    channel.send(":warning: Unknown Command!");
                }
            }
            else {
                var message = "[" + msg.author.username + "]" + ": " + msg.content;

                minecraftBot.chat(message.substr(0, 240));
            }
        } else if (msg.channel.name == "announcements") {
            minecraftBot.chat("> ANNOUNCEMENT: " + msg.content);
        }
    }
});

discordBot.login(process.env.discordToken);

// MINECRAFT BOT
var minecraftBot;
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

    var handItem = minecraftBot.inventory.findInventoryItem(261); // Bow
    if (handItem) { minecraftBot.equip(handItem, 'hand'); return; }

    var headItem = minecraftBot.inventory.findInventoryItem(310, null); // Diamond Helmet
    if (headItem) { minecraftBot.equip(headItem, 'head'); return; }

    var chestItem = minecraftBot.inventory.findInventoryItem(311, null); // Diamond Chestplate
    if (chestItem) { minecraftBot.equip(chestItem, 'torso'); return; }

    var legsItem = minecraftBot.inventory.findInventoryItem(312, null); // Diamond Leggings
    if (legsItem) { minecraftBot.equip(legsItem, 'legs'); return; }

    var feetItem = minecraftBot.inventory.findInventoryItem(313, null); // Diamond Boots
    if (feetItem) { minecraftBot.equip(feetItem, 'feet'); return; }

    var offhandItem = minecraftBot.inventory.findInventoryItem(449); // Totem of Undying
    if (offhandItem) { minecraftBot.equip(offhandItem, 'off-hand'); return; }
}

function updateDiscordTopic() {
    if (discordConnected && changeTopicToStats) {
        if (minecraftConnected && minecraftBot.players !== undefined && minecraftBot.players != null) {
            topic = server + " | " + sizeOf(minecraftBot.players) + "/" + minecraftBot.game.maxPlayers + " Players online | " + tps + "Last Update: " + utcDateTime() + " UTC | Type in the channel to communicate with the server";
        }

        if (getDiscordChannel(server).topic != topic && topic != null)
            getDiscordChannel(server).setTopic(topic);

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
            if (movingDir == 1) {
                //minecraftBot.navigate.to(minecraftBot.entity.position.offset(-2, 0, 2));
                movingDir = 0;
            }
            else {
                //minecraftBot.navigate.to(minecraftBot.entity.position.offset(2, 0, -2));
                movingDir = 1;
            }
        }, intervalMove * 1000);

        setInterval(autoEquipEatTotem, 50)
    });

    // CHAT GAME -> DISCORD
    minecraftBot.on('chat', function (username, message) {
        if (username === minecraftBot.username) return;

        if (username == "queue") {
            topic = server + " | Queue: " + message + " | Last Update: " + utcDateTime() + " UTC";
        } else if (username == "15m") {
            tps = "TPS: " + message + " | ";
        } else if (message.toLowerCase() == "~discord" || message.toLowerCase() == "!discord" || message.toLowerCase() == "?discord") {
            minecraftBot.chat("> Join " + discordLink + " for the " + server + " discord chat bridge.");
        } else if (message.toLowerCase() == "~leave" && whiteList.includes(username.toLowerCase())) {
            minecraftBot.quit();
        } else if (discordConnected) {
            var channel = getDiscordChannel(server);

            if (channel != null) {
                var color = mod(hashCode(username), 16777215);

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
        var regex = "^([a-zA-Z0-9_]{3,16}) wants to teleport to you\.$"
        var found = msg.toString().match(regex);

        if (found != null) {
            if (whiteList.includes(found[1].toLowerCase())) {
                minecraftBot.chat("/tpy " + found[1]);
                console.log(found[1] + " teleported.");
            }
            else {
                console.log(found[1] + " is not allowed to teleport.");
            }
        }
    });

    // BOT HEALTH - TODO select food
    minecraftBot.on('health', function () {
        let food = minecraftBot.food
        let health = minecraftBot.health

        minecraftBot.it

        if (health < 20) {
            minecraftBot.activateItem();
            console.log('eat something because low health')
        }
        else if (food < 17) {
            minecraftBot.activateItem();
            console.log('eat something because hunger')
        }
    })

    // BOT CRONJOBS
    minecraftBot.on('time', function () {
        if (!minecraftConnected) return;

        // Look Around
        if (lastTimeMoved < 0) {
            lastTimeMoved = minecraftBot.time.age;
        } else {
            var randomadd = Math.random() * 20 + maxrandom;
            var interval = intervalMove * 20 + randomadd;

            if (minecraftBot.time.age - lastTimeMoved > interval) {
                if (moving == 1) {
                    minecraftBot.setControlState('sneak', true);
                    minecraftBot._client.write('arm_animation', { hand: 0 });
                    moving = 0;
                } else {
                    var yaw = Math.random() * pi - (0.5 * pi);
                    var pitch = Math.random() * pi - (0.5 * pi);
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
                var randomadd = Math.random() * 20 + maxrandom;

                var intervalbc = intervalBroadcast * 20 + randomadd;

                if (minecraftBot.time.age - lastTimeBroadcast > intervalbc) {
                    var message = broadcasts[Math.floor(Math.random() * broadcasts.length)];

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
        var jsonReason = JSON.parse(reason);

        console.log("Minecraft bot was kicked for " + jsonReason.text);

        var channel = getDiscordChannel(server);

        if (channel != null) {
            channel.send(":angry: **Bridge for server '" + server + "' was kicked with the reason: " + jsonReason.text + "**");
        }
    });

    // BOT DISCO
    minecraftBot.on('end', function () {
        minecraftConnected = false;
        console.log("Minecraft bot has ended! Attempting to reconnect in 30 s...");

        var channel = getDiscordChannel(server);

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

        var channel = getDiscordChannel(server);

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
    var ret = null;
    var first = true;

    var channelId = channels[channel];

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

    var channel = getDiscordChannel(server);

    if (channel != null) {
        topic = server + " | Offline | Last Update: " + utcDateTime() + " UTC";
        channel.send(":octagonal_sign: **Bridge for server '" + server + "' has stopped**");
        channel.setTopic(topic);
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
    var start = new Date().getTime();

    for (var i = 0; i < 1e14; i++) {
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
    var size = 0;

    for (i in data) {
        size++;
    }

    return size;
};

/**
 * formatted utc time
 */
function utcDateTime() {
    var m = new Date();
    var dateString =
        m.getUTCFullYear() + "/" +
        ("0" + (m.getUTCMonth() + 1)).slice(-2) + "/" +
        ("0" + m.getUTCDate()).slice(-2) + " " +
        ("0" + m.getUTCHours()).slice(-2) + ":" +
        ("0" + m.getUTCMinutes()).slice(-2) + ":" +
        ("0" + m.getUTCSeconds()).slice(-2);
    return dateString;
}

// java String#hashCode
function hashCode(str) { 
    var hash = 0;
    for (var i = 0; i < str.length; i++) {
        hash = str.charCodeAt(i) + ((hash << 5) - hash);
    }
    return hash;
}

function mod(x, m) {
    return (x % m + m) % m;
}
