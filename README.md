# 0Bot

Minecraft bot based on mineflayer to promote 0b0t.org and add a bridge between the server running 0Bot and the 0b0t discord. Also has basic command capabilities.

## Ingame Functions

- !discord shows the promoted (0b0t) discord link
- tpa accept for whitelisted users
- basic anti afk

## NPM packets

- mineflayer
- mineflayer-navigate
- discord.js
- dotenv
- forever (optional)

## Usage

Needs **Node.js 12+** to run.

Create the following files in your project root folder:

###env

	minecraftUsername=un
	minecraftPassword=pw
	discordToken=dt

###channels.json

	{
	  "0b0t.org": "687391771218411609",
	}

###whitelist.json

	[
	  "0bop",
	  "1_p",
	  "x0z0",
	  "blockparole",
	  "lit_furnace"
	]

npm run forever start 0Bot.js [server]
