# 0Bot
Minecraft bot based on *mineflayer* to promote 0b0t.org and add a bridge between the server running 0Bot and the 0b0t discord. Also has basic command capabilities.

## In-game Functions
- **!discord** shows the promoted (0b0t) discord link
- **!tps** shows the approximated tps
- tpa accept for whitelisted users
- basic anti afk

## NPM packets
- mineflayer
- mineflayer-armor-manager
- mineflayer-auto-eat
- mineflayer-auto-totem
- mineflayer-pathfinder
- discord.js
- dotenv
- forever (optional)

## Usage
Needs **Node.js 18+** to run.

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
	  "0bop",
	  "1_p",
	  "x0z0",
	  "blockparole",
	  "lit_furnace"
	]

### run

```sh
npm run debug
```

```sh
npm run forever start 0Bot.js [server]
```

## Sources
- rewritten TPS code from https://github.com/SiebeDW/mineflayer-tps/