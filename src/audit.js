import { EmbedBuilder } from "discord.js";
import { COLORS } from "./constants.js";

function formatDateTime(date = new Date()) {
  return new Intl.DateTimeFormat("ar-SA", {
    timeZone: "America/Los_Angeles",
    dateStyle: "full",
    timeStyle: "medium"
  }).format(date);
}

export function createAuditEmbed({ title, description, fields = [], color = COLORS.charcoal }) {
  return new EmbedBuilder()
    .setColor(color)
    .setTitle(title)
    .setDescription(description)
    .addFields(
      ...fields,
      {
        name: "التاريخ والوقت",
        value: `**${formatDateTime()}**`
      }
    )
    .setFooter({ text: "Arab World Audit Log • جميع العمليات محفوظة هنا" });
}

export async function sendAuditLog(client, channelId, payload) {
  if (!channelId) {
    return;
  }

  const channel = await client.channels.fetch(channelId).catch(() => null);
  if (!channel || !channel.isTextBased()) {
    return;
  }

  await channel.send({
    embeds: [createAuditEmbed(payload)]
  });
}

