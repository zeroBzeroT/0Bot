# 0Bot

Minecraft bot based on mineflayer to promote 0b0t.org and add a bridge between the server running 0Bot and the 0b0t discord. Also has basic command capabilities.

## Ingame Functions

- !discord shows the 0b0t discord link
- tpa accept for whitelisted users
- basic anti afk

## NPM packets

- mineflayer
- discord.js
- dotenv

## Usage

Needs **Node.js 12+** to run.

Create a file called **.env** in the project root folder with the following content:

	minecraftUsername=un
	minecraftPassword=pw
	discordToken=dt

npm run forever start 0Bot.js [server]
