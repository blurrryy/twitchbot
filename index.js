const tmi = require("tmi.js");
const axios = require("axios");
const URL = `https://aoe4world.com/api/v0/players/autocomplete`;

if (process.env.NODE_ENV !== "production") {
  require("dotenv").config();
}

const BOT_USER = process.env.BOT_USER;
if (!BOT_USER) throw `No environment variables set.`;
const TWITCH_TOKEN = process.env.TWITCH_TOKEN;
if (!TWITCH_TOKEN) throw `No environment variables set.`;

const getStats = async (name = "infernoXtreme") => {
  try {
    const params = {
      query: name,
      leaderboard: "rm_solo",
    };

    let data = await axios.get(URL, { params });

    if (data.status !== 200) throw `Ups! Fehler bei der Schnittstellenanfrage!`;
    data = data.data;
    if (data.count < 1) throw `Kein Spieler mit diesem Namen gefunden!`;
    let {
      players: [playerData, ...morePlayers],
    } = data;

    let output = [];

    if (!playerData.games_count && morePlayers.length > 0) {
      morePlayers = morePlayers
        .filter((x) => x.games_count && x.games_count > 0)
        .sort((a, b) => b.games_count - a.games_count);
      if (morePlayers.length > 0) {
        output.push(`${playerData.name} hat keine Spiele gespielt.`);
        playerData = morePlayers[0];
        output.push(`Meintest du ${playerData.name}? | `);
      }
    }

    playerData.country
      ? output.push(`(${playerData.country.toUpperCase()})`)
      : null;
    output = [...output, playerData.name];

    if (!playerData.games_count) {
      output.push(`| Keine Spiele in Solo Ranked`);
      return output.join(" ");
    }

    output.push(`| Rank: ${playerData.rank}`);
    playerData.rank_level
      ? output.push(
          `(${playerData.rank_level.toUpperCase().replace(/\_/, " ")})`
        )
      : null;
    output = [
      ...output,
      "|",
      `${playerData.wins_count}W/${playerData.losses_count}L`,
      `(${parseInt(playerData.win_rate)}%)`,
      `| ${
        playerData.streak > 0 ? `+${playerData.streak}` : playerData.streak
      }`,
    ];

    return output.join(" ");
  } catch (err) {
    return err;
  }
};

(async () => {
  const client = new tmi.Client({
    options: { debug: process.env.NODE_ENV !== "production" },
    identity: {
      username: BOT_USER,
      password: TWITCH_TOKEN,
    },
    channels: ["blurrry__", "infernoXtreme"],
  });

  client.connect();

  client.on("message", async (channel, tags, message, self) => {
    if (self || !message.startsWith("!")) return;

    let [command, ...args] = message.slice(1).split(" ");

    switch (command) {
      case "rank":
        client.say(
          channel,
          args.length > 0
            ? `${await getStats(args.join(" "))}`
            : `${await getStats()}`
        );
        return;

      default:
        return;
    }
  });
})();
