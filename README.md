# 0Bot

Minecraft bot based on mineflayer to promote 0b0t.org and add a bridge between the server running 0Bot and the 0b0t discord. Also has basic command capabilities.

## Ingame Functions

- !discord shows the promoted (0b0t) discord link
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

Needs **Node.js 14+** to run.

forever start 0Bot.js [server]

Create the following files in your project root folder:

### .env

	minecraftUsername=un
	minecraftPassword=pw
	discordToken=dt

### channels.json

	{
	  "0b0t.org": "687391771218411609",
	}

### whitelist.json

	[
	  "0bop"
	]

### promotion.txt

	%promoted% - The best server
	%promoted% has 1.12.2 dupe
	...

## Sources

- adapted tps code from https://github.com/SiebeDW/mineflayer-tps/
