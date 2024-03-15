const {
  ButtonBuilder,
  ButtonStyle,
  ActionRowBuilder,
  EmbedBuilder,
  Channel,
} = require("discord.js");
const shuffleArray = require("../../utils/shuffleArray.js");
const formatPlayerList = require("../../utils/formatPlayerList.js");
const log = require("../../utils/log.js");
const Draft = require("../../models/draftClass.js");

const DRAFT_ORDER = [0, 1, 1, 0, 0, 1];

/**
 * @param {Channel} channel
 * @param {Draft} draft
 */
module.exports = async (channel, draft) => {
  const message = await channel.send({ content: "Loading..." });

  //Random team formation
  if (draft.teamFormation === "random") {
    draft.players = shuffleArray(draft.players);
    let team = "red";
    for (player of draft.players) {
      if (team === "red") {
        draft.redTeam.push(player);
        team = "blue";
      } else {
        draft.blueTeam.push(player);
        team = "red";
      }
    }
    log("teamFormation.js", "Team formed randomly.")
  } else if (draft.teamFormation === "captains") {
    //Captains team formation

    const redCaptainIndex = Math.floor(Math.random() * draft.players.length);
    draft.redCaptain = draft.players.at(redCaptainIndex);
    draft.redTeam.push(draft.redCaptain);
    draft.players.splice(redCaptainIndex, 1);
    const blueCaptainIndex = Math.floor(Math.random() * draft.players.length);
    draft.blueCaptain = draft.players.at(blueCaptainIndex);
    draft.blueTeam.push(draft.blueCaptain);
    draft.players.splice(blueCaptainIndex, 1);

    let pickCounter = 0;
    let picker;

    while (draft.players.length > 0) {
      if (DRAFT_ORDER.at(pickCounter) === 0) {
        picker = { captain: draft.redCaptain, team: draft.redTeam };
      } else {
        picker = { captain: draft.blueCaptain, team: draft.blueTeam };
      }

      let rows = getPlayerButtonsRows(draft.players);

      await message.edit({
        content: `${draft.redCaptain.displayName} and ${draft.blueCaptain.displayName} are the team captains.`,
        embeds: [getTeamEmbed(draft.redTeam, draft.blueTeam, picker)],
        components: rows,
      });

      const buttonClicked = await message
        .awaitMessageComponent({
          time: 300_000,
        })
        .catch(async (error) => {
          draft.players = [];
          await message.edit({
            content: "Draft was cancelled after timing out.",
            embeds: [],
            components: [],
          });
        });
      if (!buttonClicked) return;

      if (buttonClicked.member != picker.captain) {
        await buttonClicked.reply({
          content: "Don't click that!",
          ephemeral: true,
        });
      } else {
        const pickedPlayer = draft.players
          .splice(buttonClicked.customId, 1)
          .at(0);
        picker.team.push(pickedPlayer);
        pickCounter++;
        await buttonClicked.reply({
          content: `You picked ${pickedPlayer.displayName}`,
          ephemeral: true,
        });
      }
    }
    log("teamFormation.js", "Team formed with captains.")
  }

  await message.edit({
    content: `Teams have been picked!\nHead to draftmancer to draft now.`,
    embeds: [getTeamEmbed(draft.redTeam, draft.blueTeam)],
    components: [],
  });

  draft.status = "pairings";

  return;
};

function getPlayerButtonsRows(players) {
  let playerButtonsRows = [];
  let rowIndex = 0;
  let buttonCounter = 0;
  for (const player of players) {
    //Discord limits to 5 the number of button per row
    if (!playerButtonsRows.at(rowIndex)) {
      playerButtonsRows.push(new ActionRowBuilder());
    }
    if (playerButtonsRows.at(rowIndex).components.length >= 5) {
      playerButtonsRows.push(new ActionRowBuilder());
      rowIndex++;
    }
    playerButtonsRows
      .at(rowIndex)
      .components.push(
        new ButtonBuilder()
          .setCustomId(buttonCounter.toString())
          .setLabel(player.displayName)
          .setStyle(ButtonStyle.Secondary)
      );
    buttonCounter++;
  }
  return playerButtonsRows;
}

function getTeamEmbed(redTeam, blueTeam, picker) {
  let embed = new EmbedBuilder().setTitle("Teams").addFields(
    {
      name: "Red Team 🔴",
      value: formatPlayerList(redTeam),
      inline: true,
    },
    {
      name: "Blue Team 🔵",
      value: formatPlayerList(blueTeam),
      inline: true,
    }
  );
  if (picker) {
    embed.setDescription(`It's ${picker.captain.displayName}'s turn to pick`);
  }
  return embed;
}
