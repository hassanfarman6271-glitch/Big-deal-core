const { Client, GatewayIntentBits } = require("discord.js");
const fs = require("fs");
const http = require("http");

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent
  ]
});

const PREFIX = "!";

let db = { users: {} };

if (fs.existsSync("./database.json")) {
  db = JSON.parse(fs.readFileSync("./database.json"));
}

function saveDB() {
  fs.writeFileSync("./database.json", JSON.stringify(db, null, 2));
}

function getUser(id) {
  if (!db.users[id]) {
    db.users[id] = { bank: 0, holding: 0, daily: 0, pending: 0 };
    saveDB();
  }
  return db.users[id];
}

client.once("ready", () => {
  console.log(`🔥 Big Deal Bot Ready: ${client.user.tag}`);
});

client.on("messageCreate", async (message) => {
  if (message.author.bot) return;
  if (!message.content.startsWith(PREFIX)) return;

  const args = message.content.slice(PREFIX.length).trim().split(/ +/);
  const command = args.shift().toLowerCase();

  if (command === "ping") {
    return message.reply("🏓 Pong!");
  }

  if (command === "help") {
    return message.reply(`📌 **Commands**\n\n!ping\n!balance\n!daily\n!money add/remove @user amount\n!withdraw amount\n!leaderboard\n!qr <upi_id>`);
  }

  if (command === "balance" || command === "bal") {
    const user = getUser(message.author.id);
    return message.reply(`🏦 Bank: ${user.bank} BIGPAY\n💎 Holding: ${user.holding} BIGPAY`);
  }

  if (command === "daily") {
    const user = getUser(message.author.id);
    const now = Date.now();
    if (now - user.daily < 86400000) {
      return message.reply("⏳ Daily already claimed.");
    }
    user.bank += 500;
    user.daily = now;
    saveDB();
    return message.reply("🎁 You received 500 BIGPAY!");
  }

  if (command === "money") {
    const action = args[0];
    const targetUser = message.mentions.users.first();
    const amount = parseInt(args[2]);
    if (!targetUser) return message.reply("❌ Mention a user.");
    if (isNaN(amount) || amount <= 0) return message.reply("❌ Invalid amount.");
    const target = getUser(targetUser.id);
    if (action === "add") {
      target.holding += amount;
      saveDB();
      return message.reply(`✅ Added ${amount} BIGPAY to ${targetUser.username}`);
    }
    if (action === "remove") {
      if (target.holding < amount) return message.reply("❌ Not enough holding.");
      target.holding -= amount;
      saveDB();
      return message.reply(`✅ Removed ${amount} BIGPAY from ${targetUser.username}`);
    }
  }

  if (command === "withdraw") {
    const amount = parseInt(args[0]);
    if (isNaN(amount) || amount <= 0) return message.reply("❌ Invalid amount.");
    const user = getUser(message.author.id);
    if (user.bank < amount) return message.reply("❌ Not enough balance.");
    user.bank -= amount;
    saveDB();
    return message.reply(`✅ Withdraw request created for ${amount} BIGPAY`);
  }

  if (command === "leaderboard" || command === "lb") {
    const sorted = Object.entries(db.users)
      .map(([id, data]) => ({ id, total: (data.bank || 0) + (data.holding || 0) }))
      .sort((a, b) => b.total - a.total)
      .slice(0, 10);
    if (sorted.length === 0) return message.reply("❌ Koi data nahi hai abhi.");
    const medals = ["🥇", "🥈", "🥉"];
    let board = "🏆 **BIGPAY Leaderboard**\n\n";
    for (let i = 0; i < sorted.length; i++) {
      const medal = medals[i] || `**#${i + 1}**`;
      board += `${medal} <@${sorted[i].id}> — ${sorted[i].total} BIGPAY\n`;
    }
    return message.reply(board);
  }

  if (command === "qr") {
    const upiId = args[0];
    if (!upiId) return message.reply("❌ Usage: `!qr yourname@upi`");
    const upiUrl = `upi://pay?pa=${upiId}`;
    const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(upiUrl)}`;
    return message.reply({
      content: `📲 **UPI QR Code**\n🔗 UPI ID: \`${upiId}\``,
      files: [{ attachment: qrUrl, name: "qr.png" }]
    });
  }
});

http.createServer((req, res) => res.end("Bot is running!")).listen(process.env.PORT || 3000);

client.login(process.env.TOKEN);
