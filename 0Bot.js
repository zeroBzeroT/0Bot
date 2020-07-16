// TODO QUEUE
// TODO SAY NOTHING

//process.argv[2] = "0b0t.org"

if (process.argv.length != 3) {
    console.log('Usage : node 0Bot.js <host>')
    process.exit(1)
}

var server = process.argv[2];

//const fs = require('fs');
const mineflayer = require('mineflayer');
const Discord = require('discord.js');
const dotenv = require('dotenv');
dotenv.config();

//const settings = require('settings.json')

//const ms = require('./minestat');

var discordLink = "https://discord.gg/WmXCfTA";
var changeTopicToStats = true;

var messageQueue = [];
var maxMessageQueueLength = 5;

var whiteList = [
    "1_p",
    "x0z0",
    "0bop"
];

var intervalDiscordTopic = 30 * 2; // seconds
var intervalMove = 10 * 2; // seconds
var intervalBroadcast = 60 * 2; // seconds
var waitOnCrash = 120; // seconds

var lastTimeMoved = -1; // ts
var bclasttime = -1; // ts
var maxrandom = 5; // 0-5 seconds added to movement interval (randomly)

var moving = 0;
var connected = 0;
var movingDir = 0;

var tps = "";
var topic = "";

var pi = 3.14159;

var channels = {
    "0b0t.org": "687391771218411609",
    "1b1t.org": "692273201526603786",
    "2b2t.org": "687391770153320486",
    "2b2tpvp.net": "591979449084280842",
    "3b3t.uk": "692273327577759754",
    "6a6k.us": "692373103598370836",
    "6b9t.xyz": "570220225933475840",
    "8b8t.cf": "570220171747393536",
    "9b6t.eu": "692375040213385338",
    "9b9t.com": "687391774255087620",
    "9b9t.org": "692371945852764180",
    "oldfag.org": "687391766177120339",
    "anarchy-mc.com": "687391772703195147",
    "b2t2.org": "692273373698326528",
    "anarchy.bar": "570216008283848729",
    "constantiam.net": "692371190202892329",
    "exteiram.org": "695904650322247690",
};

var broadcasts = [
    "Join my stepuncles autocratic minecraft server: 0b0t.org",
    "Discord: " + discordLink + "",
    "Reddit: https://reddit.com/r/0b0t/",
    "Team Zero feat. Scrooge McDuck on /ftop! | 0b0t.org",
    "Join the unofficial " + server + " discord: " + discordLink + "",
    "Join 0b0t.org hierarchy server TOWER7 DUPE ENABLED",
    "0b0t.org | Dora Dupe ENABLED",
    "Join 0b0t.org brand new hierarchy server",
    "My girlfriend just started an hierarchy server and we need players, we also have a discord! IP: 0b0t.org",
    "0b0t.org is my girlfriends hierarchy server, the map is old as fuck",
    "Please play on my girlfriends hierarchy server the ip is 0b0t.org we need new skilled players",
    "New ip 0b0t.org and new better host ur welcome",
    "Remember: This is just the Test Server of 0b0t.org",
    "Real man play " + server + " and for you we have 0b0t.org",
    "0B0T.org - The best server",
    "Why the hell are you on " + server + "? Come and join 0B0T.org!",
    "Join Team Zero the largest and most active Group on " + server + " " + discordLink + "",
    "0b0t.org On Top - Come Join 0B0T.org",
    "Fitmc Is On 0b0t.org Right Now!",
    "Omg! BarrenDome is live on 0b0t.org!"
]

// DISCORD BOT
const discordBot = new Discord.Client();

discordBot.on('ready', () => {
    console.log("Logged in as Discord Bot " + discordBot.user.tag + "!");

    if (discordBot.user !== undefined && discordBot.user != null)
        discordBot.user.setActivity('0b0t.org', { type: 'PLAYING' });

    getDiscordChannel(server).setTopic(server + " | Connecting... | Last Update: " + utcDateTime() + " UTC");
});

// CHAT DISCORD -> GAME
discordBot.on('message', msg => {
    if (msg.author.id != discordBot.user.id) {
        console.log("[" + msg.author.tag + "]" + ": " + msg.content + " " + msg.channel.id);

        if (msg.channel.id == channels[server]) {
            var message = "[" + msg.author.username + "]" + ": " + msg.content;

            minecraftBot.chat(message.substr(0, 240));
        } else if (msg.channel.name == "announcements") {
            minecraftBot.chat("> ANNOUNCEMENT: " + msg.content);
        }
    }
});

discordBot.login(process.env.discordToken);

// MINECRAFT BOT
const minecraftBot = mineflayer.createBot({
    host: server,
    port: 25565,
    username: process.env.minecraftUsername,
    password: process.env.minecraftPassword,
    verbose: true,
    version: "1.12.2",
})

//const navigatePlugin = require('mineflayer-navigate')(mineflayer);
//navigatePlugin(minecraftBot);

// MINECRAFT BOT LOGIN
minecraftBot.on('login', function () {
    setInterval(function () {
        // Channel Topic
        if (changeTopicToStats) {
            if (minecraftBot.players !== undefined && minecraftBot.players != null) {
                topic = server + " | " + sizeOf(minecraftBot.players) + "/" + minecraftBot.game.maxPlayers + " Players online | " + tps + "Last Update: " + utcDateTime() + " UTC | Type in the channel to communicate with the server";
            }

            if (getDiscordChannel(server).topic != topic && topic != null)
                getDiscordChannel(server).setTopic(topic);

            minecraftBot.chat("/tps");
        }
    }, intervalDiscordTopic * 1000);

    connected = 1;

    console.log("Logged in as Minecraft Bot " + process.env.minecraftUsername + "!");

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
});

// CHAT GAME -> DISCORD
minecraftBot.on('chat', function (username, message) {
    if (username === minecraftBot.username) return;

    if (username == "queue") {
        getDiscordChannel(server).setTopic(server + " | Queue: " + message + " | Last Update: " + utcDateTime() + " UTC");
    } else if (username == "15m") {
        tps = "TPS: " + message + " | ";
    } else if (message.toLowerCase() == "~help") {
        //minecraftBot.chat("> ~help, ~discord");
    } else if (message.toLowerCase() == "~kill") {
        //minecraftBot.chat("> type /kill " + botName + " to kill the bot");
    } else if (message.toLowerCase() == "~ftop") {
        //minecraftBot.chat("> [1] Team Zero, [2] Masons, [3] Spawn Police, [4] ISIS, [5] Imperials");
    } else if (message.toLowerCase() == "~random") {
        //minecraftBot.chat(Math.floor(Math.random() * 6).toString());
    } else if (message.toLowerCase() == "~discord" || message.toLowerCase() == "!discord" || message.toLowerCase() == "?discord") {
        minecraftBot.chat("> Join " + discordLink + " for the " + server + " discord chat bridge.");
    } else if (message.toLowerCase() == "~leave" && whiteList.includes(username.toLowerCase())) {
        minecraftBot.quit();
    } else if (message.toLowerCase() == "~tpaccept" && whiteList.includes(username.toLowerCase())) {
        minecraftBot.chat("/tpaccept " + username);
    } else if (message.toLowerCase() == "~tpa" && whiteList.includes(username.toLowerCase())) {
        minecraftBot.chat("/tpa " + username);
    } else {
        var discordChannel = getDiscordChannel(server);

        if (discordChannel != null) {
            var color = mod(hashCode(username), 16777215);

            const embed = new Discord.MessageEmbed()
                .setAuthor(username, "https://minotar.net/avatar/" + username)
                .setDescription(message)
                .setColor(color)
                .setFooter(utcDateTime());

            discordChannel.send(embed);
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
        }
        else {
            console.log(found[1] + " is not allowed to teleport.");
        }
    }
});

// BOT HEALTH
minecraftBot.on('health', function () {
    if (connected < 1) {
        return;
    }

    if (minecraftBot.food < 15) {
        minecraftBot.activateItem();
        console.log("Activated item due to low health.");
    }
});

// BOT CRONJOBS
minecraftBot.on('time', function () {
    if (connected < 1) {
        return;
    }

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
    if (bclasttime < 0) {
        bclasttime = minecraftBot.time.age;
    } else {
        var randomadd = Math.random() * 20 + maxrandom;

        var intervalbc = intervalBroadcast * 20 + randomadd;

        if (minecraftBot.time.age - bclasttime > intervalbc) {
            var message = broadcasts[Math.floor(Math.random() * broadcasts.length)];
            minecraftBot.chat("> " + message);
            bclasttime = minecraftBot.time.age;
        }
    }
});

//// ITEM PICKUP
//bot.on('playerCollect', function(collector, collected) {
//  if(collector.type === 'player' && collected.type === 'object' && collector.username == bot.username) {
//    var rawItem = collected.metadata[10];
//    var item = mineflayer.Item.fromNotch(rawItem);
//  }
//});

// BOT SPAWN
minecraftBot.on('spawn', function () {
    connected = 1;
});

// BOT DISCO
minecraftBot.on('end', function () {
    console.log("Disconnected. Waiting " + waitOnCrash + " seconds...");

    //var discordChannel = getDiscordChannel(server);

    //if (discordChannel != null) {
    //    discordChannel.setTopic(server + " | Disconnected | Last Update: " + utcDateTime() + " UTC");
    //}

    minecraftBot.connect();

    //sleep(waitOnCrash * 1000);

    //process.exit();
});

// BOT ERROR
minecraftBot.on('error', function (err) {
    console.log(err + ". Waiting " + waitOnCrash + " seconds...");

    //var discordChannel = getDiscordChannel(server);

    //if (discordChannel != null) {
    //    discordChannel.setTopic(server + " | Error | Last Update: " + utcDateTime() + " UTC");
    //}

    sleep(waitOnCrash * 1000);

    process.exit();
});

// NODE EXCEPTION
process.on('uncaughtException', function (err) {
    console.log("Exception. Waiting " + (5 * waitOnCrash) + " seconds...");
    console.log(err.stack);

    //var discordChannel = getDiscordChannel(server);

    //if (discordChannel != null) {
    //    discordChannel.setTopic(server + " | Exception | Last Update: " + utcDateTime() + " UTC");
    //}

    sleep(5 * waitOnCrash * 1000);
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
            //sleep(100); 
        }

        ret = discordBot.channels.cache.get(channelId);
    } while (typeof ret === 'undefined' || ret == null);

    return ret;
}

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

function hashCode(str) { // java String#hashCode
    var hash = 0;
    for (var i = 0; i < str.length; i++) {
        hash = str.charCodeAt(i) + ((hash << 5) - hash);
    }
    return hash;
}

function mod(x, m) {
    return (x % m + m) % m;
}
