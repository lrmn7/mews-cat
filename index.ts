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
  TextChannel,
} from "discord.js";
import cron from "node-cron";
import { z } from "zod";
const axios = require('axios');

// Initializing
const env = z
  .object({
    DISCORD_BOT_TOKEN: z.string(),
    DISCORD_BOT_CLIENT_ID: z.string(),
    ENVIRONMENT: z.enum(["DEVELOPMENT", "PRODUCTION"]),
  })
  .parse(process.env);

const client = new Client({
  intents: ["Guilds"],
});


// Events
client.on(Events.InteractionCreate, async (interaction) => {
  if (interaction.isChatInputCommand()) {
    if (interaction.commandName === "cat") {
      try {
        await interaction.deferReply();

        const [imageAttachment, fact] = await Promise.all([
          getRandomCatAttachmentBuilder(),
          axios.get('https://catfact.ninja/fact')
            .then(response => response.data.fact)
            .catch(() => 'Unable to fetch a cat fact at the moment.')
        ]);

        interaction.editReply({
          content: `**cat fact**\n\n${fact}`,
          files: [imageAttachment],
        });
      } catch (error) {
        console.error(error);
        await interaction.followUp("Maaf aku engga bisa kirim pap ke kamu saat ini, coba lagi nanti ya.");
      }
    } else if (interaction.commandName === "help") {
      try {
        const embed = new EmbedBuilder()
        .setAuthor({
          name: "L RMN",
          url: "https://lrmn.is-a.dev/",
          iconURL: "https://cdn.discordapp.com/avatars/742457036914294855/a50551d4672bd2b524e086a7506f73b7.webp?size=1024&width=0&height=256",
        })
        .setTitle("Ayo Main dengan DailyCAT!")
        .setURL("https://dailycat.is-a.fun/")
        .setDescription("Aku adalah bot yang suka mengirimkan gambar kucing lucu kepadamu. Berikut adalah beberapa perintah yang bisa kamu gunakan:\n\n`Perintah`  **DailyCAT**\n\nKetik `/cat ` untuk mendapatkan gambar kucing acak.\nKetik `/guide` untuk menampilkan panduan ini.\nJangan lupa untuk membuat teks channel `#daily-cat` agar aku bisa secara otomatis mengirimkan pap \nuntukmu setiap hari-nya 💗\n\nAyo bersenang-senang denganku 😺\n\n\n> [Website](https://dailycat.is-a.fun)  |  [Server Support](https://discord.gg/WFfjrQxnfH) | [Author](https://lrmn.is-a.dev) \n\n> [Privacy Policy](https://dailycat.is-a.fun/privacy)  |  [Terms Of Service](https://dailycat.is-a.fun/terms) | [Legal Notice](https://dailycat.is-a.fun/legal)")
        .setImage("https://cdn.discordapp.com/attachments/1132042597796417627/1151487192028434584/daolycatsss.png")
        .setThumbnail("https://cdn.discordapp.com/avatars/1145410245229809747/51b3da2e42a405393b7ada9a1d93da0f.webp?size=1024&width=0&height=256")
        .setColor("#9ff500")
        .setFooter({
          text: "Meooow for u 💗",
          iconURL: "https://cdn.discordapp.com/avatars/1145410245229809747/51b3da2e42a405393b7ada9a1d93da0f.webp?size=1024&width=0&height=256",
        })
        .setTimestamp();

        await interaction.reply({ embeds: [embed], ephemeral: false });
      } catch (error) {
        console.error(error);
        await interaction.followUp("Maaf aku sedang sibuk, nanti balik lagi ya.");
      }
    }
  }
});


client.on(Events.ChannelCreate, async (channel) => {
  const channelName = channel.name.toLowerCase();

  if (channelName.includes("daily-cat") && channel.isTextBased()) {
    const attachment = await getRandomCatAttachmentBuilder();
    channel.send({
      files: [attachment],
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
        PermissionsBitField.Flags.UseApplicationCommands,
      ],
    });

    console.log(`- ${client.user.username}: ${invite}`);
  }

  client.user.setPresence({
    activities: [{ name: 'Meoooow', type: ActivityType.Watching }],
    status: 'idle',
  });
});

// Commands
const commands: SlashCommandBuilder[] = [];

const helloCommand = new SlashCommandBuilder()
  .setName("cat")
  .setDescription("Meooow! Pap untukmu");

const helpCommand = new SlashCommandBuilder()
  .setName("help")
  .setDescription("Menampilkan perintah yang ada.");

commands.push(helloCommand);
commands.push(helpCommand);

// Update Slash Commands
const shouldUpdateSlashCommands =
  env.ENVIRONMENT === "PRODUCTION" ||
  (env.ENVIRONMENT === "DEVELOPMENT" && process.argv.includes("reload"));

  if (shouldUpdateSlashCommands) {
    const rest = new REST().setToken(env.DISCORD_BOT_TOKEN);
  
    rest
      .put(Routes.applicationCommands(env.DISCORD_BOT_CLIENT_ID), {
        body: commands.map((command) => command.toJSON()),
      })
      .then(() => {
        console.log(`Successfully reloaded all Slash Commands.`);
      });
  }  

// Functions
async function getRandomCatAttachmentBuilder(): Promise<AttachmentBuilder> {
  const response = await fetch("https://cataas.com/cat/cute");
  const arrayBuffer = await response.arrayBuffer();
  return new AttachmentBuilder(Buffer.from(arrayBuffer));
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


// Schedule to send messages and images at specific times
cron.schedule(
  "0 8,16,21 * * *", // Tetapkan jadwal cron ke jam 08:00, 16:00, dan 21:00 WIB
  async () => {
    const channels = dailyRandomCatChannels();
    const attachment = await getRandomCatAttachmentBuilder();
    const currentHour = new Date().getHours();
    let greeting = "";
    
    if (currentHour === 8) {
      greeting = "Semangat!";
    } else if (currentHour === 16) {
      greeting = "Selalu bahagia!";
    } else if (currentHour === 21) {
      greeting = "Jangan lupa istirahat!";
    }
    
    const message = `${greeting} Meooow for u 💗`;

    for (const channel of channels) {
      try {
        await channel.send({ content: message, files: [attachment] });
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