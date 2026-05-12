import * as configModule from "./config.js";

const config = configModule.config ?? configModule.default;
import { findAccountByRobloxUsername } from "./storage/database.js";

const WEAPON_KILL_EXEMPT_ROLE_ID = "1493613573405147187";

function normalizeText(value) {
  return String(value || "")
    .trim()
    .replace(/\s+/g, " ")
    .toLowerCase();
}

function removeMemberPrefix(value, prefix) {
  const normalizedValue = normalizeText(value);
  const normalizedPrefix = normalizeText(prefix);

  if (normalizedPrefix && normalizedValue.startsWith(normalizedPrefix)) {
    return normalizeText(normalizedValue.slice(normalizedPrefix.length));
  }

  return normalizedValue;
}

function splitDecoratedName(value) {
  return normalizeText(value)
    .split(/[\s|[\]():\-_/\\]+/)
    .map((entry) => entry.trim())
    .filter(Boolean);
}

function nameLooksLikeRoblox(value, robloxUsername, prefix) {
  const normalizedRoblox = normalizeText(robloxUsername);
  const normalizedValue = normalizeText(value);
  const withoutPrefix = removeMemberPrefix(value, prefix);

  if (!normalizedRoblox) {
    return false;
  }

  if (
    normalizedValue === normalizedRoblox
    || withoutPrefix === normalizedRoblox
    || normalizedValue.includes(normalizedRoblox)
    || withoutPrefix.includes(normalizedRoblox)
  ) {
    return true;
  }

  return splitDecoratedName(value).includes(normalizedRoblox);
}

function buildApiUrl(endpoint) {
  const base = String(config.erlcApiBaseUrl || "")
    .trim()
    .replace(/\/+$/, "")
    .replace(/^https?:\/\/api\.policeroleplay\.community/i, "https://api.erlc.gg");
  const path = String(endpoint || "").trim();

  if (!base || !path) {
    return "";
  }

  if (/^https?:\/\//i.test(path)) {
    return path;
  }

  return `${base}${path.startsWith("/") ? path : `/${path}`}`;
}

function memberHasAnyRole(member, roleIds = []) {
  return roleIds.some((roleId) => member?.roles?.cache?.has(roleId));
}

function hasWeaponKillExemptRole(member) {
  return Boolean(member?.roles?.cache?.has(WEAPON_KILL_EXEMPT_ROLE_ID));
}

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function getRetryDelayMsFromBody(bodyJson = null) {
  const retryAfterSeconds = Number(bodyJson?.retry_after);
  return Number.isFinite(retryAfterSeconds)
    ? Math.max(1000, Math.ceil(retryAfterSeconds * 1000) + 250)
    : 5000;
}

function firstString(...values) {
  for (const value of values) {
    if (typeof value === "string" && value.trim()) {
      return value.trim();
    }
  }

  return "";
}

function extractNestedString(value) {
  if (typeof value === "string" && value.trim()) {
    return value.trim();
  }

  if (!value || typeof value !== "object") {
    return "";
  }

  return firstString(
    value.username,
    value.userName,
    value.name,
    value.Name,
    value.player,
    value.Player,
    value.playerName,
    value.PlayerName,
    value.displayName,
    value.model,
    value.Model,
    value.vehicle,
    value.Vehicle,
    value.vehicleName,
    value.VehicleName,
    value.owner,
    value.Owner,
    value.ownerName,
    value.OwnerName
  );
}

function extractRobloxName(value) {
  const raw = firstString(value);
  if (!raw) {
    return "";
  }

  const [username] = raw.split(":");
  return String(username || "").trim();
}

function extractVehicleOwnerUsername(entry = {}) {
  return extractRobloxName(firstString(
    entry.owner,
    entry.Owner,
    entry.ownerName,
    entry.OwnerName,
    entry.player,
    entry.Player,
    entry.playerName,
    entry.PlayerName,
    entry.username,
    entry.user,
    entry.User,
    entry.robloxUsername,
    entry.RobloxUsername,
    entry.spawnedBy,
    entry.SpawnedBy,
    extractNestedString(entry.ownerData),
    extractNestedString(entry.OwnerData),
    extractNestedString(entry.playerData),
    extractNestedString(entry.PlayerData),
    extractNestedString(entry.userData),
    extractNestedString(entry.UserData)
  ));
}

function extractVehicleName(entry = {}) {
  return firstString(
    entry.vehicle,
    entry.Vehicle,
    entry.vehicleName,
    entry.VehicleName,
    entry.model,
    entry.Model,
    entry.name,
    entry.Name,
    extractNestedString(entry.vehicleData),
    extractNestedString(entry.VehicleData),
    extractNestedString(entry.modelData),
    extractNestedString(entry.ModelData)
  );
}

const COMMAND_RETRY_LIMIT = 3;
const PUNISH_COOLDOWN_MS = 5 * 1000;
const recentPunishments = new Map();
let commandQueue = Promise.resolve();
let erlcReadRateLimitUntil = 0;
let lastReadRateLimitLogAt = 0;
let erlcTemporaryFailureUntil = 0;
let lastTemporaryFailureLogAt = 0;

async function sendErlcCommand(command) {
  if (!config.erlcApiBaseUrl || !config.erlcApiKey) {
    console.warn("ER:LC API config is not complete. Skipping command:", command);
    return null;
  }

  const endpoint = buildApiUrl(config.erlcCommandEndpoint);

  for (let attempt = 1; attempt <= COMMAND_RETRY_LIMIT; attempt += 1) {
    const response = await fetch(endpoint, {
      method: "POST",
      headers: {
        Accept: "*/*",
        "Content-Type": "application/json",
        "server-key": config.erlcApiKey
      },
      body: JSON.stringify({ command })
    });

    const bodyText = await response.text().catch(() => "");
    let bodyJson = null;
    if (bodyText) {
      try {
        bodyJson = JSON.parse(bodyText);
      } catch {
        bodyJson = null;
      }
    }

    if (response.ok) {
      return bodyJson;
    }

    if (response.status === 429) {
      const retryDelayMs = getRetryDelayMsFromBody(bodyJson);
      await delay(retryDelayMs);
      continue;
    }

    throw new Error(`ER:LC command failed with status ${response.status}: ${bodyText}`);
  }

  throw new Error(`ER:LC command failed after ${COMMAND_RETRY_LIMIT} retries: ${command}`);
}

function enqueueErlcCommand(command) {
  const queuedRun = commandQueue.then(() => sendErlcCommand(command));
  commandQueue = queuedRun.catch(() => null);
  return queuedRun;
}

async function fetchErlcCollection(endpoint, label, collectionKeys = []) {
  if (!config.erlcApiBaseUrl || !config.erlcApiKey) {
    console.warn(`ER:LC API config is not complete. Skipping ${label} fetch.`);
    return [];
  }

  if (Date.now() < erlcReadRateLimitUntil || Date.now() < erlcTemporaryFailureUntil) {
    return [];
  }

  const resolvedEndpoint = buildApiUrl(endpoint);
  const response = await fetch(resolvedEndpoint, {
    method: "GET",
    headers: {
      Accept: "*/*",
      "server-key": config.erlcApiKey
    }
  });

  if (!response.ok) {
    const bodyText = await response.text().catch(() => "");
    let bodyJson = null;
    if (bodyText) {
      try {
        bodyJson = JSON.parse(bodyText);
      } catch {
        bodyJson = null;
      }
    }

    if (response.status === 429) {
      const retryDelayMs = getRetryDelayMsFromBody(bodyJson);
      erlcReadRateLimitUntil = Date.now() + retryDelayMs;

      if (Date.now() - lastReadRateLimitLogAt > 15000) {
        console.warn(`ER:LC ${label} rate limited. Pausing read polls for ${Math.ceil(retryDelayMs / 1000)}s.`);
        lastReadRateLimitLogAt = Date.now();
      }

      return [];
    }

    if ([500, 502, 503, 504, 520, 521, 522, 523, 524, 525, 526, 527].includes(response.status)) {
      const retryDelayMs = 30 * 1000;
      erlcTemporaryFailureUntil = Date.now() + retryDelayMs;

      if (Date.now() - lastTemporaryFailureLogAt > 15000) {
        console.warn(
          `ER:LC ${label} temporarily unavailable (status ${response.status}). Pausing read polls for ${Math.ceil(retryDelayMs / 1000)}s.`
        );
        lastTemporaryFailureLogAt = Date.now();
      }

      return [];
    }

    throw new Error(`ER:LC ${label} failed with status ${response.status}: ${bodyText}`);
  }

  const payload = await response.json();
  if (Array.isArray(payload)) {
    return payload;
  }

  for (const key of collectionKeys) {
    if (Array.isArray(payload?.[key])) {
      return payload[key];
    }
  }

  if (Array.isArray(payload?.data)) {
    return payload.data;
  }

  return [];
}

export async function fetchKillLogs() {
  return fetchErlcCollection(config.erlcKillLogsEndpoint, "killlogs", ["KillLogs", "killLogs", "logs"]);
}

export async function fetchActiveVehicles() {
  return fetchErlcCollection(config.erlcVehiclesEndpoint, "vehicles", ["vehicles", "Vehicles"]);
}

export async function fetchServerPlayers() {
  return fetchErlcCollection(config.erlcPlayersEndpoint, "players", ["players", "Players"]);
}

export async function fetchEmergencyCalls() {
  return fetchErlcCollection(config.erlcEmergencyCallsEndpoint, "emergency calls", ["emergencyCalls", "EmergencyCalls", "calls", "Calls"]);
}

function extractPlayerUsername(entry = {}) {
  return extractRobloxName(firstString(
    entry.username,
    entry.userName,
    entry.name,
    entry.Name,
    entry.player,
    entry.Player,
    entry.playerName,
    entry.PlayerName,
    entry.robloxUsername,
    entry.RobloxUsername,
    entry.owner,
    entry.Owner,
    extractNestedString(entry.playerData),
    extractNestedString(entry.PlayerData),
    extractNestedString(entry.userData),
    extractNestedString(entry.UserData)
  ));
}

function extractPlayerTeam(entry = {}) {
  return firstString(
    entry.team,
    entry.Team,
    entry.teamName,
    entry.TeamName,
    entry.currentTeam,
    entry.CurrentTeam,
    entry.department,
    entry.Department,
    entry.departmentName,
    entry.DepartmentName,
    entry.teamType,
    entry.TeamType,
    entry.role,
    entry.Role,
    entry.job,
    entry.Job,
    entry.permission,
    entry.Permission,
    extractNestedString(entry.teamData),
    extractNestedString(entry.TeamData),
    extractNestedString(entry.currentTeamData),
    extractNestedString(entry.CurrentTeamData),
    extractNestedString(entry.departmentData),
    extractNestedString(entry.DepartmentData)
  );
}

export function getPlayerTeamByUsername(players = [], robloxUsername = "") {
  const normalizedTarget = normalizeText(robloxUsername);
  if (!normalizedTarget) {
    return "";
  }

  const player = players.find((entry) => normalizeText(extractPlayerUsername(entry)) === normalizedTarget);
  return player ? String(extractPlayerTeam(player) || "").trim() : "";
}

export function extractActiveVehicleEntry(entry = {}) {
  const vehicleName = extractVehicleName(entry);
  const ownerUsername = extractVehicleOwnerUsername(entry);

  const department = firstString(
    entry.department,
    entry.Department,
    entry.departmentName,
    entry.DepartmentName,
    entry.team,
    entry.Team,
    entry.teamName,
    entry.TeamName,
    entry.currentTeam,
    entry.CurrentTeam,
    entry.teamType,
    entry.TeamType,
    entry.teamLabel,
    entry.TeamLabel,
    entry.teamTitle,
    entry.TeamTitle,
    entry.permission,
    entry.Permission,
    entry.category,
    entry.Category,
    entry.job,
    entry.Job,
    entry.faction,
    entry.Faction,
    entry.role,
    entry.Role,
    entry.division,
    entry.Division,
    extractNestedString(entry.departmentData),
    extractNestedString(entry.DepartmentData),
    extractNestedString(entry.teamData),
    extractNestedString(entry.TeamData),
    extractNestedString(entry.currentTeamData),
    extractNestedString(entry.CurrentTeamData),
    extractNestedString(entry.roleData),
    extractNestedString(entry.RoleData),
    extractNestedString(entry.permissionData),
    extractNestedString(entry.PermissionData),
    extractNestedString(entry.categoryData),
    extractNestedString(entry.CategoryData)
  );

  const id = firstString(
    String(entry.id || ""),
    String(entry.VehicleID || ""),
    String(entry.vehicleId || "")
  ) || `${ownerUsername}|${vehicleName}|${department}`;

  return {
    id,
    ownerUsername: String(ownerUsername || "").trim(),
    vehicleName: String(vehicleName || "").trim(),
    department: String(department || "").trim()
  };
}

async function runPunishmentCooldown(key, handler) {
  const normalizedKey = String(key || "").trim().toLowerCase();
  const lastPunishedAt = recentPunishments.get(normalizedKey) || 0;

  if (Date.now() - lastPunishedAt < PUNISH_COOLDOWN_MS) {
    return false;
  }

  recentPunishments.set(normalizedKey, Date.now());
  await handler();
  return true;
}

export async function punishUnauthorizedWeaponUse(robloxUsername, reasonMessage = "استخرجت سلاحا غير مملوك أو غير مصرح لك به") {
  await runPunishmentCooldown(`weapon:${robloxUsername}`, async () => {
    await enqueueErlcCommand(`:jail ${robloxUsername}`);
    await enqueueErlcCommand(`:pm ${robloxUsername} تم سجنك بسبب عدم امتلاك صلاحية السلاح`);
  });
}

export async function punishUnauthorizedVehicleUse(robloxUsername) {
  await runPunishmentCooldown(`vehicle:${robloxUsername}`, async () => {
    await enqueueErlcCommand(`:jail ${robloxUsername}`);
    await enqueueErlcCommand(`:pm ${robloxUsername} استخرجت مركبه لا تملكها`);
  });
}

async function punishUnauthorizedWeaponUseDetailed(robloxUsername, weaponLabel = "السلاح") {
  await runPunishmentCooldown(`weapon:${robloxUsername}`, async () => {
    await enqueueErlcCommand(`:jail ${robloxUsername}`);
    await enqueueErlcCommand(`:pm ${robloxUsername} استخرجت ${weaponLabel} غير مملوك أو غير مصرح لك به`);
  });
}

export async function verifyWeaponOwnership({ guild, robloxUsername, weaponRoleId, memberPrefix }) {
  const normalizedRoblox = normalizeText(robloxUsername);

  const linkedAccount = findAccountByRobloxUsername(robloxUsername);
  if (linkedAccount?.discordUserId) {
    const linkedMember = await guild.members.fetch(linkedAccount.discordUserId).catch(() => null);
    if (linkedMember?.roles?.cache?.has(weaponRoleId)) {
      return { allowed: true, memberId: linkedMember.id, matchSource: "bank_account_link" };
    }

    if (memberHasAnyRole(linkedMember, config.policeRoleIds)) {
      return { allowed: true, memberId: linkedMember.id, matchSource: "police_role_exemption", reason: "police_exempt" };
    }

    if (hasWeaponKillExemptRole(linkedMember)) {
      return { allowed: true, memberId: linkedMember.id, matchSource: "custom_role_exemption", reason: "custom_role_exempt" };
    }

    if (linkedMember) {
      await punishUnauthorizedWeaponUseDetailed(robloxUsername, weaponRoleId === config.m9RoleId ? "سلاح M9" : "سلاح Colt");
      return { allowed: false, reason: "role_missing", memberId: linkedMember.id, matchSource: "bank_account_link" };
    }
  }

  const member = guild.members.cache.find((candidate) => {
    return [
      candidate.displayName,
      candidate.user.username,
      candidate.user.globalName
    ].some((value) => nameLooksLikeRoblox(value, normalizedRoblox, memberPrefix));
  });

  if (!member) {
    await punishUnauthorizedWeaponUseDetailed(robloxUsername, weaponRoleId === config.m9RoleId ? "سلاح M9" : "سلاح Colt");
    return { allowed: false, reason: "member_not_found", checkedUsername: robloxUsername };
  }

  if (memberHasAnyRole(member, config.policeRoleIds)) {
    return { allowed: true, memberId: member.id, checkedUsername: robloxUsername, matchSource: "police_role_exemption", reason: "police_exempt" };
  }

  if (hasWeaponKillExemptRole(member)) {
    return { allowed: true, memberId: member.id, checkedUsername: robloxUsername, matchSource: "custom_role_exemption", reason: "custom_role_exempt" };
  }

  if (!member.roles.cache.has(weaponRoleId)) {
    await punishUnauthorizedWeaponUseDetailed(robloxUsername, weaponRoleId === config.m9RoleId ? "سلاح M9" : "سلاح Colt");
    return { allowed: false, reason: "role_missing", memberId: member.id, checkedUsername: robloxUsername };
  }

  return { allowed: true, memberId: member.id, checkedUsername: robloxUsername, matchSource: "discord_name_match" };
}
