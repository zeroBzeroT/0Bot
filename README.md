# 0Bot
Minecraft bot for anarchy servers based on *mineflayer* to promote 0b0t.org and add a bridge between the server running 0Bot and the 0b0t discord. Also has basic command capabilities.

[![discord](https://img.shields.io/discord/895546064260718622?logo=discord)](https://discord.0b0t.org)
[![reddit](https://img.shields.io/reddit/subreddit-subscribers/0b0t)](https://old.reddit.com/r/0b0t/)
![last commit](https://img.shields.io/github/last-commit/zeroBzeroT/0Bot)
![repo size](https://img.shields.io/github/languages/code-size/zeroBzeroT/0Bot.svg?label=repo%20size)

## In-game Functions
- **!discord** shows the promoted (0b0t) discord link
- **!tps** shows the approximated tps
- tpa accept for whitelisted users
- basic anti afk
- auto totem, equip and eat
- simple broadcast

## NPM packets
- discord.js
- mineflayer
- mineflayer-armor-manager
- mineflayer-auto-eat
- mineflayer-auto-totem
- mineflayer-pathfinder
- dotenv
- forever (optional)
- forever-monitor (optional)

## Usage
Needs **Node.js 18+** to run.

```sh
npm run debug
```

```sh
npm run forever start 0Bot.js [server]
```

Create the following files in your project root folder:

### .env
	minecraftUsername=un
	minecraftPassword=pw
	discordToken=dt
	authMePassword=apw
	eMail=aem
	discordLink=https://discord.0b0t.org/
	promotedServer=0b0t.org

### channels.json
	{
	  "0b0t.org": "687391771218411609",
	}

### whitelist.json (lowercase)
	[
	  "0bop"
	]

### promotion.txt
	%promoted% - The best server
	%promoted% has 1.12.2 dupe
	...

## Sources
- rewritten TPS code from https://github.com/SiebeDW/mineflayer-tps/
