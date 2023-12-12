const {
  Client,
  ChatInputCommandInteraction,
  ApplicationCommandOptionType,
} = require("discord.js");
const queue = require("../../handlers/draftHandlers/queue.js");
const teamFormation = require("../../handlers/draftHandlers/teamFormation.js");
const pairings = require("../../handlers/draftHandlers/pairings.js");
const guildEnv = require("../../guildEnv.js");
const Draft = require("../../models/draftClass.js");

let ongoingDrafts = new Map();

module.exports = {
  /**
   * @param {Client} client
   * @param {ChatInputCommandInteraction} interaction
   */
  callback: async (client, interaction) => {
    console.log(
      `Draft command called by ${interaction.user.username} in ${interaction.channel.name}`
    );
    if (
      guildEnv(interaction.guildId).DRAFT_CHANNELS.findIndex(
        (c) => c == interaction.channelId
      ) === -1
    ) {
      interaction.reply({
        content: "You can't use this command in this channel.",
        ephemeral: true,
      });
      return;
    }
    try {
      if (ongoingDrafts.get(interaction.channelId)) {
        interaction.reply({
          content:
            "There is already an ongoing draft in this channel. Complete or cancel this draft before starting a new one.",
        });
        return;
      }
      ongoingDrafts.set(interaction.channelId, true);
      let draft = new Draft();
      draft.leader = interaction.user;
      draft.status = "queue";
      if (interaction.options.get("team-formation")) {
        draft.teamFormation = interaction.options.get("team-formation").value;
      }
      while (true) {
        switch (draft.status) {
          case "cancelled":
            console.log("Draft cancelled");
            ongoingDrafts.delete(interaction.channelId);
            return;
          case "queue":
            await queue(interaction, draft);
            break;
          case "teamFormation":
            await teamFormation(interaction.channel, draft);
            break;
          case "pairings":
            await pairings(interaction.channel, draft);
            break;
          case "finished":
            await interaction.channel.send({
              content: "You completed the draft!",
            });
            ongoingDrafts.delete(interaction.channelId);
            return;
          default:
            console.log(`draft.status switch case error: ${draft.status}`);
        }
      }
    } catch (error) {
      console.log("Error with draft command");
      console.error(error);
    }
  },
  name: "draft",
  description: "Start a draft!",
  options: [
    {
      name: "team-formation",
      description: "Choose how the teams are formed.",
      type: ApplicationCommandOptionType.String,
      choices: [
        {
          name: "random",
          value: "random",
        },
        {
          name: "choose captains",
          value: "choose captains",
        },
        {
          name: "random captains",
          value: "random captains",
        },
      ],
    },
  ],
};
