/* <- imports -> */
const fetch = require("node-fetch");
const { Client } = require("discord.js-selfbot-v13");
const client = new Client({ checkUpdate: false });
const ini = require("ini");
const fs = require("fs");
const blessed = require("blessed");
const contrib = require("blessed-contrib");
const CLI = require("clui"), Spinner = CLI.Spinner;

/* <- globals, functions -> */
// globals
const countdown = new Spinner("Logging in...", ["-", "\\", "|", "/"]);
const config = ini.parse(fs.readFileSync("./config.ini", "utf-8"));
const startkey = "{black-fg}{white-bg}";
const endkey = "{/black-fg}{/white-bg}";

let screen = blessed.screen({
	smartCSR: true,
	fullUnicode: config.client.unicode === "true",
	dockBorders: true,
	autoPadding: true,
});

let focused = 0;
channel_id = undefined;
screen.title = "Discord Terminal Client";

// functions
function zip(rows) {
	return rows[0].map((_, c) => rows.map((row) => row[c]));
}

async function checkIfEmpty(str) {
	return str.trim() === "";
}

async function convertunix(unix) {
	let date = new Date(unix);
	let hour = date.getHours().toString();
	let minute = date.getMinutes().toString();
	let second = date.getSeconds().toString();

	if (hour.length == 1) {
		hour = "0" + hour;
	}
	if (minute.length == 1) {
		minute = "0" + minute;
	}
	if (second.length == 1) {
		second = "0" + second;
	}

	return `${hour}:${minute}:${second}`;
}

async function printHelp() {
	MessagesBox.log("{bold}Welcome to Discord Terminal!{/bold}");

	MessagesBox.log(
		`This client was written by paintingofblue & 13-05 using JavaScript. It is still in development, so expect bugs.`
	);
	MessagesBox.log(
		`If you have downloaded this outside of GitHub, you can find the source code here: https://github.com/paintingofblue/discord-terminal-client\n`
	);

	MessagesBox.log(
		`To get started, press ${startkey}Tab${endkey} to switch to the message box, use the ${startkey}Arrow Keys${endkey} to navigate & ${startkey}Enter${endkey} to select items in the list.`
	);
	MessagesBox.log(
		`Press ${startkey}Tab${endkey} again to switch back to the server list.`
	);
	MessagesBox.log(
		`Press ${startkey}Enter${endkey} to send a message when the message box is focused.`
	);
	MessagesBox.log(`Press ${startkey}Escape${endkey} to exit.`);
}

async function getMessages(node_name, id) {
	const channel = await client.channels.fetch(id);
	messages = await channel.messages.fetch({ limit: 100 });

	if (channel.type == "DM") {
		ServerList.setLabel(` {bold}DMs{/bold} `);
		MessagesBox.setLabel(` {bold}${node_name}{/bold} `);
	} else {
		ServerList.setLabel(` {bold}${server_name}{/bold} `);
		MessagesBox.setLabel(` {bold}#${channel.name}{/bold} `);
	}

	MessagesBox.setContent("");

	for (const [id, message] of messages.reverse()) {
		try {
			const attatchments = message.attachments.map(
				(attachments) => attachments.url
			);
			let time = await convertunix(message.createdTimestamp);

			if (attatchments.length != 0) {
				switch (message.cleanContent.length) {
					case 0:
						MessagesBox.log(
							`${time} ${message.author.username}#${message.author.discriminator}: ${attatchments}`
						);
						break;
					default:
						MessagesBox.log(
							`${time} ${message.author.username}#${message.author.discriminator}: ${message.cleanContent}\n${attatchments}`
						);
				}
			} else {
				MessagesBox.log(
					`${time} ${message.author.username}#${message.author.discriminator}: ${message.cleanContent}`
				);
			}
		} catch {
			void 0;
		}
	}
}

async function sendMessage(id, message) {
	const channel = await client.channels.fetch(id);
	// resolves an error i got with dms; basically, you can't check permissions of the client in a dm, so let's not check permissions if we're in a dm
	if (message.startsWith(config.client.prefix)) {
		let command = message.split(config.client.prefix)[1].split(" ")[0];
		switch (command) {
			case "help":
				printHelp();
				break;
			case "clear":
				MessagesBox.setContent("");
				EnterMessageBox.setContent("");
				screen.render();
				break;
			case "exit":
				process.exit();
			default:
				let time = await convertunix(Date.now());
				MessagesBox.log(`${time} {red-fg}{bold}[!]{/red-fg}{/bold} You do not have permission to send messages in this channel.`)
		}
	} else {
		if (channel.type === "DM") {
			channel.send(message);
		} else {
			let channel_sendable = channel
				.permissionsFor(client.user)
				.has("SEND_MESSAGES");

			switch (channel_sendable) {
				case true:
					channel.send(message);
					break;
				case false:
					let time = await convertunix(Date.now());
					MessagesBox.log(
						`${time} {red-fg}{bold}[!]{/red-fg}{/bold} You do not have permission to send messages in this channel.`
					);
			}
		}
	}
}

function configure_display() {
	screen.title = `Discord Terminal Client - ${client.user.tag}`
	ServerList = contrib.tree({
		top: "top",
		left: "left",
		width: "15%",
		height: "100%",
		label: " {bold}Server List{/bold} ",
		tags: true,
		border: {
			type: "line",
		},
		style: {
			fg: "white",
			border: {
				fg: "white",
			},
			selected: {
				fg: "black",
				bg: "white",
			},
		},
	});

	MessagesBox = blessed.log({
		left: "15%",
		width: "85.4%",
		height: "86%",
		tags: true,
		border: {
			type: "line",
		},
		style: {
			fg: "white",
			border: {
				fg: "white",
			},
		},
	});

	EnterMessageBox = blessed.textarea({
		top: "86%",
		left: "15%",
		width: "85.4%",
		height: "15%",
		tags: true,
		border: {
			type: "line",
		},
		label: " {bold}Enter Message{/bold} ",
		style: {
			fg: "white",
			border: {
				fg: "white",
			},
		},
	});

	ServerList.on("select", async function (node) {
		if (node.myCustomProperty) {
			channel_id = node.myCustomProperty;
			server_name = node.parent.name;
			EnterMessageBox.clearValue();
			await getMessages(node.name, node.myCustomProperty);
		}

		server_name = " {bold}Server List{/bold} ";
		screen.render();
	});

	EnterMessageBox.key(["enter"], async function (_ch, _key) {
		let time = await convertunix(Date.now());
		if (channel_id != undefined) {
			let message = await checkIfEmpty(EnterMessageBox.getValue());
			if (!message) {
				await sendMessage(channel_id, EnterMessageBox.getValue());
			} else if (message) {
				MessagesBox.log(
					`${time} {red-fg}{bold}[!]{/bold}{/red-fg} You cannot send an empty message.`
				);
			}
		} else if (channel_id === undefined) {
			MessagesBox.log(
				`${time} {red-fg}{bold}[!]{/bold}{/red-fg} You must select a channel to send a message.`
			);
		}

		EnterMessageBox.clearValue();
		screen.render();
	});

	EnterMessageBox.key(["tab"], function (_ch, _key) {
		focused = 0;
		ServerList.focus();
		screen.render();
	});

	screen.key(["tab"], function (_ch, _key) {
		if (focused === 0) {
			focused = 1;
			EnterMessageBox.focus();
			EnterMessageBox.input();
			screen.render();
		}
	});

	screen.key(["escape", "C-c"], function (_ch, _key) {
		return process.exit(0);
	});

	ServerList.focus();

	screen.append(ServerList);
	screen.append(MessagesBox);
	screen.append(EnterMessageBox);
}


/* <- client gateway events -> */
countdown.start();

client.on("ready", async () => {
	countdown.stop();
	configure_display();
	await printHelp();

	MessagesBox.log(`\nLogged in as ${startkey}${client.user.tag}${endkey}`);
	screen.render();

	guildnames = client.guilds.cache.map((guild) => guild.name);
	guildids = client.guilds.cache.map((guild) => guild.id);
	let list_dict = { extended: true, children: {} };

	list_dict["children"]["DMs"] = { "children": {} };
	list_dict["children"]["Servers"] = { "children": {} };

	for (i in zip([guildnames, guildids])) {
		let guild = await client.guilds.fetch(guildids[i]);
		let channel_names = guild.channels.cache
			.filter((channel) => channel.type === "GUILD_TEXT")
			.map((channel) => channel.name);
		let channel_ids = guild.channels.cache
			.filter((channel) => channel.type === "GUILD_TEXT")
			.map((channel) => channel.id);

		list_dict["children"]["Servers"]["children"][guildnames[i]] = { "children": {} };

		for (j in zip([channel_names, channel_ids])) {
			const channel = await client.channels.fetch(channel_ids[j]);
			channel_viewable = channel
				.permissionsFor(client.user)
				.has("VIEW_CHANNEL");

			if (channel_viewable) {
				list_dict["children"]["Servers"]["children"][guildnames[i]]["children"][j + 1] = {
					name: `#${channel_names[j]}`,
					myCustomProperty: channel_ids[j],
				};
			}
		}
	}

	let dm_names = client.channels.cache
		.filter((channel) => channel.type === "DM")
		.map((channel) => channel.recipient.username);
	let dm_ids = client.channels.cache
		.filter((channel) => channel.type === "DM")
		.map((channel) => channel.id);

	let dm_ids_sorted = dm_ids.sort(function (a, b) {
		return dm_names[dm_ids.indexOf(a)].localeCompare(
			dm_names[dm_ids.indexOf(b)]
		);
	});
	let dm_names_sorted = dm_names.sort(function (a, b) {
		return a.localeCompare(b);
	});

	for (i in zip([dm_names_sorted, dm_ids_sorted])) {
		list_dict["children"]["DMs"]["children"][i + 1] = {
			name: dm_names[i],
			myCustomProperty: dm_ids[i],
		};
	}

	ServerList.setData(JSON.parse(JSON.stringify(list_dict)));
	ServerList.focus();
	screen.render();
});

client.on("messageCreate", async (message) => {
	try {
		if (message.channel.id === channel_id) {
			const attatchments = message.attachments.map(
				(attachments) => attachments.url
			);
			let time = await convertunix(message.createdTimestamp);
			if (attatchments.length != 0) {
				if (message.cleanContent.length != 0) {
					MessagesBox.log(
						`${time} ${message.author.username}#${message.author.discriminator}: ${message.cleanContent}\n${attatchments}`
					);
				} else {
					MessagesBox.log(
						`${time} ${message.author.username}#${message.author.discriminator}: ${attatchments}`
					);
				}
			} else {
				MessagesBox.log(
					`${time} ${message.author.username}#${message.author.discriminator}: ${message.cleanContent}`
				);
			}
		}
	} catch {
		void 0;
	}
});

/* <- client startup -> */
fetch("https://discord.com/api/v8/users/@me", {
	method: "GET",
	headers: {
		Authorization: `${config.client.token}`,
	},
})
	.then((res) => {
		switch (res.status) {
			case 200:
				client.login(config.client.token)
				break;
			default:
				countdown.stop();
				console.log(
					"\033[31m[!]\033[0m Invalid token.\n\nExiting in 5 seconds..."
				);
				setTimeout(() => {
					process.exit(0);
				}, 5000);
		}
	}).catch(() => {
		countdown.stop();
		console.log(
			"\033[31m[!]\033[0m Unable to reach Discord.\n\nExiting in 5 seconds..."
		);
		setTimeout(() => {
			process.exit(0);
		}, 5000);
	});