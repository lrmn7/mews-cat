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
  SlashCommandBuilder,
  ActivityType,
  TextChannel,
} from "discord.js";
import cron from "node-cron";
import { z } from "zod";

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
      await interaction.deferReply();

      const attachment = await getRandomCatAttachmentBuilder();

      interaction.editReply({
        files: [attachment],
      });

      return;
    } else if (interaction.commandName === "guide") {
      await interaction.reply({
        content: `
          **Selamat datang ke Panduan Bot DailyCAT!**

          Aku adalah bot yang suka mengirimkan gambar kucing lucu kepadamu. Berikut adalah beberapa perintah yang bisa kamu gunakan:

          **/cat**: Mengirimkan gambar kucing acak.
          **/guide**: Menampilkan panduan ini tentang bot dan perintahnya.

          **Cara Menggunakan:**
          1. Ketik /cat untuk mendapatkan gambar kucing acak.
          2. Ketik /guide untuk menampilkan panduan ini.
          3. Jangan lupa untuk membuat teks channel "daily-cat" agar aku bisa secara otomatis mengirimkan pap untukmu setiap hari-nya 💗

          Ayo bersenang-senang denganku 😺
        `,
        ephemeral: true,
      });
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

const guideCommand = new SlashCommandBuilder()
  .setName("guide")
  .setDescription("Menampilkan panduan tentang bot dan perintahnya.");

commands.push(helloCommand);
commands.push(guideCommand);

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
      greeting = "Semangat yaaa";
    } else if (currentHour === 16) {
      greeting = "Bahagia terus yaaa";
    } else if (currentHour === 21) {
      greeting = "Jangan lupa istirahat yaaa";
    }

    const message = `${greeting}! Meooow for u 💗`;

    for (const channel of channels) {
      await channel.send({ content: message, files: [attachment] });
    }
  },
  {
    timezone: "Asia/Jakarta",
  }
);

client.login(env.DISCORD_BOT_TOKEN);
