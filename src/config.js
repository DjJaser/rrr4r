import dotenv from "dotenv";

dotenv.config();

const toNumber = (value, fallback) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

const toBoolean = (value, fallback = false) => {
  if (value == null || value === "") {
    return fallback;
  }

  const normalized = String(value).trim().toLowerCase();
  if (["1", "true", "yes", "on"].includes(normalized)) {
    return true;
  }
  if (["0", "false", "no", "off"].includes(normalized)) {
    return false;
  }

  return fallback;
};

const toList = (value) =>
  String(value || "")
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);

export const config = {
  token: process.env.DISCORD_TOKEN,
  clientId: process.env.DISCORD_CLIENT_ID,
  guildId: process.env.DISCORD_GUILD_ID,
  erlcEventWebhookChannelId: process.env.ERLC_EVENT_WEBHOOK_CHANNEL_ID,
  loanChannelId: process.env.BANK_LOAN_CHANNEL_ID,
  auditChannelId: process.env.BANK_AUDIT_CHANNEL_ID,
  serviceHoldRequestChannelId: process.env.SERVICE_HOLD_REQUEST_CHANNEL_ID,
  m9RoleId: process.env.M9_ROLE_ID,
  policeRoleIds: toList(process.env.POLICE_ROLE_IDS),
  slashAccessRoleId: process.env.SLASH_ACCESS_ROLE_ID || "1494708880549216348",
  mdtHoldAccessRoleId: process.env.MDT_HOLD_ACCESS_ROLE_ID || "1460726048965529861",
  serviceHoldRoleId: process.env.SERVICE_HOLD_ROLE_ID,
  erlcApiBaseUrl: process.env.ERLC_API_BASE_URL,
  erlcApiKey: process.env.ERLC_API_KEY,
  erlcCommandEndpoint: process.env.ERLC_COMMAND_ENDPOINT || "/server/command",
  erlcKillLogsEndpoint: process.env.ERLC_KILLLOGS_ENDPOINT || "/v2/server?KillLogs=true",
  erlcVehiclesEndpoint: process.env.ERLC_VEHICLES_ENDPOINT || "/v1/server/vehicles",
  erlcPlayersEndpoint: process.env.ERLC_PLAYERS_ENDPOINT || "/v1/server/players",
  erlcEmergencyCallsEndpoint: process.env.ERLC_EMERGENCY_CALLS_ENDPOINT || "/v2/server?EmergencyCalls=true",
  erlcWebhookKey: process.env.ERLC_WEBHOOK_KEY,
  internalApiKey: process.env.INTERNAL_API_KEY || process.env.ERLC_WEBHOOK_KEY,
  erlcKillLogsPollIntervalMs: toNumber(process.env.ERLC_KILLLOGS_POLL_INTERVAL_MS, 15000),
  erlcVehiclesPollIntervalMs: toNumber(process.env.ERLC_VEHICLES_POLL_INTERVAL_MS, 5000),
  erlcEmergencyCallsPollIntervalMs: toNumber(process.env.ERLC_EMERGENCY_CALLS_POLL_INTERVAL_MS, 10000),
  erlcKillLogsSkipWarmup: toBoolean(process.env.ERLC_KILLLOGS_SKIP_WARMUP, true),
  debugKillLogs: toBoolean(process.env.DEBUG_KILLLOGS, false),
  startingBankBalance: toNumber(process.env.STARTING_BANK_BALANCE, 0),
  transferLimit: toNumber(process.env.TRANSFER_LIMIT, 100000),
  guildMemberPrefix: process.env.GUILD_MEMBER_PREFIX || "AW |",
  port: toNumber(process.env.PORT, 3000)
};

export function assertConfig() {
  const required = [
    ["DISCORD_TOKEN", config.token],
    ["DISCORD_CLIENT_ID", config.clientId],
    ["DISCORD_GUILD_ID", config.guildId],
    ["BANK_LOAN_CHANNEL_ID", config.loanChannelId],
    ["BANK_AUDIT_CHANNEL_ID", config.auditChannelId],
    ["M9_ROLE_ID", config.m9RoleId],
    ["SERVICE_HOLD_REQUEST_CHANNEL_ID", config.serviceHoldRequestChannelId],
    ["SERVICE_HOLD_ROLE_ID", config.serviceHoldRoleId],
    ["ERLC_WEBHOOK_KEY", config.erlcWebhookKey]
  ];

  const missing = required.filter(([, value]) => !value).map(([name]) => name);
  if (missing.length) {
    throw new Error(`Missing required environment variables: ${missing.join(", ")}`);
  }
}

export default config;
