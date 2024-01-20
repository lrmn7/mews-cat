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
  ButtonBuilder,
  ButtonStyle,
  ActionRowBuilder
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

// Events
client.on("interactionCreate", async (interaction) => {
  if (!interaction.isCommand()) return;

  const { commandName } = interaction;

  if (commandName === "cat") {
    try {
      // Menambahkan notifikasi bot typing
      await interaction.deferReply();

      const imageAttachment = await getRandomCatAttachmentBuilder();
      const catEmbed = {
        title: "For you 😺",
        color: 0xf4e0c7,
        image: { url: `attachment://${imageAttachment.name}` },
        footer: {
          text: `Requested by ${interaction.user.tag}`,
          iconURL: interaction.user.displayAvatarURL()
        },
      };

      interaction.editReply({ embeds: [catEmbed], files: [imageAttachment] });
    } catch (error) {
      console.error(error);
      interaction.followUp("Sorry, there was a problem sending the cat picture.");
    }
  } else if (commandName === "catfact") {
    try {
      await interaction.deferReply();

      const [imageAttachment, fact] = await Promise.all([
        getRandomCatAttachmentBuilder(),
        fetchCatFact()
      ]);

      const catfactEmbed = {
        title: "Cat Fact",
        description: `${fact}`,
        color: 0xf4e0c7,
        image: { url: `attachment://${imageAttachment.name}` },
        footer: {
          text: `Requested by ${interaction.user.tag}`,
          iconURL: interaction.user.displayAvatarURL()
        },
      };

      interaction.editReply({
        embeds: [catfactEmbed],
        files: [imageAttachment]
      });
    } catch (error) {
      console.error(error);
      interaction.followUp(
        "Sorry, there was a problem sending the picture of the cat and the facts."
      );
    }
  } else if (commandName === "help") {
    try {

      await interaction.deferReply();

      const embed = new EmbedBuilder()
      .setAuthor({
        name: `${interaction.guild!.members.me!.displayName} - Welcome!`,
        url: `https://discord.com/api/oauth2/authorize?client_id=${
          client.user!.id
        }&permissions=8&scope=bot%20applications.commands`,
        iconURL: interaction.guild!.members.me!.displayAvatarURL() as string,
      })
      .setTitle("Cute and Cuddly: Meow Your Way to Happiness")
      .setDescription("A very simple cat bot. All you have to do is create a text channel with the keyword `cat`, and the bot will send you random cat pictures once a day to that channel.\n\nAdditional commands:\n`/cat` - Sends a random cat picture\n`/catfact` - Sends a random cat picture and fact")
      .setColor("#f4e0c7")

      const button = new ActionRowBuilder<ButtonBuilder>()
      .addComponents(
        new ButtonBuilder()
          .setLabel("Invite Me")
          .setStyle(ButtonStyle.Link)
          .setURL(client.generateInvite({ scopes: [OAuth2Scopes.Bot] }))
      )
      .addComponents(
        new ButtonBuilder()
          .setLabel("Server Support")
          .setStyle(ButtonStyle.Link)
          .setURL("https://discord.gg/6EXgrmtkPX")
      )
      .addComponents(
        new ButtonBuilder()
          .setLabel("Soruce code")
          .setStyle(ButtonStyle.Link)
          .setURL("https://github.com/mewwme/daily-cat")
      );

      interaction.editReply({ embeds: [embed], components: [button] });
    } catch (error) {
      console.error(error);
      interaction.followUp("Sorry I'm busy, come back later.");
    }
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

// Commands
const commands: SlashCommandBuilder[] = [];

const catCommand = new SlashCommandBuilder()
  .setName("cat")
  .setDescription("Meooow! Picture for you");

const catfactCommand = new SlashCommandBuilder()
  .setName("catfact")
  .setDescription("Meooow! Picture and fact for you");

const helpCommand = new SlashCommandBuilder()
  .setName("help")
  .setDescription("Display existing commands.");

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

function dailyRandomCatChannels() {
  const channels = client.channels.cache.filter((channel) => {
    if (!channel.isTextBased()) return false;
    if (!("send" in channel)) return false;
    if ("name" in channel) return channel.name.includes("cat");

    return false;
  }) as Collection<string, TextChannel>;

  return channels.map((channel) => channel);
}

// Function to get a quote from the API
async function getQuoteFromAPI(category: string) {
  return new Promise(async (resolve, reject) => {
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

// Schedule to send messages and images at specific times
cron.schedule(
  "0 9,21 * * *", // Set cron schedule to 09:00 AM and 12:00 AM every day
  async () => {
    const channels = dailyRandomCatChannels();
    const attachment = await getRandomCatAttachmentBuilder();

    for (const channel of channels) {
      try {
        const category = 'love';
        const quote = await getQuoteFromAPI(category);

        // Buat objek Embed
        const embed = new EmbedBuilder()
          .setColor("#f4e0c7")
          .setDescription(`${quote}`)
          .setImage(`attachment://${attachment.name}`)
          .setFooter({
            text: "Cute and Cuddly: Meow Your Way to Happiness",
            iconURL: client.user!.displayAvatarURL()
          });

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