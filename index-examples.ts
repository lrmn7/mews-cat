// Imports
import "dotenv/config";
import {
  AttachmentBuilder,
  Client,
  Collection,
  Events,
  OAuth2Scopes,
  PermissionsBitField,
  REST,
  Routes,
  EmbedBuilder,
  SlashCommandBuilder,
  ActivityType,
  TextChannel
} from "discord.js";
import cron from "node-cron";
import { z } from "zod";
import axios from "axios";

// Initializing
const env = z
  .object({
    DISCORD_BOT_TOKEN: z.string(),
    DISCORD_BOT_CLIENT_ID: z.string(),
    ENVIRONMENT: z.enum(["DEVELOPMENT", "PRODUCTION"])
  })
  .parse(process.env);

const client = new Client({
  intents: ["Guilds", "GuildMessages", "MessageContent"]
});

const PREFIX = process.env.PREFIX || "cat"; // Gunakan nilai dari variabel lingkungan, jika tidak ada, gunakan "cat"

client.on("messageCreate", async (message) => {
  if (message.author.bot) return; // Ignore messages from bots

  const args = message.content.slice(PREFIX.length).trim().split(/ +/);
  const command = args.shift()?.toLowerCase();

  if (!command) return;

  if (command === "cat") {
    try {
      // Menambahkan notifikasi bot typing
      await message.channel.sendTyping();

      const imageAttachment = await getRandomCatAttachmentBuilder();
      const catEmbed = {
        title: "Pap untukmu 😺",
        color: 0xe3bc9d,
        image: { url: `attachment://${imageAttachment.name}` },
        footer: {
          text: `Requested by ${message.author.tag}`,
          iconURL: message.author.displayAvatarURL()
        },
        timestamp: new Date().toISOString() // Ubah ke string ISO
      };

      message.channel.send({ embeds: [catEmbed], files: [imageAttachment] });
    } catch (error) {
      console.error(error);
      message.channel.send("Maaf, ada masalah saat mengirim gambar kucing.");
    }
  } else if (command === "catfact") {
    try {
      // Menambahkan notifikasi bot typing
      await message.channel.sendTyping();

      const [imageAttachment, fact] = await Promise.all([
        getRandomCatAttachmentBuilder(),
        fetchCatFact()
      ]);

      const catfactEmbed = {
        title: "Cat Fact",
        description: `${fact}`,
        color: 0xe3bc9d,
        image: { url: `attachment://${imageAttachment.name}` },
        footer: {
          text: `Requested by ${message.author.tag}`,
          iconURL: message.author.displayAvatarURL()
        },
        timestamp: new Date().toISOString() // Ubah ke string ISO
      };

      message.channel.send({
        embeds: [catfactEmbed],
        files: [imageAttachment]
      });
    } catch (error) {
      console.error(error);
      message.channel.send(
        "Maaf, ada masalah saat mengirim gambar kucing dan faktanya."
      );
    }
  } else if (command === "help") {
    try {
      // Menambahkan notifikasi bot typing
      await message.channel.sendTyping();

      const embed = new EmbedBuilder()
      .setAuthor({
        name: "DailyCAT ✨",
        url: "https://dailycat.is-a.fun/",
        iconURL: "https://cdn.discordapp.com/avatars/1145410245229809747/51b3da2e42a405393b7ada9a1d93da0f.webp?size=1024&width=0&height=256",
      })
      .setTitle("Cute and Cuddly: Meow Your Way to Happiness")
      .setURL("https://dailycat.is-a.fun/")
      .setDescription("Aku adalah bot yang suka mengirimkan gambar kucing lucu kepadamu. Berikut adalah beberapa perintah yang bisa kamu gunakan:\n\n**Perintah Slash commands**\n\n`/help` untuk menampilkan panduan ini.\n\n`/cat`  untuk mendapatkan gambar kucing acak menggemaskan.\n\n`/catfact` gambar kucing acak dan fakta-nya.\n\nJangan lupa untuk membuat teks channel\n**#daily-cat** agar aku bisa secara otomatis mengirimkan pap\nuntukmu setiap hari-nya  💗\n\nOhya kamu pun bisa menggunakan prefix default: **dc**\nCukup mengetik **dc help** | **dc cat** | **dc catfact**\nBerinteraksi denganku menjadi lebih mudah.\n\n*Kritik dan saran boleh hubungi pengembangku [klik disini](https://discord.com/users/742457036914294855)*\n\nAyo bersenang-senang denganku 😺")
      .addFields(
        {
          name: "Website",
          value: "[Visit Website](https://dailycat.is-a.fun/)",
          inline: true
        },
        {
          name: "Invite",
          value: "[Invite me](https://discord.com/api/oauth2/authorize?client_id=1145410245229809747&permissions=551903423504&scope=applications.commands%20bot)",
          inline: true
        },
        {
          name: "Support",
          value: "[Join Discord Support](https://discord.gg/WFfjrQxnfH)",
          inline: true
        },
      )
      .setImage("https://cdn.discordapp.com/attachments/1098969636306960465/1153380177624174592/dailycatts.png")
      .setThumbnail("https://cdn.discordapp.com/avatars/1145410245229809747/51b3da2e42a405393b7ada9a1d93da0f.webp?size=1024&width=0&height=256")
      .setColor("#00b0f4")
      .setFooter({
        text: "Meooow for u 💗",
        iconURL: "https://cdn.discordapp.com/avatars/1145410245229809747/51b3da2e42a405393b7ada9a1d93da0f.webp?size=1024&width=0&height=256",
      })
      .setTimestamp();

      message.channel.send({ embeds: [embed] });
    } catch (error) {
      console.error(error);
      message.channel.send("Maaf aku sedang sibuk, nanti balik lagi ya.");
    }
  }
});

// Membuat channel #daily-cat secara otomatis bila tidak ada
client.on(Events.ChannelCreate, async (channel) => {
  const channelName = channel.name.toLowerCase();

  if (channelName.includes("daily-cat") && channel.isTextBased()) {
    const attachment = await getRandomCatAttachmentBuilder();
    channel.send({
      files: [attachment]
    });
  }
});

// Ready
client.on(Events.ClientReady, (client) => {
  console.log(`- ${client.user.username}: Ready to work!`);

  if (process.argv.includes("invite")) {
    const invite = client.generateInvite({
      scopes: [OAuth2Scopes.Bot],
      permissions: [
        PermissionsBitField.Flags.SendMessages,
        PermissionsBitField.Flags.UseApplicationCommands
      ]
    });

    console.log(`- ${client.user.username}: ${invite}`);
  }

  client.user.setPresence({
    activities: [{ name: "Meoooow", type: ActivityType.Watching }],
    status: "idle"
  });
});

// Commands slash
const commands: SlashCommandBuilder[] = [];

const catCommand = new SlashCommandBuilder()
  .setName("cat")
  .setDescription("Meooow! Pap untukmu");

const catfactCommand = new SlashCommandBuilder()
  .setName("catfact")
  .setDescription("Meooow! Pap dan fact untukmu");

const helpCommand = new SlashCommandBuilder()
  .setName("help")
  .setDescription("Menampilkan perintah yang ada.");

commands.push(catCommand);
commands.push(catfactCommand);
commands.push(helpCommand);

// Update Slash Commands
const shouldUpdateSlashCommands =
  env.ENVIRONMENT === "PRODUCTION" ||
  (env.ENVIRONMENT === "DEVELOPMENT" && process.argv.includes("reload"));

if (shouldUpdateSlashCommands) {
  const rest = new REST().setToken(env.DISCORD_BOT_TOKEN);

  rest
    .put(Routes.applicationCommands(env.DISCORD_BOT_CLIENT_ID), {
      body: commands.map((command) => command.toJSON())
    })
    .then(() => {
      console.log(`Successfully reloaded all Slash Commands.`);
    });
}

// Functions
async function getRandomCatAttachmentBuilder() {
  try {
    const response = await axios.get("https://cataas.com/cat/cute", {
      responseType: "arraybuffer"
    });
    const attachment = new AttachmentBuilder(response.data, {
      name: "dailyCAT.png"
    });
    return attachment;
  } catch (error) {
    console.error("Error fetching cat image:", error);
    throw error;
  }
}

async function fetchCatFact() {
  try {
    const response = await axios.get("https://catfact.ninja/fact");
    if (response.status === 200) {
      return response.data.fact;
    } else {
      throw new Error("Failed to fetch cat fact");
    }
  } catch (error) {
    console.error("Error fetching cat fact:", error);
    throw error;
  }
}

function dailyRandomCatChannels(): TextChannel[] {
  const channels = client.channels.cache.filter((channel) => {
    if (!channel.isTextBased()) return false;
    if (!("send" in channel)) return false;
    if ("name" in channel) return channel.name.includes("daily-cat");

    return false;
  }) as Collection<string, TextChannel>;

  return channels.map((channel) => channel);
}


// Fungsi untuk mendapatkan kutipan dari API
async function getQuoteFromAPI(category: string) {
  return new Promise<string>(async (resolve, reject) => {
    try {
      const response = await axios.get(`https://api.api-ninjas.com/v1/quotes?category=${category}`, {
        headers: {
          'X-Api-Key': process.env.API_KEY,
        },
      });

      if (response.status === 200) {
        const quoteData = response.data;
        const quote = quoteData[0].quote;
        resolve(quote);
      } else {
        console.error('Error:', response.status, response.statusText);
        reject('Error: Unable to fetch quote');
      }
    } catch (error) {
      console.error('Request failed:', error);
      reject(error);
    }
  });
}

// Schedule untuk mengirim pesan dan gambar pada waktu-waktu tertentu
cron.schedule(
  "0 8,16,21 * * *", // Tetapkan jadwal cron ke jam 08:00, 16:00, dan 21:00 WIB
  async () => {
    const channels = dailyRandomCatChannels();
    const attachment = await getRandomCatAttachmentBuilder();

    for (const channel of channels) {
      try {
        const category = 'love';
        const quote = await getQuoteFromAPI(category);

        const footer = {
          text: "Meooow for u 💗",
          iconURL: "https://cdn.discordapp.com/avatars/1145410245229809747/51b3da2e42a405393b7ada9a1d93da0f.webp?size=1024&width=0&height=256", // Ganti URL_GAMBAR_ICON dengan URL gambar yang ingin Anda gunakan
        };

        // Buat objek Embed
        const embed = new EmbedBuilder()
          .setColor("#e3bc9d")
          .setDescription(`${quote}`)
          .setImage(`attachment://${attachment.name}`)
          .setFooter(footer);

        // Kirim pesan dengan objek Embed
        await channel.send({ embeds: [embed], files: [attachment] });
      } catch (error) {
        console.error("Error sending message:", error);
      }
    }
  },
  {
    timezone: "Asia/Jakarta",
  }
);

client.login(env.DISCORD_BOT_TOKEN);