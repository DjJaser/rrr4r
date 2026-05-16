import express from "express";
import fs from "fs";
import { createHash, createPublicKey, verify as verifySignature } from "crypto";
import {
  ActivityType,
  ActionRowBuilder,
  AttachmentBuilder,
  ButtonBuilder,
  ButtonStyle,
  Client,
  EmbedBuilder,
  Events,
  GatewayIntentBits,
  InteractionType,
  ModalBuilder,
  Partials,
  StringSelectMenuBuilder,
  StringSelectMenuOptionBuilder,
  TextInputBuilder,
  TextInputStyle
} from "discord.js";
import { VoiceConnectionStatus, entersState, joinVoiceChannel } from "@discordjs/voice";
import * as configModule from "./config.js";
import {
  BUDGET_DEFINITIONS,
  BUDGET_KEYS,
  JUS_PURCHASE_ITEMS,
  POLICE_MILITARY_ITEMS,
  POLICE_SECTOR_ADDONS,
  buildBudgetConfirmButtons,
  buildBudgetHomeEmbed,
  buildBudgetLogsButtonRow,
  buildBudgetLogsEmbed,
  buildBudgetMenu,
  buildBudgetPurchaseDmEmbed,
  buildBudgetPurchaseDraftEmbed,
  buildPoliceSectorAddonMenu,
  buildPoliceSectorAddonRemoveMenu,
  buildSinglePurchaseMenu,
  formatBudgetCurrency,
  getBudgetDefinition
} from "./budget-system.js";
import {
  PROJECT_DEFINITIONS,
  PROJECT_KEYS,
  STATION_PROJECT_KEYS,
  SHOWROOM_PROJECT_KEYS,
  buildProjectChoices,
  buildProjectDashboardEmbed,
  buildProjectFuelNoticeEmbed,
  buildProjectMoneyPromptEmbed,
  buildProjectsOverviewEmbed,
  createProjectMenu,
  formatProjectCurrency,
  getProjectDefinition,
  getProjectFuelDecaySteps
} from "./project-system.js";
import {
  BANK_ACTIONS,
  CAR_ACTIONS,
  CAR_SHOWROOM_PAGE_SIZE,
  CRAFTABLE_WEAPONS,
  CRAFTING_TABLE_LEVELS,
  COLT_ROLE_ID,
  CRAFTING_LEVEL2_ACCESS_ROLE_ID,
  CRAFTING_TABLE_IMAGE_URL,
  CRAFTING_WEAPON_IMAGE_DEFINITIONS,
  DEFAULT_CITIZEN_VEHICLE_PRICE,
  EMERGENCY_VEHICLE_DEPARTMENTS,
  DEFAULT_FREE_VEHICLE_NAMES,
  EMERGENCY_VEHICLE_KEYWORDS,
  GUN2_ACTIONS,
  MDT_ACTIONS,
  M9_REQUIREMENTS,
  RESOURCE_CATALOG,
  RESOURCE_EMBED_IMAGE_URL,
  ROBBERY_REWARDS,
  SALARY_ROLE_DEFINITIONS,
  WEAPON_INVENTORY_DEFINITIONS,
  WEAPON_MARKET_IMAGE_URL
} from "./constants.js";
import { sendAuditLog } from "./audit.js";
import {
  buildApproveRejectButtons,
  buildBalanceEmbed,
  buildBankEmbed,
  buildBankMenu,
  buildCarPurchaseButtons,
  buildCarPurchaseConfirmEmbed,
  buildCarSelectMenu,
  buildCarShowroomButtons,
  buildCarShowroomEmbed,
  buildFineDmEmbed,
  buildFinePaymentConfirmEmbed,
  buildFineSelectMenu,
  buildGun2Buttons,
  buildGun2Embed,
  buildGunButton,
  buildGunEmbed,
  buildGunPurchaseButton,
  buildGunPurchaseEmbed,
  buildInventoryEmbed,
  buildLoanButtons,
  buildLoanEmbed,
  buildHoldRequestButtons,
  buildHoldRequestEmbed,
  buildMdtButtons,
  buildMdtEmbed,
  buildOwnedCarsEmbed,
  buildPinDmEmbed,
  buildPrivateNoticeEmbed,
  buildResourceTransferDmEmbed,
  buildSalaryReceiptDmEmbed,
  buildServiceHoldAppliedEmbed,
  buildServiceHoldDecisionEmbed,
  buildTransferButtons,
  buildTransferConfirmationEmbed
} from "./embeds.js";
import {
  buildAccountInfoEmbedPolished,
  buildBalanceEmbedPolished,
  buildBankEmbedPolished,
  buildBankMenuPolished,
  buildFineDmEmbedPolished,
  buildGun2ButtonsPolished,
  buildGun2EmbedPolished,
  buildGunButtonPolished,
  buildGunEmbedPolished,
  buildGunPurchaseButtonPolished,
  buildGunPurchaseEmbedPolished,
  buildHoldRequestEmbedPolished,
  buildLoanEmbedPolished,
  buildMdtButtonsPolished,
  buildMdtEmbedPolished,
  buildPoliceBankButtonsPolished,
  buildPoliceBankEmbedPolished,
  buildGovernmentDebitDmEmbedPolished,
  buildBankFreezeDmEmbedPolished,
  buildBankUnfreezeDmEmbedPolished,
  buildAssetsSeizedDmEmbedPolished,
  buildAssetsReleasedDmEmbedPolished,
  buildServiceHoldDecisionEmbedPolished,
  buildTransferReceivedDmEmbedPolished,
  buildTransferConfirmationEmbedPolished
} from "./embeds-polish.js";
import {
  extractActiveVehicleEntry,
  fetchActiveVehicles,
  fetchEmergencyCalls,
  fetchKillLogs,
  fetchServerPlayers,
  getPlayerTeamByUsername,
  punishUnauthorizedVehicleUse,
  verifyWeaponOwnership
} from "./erlc.js";
import { buildOwnedCarsCardAttachment } from "./owned-cars-card.js";
import { buildBankBalanceCardAttachment } from "./bank-balance-card.js";
import { buildFinesCardAttachment } from "./fines-card.js";
import * as resourceCardModule from "./resource-card.js";
import {
  addOwnedVehicle,
  applyBudgetTransaction,
  applyWeeklyBudgetAllowances,
  appendTransactionToStore,
  appendProjectTransaction,
  consumeTransfer,
  createFine,
  createHoldRequest,
  createAccount,
  createPendingPin,
  createTransfer,
  allAccounts,
  appendTransaction,
  findAccountByAccountNumber,
  findAccountByName,
  findAccountByRobloxUsername,
  getFine,
  getFinesForUser,
  getBudget,
  getHoldRequest,
  getAccount,
  getPendingPin,
  getVehicleShowroomMetaRecord,
  listVehicleShowroomMetaRecords,
  getVehiclePriceRecord,
  listAllTransactions,
  listAllFines,
  listBudgetTransactions,
  listProjects,
  listProjectTransactions,
  listTransactionsForUser,
  listOwnedVehicles,
  listActiveRentalsMatchingVehicle,
  findOwnedVehicleMatch,
  listVehicleCatalog,
  processExpiredRentalOwnerships,
  syncActiveRentalOwnerships,
  removeFine,
  removeAccountByName,
  removeOwnedVehicle,
  repairAllVehicleOwnershipRecords,
  registerVehicleName,
  resolveRegisteredVehicleName,
  setVehiclePrice,
  upsertVehicleShowroomMeta,
  getProject,
  getMutableAccount,
  upsertProject,
  mutateStore,
  updateFine,
  updateHoldRequest,
  updateAccount,
  userOwnsVehicle
} from "./storage/database.js";
import { registerWebsiteRoutes } from "./web-routes.js";
const config = configModule.config ?? configModule.default;
const assertConfig = configModule.assertConfig;
const buildResourceInventoryCardAttachment = resourceCardModule.buildResourceInventoryCardAttachment;
const buildResourceRewardCardAttachment = resourceCardModule.buildResourceRewardCardAttachment;
const ERLC_EVENT_WEBHOOK_PUBLIC_KEY_BASE64 = "MCowBQYDK2VwAyEAjSICb9pp0kHizGQtdG8ySWsDChfGqi+gyFCttigBNOA=";
const ERLC_EVENT_WEBHOOK_PUBLIC_KEY = createPublicKey({
  key: Buffer.from(ERLC_EVENT_WEBHOOK_PUBLIC_KEY_BASE64, "base64"),
  format: "der",
  type: "spki"
});

assertConfig();

const POLICE_BANK_LOG_CHANNEL_ID = "1494454338255323216";
const TRANSFERS_LOG_CHANNEL_ID = "1503716692503822376";
const BANK_ACCOUNT_CREATIONS_LOG_CHANNEL_ID = "1503716732534259783";
const RESOURCE_PURCHASES_LOG_CHANNEL_ID = "1503716771851665448";
const ADMIN_COMMANDS_LOG_CHANNEL_ID = "1503716845407178883";
const RESOURCES_GENERAL_LOG_CHANNEL_ID = "1503716884443562084";
const CARS_LOG_CHANNEL_ID = "1503716913849696366";
const WEAPONS_LOG_CHANNEL_ID = "1503716941754536087";
const CRAFTING_LOG_CHANNEL_ID = "1503716986612482158";
const WEBSITE_LOG_CHANNEL_ID = "1503717012315308123";
const TRAFFIC_SIGNAL_VIOLATIONS_LOG_CHANNEL_ID = "1499371497574105099";
const POLICE_BANK_ROLE_ID = "1498009237303988345";
const PROJECTS_SUPER_ROLE_ID = "1467541901648330848";
const WEBSITE_NAME_CHANGE_REQUEST_CHANNEL_ID = "1499371497574105099";
const BLACK_BANK_CARD_ROLE_ID = "1499857620046188634";
const GOLD_BANK_CARD_ROLE_ID = "1499857656330977312";
const DEFAULT_BANK_TRANSFER_LIMIT = 100000;
const GOLD_BANK_TRANSFER_LIMIT = 500000;
const activeFinesViewMessages = new Map();
const processedRobberyCallIds = new Set();
const processedErlcWebhookEventIds = new Map();
const redLightViolationState = new Map();
const pendingRobloxProfileLookups = new Map();
const pendingActivationDrafts = new Map();
const pendingActivationRequests = new Map();
let sortedVehicleCatalogCache = null;
let sortedVehicleCatalogCacheKey = "";
const pendingWebsiteLoginVerifications = new Map();

function clearPendingWebsiteLoginVerificationsForAccount(account = null) {
  const discordUserId = String(account?.discordUserId || "").trim();
  const robloxUsername = String(account?.robloxUsername || "").trim().toLowerCase();

  for (const [verificationId, pending] of pendingWebsiteLoginVerifications.entries()) {
    if (!pending) {
      pendingWebsiteLoginVerifications.delete(verificationId);
      continue;
    }

    const sameDiscordUser = discordUserId && String(pending?.discordUserId || "").trim() === discordUserId;
    const sameRobloxUsername =
      robloxUsername
      && String(pending?.robloxUsername || "").trim().toLowerCase() === robloxUsername;

    if (sameDiscordUser || sameRobloxUsername) {
      pendingWebsiteLoginVerifications.delete(verificationId);
    }
  }
}
let pinnedVoiceConnection = null;
const ACTIVATION_REVIEW_CHANNEL_ID = "1494448244737183856";
const ACTIVATION_ROLE_ID = "1460716225452572703";
const ACTIVATION_REVIEW_PING_ROLE_ID = "1464609170845204648";
const ACTIVATION_RULES_URL = "https://discord.com/channels/1457028655963439309/1460716346630209557";

const client = new Client({
  intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMembers, GatewayIntentBits.DirectMessages, GatewayIntentBits.MessageContent],
  partials: [Partials.Channel]
});

const app = express();
app.use(express.json({
  verify: (req, res, buf) => {
    req.rawBody = Buffer.from(buf);
  }
}));
app.use("/web", (req, res, next) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET,POST,OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, x-api-key, x-internal-api-key");

  if (req.method === "OPTIONS") {
    return res.status(204).end();
  }

  return next();
});

const CRAFTING_IMAGE_FILE_PATH = "assets/crafting-table-guide.png";
const HAS_CRAFTING_IMAGE_FILE = fs.existsSync(CRAFTING_IMAGE_FILE_PATH);

function getCraftingImageFiles() {
  return HAS_CRAFTING_IMAGE_FILE ? [CRAFTING_IMAGE_FILE_PATH] : [];
}

function getCraftingWeaponImageConfig(weaponKey) {
  const config = CRAFTING_WEAPON_IMAGE_DEFINITIONS?.[weaponKey];
  if (!config?.path || !config?.attachmentName) {
    return null;
  }

  if (!fs.existsSync(config.path)) {
    return null;
  }

  return config;
}

function getCraftingWeaponFiles(weaponKey) {
  const files = [...getCraftingImageFiles()];
  const weaponImage = getCraftingWeaponImageConfig(weaponKey);

  if (weaponImage) {
    files.push(new AttachmentBuilder(weaponImage.path, { name: weaponImage.attachmentName }));
  }

  return files;
}

function applyCraftingImage(embed) {
  if (HAS_CRAFTING_IMAGE_FILE) {
    embed.setImage(CRAFTING_TABLE_IMAGE_URL);
  }

  return embed;
}

function requireAccount(userId) {
  return getAccount(userId);
}

async function connectBotToVoiceChannel(channel) {
  if (!channel?.guild?.id || !channel?.id || !channel?.guild?.voiceAdapterCreator) {
    throw new Error("invalid_voice_channel");
  }

  if (pinnedVoiceConnection) {
    try {
      pinnedVoiceConnection.destroy();
    } catch {}
  }

  const connection = joinVoiceChannel({
    guildId: channel.guild.id,
    channelId: channel.id,
    adapterCreator: channel.guild.voiceAdapterCreator,
    selfDeaf: false,
    selfMute: false
  });

  connection.on("error", (error) => {
    console.error("Pinned voice connection error:", error);
  });

  connection.on(VoiceConnectionStatus.Disconnected, async () => {
    try {
      await Promise.race([
        entersState(connection, VoiceConnectionStatus.Signalling, 5_000),
        entersState(connection, VoiceConnectionStatus.Connecting, 5_000)
      ]);
    } catch {
      if (pinnedVoiceConnection === connection) {
        pinnedVoiceConnection = null;
      }

      try {
        connection.destroy();
      } catch {}
    }
  });

  await entersState(connection, VoiceConnectionStatus.Ready, 15_000);
  pinnedVoiceConnection = connection;
  return connection;
}

function getBankCardDefinition(cardType) {
  const normalized = String(cardType || "").trim().toLowerCase();
  if (normalized === "black") {
    return {
      key: "black",
      label: "البطاقة السوداء",
      roleId: BLACK_BANK_CARD_ROLE_ID,
      color: 0x111111,
      emoji: "🖤",
      limit: Number.POSITIVE_INFINITY,
      limitText: "لا نهائي",
      benefits: [
        "سقف التحويل البنكي غير محدود بالكامل.",
        "أولوية أعلى في الاستخدام داخل الأنظمة البنكية.",
        "هوية مصرفية فاخرة مخصصة لعملاء النخبة."
      ]
    };
  }

  return {
    key: "gold",
    label: "البطاقة الذهبية",
    roleId: GOLD_BANK_CARD_ROLE_ID,
    color: 0xd4a017,
    emoji: "💳",
    limit: GOLD_BANK_TRANSFER_LIMIT,
    limitText: formatCurrency(GOLD_BANK_TRANSFER_LIMIT),
    benefits: [
      "سقف التحويل البنكي يصل إلى 500,000 ريال.",
      "امتيازات مصرفية أفضل من البطاقة الأساسية.",
      "هوية بنكية فاخرة بلون ذهبي مميز."
    ]
  };
}

function getMemberBankCardDefinition(member) {
  if (memberHasRoleById(member, BLACK_BANK_CARD_ROLE_ID)) {
    return getBankCardDefinition("black");
  }

  if (memberHasRoleById(member, GOLD_BANK_CARD_ROLE_ID)) {
    return getBankCardDefinition("gold");
  }

  return {
    key: "standard",
    label: "بدون بطاقة مميزة",
    roleId: null,
    color: 0x2f3136,
    emoji: "🏦",
    limit: DEFAULT_BANK_TRANSFER_LIMIT,
    limitText: formatCurrency(DEFAULT_BANK_TRANSFER_LIMIT),
    benefits: ["الحد الأقصى للتحويل البنكي هو 100,000 ريال."]
  };
}

async function getAccountTransferPolicy(discordUserId) {
  const guild = await client.guilds.fetch(config.guildId).catch(() => null);
  const member = guild ? await guild.members.fetch(discordUserId).catch(() => null) : null;
  return getMemberBankCardDefinition(member);
}

function buildBankCardGrantedDmEmbed({ cardDefinition, grantedByUserId }) {
  return new EmbedBuilder()
    .setColor(cardDefinition.color)
    .setTitle(`${cardDefinition.emoji} لقد حصلت على ${cardDefinition.label}`)
    .setDescription(`**نبارك لك تفعيل ${cardDefinition.label} على حسابك البنكي داخل Arab World Bank.**`)
    .addFields(
      { name: "🪪 **نوع البطاقة**", value: `**${cardDefinition.label}**`, inline: true },
      { name: "💸 **سقف التحويل**", value: `**${cardDefinition.limitText}**`, inline: true },
      { name: "🧑‍⚖️ **تمت بواسطة**", value: grantedByUserId ? `**<@${grantedByUserId}>**` : "**الإدارة**", inline: true },
      { name: "✨ **المميزات**", value: cardDefinition.benefits.map((line) => `• ${line}`).join("\n"), inline: false },
      { name: "📘 **تعليمات**", value: "**استخدم خدمات البنك بشكل طبيعي، وسيتم احتساب حد التحويل المناسب لك تلقائيًا حسب البطاقة الممنوحة.**", inline: false }
    )
    .setFooter({ text: "Arab World Bank • بطاقات النخبة" })
    .setTimestamp();
}

function ensureProjectState(projectKey) {
  const definition = getProjectDefinition(projectKey);
  if (!definition) {
    return null;
  }
  const current = getProject(projectKey);
  const targetFuelPercent = definition.type === "station"
    ? Number(current?.fuelPercent ?? 100)
    : 0;

  if (
    current
    && current.key === projectKey
    && current.type === definition.type
    && Boolean(current.name || definition.title)
    && Number(current.fuelPercent ?? 0) === Number(targetFuelPercent)
  ) {
    return current;
  }

  return upsertProject(projectKey, (record) => ({
    ...record,
    key: projectKey,
    type: definition.type,
    name: record.name || definition.title,
    budget: Number(record.budget || 0),
    fuelPercent: definition.type === "station" ? Number(record.fuelPercent ?? 100) : 0
  }));
}

function getProjectOwnerMention(project) {
  return project?.ownerUserId ? `<@${project.ownerUserId}>` : "العقار غير مملوك";
}

function getProjectAccessLevel(member, project) {
  if (!project || !member) {
    return "none";
  }

  if (memberHasRoleById(member, PROJECTS_SUPER_ROLE_ID)) {
    return "supervisor";
  }

  if (member.user?.id === project.ownerUserId) {
    return "owner";
  }

  if (project.partners?.includes(member.user?.id)) {
    return "partner";
  }

  if (project.admins?.includes(member.user?.id)) {
    return "admin";
  }

  if (project.employees?.includes(member.user?.id)) {
    return "employee";
  }

  return "none";
}

function canManageProjectRecord(member, project) {
  return ["supervisor", "owner", "partner", "admin", "employee"].includes(getProjectAccessLevel(member, project));
}

function canUseProjectAction(member, project, action) {
  const level = getProjectAccessLevel(member, project);

  if (level === "supervisor" || level === "owner" || level === "partner") {
    return true;
  }

  if (level === "admin") {
    return action === "staff_manage";
  }

  if (level === "employee") {
    return action === "refill_notice";
  }

  return false;
}

function applyProjectMoneyMutation(projectKey, amount, type, actorUserId, note = "") {
  const numericAmount = Number(amount);
  if (!Number.isFinite(numericAmount) || numericAmount <= 0) {
    return { ok: false, error: "invalid_amount" };
  }

  const project = ensureProjectState(projectKey);
  if (!project) {
    return { ok: false, error: "project_not_found" };
  }

  const isCredit = ["manual_add", "weekly_income", "fuel_income", "showroom_income"].includes(type);
  if (!isCredit && Number(project.budget || 0) < numericAmount) {
    return { ok: false, error: "insufficient_project_budget" };
  }

  const updated = upsertProject(projectKey, (current) => ({
    ...current,
    budget: Number(current.budget || 0) + (isCredit ? numericAmount : -numericAmount)
  }));

  console.info("[PROJECT BUDGET MUTATION]", JSON.stringify({
    projectKey,
    type,
    actorUserId: actorUserId || null,
    amount: numericAmount,
    previousBudget: Number(project.budget || 0),
    nextBudget: Number(updated?.budget || 0),
    note: String(note || "")
  }));

  const transaction = appendProjectTransaction({
    projectKey,
    type,
    label: type,
    amount: numericAmount,
    direction: isCredit ? "credit" : "debit",
    actorUserId,
    note,
    balanceAfter: updated.budget
  });

  refreshStoredProjectPanel(projectKey).catch((error) => {
    console.error(`Project panel refresh failed after money mutation for ${projectKey}:`, error);
  });

  return { ok: true, project: updated, transaction };
}

async function sendProjectStatus(interaction, projectKey, method = "reply") {
  const payload = buildProjectStatusPayload(projectKey);

  if (method === "reply") {
    const existingProject = ensureProjectState(projectKey);
    if (
      existingProject?.dashboardChannelId
      && existingProject?.dashboardMessageId
      && existingProject.dashboardChannelId === interaction.channelId
    ) {
      const channel = await client.channels.fetch(existingProject.dashboardChannelId).catch(() => null);
      if (channel?.messages) {
        const existingMessage = await channel.messages.fetch(existingProject.dashboardMessageId).catch(() => null);
        if (existingMessage) {
          await existingMessage.edit(payload).catch(() => null);
          await interaction.reply({
            embeds: [
              new EmbedBuilder()
                .setColor(0x0b1f3a)
                .setTitle("🔄 تم تحديث لوحة المشروع")
                .setDescription("**تم تحديث لوحة المشروع الحالية في نفس الروم بدل إنشاء نسخة جديدة.**")
                .setFooter({ text: "Arab World • المشاريع" })
                .setTimestamp()
            ],
            ephemeral: true
          });
          return;
        }
      }
    }
  }

  if (method === "update") {
    await interaction.update(payload);
    const message = await interaction.fetchReply().catch(() => null);
    if (message?.id && interaction.channelId) {
      upsertProject(projectKey, (current) => ({
        ...current,
        dashboardChannelId: interaction.channelId,
        dashboardMessageId: message.id
      }));
    }
    return;
  }

  if (method === "editReply") {
    await interaction.editReply(payload);
    const message = await interaction.fetchReply().catch(() => null);
    if (message?.id && interaction.channelId) {
      upsertProject(projectKey, (current) => ({
        ...current,
        dashboardChannelId: interaction.channelId,
        dashboardMessageId: message.id
      }));
    }
    return;
  }

  await interaction.reply(payload);
  const message = await interaction.fetchReply().catch(() => null);
  if (message?.id && interaction.channelId) {
    upsertProject(projectKey, (current) => ({
      ...current,
      dashboardChannelId: interaction.channelId,
      dashboardMessageId: message.id
    }));
  }
}

function buildProjectStatusPayload(projectKey) {
  const definition = getProjectDefinition(projectKey);
  const project = ensureProjectState(projectKey);
  const transactions = listProjectTransactions(projectKey, 5);
  return {
    embeds: [buildProjectDashboardEmbed(definition, project, transactions)],
    components: [createProjectMenu(definition)]
  };
}

async function refreshProjectPanelMessage(channel, messageId, projectKey) {
  if (!channel || !messageId) {
    return;
  }

  const message = await channel.messages.fetch(messageId).catch(() => null);
  if (!message) {
    return;
  }

  await message.edit(buildProjectStatusPayload(projectKey)).catch(() => null);
}

async function refreshStoredProjectPanel(projectKey) {
  const project = ensureProjectState(projectKey);
  if (!project?.dashboardChannelId || !project?.dashboardMessageId) {
    return;
  }

  const channel = await client.channels.fetch(project.dashboardChannelId).catch(() => null);
  if (!channel?.messages) {
    return;
  }

  await refreshProjectPanelMessage(channel, project.dashboardMessageId, projectKey);
}

function createProjectBudgetModal(projectKey, action, messageId) {
  const isDeposit = action === "deposit";
  return new ModalBuilder()
    .setCustomId(`modal_project_budget:${projectKey}:${action}:${messageId}`)
    .setTitle(isDeposit ? "إضافة مال للمشروع" : "سحب مال من المشروع")
    .addComponents(
      new ActionRowBuilder().addComponents(
        new TextInputBuilder()
          .setCustomId("amount")
          .setLabel(isDeposit ? "كم تريد إيداعه في ميزانية المشروع؟" : "كم تريد سحبه من ميزانية المشروع؟")
          .setPlaceholder("اكتب المبلغ بالأرقام")
          .setStyle(TextInputStyle.Short)
          .setRequired(true)
      )
    );
}

function createProjectStaffModal(projectKey, messageId) {
  return new ModalBuilder()
    .setCustomId(`modal_project_staff:${projectKey}:${messageId}`)
    .setTitle("إدارة موظفي المشروع")
    .addComponents(
      new ActionRowBuilder().addComponents(
        new TextInputBuilder()
          .setCustomId("target")
          .setLabel("اسم الموظف أو آيديه أو رقمه البنكي")
          .setPlaceholder("اكتب الآيدي أو الاسم البنكي أو رقم الحساب")
          .setStyle(TextInputStyle.Short)
          .setRequired(true)
      ),
      new ActionRowBuilder().addComponents(
        new TextInputBuilder()
          .setCustomId("job_type")
          .setLabel("الوظيفة")
          .setPlaceholder("اكتب: إداري أو موظف أو شريك")
          .setStyle(TextInputStyle.Short)
          .setRequired(true)
      ),
      new ActionRowBuilder().addComponents(
        new TextInputBuilder()
          .setCustomId("action_type")
          .setLabel("نوع العملية")
          .setPlaceholder("اكتب: توظيف أو فصل")
          .setStyle(TextInputStyle.Short)
          .setRequired(true)
      )
    );
}

function createProjectOwnerTransferModal(projectKey, messageId) {
  return new ModalBuilder()
    .setCustomId(`modal_project_transfer_owner:${projectKey}:${messageId}`)
    .setTitle("نقل ملكية المشروع")
    .addComponents(
      new ActionRowBuilder().addComponents(
        new TextInputBuilder()
          .setCustomId("target")
          .setLabel("اسم الشخص أو آيديه أو رقمه البنكي")
          .setPlaceholder("اكتب الآيدي أو الاسم البنكي أو رقم الحساب")
          .setStyle(TextInputStyle.Short)
          .setRequired(true)
      )
    );
}

function buildProjectTransactionsEmbed(definition, project, transactions = []) {
  const transactionLines = Array.isArray(transactions) && transactions.length
    ? transactions.slice(0, 15).map((entry, index) => {
        const amountText = entry.direction === "none" ? "بدون مبلغ" : formatProjectCurrency(entry.amount);
        const actorText = entry.actorUserId ? `<@${entry.actorUserId}>` : "النظام";
        const noteText = entry.note ? `\n> ${entry.note}` : "";
        return `**${index + 1}.** ${entry.label || entry.type} • ${amountText} • ${actorText} • <t:${Math.floor(new Date(entry.createdAt).getTime() / 1000)}:R>${noteText}`;
      })
    : ["**لا توجد عمليات مسجلة حتى الآن.**"];

  const transactionFields = [];
  let currentChunk = "";

  for (const line of transactionLines) {
    const candidate = currentChunk ? `${currentChunk}\n\n${line}` : line;
    if (candidate.length > 1024) {
      if (currentChunk) {
        transactionFields.push(currentChunk);
      }
      currentChunk = line.slice(0, 1024);
      continue;
    }
    currentChunk = candidate;
  }

  if (currentChunk) {
    transactionFields.push(currentChunk);
  }

  const embed = new EmbedBuilder()
    .setColor(definition.color)
    .setTitle(`🧾 سجل عمليات ${project.name || definition.title}`)
    .setDescription("**فيما يلي آخر العمليات المسجلة على هذا المشروع بالتفصيل.**")
    .addFields(
      { name: "🏢 المشروع", value: `**${project.name || definition.title}**`, inline: true },
      { name: "💰 الميزانية الحالية", value: `**${formatProjectCurrency(project.budget)}**`, inline: true },
      { name: "👤 المالك", value: `**${getProjectOwnerMention(project)}**`, inline: true }
    )
    .setFooter({ text: "Arab World • سجل عمليات المشاريع" })
    .setTimestamp();

  transactionFields.forEach((chunk, index) => {
    embed.addFields({
      name: index === 0 ? "📋 العمليات" : `📋 العمليات (${index + 1})`,
      value: chunk,
      inline: false
    });
  });

  return embed;
}

async function sendProjectFuelLowAlert(project) {
  if (!project?.ownerUserId) {
    return;
  }

  const user = await client.users.fetch(project.ownerUserId).catch(() => null);
  if (!user) {
    return;
  }

  await user.send({
    embeds: [
      new EmbedBuilder()
        .setColor(0xf59e0b)
        .setTitle("⛽ تنبيه انخفاض وقود المشروع")
        .setDescription("**نسبة الوقود في مشروعك انخفضت إلى أقل من 50% وتحتاج إلى تعبئة جديدة.**")
        .addFields(
          { name: "🏢 المشروع", value: `**${project.name || getProjectDefinition(project.key)?.title || project.key}**`, inline: true },
          { name: "📉 النسبة الحالية", value: `**${Number(project.fuelPercent || 0)}%**`, inline: true },
          { name: "📘 التعليمات", value: "**تواصل مع العقاري بوب مارلي لتعبئة محطتك بالوقود قبل أن تنخفض أكثر.**", inline: false }
        )
        .setFooter({ text: "Arab World • تنبيهات المشاريع" })
        .setTimestamp()
    ]
  }).catch(() => null);
}

async function notifyExpiredRentalOwnerships(expiredRentalSnapshots = []) {
  for (const rental of expiredRentalSnapshots) {
    if (!rental?.userId || !rental?.vehicleName) {
      continue;
    }

    await client.users.fetch(rental.userId)
      .then((user) => user.send({
        embeds: [
          new EmbedBuilder()
            .setColor(0x8d1111)
            .setTitle("⏳ انتهت مدة تأجير المركبة")
            .setDescription("**انتهت مدة التأجير وتم سحب المركبة من ممتلكاتك تلقائيًا داخل النظام.**")
            .addFields(
              { name: "🚘 المركبة", value: `**${rental.vehicleName}**`, inline: true },
              { name: "🏢 المعرض", value: `**${rental.projectName || rental.projectKey || "غير معروف"}**`, inline: true },
              { name: "🧾 الحالة", value: "**تمت إزالة المركبة المؤجرة من ممتلكاتك.**", inline: false }
            )
            .setFooter({ text: "Arab World Rentals • Expired Rental" })
            .setTimestamp()
        ]
      }).catch(() => null))
      .catch(() => null);
  }
}

async function processProjectSystems() {
  const now = Date.now();
  const decaySteps = getProjectFuelDecaySteps();

  for (const definition of Object.values(PROJECT_DEFINITIONS)) {
    let project = ensureProjectState(definition.key);
    if (!project) {
      continue;
    }

    if (definition.weeklyIncome > 0) {
      const lastIncome = project.lastWeeklyIncomeAt ? new Date(project.lastWeeklyIncomeAt).getTime() : 0;
      if (!lastIncome || now - lastIncome >= 7 * 24 * 60 * 60 * 1000) {
        const result = applyProjectMoneyMutation(definition.key, definition.weeklyIncome, "weekly_income", null, "دخل أسبوعي تلقائي");
        if (result.ok) {
          project = upsertProject(definition.key, (current) => ({
            ...current,
            lastWeeklyIncomeAt: new Date(now).toISOString()
          }));
        }
      }
    }

    if (definition.type === "station") {
      const lastDecay = project.lastFuelDecayAt ? new Date(project.lastFuelDecayAt).getTime() : 0;
      const elapsedDays = lastDecay ? Math.floor((now - lastDecay) / (24 * 60 * 60 * 1000)) : 0;
      if (!lastDecay || elapsedDays >= 1) {
        let fuel = Number(project.fuelPercent ?? 100);
        const daysToApply = Math.max(1, Math.min(elapsedDays || 1, decaySteps.length));
        for (let index = 0; index < daysToApply; index += 1) {
          const step = decaySteps[index % decaySteps.length];
          fuel = Math.max(0, fuel - step);
        }

        project = upsertProject(definition.key, (current) => ({
          ...current,
          fuelPercent: fuel,
          lastFuelDecayAt: new Date(now).toISOString()
        }));
      }

      if (Number(project.fuelPercent || 0) < 50 && Number(project.lastFuelPercentNotified || 100) >= 50) {
        await sendProjectFuelLowAlert(project);
        project = upsertProject(definition.key, (current) => ({
          ...current,
          lastFuelAlertAt: new Date(now).toISOString(),
          lastFuelPercentNotified: Number(current.fuelPercent || 0)
        }));
      } else if (Number(project.fuelPercent || 0) >= 50 && Number(project.lastFuelPercentNotified || 0) < 50) {
        project = upsertProject(definition.key, (current) => ({
          ...current,
          lastFuelPercentNotified: Number(current.fuelPercent || 0)
        }));
      }
    }
  }
}

const STATION_AUTO_INCOME_INTERVAL_MS = 5 * 60 * 1000;
const STATION_AUTO_INCOME_CONFIG = {
  [PROJECT_KEYS.station_city_1]: {
    channelId: "1500118500767699114",
    title: "محطة المدينة الأولى",
    rollAmount() {
      return getRandomIntInclusive(100, 300);
    }
  },
  [PROJECT_KEYS.station_city_2]: {
    channelId: "1500119088452603914",
    title: "محطة المدينة الثانية",
    rollAmount() {
      const roll = Math.random();
      if (roll < 0.12) {
        return getRandomIntInclusive(50, 69);
      }
      if (roll < 0.9) {
        return getRandomIntInclusive(70, 150);
      }
      return getRandomIntInclusive(151, 200);
    }
  },
  [PROJECT_KEYS.station_farm]: {
    channelId: "1500119088452603914",
    title: "محطة المزرعة",
    rollAmount() {
      const roll = Math.random();
      if (roll < 0.72) {
        return getRandomIntInclusive(50, 100);
      }
      if (roll < 0.93) {
        return getRandomIntInclusive(101, 120);
      }
      return getRandomIntInclusive(121, 150);
    }
  }
};

let stationAutoIncomeInterval = null;

function getRandomIntInclusive(min, max) {
  const start = Math.ceil(min);
  const end = Math.floor(max);
  return Math.floor(Math.random() * (end - start + 1)) + start;
}

async function sendStationAutoIncomeEmbed(projectKey, amount, updatedProject) {
  const config = STATION_AUTO_INCOME_CONFIG[projectKey];
  if (!config?.channelId) {
    return;
  }

  const channel = await client.channels.fetch(config.channelId).catch(() => null);
  if (!channel?.isTextBased?.()) {
    return;
  }

  const definition = getProjectDefinition(projectKey);
  const stationName = updatedProject?.name || definition?.title || config.title;

  await channel.send({
    embeds: [
      new EmbedBuilder()
        .setColor(0x0b1f3a)
        .setTitle("⛽ تعبئة ناجحة للمحطة")
        .setDescription("**تم تسجيل تعبئة وقود ناجحة وإضافة دخل جديد إلى ميزانية المحطة تلقائيًا.**")
        .addFields(
          { name: "🏢 المحطة", value: `**${stationName}**`, inline: true },
          { name: "💵 المبلغ المضاف", value: `**${formatProjectCurrency(amount)}**`, inline: true },
          { name: "🏦 الميزانية الحالية", value: `**${formatProjectCurrency(Number(updatedProject?.budget || 0))}**`, inline: true },
          { name: "👤 مالك المشروع", value: `**${getProjectOwnerMention(updatedProject)}**`, inline: true },
          { name: "🧾 الوصف", value: "**تم تحويل قيمة التعبئة بنجاح إلى ميزانية المحطة وتحديث اللوحة مباشرة.**", inline: false }
        )
        .setFooter({ text: "Arab World • نظام المحطات" })
        .setTimestamp()
    ]
  }).catch(() => null);
}

async function processStationAutoIncomeTick() {
  for (const [projectKey, config] of Object.entries(STATION_AUTO_INCOME_CONFIG)) {
    const amount = config.rollAmount();
    const result = applyProjectMoneyMutation(projectKey, amount, "fuel_income", null, "دخل تعبئة وقود تلقائي من نظام المحطات");
    if (!result.ok) {
      continue;
    }

    await refreshStoredProjectPanel(projectKey);
    await sendStationAutoIncomeEmbed(projectKey, amount, result.project);
  }
}

async function startStationAutoIncomeSystem() {
  if (stationAutoIncomeInterval) {
    return false;
  }

  await processStationAutoIncomeTick();
  stationAutoIncomeInterval = setInterval(() => {
    processStationAutoIncomeTick().catch((error) => {
      console.error("Scheduled station auto income tick failed:", error);
    });
  }, STATION_AUTO_INCOME_INTERVAL_MS);
  return true;
}

function stopStationAutoIncomeSystem() {
  if (!stationAutoIncomeInterval) {
    return false;
  }

  clearInterval(stationAutoIncomeInterval);
  stationAutoIncomeInterval = null;
  return true;
}

function getProjectKeyForDashboardCommand(commandName) {
  const mapping = {
    "محطه-مدينه-اولى": PROJECT_KEYS.station_city_1,
    "محطه-مدينه-ثانيه": PROJECT_KEYS.station_city_2,
    "محطه-المزرعه": PROJECT_KEYS.station_farm,
    "معرض-1": PROJECT_KEYS.showroom_1,
    "معرض-2": PROJECT_KEYS.showroom_2,
    "معرض-3": PROJECT_KEYS.showroom_3,
    "مطعم-1": PROJECT_KEYS.restaurant_1,
    "مطعم-2": PROJECT_KEYS.restaurant_2,
    "كوفي": PROJECT_KEYS.coffee_respawn
  };

  return mapping[commandName] ?? null;
}

function normalizeProjectLookupText(value) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ");
}

function resolveFuelSaleProjectKey(payload = {}) {
  const candidates = [
    payload.projectKey,
    payload.stationKey,
    payload.project,
    payload.station,
    payload.stationName,
    payload.projectName,
    payload.name
  ].filter(Boolean);

  if (!candidates.length) {
    return null;
  }

  const records = listProjects();

  for (const candidate of candidates) {
    const raw = String(candidate).trim();
    if (STATION_PROJECT_KEYS.includes(raw)) {
      return raw;
    }

    const normalized = normalizeProjectLookupText(raw);
    const matchedDefinition = Object.values(PROJECT_DEFINITIONS).find((definition) =>
      definition.type === "station"
      && (normalizeProjectLookupText(definition.title) === normalized || normalizeProjectLookupText(definition.key) === normalized)
    );
    if (matchedDefinition) {
      return matchedDefinition.key;
    }

    const matchedRecord = records.find((record) =>
      STATION_PROJECT_KEYS.includes(record.key)
      && normalizeProjectLookupText(record.name) === normalized
    );
    if (matchedRecord) {
      return matchedRecord.key;
    }
  }

  return null;
}

function extractFuelSaleAmount(payload = {}) {
  const candidates = [
    payload.amount,
    payload.price,
    payload.total,
    payload.value,
    payload.payment,
    payload.saleAmount,
    payload.fuelSaleAmount
  ];

  for (const candidate of candidates) {
    const numeric = Number(candidate);
    if (Number.isFinite(numeric) && numeric > 0) {
      return numeric;
    }
  }

  return null;
}

function extractFuelSalePlayerLabel(payload = {}) {
  return String(
    payload.robloxUsername
    || payload.player
    || payload.username
    || payload.playerName
    || payload.user
    || ""
  ).trim();
}

function createRobloxLookupToken() {
  return `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;
}

function createRobloxLookupCopyButton(token) {
  return new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId(`roblox_lookup_copy:${token}`)
      .setLabel("نسخ")
      .setEmoji("📋")
      .setStyle(ButtonStyle.Secondary)
  );
}

function buildRobloxLookupEmbed({ username, robloxUserId, profileUrl = "", avatarUrl = "" }) {
  const embed = new EmbedBuilder()
    .setColor(0x0c1f3f)
    .setTitle("🆔 معلومات حساب روبلوكس")
    .setDescription("**تم جلب معلومات حساب روبلوكس بنجاح.**")
    .addFields(
      { name: "🎮 **يوزر روبلوكس**", value: `**${username}**`, inline: true },
      { name: "🪪 **Roblox ID**", value: `**${robloxUserId}**`, inline: true },
      { name: "🔗 **رابط الحساب**", value: profileUrl ? `[اضغط هنا](${profileUrl})` : "**غير متوفر**", inline: false },
      { name: "🛠️ **من صنع**", value: "**العم سعود**", inline: false }
    )
    .setFooter({ text: "Arab World • Roblox Lookup" })
    .setTimestamp();

  if (profileUrl) {
    embed.setURL(profileUrl);
  }

  if (avatarUrl) {
    embed.setThumbnail(avatarUrl);
  }

  return embed;
}

async function fetchRobloxUserIdByUsername(username) {
  const cleanUsername = String(username || "").trim();
  if (!cleanUsername) {
    return { ok: false, error: "missing_username" };
  }

  try {
    const response = await fetch("https://users.roblox.com/v1/usernames/users", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        usernames: [cleanUsername],
        excludeBannedUsers: false
      })
    });

    if (!response.ok) {
      return { ok: false, error: "roblox_api_failed" };
    }

    const payload = await response.json().catch(() => ({}));
    const firstUser = Array.isArray(payload?.data) ? payload.data[0] : null;
    if (!firstUser?.id) {
      return { ok: false, error: "username_not_found" };
    }

    const robloxUserId = String(firstUser.id);
    const profileUrl = `https://www.roblox.com/users/${robloxUserId}/profile`;

    let avatarUrl = "";
    const thumbnailResponse = await fetch(`https://thumbnails.roblox.com/v1/users/avatar-headshot?userIds=${encodeURIComponent(robloxUserId)}&size=150x150&format=Png&isCircular=false`).catch(() => null);
    if (thumbnailResponse?.ok) {
      const thumbnailPayload = await thumbnailResponse.json().catch(() => ({}));
      const thumbnailData = Array.isArray(thumbnailPayload?.data) ? thumbnailPayload.data[0] : null;
      avatarUrl = String(thumbnailData?.imageUrl || "").trim();
    }

    return {
      ok: true,
      username: firstUser.name || cleanUsername,
      robloxUserId,
      profileUrl,
      avatarUrl
    };
  } catch (error) {
    console.error("Roblox lookup failed:", error);
    return { ok: false, error: "roblox_lookup_error" };
  }
}

function createActivationRequestId() {
  return `activation_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;
}

function createActivationEntryButtons(requestId) {
  return new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId(`activation_open:${requestId}`)
      .setLabel("تفعيل | Activite")
      .setEmoji("✅")
      .setStyle(ButtonStyle.Primary)
  );
}

function createActivationReviewButtons(requestId) {
  return new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId(`activation_accept:${requestId}`)
      .setLabel("قبول")
      .setEmoji("✅")
      .setStyle(ButtonStyle.Success),
    new ButtonBuilder()
      .setCustomId(`activation_reject:${requestId}`)
      .setLabel("رفض")
      .setEmoji("⛔")
      .setStyle(ButtonStyle.Danger)
  );
}

function createActivationConfirmButtons(requestId) {
  return new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId(`activation_confirm:${requestId}`)
      .setLabel("موافق")
      .setEmoji("✅")
      .setStyle(ButtonStyle.Success),
    new ButtonBuilder()
      .setCustomId(`activation_cancel:${requestId}`)
      .setLabel("غير موافق")
      .setEmoji("⛔")
      .setStyle(ButtonStyle.Danger)
  );
}

function createActivationModal(requestId) {
  return new ModalBuilder()
    .setCustomId(`modal_activation:${requestId}`)
    .setTitle("طلب تفعيل عرب وورلد")
    .addComponents(
      new ActionRowBuilder().addComponents(
        new TextInputBuilder()
          .setCustomId("full_name")
          .setLabel("اسمك")
          .setPlaceholder("اكتب اسمك الكامل")
          .setStyle(TextInputStyle.Short)
          .setRequired(true)
      ),
      new ActionRowBuilder().addComponents(
        new TextInputBuilder()
          .setCustomId("age")
          .setLabel("عمرك")
          .setPlaceholder("اكتب عمرك")
          .setStyle(TextInputStyle.Short)
          .setRequired(true)
      ),
      new ActionRowBuilder().addComponents(
        new TextInputBuilder()
          .setCustomId("roblox_username")
          .setLabel("يوزر روبلوكس")
          .setPlaceholder("اكتب يوزرك في روبلوكس")
          .setStyle(TextInputStyle.Short)
          .setRequired(true)
      ),
      new ActionRowBuilder().addComponents(
        new TextInputBuilder()
          .setCustomId("pledge")
          .setLabel("التعهد بعدم التخريب")
          .setPlaceholder("اكتب: أتعهد بعدم التخريب والالتزام بالقوانين")
          .setStyle(TextInputStyle.Paragraph)
          .setRequired(true)
      )
    );
}

function buildActivationEntryEmbed() {
  return new EmbedBuilder()
    .setColor(0x0b1f3a)
    .setTitle("🔷 AW , ARAB WORLD | التفعيل")
    .setDescription("**مرحبًا بك في نظام التفعيل داخل عرب وورلد. اضغط الزر بالأسفل لتقديم طلب التفعيل بشكل رسمي ومنظم.**")
    .addFields(
      { name: "📘 التعليمات", value: "**اقرأ قوانين السيرفر جيدًا قبل التقديم، واكتب بياناتك بشكل صحيح وواضح.**", inline: false },
      { name: "⚠️ التنبيهات", value: `**أي معلومات خاطئة أو تعهد غير صحيح قد يؤدي إلى رفض الطلب. راجع القوانين من هنا: [قوانين السيرفر](${ACTIVATION_RULES_URL})**`, inline: false },
      { name: "🛡️ المطلوب", value: "**الاسم • العمر • يوزر روبلوكس • التعهد بعدم التخريب**", inline: false }
    )
    .setFooter({ text: "AW , ARAB WORLD • Activite System" })
    .setTimestamp();
}

function buildActivationReviewEmbed({ applicant, request, avatarUrl = "" }) {
  const embed = new EmbedBuilder()
    .setColor(0x0b1f3a)
    .setTitle("📝 AW , ARAB WORLD | طلب تفعيل جديد")
    .setDescription([
      "**تم إرسال طلب تفعيل جديد ويحتاج إلى مراجعة الإدارة.**",
      "",
      "🔹 **يرجى مراجعة البيانات بدقة قبل القبول أو الرفض.**",
      `🔹 **رتبة المراجعة المطلوبة:** <@&${ACTIVATION_REVIEW_PING_ROLE_ID}>`
    ].join("\n"))
    .addFields(
      { name: "👤 مقدم الطلب", value: `**<@${applicant.id}>**`, inline: true },
      { name: "📛 الاسم", value: `**${request.fullName}**`, inline: true },
      { name: "🎂 العمر", value: `**${request.age}**`, inline: true },
      { name: "🎮 يوزر روبلوكس", value: `**${request.robloxUsername}**`, inline: true },
      { name: "🆔 Discord ID", value: `**${applicant.id}**`, inline: true },
      { name: "🪪 Roblox ID", value: `**${request.robloxUserId || "غير متوفر"}**`, inline: true },
      { name: "🛡️ التعهد", value: `**${request.pledge}**`, inline: false },
      { name: "📘 تنبيه إداري", value: "**عند القبول سيتم منح رتبة التفعيل تلقائيًا وإرسال رسالة خاصة للمستخدم.**", inline: false }
    )
    .setFooter({ text: "AW , ARAB WORLD • Activation Review Panel" })
    .setTimestamp();

  if (avatarUrl) {
    embed.setThumbnail(avatarUrl);
  }

  return embed;
}

function buildActivationConfirmEmbed({ request, avatarUrl = "" }) {
  const embed = new EmbedBuilder()
    .setColor(0x0b1f3a)
    .setTitle("📋 تأكيد معلومات التفعيل")
    .setDescription("**هذه معلوماتك الحالية. تأكد منها جيدًا قبل إرسال طلب التفعيل إلى الإدارة.**")
    .addFields(
      { name: "📛 الاسم", value: `**${request.fullName}**`, inline: true },
      { name: "🎂 العمر", value: `**${request.age}**`, inline: true },
      { name: "🎮 يوزر روبلوكس", value: `**${request.robloxUsername}**`, inline: true },
      { name: "🪪 Roblox ID", value: `**${request.robloxUserId || "غير متوفر"}**`, inline: true },
      { name: "🛡️ التعهد", value: `**${request.pledge}**`, inline: false },
      { name: "⚠️ تنبيه", value: "**إذا كانت المعلومات غير صحيحة اضغط غير موافق وأعد التقديم من جديد.**", inline: false }
    )
    .setFooter({ text: "AW , ARAB WORLD • Activation Confirmation" })
    .setTimestamp();

  if (avatarUrl) {
    embed.setThumbnail(avatarUrl);
  }

  return embed;
}

function buildActivationAcceptedEmbed({ reviewerId, applicantId, request, avatarUrl = "" }) {
  const embed = new EmbedBuilder()
    .setColor(0x1f8b4c)
    .setTitle("✅ تم قبول طلب التفعيل")
    .setDescription("**تمت مراجعة الطلب والموافقة على تفعيل المواطن داخل عرب وورلد بنجاح.**")
    .addFields(
      { name: "👤 المواطن", value: `**<@${applicantId}>**`, inline: true },
      { name: "🎮 يوزر روبلوكس", value: `**${request.robloxUsername}**`, inline: true },
      { name: "🧑‍⚖️ تمت المراجعة بواسطة", value: `**<@${reviewerId}>**`, inline: true },
      { name: "🛡️ الحالة", value: `**تم إعطاء رتبة التفعيل <@&${ACTIVATION_ROLE_ID}> بنجاح.**`, inline: false }
    )
    .setFooter({ text: "AW , ARAB WORLD • Activation Accepted" })
    .setTimestamp();

  if (avatarUrl) {
    embed.setThumbnail(avatarUrl);
  }

  return embed;
}

function buildActivationRejectedEmbed({ reviewerId, applicantId, request, avatarUrl = "" }) {
  const embed = new EmbedBuilder()
    .setColor(0xb42318)
    .setTitle("⛔ تم رفض طلب التفعيل")
    .setDescription("**تمت مراجعة الطلب ورفضه، ولن يتم منح أي رتبة لهذا الطلب.**")
    .addFields(
      { name: "👤 المواطن", value: `**<@${applicantId}>**`, inline: true },
      { name: "🎮 يوزر روبلوكس", value: `**${request.robloxUsername}**`, inline: true },
      { name: "🧑‍⚖️ تمت المراجعة بواسطة", value: `**<@${reviewerId}>**`, inline: true },
      { name: "📘 تنبيه", value: `**يمكنك إعادة المحاولة لاحقًا بعد مراجعة القوانين: [قوانين السيرفر](${ACTIVATION_RULES_URL})**`, inline: false }
    )
    .setFooter({ text: "AW , ARAB WORLD • Activation Rejected" })
    .setTimestamp();

  if (avatarUrl) {
    embed.setThumbnail(avatarUrl);
  }

  return embed;
}

function buildActivationAcceptedDmEmbed({ request, reviewerId, avatarUrl = "" }) {
  const embed = new EmbedBuilder()
    .setColor(0x1f8b4c)
    .setTitle("🎉 تم قبولك في عرب وورلد")
    .setDescription("**تم قبول طلب تفعيلك بنجاح، وتم منحك رتبة التفعيل داخل السيرفر.**")
    .addFields(
      { name: "📛 الاسم", value: `**${request.fullName}**`, inline: true },
      { name: "🎮 يوزر روبلوكس", value: `**${request.robloxUsername}**`, inline: true },
      { name: "🧑‍⚖️ تمت المراجعة بواسطة", value: `**<@${reviewerId}>**`, inline: true },
      { name: "📘 التعليمات", value: `**راجع قوانين السيرفر والتزم بها دائمًا: [قوانين السيرفر](${ACTIVATION_RULES_URL})**`, inline: false },
      { name: "⚠️ تنبيهات", value: "**تم تفعيلك الآن، وأي تخريب أو مخالفة قد تعرّضك للعقوبات.**", inline: false }
    )
    .setFooter({ text: "AW , ARAB WORLD • Welcome" })
    .setTimestamp();

  if (avatarUrl) {
    embed.setThumbnail(avatarUrl);
  }

  return embed;
}

function buildActivationRejectedDmEmbed({ request, reviewerId, avatarUrl = "" }) {
  const embed = new EmbedBuilder()
    .setColor(0xb42318)
    .setTitle("📩 تم رفض طلب التفعيل")
    .setDescription("**تم رفض طلب التفعيل الحالي، ولم يتم منحك أي رتبة في الوقت الحالي.**")
    .addFields(
      { name: "📛 الاسم", value: `**${request.fullName}**`, inline: true },
      { name: "🎮 يوزر روبلوكس", value: `**${request.robloxUsername}**`, inline: true },
      { name: "🧑‍⚖️ تمت المراجعة بواسطة", value: `**<@${reviewerId}>**`, inline: true },
      { name: "📘 التعليمات", value: `**راجع قوانين السيرفر وحاول لاحقًا بعد التأكد من صحة البيانات: [قوانين السيرفر](${ACTIVATION_RULES_URL})**`, inline: false }
    )
    .setFooter({ text: "AW , ARAB WORLD • Activation Review" })
    .setTimestamp();

  if (avatarUrl) {
    embed.setThumbnail(avatarUrl);
  }

  return embed;
}

function buildUnpaidFinesSnapshot(targetUserId = null) {
  const fines = (targetUserId
    ? getFinesForUser(targetUserId).filter((fine) => fine.status !== "paid")
    : listAllFines().filter((fine) => fine.status !== "paid"))
    .map((fine) => {
      const fineAccount = fine.targetUserId ? getAccount(fine.targetUserId) : null;
      return {
        ...fine,
        targetName: fineAccount?.name || fine.targetName || "غير معروف"
      };
    });

  return fines;
}

async function buildFinesViewReplyPayload(targetUserId = null) {
  const fines = buildUnpaidFinesSnapshot(targetUserId);
  const member = targetUserId ? await client.users.fetch(targetUserId).catch(() => null) : null;

  if (!fines.length) {
    return {
      content: targetUserId ? "لا توجد مخالفات غير مسددة لهذا الشخص." : "لا توجد مخالفات غير مسددة حاليًا.",
      embeds: [],
      files: []
    };
  }

  const finesCard = await buildFinesCardAttachment(
    fines,
    member?.displayName || member?.username || ""
  );

  return {
    content: "",
    embeds: [
      new EmbedBuilder()
        .setColor(0x23272a)
        .setTitle(targetUserId ? "🚨 عرض مخالفات المواطن" : "🚨 سجل المخالفات غير المسددة")
        .setDescription(targetUserId
          ? `**يعرض هذا التقرير جميع المخالفات غير المسددة الخاصة بـ <@${targetUserId}> بشكل منظم داخل البطاقة.**`
          : "**يعرض هذا التقرير جميع المخالفات غير المسددة الحالية، ويتم حذف أي مخالفة من البطاقة تلقائيًا بعد السداد.**")
        .setImage("attachment://fines-view-card.png")
        .setFooter({ text: "Arab World • سجل المخالفات" })
        .setTimestamp()
    ],
    files: [finesCard]
  };
}

async function refreshActiveFinesViews(changedTargetUserId = null) {
  const entries = [...activeFinesViewMessages.entries()];

  for (const [messageId, view] of entries) {
    if (changedTargetUserId && view.targetUserId && view.targetUserId !== changedTargetUserId) {
      continue;
    }

    const channel = await client.channels.fetch(view.channelId).catch(() => null);
    if (!channel?.isTextBased?.()) {
      activeFinesViewMessages.delete(messageId);
      continue;
    }

    const message = await channel.messages.fetch(messageId).catch(() => null);
    if (!message) {
      activeFinesViewMessages.delete(messageId);
      continue;
    }

    try {
      const payload = await buildFinesViewReplyPayload(view.targetUserId);
      await message.edit(payload);
    } catch (error) {
      console.error("Failed to refresh fines view:", error);
    }
  }
}

function buildBankAccountAuditField(account, label = "🏦 **اسم الحساب البنكي**") {
  return {
    name: label,
    value: `**${account?.name || "غير مسجل"}**`,
    inline: true
  };
}

function normalizeRobberyTypeInput(value) {
  const raw = String(value || "").trim().toLowerCase();
  if (!raw) {
    return "";
  }

  const compact = raw
    .replace(/[\s-]+/g, "_")
    .replace(/[^a-z0-9_]/g, "");

  if (ROBBERY_REWARDS[compact]) {
    return compact;
  }

  if (compact.includes("atm") || compact.includes("saraf") || compact.includes("alsaraf")) {
    return compact.includes("alsaraf") || compact.includes("saraf")
      ? "alsaraf"
      : "atm";
  }

  if (
    compact.includes("cash") ||
    compact.includes("register") ||
    compact.includes("store") ||
    compact.includes("shop") ||
    compact.includes("gas") ||
    compact.includes("clerk") ||
    compact.includes("supermarket") ||
    compact.includes("market") ||
    compact.includes("grocery") ||
    compact.includes("bodega") ||
    compact.includes("convenience") ||
    compact.includes("cashier")
  ) {
    if (compact.includes("register")) {
      return "cash_register";
    }

    if (compact.includes("gas")) {
      return "gas_station";
    }

    if (compact.includes("shop")) {
      return "shop";
    }

    if (compact.includes("clerk")) {
      return "clerk";
    }

    if (compact.includes("cashier")) {
      return "cash_register";
    }

    return "store";
  }

  return compact;
}

function getRobberyDisplayLabel(robberyType) {
  const normalized = normalizeRobberyTypeInput(robberyType);
  const labels = {
    atm: "سرقة صراف آلي",
    alsaraf: "سرقة صراف",
    store: "سرقة بقالة",
    cash_register: "سرقة كاش ريجستر",
    register: "سرقة كاش ريجستر",
    shop: "سرقة متجر",
    gas_station: "سرقة محطة",
    clerk: "سرقة كاشير"
  };

  return labels[normalized] || robberyType || "سرقة غير معروفة";
}

function buildRobberySuccessDmEmbed({ robberyType, reward, afterBalance, robloxUsername }) {
  return new EmbedBuilder()
    .setColor(0x1f6b45)
    .setTitle("💰 **سرقة ناجحة**")
    .setDescription("**تمت العملية بنجاح وتم تحويل المبلغ إلى حسابك البنكي مباشرة.**")
    .addFields(
      { name: "🧾 **نوع السرقة**", value: `**${getRobberyDisplayLabel(robberyType)}**`, inline: true },
      { name: "💵 **المبلغ المحول**", value: `**${formatCurrency(reward)}**`, inline: true },
      { name: "💳 **رصيدك الحالي**", value: `**${formatCurrency(afterBalance)}**`, inline: true },
      { name: "🎮 **يوزر روبلوكس**", value: `**${robloxUsername || "غير معروف"}**`, inline: true }
    )
    .setFooter({ text: "Arab World • مكافأة السرقة" })
    .setTimestamp();
}

function buildRobberyFailureDmEmbed({ robberyType, robloxUsername, location = "" }) {
  return new EmbedBuilder()
    .setColor(0x8d1111)
    .setTitle("🚨 **سرقة فاشلة**")
    .setDescription("**تم تسجيل محاولة سرقة فاشلة، ولم يتم تحويل أي مبلغ إلى حسابك البنكي.**")
    .addFields(
      { name: "🧾 **نوع السرقة**", value: `**${getRobberyDisplayLabel(robberyType)}**`, inline: true },
      { name: "🎮 **يوزر روبلوكس**", value: `**${robloxUsername || "غير معروف"}**`, inline: true },
      { name: "📌 **النتيجة**", value: "**لم يتم تحويل أي مكافأة**", inline: true },
      ...(location ? [{ name: "📍 **الموقع**", value: `**${location}**`, inline: false }] : [])
    )
    .setFooter({ text: "Arab World • تنبيه السرقة" })
    .setTimestamp();
}

function buildWebsiteCarPurchaseDmEmbed({ account, vehicleName, price, beforeBalance, afterBalance }) {
  return new EmbedBuilder()
    .setColor(0x1f6b45)
    .setTitle("🚗 تم شراء مركبة من الموقع")
    .setDescription("**تمت عملية شراء المركبة بنجاح عبر معرض السيارات المرتبط بحسابك البنكي.**")
    .addFields(
      { name: "👤 **اسم صاحب الحساب**", value: `**${account?.name || "غير معروف"}**`, inline: true },
      { name: "🏦 **رقم الحساب**", value: `**${account?.accountNumber || "غير معروف"}**`, inline: true },
      { name: "🚘 **اسم المركبة**", value: `**${vehicleName || "غير معروف"}**`, inline: false },
      { name: "💵 **سعر المركبة**", value: `**${formatCurrency(price)}**`, inline: true },
      { name: "💳 **الرصيد قبل الشراء**", value: `**${formatCurrency(beforeBalance)}**`, inline: true },
      { name: "💳 **الرصيد بعد الشراء**", value: `**${formatCurrency(afterBalance)}**`, inline: true }
    )
    .setFooter({ text: "Arab World • شراء مركبة من الموقع" })
    .setTimestamp();
}

function buildWebsiteInsufficientFundsDmEmbed({ account, vehicleName, price }) {
  return new EmbedBuilder()
    .setColor(0x8d1111)
    .setTitle("❌ تعذر شراء المركبة من الموقع")
    .setDescription("**محاولة شراء مركبة من الموقع لم تكتمل لأن رصيدك البنكي لا يكفي.**")
    .addFields(
      { name: "🚘 **اسم المركبة**", value: `**${vehicleName || "غير معروف"}**`, inline: false },
      { name: "💵 **السعر المطلوب**", value: `**${formatCurrency(price)}**`, inline: true },
      { name: "💳 **رصيدك الحالي**", value: `**${formatCurrency(account?.balance || 0)}**`, inline: true },
      { name: "🏦 **رقم الحساب**", value: `**${account?.accountNumber || "غير معروف"}**`, inline: true }
    )
    .setFooter({ text: "Arab World • شراء مركبة من الموقع" })
    .setTimestamp();
}

async function findGuildMemberForWebsiteAccess(discordUserId) {
  const guild = client.guilds.cache.get(config.guildId)
    || await client.guilds.fetch(config.guildId).catch(() => null);
  if (!guild || !discordUserId) {
    return null;
  }

  const cachedMember = guild.members.cache.get(discordUserId);
  if (cachedMember) {
    return cachedMember;
  }

  return guild.members.fetch(discordUserId).catch(() => null);
}

async function processWebsiteBankTransfer({
  senderAccount,
  targetAccount,
  amount,
  sourceLabel = "website_transfer"
}) {
  const numericAmount = Number(amount);
  if (!Number.isFinite(numericAmount) || numericAmount <= 0) {
    return { ok: false, error: "invalid_amount" };
  }

  if (!senderAccount || !targetAccount) {
    return { ok: false, error: "account_not_found" };
  }

  const transferPolicy = await getAccountTransferPolicy(senderAccount.discordUserId);
  if (Number.isFinite(transferPolicy.limit) && numericAmount > transferPolicy.limit) {
    return {
      ok: false,
      error: "transfer_limit_exceeded",
      limit: transferPolicy.limit,
      cardLabel: transferPolicy.label
    };
  }

  if (senderAccount.discordUserId === targetAccount.discordUserId) {
    return { ok: false, error: "same_account_transfer" };
  }

  if (isAccountBankFrozen(senderAccount) || isAccountBankFrozen(targetAccount)) {
    return { ok: false, error: "account_frozen" };
  }

  if (Number(senderAccount.balance || 0) < numericAmount) {
    return { ok: false, error: "insufficient_balance" };
  }

  const transferCommit = mutateStore((store) => {
    const mutableSender = getMutableAccount(store, senderAccount.discordUserId);
    const mutableTarget = getMutableAccount(store, targetAccount.discordUserId);

    if (!mutableSender || !mutableTarget) {
      return { ok: false, error: "account_not_found" };
    }

    if (isAccountBankFrozen(mutableSender) || isAccountBankFrozen(mutableTarget)) {
      return { ok: false, error: "account_frozen" };
    }

    if (Number(mutableSender.balance || 0) < numericAmount) {
      return { ok: false, error: "insufficient_balance" };
    }

    mutableSender.balance -= numericAmount;
    mutableTarget.balance += numericAmount;

    appendTransactionToStore(store, {
      discordUserId: mutableSender.discordUserId,
      robloxUsername: mutableSender.robloxUsername,
      type: "website_transfer_sent",
      amount: numericAmount,
      direction: "debit",
      balanceAfter: mutableSender.balance,
      metadata: {
        targetUserId: mutableTarget.discordUserId,
        targetAccountNumber: mutableTarget.accountNumber,
        source: sourceLabel
      }
    });

    appendTransactionToStore(store, {
      discordUserId: mutableTarget.discordUserId,
      robloxUsername: mutableTarget.robloxUsername,
      type: "website_transfer_received",
      amount: numericAmount,
      direction: "credit",
      balanceAfter: mutableTarget.balance,
      metadata: {
        sourceUserId: mutableSender.discordUserId,
        sourceAccountNumber: mutableSender.accountNumber,
        source: sourceLabel
      }
    });

    return {
      ok: true,
      senderAfter: structuredClone(mutableSender),
      targetAfter: structuredClone(mutableTarget)
    };
  });

  if (!transferCommit?.ok) {
    return transferCommit ?? { ok: false, error: "transfer_commit_failed" };
  }

  const senderAfter = transferCommit.senderAfter;
  const targetAfter = transferCommit.targetAfter;

  await sendSystemLogs([TRANSFERS_LOG_CHANNEL_ID, WEBSITE_LOG_CHANNEL_ID], {
    title: "🌐 **تحويل بنكي من الموقع**",
    description: "**تم تنفيذ تحويل بنكي عبر الموقع بنجاح.**",
    fields: [
      { name: "👤 **المرسل**", value: `**<@${senderAccount.discordUserId}>**`, inline: true },
      { name: "📥 **المستلم**", value: `**<@${targetAccount.discordUserId}>**`, inline: true },
      buildBankAccountAuditField(senderAfter, "🏦 **حساب المرسل**"),
      buildBankAccountAuditField(targetAfter, "🏦 **حساب المستلم**"),
      { name: "💵 **المبلغ**", value: `**${formatCurrency(numericAmount)}**`, inline: true },
      { name: "💳 **رصيد المرسل بعد**", value: `**${formatCurrency(senderAfter.balance)}**`, inline: true },
      { name: "💳 **رصيد المستلم بعد**", value: `**${formatCurrency(targetAfter.balance)}**`, inline: true }
    ]
  });

  await sendPoliceBankLog({
    title: "🌐 **تحويل بنكي عبر الموقع**",
    description: "**تم تسجيل تحويل بنكي جديد من تطبيق البنك في الموقع.**",
    fields: [
      { name: "📤 **من**", value: `**<@${senderAccount.discordUserId}>**`, inline: true },
      { name: "📥 **إلى**", value: `**<@${targetAccount.discordUserId}>**`, inline: true },
      { name: "💵 **المبلغ**", value: `**${formatCurrency(numericAmount)}**`, inline: true },
      { name: "🆔 **حساب المرسل**", value: `**${senderAccount.accountNumber}**`, inline: true },
      { name: "🆔 **حساب المستلم**", value: `**${targetAccount.accountNumber}**`, inline: true }
    ]
  });

  const targetUser = await client.users.fetch(targetAccount.discordUserId).catch(() => null);
  await targetUser?.send({
    embeds: [
      buildTransferReceivedDmEmbedPolished({
        senderUser: `<@${senderAccount.discordUserId}>`,
        amount: numericAmount,
        afterBalance: targetAfter.balance
      })
    ]
  }).catch(() => null);

  return {
    ok: true,
    amount: numericAmount,
    senderAccount: senderAfter,
    targetAccount: targetAfter
  };
}

async function sendWebsiteNameChangeRequest(payload) {
  const channel = await client.channels.fetch(WEBSITE_NAME_CHANGE_REQUEST_CHANNEL_ID).catch(() => null);
  if (!channel || !("send" in channel)) {
    return { ok: false, error: "channel_not_found" };
  }

  const embed = new EmbedBuilder()
    .setColor(0x1f8b4c)
    .setTitle("🪪 طلب تغيير الاسم البنكي من الموقع")
    .setDescription("**تم إرسال طلب جديد من تطبيق توكلنا ويحتاج مراجعة الإدارة.**")
    .addFields(
      { name: "👤 الاسم القديم", value: `**${payload.oldName || "غير مذكور"}**`, inline: true },
      { name: "🆕 الاسم الجديد", value: `**${payload.newName || "غير مذكور"}**`, inline: true },
      { name: "🎂 العمر", value: `**${payload.age || "غير مذكور"}**`, inline: true },
      { name: "📍 من أين", value: `**${payload.origin || "غير مذكور"}**`, inline: true },
      { name: "🏦 اسم الحساب", value: `**${payload.accountName || "غير معروف"}**`, inline: true },
      { name: "💳 الرقم البنكي", value: `**${payload.bankAccountId || "غير معروف"}**`, inline: true },
      { name: "🎮 يوزر روبلوكس", value: `**${payload.robloxUsername || "غير مذكور"}**`, inline: true },
      { name: "💬 يوزر الدسكورد", value: `**${payload.discordUsername || "غير مذكور"}**`, inline: true },
      { name: "🆔 Discord User ID", value: `**${payload.discordUserId || "غير معروف"}**`, inline: true }
    )
    .setFooter({ text: "Arab World • توكلنا" })
    .setTimestamp();

  await channel.send({ embeds: [embed] }).catch(() => null);
  return { ok: true };
}

async function processWebsiteCarPurchase({
  account,
  vehicleName,
  requestedPrice = null,
  sourceLabel = "website_purchase"
}) {
  const cleanVehicleName = resolveCanonicalVehicleName(vehicleName);
  if (!cleanVehicleName) {
    return { ok: false, error: "missing_vehicle_name" };
  }

  if (isAccountBankFrozen(account)) {
    return { ok: false, error: "account_frozen" };
  }

  if (userOwnsVehicle(account.discordUserId, cleanVehicleName)) {
    return { ok: false, error: "vehicle_already_owned" };
  }

  registerVehicleName(cleanVehicleName);
  invalidateVehicleCatalogCache();
  const offer = getVehicleOffer(cleanVehicleName);
  const catalogPrice = offer.isFree ? 0 : Number(offer.price || 0);
  const fallbackRequestedPrice = Number.isFinite(Number(requestedPrice)) && Number(requestedPrice) >= 0
    ? Number(requestedPrice)
    : null;
  const finalPrice = Number.isFinite(catalogPrice) && catalogPrice >= 0
    ? catalogPrice
    : (fallbackRequestedPrice ?? 0);

  if (finalPrice < 0) {
    return { ok: false, error: "invalid_price" };
  }

  if (Number(account.balance || 0) < finalPrice) {
    await client.users.fetch(account.discordUserId)
      .then((user) => user.send({ embeds: [buildWebsiteInsufficientFundsDmEmbed({ account, vehicleName: cleanVehicleName, price: finalPrice })] }).catch(() => null))
      .catch(() => null);

    return { ok: false, error: "insufficient_balance", price: finalPrice, account: getAccount(account.discordUserId) };
  }

  const beforeBalance = Number(account.balance || 0);
  const vehicleToStore = offer.name || cleanVehicleName;
  if (finalPrice > 0) {
    const debitedAccount = updateAccount(account.discordUserId, (current) => {
      if (Number(current.balance || 0) < finalPrice) {
        return current;
      }

      current.balance -= finalPrice;
      return current;
    });

    if (!debitedAccount) {
      return { ok: false, error: "account_not_found" };
    }

    if (Number(debitedAccount.balance || 0) > beforeBalance) {
      return { ok: false, error: "vehicle_store_failed" };
    }
  }

  const ownedVehicle = addOwnedVehicle(account.discordUserId, vehicleToStore, {
    purchasePrice: finalPrice,
    grantedBy: account.discordUserId,
    source: "purchase"
  });

  const afterAccount = getAccount(account.discordUserId);
  const vehicleStoredSuccessfully = Boolean(ownedVehicle) && Boolean(
    afterAccount?.discordUserId
      ? userOwnsVehicle(afterAccount.discordUserId, vehicleToStore)
      : false
  );

  if (!afterAccount || !vehicleStoredSuccessfully) {
    console.error("[WEBSITE BUY CAR STORE FAILED]", JSON.stringify({
      discordUserId: account.discordUserId,
      requestedVehicleName: vehicleName,
      cleanVehicleName,
      vehicleToStore,
      updatedBalanceAfterDebit: Number(afterAccount?.balance || 0),
      storedVehicleName: ownedVehicle?.name || "",
      afterAccountHasVehicle: afterAccount?.discordUserId ? userOwnsVehicle(afterAccount.discordUserId, vehicleToStore) : false
    }));
    return { ok: false, error: "vehicle_store_failed" };
  }

  appendTransaction({
    discordUserId: account.discordUserId,
    robloxUsername: afterAccount.robloxUsername,
    type: "vehicle_purchase",
    amount: finalPrice,
    direction: offer.isFree ? "none" : "debit",
    balanceAfter: afterAccount.balance,
    metadata: {
      vehicleName: vehicleToStore,
      isFree: offer.isFree,
      source: sourceLabel
    }
  });

  void sendSystemLogs([CARS_LOG_CHANNEL_ID, WEBSITE_LOG_CHANNEL_ID], {
    title: "🌐 **شراء مركبة من الموقع**",
    description: "**تم شراء مركبة عبر الموقع وخصم قيمتها من الرصيد البنكي بنجاح.**",
    fields: [
      { name: "👤 **صاحب الحساب**", value: `**<@${account.discordUserId}>**`, inline: true },
      buildBankAccountAuditField(afterAccount),
      { name: "🎮 **يوزر روبلوكس**", value: `**${afterAccount.robloxUsername || "غير معروف"}**`, inline: true },
      { name: "🚘 **المركبة**", value: `**${vehicleToStore}**`, inline: true },
      { name: "💵 **السعر**", value: `**${formatCurrency(finalPrice)}**`, inline: true },
      { name: "💳 **الرصيد قبل**", value: `**${formatCurrency(beforeBalance)}**`, inline: true },
      { name: "💳 **الرصيد بعد**", value: `**${formatCurrency(afterAccount.balance)}**`, inline: true }
    ]
  }).catch(() => null);

  await client.users.fetch(account.discordUserId)
    .then((user) => user.send({ embeds: [buildWebsiteCarPurchaseDmEmbed({
      account: afterAccount,
      vehicleName: vehicleToStore,
      price: finalPrice,
      beforeBalance,
      afterBalance: afterAccount.balance
    })] }).catch(() => null))
    .catch(() => null);

  return {
    ok: true,
    price: finalPrice,
    vehicleName: vehicleToStore,
    account: afterAccount
  };
}

async function processWebsiteCarSale({
  account,
  vehicleName,
  requestedAmount = null,
  sourceLabel = "website_sale"
}) {
  const cleanVehicleName = resolveCanonicalVehicleName(vehicleName);
  if (!cleanVehicleName) {
    return { ok: false, error: "missing_vehicle_name" };
  }

  if (isAccountBankFrozen(account)) {
    return { ok: false, error: "account_frozen" };
  }

  const ownedCars = listOwnedVehicles(account.discordUserId);
  const carRecord = ownedCars.find((car) => normalizeVehicleName(car.name) === normalizeVehicleName(cleanVehicleName));
  if (!carRecord) {
    return { ok: false, error: "vehicle_not_owned" };
  }

  if (String(carRecord.source || "") === "rental") {
    return { ok: false, error: "rental_vehicle_cannot_be_sold" };
  }

  const latestOffer = getVehicleOffer(carRecord.name);
  const saleBasePrice = latestOffer.price > 0
    ? Number(latestOffer.price || 0)
    : Number(carRecord.purchasePrice || 0);
  const refundAmount = Math.floor(Math.max(0, saleBasePrice) * 0.5);

  if (refundAmount < 0) {
    return { ok: false, error: "invalid_price" };
  }

  const beforeBalance = Number(account.balance || 0);
  const saleCommit = mutateStore((store) => {
    const current = getMutableAccount(store, account.discordUserId);
    if (!current) {
      return { ok: false, error: "account_not_found" };
    }

    current.cars ??= {};
    delete current.cars[normalizeVehicleName(carRecord.name)];
    current.balance += refundAmount;

    appendTransactionToStore(store, {
      discordUserId: account.discordUserId,
      robloxUsername: current.robloxUsername,
      type: "website_vehicle_sale",
      amount: refundAmount,
      direction: refundAmount > 0 ? "credit" : "none",
      balanceAfter: current.balance,
      metadata: {
        vehicleName: carRecord.name,
        source: sourceLabel
      }
    });

    return {
      ok: true,
      afterAccount: structuredClone(current)
    };
  });

  const afterAccount = saleCommit?.afterAccount ?? null;
  if (!saleCommit?.ok || !afterAccount) {
    return saleCommit?.ok === false ? saleCommit : { ok: false, error: "account_not_found" };
  }

  await sendSystemLogs([CARS_LOG_CHANNEL_ID, WEBSITE_LOG_CHANNEL_ID], {
    title: "🌐 **بيع مركبة من الموقع**",
    description: "**تم بيع مركبة عبر الموقع وإرجاع 50% من قيمتها إلى الحساب البنكي بنجاح.**",
    fields: [
      { name: "👤 **صاحب الحساب**", value: `**<@${account.discordUserId}>**`, inline: true },
      buildBankAccountAuditField(afterAccount),
      { name: "🎮 **يوزر روبلوكس**", value: `**${afterAccount.robloxUsername || "غير معروف"}**`, inline: true },
      { name: "🚘 **المركبة**", value: `**${carRecord.name}**`, inline: true },
      { name: "💵 **المبلغ المسترد**", value: `**${formatCurrency(refundAmount)}**`, inline: true },
      { name: "💳 **الرصيد قبل**", value: `**${formatCurrency(beforeBalance)}**`, inline: true },
      { name: "💳 **الرصيد بعد**", value: `**${formatCurrency(afterAccount.balance)}**`, inline: true }
    ]
  });

  await client.users.fetch(account.discordUserId)
    .then((user) => user.send({
      embeds: [
        new EmbedBuilder()
          .setColor(0x0b1f3a)
          .setTitle("💸 تم بيع مركبة من الموقع")
          .setDescription("**تمت إزالة المركبة من ممتلكاتك وتحويل نصف قيمتها إلى رصيدك البنكي.**")
          .addFields(
            { name: "🚘 المركبة", value: `**${carRecord.name}**`, inline: true },
            { name: "💵 المبلغ المسترد", value: `**${formatCurrency(refundAmount)}**`, inline: true },
            { name: "💳 الرصيد بعد البيع", value: `**${formatCurrency(afterAccount.balance)}**`, inline: true }
          )
          .setFooter({ text: "Arab World Showroom • Vehicle Sale" })
          .setTimestamp()
      ]
    }).catch(() => null))
    .catch(() => null);

  return {
    ok: true,
    price: refundAmount,
    vehicleName: carRecord.name,
    account: afterAccount
  };
}

async function processRobberyReward({
  robloxUsername,
  robberyType,
  sourceLabel,
  location = "",
  forceSuccess = true
}) {
  const normalizedType = normalizeRobberyTypeInput(robberyType);
  const reward = ROBBERY_REWARDS[normalizedType];
  const account = findAccountByRobloxUsername(robloxUsername);

  if (!forceSuccess) {
    await sendRobberyAttemptLogs({
      robloxUsername,
      robberyType: normalizedType,
      success: false,
      account,
      location,
      sourceLabel,
      reason: account ? "" : "لا يوجد حساب بنكي مربوط بهذا اليوزر"
    });

    if (account?.discordUserId) {
      await client.users.fetch(account.discordUserId).then((user) => user.send({
        embeds: [
          buildRobberyFailureDmEmbed({
            robberyType: normalizedType,
            robloxUsername,
            location
          })
        ]
      }).catch(() => null)).catch(() => null);
    }

    return { ok: true, success: false, robberyType: normalizedType };
  }

  if (!reward) {
    await sendRobberyAttemptLogs({
      robloxUsername,
      robberyType: normalizedType,
      success: true,
      account,
      location,
      sourceLabel,
      reason: "نوع السرقة غير مدعوم داخل المكافآت الحالية"
    });
    return { ok: false, error: "unsupported_robbery_type" };
  }

  if (!account) {
    await sendRobberyAttemptLogs({
      robloxUsername,
      robberyType: normalizedType,
      success: true,
      reward,
      location,
      sourceLabel,
      reason: "نجحت السرقة لكن لا يوجد حساب بنكي مربوط بهذا اليوزر"
    });
    return { ok: false, error: "account_not_found" };
  }

  const updated = updateAccount(account.discordUserId, (current) => {
    current.balance += reward;
    return current;
  });

  appendTransaction({
    discordUserId: account.discordUserId,
    robloxUsername,
    type: "robbery_reward",
    amount: reward,
    direction: "credit",
    balanceAfter: updated.balance,
    metadata: {
      robberyType: normalizedType,
      source: sourceLabel,
      location
    }
  });

  await sendRobberyAttemptLogs({
    robloxUsername,
    robberyType: normalizedType,
    success: true,
    reward,
    account,
    updatedAccount: updated,
    location,
    sourceLabel
  });

  await client.users.fetch(account.discordUserId).then((user) => user.send({
    embeds: [
      buildRobberySuccessDmEmbed({
        robberyType: normalizedType,
        reward,
        afterBalance: updated.balance,
        robloxUsername
      })
    ]
  }).catch(() => null)).catch(() => null);

  return {
    ok: true,
    success: true,
    robberyType: normalizedType,
    reward,
    balance: updated.balance,
    account,
    updated
  };
}

async function pollEmergencyCallsForRobberies() {
  const calls = await fetchEmergencyCalls();

  for (const call of calls) {
    const parsed = extractRobberyTypeAndUsernameFromCall(call);
    if (!parsed?.robloxUsername || !parsed.robberyType) {
      continue;
    }

    const uniqueCallId = `${call.CallNumber ?? call.callNumber ?? "unknown"}|${call.StartedAt ?? call.startedAt ?? "unknown"}|${parsed.robloxUsername}|${parsed.robberyType}`;
    if (processedRobberyCallIds.has(uniqueCallId)) {
      continue;
    }

    processedRobberyCallIds.add(uniqueCallId);
    if (processedRobberyCallIds.size > 1000) {
      const oldest = processedRobberyCallIds.values().next().value;
      processedRobberyCallIds.delete(oldest);
    }

    await processRobberyReward({
      robloxUsername: parsed.robloxUsername,
      robberyType: parsed.robberyType,
      sourceLabel: "emergency_call",
      location: parsed.location || parsed.description || "",
      forceSuccess: true
    });
  }
}

async function grantPendingRecentRobberyRewards({
  actorId,
  windowMs = 24 * 60 * 60 * 1000,
  sourceLabel = "manual_recent_robbery_grant"
}) {
  const now = Date.now();
  const recentTransactions = listAllTransactions().filter((entry) => {
    if (entry?.type !== "robbery_reward") {
      return false;
    }

    const createdAt = new Date(entry.createdAt).getTime();
    return Number.isFinite(createdAt) && now - createdAt <= windowMs;
  });

  const alreadyCompensatedIds = new Set(
    listAllTransactions()
      .filter((entry) => entry?.type === "robbery_reward_manual_grant")
      .map((entry) => String(entry?.metadata?.originalTransactionId || ""))
      .filter(Boolean)
  );

  const eligibleTransactions = recentTransactions.filter((entry) => !alreadyCompensatedIds.has(String(entry.id)));
  const results = [];

  for (const transaction of eligibleTransactions) {
    const discordUserId = String(transaction.discordUserId || "").trim();
    const rewardAmount = Number(transaction.amount || 0);
    if (!discordUserId || !Number.isFinite(rewardAmount) || rewardAmount <= 0) {
      continue;
    }

    const currentAccount = getAccount(discordUserId);
    if (!currentAccount) {
      results.push({
        status: "missing_account",
        transaction,
        reward: rewardAmount
      });
      continue;
    }

    const updatedAccount = updateAccount(discordUserId, (current) => {
      current.balance += rewardAmount;
      return current;
    });

    appendTransaction({
      discordUserId,
      robloxUsername: updatedAccount.robloxUsername,
      type: "robbery_reward_manual_grant",
      amount: rewardAmount,
      direction: "credit",
      balanceAfter: updatedAccount.balance,
      metadata: {
        originalTransactionId: transaction.id,
        originalCreatedAt: transaction.createdAt,
        robberyType: transaction.metadata?.robberyType || "",
        originalSource: transaction.metadata?.source || "",
        source: sourceLabel,
        actorId
      }
    });

    await client.users.fetch(discordUserId).then((user) => user.send({
      embeds: [
        new EmbedBuilder()
          .setColor(0x1f6b45)
          .setTitle("💸 تحويل مكافأة سرقة متأخرة")
          .setDescription("**تم تحويل مكافأة سرقة ناجحة لك يدويًا بعد مراجعة السجل.**")
          .addFields(
            { name: "🧾 نوع السرقة", value: `**${getRobberyDisplayLabel(transaction.metadata?.robberyType || "")}**`, inline: true },
            { name: "💵 المبلغ المحول", value: `**${formatCurrency(rewardAmount)}**`, inline: true },
            { name: "💳 رصيدك الحالي", value: `**${formatCurrency(updatedAccount.balance)}**`, inline: true }
          )
          .setFooter({ text: "Arab World • تعويض سرقة" })
          .setTimestamp()
      ]
    }).catch(() => null)).catch(() => null);

    results.push({
      status: "granted",
      transaction,
      reward: rewardAmount,
      account: updatedAccount
    });
  }

  return results;
}

function extractRobberyEventPayload(body = {}) {
  const payload = body?.data && typeof body.data === "object"
    ? body.data
    : body?.payload && typeof body.payload === "object"
      ? body.payload
      : body?.eventData && typeof body.eventData === "object"
        ? body.eventData
        : body;

  const robloxUsername = firstString(
    payload.robloxUsername,
    payload.robloxUser,
    payload.roblox_name,
    payload.username,
    payload.user,
    payload.userName,
    payload.player,
    payload.playerName,
    payload.Player,
    payload.PlayerName,
    payload.ownerUsername
  );

  const robberyType = firstString(
    payload.robberyType,
    payload.type,
    payload.eventType,
    payload.name,
    payload.Name,
    payload.robbery,
    payload.location,
    payload.target,
    payload.storeType,
    payload.registerType,
    payload.place
  );

  const successRaw =
    payload.success ??
    payload.succeeded ??
    payload.isSuccess ??
    payload.completed ??
    payload.isCompleted ??
    payload.result ??
    payload.status;

  const normalizedSuccess = typeof successRaw === "boolean"
    ? successRaw
    : String(successRaw || "").trim().toLowerCase();

  const success = typeof normalizedSuccess === "boolean"
    ? normalizedSuccess
    : normalizedSuccess
      ? !["false", "failed", "failure", "unsuccessful", "cancelled", "canceled", "denied"].includes(normalizedSuccess)
      : true;

  return {
    robloxUsername,
    robberyType,
    success
  };
}

function extractRobberyTypeAndUsernameFromCall(call = {}) {
  const description = firstString(call.Description, call.description, call.Message, call.message);
  const location = firstString(call.PositionDescriptor, call.positionDescriptor, call.Location, call.location);
  const combined = `${description} ${location}`.trim();
  const lower = combined.toLowerCase();

  const robberyPatterns = [
    { key: "atm", regex: /atm robbery(?: in progress)?(?: at [a-z0-9_\-\s]+)? by ([a-z0-9_]+)/i },
    { key: "store", regex: /store robbery(?: in progress)?(?: at [a-z0-9_\-\s]+)? by ([a-z0-9_]+)/i },
    { key: "cash_register", regex: /cash register robbery(?: in progress)?(?: at [a-z0-9_\-\s]+)? by ([a-z0-9_]+)/i },
    { key: "gas_station", regex: /gas station robbery(?: in progress)?(?: at [a-z0-9_\-\s]+)? by ([a-z0-9_]+)/i },
    { key: "shop", regex: /shop robbery(?: in progress)?(?: at [a-z0-9_\-\s]+)? by ([a-z0-9_]+)/i },
    { key: "clerk", regex: /clerk robbery(?: in progress)?(?: at [a-z0-9_\-\s]+)? by ([a-z0-9_]+)/i }
  ];

  for (const pattern of robberyPatterns) {
    const match = description.match(pattern.regex);
    if (match?.[1]) {
      return {
        robberyType: pattern.key,
        robloxUsername: match[1].trim(),
        description,
        location
      };
    }
  }

  if (!lower.includes("robbery")) {
    return null;
  }

  const usernameMatch = combined.match(/\bby\s+([a-z0-9_]+)/i);
  return {
    robberyType: normalizeRobberyTypeInput(description || location),
    robloxUsername: usernameMatch?.[1]?.trim() || "",
    description,
    location
  };
}

function resourceRequirementsText() {
  return Object.entries(M9_REQUIREMENTS.resources)
    .filter(([, amount]) => Number(amount) > 0)
    .map(([key, amount]) => `**${RESOURCE_CATALOG[key].label}: ${amount}**`)
    .join("\n");
}

function getCraftingWeaponsForLevel(levelKey) {
  return Object.values(CRAFTABLE_WEAPONS).filter((weapon) => {
    const allowedLevels = Array.isArray(weapon.levels) ? weapon.levels : ["level1"];
    return allowedLevels.includes(levelKey);
  });
}

function extractWeaponEventPayload(body = {}) {
  const robloxUsername = body.robloxUsername
    || body.robloxUser
    || body.username
    || body.user
    || body.player
    || body.playerName;

  const weaponCode = body.weaponCode
    || body.weapon
    || body.item
    || body.itemName
    || body.tool
    || "M9";

  return {
    robloxUsername: String(robloxUsername || "").trim(),
    weaponCode: String(weaponCode || "").trim().toUpperCase()
  };
}

function extractWebhookEventPayload(body = {}) {
  if (body?.data && typeof body.data === "object") {
    return body.data;
  }
  if (body?.payload && typeof body.payload === "object") {
    return body.payload;
  }
  if (body?.eventData && typeof body.eventData === "object") {
    return body.eventData;
  }
  return body;
}

function collectWebhookTextParts(value, bucket = []) {
  if (value == null) {
    return bucket;
  }

  if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") {
    bucket.push(String(value));
    return bucket;
  }

  if (Array.isArray(value)) {
    for (const entry of value) {
      collectWebhookTextParts(entry, bucket);
    }
    return bucket;
  }

  if (typeof value === "object") {
    for (const [key, entry] of Object.entries(value)) {
      bucket.push(String(key));
      collectWebhookTextParts(entry, bucket);
    }
  }

  return bucket;
}

function buildWebhookTextBlob(payload = {}) {
  return collectWebhookTextParts(payload, []).join(" ").toLowerCase();
}

function extractWebhookRobloxUsername(payload = {}) {
  return extractRobloxName(firstString(
    payload.robloxUsername,
    payload.robloxUser,
    payload.username,
    payload.user,
    payload.userName,
    payload.player,
    payload.playerName,
    payload.Player,
    payload.PlayerName,
    payload.owner,
    payload.Owner,
    payload.caller,
    payload.Caller,
    payload.by,
    payload.By
  ));
}

function buildWebhookEventFingerprint(payload = {}) {
  const normalized = JSON.stringify(payload ?? {});
  return createHash("sha1").update(normalized).digest("hex");
}

function rememberWebhookEventFingerprint(fingerprint) {
  const now = Date.now();
  processedErlcWebhookEventIds.set(fingerprint, now);

  for (const [key, timestamp] of processedErlcWebhookEventIds.entries()) {
    if (now - timestamp > 10 * 60 * 1000) {
      processedErlcWebhookEventIds.delete(key);
    }
  }
}

function hasProcessedWebhookEventFingerprint(fingerprint) {
  const timestamp = processedErlcWebhookEventIds.get(fingerprint) || 0;
  return Date.now() - timestamp <= 10 * 60 * 1000;
}

function payloadLooksLikeWeaponEvent(payload = {}, textBlob = "") {
  const normalizedWeapon = normalizeWeaponCode(
    payload.weaponCode || payload.weapon || payload.item || payload.itemName || payload.tool || ""
  );

  if (!normalizedWeapon) {
    return false;
  }

  return /weapon|gun|firearm|equip|equipped|draw|drawn|pulled|purchase|purchased|bought|boughtweapon|loadout/i.test(textBlob);
}

function payloadLooksLikeTrafficSignalViolation(payload = {}, textBlob = "") {
  if (typeof payload.redLightCount === "number" || typeof payload.signalViolationCount === "number" || typeof payload.violations === "number") {
    return true;
  }

  return /redlight|red light|signal violation|traffic signal|ran a red light|cut signal|قطع اشاره|قطع اشارة/i.test(textBlob);
}

function extractTrafficSignalViolationCount(payload = {}, textBlob = "") {
  const numericValue = Number(
    payload.redLightCount ??
    payload.signalViolationCount ??
    payload.violations ??
    payload.count ??
    payload.total
  );

  if (Number.isFinite(numericValue) && numericValue > 0) {
    return numericValue;
  }

  const matched = textBlob.match(/(?:count|violations?|red ?lights?)\D{0,8}(\d{1,3})/i);
  return matched ? Number(matched[1]) : 1;
}

function normalizeWeaponCode(value) {
  const normalized = String(value || "")
    .trim()
    .toUpperCase()
    .replace(/[_-]+/g, " ")
    .replace(/\s+/g, " ");

  if (!normalized) {
    return "";
  }

  if (normalized === "M9" || normalized.includes("M9")) {
    return "M9";
  }

  if (normalized === "COLT" || normalized.includes("COLT")) {
    return "COLT";
  }

  return normalized;
}

function normalizeKillLogWeapon(value) {
  const normalized = normalizeWeaponCode(value);
  if (normalized.includes("M9")) {
    return "M9";
  }
  if (normalized.includes("COLT")) {
    return "COLT";
  }
  return normalized;
}

function firstString(...values) {
  for (const value of values) {
    if (typeof value === "string" && value.trim()) {
      return value.trim();
    }
  }

  return "";
}

function isIgnorableInteractionError(error) {
  return error?.code === 10062 || error?.code === 40060;
}

async function safelyDeferReply(interaction, options = {}) {
  try {
    await interaction.deferReply(options);
    return true;
  } catch (error) {
    if (isIgnorableInteractionError(error)) {
      return false;
    }
    throw error;
  }
}

async function safelyShowModal(interaction, modal) {
  try {
    await interaction.showModal(modal);
    return true;
  } catch (error) {
    if (isIgnorableInteractionError(error)) {
      return false;
    }
    throw error;
  }
}

async function safelyDeferUpdate(interaction) {
  try {
    await interaction.deferUpdate();
    return true;
  } catch (error) {
    if (isIgnorableInteractionError(error)) {
      return false;
    }
    throw error;
  }
}

async function safelyReply(interaction, payload) {
  try {
    await interaction.reply(payload);
    return true;
  } catch (error) {
    if (isIgnorableInteractionError(error)) {
      return false;
    }
    throw error;
  }
}

async function safelyUpdateInteraction(interaction, payload) {
  try {
    await interaction.update(payload);
    return true;
  } catch (error) {
    if (isIgnorableInteractionError(error)) {
      return false;
    }
    throw error;
  }
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
    value.player,
    value.playerName,
    value.displayName,
    value.weapon,
    value.weaponName,
    value.item,
    value.Killer,
    value.Killed,
    value.Weapon
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

function extractKillLogEntry(entry = {}) {
  const weapon = normalizeKillLogWeapon(firstString(
    entry.weapon,
    entry.weaponName,
    entry.Weapon,
    entry.WeaponName,
    entry.gun,
    entry.firearm,
    entry.tool,
    entry.item,
    entry.killedBy,
    entry.cause,
    extractNestedString(entry.weaponData),
    extractNestedString(entry.killWeapon),
    extractNestedString(entry.weapon),
    extractNestedString(entry.Weapon)
  ));

  const killerUsername = extractRobloxName(firstString(
    entry.killerUsername,
    entry.killer,
    entry.Killer,
    entry.attacker,
    entry.attackerUsername,
    entry.murderer,
    entry.player,
    entry.playerName,
    entry.username,
    entry.user,
    extractNestedString(entry.killerData),
    extractNestedString(entry.attackerData),
    extractNestedString(entry.Killer)
  ));

  const victimUsername = extractRobloxName(firstString(
    entry.victimUsername,
    entry.victim,
    entry.Killed,
    entry.killed,
    entry.target,
    entry.targetUsername,
    extractNestedString(entry.victimData),
    extractNestedString(entry.targetData),
    extractNestedString(entry.Killed)
  ));

  const timestamp = firstString(
    entry.timestamp,
    String(entry.Timestamp || ""),
    entry.time,
    entry.createdAt,
    entry.date
  );

  const id = firstString(
    String(entry.id || ""),
    String(entry.logId || ""),
    String(entry._id || "")
  ) || `${timestamp}|${killerUsername}|${victimUsername}|${weapon}`;

  return {
    id,
    killerUsername,
    victimUsername,
    weapon
  };
}

const processedKillLogIds = new Set();
let hasKillLogWarmupCompleted = !config.erlcKillLogsSkipWarmup;

function rememberProcessedKillLog(id) {
  processedKillLogIds.add(id);
  if (processedKillLogIds.size > 1000) {
    const oldest = processedKillLogIds.values().next().value;
    processedKillLogIds.delete(oldest);
  }
}

function formatWeaponEnforcementReason(reason) {
  if (reason === "police_exempt") {
    return "اللاعب ضمن رتب الشرطة المستثناة من العقوبة";
  }

  if (reason === "police_team_exempt") {
    return "اللاعب داخل تيم الشرطة في الماب وتم تخطي العقوبة";
  }

  if (reason === "custom_role_exempt") {
    return "اللاعب يحمل رتبة مستثناة من عقوبة السلاح";
  }

  if (reason === "role_missing") {
    return "اللاعب موجود لكن لا يملك رتبة السلاح المطلوبة";
  }

  if (reason === "member_not_found") {
    return "تعذر العثور على اللاعب داخل سيرفر الدسكورد";
  }

  return reason || "allowed";
}

async function sendWeaponEnforcementAudit({
  sourceLabel,
  robloxUsername,
  weaponCode = "M9",
  result,
  victimUsername = ""
}) {
  const punished = !result.allowed;

  await sendAuditLog(client, config.auditChannelId, {
    title: punished ? "🚔 **تم تنفيذ عقوبة سلاح**" : "🛡️ **تم السماح باستخدام السلاح**",
    description: punished
      ? "**تم التحقق من اللاعب وثبت أنه غير مخول بحمل السلاح، لذلك تم تنفيذ `:pm` و `:jail` تلقائيًا.**"
      : "**تم التحقق من اللاعب وثبت أنه مخول بحمل السلاح، لذلك لم تُنفذ أي عقوبة.**",
    color: punished ? 0x8d1111 : 0x1f6b45,
    fields: [
      { name: "🎮 **اسم اللاعب**", value: `**${robloxUsername || "غير معروف"}**`, inline: true },
      { name: "🔫 **السلاح**", value: `**${weaponCode}**`, inline: true },
      { name: "📡 **المصدر**", value: `**${sourceLabel}**`, inline: true },
      { name: "👤 **عضو الدسكورد**", value: `**${result.memberId ? `<@${result.memberId}>` : "غير معروف"}**`, inline: true },
      { name: "☠️ **الطرف الآخر**", value: `**${victimUsername || "غير معروف"}**`, inline: true },
      { name: "🧾 **السبب**", value: `**${formatWeaponEnforcementReason(result.reason)}**`, inline: false }
    ]
  });
}

async function runWeaponCheckForDiscordId({ discordId, sourceLabel = "discord_id_api" }) {
  const guild = await client.guilds.fetch(config.guildId);
  const member = await guild.members.fetch(discordId).catch(() => null);

  if (!member) {
    await sendAuditLog(client, config.auditChannelId, {
      title: "🚨 **فحص سلاح عبر Discord ID**",
      description: "**تم طلب فحص سلاح لكن العضو غير موجود داخل السيرفر.**",
      fields: [
        { name: "🆔 **Discord ID**", value: `**${discordId}**`, inline: true },
        { name: "📌 **المصدر**", value: `**${sourceLabel}**`, inline: true },
        { name: "📌 **النتيجة**", value: "**member_not_found**", inline: true }
      ]
    });

    return {
      allowed: false,
      inServer: false,
      hasRole: false,
      reason: "member_not_found"
    };
  }

  const hasRole = member.roles.cache.has(config.m9RoleId);

  await sendAuditLog(client, config.auditChannelId, {
    title: hasRole ? "🛡️ **فحص سلاح عبر Discord ID ناجح**" : "🚨 **فحص سلاح عبر Discord ID مرفوض**",
    description: hasRole
      ? "**تم فحص العضو عبر Discord ID وظهر أنه يملك رتبة السلاح.**"
      : "**تم فحص العضو عبر Discord ID وظهر أنه لا يملك رتبة السلاح المطلوبة.**",
    fields: [
      { name: "👤 **العضو**", value: `**<@${member.id}>**`, inline: true },
      { name: "🆔 **Discord ID**", value: `**${discordId}**`, inline: true },
      { name: "📌 **المصدر**", value: `**${sourceLabel}**`, inline: true }
    ]
  });

  return {
    allowed: hasRole,
    inServer: true,
    hasRole,
    discordId: member.id,
    reason: hasRole ? "role_present" : "role_missing"
  };
}

function getRandomWeaponExpiryDate() {
  const days = 2 + Math.floor(Math.random() * 3);
  return new Date(Date.now() + days * 24 * 60 * 60 * 1000).toISOString();
}

function getRandomWeaponExpiryDurationMs() {
  const days = 2 + Math.floor(Math.random() * 3);
  return days * 24 * 60 * 60 * 1000;
}

function getWeaponInventoryDefinition(weaponKey) {
  return WEAPON_INVENTORY_DEFINITIONS[weaponKey] || {
    key: weaponKey,
    label: String(weaponKey || "").toUpperCase(),
    codePrefix: String(weaponKey || "").toUpperCase(),
    roleId: null
  };
}

function getWeaponBaseLabel(weaponKey) {
  return getWeaponInventoryDefinition(weaponKey).label;
}

function getWeaponDurabilityConfig(weaponKey, entry = {}) {
  if (entry?.permanent) {
    return null;
  }

  if (weaponKey === "tec9" || weaponKey === "colt_python" || weaponKey === "kriss_vector") {
    return {
      killsPerStep: 4,
      qualityLossPerStep: 1
    };
  }

  if (weaponKey === "ak" || weaponKey === "lmt_li29a1") {
    return {
      killsPerStep: 5,
      qualityLossPerStep: 1
    };
  }

  if (weaponKey === "colt") {
    return {
      killsPerStep: 3,
      qualityLossPerStep: 0.25
    };
  }

  if (weaponKey === "m9") {
    return {
      killsPerStep: 3,
      qualityLossPerStep: 0.5
    };
  }

  return null;
}

function computeWeaponQualityPercent(weaponKey, entry = {}) {
  if (entry?.permanent) {
    return 100;
  }

  const config = getWeaponDurabilityConfig(weaponKey, entry);
  if (!config) {
    return 100;
  }

  const killCount = Math.max(0, Number(entry.killCount || 0));
  const explicitQuality = Number(entry.qualityPercent);
  if (Number.isFinite(explicitQuality)) {
    return Math.max(0, Math.min(100, explicitQuality));
  }

  const decaySteps = Math.floor(killCount / config.killsPerStep);
  const quality = 100 - (decaySteps * config.qualityLossPerStep);
  return Math.max(0, Math.min(100, Number(quality.toFixed(2))));
}

function buildWeaponQualityBar(percent = 100) {
  const normalized = Math.max(0, Math.min(100, Number(percent || 0)));
  const filled = Math.max(0, Math.min(10, Math.round(normalized / 10)));
  return `${"█".repeat(filled)}${"░".repeat(10 - filled)}`;
}

function normalizeWeaponInventoryEntry(entry = {}, weaponKey = "m9") {
  const permanent = typeof entry.permanent === "boolean"
    ? entry.permanent
    : !entry.expiresAt;
  const killCount = Math.max(0, Number(entry.killCount || 0));
  const qualityPercent = permanent
    ? 100
    : computeWeaponQualityPercent(weaponKey, {
        ...entry,
        permanent,
        killCount
      });

  return {
    acquiredAt: entry.acquiredAt || entry.purchasedAt || entry.craftedAt || new Date().toISOString(),
    purchasedAt: entry.purchasedAt || entry.acquiredAt || entry.craftedAt || new Date().toISOString(),
    craftedAt: entry.craftedAt || entry.purchasedAt || entry.acquiredAt || new Date().toISOString(),
    expiresAt: entry.expiresAt || null,
    active: entry.active !== false,
    brokenAt: entry.brokenAt || null,
    permanent,
    source: entry.source || "system",
    weaponLabel: entry.weaponLabel || getWeaponBaseLabel(weaponKey),
    killCount,
    qualityPercent,
    durabilityProfile: entry.durabilityProfile || null
  };
}

function getWeaponInventory(account, weaponKey) {
  const raw = account?.weapons?.[weaponKey];
  if (Array.isArray(raw)) {
    return raw.map((entry) => normalizeWeaponInventoryEntry(entry, weaponKey));
  }

  if (raw && typeof raw === "object") {
    return [normalizeWeaponInventoryEntry(raw, weaponKey)];
  }

  return [];
}

function setWeaponInventory(current, weaponKey, entries) {
  current.weapons ??= {};
  const normalizedEntries = entries.map((entry) => normalizeWeaponInventoryEntry(entry, weaponKey));
  if (!normalizedEntries.length) {
    delete current.weapons[weaponKey];
    return;
  }

  current.weapons[weaponKey] = normalizedEntries;
}

function appendWeaponInventory(current, weaponKey, entry) {
  const items = getWeaponInventory(current, weaponKey);
  items.push(normalizeWeaponInventoryEntry(entry, weaponKey));
  setWeaponInventory(current, weaponKey, items);
  return items.length;
}

function hasAnyActiveWeapon(account, weaponKey) {
  return getWeaponInventory(account, weaponKey).some((entry) => entry.active !== false && !entry.brokenAt);
}

function buildWeaponInventoryCode(weaponKey, index) {
  return `${getWeaponInventoryDefinition(weaponKey).codePrefix}-${index}`;
}

function parseWeaponInventoryCode(value) {
  const normalized = String(value || "").trim().toUpperCase();
  const prefixes = Object.values(WEAPON_INVENTORY_DEFINITIONS)
    .map((entry) => String(entry.codePrefix || "").trim().toUpperCase())
    .filter(Boolean)
    .sort((left, right) => right.length - left.length)
    .join("|");
  const matched = normalized.match(new RegExp(`^(${prefixes})-(\\d+)$`));
  if (!matched) {
    return null;
  }

  const matchedDefinition = Object.values(WEAPON_INVENTORY_DEFINITIONS)
    .find((entry) => String(entry.codePrefix || "").trim().toUpperCase() === matched[1]);

  return {
    weaponKey: matchedDefinition?.key || "m9",
    index: Number(matched[2])
  };
}

function getAllWeaponInventoryEntries(account) {
  const entries = [];
  for (const weaponKey of Object.keys(WEAPON_INVENTORY_DEFINITIONS)) {
    const items = getWeaponInventory(account, weaponKey);
    items.forEach((entry, index) => {
      entries.push({
        ...entry,
        weaponKey,
        weaponLabel: getWeaponBaseLabel(weaponKey),
        code: buildWeaponInventoryCode(weaponKey, index + 1),
        index: index + 1
      });
    });
  }
  return entries;
}

function buildWeaponStatusText(entry) {
  if (entry.permanent) {
    return `دائم • ${buildWeaponQualityBar(100)} 100.00%`;
  }

  const qualityPercent = computeWeaponQualityPercent(entry.weaponKey || "m9", entry);
  const qualityText = `${buildWeaponQualityBar(qualityPercent)} ${qualityPercent.toFixed(2)}%`;
  if (entry.expiresAt) {
    return `مؤقت • الجودة ${qualityText} • ينتهي <t:${Math.floor(new Date(entry.expiresAt).getTime() / 1000)}:R>`;
  }

  return `مؤقت • الجودة ${qualityText} • القتلات ${Number(entry.killCount || 0)}`;
}

function buildAccountInfoWeaponLines(account) {
  return getAllWeaponInventoryEntries(account)
    .filter((entry) => entry.active !== false && !entry.brokenAt)
    .map((entry) => `• **${entry.weaponLabel}** • \`${entry.code}\` • ${buildWeaponStatusText(entry)}`);
}

function formatAccountInfoTransactionLine(entry = {}) {
  const amountText = formatCurrency(entry.amount || 0);
  const targetUserId = entry.metadata?.targetUserId;
  const sourceUserId = entry.metadata?.sourceUserId;
  const targetAccountNumber = entry.metadata?.targetAccountNumber;
  const sourceAccountNumber = entry.metadata?.sourceAccountNumber;
  const vehicleName = entry.metadata?.vehicleName;
  const weaponKey = entry.metadata?.weaponKey;
  const resourceKey = entry.metadata?.resourceKey;
  const quantity = entry.metadata?.quantity;

  switch (entry.type) {
    case "transfer_sent":
    case "website_transfer_sent":
      return `➖ **تحويل صادر** إلى **${targetUserId ? `<@${targetUserId}>` : targetAccountNumber || "غير معروف"}** بمبلغ **${amountText}**`;
    case "transfer_received":
    case "website_transfer_received":
      return `➕ **تحويل وارد** من **${sourceUserId ? `<@${sourceUserId}>` : sourceAccountNumber || "غير معروف"}** بمبلغ **${amountText}**`;
    case "manual_add":
      return `➕ **إضافة إدارية** بمبلغ **${amountText}**`;
    case "manual_remove":
      return `➖ **سحب إداري** بمبلغ **${amountText}**`;
    case "website_vehicle_purchase":
      return `🚘 **شراء مركبة من الموقع**: **${vehicleName || "غير معروف"}** مقابل **${amountText}**`;
    case "website_vehicle_sale":
      return `🚘 **بيع مركبة من الموقع**: **${vehicleName || "غير معروف"}** واستلام **${amountText}**`;
    case "weapon_purchase":
      return `🔫 **شراء سلاح** بمبلغ **${amountText}**`;
    case "weapon_craft":
      return `🛠️ **تصنيع سلاح**${weaponKey ? ` • ${String(weaponKey).toUpperCase()}` : ""} بمبلغ **${amountText}**`;
    case "resource_purchase":
      return `📦 **شراء موارد**${resourceKey ? ` • ${resourceKey}` : ""}${quantity ? ` • الكمية ${quantity}` : ""} بمبلغ **${amountText}**`;
    case "account_created":
      return `🏦 **إنشاء حساب بنكي** برصيد افتتاحي **${amountText}**`;
    default:
      return `• **${entry.type || "عملية"}** — **${amountText}**`;
  }
}

function getFutureTemporaryWeapons(account, weaponKey) {
  return getWeaponInventory(account, weaponKey)
    .filter((entry) => entry.active !== false && !entry.brokenAt && entry.expiresAt)
    .sort((left, right) => new Date(left.expiresAt).getTime() - new Date(right.expiresAt).getTime());
}

function scheduleWeaponExpiryDate(account, weaponKey, durationMs) {
  const latestFutureExpiry = getFutureTemporaryWeapons(account, weaponKey)
    .reduce((latest, entry) => Math.max(latest, new Date(entry.expiresAt).getTime()), Date.now());

  return new Date(latestFutureExpiry + durationMs).toISOString();
}

function getNextTemporaryWeapon(account, weaponKey) {
  return getFutureTemporaryWeapons(account, weaponKey)[0] || null;
}

function hasPermanentWeapon(account, weaponKey) {
  return getWeaponInventory(account, weaponKey).some((entry) => (entry.active !== false && !entry.brokenAt) && entry.permanent);
}

function findNextTemporaryWeaponIndex(account, weaponKey) {
  const items = getWeaponInventory(account, weaponKey);
  return items.findIndex((entry) => entry.active !== false && !entry.brokenAt && !entry.permanent);
}

async function notifyWeaponBrokenByQuality({
  discordUserId,
  weaponKey,
  weaponCode,
  qualityPercent
}) {
  const account = getAccount(discordUserId);
  const user = await client.users.fetch(discordUserId).catch(() => null);
  if (!user) {
    return;
  }

  await user.send({
    embeds: [
      buildWeaponOperationDmEmbed({
        title: "💥 انكسر سلاحك المؤقت",
        description: "وصلت جودة السلاح إلى الصفر بعد كثرة الاستخدام والقتلات داخل الماب.",
        weaponCode,
        weaponLabel: getWeaponBaseLabel(weaponKey),
        permanent: false,
        extraLines: [
          `**📉 الجودة النهائية:** ${Number(qualityPercent || 0).toFixed(2)}%`,
          "**⚠️ الحالة:** تم تعطيل هذه النسخة بالكامل ولم تعد قابلة للاستخدام.",
          account ? `**📘 للمراجعة:** استخدم \`/ايمبد-المعلومات\` لرؤية الأسلحة المتبقية.` : ""
        ].filter(Boolean)
      })
    ]
  }).catch(() => null);
}

async function applyWeaponDurabilityFromKill({
  robloxUsername,
  weaponCode,
  victimUsername = ""
}) {
  const normalizedWeaponCode = normalizeWeaponCode(weaponCode);
  const weaponKey = normalizedWeaponCode === "COLT" ? "colt" : normalizedWeaponCode === "M9" ? "m9" : "";
  if (!weaponKey) {
    return null;
  }

  const account = findAccountByRobloxUsername(robloxUsername);
  if (!account) {
    return null;
  }

  if (weaponKey === "m9" && hasPermanentWeapon(account, "m9")) {
    return null;
  }

  const temporaryWeaponIndex = findNextTemporaryWeaponIndex(account, weaponKey);
  if (temporaryWeaponIndex < 0) {
    return null;
  }

  let qualityResult = null;
  updateAccount(account.discordUserId, (current) => {
    const items = getWeaponInventory(current, weaponKey);
    const targetEntry = items[temporaryWeaponIndex];
    if (!targetEntry || targetEntry.active === false || targetEntry.brokenAt || targetEntry.permanent) {
      return current;
    }

    const updatedKillCount = Math.max(0, Number(targetEntry.killCount || 0)) + 1;
    const updatedEntry = normalizeWeaponInventoryEntry({
      ...targetEntry,
      killCount: updatedKillCount
    }, weaponKey);

    if (computeWeaponQualityPercent(weaponKey, updatedEntry) <= 0) {
      updatedEntry.qualityPercent = 0;
      updatedEntry.active = false;
      updatedEntry.brokenAt = new Date().toISOString();
    }

    items[temporaryWeaponIndex] = updatedEntry;
    setWeaponInventory(current, weaponKey, items);
    qualityResult = {
      weaponKey,
      discordUserId: account.discordUserId,
      weaponCode: buildWeaponInventoryCode(weaponKey, temporaryWeaponIndex + 1),
      killCount: updatedEntry.killCount,
      qualityPercent: updatedEntry.qualityPercent,
      broken: Boolean(updatedEntry.brokenAt),
      victimUsername
    };
    return current;
  });

  if (!qualityResult) {
    return null;
  }

  if (qualityResult.broken) {
    const refreshedAccount = getAccount(account.discordUserId);
    const guild = await client.guilds.fetch(config.guildId).catch(() => null);
    const member = guild ? await guild.members.fetch(account.discordUserId).catch(() => null) : null;
    const roleId = weaponKey === "colt" ? COLT_ROLE_ID : config.m9RoleId;
    if (roleId && !hasAnyActiveWeapon(refreshedAccount, weaponKey)) {
      await member?.roles.remove(roleId).catch(() => null);
    }

    await notifyWeaponBrokenByQuality(qualityResult);
  }

  return qualityResult;
}

async function tryAdvanceCraftingLevel2QuestFromKill(parsedKill = {}) {
  return false;
}

function buildWeaponOperationDmEmbed({
  title,
  description,
  weaponCode,
  weaponLabel,
  permanent = false,
  expiresAt = null,
  actorLabel = "",
  extraLines = []
}) {
  const weaponTypeText = permanent ? "دائم" : "مؤقت";
  const details = [
    description,
    "",
    `**🔫 السلاح:** ${weaponLabel}${weaponCode ? ` • ${weaponCode}` : ""}`,
    `**📜 النوع:** ${weaponTypeText}`,
    actorLabel ? `**👤 الطرف الآخر:** ${actorLabel}` : "",
    !permanent && expiresAt ? `**⏳ تاريخ الانتهاء:** <t:${Math.floor(new Date(expiresAt).getTime() / 1000)}:F>` : "",
    ...extraLines
  ].filter(Boolean);

  return new EmbedBuilder()
    .setColor(0x1f6b45)
    .setTitle(title)
    .setDescription(details.join("\n"))
    .setFooter({ text: "Arab World • نظام الأسلحة" })
    .setTimestamp();
}

function buildWeaponsInfoEmbed(account) {
  const entries = getAllWeaponInventoryEntries(account);
  return new EmbedBuilder()
    .setColor(0x12345d)
    .setTitle("🧾 دليل الأسلحة والممتلكات")
    .setDescription([
      "**هذه الواجهة خاصة بممتلكاتك من الأسلحة وتعليمات التعامل معها.**",
      "",
      "**الضوابط:**",
      "• لا يمكنك إعطاء سلاح لا تملكه فعليًا",
      "• السلاح المؤقت ينتقل بمدة صلاحيته المتبقية",
      "• إذا كان معك أكثر من سلاح من نفس النوع سيظهر مثل: M9-1 و M9-2",
      "• أي تصنيع أو إعطاء سلاح يصلك عنه إشعار بالخاص"
    ].join("\n"))
    .addFields(
      { name: "📦 عدد أسلحتك الحالية", value: `**${entries.length}**`, inline: true },
      { name: "🧭 الخدمات", value: "**رؤية أسلحتي** أو **إعطاء شخص سلاح** من القائمة بالأسفل", inline: false }
    )
    .setFooter({ text: "Arab World • معلومات الأسلحة" })
    .setTimestamp();
}

function createWeaponsInfoMenu() {
  return new ActionRowBuilder().addComponents(
    new StringSelectMenuBuilder()
      .setCustomId("weapon_info_menu")
      .setPlaceholder("اختر الخدمة المطلوبة")
      .addOptions(
        new StringSelectMenuOptionBuilder()
          .setLabel("رؤيه اسلحتي")
          .setDescription("عرض جميع أسلحتك وأكوادها مثل M9-1")
          .setValue("view_my_weapons"),
        new StringSelectMenuOptionBuilder()
          .setLabel("اعطاء شخص سلاح")
          .setDescription("أرسل سلاحًا من ممتلكاتك إلى شخص آخر")
          .setValue("give_weapon")
      )
  );
}

function buildOwnedWeaponsEmbed(account) {
  const entries = getAllWeaponInventoryEntries(account);
  return new EmbedBuilder()
    .setColor(0x0c1f3f)
    .setTitle("🔫 أسلحتك الحالية")
    .setDescription([
      entries.length
        ? entries.map((entry) => `• **${entry.code}** — ${buildWeaponStatusText(entry)}`).join("\n")
        : "**لا تملك أي أسلحة حاليًا.**",
      "",
      `**📦 إجمالي عدد الأسلحة:** ${entries.length}`
    ].join("\n"))
    .setFooter({ text: "Arab World • ممتلكات الأسلحة" })
    .setTimestamp();
}

function createWeaponTransferModal() {
  return new ModalBuilder()
    .setCustomId("modal_weapon_transfer")
    .setTitle("إعطاء شخص سلاح")
    .addComponents(
      new ActionRowBuilder().addComponents(
        new TextInputBuilder()
          .setCustomId("target")
          .setLabel("آيدي الشخص أو اسمه البنكي أو رقمه البنكي")
          .setPlaceholder("مثال: 1801 أو اسم الحساب")
          .setStyle(TextInputStyle.Short)
          .setRequired(true)
      ),
      new ActionRowBuilder().addComponents(
        new TextInputBuilder()
          .setCustomId("weapon_code")
          .setLabel("كود السلاح الذي تملكه")
          .setPlaceholder("مثال: M9-1 أو M9-2")
          .setStyle(TextInputStyle.Short)
          .setRequired(true)
      ),
      new ActionRowBuilder().addComponents(
        new TextInputBuilder()
          .setCustomId("weapon_type")
          .setLabel("نوع السلاح")
          .setPlaceholder("اكتب: دائم أو مؤقت")
          .setStyle(TextInputStyle.Short)
          .setRequired(true)
      )
    );
}

async function processExpiredWeapons({ notifyUsers = true } = {}) {
  const guild = await client.guilds.fetch(config.guildId).catch(() => null);
  if (!guild) {
    return;
  }

  const accounts = Object.values(allAccounts());
  const now = Date.now();
  const trackedWeapons = [
    { key: "m9", roleId: config.m9RoleId, label: "M9" },
    { key: "colt", roleId: COLT_ROLE_ID, label: "Colt" }
  ];

  for (const account of accounts) {
    for (const trackedWeapon of trackedWeapons) {
      const inventory = getWeaponInventory(account, trackedWeapon.key);
      const expiringEntries = inventory
        .map((entry, index) => ({ entry, index }))
        .filter(({ entry }) => entry.expiresAt && !entry.brokenAt && new Date(entry.expiresAt).getTime() <= now);

      if (!expiringEntries.length) {
        continue;
      }

      updateAccount(account.discordUserId, (current) => {
        const items = getWeaponInventory(current, trackedWeapon.key);
        for (const { index } of expiringEntries) {
          if (!items[index]) {
            continue;
          }

          items[index] = normalizeWeaponInventoryEntry({
            ...items[index],
            brokenAt: new Date().toISOString(),
            active: false
          }, trackedWeapon.key);
        }
        setWeaponInventory(current, trackedWeapon.key, items);
        return current;
      });

      const refreshedAccount = getAccount(account.discordUserId);
      const member = await guild.members.fetch(account.discordUserId).catch(() => null);
      if (trackedWeapon.roleId && !hasAnyActiveWeapon(refreshedAccount, trackedWeapon.key)) {
        await member?.roles.remove(trackedWeapon.roleId).catch(() => null);
      }

      const stillHasPermanent = hasPermanentWeapon(refreshedAccount, trackedWeapon.key);
      const nextTemporaryWeapon = getNextTemporaryWeapon(refreshedAccount, trackedWeapon.key);

      if (notifyUsers) {
        for (const { index } of expiringEntries) {
          const weaponCode = buildWeaponInventoryCode(trackedWeapon.key, index + 1);
          const extraLines = [];
          let description = "تم إنهاء هذه النسخة من السلاح وإيقاف استخدامها في حسابك.";

          if (stillHasPermanent) {
            description = "انتهت صلاحية سلاحك المؤقت، لكن رتبة السلاح ستبقى معك لأن لديك نسخة دائمة.";
            extraLines.push("**🛡️ الحالة الحالية:** لا يزال بإمكانك استخدام السلاح لأن النسخة الدائمة ما زالت فعالة.");
          } else if (nextTemporaryWeapon) {
            description = "انتهت صلاحية سلاحك المؤقت، ولكن لديك نسخة مؤقتة أخرى وسيتم الاعتماد عليها الآن.";
            extraLines.push(`**⏳ النسخة الحالية التالية تنتهي:** <t:${Math.floor(new Date(nextTemporaryWeapon.expiresAt).getTime() / 1000)}:F>`);
            extraLines.push("**📌 ملاحظة:** رتبة السلاح ستبقى معك لأن لديك نسخة مؤقتة أخرى فعالة.");
          } else {
            description = "تم انتهاء صلاحية سلاحك المؤقت، ولا يمكنك استخدام هذا النوع الآن حتى تحصل على نسخة جديدة.";
            extraLines.push("**🚫 الحالة الحالية:** لا توجد لديك نسخة فعالة أخرى من هذا السلاح.");
          }

          await member?.send({
            embeds: [
              buildWeaponOperationDmEmbed({
                title: "🧨 انتهت صلاحية سلاحك",
                description,
                weaponCode,
                weaponLabel: trackedWeapon.label,
                permanent: false,
                extraLines
              })
            ]
          }).catch(() => null);
        }
      }

      await sendAuditLog(client, config.auditChannelId, {
        title: `🧨 **انكسار سلاح ${trackedWeapon.label}**`,
        description: "**انتهت صلاحية نسخة سلاح وتم تحديث مخزون العضو تلقائيًا.**",
        fields: [
          { name: "👤 **العضو**", value: `**<@${account.discordUserId}>**`, inline: true },
          { name: "🎮 **يوزر روبلوكس**", value: `**${account.robloxUsername || "غير مسجل"}**`, inline: true },
          { name: "📦 **النسخ المنتهية**", value: `**${expiringEntries.map(({ index }) => buildWeaponInventoryCode(trackedWeapon.key, index + 1)).join("، ")}**`, inline: false },
          { name: "🛡️ **نسخة دائمة متبقية**", value: stillHasPermanent ? "**نعم**" : "**لا**", inline: true },
          { name: "⏳ **نسخة مؤقتة تالية**", value: nextTemporaryWeapon?.expiresAt ? `**<t:${Math.floor(new Date(nextTemporaryWeapon.expiresAt).getTime() / 1000)}:R>**` : "**لا يوجد**", inline: true }
        ]
      });

      await sendPoliceBankLog({
        title: `🧨 **انتهاء نسخة سلاح ${trackedWeapon.label}**`,
        description: "**تم تسجيل انتهاء صلاحية نسخة سلاح ضمن النظام.**",
        fields: [
          { name: "👤 **العضو**", value: `**<@${account.discordUserId}>**`, inline: true },
          buildBankAccountAuditField(refreshedAccount),
          { name: "📦 **النسخة المنتهية**", value: `**${expiringEntries.map(({ index }) => buildWeaponInventoryCode(trackedWeapon.key, index + 1)).join("، ")}**`, inline: false },
          { name: "🛡️ **بقاء الرتبة**", value: hasAnyActiveWeapon(refreshedAccount, trackedWeapon.key) ? "**نعم**" : "**لا**", inline: true }
        ]
      });
    }
  }
}

async function pollKillLogs() {
  const guild = await client.guilds.fetch(config.guildId).catch(() => null);
  if (!guild) {
    return;
  }

  const logs = await fetchKillLogs();
  const serverPlayers = await fetchServerPlayers().catch(() => []);
  if (config.debugKillLogs) {
    console.log(`[KILLLOG POLL] Received ${logs.length} entries`);
  }

  for (const entry of logs) {
    const parsed = extractKillLogEntry(entry);
    if (config.debugKillLogs) {
      console.log("[KILLLOG PARSED]", JSON.stringify(parsed));
    }

    if (!parsed.id || processedKillLogIds.has(parsed.id)) {
      if (config.debugKillLogs) {
        console.log("[KILLLOG SKIP] Duplicate or missing id:", parsed.id);
      }
      continue;
    }

    rememberProcessedKillLog(parsed.id);

    if (!hasKillLogWarmupCompleted) {
      if (config.debugKillLogs) {
        console.log("[KILLLOG WARMUP] Skipping old entry:", parsed.id);
      }
      continue;
    }

    if (!parsed.killerUsername) {
      if (config.debugKillLogs) {
        console.log("[KILLLOG SKIP] Killer missing:", JSON.stringify(parsed));
      }
      continue;
    }

    await tryAdvanceCraftingLevel2QuestFromKill(parsed).catch((error) => {
      console.error("Failed to advance crafting level 2 quest from kill log:", error);
    });

    const killerTeam = getPlayerTeamByUsername(serverPlayers, parsed.killerUsername);
    if (isPoliceTeam(killerTeam)) {
      const result = {
        allowed: true,
        reason: "police_team_exempt",
        killerTeam
      };

      await sendWeaponEnforcementAudit({
        sourceLabel: "kill_logs",
        robloxUsername: parsed.killerUsername,
        weaponCode: parsed.weapon,
        victimUsername: parsed.victimUsername,
        result
      });
      continue;
    }

    const roleIdToVerify = parsed.weapon === "COLT" ? COLT_ROLE_ID : config.m9RoleId;
    const result = await verifyWeaponOwnership({
      guild,
      robloxUsername: parsed.killerUsername,
      weaponRoleId: roleIdToVerify,
      memberPrefix: config.guildMemberPrefix
    });

    if (config.debugKillLogs) {
      console.log("[KILLLOG RESULT]", JSON.stringify({
        killerUsername: parsed.killerUsername,
        victimUsername: parsed.victimUsername,
        weapon: parsed.weapon,
        result
      }));
    }

    await sendWeaponEnforcementAudit({
      sourceLabel: "kill_logs",
      robloxUsername: parsed.killerUsername,
      weaponCode: parsed.weapon,
      victimUsername: parsed.victimUsername,
      result
    });

    const durabilityResult = await applyWeaponDurabilityFromKill({
      robloxUsername: parsed.killerUsername,
      weaponCode: parsed.weapon,
      victimUsername: parsed.victimUsername
    });

    if (durabilityResult?.broken) {
      await sendAuditLog(client, config.auditChannelId, {
        title: "💥 **انكسار سلاح مؤقت بعد قتلات**",
        description: "**انخفضت جودة نسخة سلاح مؤقتة إلى الصفر وتم كسرها تلقائيًا.**",
        fields: [
          { name: "👤 **العضو**", value: `**<@${durabilityResult.discordUserId}>**`, inline: true },
          { name: "🔫 **السلاح**", value: `**${durabilityResult.weaponCode}**`, inline: true },
          { name: "🎮 **القاتل**", value: `**${parsed.killerUsername}**`, inline: true },
          { name: "☠️ **الضحية**", value: `**${parsed.victimUsername || "غير معروف"}**`, inline: true }
        ]
      });
    }

  }

  hasKillLogWarmupCompleted = true;
}

async function sendVehicleEnforcementAudit({ ownerUsername, vehicleName, allowed, reason }) {
  await sendAuditLog(client, config.auditChannelId, {
    title: allowed ? "🚘 **مركبة مسموح بها**" : "🚓 **تم تنفيذ عقوبة مركبة**",
    description: allowed
      ? "**تم فحص المركبة وصاحبها وتأكد النظام أنها مسجلة أو مجانية.**"
      : "**تم العثور على مركبة غير مملوكة لصاحبها، وتم تنفيذ السجن والتنبيه الخاص.**",
    color: allowed ? 0x1f6b45 : 0x8d1111,
    fields: [
      { name: "🎮 **صاحب المركبة**", value: `**${ownerUsername || "غير معروف"}**`, inline: true },
      { name: "🚗 **اسم المركبة**", value: `**${vehicleName || "غير معروف"}**`, inline: true },
      { name: "🧾 **النتيجة**", value: `**${reason}**`, inline: false }
    ]
  });
}

async function handleWeaponEventWebhook(payload = {}) {
  const guild = await client.guilds.fetch(config.guildId).catch(() => null);
  if (!guild) {
    return false;
  }

  const weaponEvent = extractWeaponEventPayload(payload);
  const robloxUsername = extractWebhookRobloxUsername(payload) || weaponEvent.robloxUsername;
  const weaponCode = normalizeWeaponCode(weaponEvent.weaponCode);
  if (!robloxUsername || (weaponCode !== "M9" && weaponCode !== "COLT")) {
    return false;
  }

  const roleIdToVerify = weaponCode === "COLT" ? COLT_ROLE_ID : config.m9RoleId;
  const result = await verifyWeaponOwnership({
    guild,
    robloxUsername,
    weaponRoleId: roleIdToVerify,
    memberPrefix: config.guildMemberPrefix
  });

  await sendWeaponEnforcementAudit({
    sourceLabel: "event_webhook_weapon",
    robloxUsername,
    weaponCode,
    result
  });

  return true;
}

async function handleTrafficSignalViolationWebhook(payload = {}, textBlob = "") {
  const robloxUsername = extractWebhookRobloxUsername(payload);
  if (!robloxUsername) {
    return false;
  }

  const increment = Math.max(1, extractTrafficSignalViolationCount(payload, textBlob));
  const state = redLightViolationState.get(robloxUsername) || {
    count: 0,
    lastSeenAt: 0,
    lastAlertAt: 0
  };

  const now = Date.now();
  if (now - state.lastSeenAt > 30 * 60 * 1000) {
    state.count = 0;
  }

  state.count += increment;
  state.lastSeenAt = now;
  redLightViolationState.set(robloxUsername, state);

  if (state.count <= 3 || now - state.lastAlertAt < 10 * 60 * 1000) {
    return true;
  }

  const account = findAccountByRobloxUsername(robloxUsername);
  const mention = account?.discordUserId ? `<@${account.discordUserId}>` : "`غير مربوط`";
  const location = firstString(payload.location, payload.Location, payload.street, payload.Street, payload.postal, payload.PostalCode);

  await sendSystemLog(TRAFFIC_SIGNAL_VIOLATIONS_LOG_CHANNEL_ID, {
    title: "🚦 **تجاوز إشارات متكرر**",
    description: "**تم رصد اللاعب وهو يقطع الإشارة أكثر من ثلاث مرات داخل الماب. هذه مخالفة مرورية وتحتاج متابعة.**",
    color: 0x8d1111,
    fields: [
      { name: "🎮 **يوزر اللاعب**", value: `**${robloxUsername}**`, inline: true },
      { name: "👤 **الحساب المرتبط**", value: `**${mention}**`, inline: true },
      { name: "📊 **عدد المرات**", value: `**${state.count}**`, inline: true },
      { name: "📍 **الموقع**", value: `**${location || "غير معروف"}**`, inline: false },
      { name: "🧾 **التنبيه**", value: "**قطع أكثر من إشارة ويستحق مخالفة مرورية.**", inline: false }
    ]
  });

  state.lastAlertAt = now;
  redLightViolationState.set(robloxUsername, state);
  return true;
}

async function handleGameplayEventWebhook(payload = {}) {
  const eventPayload = extractWebhookEventPayload(payload);
  const fingerprint = buildWebhookEventFingerprint(eventPayload);
  if (hasProcessedWebhookEventFingerprint(fingerprint)) {
    return;
  }
  rememberWebhookEventFingerprint(fingerprint);

  const textBlob = buildWebhookTextBlob(eventPayload);
  const robberyPayload = extractRobberyEventPayload(eventPayload);
  if (robberyPayload.robloxUsername && robberyPayload.robberyType && /robbery|سرق/i.test(textBlob)) {
    await processRobberyReward({
      robloxUsername: robberyPayload.robloxUsername,
      robberyType: robberyPayload.robberyType,
      sourceLabel: "event_webhook",
      location: firstString(eventPayload.location, eventPayload.Location, eventPayload.place, eventPayload.target),
      forceSuccess: robberyPayload.success
    }).catch((error) => {
      console.error("Failed to process robbery event webhook:", error);
    });
  }

  if (payloadLooksLikeWeaponEvent(eventPayload, textBlob)) {
    await handleWeaponEventWebhook(eventPayload).catch((error) => {
      console.error("Failed to process weapon event webhook:", error);
    });
  }

  if (payloadLooksLikeTrafficSignalViolation(eventPayload, textBlob)) {
    await handleTrafficSignalViolationWebhook(eventPayload, textBlob).catch((error) => {
      console.error("Failed to process traffic signal violation webhook:", error);
    });
  }
}

async function pollActiveVehicles() {
  const guild = await client.guilds.fetch(config.guildId).catch(() => null);
  if (!guild) {
    return;
  }

  const activeVehicles = await fetchActiveVehicles();
  const serverPlayers = await fetchServerPlayers().catch((error) => {
    console.error("Failed to fetch ER:LC players:", error);
    return [];
  });

  for (const entry of activeVehicles) {
    const parsed = extractActiveVehicleEntry(entry);
    const ownerUsername = parsed.ownerUsername;
    const ownerTeam = getPlayerTeamByUsername(serverPlayers, ownerUsername) || parsed.department;
    const canonicalVehicleName = resolveCanonicalVehicleName(parsed.vehicleName) || parsed.vehicleName;

    if (!parsed.vehicleName || !ownerUsername) {
      continue;
    }

    if (shouldSkipVehiclePunishment(canonicalVehicleName, ownerTeam)) {
      continue;
    }

    if (!isCitizenTeam(ownerTeam)) {
      continue;
    }

    registerVehicleName(canonicalVehicleName);
    invalidateVehicleCatalogCache();

    const uniqueKey = `${parsed.id}|${normalizeVehicleName(canonicalVehicleName)}|${normalizeVehicleName(ownerUsername)}`;
    const lastHandledAt = processedVehicleIds.get(uniqueKey) || 0;
    if (Date.now() - lastHandledAt < 30 * 1000) {
      continue;
    }

    if (isFreeVehicleName(canonicalVehicleName, ownerTeam)) {
      processedVehicleIds.set(uniqueKey, Date.now());
      continue;
    }

    const ownerResolution = await resolveLinkedVehicleOwnerAccount(
      guild,
      ownerUsername,
      canonicalVehicleName
    );
    const linkedAccount = ownerResolution?.account ?? null;
    const directRobloxAccount = findAccountByRobloxUsername(ownerUsername) || null;
    const directlyLinkedVehicleOwner = [directRobloxAccount, linkedAccount].find((account) => {
      if (!account?.discordUserId) {
        return false;
      }

      return Boolean(
        userOwnsVehicle(account.discordUserId, canonicalVehicleName)
        || userOwnsVehicle(account.discordUserId, parsed.vehicleName)
      );
    });

    if (directlyLinkedVehicleOwner?.discordUserId) {
      processedVehicleIds.set(uniqueKey, Date.now());
      continue;
    }

    const possibleVehicleOwners = findAccountsOwningVehicle(canonicalVehicleName);
    const matchingVehicleRentals = [
      ...listActiveRentalsMatchingVehicle(canonicalVehicleName),
      ...listActiveRentalsMatchingVehicle(parsed.vehicleName)
    ].filter((rental, index, rentals) => {
      if (!rental?.rentalId) {
        return true;
      }

      return rentals.findIndex((entry) => entry?.rentalId === rental.rentalId) === index;
    });
    const rentalVehicleOwnerAccounts = matchingVehicleRentals
      .map((rental) => getAccount(rental?.userId))
      .filter((account, index, accounts) =>
        account?.discordUserId
        && accounts.findIndex((entry) => entry?.discordUserId === account.discordUserId) === index
      );
    const hasSingleMatchingRental = matchingVehicleRentals.length === 1;
    const matchedPossibleOwner = possibleVehicleOwners.find((account) =>
      robloxUsernamesMatchForOwnership(account.robloxUsername, ownerUsername)
    );
    const matchedRentalOwner = rentalVehicleOwnerAccounts.find((account) =>
      robloxUsernamesMatchForOwnership(account.robloxUsername, ownerUsername)
    );
    const verifiedOwnerAccount = matchedPossibleOwner || matchedRentalOwner || linkedAccount || rentalVehicleOwnerAccounts[0] || null;
    const hasConfidentOwnerMatch = Boolean(
      matchedPossibleOwner?.discordUserId
      || matchedRentalOwner?.discordUserId
      || (ownerResolution?.confident && linkedAccount?.discordUserId)
      || rentalVehicleOwnerAccounts.length === 1
    );

    if (!hasConfidentOwnerMatch && possibleVehicleOwners.length === 1) {
      processedVehicleIds.set(uniqueKey, Date.now());
      continue;
    }

    if (!hasConfidentOwnerMatch && hasSingleMatchingRental) {
      processedVehicleIds.set(uniqueKey, Date.now());
      continue;
    }

    if (matchingVehicleRentals.length > 0) {
      processedVehicleIds.set(uniqueKey, Date.now());
      continue;
    }

    if (!hasConfidentOwnerMatch || !verifiedOwnerAccount?.discordUserId) {
      const skipLogKey = `${normalizeVehicleName(ownerUsername)}|${normalizeVehicleName(canonicalVehicleName)}`;
      const lastSkipLogAt = recentVehicleSkipLogs.get(skipLogKey) || 0;
      if (Date.now() - lastSkipLogAt >= 2 * 60 * 1000) {
        await sendVehicleEnforcementAudit({
          ownerUsername,
          vehicleName: canonicalVehicleName,
          allowed: true,
          reason: `تم تخطي العقوبة لأن النظام لم يستطع ربط الحساب بثقة. المصدر: ${ownerResolution?.matchSource || "unknown"} • الفريق: ${ownerTeam || "غير معروف"} • الاسم القادم من الماب: ${parsed.vehicleName || canonicalVehicleName}`
        }).catch(() => null);
        recentVehicleSkipLogs.set(skipLogKey, Date.now());
      }
      processedVehicleIds.set(uniqueKey, Date.now());
      continue;
    }

    const ownedVehicleMatchByCanonical = verifiedOwnerAccount?.discordUserId
      ? findOwnedVehicleMatch(verifiedOwnerAccount.discordUserId, canonicalVehicleName)
      : null;
    const ownedVehicleMatchByRawName = verifiedOwnerAccount?.discordUserId
      ? findOwnedVehicleMatch(verifiedOwnerAccount.discordUserId, parsed.vehicleName)
      : null;
    const fallbackVehicleOwner = [...possibleVehicleOwners, ...rentalVehicleOwnerAccounts].find((account) => {
      if (!account?.discordUserId) {
        return false;
      }

      if (!robloxUsernamesMatchForOwnership(account.robloxUsername, ownerUsername)) {
        return false;
      }

      return Boolean(
        findOwnedVehicleMatch(account.discordUserId, canonicalVehicleName)
        || findOwnedVehicleMatch(account.discordUserId, parsed.vehicleName)
      );
    });
    const ownsVehicle = Boolean(
      ownedVehicleMatchByCanonical
      || ownedVehicleMatchByRawName
      || hasSingleMatchingRental
      || fallbackVehicleOwner?.discordUserId
    );

    if (ownsVehicle) {
      processedVehicleIds.set(uniqueKey, Date.now());
      continue;
    }

    await punishUnauthorizedVehicleUse(ownerUsername);
    processedVehicleIds.set(uniqueKey, Date.now());
    await sendVehicleEnforcementAudit({
      ownerUsername,
      vehicleName: canonicalVehicleName,
      allowed: false,
      reason: `المركبة غير موجودة ضمن ممتلكاته بعد التحقق من الحساب المرتبط. الاسم من الماب: ${parsed.vehicleName || canonicalVehicleName}`
    });
  }

  if (processedVehicleIds.size > 1000) {
    const now = Date.now();
    for (const [key, timestamp] of processedVehicleIds.entries()) {
      if (now - timestamp > 10 * 60 * 1000) {
        processedVehicleIds.delete(key);
      }
    }
  }
}

function createAccountModal() {
  return new ModalBuilder()
    .setCustomId("modal_create_bank_account")
    .setTitle("إنشاء حساب بنكي")
    .addComponents(
      new ActionRowBuilder().addComponents(
        new TextInputBuilder()
          .setCustomId("bank_name")
          .setLabel("اسمك الكامل")
          .setStyle(TextInputStyle.Short)
          .setRequired(true)
      ),
      new ActionRowBuilder().addComponents(
        new TextInputBuilder()
          .setCustomId("bank_age")
          .setLabel("عمرك")
          .setStyle(TextInputStyle.Short)
          .setRequired(true)
      ),
      new ActionRowBuilder().addComponents(
        new TextInputBuilder()
          .setCustomId("bank_country")
          .setLabel("بلدك")
          .setStyle(TextInputStyle.Short)
          .setRequired(true)
      ),
      new ActionRowBuilder().addComponents(
        new TextInputBuilder()
          .setCustomId("bank_roblox_username")
          .setLabel("اسمك في روبلوكس")
          .setStyle(TextInputStyle.Short)
          .setRequired(true)
      ),
      new ActionRowBuilder().addComponents(
        new TextInputBuilder()
          .setCustomId("bank_info")
          .setLabel("معلوماتك الشخصية")
          .setStyle(TextInputStyle.Paragraph)
          .setRequired(true)
      )
    );
}

function createPinModal() {
  return new ModalBuilder()
    .setCustomId("modal_confirm_bank_pin")
    .setTitle("إدخال الرقم السري")
    .addComponents(
      new ActionRowBuilder().addComponents(
        new TextInputBuilder()
          .setCustomId("bank_pin")
          .setLabel("اكتب الرقم السري الذي وصلك بالخاص")
          .setStyle(TextInputStyle.Short)
          .setMinLength(4)
          .setMaxLength(4)
          .setRequired(true)
      )
    );
}

function createTransferModal() {
  return new ModalBuilder()
    .setCustomId("modal_bank_transfer")
    .setTitle("تحويل رصيد")
    .addComponents(
      new ActionRowBuilder().addComponents(
        new TextInputBuilder()
          .setCustomId("target_user")
          .setLabel("ايديه دسكورد أو منشن الشخص")
          .setStyle(TextInputStyle.Short)
          .setRequired(true)
      ),
      new ActionRowBuilder().addComponents(
        new TextInputBuilder()
          .setCustomId("transfer_amount")
          .setLabel("المبلغ")
          .setStyle(TextInputStyle.Short)
          .setRequired(true)
      )
    );
}

function createLoanModal(accountNumber = "") {
  return new ModalBuilder()
    .setCustomId("modal_bank_loan")
    .setTitle("طلب قرض")
    .addComponents(
      new ActionRowBuilder().addComponents(
        new TextInputBuilder()
          .setCustomId("loan_name")
          .setLabel("اسمك")
          .setStyle(TextInputStyle.Short)
          .setRequired(true)
      ),
      new ActionRowBuilder().addComponents(
        new TextInputBuilder()
          .setCustomId("loan_account_number")
          .setLabel("رقم الحساب البنكي")
          .setStyle(TextInputStyle.Short)
          .setRequired(true)
          .setValue(accountNumber)
      ),
      new ActionRowBuilder().addComponents(
        new TextInputBuilder()
          .setCustomId("loan_amount")
          .setLabel("مبلغ القرض")
          .setStyle(TextInputStyle.Short)
          .setRequired(true)
      )
    );
}

function createResourceModal(resourceKey) {
  return new ModalBuilder()
    .setCustomId(`modal_buy_resource:${resourceKey}`)
    .setTitle(`شراء ${RESOURCE_CATALOG[resourceKey].label}`)
    .addComponents(
      new ActionRowBuilder().addComponents(
        new TextInputBuilder()
          .setCustomId("resource_quantity")
          .setLabel("الكمية المطلوبة")
          .setStyle(TextInputStyle.Short)
          .setRequired(true)
      )
    );
}

function createLoanReasonModal(loanId) {
  return new ModalBuilder()
    .setCustomId(`modal_loan_reason:${loanId}`)
    .setTitle("سبب رفض القرض")
    .addComponents(
      new ActionRowBuilder().addComponents(
        new TextInputBuilder()
          .setCustomId("loan_reject_reason")
          .setLabel("اكتب سبب الرفض")
          .setStyle(TextInputStyle.Paragraph)
          .setRequired(true)
      )
    );
}

async function sendBankHome(interaction) {
  await interaction.reply({
    embeds: [buildBankEmbedPolished()],
    components: [buildBankMenuPolished()],
    ephemeral: false
  });
}

async function sendPoliceBankHome(interaction) {
  await interaction.reply({
    embeds: [buildPoliceBankEmbedPolished()],
    components: buildPoliceBankButtonsPolished(),
    ephemeral: false
  });
}

async function sendGunHome(interaction) {
  await interaction.reply({
    embeds: [buildGunEmbedPolished()],
    components: [buildGunButtonPolished()],
    ephemeral: false
  });
}

async function sendGun2Home(interaction) {
  await interaction.reply({
    embeds: [buildGun2EmbedPolished()],
    components: buildGun2ButtonsPolished(),
    ephemeral: false
  });
}

async function sendResourcesHome(interaction) {
  const account = requireAccount(interaction.user.id);
  if (!account) {
    await interaction.reply({ content: "لا يوجد لديك حساب بنكي لاستخدام مركز الموارد.", ephemeral: true });
    return;
  }

  await interaction.reply({
    embeds: [buildResourcesHomeEmbed(account)],
    components: [createResourcesMainMenu()],
    ephemeral: false
  });
}

async function sendMdtHome(interaction) {
  await interaction.reply({
    embeds: [buildMdtEmbedPolished()],
    components: [buildMdtButtonsPolished()],
    ephemeral: false
  });
}

function createFineModal() {
  return new ModalBuilder()
    .setCustomId("modal_mdt_add_fine")
    .setTitle("إضافة مخالفة")
    .addComponents(
      new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId("officer_name").setLabel("اسم العسكري").setStyle(TextInputStyle.Short).setRequired(true)),
      new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId("target_user").setLabel("اسم أو ايدي دسكورد للمخالف").setStyle(TextInputStyle.Short).setRequired(true)),
      new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId("fine_reason").setLabel("سبب المخالفة").setStyle(TextInputStyle.Paragraph).setRequired(true)),
      new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId("fine_type").setLabel("نوع المخالفة").setStyle(TextInputStyle.Short).setRequired(true)),
      new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId("fine_amount").setLabel("مبلغ المخالفة (أرقام فقط)").setStyle(TextInputStyle.Short).setRequired(true))
    );
}

function createResourceTransferModal() {
  return new ModalBuilder()
    .setCustomId("modal_transfer_resource")
    .setTitle("تحويل موارد")
    .addComponents(
      new ActionRowBuilder().addComponents(
        new TextInputBuilder()
          .setCustomId("target_user")
          .setLabel("ايدي أو منشن أو الاسم البنكي")
          .setStyle(TextInputStyle.Short)
          .setRequired(true)
      ),
      new ActionRowBuilder().addComponents(
        new TextInputBuilder()
          .setCustomId("resource_key")
          .setLabel("اسم المورد أو الكود")
          .setStyle(TextInputStyle.Short)
          .setRequired(true)
      ),
      new ActionRowBuilder().addComponents(
        new TextInputBuilder()
          .setCustomId("resource_quantity")
          .setLabel("الكمية")
          .setStyle(TextInputStyle.Short)
          .setRequired(true)
      )
    );
}

function createPayFineModal() {
  return new ModalBuilder()
    .setCustomId("modal_bank_pay_fine")
    .setTitle("سداد المخالفات")
    .addComponents(
      new ActionRowBuilder().addComponents(
        new TextInputBuilder().setCustomId("fine_id").setLabel("رقم المخالفة").setStyle(TextInputStyle.Short).setRequired(true)
      )
    );
}

function createRemoveHoldRequestModal() {
  return new ModalBuilder()
    .setCustomId("modal_remove_hold_request")
    .setTitle("رفع إيقاف الخدمات")
    .addComponents(
      new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId("request_name").setLabel("اسمك").setStyle(TextInputStyle.Short).setRequired(true)),
      new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId("request_fine_count").setLabel("عدد مخالفاتك").setStyle(TextInputStyle.Short).setRequired(true)),
      new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId("request_paid_status").setLabel("هل سددتها؟").setStyle(TextInputStyle.Short).setRequired(true))
    );
}

function createApplyHoldModal() {
  return new ModalBuilder()
    .setCustomId("modal_apply_hold")
    .setTitle("إيقاف خدمات")
    .addComponents(
      new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId("hold_target").setLabel("منشن الشخص أو آيدي الديسكورد أو رقم الحساب").setStyle(TextInputStyle.Short).setRequired(true))
    );
}

function createAdminRemoveHoldModal() {
  return new ModalBuilder()
    .setCustomId("modal_admin_remove_hold")
    .setTitle("رفع إيقاف الخدمات")
    .addComponents(
      new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId("hold_target").setLabel("منشن الشخص أو آيدي الديسكورد أو رقم الحساب").setStyle(TextInputStyle.Short).setRequired(true))
    );
}

function createPoliceBankWithdrawModal() {
  return new ModalBuilder()
    .setCustomId("modal_police_bank_withdraw")
    .setTitle("سحب مال شخص")
    .addComponents(
      new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId("target_user").setLabel("منشن الشخص أو آيدي الديسكورد أو رقم الحساب").setStyle(TextInputStyle.Short).setRequired(true)),
      new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId("amount").setLabel("المبلغ").setStyle(TextInputStyle.Short).setRequired(true)),
      new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId("reason").setLabel("السبب").setStyle(TextInputStyle.Paragraph).setRequired(true))
    );
}

function createPoliceBankFreezeModal() {
  return new ModalBuilder()
    .setCustomId("modal_police_bank_freeze")
    .setTitle("تجميد حساب بنكي")
    .addComponents(
      new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId("target_user").setLabel("منشن الشخص أو آيدي الديسكورد أو رقم الحساب").setStyle(TextInputStyle.Short).setRequired(true)),
      new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId("reason").setLabel("سبب التجميد").setStyle(TextInputStyle.Paragraph).setRequired(true))
    );
}

function createPoliceBankUnfreezeModal() {
  return new ModalBuilder()
    .setCustomId("modal_police_bank_unfreeze")
    .setTitle("رفع تجميد حساب")
    .addComponents(
      new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId("target_user").setLabel("منشن الشخص أو آيدي الديسكورد أو رقم الحساب").setStyle(TextInputStyle.Short).setRequired(true)),
      new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId("reason").setLabel("ملاحظة الرفع").setStyle(TextInputStyle.Paragraph).setRequired(true))
    );
}

function createPoliceBankSeizeAssetsModal() {
  return new ModalBuilder()
    .setCustomId("modal_police_bank_seize_assets")
    .setTitle("حجز ممتلكات")
    .addComponents(
      new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId("target_user").setLabel("منشن الشخص أو آيدي الديسكورد أو رقم الحساب").setStyle(TextInputStyle.Short).setRequired(true)),
      new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId("reason").setLabel("سبب الحجز").setStyle(TextInputStyle.Paragraph).setRequired(true))
    );
}

function createPoliceBankReleaseAssetsModal() {
  return new ModalBuilder()
    .setCustomId("modal_police_bank_release_assets")
    .setTitle("رفع حجز ممتلكات")
    .addComponents(
      new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId("target_user").setLabel("منشن الشخص أو آيدي الديسكورد أو رقم الحساب").setStyle(TextInputStyle.Short).setRequired(true)),
      new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId("reason").setLabel("ملاحظة الرفع").setStyle(TextInputStyle.Paragraph).setRequired(true))
    );
}

function createRemoveFineLookupModal() {
  return new ModalBuilder()
    .setCustomId("modal_remove_fine_lookup")
    .setTitle("إزالة مخالفة")
    .addComponents(
      new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId("fine_lookup_target").setLabel("اسم الشخص أو ايدي الدسكورد").setStyle(TextInputStyle.Short).setRequired(true))
    );
}

function createHoldReasonModal(requestId) {
  return new ModalBuilder()
    .setCustomId(`modal_hold_reason:${requestId}`)
    .setTitle("سبب رفض رفع الإيقاف")
    .addComponents(
      new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId("hold_reject_reason").setLabel("اكتب سبب الرفض").setStyle(TextInputStyle.Paragraph).setRequired(true))
    );
}

function parseUserInput(raw) {
  return String(raw || "").replace(/[<@!>]/g, "").trim();
}

function normalizeLooseName(value) {
  return String(value || "")
    .trim()
    .replace(/\s+/g, " ")
    .toLowerCase();
}

function removeGuildMemberPrefix(value, prefix = config.guildMemberPrefix) {
  const normalizedValue = normalizeLooseName(value);
  const normalizedPrefix = normalizeLooseName(prefix);

  if (normalizedPrefix && normalizedValue.startsWith(normalizedPrefix)) {
    return normalizeLooseName(normalizedValue.slice(normalizedPrefix.length));
  }

  return normalizedValue;
}

function parseWholeNumberInput(raw) {
  const arabicDigits = {
    "٠": "0",
    "١": "1",
    "٢": "2",
    "٣": "3",
    "٤": "4",
    "٥": "5",
    "٦": "6",
    "٧": "7",
    "٨": "8",
    "٩": "9"
  };

  const normalized = String(raw || "")
    .trim()
    .replace(/[٠-٩]/g, (digit) => arabicDigits[digit] || digit)
    .replace(/[,\s]/g, "");

  if (!/^\d+$/.test(normalized)) {
    return Number.NaN;
  }

  return Number(normalized);
}

async function resolveUser(raw) {
  const userId = parseUserInput(raw);
  if (/^\d{5,}$/.test(userId)) {
    const direct = await client.users.fetch(userId).catch(() => null);
    if (direct) {
      return direct;
    }
  }

  const account = findAccountByName(raw);
  if (account?.discordUserId) {
    const accountUser = await client.users.fetch(account.discordUserId).catch(() => null);
    if (accountUser) {
      return accountUser;
    }
  }

  const guild = await client.guilds.fetch(config.guildId).catch(() => null);
  if (!guild) {
    return null;
  }

  const normalized = normalizeLooseName(raw);
  const findMatchingMember = (members) => members.find((candidate) => {
    const username = normalizeLooseName(candidate.user.username);
    const globalName = normalizeLooseName(candidate.user.globalName);
    const displayName = normalizeLooseName(candidate.displayName);
    return username === normalized || globalName === normalized || displayName === normalized;
  });
  const cachedMember = findMatchingMember(guild.members.cache);

  if (cachedMember?.user) {
    return cachedMember.user;
  }

  if (normalized.length >= 2) {
    const searchedMembers = await guild.members.search({
      query: String(raw || "").trim(),
      limit: 10
    }).catch(() => null);
    const searchedMember = searchedMembers ? findMatchingMember(searchedMembers) || searchedMembers.first() : null;
    if (searchedMember?.user) {
      return searchedMember.user;
    }
  }

  return null;
}

async function resolveAdministrativeTargetUser(raw) {
  const cleaned = String(raw || "").trim();
  if (!cleaned) {
    return null;
  }

  const mentionMatch = cleaned.match(/^<@!?(\d{5,})>$/);
  const discordId = mentionMatch?.[1] || (parseUserInput(cleaned).match(/^\d{5,}$/) ? parseUserInput(cleaned) : "");
  if (discordId) {
    return client.users.fetch(discordId).catch(() => null);
  }

  if (/^\d{4,6}$/.test(cleaned)) {
    const accountByNumber = findAccountByAccountNumber(cleaned);
    if (accountByNumber?.discordUserId) {
      return client.users.fetch(accountByNumber.discordUserId).catch(() => null);
    }
  }

  return null;
}

function hasValidAdministrativeActionContext({ actorUserId, targetUserId, sourceAction, reasonRequired = false, reason = "" }) {
  if (!actorUserId || !targetUserId || !sourceAction) {
    return false;
  }

  if (actorUserId === targetUserId) {
    return false;
  }

  if (reasonRequired && !String(reason || "").trim()) {
    return false;
  }

  return true;
}

function logAdministrativeAction(actionType, payload = {}) {
  console.info("[ADMIN ACTION]", JSON.stringify({
    actionType,
    actorUserId: payload.actorUserId || null,
    targetUserId: payload.targetUserId || null,
    sourceAction: payload.sourceAction || null,
    reason: payload.reason || null,
    oldState: payload.oldState || null,
    newState: payload.newState || null,
    timestamp: new Date().toISOString()
  }));
}

async function applyManualServiceHold({ guild, actorUserId, targetUserId, sourceAction }) {
  if (!hasValidAdministrativeActionContext({ actorUserId, targetUserId, sourceAction })) {
    return { ok: false, error: "invalid_admin_action_context" };
  }

  const member = await guild.members.fetch(targetUserId).catch(() => null);
  if (!member) {
    return { ok: false, error: "member_not_found" };
  }

  if (member.roles.cache.has(config.serviceHoldRoleId)) {
    return { ok: false, error: "service_hold_already_applied" };
  }

  await member.roles.add(config.serviceHoldRoleId).catch(() => null);
  logAdministrativeAction("service_hold_apply", {
    actorUserId,
    targetUserId,
    sourceAction,
    oldState: { serviceHold: false },
    newState: { serviceHold: true }
  });
  return { ok: true, member };
}

async function removeManualServiceHold({ guild, actorUserId, targetUserId, sourceAction }) {
  if (!hasValidAdministrativeActionContext({ actorUserId, targetUserId, sourceAction })) {
    return { ok: false, error: "invalid_admin_action_context" };
  }

  const member = await guild.members.fetch(targetUserId).catch(() => null);
  if (!member) {
    return { ok: false, error: "member_not_found" };
  }

  if (!member.roles.cache.has(config.serviceHoldRoleId)) {
    return { ok: false, error: "service_hold_not_applied" };
  }

  await member.roles.remove(config.serviceHoldRoleId).catch(() => null);
  logAdministrativeAction("service_hold_remove", {
    actorUserId,
    targetUserId,
    sourceAction,
    oldState: { serviceHold: true },
    newState: { serviceHold: false }
  });
  return { ok: true, member };
}

function applyManualBankFreeze({ actorUserId, targetUserId, reason, sourceAction }) {
  if (!hasValidAdministrativeActionContext({ actorUserId, targetUserId, reasonRequired: true, reason, sourceAction })) {
    return { ok: false, error: "invalid_admin_action_context" };
  }

  const account = getAccount(targetUserId);
  if (!account) {
    return { ok: false, error: "account_not_found" };
  }

  if (account.bankFrozen) {
    return { ok: false, error: "bank_already_frozen" };
  }

  const oldState = {
    bankFrozen: Boolean(account.bankFrozen),
    bankFrozenReason: account.bankFrozenReason || null
  };

  const updated = updateAccount(targetUserId, (current) => {
    current.bankFrozen = true;
    current.bankFrozenReason = reason;
    current.bankFrozenBy = actorUserId;
    current.bankFrozenAt = new Date().toISOString();
    return current;
  });

  logAdministrativeAction("bank_freeze_apply", {
    actorUserId,
    targetUserId,
    sourceAction,
    reason,
    oldState,
    newState: {
      bankFrozen: Boolean(updated?.bankFrozen),
      bankFrozenReason: updated?.bankFrozenReason || null
    }
  });

  return { ok: true, account: updated };
}

function removeManualBankFreeze({ actorUserId, targetUserId, reason, sourceAction }) {
  if (!hasValidAdministrativeActionContext({ actorUserId, targetUserId, reasonRequired: true, reason, sourceAction })) {
    return { ok: false, error: "invalid_admin_action_context" };
  }

  const account = getAccount(targetUserId);
  if (!account) {
    return { ok: false, error: "account_not_found" };
  }

  if (!account.bankFrozen) {
    return { ok: false, error: "bank_not_frozen" };
  }

  const oldState = {
    bankFrozen: Boolean(account.bankFrozen),
    bankFrozenReason: account.bankFrozenReason || null
  };

  const updated = updateAccount(targetUserId, (current) => {
    current.bankFrozen = false;
    current.bankFrozenReason = null;
    current.bankFrozenBy = null;
    current.bankFrozenAt = null;
    return current;
  });

  logAdministrativeAction("bank_freeze_remove", {
    actorUserId,
    targetUserId,
    sourceAction,
    reason,
    oldState,
    newState: {
      bankFrozen: Boolean(updated?.bankFrozen),
      bankFrozenReason: updated?.bankFrozenReason || null
    }
  });

  return { ok: true, account: updated };
}

async function applyManualAssetsSeizure({ guild, actorUserId, targetUserId, reason, sourceAction }) {
  if (!hasValidAdministrativeActionContext({ actorUserId, targetUserId, reasonRequired: true, reason, sourceAction })) {
    return { ok: false, error: "invalid_admin_action_context" };
  }

  const account = getAccount(targetUserId);
  if (!account) {
    return { ok: false, error: "account_not_found" };
  }

  if (account.assetsSeized) {
    return { ok: false, error: "assets_already_seized" };
  }

  const snapshot = {
    cars: structuredClone(account.cars ?? {}),
    resources: structuredClone(account.resources ?? {}),
    weapons: structuredClone(account.weapons ?? {})
  };

  const oldState = {
    assetsSeized: Boolean(account.assetsSeized),
    carsCount: Object.keys(account.cars ?? {}).length
  };

  const updated = updateAccount(targetUserId, (current) => {
    current.assetsSeized = true;
    current.assetsSeizedReason = reason;
    current.assetsSeizedBy = actorUserId;
    current.assetsSeizedAt = new Date().toISOString();
    current.seizedAssetsSnapshot = snapshot;
    current.cars = {};
    current.resources = { coal: 0, copper: 0, iron: 0, aluminum: 0, sulfur: 0, plastic: 0 };
    current.weapons = {};
    return current;
  });

  const member = guild ? await guild.members.fetch(targetUserId).catch(() => null) : null;
  await member?.roles.remove(config.m9RoleId).catch(() => null);
  await member?.roles.remove(COLT_ROLE_ID).catch(() => null);

  logAdministrativeAction("assets_seize_apply", {
    actorUserId,
    targetUserId,
    sourceAction,
    reason,
    oldState,
    newState: {
      assetsSeized: Boolean(updated?.assetsSeized),
      carsCount: Object.keys(updated?.cars ?? {}).length
    }
  });

  return { ok: true, account: updated, snapshot };
}

function releaseManualAssetsSeizure({ actorUserId, targetUserId, reason, sourceAction }) {
  if (!hasValidAdministrativeActionContext({ actorUserId, targetUserId, reasonRequired: true, reason, sourceAction })) {
    return { ok: false, error: "invalid_admin_action_context" };
  }

  const account = getAccount(targetUserId);
  if (!account) {
    return { ok: false, error: "account_not_found" };
  }

  if (!account.assetsSeized || !account.seizedAssetsSnapshot) {
    return { ok: false, error: "assets_not_seized" };
  }

  const snapshot = account.seizedAssetsSnapshot;
  const oldState = {
    assetsSeized: Boolean(account.assetsSeized),
    carsCount: Object.keys(account.cars ?? {}).length
  };

  const updated = updateAccount(targetUserId, (current) => {
    current.assetsSeized = false;
    current.assetsSeizedReason = null;
    current.assetsSeizedBy = null;
    current.assetsSeizedAt = null;
    current.cars = structuredClone(snapshot.cars ?? {});
    current.resources = structuredClone(snapshot.resources ?? {});
    current.weapons = structuredClone(snapshot.weapons ?? {});
    current.seizedAssetsSnapshot = null;
    return current;
  });

  logAdministrativeAction("assets_seize_release", {
    actorUserId,
    targetUserId,
    sourceAction,
    reason,
    oldState,
    newState: {
      assetsSeized: Boolean(updated?.assetsSeized),
      carsCount: Object.keys(updated?.cars ?? {}).length
    }
  });

  return { ok: true, account: updated };
}

async function findGuildMemberByRobloxUsername(guild, robloxUsername) {
  const normalizedRoblox = normalizeLooseName(robloxUsername);
  if (!guild || !normalizedRoblox) {
    return null;
  }

  const matchesRobloxName = (candidate) => {
    if (!candidate?.user) {
      return false;
    }

    const displayName = normalizeLooseName(candidate.displayName);
    const username = normalizeLooseName(candidate.user.username);
    const globalName = normalizeLooseName(candidate.user.globalName);

    const displayWithoutPrefix = removeGuildMemberPrefix(candidate.displayName);
    const usernameWithoutPrefix = removeGuildMemberPrefix(candidate.user.username);
    const globalWithoutPrefix = removeGuildMemberPrefix(candidate.user.globalName);

    return [
      displayName,
      username,
      globalName,
      displayWithoutPrefix,
      usernameWithoutPrefix,
      globalWithoutPrefix
    ].some((value) => value === normalizedRoblox);
  };

  const cachedMatch = guild.members.cache.find(matchesRobloxName);
  if (cachedMatch) {
    return cachedMatch;
  }

  const searchedCollection =
    await guild.members.search?.({ query: String(robloxUsername).trim(), limit: 10 }).catch(() => null)
    || await guild.members.fetch?.({ query: String(robloxUsername).trim(), limit: 10 }).catch(() => null);

  if (searchedCollection?.size) {
    const searchedMatch = searchedCollection.find(matchesRobloxName);
    if (searchedMatch) {
      return searchedMatch;
    }
  }

  const linkedAccount = findAccountByRobloxUsername(robloxUsername);
  if (linkedAccount?.discordUserId) {
    const linkedMember = await guild.members.fetch(linkedAccount.discordUserId).catch(() => null);
    if (linkedMember) {
      return linkedMember;
    }
  }

  return null;
}

function findAccountsOwningVehicle(vehicleName) {
  const normalizedVehicleName = normalizeVehicleName(vehicleName);
  if (!normalizedVehicleName) {
    return [];
  }

  return Object.values(allAccounts())
    .filter((account) => account?.discordUserId && userOwnsVehicle(account.discordUserId, vehicleName))
    .filter(Boolean);
}

function normalizeRobloxUsernameForOwnership(value) {
  return String(value || "")
    .trim()
    .split(":")[0]
    .replace(/\s+/g, "")
    .replace(/[^a-zA-Z0-9_]/g, "")
    .toLowerCase();
}

function robloxUsernamesMatchForOwnership(left, right) {
  const normalizedLeft = normalizeRobloxUsernameForOwnership(left);
  const normalizedRight = normalizeRobloxUsernameForOwnership(right);

  if (!normalizedLeft || !normalizedRight) {
    return false;
  }

  return normalizedLeft === normalizedRight
    || normalizedLeft.includes(normalizedRight)
    || normalizedRight.includes(normalizedLeft);
}

function robloxUsernamesStrictlyMatchForOwnership(left, right) {
  const normalizedLeft = normalizeRobloxUsernameForOwnership(left);
  const normalizedRight = normalizeRobloxUsernameForOwnership(right);

  if (!normalizedLeft || !normalizedRight) {
    return false;
  }

  return normalizedLeft === normalizedRight;
}

function findAccountByRobloxUsernameForOwnership(robloxUsername) {
  const directMatch = findAccountByRobloxUsername(robloxUsername);
  if (directMatch?.discordUserId) {
    return directMatch;
  }

  const normalizedTarget = normalizeRobloxUsernameForOwnership(robloxUsername);
  if (!normalizedTarget) {
    return null;
  }

  return Object.values(allAccounts()).find((account) =>
    account?.discordUserId
    && robloxUsernamesStrictlyMatchForOwnership(account.robloxUsername, normalizedTarget)
  ) ?? null;
}

async function resolveLinkedVehicleOwnerAccount(guild, ownerUsername, vehicleName) {
  let linkedAccount = findAccountByRobloxUsernameForOwnership(ownerUsername);
  if (linkedAccount?.discordUserId) {
    return {
      account: linkedAccount,
      confident: true,
      matchSource: "roblox_account_link"
    };
  }

  const linkedMember = await findGuildMemberByRobloxUsername(guild, ownerUsername).catch(() => null);
  if (linkedMember?.id) {
    linkedAccount = getAccount(linkedMember.id);
    if (linkedAccount?.discordUserId && robloxUsernamesStrictlyMatchForOwnership(linkedAccount.robloxUsername, ownerUsername)) {
      return {
        account: linkedAccount,
        confident: true,
        matchSource: "guild_member_link"
      };
    }

    if (linkedAccount?.discordUserId && userOwnsVehicle(linkedAccount.discordUserId, vehicleName)) {
      const previousRobloxUsername = String(linkedAccount.robloxUsername || "").trim();
      if (previousRobloxUsername && !robloxUsernamesStrictlyMatchForOwnership(previousRobloxUsername, ownerUsername)) {
        updateAccount(linkedAccount.discordUserId, (current) => {
          current.robloxUsername = ownerUsername;
          return current;
        });
        linkedAccount = getAccount(linkedAccount.discordUserId) || linkedAccount;
      }

      return {
        account: linkedAccount,
        confident: true,
        matchSource: "guild_member_vehicle_owner"
      };
    }
  }

  const vehicleOwners = findAccountsOwningVehicle(vehicleName);
  const matchedVehicleOwner = vehicleOwners.find((account) =>
    robloxUsernamesStrictlyMatchForOwnership(account.robloxUsername, ownerUsername)
  );

  if (matchedVehicleOwner?.discordUserId) {
    return {
      account: matchedVehicleOwner,
      confident: true,
      matchSource: "vehicle_owner_exact"
    };
  }

  if (vehicleOwners.length === 1) {
    const singleOwner = vehicleOwners[0];
    if (linkedMember?.id && singleOwner?.discordUserId === linkedMember.id) {
      return {
        account: singleOwner,
        confident: true,
        matchSource: "guild_member_single_vehicle_owner"
      };
    }

    return {
      account: singleOwner,
      confident: false,
      matchSource: "single_owner_fallback"
    };
  }

  return {
    account: null,
    confident: false,
    matchSource: "unresolved"
  };
}

function memberHasServiceHold(member) {
  return member?.roles?.cache?.has(config.serviceHoldRoleId);
}

async function ensureNoServiceHold(interaction) {
  if (memberHasServiceHold(interaction.member)) {
    await interaction.reply({
      embeds: [
        buildPrivateNoticeEmbed({
          title: "⛔ لا تستطيع الشراء",
          description: "**عليك إيقاف خدمات حاليًا، لذلك لا يمكنك شراء الأسلحة أو الموارد حتى تتم المعالجة.**"
        })
      ],
      ephemeral: true
    });
    return false;
  }
  return true;
}

async function adjustBalance({ targetUserId, amount, operationType, actorId, reason }) {
  const account = getAccount(targetUserId);
  if (!account) {
    return { ok: false, error: "account_not_found" };
  }

  const isCredit = operationType === "manual_add";
  if (!isCredit && account.balance < amount) {
    return { ok: false, error: "insufficient_balance" };
  }

  const updated = updateAccount(targetUserId, (current) => {
    current.balance += isCredit ? amount : -amount;
    return current;
  });

  appendTransaction({
    discordUserId: targetUserId,
    robloxUsername: updated.robloxUsername,
    type: operationType,
    amount,
    direction: isCredit ? "credit" : "debit",
    balanceAfter: updated.balance,
    metadata: {
      actorId,
      reason
    }
  });

  return { ok: true, account: updated };
}

function getSalarySchedule(amount) {
  return { key: "weekly", label: "أسبوعي", intervalMs: 7 * 24 * 60 * 60 * 1000 };
}

function getHighestSalaryRole(member) {
  if (!member?.roles?.cache) {
    return null;
  }

  const matched = SALARY_ROLE_DEFINITIONS.filter((entry) => member.roles.cache.has(entry.roleId));
  if (!matched.length) {
    return null;
  }

  return matched.sort((left, right) => right.amount - left.amount)[0];
}

function getNextSalaryClaimText(account, roleId, amount) {
  const schedule = getSalarySchedule(amount);
  const lastClaim = account?.salaryClaims?.[roleId];
  if (!lastClaim) {
    return "";
  }

  const nextAt = new Date(lastClaim).getTime() + schedule.intervalMs;
  if (Number.isNaN(nextAt) || nextAt <= Date.now()) {
    return "";
  }

  return `<t:${Math.floor(nextAt / 1000)}:R>`;
}

function memberHasRoleById(member, roleId) {
  return Boolean(roleId) && member?.roles?.cache?.has(roleId);
}

function memberHasAnyRoleId(member, roleIds = []) {
  return Array.isArray(roleIds) && roleIds.some((roleId) => memberHasRoleById(member, roleId));
}

function canUseSlashCommands(member) {
  return memberHasRoleById(member, config.slashAccessRoleId);
}

function canManagePoliceBank(member) {
  return memberHasRoleById(member, POLICE_BANK_ROLE_ID);
}

function isAccountBankFrozen(account) {
  return Boolean(account?.bankFrozen);
}

async function sendPoliceBankLog(payload) {
  await sendAuditLog(client, POLICE_BANK_LOG_CHANNEL_ID, payload);
}

async function sendSystemLog(channelId, payload) {
  if (!channelId) {
    return;
  }

  await sendAuditLog(client, channelId, payload);
}

async function sendSystemLogs(channelIds, payload) {
  for (const channelId of [...new Set(channelIds.filter(Boolean))]) {
    await sendSystemLog(channelId, payload);
  }
}

function stringifyWebhookPayload(payload) {
  try {
    return JSON.stringify(payload ?? {}, null, 2);
  } catch {
    return JSON.stringify({ error: "payload_not_serializable" }, null, 2);
  }
}

function buildWebhookPayloadPreview(payloadString, maxLength = 1500) {
  if (payloadString.length <= maxLength) {
    return payloadString;
  }

  return `${payloadString.slice(0, maxLength)}\n... [TRUNCATED]`;
}

async function sendErlcEventWebhookToDiscord(payload, meta = {}) {
  const channelId = config.erlcEventWebhookChannelId;
  if (!channelId) {
    throw new Error("ERLC_EVENT_WEBHOOK_CHANNEL_ID is not configured.");
  }

  const channel = await client.channels.fetch(channelId).catch(() => null);
  if (!channel || typeof channel.send !== "function") {
    throw new Error("Configured ERLC event webhook channel is invalid or inaccessible.");
  }

  const payloadString = stringifyWebhookPayload(payload);
  const preview = buildWebhookPayloadPreview(payloadString);
  const eventType = String(
    meta.eventType ||
    payload?.eventType ||
    payload?.type ||
    payload?.event ||
    "unknown"
  ).trim() || "unknown";

  const attachment = new AttachmentBuilder(Buffer.from(payloadString, "utf8"), {
    name: `erlc-event-${Date.now()}.json`
  });

  await channel.send({
    content: [
      "🚨 **ER:LC Event Webhook**",
      `**النوع:** \`${eventType}\``,
      `**الوقت:** <t:${Math.floor(Date.now() / 1000)}:F>`,
      "",
      "```json",
      preview,
      "```"
    ].join("\n"),
    files: [attachment]
  });
}

function verifyErlcEventWebhookRequest(req) {
  const timestamp = String(req.headers["x-signature-timestamp"] || "").trim();
  const sigHex = String(req.headers["x-signature-ed25519"] || "").trim().toLowerCase();

  if (!timestamp || !sigHex || !/^[0-9a-f]+$/i.test(sigHex) || sigHex.length % 2 !== 0) {
    return false;
  }

  const rawBody = Buffer.isBuffer(req.rawBody) ? req.rawBody : Buffer.from("");
  const message = Buffer.concat([Buffer.from(timestamp, "utf8"), rawBody]);
  const signature = Buffer.from(sigHex, "hex");

  try {
    return verifySignature(null, message, ERLC_EVENT_WEBHOOK_PUBLIC_KEY, signature);
  } catch (error) {
    console.error("ER:LC event webhook signature verification failure:", error);
    return false;
  }
}

const FINE_PAYMENTS_LOG_CHANNEL_ID = "1498637248701403207";

async function sendFinePaymentLog(payload) {
  await sendAuditLog(client, FINE_PAYMENTS_LOG_CHANNEL_ID, payload);
}

async function sendRobberyAttemptLogs({
  robloxUsername,
  robberyType,
  success,
  reward = 0,
  account = null,
  updatedAccount = null,
  reason = "",
  location = "",
  sourceLabel = "robbery_webhook"
}) {
  const normalizedLabel = robberyType || "unknown";
  const baseFields = [
    { name: "🎮 **يوزر روبلوكس**", value: `**${robloxUsername || "غير معروف"}**`, inline: true },
    { name: "🧾 **نوع السرقة**", value: `**${getRobberyDisplayLabel(normalizedLabel)}**`, inline: true },
    { name: "📌 **النتيجة**", value: success ? "**ناجحة**" : "**فاشلة**", inline: true },
    { name: "📡 **المصدر**", value: `**${sourceLabel}**`, inline: true }
  ];

  if (account?.discordUserId) {
    baseFields.push({ name: "👤 **صاحب الحساب**", value: `**<@${account.discordUserId}>**`, inline: true });
    baseFields.push(buildBankAccountAuditField(updatedAccount || account));
  }

  if (reward > 0) {
    baseFields.push({ name: "💵 **المبلغ**", value: `**${formatCurrency(reward)}**`, inline: true });
  }

  if (updatedAccount) {
    baseFields.push({ name: "💳 **الرصيد الحالي**", value: `**${formatCurrency(updatedAccount.balance)}**`, inline: true });
  }

  if (reason) {
    baseFields.push({ name: "📝 **ملاحظة**", value: `**${reason}**`, inline: false });
  }

  if (location) {
    baseFields.push({ name: "📍 **الموقع**", value: `**${location}**`, inline: false });
  }

  const payload = {
    title: success ? "💰 **سرقة ناجحة داخل الماب**" : "🚨 **سرقة فاشلة داخل الماب**",
    description: success
      ? "**تم تسجيل سرقة ناجحة وتحويل مكافأتها إن كان الحساب مربوطًا.**"
      : "**تم تسجيل محاولة سرقة فاشلة داخل الماب.**",
    color: success ? 0x1f6b45 : 0x8d1111,
    fields: baseFields
  };

  await sendAuditLog(client, config.auditChannelId, payload);
}

async function ensurePoliceBankPermission(interaction) {
  if (canManagePoliceBank(interaction.member)) {
    return true;
  }

  await interaction.reply({
    embeds: [
      buildPrivateNoticeEmbed({
        title: "⛔ لا تملك الصلاحية",
        description: `**هذه الواجهة متاحة فقط لمن يملك الرتبة <@&${POLICE_BANK_ROLE_ID}>.**`
      })
    ],
    ephemeral: true
  });
  return false;
}

async function ensureBankServicesAvailable(interaction, account, actionLabel = "هذه الخدمة") {
  if (!isAccountBankFrozen(account)) {
    return true;
  }

  const payload = {
    embeds: [
      buildPrivateNoticeEmbed({
        title: "❄️ الحساب البنكي مجمّد",
        description: [
          `**لا يمكنك استخدام ${actionLabel} لأن حسابك البنكي مجمّد من قبل الحكومة.**`,
          account.bankFrozenReason ? `**السبب:** ${account.bankFrozenReason}` : "",
          "**للاستفسار توجه إلى مركز الشرطة.**"
        ].filter(Boolean).join("\n")
      })
    ],
    ephemeral: true
  };

  if (interaction.deferred || interaction.replied) {
    await interaction.editReply(payload).catch(() => null);
  } else {
    await interaction.reply(payload).catch(() => null);
  }
  return false;
}

function canManageMdtHold(member) {
  return memberHasRoleById(member, config.mdtHoldAccessRoleId);
}

function canManageBudget(member, budgetKey, action = "manage") {
  const definition = getBudgetDefinition(budgetKey);
  if (!definition) {
    return false;
  }

  if (action === "deposit" && definition.allowPublicDeposit) {
    return true;
  }

  return memberHasRoleById(member, definition.managerRoleId);
}

function getBudgetLabel(budgetKey) {
  return getBudgetDefinition(budgetKey)?.title || budgetKey;
}

async function ensureBudgetPermission(interaction, budgetKey, action = "manage") {
  if (canManageBudget(interaction.member, budgetKey, action)) {
    return true;
  }

  const definition = getBudgetDefinition(budgetKey);
  await safelyReply(interaction, {
    embeds: [
      buildPrivateNoticeEmbed({
        title: "⛔ لا تملك الصلاحية",
        description: `**هذه العملية متاحة فقط لمن يملك الرتبة <@&${definition?.managerRoleId}>.**`
      })
    ],
    ephemeral: true
  });
  return false;
}

function createBudgetAmountModal(budgetKey, action) {
  const titles = {
    deposit: "إضافة مال للميزانية",
    withdraw: "سحب مال من الميزانية"
  };

  return new ModalBuilder()
    .setCustomId(`modal_budget_amount:${budgetKey}:${action}`)
    .setTitle(titles[action] || "عملية على الميزانية")
    .addComponents(
      new ActionRowBuilder().addComponents(
        new TextInputBuilder()
          .setCustomId("budget_amount")
          .setLabel("المبلغ")
          .setStyle(TextInputStyle.Short)
          .setRequired(true)
      )
    );
}

function createBudgetTransferModal(budgetKey) {
  return new ModalBuilder()
    .setCustomId(`modal_budget_transfer:${budgetKey}`)
    .setTitle("تحويل من الميزانية")
    .addComponents(
      new ActionRowBuilder().addComponents(
        new TextInputBuilder()
          .setCustomId("target_user")
          .setLabel("ايدي أو منشن أو الاسم البنكي")
          .setStyle(TextInputStyle.Short)
          .setRequired(true)
      ),
      new ActionRowBuilder().addComponents(
        new TextInputBuilder()
          .setCustomId("transfer_amount")
          .setLabel("المبلغ")
          .setStyle(TextInputStyle.Short)
          .setRequired(true)
      )
    );
}

const pendingBudgetDrafts = new Map();
const pendingBudgetSourceMessages = new Map();
const pendingCraftingApprovals = new Map();
const activeCraftingChallenges = new Map();
const craftingChallengeTimeouts = new Map();
const CRAFTING_LEVEL1_ACCESS_ROLE_ID = "1499385728939987065";
const CRAFTING_LEVEL2_BEAST_USERNAME = "cricketfreaksz";
const CRAFTING_LEVEL2_EXTRACTION_DISPLAY_PRICE = 20_000;
const activeResourceMiniGames = new Map();
const activeResourceMiniGamesByUser = new Map();
const completedResourceMiniGamesByUser = new Map();
const resourceMiniGameCooldowns = new Map();
const resourceQuestionLastServedAt = new Map();
let resourceMiniGameStartCounter = 0;

const CRAFTING_CONFIRM_WORDS = new Set(["موافق", "ايوه", "اي", "yes", "ok", "okay"]);
const CRAFTING_DECLINE_WORDS = new Set(["غير موافق", "لا", "cancel", "رفض"]);
const recentCraftingQuestionIds = [];

const RESOURCE_DROP_RULES = {
  coal: { min: 4, max: 35, chance: 1, softCap: 20, highRollChance: 0.3 },
  copper: { min: 4, max: 35, chance: 1, softCap: 24, highRollChance: 0.2 },
  iron: { min: 3, max: 24, chance: 0.82, softCap: 18, highRollChance: 0.14 },
  plastic: { min: 3, max: 24, chance: 1, softCap: 18, highRollChance: 0.16 },
  aluminum: { min: 2, max: 18, chance: 0.3, softCap: 12, highRollChance: 0.16 },
  sulfur: { min: 1, max: 18, chance: 0.16, softCap: 11, highRollChance: 0.12 }
};
const RESOURCE_MINI_GAME_ROUNDS = 3;
const RESOURCE_MINI_GAME_COOLDOWN_MS = 5 * 60 * 1000;
const RESOURCE_QUESTION_USER_GAP = 5;

function shuffleArray(array) {
  const copy = [...array];
  for (let i = copy.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

function buildChoicesText(choices) {
  return choices.map((choice, index) => `${index + 1}. ${choice}`).join("\n");
}

function buildMcqQuestion({
  id,
  difficulty,
  prompt,
  correct,
  wrongs,
  timeLimitSec = 40,
  tutorial = "",
  category = "عام"
}) {
  const choices = shuffleArray([correct, ...wrongs]).slice(0, 4);
  return {
    id,
    category,
    type: "mcq",
    difficulty,
    timeLimitSec,
    tutorial,
    prompt: `${prompt}\n\n${buildChoicesText(choices)}`,
    choices,
    answers: [correct]
  };
}

function normalizeArabicKey(value) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .replace(/[ً-ٟ]/g, "")
    .replace(/[اأإآ]/g, "ا")
    .replace(/ة/g, "ه")
    .replace(/\s+/g, "");
}

function resolveResourceKeyInput(raw) {
  const normalized = normalizeArabicKey(raw);
  if (!normalized) {
    return "";
  }

  const aliases = {
    coal: "coal",
    فحم: "coal",
    الفحم: "coal",
    فح: "coal",
    copper: "copper",
    نحاس: "copper",
    النحاس: "copper",
    نح: "copper",
    iron: "iron",
    حديد: "iron",
    الحديد: "iron",
    حديدي: "iron",
    aluminum: "aluminum",
    aluminium: "aluminum",
    الومنيوم: "aluminum",
    الالمنيوم: "aluminum",
    ألمنيوم: "aluminum",
    المنيوم: "aluminum",
    الالومنيوم: "aluminum",
    الومنيوم: "aluminum",
    المني: "aluminum",
    sulfur: "sulfur",
    sulphur: "sulfur",
    كبريت: "sulfur",
    الكبريت: "sulfur",
    كبر: "sulfur",
    plastic: "plastic",
    بلاستيك: "plastic",
    البلاستيك: "plastic",
    بلاستك: "plastic",
    بلاست: "plastic"
  };

  if (aliases[normalized]) {
    return aliases[normalized];
  }

  const entries = Object.entries(aliases);
  const partialMatch = entries.find(([alias]) => normalized.includes(normalizeArabicKey(alias)) || normalizeArabicKey(alias).includes(normalized));
  return partialMatch?.[1] || "";
}

function buildButtonGame({
  id,
  category = "أزرار",
  difficulty = "سهل",
  instruction,
  buttons,
  timeLimitSec = 40,
  tutorial = "اقرأ المطلوب واضغط الزر المطابق فقط."
}) {
  const shuffledButtons = shuffleArray(buttons).map((button, index) => ({
    ...button,
    value: button.value || `btn_${index}`
  }));

  const correctButton = shuffledButtons.find((button) => button.correct);
  return {
    id,
    category,
    type: "button_game",
    difficulty,
    timeLimitSec,
    tutorial,
    instruction,
    buttons: shuffledButtons,
    correctValue: correctButton?.value || ""
  };
}

function buildResourceGamePool() {
  const pool = [];
  let counter = 0;
  const addGame = (category, instruction, buttons, options = {}) => {
    pool.push(buildButtonGame({
      id: `rg-${counter++}`,
      category,
      instruction,
      buttons,
      ...options
    }));
  };

  const colorButtons = [
    { label: "أخضر", emoji: "🟢", style: ButtonStyle.Success, value: "green" },
    { label: "أحمر", emoji: "🔴", style: ButtonStyle.Danger, value: "red" },
    { label: "أزرق", emoji: "🔵", style: ButtonStyle.Primary, value: "blue" },
    { label: "رمادي", emoji: "⚪", style: ButtonStyle.Secondary, value: "gray" }
  ];

  const symbolButtons = [
    { label: "نجمة", emoji: "⭐", style: ButtonStyle.Primary, value: "star" },
    { label: "درع", emoji: "🛡️", style: ButtonStyle.Secondary, value: "shield" },
    { label: "مفتاح", emoji: "🗝️", style: ButtonStyle.Success, value: "key" },
    { label: "جرس", emoji: "🔔", style: ButtonStyle.Danger, value: "bell" }
  ];

  const directionButtons = [
    { label: "يمين", emoji: "➡️", style: ButtonStyle.Primary, value: "right" },
    { label: "يسار", emoji: "⬅️", style: ButtonStyle.Secondary, value: "left" },
    { label: "أعلى", emoji: "⬆️", style: ButtonStyle.Success, value: "up" },
    { label: "أسفل", emoji: "⬇️", style: ButtonStyle.Danger, value: "down" }
  ];

  const actionButtons = [
    { label: "قفل", emoji: "🔒", style: ButtonStyle.Secondary, value: "lock" },
    { label: "فتح", emoji: "🔓", style: ButtonStyle.Success, value: "unlock" },
    { label: "إنذار", emoji: "🚨", style: ButtonStyle.Danger, value: "alarm" },
    { label: "مراقبة", emoji: "👁️", style: ButtonStyle.Primary, value: "watch" }
  ];

  const pairButtons = [
    { label: "حقيبة", emoji: "💼", style: ButtonStyle.Primary, value: "bag" },
    { label: "ملف", emoji: "📁", style: ButtonStyle.Secondary, value: "file" },
    { label: "صندوق", emoji: "📦", style: ButtonStyle.Success, value: "box" },
    { label: "بطاقة", emoji: "🪪", style: ButtonStyle.Danger, value: "card" }
  ];

  const colorTargets = [
    ["الزر الأخضر", "green"],
    ["الزر الأحمر", "red"],
    ["الزر الأزرق", "blue"],
    ["الزر الرمادي", "gray"]
  ];

  const symbolTargets = [
    ["النجمة", "star"],
    ["الدرع", "shield"],
    ["المفتاح", "key"],
    ["الجرس", "bell"]
  ];

  const directionTargets = [
    ["السهم اليمين", "right"],
    ["السهم اليسار", "left"],
    ["السهم الأعلى", "up"],
    ["السهم الأسفل", "down"]
  ];

  const actionTargets = [
    ["زر الفتح", "unlock"],
    ["زر القفل", "lock"],
    ["زر الإنذار", "alarm"],
    ["زر المراقبة", "watch"]
  ];

  const pairPrompts = [
    ["العنصر الذي يحفظ الأوراق", "file"],
    ["العنصر الذي يحمل الأغراض", "bag"],
    ["العنصر الذي يحفظ الأشياء المغلقة", "box"],
    ["العنصر الذي يعرّف الهوية", "card"]
  ];

  const colorTemplates = [
    "اضغط {target} الآن.",
    "اختر {target} بسرعة قبل انتهاء الوقت.",
    "في هذه الجولة المطلوب هو {target}.",
    "لا تضغط إلا {target}.",
    "اضغط اللون المطابق: {target}.",
    "حدد {target} فقط.",
    "اختر الزر الذي يحمل معنى {target}.",
    "هذه جولة ألوان: اضغط {target}.",
    "نفّذ التعليمات التالية: {target}.",
    "الزر الصحيح في هذه الجولة هو {target}.",
    "تحرك إلى {target} بالضغط عليه.",
    "حدد {target} من بين الألوان.",
    "اضغط {target} بدون تردد.",
    "اختر اللون المطلوب: {target}.",
    "ركز جيدًا ثم اضغط {target}.",
    "اضغط {target} فقط وتجنب البقية."
  ];

  const symbolTemplates = [
    "اضغط زر {target} فقط.",
    "حدد {target} من بين الأزرار التالية.",
    "هذه جولة رموز: اختر {target}.",
    "اضغط الرمز الصحيح وهو {target}.",
    "لا تضغط إلا {target}.",
    "اختر {target} مباشرة.",
    "الرمز المطلوب الآن هو {target}.",
    "حدد أيقونة {target}.",
    "اضغط {target} قبل انتهاء الوقت.",
    "ابحث عن {target} واضغطه.",
    "هذه الجولة تطلب {target}.",
    "اختر الزر الذي يمثل {target}.",
    "اضغط {target} فقط واترك الباقي.",
    "الجواب هنا هو {target}.",
    "نفّذ الجولة بالضغط على {target}.",
    "حدد الرمز الآتي: {target}."
  ];

  const directionTemplates = [
    "اختر {target}.",
    "اضغط {target} مباشرة.",
    "هذه جولة اتجاهات: اختر {target}.",
    "حدد {target} الآن.",
    "لا تضغط إلا {target}.",
    "السهم الصحيح هو {target}.",
    "اتجه إلى {target} بالضغط عليه.",
    "هذه التعليمات تطلب {target}.",
    "اضغط السهم الذي يمثل {target}.",
    "اختر {target} بسرعة.",
    "الجواب في هذه الجولة هو {target}.",
    "اضغط {target} فقط وتابع.",
    "حرك الاختيار نحو {target}.",
    "هذه مرحلة تحتاج {target}.",
    "حدد {target} من بين الاتجاهات.",
    "اختر السهم المطلوب: {target}."
  ];

  const actionTemplates = [
    "في هذه الجولة المطلوب هو {target}.",
    "نفّذ أمر {target} بالضغط على الزر الصحيح.",
    "حدد {target} الآن.",
    "اضغط الزر الذي يمثل {target}.",
    "هذه مرحلة إجراءات: اختر {target}.",
    "لا تضغط إلا {target}.",
    "المطلوب الفوري هو {target}.",
    "حدد إجراء {target}.",
    "اختر {target} مباشرة.",
    "الجولة الحالية تطلب {target}.",
    "اضغط {target} فقط ثم تابع.",
    "الزر الصحيح هنا هو {target}.",
    "نفّذ التعليمات التالية: {target}.",
    "حدد {target} من بين الأوامر.",
    "اختر إجراء {target}.",
    "لا تنس: المطلوب الآن {target}."
  ];

  const pairTemplates = [
    "اختر {target}.",
    "ما الزر الذي يمثل {target}؟",
    "هذه جولة مطابقة: اختر {target}.",
    "حدد {target} الآن.",
    "لا تضغط إلا الزر الذي يعني {target}.",
    "اختر العنصر المطابق لعبارة: {target}.",
    "ابحث عن الزر الذي يساوي {target}.",
    "الجواب الصحيح هو {target}.",
    "حدد {target} من بين العناصر.",
    "اختر {target} بسرعة.",
    "العنصر المطلوب في هذه الجولة هو {target}.",
    "اضغط الزر الذي يشير إلى {target}.",
    "ركز على العبارة التالية: {target}.",
    "المطابقة الصحيحة هنا هي {target}.",
    "اختر الزر المرتبط بـ {target}.",
    "حدد المقصود بهذه العبارة: {target}."
  ];

  const addTargetGames = (category, targets, buttons, templates) => {
    for (const [label, target] of targets) {
      for (const template of templates) {
        addGame(
          category,
          template.replaceAll("{target}", label),
          buttons.map((button) => ({ ...button, correct: button.value === target }))
        );
      }
    }
  };

  addTargetGames("ألوان", colorTargets, colorButtons, colorTemplates);
  addTargetGames("رموز", symbolTargets, symbolButtons, symbolTemplates);
  addTargetGames("اتجاهات", directionTargets, directionButtons, directionTemplates);
  addTargetGames("إجراءات", actionTargets, actionButtons, actionTemplates);
  addTargetGames("مطابقة", pairPrompts, pairButtons, pairTemplates);

  const mixedStages = [
    {
      category: "ألوان",
      instruction: "اضغط الزر الوحيد بلون الخطر.",
      buttons: colorButtons.map((button) => ({ ...button, correct: button.value === "red" }))
    },
    {
      category: "ألوان",
      instruction: "اضغط اللون الذي يدل غالبًا على السماح بالمرور.",
      buttons: colorButtons.map((button) => ({ ...button, correct: button.value === "green" }))
    },
    {
      category: "اتجاهات",
      instruction: "اضغط السهم الذي يشير للعودة.",
      buttons: directionButtons.map((button) => ({ ...button, correct: button.value === "left" }))
    },
    {
      category: "إجراءات",
      instruction: "إذا كان المطلوب فتح الطريق، فأي زر تختار؟",
      buttons: actionButtons.map((button) => ({ ...button, correct: button.value === "unlock" }))
    },
    {
      category: "رموز",
      instruction: "اضغط الرمز الذي يفيد الحماية.",
      buttons: symbolButtons.map((button) => ({ ...button, correct: button.value === "shield" }))
    },
    {
      category: "مطابقة",
      instruction: "اختر العنصر الأكثر شبهًا بالحافظة الشخصية.",
      buttons: pairButtons.map((button) => ({ ...button, correct: button.value === "card" }))
    }
  ];

  for (const stage of mixedStages) {
    addGame(stage.category, stage.instruction, stage.buttons);
  }

  return pool;
}

const RESOURCE_GAME_POOL = buildResourceGamePool();

function buildResourceMiniGameSession(userId) {
  const pickedIds = new Set();
  const questions = [];
  const pickedCategories = new Set();
  const sessionOrder = ++resourceMiniGameStartCounter;

  const eligibleQuestions = shuffleArray(
    RESOURCE_GAME_POOL.filter((question) => {
      const lastServedAt = resourceQuestionLastServedAt.get(question.id);
      if (typeof lastServedAt !== "number") {
        return true;
      }

      return sessionOrder - lastServedAt > RESOURCE_QUESTION_USER_GAP;
    })
  );

  for (const question of eligibleQuestions) {
    if (questions.length >= RESOURCE_MINI_GAME_ROUNDS) {
      break;
    }

    if (pickedIds.has(question.id) || pickedCategories.has(question.category)) {
      continue;
    }

    pickedIds.add(question.id);
    pickedCategories.add(question.category);
    questions.push(question);
  }

  if (questions.length < RESOURCE_MINI_GAME_ROUNDS) {
    const fallbackQuestions = shuffleArray(RESOURCE_GAME_POOL);

    for (const question of fallbackQuestions) {
      if (questions.length >= RESOURCE_MINI_GAME_ROUNDS) {
        break;
      }

      if (pickedIds.has(question.id)) {
        continue;
      }

      pickedIds.add(question.id);
      questions.push(question);
    }
  }

  for (const question of questions) {
    resourceQuestionLastServedAt.set(question.id, sessionOrder);
  }

  return {
    userId,
    round: 0,
    totalRounds: RESOURCE_MINI_GAME_ROUNDS,
    questions: questions.filter((question) =>
      question &&
      question.id &&
      Array.isArray(question.buttons) &&
      question.buttons.length > 0 &&
      typeof question.correctValue !== "undefined"
    )
  };
}

function createCraftingLevelMenu() {
  return new ActionRowBuilder().addComponents(
    new StringSelectMenuBuilder()
      .setCustomId("crafting_level_select")
      .setPlaceholder("اختر مستوى طاولة التصنيع")
      .addOptions(
        new StringSelectMenuOptionBuilder()
          .setLabel(CRAFTING_TABLE_LEVELS.level1.label)
          .setDescription("سعرها 15,000 ريال وتفتح تصنيع الأسلحة الأساسية")
          .setValue(CRAFTING_TABLE_LEVELS.level1.key),
        new StringSelectMenuOptionBuilder()
          .setLabel(CRAFTING_TABLE_LEVELS.level2.label)
          .setDescription("فتحها يتم عبر الاستخراج والملفات السرية داخل الخاص")
          .setValue(CRAFTING_TABLE_LEVELS.level2.key),
        new StringSelectMenuOptionBuilder()
          .setLabel(CRAFTING_TABLE_LEVELS.level2upgraded.label)
          .setDescription("يتطلب المستوى الثاني + لغز تطوير خاص بقيمة 30,000 ريال")
          .setValue(CRAFTING_TABLE_LEVELS.level2upgraded.key),
        new StringSelectMenuOptionBuilder()
          .setLabel(CRAFTING_TABLE_LEVELS.level3.label)
          .setDescription("لا يفتح إلا بعد المستوى الثاني المطور ومخطوطات جونز مارك")
          .setValue(CRAFTING_TABLE_LEVELS.level3.key),
        new StringSelectMenuOptionBuilder()
          .setLabel("🔄 ريفريش")
          .setDescription("تحديث واجهة طاولة التصنيع")
          .setValue("refresh")
      )
  );
}

function createCraftingWeaponMenu(levelKey = "level1") {
  const weapons = getCraftingWeaponsForLevel(levelKey);
  return new ActionRowBuilder().addComponents(
    new StringSelectMenuBuilder()
      .setCustomId(`crafting_weapon_select:${levelKey}`)
      .setPlaceholder("اختر السلاح الذي تريد تصنيعه")
      .addOptions(
        ...weapons.map((weapon) =>
          new StringSelectMenuOptionBuilder()
            .setLabel(weapon.label)
            .setDescription(`${weapon.cash.toLocaleString("en-US")} ريال + موارد`)
            .setValue(weapon.key)
        ),
        ...(levelKey === "level2"
          ? [
              new StringSelectMenuOptionBuilder()
                .setLabel("تطوير الطاولة")
                .setDescription("السعر 30,000 ريال • يفتح ملف خاص في الخاص")
                .setValue("upgrade_level2")
            ]
          : []),
        ...(levelKey === "level3"
          ? [
              new StringSelectMenuOptionBuilder()
                .setLabel("تطوير المستوى الثالث")
                .setDescription("مغلق إلى أن نجد مخطوطات جونز مارك")
                .setValue("upgrade_locked_level3")
            ]
          : []),
        new StringSelectMenuOptionBuilder()
          .setLabel("🔄 Refresh")
          .setDescription("تحديث شكلي للواجهة")
          .setValue("refresh")
      )
  );
}

function buildCraftingHomeEmbed(account) {
  const currentLevel = Number(account?.crafting?.tableLevel || 0);
  return applyCraftingImage(new EmbedBuilder()
    .setColor(0x0c1f3f)
    .setTitle("🛠️ طاولة التصنيع")
    .setDescription([
      "**هذه الواجهة مخصصة لشراء طاولات التصنيع وصناعة الأسلحة من المستوى المسموح لك.**",
      "",
      "**📋 التعليمات:**",
      "• المستوى الأول متاح للشراء مباشرة",
      "• من نفس المنيو بالأسفل اختر `طاولة تصنيع مستوى ثان` لبدء ملفها الخاص",
      "• بعد فتح المستوى الثاني يمكنك الدخول إلى `طاولة تصنيع مستوى ثان مطور` وتطويرها مقابل 30,000 ريال",
      "• المستوى الثالث لا يفتح إلا بعد إتمام المستوى الثاني المطور وملف جونز مارك",
      "• الشراء لا يمكن استرداده بعد الموافقة النهائية",
      "• اختبار الشراء يتم في الخاص ويعاد بعد 10 دقائق عند الرسوب",
      "",
      `**📈 مستواك الحالي:** ${currentLevel > 0 ? `المستوى ${currentLevel}` : "لا تملك أي طاولة حتى الآن"}`
    ].join("\n"))
    .setFooter({ text: "Arab World • طاولة التصنيع" })
    .setTimestamp());
}

function buildCraftingLevelEmbed(levelKey, account) {
  const level = CRAFTING_TABLE_LEVELS[levelKey];
  const currentLevel = Number(account?.crafting?.tableLevel || 0);
  const level2QuestStage = account?.crafting?.level2Quest?.stage || "idle";
  const level2UpgradeStage = account?.crafting?.level2Upgrade?.stage || "idle";
  const level3QuestStage = account?.crafting?.level3Quest?.stage || "idle";
  const level3WaitingUntil = account?.crafting?.level3Quest?.waitingUntil || null;

  if (levelKey === "level1" && currentLevel >= 1) {
    const availableWeapons = getCraftingWeaponsForLevel(levelKey);
    return applyCraftingImage(new EmbedBuilder()
      .setColor(0x0c1f3f)
      .setTitle(`🧰 أهلاً بك في ${level.label}`)
      .setDescription([
        "**أنت تملك هذا المستوى بالفعل، ويمكنك الآن استخدام طاولة التصنيع الخاصة بك.**",
        "",
        "**✨ مميزات هذا المستوى:**",
        "• السلاح المتاح في هذا المستوى: **M9 فقط**",
        "• السلاح المصنوع من هذا المستوى **لا ينكسر ولا تنتهي صلاحيته**",
        "• لا يظهر فيه **Colt** نهائيًا",
        "",
        "**📦 متطلبات التصنيع الحالية:**",
        ...availableWeapons.map((weapon) => `• ${weapon.label}: ${weapon.cash.toLocaleString("en-US")} ريال + الموارد المطلوبة`)
      ].join("\n"))
      .setFooter({ text: "Arab World • تصنيع المستوى الأول" })
      .setTimestamp());
  }

  if (levelKey === "level2" && currentLevel >= 2) {
    const availableWeapons = getCraftingWeaponsForLevel(levelKey);
    return applyCraftingImage(new EmbedBuilder()
      .setColor(0x111111)
      .setTitle("☠️ طاولة تصنيع مستوى ثان")
      .setDescription([
        "**مرحبًا بك في المستوى الثاني من طاولة التصنيع.**",
        "",
        ...availableWeapons.map((weapon) => `• ${weapon.label}: ${weapon.cash.toLocaleString("en-US")} ريال + الموارد المطلوبة`),
        "",
        "**🔷 تطوير الطاولة:**",
        `• السعر: **${CRAFTING_TABLE_LEVELS.level2upgraded.price.toLocaleString("en-US")} ريال**`,
        level2UpgradeStage === "completed"
          ? "• الحالة: **تم التطوير بالفعل**"
          : level2UpgradeStage === "puzzle_sent"
            ? "• الحالة: **تم إرسال اللغز إلى الخاص**"
            : "• الحالة: **جاهز للتطوير**"
      ].join("\n"))
      .setFooter({ text: "Arab World • تصنيع المستوى الثاني" })
      .setTimestamp());
  }

  if (levelKey === "level2upgraded") {
    if (level2UpgradeStage === "completed") {
      const availableWeapons = getCraftingWeaponsForLevel(levelKey);
      return applyCraftingImage(new EmbedBuilder()
        .setColor(0x0c1f3f)
        .setTitle("🔷 طاولة تصنيع مستوى ثان مطور")
        .setDescription([
          "**تم تطوير الطاولة بنجاح.**",
          "",
          ...availableWeapons.map((weapon) => `• ${weapon.label}: ${weapon.cash.toLocaleString("en-US")} ريال + الموارد المطلوبة`),
          "",
          "**📉 ملاحظة الجودة:** أسلحة هذا المستوى مؤقتة، وكل **4 قتلات** تنقص **1%** من الجودة.",
          "",
          "**هذا المستوى يفتح لك ملف المستوى الثالث.**"
        ].join("\n"))
        .setFooter({ text: "Arab World • المستوى الثاني المطور" })
        .setTimestamp());
    }

    return applyCraftingImage(new EmbedBuilder()
      .setColor(0x0c1f3f)
      .setTitle("🔷 تطوير طاولة المستوى الثاني")
      .setDescription([
        `**سعر التطوير:** ${CRAFTING_TABLE_LEVELS.level2upgraded.price.toLocaleString("en-US")} ريال`,
        "",
        "**المتطلبات:**",
        "• امتلاك المستوى الثاني",
        "• حل ملف جونز مارك في الخاص",
        "",
        "**المكافآت:**",
        "• Tec-9",
        "• COLT PYTHON",
        "• KRISS VECTOR"
      ].join("\n"))
      .setFooter({ text: "Arab World • تطوير المستوى الثاني" })
      .setTimestamp());
  }

  if (levelKey === "level2") {
    return applyCraftingImage(new EmbedBuilder()
      .setColor(0x111111)
      .setTitle("☠️ استخراج طاولة تصنيع مستوى ثان")
      .setDescription([
        `**السعر المعلن داخل الملف:** ${level.price.toLocaleString("en-US")} ريال`,
        `**رسوم مسار الاستخراج الحالية:** ${CRAFTING_LEVEL2_EXTRACTION_DISPLAY_PRICE.toLocaleString("en-US")} ريال`,
        "",
        "**لا يتم خصم أي مبلغ تلقائيًا من البوت في هذا المسار.**",
        "**بدل ذلك سيتم فتح مسار ألغاز واستخراج خاص داخل الخاص.**",
        "",
        "**الحالة الحالية:**",
        level2QuestStage === "completed"
          ? "• **تم إنهاء الاستخراج بنجاح**"
          : level2QuestStage === "stage2_sent"
            ? "• **المخطوطة الثانية أُرسلت لك وبقي الرقم النهائي**"
            : level2QuestStage === "stage1_location_confirmed"
              ? "• **تم اعتماد الموقع وبقي الرقم المطلوب**"
              : level2QuestStage === "stage1_sent"
                ? "• **تم إرسال الملف الأول**"
                : "• **المسار لم يبدأ بعد**"
      ].join("\n"))
      .setFooter({ text: "Arab World • ملف المنجم الأسود" })
      .setTimestamp());
  }

  if (levelKey === "level3") {
    if (level3QuestStage === "waiting") {
      return buildCraftingLevel3WaitingEmbed(level3WaitingUntil);
    }

    if (hasLevel3CraftingAccess(account)) {
      const availableWeapons = getCraftingWeaponsForLevel(levelKey);
      return applyCraftingImage(new EmbedBuilder()
        .setColor(0x08162d)
        .setTitle("⚔️ طاولة تصنيع مستوى ثالث")
        .setDescription([
          "**تم فتح المستوى الثالث.**",
          "",
          ...availableWeapons.map((weapon) => `• ${weapon.label}: ${weapon.cash.toLocaleString("en-US")} ريال + الموارد المطلوبة`),
          "",
          "**📉 ملاحظة الجودة:** أسلحة هذا المستوى مؤقتة، وكل **5 قتلات** تنقص **1%** من الجودة.",
          "",
          "**🔒 تطوير المستوى الثالث:** مغلق إلى أن نجد مخطوطات جونز مارك."
        ].join("\n"))
        .setFooter({ text: "Arab World • المستوى الثالث" })
        .setTimestamp());
    }

    return applyCraftingImage(new EmbedBuilder()
      .setColor(0x08162d)
      .setTitle("📜 ملف طاولة المستوى الثالث")
      .setDescription([
        "**لا يمكنك فتح هذا المستوى إلا بعد امتلاك المستوى الثاني المطور.**",
        "",
        level3QuestStage === "puzzle_sent"
          ? "• **تم إرسال اللغز إلى الخاص وبانتظار الرمز**"
          : "• **ملف المستوى الثالث لم يبدأ بعد**",
        "",
        "**عند النجاح:** يبدأ تصنيع الطاولة لمدة **3 أيام**."
      ].join("\n"))
      .setFooter({ text: "Arab World • ملف المستوى الثالث" })
      .setTimestamp());
  }

  return applyCraftingImage(new EmbedBuilder()
    .setColor(0x0c1f3f)
    .setTitle(`🛠️ ${level.label}`)
    .setDescription([
      `**القيمة:** ${level.price.toLocaleString("en-US")} ريال`,
      "",
      "**📌 تنبيهات:**",
      "• لا يوجد استرداد بعد الشراء",
      "• يجب اجتياز اختبار في الخاص قبل إتمام الشراء",
      "• الإعادة بعد عشر دقائق عند الرسوب أو انتهاء الوقت",
      "",
      "**إذا وافقت على بدء العملية، راقب رسائلك الخاصة من البوت.**"
    ].join("\n"))
    .setFooter({ text: "Arab World • شراء طاولة تصنيع" })
    .setTimestamp());
}

function buildCraftingStartButtons(levelKey) {
  return new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId(`crafting_begin_purchase:${levelKey}`)
      .setLabel("🛒 بدء الشراء")
      .setStyle(ButtonStyle.Success),
    new ButtonBuilder()
      .setCustomId(`crafting_cancel_purchase:${levelKey}`)
      .setLabel("✖️ إلغاء")
      .setStyle(ButtonStyle.Danger)
  );
}

function buildCraftingPurchaseConfirmButtons(levelKey) {
  return new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId(`crafting_confirm_purchase:${levelKey}`)
      .setLabel("✅ موافق")
      .setStyle(ButtonStyle.Success),
    new ButtonBuilder()
      .setCustomId(`crafting_cancel_purchase:${levelKey}`)
      .setLabel("✖️ غير موافق")
      .setStyle(ButtonStyle.Danger)
  );
}

function buildCraftingApprovalButtons(levelKey) {
  return new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId(`crafting_dm_approve:${levelKey}`)
      .setLabel("✅ موافق")
      .setStyle(ButtonStyle.Success),
    new ButtonBuilder()
      .setCustomId(`crafting_dm_decline:${levelKey}`)
      .setLabel("✖️ غير موافق")
      .setStyle(ButtonStyle.Danger)
  );
}

function buildCraftingWeaponEmbed(weaponKey) {
  const weapon = CRAFTABLE_WEAPONS[weaponKey];
  const weaponImage = getCraftingWeaponImageConfig(weaponKey);
  const resourcesText = Object.entries(weapon.resources)
    .filter(([, amount]) => Number(amount) > 0)
    .map(([key, amount]) => `• ${RESOURCE_CATALOG[key].label}: ${amount}`)
    .join("\n");

  const embed = applyCraftingImage(new EmbedBuilder()
    .setColor(0x0c1f3f)
    .setTitle(`🔧 تصنيع ${weapon.label}`)
    .setDescription([
      `**💰 السعر النقدي:** ${weapon.cash.toLocaleString("en-US")} ريال`,
      "",
      "**📦 الموارد المطلوبة:**",
      resourcesText,
      "",
      "**✅ يجب الضغط على زر التأكيد قبل تنفيذ التصنيع.**",
      "",
      weapon.permanent
        ? "**🛡️ النوع:** دائم • الجودة تبقى ممتلئة دائمًا"
        : "**📉 النوع:** مؤقت • الجودة تبدأ من 100% وتنخفض مع القتلات حتى ينكسر السلاح",
      "",
      "**تنبيه:** لا يوجد استرداد بعد تأكيد التصنيع.**"
    ].join("\n"))
    .setFooter({ text: "Arab World • تصنيع الأسلحة" })
    .setTimestamp());

  if (weaponImage) {
    embed.setThumbnail(`attachment://${weaponImage.attachmentName}`);
  }

  return embed;
}

function buildCraftingWeaponButtons(weaponKey) {
  return new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId(`crafting_confirm_weapon:${weaponKey}`)
      .setLabel("🔨 تصنيع")
      .setStyle(ButtonStyle.Success),
    new ButtonBuilder()
      .setCustomId(`crafting_cancel_weapon:${weaponKey}`)
      .setLabel("✖️ إلغاء")
      .setStyle(ButtonStyle.Danger)
  );
}

function buildCraftingLevel2ExtractionButtons() {
  return new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId("crafting_level2_begin_extraction")
      .setLabel("☠️ استخراج طاولة مستوى ثاني")
      .setStyle(ButtonStyle.Primary),
    new ButtonBuilder()
      .setCustomId("crafting_level2_status")
      .setLabel("📜 حالة الملف")
      .setStyle(ButtonStyle.Secondary)
  );
}

function buildCraftingLevel2UpgradeButtons() {
  return new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId("crafting_level2_upgrade_begin")
      .setLabel("🔷 تطوير الطاولة")
      .setStyle(ButtonStyle.Primary)
  );
}

function buildCraftingLevel3StartButtons() {
  return new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId("crafting_level3_begin")
      .setLabel("📜 بدء ملف المستوى الثالث")
      .setStyle(ButtonStyle.Primary)
  );
}

function buildCraftingLevel2FinalButtons() {
  return new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId("crafting_level2_submit_code")
      .setLabel("🔐 وضع الرقم")
      .setStyle(ButtonStyle.Success)
  );
}

function createCraftingLevel2CodeModal() {
  return new ModalBuilder()
    .setCustomId("modal_crafting_level2_final_code")
    .setTitle("الرمز النهائي للمنجم الأسود")
    .addComponents(
      new ActionRowBuilder().addComponents(
        new TextInputBuilder()
          .setCustomId("final_code")
          .setLabel("اكتب الرقم المستخرج من المخطوطة")
          .setPlaceholder("مثال: 244")
          .setStyle(TextInputStyle.Short)
          .setRequired(true)
      )
    );
}

function getCraftingLevel2FirstPuzzleText() {
  return [
    "☠ BLACK HORIZON // OBSIDIAN GATE PROTOCOL v130 ☠",
    "UNKNOWN CORE PUZZLE",
    "[ ENTRY FIELD — FRACTURE STREAM ]",
    "",
    "1188",
    "1190",
    "1191",
    "1192",
    "1193",
    "1194",
    "1195",
    "1196",
    "1197",
    "1198",
    "1199",
    "1200",
    "1201",
    "1202",
    "1203",
    "1204",
    "1205",
    "1206",
    "1207",
    "1208",
    "1209",
    "1210",
    "1211",
    "1212",
    "888",
    "999",
    "404",
    "808",
    "1337",
    "700",
    "400",
    "910",
    "921",
    "842",
    "12003",
    "12004",
    "12100",
    "13000",
    "1717",
    "1818",
    "1919",
    "2020",
    "3030",
    "4040",
    "5050",
    "6060",
    "7070",
    "",
    "RULE:",
    "“ليس كل ما يظهر جزءًا من النظام… بعضه مجرد انعكاس لإرباك الإدراك”",
    "",
    "[ LAYER 1 — FALSE STRUCTURES ]",
    "",
    "PATH A:",
    "777 → 1337 → 808 → 404",
    "",
    "PATH B:",
    "400 → 700 → 842 → 910",
    "",
    "PATH C:",
    "999 → 888 → 777 → 999",
    "",
    "PATH D:",
    "12003 → 12004 → 12100 → 13000",
    "",
    "كلها تؤدي إلى:",
    "",
    "███ DEAD SIGNAL ███",
    "",
    "[ LAYER 2 — DISTORTION KEYS ]",
    "",
    "910 = صدى",
    "921 = انكسار",
    "842 = فجوة",
    "700 = فقدان",
    "400 = انهيار",
    "777 = ضوضاء",
    "888 = تكرار",
    "1337 = خداع",
    "",
    "⚠ هذه إشارات وليست جزءًا من الحل",
    "",
    "[ LAYER 3 — CORE ANOMALY ]",
    "",
    "يوجد داخل النظام:",
    "",
    "تسلسل غير مكتمل",
    "يتكرر بشكل غير مباشر",
    "ويحتوي على فجوة بين حالتين ثابتتين",
    "",
    "لكن:",
    "",
    "“النظام لا يعرض هذه الحالات بشكل مباشر”",
    "",
    "[ LAYER 4 — ALIGNMENT SIGNAL ]",
    "",
    "إذا أزيلت الضوضاء بالكامل:",
    "",
    "يبقى نمط واحد فقط:",
    "",
    "قيم متقاربة",
    "فرق ثابت",
    "مسار غير منقطع جزئيًا",
    "",
    "لكن:",
    "",
    "“النمط لا يظهر في سطر واحد كامل”",
    "",
    "[ LAYER 5 — WALL PROTOCOL ]",
    "",
    "███ OBSIDIAN WALL ███",
    "",
    "لا يفتح عبر:",
    "",
    "الجمع",
    "الطرح",
    "أول أو آخر عنصر",
    "أو أي مسار وهمي ظاهر",
    "",
    "لأن:",
    "",
    "“كل حل مباشر هو فخ”",
    "",
    "[ LAYER 6 — FINAL RULE ]",
    "",
    "يوجد:",
    "",
    "نقطة بداية",
    "نقطة نهاية",
    "وبينهما منطقة غير مسماة",
    "",
    "هذه المنطقة:",
    "ليست رقمًا",
    "وليست نتيجة",
    "بل “مكان داخل النظام”",
    "انا الظلام الدامس ابتلع الشمس ولا يظهر لها اثر داخلي .",
    "العامل يصرخ و المعدن يطرق ",
    "ل الليل هو ظلامي ع,نتحرك بالخفاة ر المخيف",
    "لا نترك احد ولا دم في هذا ب المكان المظلم .",
    "حيث يصرخ العامل و نتهب المال و بداخله شخص لا يعرف الرحمه فمن يجده يجد المخطوطه و من يتأخر عنه يغيب شمسه و يصبح مأمورا",
    "و من يجد الكنز فقد اصبح اثرى الاثريا",
    "انا بين الرقمين المخفيان في اعماق الجوف انا لا ارى ",
    "ولن اظهر A=0 B=3 ان وجدتني نلت كنزي ...",
    "نهايتي صفر و نهايه اخي 3",
    "نحن الكنز المخفي الذي يبتلعه الجبل ",
    "حل اللغز ثم ستجدني في اعماق الجبال",
    "ليس كل شي هو المفتاح للكنز بل الغموض .",
    "☠ FINAL LOCK ☠",
    "",
    "داخل هذا المكان يوجد:",
    "",
    "المطلوب . ايجاد المكان و قتل الوحش داخله",
    "███████████",
    "☠ END FILE ☠"
  ].join("\n");
}

function getCraftingLevel2SecondPuzzleText() {
  return [
    "📜 مخطوطة المنجم الأسود – “صوت جونز مارك تحت الأرض”",
    "",
    "“المنجم لا يكتب الماضي… بل يعيد ترتيبه كلما قرأه أحد.”",
    "",
    "🕳️ الجزء الأول: الليلة التي دخل فيها جونز مارك",
    "",
    "في 03 / 11 / 1897، كانت السماء فوق المنجم بلا قمر، وكأن الضوء نفسه قرر ألا يشهد ما سيحدث.",
    "",
    "شهود القرية قالوا إن جونز مارك لم يكن يمشي مثل البشر عند دخوله البوابة الحجرية، بل كان يتوقف كل عدة خطوات، كأنه يسمع شيئاً لا يسمعه غيره.",
    "",
    "أحدهم قال:",
    "",
    "“كان يعدّ خطواته بصمت… ثم يتوقف… ثم يكمل وكأن الرقم الذي يبحث عنه لم يظهر بعد.”",
    "",
    "في تلك الليلة، سُجل في دفتر الحارس:",
    "",
    "“02:44… دخل الرجل دون أن يطرق الباب.",
    "لكن الباب أغلق بعده بثلاث لحظات كأن شيئاً آخر مرّ.”",
    "",
    "ثم اختفى الدفتر من السجل في اليوم التالي.",
    "",
    "🕳️ الجزء الثاني: ما كتبه الجدار لاحقاً",
    "",
    "بعد أيام من الاختفاء، بدأ العمال يسمعون أصواتاً داخل المنجم… ليست أصوات صدى، بل كأن الجدران تتحدث بأرقام مكسورة.",
    "",
    "أحد العمال كتب في تقريره قبل أن يختفي:",
    "",
    "“الرقم لا يظهر كاملاً… لكنه يتكرر بطريقة غريبة…",
    "أراه في الخطوات، في الهواء، في الطرق على الحجر.”",
    "",
    "وفي نفس الصفحة ظهرت كلمات محفورة حديثاً، رغم أن أحداً لم يكن داخل المنجم:",
    "",
    "“الذي دخل لم يكن واحداً… بل كان سلسلة.”",
    "",
    "🕯️ الجزء الثالث: رسالة من الداخل (غير موقعة)",
    "",
    "في عمق النفق الثالث، وُجدت ورقة محترقة الأطراف، مكتوب عليها:",
    "",
    "“أنا لم أعد أعرف أين ينتهي صوتي وأين يبدأ الحجر.”",
    "",
    "ثم تكمل:",
    "",
    "“كل مرة أظن أنني وصلت إلى النهاية…",
    "أسمع نفس الإيقاع يعود، لكن ليس بنفس الشكل.”",
    "",
    "وفي الهامش، علامات غير مفهومة:",
    "",
    "نبض يتكرر في الجدار عند كل توقف",
    "صوت خطوات يتكرر بشكل غير منتظم",
    "فراغات في النص وكأن شيئاً “محى” أجزاء معينة",
    "",
    "ثم جملة أخيرة:",
    "",
    "“ما يتكرر ليس صدفة… بل محاولة من شيء لا يريد أن يُنسى.”",
    "",
    "🪨 الجزء الرابع: الحارس الأخير",
    "",
    "الحارس الجديد، الذي تم تعيينه بعد اختفاء الأول، كتب في مذكرته:",
    "",
    "“المنجم لا يهدأ ليلاً… بل يبدأ حين يظن الجميع أنه هادئ.”",
    "",
    "وقال:",
    "",
    "“سمعت اسمي يُنطق من داخل الجدار، لكن بصوت يشبه عدّاً ناقصاً.”",
    "",
    "ثم في يومه الثالث، كتب:",
    "",
    "“كل باب في المنجم يؤدي لنفس المكان، لكن بعدد خطوات مختلف.”",
    "",
    "وفي آخر سطر له قبل الاختفاء:",
    "",
    "“إذا كنت أقرأ هذا الآن، فهذا يعني أنني وصلت إلى نفس النقطة التي وصل إليها مارك.”",
    "",
    "🕳️ الجزء الخامس: الجدار الذي يتذكر",
    "",
    "بعد سنوات، فريق مسح دخل المنطقة.",
    "",
    "لم يجدوا شيئاً… إلا جداراً واحداً عليه خدوش متكررة.",
    "",
    "أحد الباحثين قال:",
    "",
    "“الخدوش ليست عشوائية… هناك نمط يتكرر… لكن ليس مكتملًا.”",
    "",
    "ثم أضاف:",
    "",
    "“كأن شيئاً يحاول أن يكتب رقماً… لكنه يُمنع عند آخر لحظة.”",
    "",
    "وفي التسجيل الصوتي للفريق، يمكن سماع صوت معدني خافت يشبه العدّ:",
    "",
    "“مرة… ثم توقف… ثم مرتين… ثم توقف أطول… ثم يعود من جديد…”",
    "",
    "🧠 الجزء السادس: ملاحظة جونز مارك (قبل النهاية)",
    "",
    "آخر قطعة وُجدت منسوبة لجونز مارك، مكتوبة بخط متغير:",
    "",
    "“المنجم لا يخفي الأشياء… بل يجزئها ليجعلها غير مرئية.”",
    "",
    "ثم:",
    "",
    "“إذا جمعت كل ما يبدو متكررًا… وتجاهلت كل ما يبدو عشوائيًا…",
    "ستكتشف أن الرسالة لم تكن يوماً كاملة على الورق.”",
    "",
    "وفي آخر السطر:",
    "",
    "“أنا لم أترك رقمًا واحدًا… بل تركت أثره موزعاً في كل ما قرأت.”",
    "",
    "المطلوب تطلع الرقم من القصه ",
    "تلميح = Nothing"
  ].join("\n");
}

function getCraftingLevel2FinalCode() {
  return "3424";
}

function getCraftingLevel2UpgradeFinalCode() {
  return "79435";
}

function getCraftingLevel3FinalCode() {
  return "17281";
}

function createCraftingLevel2UpgradeCodeModal() {
  return new ModalBuilder()
    .setCustomId("modal_crafting_level2_upgrade_code")
    .setTitle("رمز تطوير المستوى الثاني")
    .addComponents(
      new ActionRowBuilder().addComponents(
        new TextInputBuilder()
          .setCustomId("final_code")
          .setLabel("اكتب الرقم الصحيح")
          .setPlaceholder("مثال: 79435")
          .setStyle(TextInputStyle.Short)
          .setRequired(true)
      )
    );
}

function createCraftingLevel3CodeModal() {
  return new ModalBuilder()
    .setCustomId("modal_crafting_level3_code")
    .setTitle("رمز طاولة المستوى الثالث")
    .addComponents(
      new ActionRowBuilder().addComponents(
        new TextInputBuilder()
          .setCustomId("final_code")
          .setLabel("اكتب الرقم المستخرج من المخطوطة")
          .setPlaceholder("مثال: 17281")
          .setStyle(TextInputStyle.Short)
          .setRequired(true)
      )
    );
}

function buildCraftingLevel2UpgradeFinalButtons() {
  return new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId("crafting_level2_upgrade_submit_code")
      .setLabel("🔐 إدخال الرقم")
      .setStyle(ButtonStyle.Success)
  );
}

function buildCraftingLevel3FinalButtons() {
  return new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId("crafting_level3_submit_code")
      .setLabel("🔐 إدخال الرقم")
      .setStyle(ButtonStyle.Success)
  );
}

function buildCraftingLevel2UpgradePuzzleText() {
  return [
    "في شتاء عام 2007، ضربت عاصفة قوية السواحل الشمالية لمدينة “درافيك”، المدينة التي كانت تُعرف بأنها أخطر مركز لتهريب السلاح في أوروبا الشرقية.",
    "",
    "في تلك الليلة تحديدًا، انقطع الاتصال بالكامل مع الميناء القديم.",
    "",
    "لا إشارات،",
    "لا كاميرات،",
    "لا سفن خرجت،",
    "ولا حتى حرس الحدود استطاعوا الاقتراب بسبب الضباب الكثيف.",
    "",
    "لكن الشيء الذي أخاف الحكومة لم يكن العاصفة…",
    "",
    "بل الاسم المرتبط بالميناء.",
    "",
    "اسم",
    "جونز مارك",
    "",
    "الرجل الذي كانت المخابرات تسميه:",
    "",
    "“التاجر الذي لا يترك أثرًا.”",
    "",
    "جونز مارك لم يكن مجرد مهرب أسلحة.",
    "",
    "كان يملك:",
    "",
    "مصانع سرية،",
    "أنفاق تحت المدن،",
    "جيوش مرتزقة،",
    "وشبكة سوداء لبيع الأسلحة المسروقة من الحروب.",
    "",
    "ويقال إن لديه كنزًا ضخمًا مخفيًا منذ أكثر من 20 سنة.",
    "",
    "ليس ذهبًا فقط…",
    "",
    "بل خرائط، حسابات سرية، وأسماء أشخاص يمكن أن تسقط حكومات كاملة.",
    "",
    "لكن المشكلة أن أحدًا لم يصل إليه.",
    "",
    "كل من حاول العثور على كنز جونز مارك اختفى.",
    "",
    "بعضهم وُجد ميتًا.",
    "",
    "وبعضهم لم يُرَ مرة أخرى.",
    "",
    "ليلة المداهمة",
    "",
    "بعد أشهر من التتبع، اكتشفت الشرطة موقعًا سريًا تحت الميناء القديم.",
    "",
    "نفق طويل مخفي خلف مستودع صدئ.",
    "",
    "في الساعة 2:13 فجرًا، دخلت فرقة خاصة مكونة من 11 رجلًا.",
    "",
    "كان النفق ضيقًا جدًا، والرطوبة تغطي الجدران.",
    "",
    "كل عدة أمتار كانت تظهر علامات غريبة مكتوبة بالطلاء الأحمر:",
    "",
    "X",
    "II",
    "7",
    "؟",
    "III",
    "",
    "بشكل عشوائي.",
    "",
    "أحد الجنود قال:",
    "",
    "“يمكن مجرد علامات تهريب.”",
    "",
    "لكن قائد الفريق لم يقتنع.",
    "",
    "لأن كل علامة كانت موضوعة بعناية شديدة.",
    "",
    "وكأنها رسالة.",
    "",
    "الغرفة الأولى",
    "",
    "بعد المشي لعدة دقائق، وصلوا إلى غرفة حديدية صغيرة.",
    "",
    "في الداخل:",
    "",
    "مكتب خشبي قديم،",
    "ساعة متوقفة عند 5:57،",
    "وخمس أوراق معلقة على الحائط.",
    "",
    "وفوق الأوراق جملة كبيرة:",
    "",
    "“الناس دائمًا تنظر للرقم الخطأ.”",
    "",
    "على الطاولة كان هناك مسدس صدئ… لكن بدون رصاص.",
    "",
    "وكأن أحدًا أراد تخويف من يدخل فقط.",
    "",
    "الورقة الأولى",
    "",
    "كانت مليئة بأرقام مرتبة بشكل غريب:",
    "",
    "17",
    "27",
    "37",
    "47",
    "57",
    "",
    "لكن الرقم 57 كان عليه خط خفيف جدًا، بالكاد يُرى.",
    "",
    "الورقة الثانية",
    "",
    "91",
    "92",
    "93",
    "94",
    "95",
    "",
    "لكن الرقم 94 كان مكتوبًا بحبر أغمق من البقية.",
    "",
    "الورقة الثالثة",
    "",
    "204",
    "304",
    "404",
    "504",
    "604",
    "",
    "لكن الرقم 404 كان داخل دائرة حمراء.",
    "",
    "الورقة الرابعة",
    "",
    "13",
    "23",
    "33",
    "43",
    "53",
    "",
    "لكن الرقم 33 كان مائلًا قليلًا.",
    "",
    "الورقة الخامسة",
    "",
    "21",
    "75",
    "85",
    "95",
    "15",
    "25",
    "",
    "لكن الرقم 95 كان بعيدًا عن بقية الأرقام، في زاوية الورقة.",
    "",
    "وتحته جملة صغيرة جدًا:",
    "",
    "“آخر رقم دائمًا يختبئ وحده.”",
    "",
    "الحقيقة",
    "",
    "جونز مارك لم يخفِ الرقم داخل معادلات.",
    "",
    "بل أخفاه بطريقة نفسية.",
    "",
    "في كل ورقة كان هناك رقم واحد يحاول لفت الانتباه:",
    "",
    "مشطوب،",
    "أغمق،",
    "داخل دائرة،",
    "مائل،",
    "أو معزول.",
    "",
    "والمطلوب ليس الرقم الكامل… بل خذوا الرقم #####",
    "",
    "الرقم النهائي مكوّن من أول خانة ملفتة في كل ورقة بالترتيب.",
    "",
    "اكتب الرقم هنا مباشرة أو من الزر بالأسفل."
  ].join("\n");
}

function buildCraftingLevel3PuzzleText() {
  return [
    "بعد اختفاء جونز مارك بسنوات، ظهر صندوق معدني مغلق داخل نفق جانبي لم يكن موجودًا في خرائط الميناء.",
    "",
    "الصندوق لم يحتوِ ذهبًا ولا سلاحًا.",
    "بل احتوى خمس بطاقات سوداء، وعلى كل بطاقة أرقام تبدو عشوائية، لكن كل بطاقة كانت تحمل أثرًا واحدًا فقط يدل على خانة مخفية.",
    "",
    "فوق البطاقات كانت هناك جملة قصيرة:",
    "",
    "“من يقرأ النمط سيضيع، ومن يقرأ الندبة سيصل.”",
    "",
    "البطاقة الأولى:",
    "11",
    "12",
    "13",
    "17",
    "18",
    "وفي أسفلها الرقم 17 عليه حرق خفيف عند الزاوية اليمنى.",
    "",
    "البطاقة الثانية:",
    "61",
    "71",
    "72",
    "73",
    "74",
    "وكان الرقم 72 وحده فوق خطٍ رفيع كأنه وُضع لاحقًا.",
    "",
    "البطاقة الثالثة:",
    "22",
    "27",
    "32",
    "42",
    "52",
    "لكن الرقم 22 لم يكن الأوضح… بل 27 كان مائلًا ومزاحًا قليلًا عن السطر.",
    "",
    "البطاقة الرابعة:",
    "84",
    "85",
    "86",
    "87",
    "88",
    "والرقم 88 داخل مربع باهت يكاد لا يظهر إلا مع الضوء.",
    "",
    "البطاقة الخامسة:",
    "01",
    "11",
    "21",
    "31",
    "41",
    "وكان الرقم 21 فقط محاطًا بنقطتين صغيرتين من الحبر الأسود.",
    "",
    "في ظهر آخر بطاقة وُجدت ملاحظة:",
    "",
    "“لا تجمع الأرقام.",
    "لا تبحث عن المتتاليات.",
    "ولا تسأل لماذا الأعداد قريبة من بعضها.",
    "اسأل فقط: أي رقم تعمّد أحدهم أن يترك عليه أثرًا؟”",
    "",
    "ثم سطر أخير:",
    "",
    "“الرقم الذي تبحث عنه لا يُقرأ من الورقة… بل من الإصابات فوق الورقة.”",
    "",
    "استخرج الخانات الملفتة من كل بطاقة بالترتيب، ثم أرسل الرمز النهائي."
  ].join("\n");
}

function splitLongDiscordText(text, maxLength = 1800) {
  const normalizedText = String(text || "").replace(/\r\n/g, "\n");
  if (!normalizedText) {
    return [];
  }

  const lines = normalizedText.split("\n");
  const chunks = [];
  let currentChunk = "";

  for (const line of lines) {
    const candidate = currentChunk ? `${currentChunk}\n${line}` : line;
    if (candidate.length <= maxLength) {
      currentChunk = candidate;
      continue;
    }

    if (currentChunk) {
      chunks.push(currentChunk);
      currentChunk = "";
    }

    if (line.length <= maxLength) {
      currentChunk = line;
      continue;
    }

    let remaining = line;
    while (remaining.length > maxLength) {
      chunks.push(remaining.slice(0, maxLength));
      remaining = remaining.slice(maxLength);
    }
    currentChunk = remaining;
  }

  if (currentChunk) {
    chunks.push(currentChunk);
  }

  return chunks;
}

async function sendLongCraftingPuzzleText(user, title, text) {
  const chunks = splitLongDiscordText(text, 1750);
  for (let index = 0; index < chunks.length; index += 1) {
    const chunk = chunks[index];
    await user.send({
      content: `**${title} • الجزء ${index + 1}/${chunks.length}**\n\`\`\`\n${chunk}\n\`\`\``
    }).catch(() => null);
  }
}

async function sendCraftingLevel2FirstPuzzle(userId) {
  const user = await client.users.fetch(userId).catch(() => null);
  if (!user) {
    return false;
  }

  await user.send({
    embeds: [
      new EmbedBuilder()
        .setColor(0x111111)
        .setTitle("☠ BLACK HORIZON // OBSIDIAN GATE PROTOCOL v130 ☠")
        .setDescription([
          "**تم فتح ملف الاستخراج الأول.**",
          "**المطلوب أولًا:** أرسل اسم الموقع الصحيح هنا في الخاص.",
          "**أمثلة مقبولة:** `المنجم` أو `منجم` أو `منجم الجبل`."
        ].join("\n"))
        .setFooter({ text: "Arab World • ملف المنجم الأسود" })
        .setTimestamp()
    ],
    files: getCraftingImageFiles()
  }).catch(() => null);

  await sendLongCraftingPuzzleText(
    user,
    "BLACK HORIZON",
    getCraftingLevel2FirstPuzzleText()
  );

  await user.send("**بعد تحديد الموقع الصحيح سأطلب منك الرقم/المدى المطلوب من نفس الملف.**").catch(() => null);
  return true;
}

async function sendCraftingLevel2SecondPuzzle(userId, sourceLabel = "بعد حل الملف الأول") {
  const user = await client.users.fetch(userId).catch(() => null);
  if (!user) {
    return false;
  }

  await user.send({
    embeds: [
      new EmbedBuilder()
        .setColor(0x111111)
        .setTitle("📜 مخطوطة المنجم الأسود")
        .setDescription([
          `**تم فتح المخطوطة الثانية ${sourceLabel ? `(${sourceLabel})` : ""}.**`,
          "**وصلتك الآن المخطوطة الثانية. استخرج الرقم الصحيح ثم اضغط الزر بالأسفل لإدخاله.**"
        ].join("\n"))
        .setFooter({ text: "Arab World • الملف الثاني" })
        .setTimestamp()
    ],
    components: [buildCraftingLevel2FinalButtons()]
  }).catch(() => null);

  await sendLongCraftingPuzzleText(
    user,
    "مخطوطة المنجم الأسود",
    getCraftingLevel2SecondPuzzleText()
  );

  await user.send("**لو ما اشتغل زر وضع الرقم:** أرسل الرقم النهائي هنا مباشرة في الخاص وسأتحقق منه تلقائيًا.").catch(() => null);
  return true;
}

async function sendCraftingLevel2UpgradePuzzle(userId) {
  const user = await client.users.fetch(userId).catch(() => null);
  if (!user) {
    return false;
  }

  await user.send({
    embeds: [
      new EmbedBuilder()
        .setColor(0x0c1f3f)
        .setTitle("🧩 تطوير طاولة المستوى الثاني")
        .setDescription([
          "**بدأ ملف تطوير الطاولة بنجاح.**",
          "**اقرأ القصة جيدًا ثم استخرج الرقم النهائي.**",
          `**السعر الذي تم خصمه:** ${CRAFTING_TABLE_LEVELS.level2upgraded.price.toLocaleString("en-US")} ريال`
        ].join("\n"))
        .setFooter({ text: "Arab World • تطوير المستوى الثاني" })
        .setTimestamp()
    ],
    components: [buildCraftingLevel2UpgradeFinalButtons()]
  }).catch(() => null);

  await sendLongCraftingPuzzleText(user, "جونز مارك", buildCraftingLevel2UpgradePuzzleText());
  await user.send("**إذا لم يعمل الزر، أرسل الرقم النهائي هنا مباشرة.**").catch(() => null);
  return true;
}

async function sendCraftingLevel3Puzzle(userId) {
  const user = await client.users.fetch(userId).catch(() => null);
  if (!user) {
    return false;
  }

  await user.send({
    embeds: [
      new EmbedBuilder()
        .setColor(0x08162d)
        .setTitle("📜 ملف طاولة المستوى الثالث")
        .setDescription([
          "**تم فتح ملف جونز مارك الخاص بالمستوى الثالث.**",
          "**استخرج الرمز النهائي من القصة، ثم أرسله هنا.**",
          "**عند النجاح ستدخل الطاولة في مرحلة تصنيع مدتها 3 أيام.**"
        ].join("\n"))
        .setFooter({ text: "Arab World • المستوى الثالث" })
        .setTimestamp()
    ],
    components: [buildCraftingLevel3FinalButtons()]
  }).catch(() => null);

  await sendLongCraftingPuzzleText(user, "مخطوطات جونز مارك", buildCraftingLevel3PuzzleText());
  await user.send("**إذا لم يعمل الزر، أرسل الرقم هنا مباشرة.**").catch(() => null);
  return true;
}

async function finalizeCraftingLevel2Unlock(userId) {
  const account = requireAccount(userId);
  const currentStage = account?.crafting?.level2Quest?.stage || "idle";
  if (!account || currentStage !== "stage2_sent") {
    return { ok: false, error: "stage_not_ready" };
  }

  updateAccount(userId, (current) => {
    current.crafting ??= {};
    current.crafting.tableLevel = Math.max(Number(current.crafting.tableLevel || 0), 2);
    current.crafting.level2Quest ??= {};
    current.crafting.level2Quest.stage = "completed";
    current.crafting.level2Quest.completedAt = new Date().toISOString();
    return current;
  });

  const guild = await client.guilds.fetch(config.guildId).catch(() => null);
  const member = guild ? await guild.members.fetch(userId).catch(() => null) : null;
  await member?.roles.add(CRAFTING_LEVEL2_ACCESS_ROLE_ID).catch(() => null);

  await sendAuditLog(client, config.auditChannelId, {
    title: "☠️ **فتح طاولة تصنيع مستوى ثان**",
    description: "**تم إنهاء مسار الاستخراج السري وفتح المستوى الثاني داخل النظام.**",
    fields: [
      { name: "👤 **العضو**", value: `**<@${userId}>**`, inline: true },
      { name: "📦 **المستوى المفتوح**", value: "**طاولة تصنيع مستوى ثان**", inline: true },
      { name: "🪪 **الرتبة**", value: `**${CRAFTING_LEVEL2_ACCESS_ROLE_ID}**`, inline: true }
    ]
  });

  return { ok: true };
}

async function finalizeCraftingLevel2UpgradeUnlock(userId) {
  const account = requireAccount(userId);
  const currentStage = account?.crafting?.level2Upgrade?.stage || "idle";
  if (!account || currentStage !== "puzzle_sent") {
    return { ok: false, error: "stage_not_ready" };
  }

  updateAccount(userId, (current) => {
    current.crafting ??= {};
    current.crafting.tableLevel = Math.max(Number(current.crafting.tableLevel || 0), 2);
    current.crafting.level2Upgrade ??= {};
    current.crafting.level2Upgrade.stage = "completed";
    current.crafting.level2Upgrade.completedAt = new Date().toISOString();
    return current;
  });

  return { ok: true };
}

async function finalizeCraftingLevel3Start(userId) {
  const account = requireAccount(userId);
  const currentStage = account?.crafting?.level3Quest?.stage || "idle";
  if (!account || currentStage !== "puzzle_sent") {
    return { ok: false, error: "stage_not_ready" };
  }

  const waitingUntil = new Date(Date.now() + (3 * 24 * 60 * 60 * 1000)).toISOString();
  updateAccount(userId, (current) => {
    current.crafting ??= {};
    current.crafting.level3Quest ??= {};
    current.crafting.level3Quest.stage = "waiting";
    current.crafting.level3Quest.waitingUntil = waitingUntil;
    return current;
  });

  return { ok: true, waitingUntil };
}

function buildCraftingLevel2UnlockedEmbed() {
  return new EmbedBuilder()
    .setColor(0xd4a017)
    .setTitle("✨ تهانينا، تم فتح طاولة تصنيع المستوى الثاني")
    .setDescription([
      "**أكملت ملف المنجم الأسود بنجاح.**",
      `**تم منحك رتبة الوصول:** <@&${CRAFTING_LEVEL2_ACCESS_ROLE_ID}>`,
      "**يمكنك الآن الدخول إلى طاولة المستوى الثاني وتصنيع الأسلحة المتاحة فيها.**",
      "",
      "**افتح تذكرة إذا احتجت استكمال أي إجراءات تنظيمية إضافية.**"
    ].join("\n"))
    .setFooter({ text: "Arab World • المستوى الثاني" })
    .setTimestamp();
}

function buildCraftingLevel2UpgradeUnlockedEmbed() {
  return new EmbedBuilder()
    .setColor(0x0c1f3f)
    .setTitle("🔷 تم فتح تطوير الطاولة المستوى الثاني")
    .setDescription("**تطورت الطاولة بنجاح، ويمكنك الآن استخدام طاولة المستوى الثاني المطورة وتصنيع الأسلحة الجديدة.**")
    .setFooter({ text: "Arab World • المستوى الثاني المطور" })
    .setTimestamp();
}

function buildCraftingLevel3WaitingEmbed(waitingUntil) {
  const ts = waitingUntil ? Math.floor(new Date(waitingUntil).getTime() / 1000) : null;
  return new EmbedBuilder()
    .setColor(0x0c1f3f)
    .setTitle("🏗️ يتم تصنيع طاولة المستوى الثالث")
    .setDescription([
      "**تم حل اللغز بنجاح وبدأ تصنيع طاولة المستوى الثالث.**",
      ts ? `**الانتهاء المتوقع:** <t:${ts}:R>` : "**مدة الانتظار:** 3 أيام",
      "",
      "**عد بعد انتهاء المدة ليتم فتح المستوى الثالث لك تلقائيًا.**"
    ].join("\n"))
    .setFooter({ text: "Arab World • المستوى الثالث" })
    .setTimestamp();
}

function buildResourcesHomeEmbed(account) {
  return new EmbedBuilder()
    .setColor(0x0c1f3f)
    .setTitle("⛏️ مركز الموارد")
    .setDescription([
      "**واجهة الموارد الميدانية داخل Arab World.**",
      "",
      "**من هنا يمكنك إدارة مخزونك والدخول إلى تحديات الجمع وتحويل الموارد بشكل مرتب وسريع.**",
      "",
      "**الخدمات المتاحة:**",
      "• تجميع الموارد عبر ميني قيم متعددة المراحل",
      "• شراء الموارد من متجر منظم",
      "• عرض المخزون الحالي بالتفصيل",
      "• تحويل الموارد إلى لاعب آخر مباشرة"
    ].join("\n"))
    .addFields(
      {
        name: "📦 مسار الاستخدام",
        value: "ابدأ من القائمة بالأسفل ثم اختر بين الجمع أو الشراء أو التحويل أو عرض الممتلكات.",
        inline: false
      },
      {
        name: "🧭 ملاحظة",
        value: "المكافآت والخيارات داخل المركز تظهر بشكل منظم خطوة بخطوة لسهولة المتابعة.",
        inline: false
      }
    )
    .setImage(RESOURCE_EMBED_IMAGE_URL)
    .setFooter({ text: "Arab World • مركز الموارد" })
    .setTimestamp();
}

function createResourcesMainMenu() {
  return new ActionRowBuilder().addComponents(
    new StringSelectMenuBuilder()
      .setCustomId("resources_main_menu")
      .setPlaceholder("اختر خدمة الموارد")
      .addOptions(
        new StringSelectMenuOptionBuilder()
          .setLabel("تجميع الموارد")
          .setDescription("ميني قيم عشوائية بأزرار وجوائز حسب الندرة")
          .setValue("gather"),
        new StringSelectMenuOptionBuilder()
          .setLabel("شراء الموارد")
          .setDescription("افتح متجر الموارد المنظم للشراء")
          .setValue("shop"),
        new StringSelectMenuOptionBuilder()
          .setLabel("ممتلكاتي")
          .setDescription("عرض مخزونك الحالي من الموارد")
          .setValue("inventory"),
        new StringSelectMenuOptionBuilder()
          .setLabel("تحويل موارد")
          .setDescription("أرسل موردًا إلى لاعب آخر من مخزونك")
          .setValue("transfer")
      )
  );
}

function createResourceShopMenu() {
  return new ActionRowBuilder().addComponents(
    new StringSelectMenuBuilder()
      .setCustomId("resource_shop_menu")
      .setPlaceholder("اختر المورد الذي تريد شراءه")
      .addOptions(
        ...Object.values(RESOURCE_CATALOG).map((resource) =>
          new StringSelectMenuOptionBuilder()
            .setLabel(`${resource.label}`)
            .setDescription(`${resource.price.toLocaleString("en-US")} ريال للوحدة`)
            .setValue(resource.key)
        ),
        new StringSelectMenuOptionBuilder()
          .setLabel("عرض ممتلكاتي")
          .setDescription("عرض الكميات الحالية من جميع الموارد")
          .setValue("inventory")
      )
  );
}

function buildResourceGatherEmbed(question, round = 1, totalRounds = RESOURCE_MINI_GAME_ROUNDS) {
  const seconds = Number(question.timeLimitSec || 40);
  return new EmbedBuilder()
    .setColor(0x0c1f3f)
    .setTitle(`🎯 ميني قيم الموارد • ${question.difficulty}`)
    .setDescription([
      `**المرحلة:** ${round}/${totalRounds}`,
      `**⏱️ وقت الإجابة:** ${seconds} ثانية`,
      "**أمامك ثلاث ألعاب متتالية، ويجب الفوز فيها كلها حتى تستلم المكافأة النهائية.**",
      question.tutorial ? `**🧩 طريقة الحل:** ${question.tutorial}` : "",
      "",
      `**اللعبة الحالية:** ${question.instruction}`
    ].filter(Boolean).join("\n"))
    .setImage(RESOURCE_EMBED_IMAGE_URL)
    .setFooter({ text: "Arab World • تجميع الموارد" })
    .setTimestamp();
}

function createResourceGatherButtons(questionId, question) {
  const buttons = question.buttons.map((button) => {
    const builtButton = new ButtonBuilder()
      .setCustomId(`resource_gather_answer:${questionId}:${button.value}`)
      .setLabel(String(button.label || "زر").slice(0, 80))
      .setStyle(button.style || ButtonStyle.Primary);

    if (button.emoji) {
      builtButton.setEmoji(button.emoji);
    }

    return builtButton;
  });

  const rows = [];
  for (let i = 0; i < buttons.length; i += 4) {
    rows.push(new ActionRowBuilder().addComponents(...buttons.slice(i, i + 4)));
  }
  return rows;
}

function rollResourceRewards() {
  const rewards = {};

  for (const [resourceKey, rule] of Object.entries(RESOURCE_DROP_RULES)) {
    if (Math.random() > rule.chance) {
      continue;
    }

    const softCap = Number(rule.softCap || rule.max);
    const canHighRoll = softCap < rule.max;
    const useHighRange = canHighRoll && Math.random() < Number(rule.highRollChance || 0);
    const rangeMin = useHighRange ? softCap + 1 : rule.min;
    const rangeMax = useHighRange ? rule.max : softCap;
    const amount = rangeMin + Math.floor(Math.random() * (rangeMax - rangeMin + 1));

    if (amount > 0) {
      rewards[resourceKey] = amount;
    }
  }

  if (!Object.keys(rewards).length) {
    rewards.coal = 1 + Math.floor(Math.random() * 6);
  }

  return rewards;
}

function buildResourceRewardDmEmbed(rewards) {
  const lines = Object.entries(rewards)
    .sort((left, right) => right[1] - left[1])
    .map(([key, amount]) => `• ${RESOURCE_CATALOG[key].emoji} ${RESOURCE_CATALOG[key].label}: **${amount}**`);

  return new EmbedBuilder()
    .setColor(0x0c1f3f)
    .setTitle("🎁 غنائم ميني قيم الموارد")
    .setDescription([
      "**أحسنت، تم اجتياز الميني قيم بنجاح.**",
      "",
      "**الموارد التي حصلت عليها:**",
      ...lines
    ].join("\n"))
    .setImage(RESOURCE_EMBED_IMAGE_URL)
    .setFooter({ text: "Arab World • مكافآت الموارد" })
    .setTimestamp();
}

function buildResourceRoundPassedEmbed(round, totalRounds) {
  return new EmbedBuilder()
    .setColor(0x0c1f3f)
    .setTitle("✅ تم اجتياز الجولة")
    .setDescription([
      `**أحسنت، أنهيت الجولة ${round} من ${totalRounds} بنجاح.**`,
      round < totalRounds
        ? "**استعد للجولة التالية الآن، والخسارة في أي جولة تنهي التحدي كاملًا.**"
        : "**أكملت جميع الجولات المطلوبة بنجاح.**"
    ].join("\n"))
    .setImage(RESOURCE_EMBED_IMAGE_URL)
    .setFooter({ text: "Arab World • تقدم التحدي" })
    .setTimestamp();
}

function normalizeCraftingAnswer(value) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .replace(/[ً-ٟ]/g, "")
    .replace(/[اأإآ]/g, "ا")
    .replace(/ة/g, "ه")
    .replace(/\s+/g, " ");
}

function normalizeDigitsToAscii(value) {
  return String(value || "")
    .replace(/[٠-٩]/g, (digit) => String("٠١٢٣٤٥٦٧٨٩".indexOf(digit)))
    .replace(/[۰-۹]/g, (digit) => String("۰۱۲۳۴۵۶۷۸۹".indexOf(digit)));
}

function isCraftingLevel2LocationAnswer(value) {
  const normalized = normalizeCraftingAnswer(value);
  return normalized === "المنجم"
    || normalized === "منجم"
    || normalized === "منجم الجبل"
    || normalized.includes("منجم الجبل")
    || normalized.includes("المنجم")
    || normalized.includes("منجم");
}

function isCraftingLevel2RangeAnswer(value) {
  const normalized = normalizeDigitsToAscii(normalizeCraftingAnswer(value));
  return normalized.includes("1200") || normalized.includes("1203");
}

function pickRandom(array) {
  return array[Math.floor(Math.random() * array.length)];
}

function buildCrimeQuestionPools() {
  const easy = [];
  const medium = [];
  const hard = [];
  const evidenceItems = [
    ["البصمات", "بودرة البصمات", ["السماعات", "حزام الأمان", "طفاية الحريق"]],
    ["الحمض النووي", "عينة بيولوجية", ["موقف السيارات", "اسم الحي", "طلاء الجدار"]],
    ["أثر الحذاء", "القالب الجبسي", ["الممحاة", "الولاعة", "الدرج"]],
    ["بقايا الطلقات", "مختبر المقذوفات", ["طاولة الاستقبال", "كابل الشحن", "النافورة"]],
    ["ألياف القماش", "الميكروسكوب الجنائي", ["مصباح السقف", "حارس البوابة", "لوحة الكهرباء"]],
    ["الكاميرات", "غرفة المراقبة", ["باب السطح", "اسم السائق", "لون الجدار"]]
  ];

  let counter = 0;
  for (let round = 0; round < 10; round += 1) {
    for (const [evidence, method, wrongs] of evidenceItems) {
      easy.push(buildMcqQuestion({
        id: `craft-easy-${counter++}`,
        difficulty: "سهل",
        prompt: `في تحقيق جنائي، ما الوسيلة الأنسب للتعامل مع ${evidence}؟`,
        correct: method,
        wrongs,
        timeLimitSec: 60
      }));
    }
  }

  const locations = ["المستودع", "الميناء", "المعمَل", "المزرعة", "الفيلا", "الموقف السفلي"];
  const times = ["بعد منتصف الليل", "قبل الفجر", "وقت المناوبة", "أثناء تبديل الحراس", "بعد انقطاع الكهرباء", "قبل فتح البوابة"];
  const clues = ["الكاميرات", "السجل الحراري", "البصمات", "الهاتف المحترق", "أثر الإطارات", "شهادة الحارس"];
  for (let i = 0; i < 72; i += 1) {
    const location = locations[i % locations.length];
    const time = times[i % times.length];
    const clue = clues[i % clues.length];
    medium.push(buildMcqQuestion({
      id: `craft-medium-${counter++}`,
      difficulty: "متوسط",
      prompt: `في قضية وقعت داخل ${location} ${time}، ما الدليل الأقوى لربط المشتبه بالموقع؟`,
      correct: clue,
      wrongs: shuffleArray(clues.filter((entry) => entry !== clue)).slice(0, 3),
      timeLimitSec: 50
    }));
  }

  const suspects = ["السائق", "الحارس", "المحاسب", "عامل المستودع", "المرافق", "المخبر"];
  const motives = ["الديون", "الابتزاز", "إخفاء سجل", "تهريب الأدلة", "سرقة الشحنة", "تصفية الشريك"];
  const triggerClues = ["رسائل الهاتف", "خط السير", "سجل البوابة", "تحليل البصمات", "الكاميرات", "تطابق الألياف"];
  for (let i = 0; i < 90; i += 1) {
    const suspect = suspects[i % suspects.length];
    const motive = motives[i % motives.length];
    const clue = triggerClues[i % triggerClues.length];
    hard.push(buildMcqQuestion({
      id: `craft-hard-${counter++}`,
      difficulty: "صعب",
      prompt: `إذا كان ${suspect} يملك دافعًا مرتبطًا بـ ${motive}، فأي قرينة تحسم الشك بشكل أقوى؟`,
      correct: clue,
      wrongs: shuffleArray(triggerClues.filter((entry) => entry !== clue)).slice(0, 3),
      timeLimitSec: 45
    }));
  }

  return { easy, medium, hard };
}

const CRAFTING_QUESTION_POOLS = buildCrimeQuestionPools();

function rememberCraftingQuestionUsage(questionId) {
  recentCraftingQuestionIds.push(questionId);
  while (recentCraftingQuestionIds.length > 5) {
    recentCraftingQuestionIds.shift();
  }
}

function pickCraftingQuestions(pool, count) {
  const candidates = shuffleArray(pool.filter((question) => !recentCraftingQuestionIds.includes(question.id)));
  const selected = candidates.slice(0, count);

  if (selected.length < count) {
    selected.push(...shuffleArray(pool).slice(0, count - selected.length));
  }

  for (const question of selected) {
    rememberCraftingQuestionUsage(question.id);
  }

  return selected;
}

function createCraftingChallengeSet() {
  return [
    ...pickCraftingQuestions(CRAFTING_QUESTION_POOLS.easy, 3),
    ...pickCraftingQuestions(CRAFTING_QUESTION_POOLS.medium, 2),
    ...pickCraftingQuestions(CRAFTING_QUESTION_POOLS.hard, 1)
  ];
}

function clearCraftingTimeout(userId) {
  const currentTimeout = craftingChallengeTimeouts.get(userId);
  if (currentTimeout) {
    clearTimeout(currentTimeout);
    craftingChallengeTimeouts.delete(userId);
  }
}

async function failCraftingChallenge(userId, reason) {
  clearCraftingTimeout(userId);
  activeCraftingChallenges.delete(userId);
  pendingCraftingApprovals.delete(userId);

  const cooldownEndsAt = new Date(Date.now() + 10 * 60 * 1000).toISOString();
  updateAccount(userId, (current) => {
    current.crafting.cooldownEndsAt = cooldownEndsAt;
    current.crafting.lastChallengeAt = new Date().toISOString();
    return current;
  });

  const user = await client.users.fetch(userId).catch(() => null);
  if (user) {
    await user.send({
      embeds: [
        new EmbedBuilder()
          .setColor(0x0c1f3f)
          .setTitle("❌ فشل اختبار طاولة التصنيع")
          .setDescription([
            `**السبب:** ${reason}`,
            `**يمكنك إعادة المحاولة بعد:** <t:${Math.floor(new Date(cooldownEndsAt).getTime() / 1000)}:R>`
          ].join("\n"))
          .setFooter({ text: "Arab World • طاولة تصنيع" })
          .setTimestamp()
      ]
    }).catch(() => null);
  }
}

async function sendCraftingQuestion(userId) {
  const session = activeCraftingChallenges.get(userId);
  if (!session) {
    return;
  }

  const question = session.questions[session.stage];
  if (!question) {
    return;
  }

  const expiresAt = Date.now() + question.timeLimitSec * 1000;
  session.expiresAt = expiresAt;
  activeCraftingChallenges.set(userId, session);
  clearCraftingTimeout(userId);

  const user = await client.users.fetch(userId).catch(() => null);
  if (!user) {
    return;
  }

  await user.send({
    embeds: [
      new EmbedBuilder()
        .setColor(0x0c1f3f)
        .setTitle(`🧠 اختبار التصنيع • ${question.difficulty}`)
        .setDescription([
          `**السؤال ${session.stage + 1} من ${session.questions.length}**`,
          "",
          question.prompt,
          "",
          "أرسل اسم الإجابة الصحيح كما هو مكتوب ضمن الخيارات.",
          `**الوقت المتبقي:** <t:${Math.floor(expiresAt / 1000)}:R>`
        ].join("\n"))
        .setFooter({ text: "Arab World • أجب داخل الخاص" })
        .setTimestamp()
    ]
  }).catch(() => null);

  const timeout = setTimeout(() => {
    failCraftingChallenge(userId, "انتهى الوقت قبل إرسال الإجابة").catch(() => null);
  }, question.timeLimitSec * 1000);
  craftingChallengeTimeouts.set(userId, timeout);
}

async function beginCraftingChallenge(userId, levelKey) {
  const account = requireAccount(userId);
  if (!account) {
    return { ok: false, error: "account_not_found" };
  }

  if (account.crafting?.cooldownEndsAt && new Date(account.crafting.cooldownEndsAt).getTime() > Date.now()) {
    return { ok: false, error: "cooldown", cooldownEndsAt: account.crafting.cooldownEndsAt };
  }

  const session = {
    levelKey,
    questions: createCraftingChallengeSet(),
    stage: 0,
    startedAt: Date.now()
  };
  activeCraftingChallenges.set(userId, session);
  updateAccount(userId, (current) => {
    current.crafting.lastChallengeAt = new Date().toISOString();
    current.crafting.cooldownEndsAt = null;
    return current;
  });

  const user = await client.users.fetch(userId).catch(() => null);
  if (user) {
    await user.send({
      embeds: [
        new EmbedBuilder()
          .setColor(0x0c1f3f)
          .setTitle("🧩 بدأ اختبار طاولة التصنيع")
          .setDescription([
            "**سيتم الآن إرسال 6 أسئلة إجرامية عشوائية متدرجة الصعوبة.**",
            "• كل سؤال مدته دقيقة واحدة",
            "• أي خطأ يعني إعادة بعد 10 دقائق",
            "• أرسل اسم الإجابة الصحيح كما هو ظاهر في الخيارات",
            "• الأسئلة لا تتكرر بسرعة داخل النظام"
          ].join("\n"))
          .setImage(CRAFTING_TABLE_IMAGE_URL)
          .setFooter({ text: "Arab World • اختبار التصنيع" })
          .setTimestamp()
      ],
      files: getCraftingImageFiles()
    }).catch(() => null);
  }

  await sendCraftingQuestion(userId);
  return { ok: true };
}

async function handleCraftingDmMessage(message) {
  if (message.author.bot || message.guild) {
    return;
  }

  const userId = message.author.id;
  const rawText = String(message.content || "").trim();
  const asciiDigitsText = normalizeDigitsToAscii(rawText);
  const isNumericDmMessage = /^\d+$/.test(asciiDigitsText);
  const normalized = normalizeCraftingAnswer(message.content);
  const account = requireAccount(userId);

  if (account?.crafting?.level2Quest?.stage === "stage1_sent") {
    if (!isCraftingLevel2LocationAnswer(message.content)) {
      await message.reply("أرسل اسم الموقع الصحيح أولًا. أمثلة مقبولة: `المنجم` أو `منجم` أو `منجم الجبل`.");
      return;
    }

    updateAccount(userId, (current) => {
      current.crafting ??= {};
      current.crafting.level2Quest ??= {};
      current.crafting.level2Quest.stage = "stage1_location_confirmed";
      current.crafting.level2Quest.locationAnsweredAt = new Date().toISOString();
      return current;
    });

    await message.reply([
      "**تم تأكيد الموقع الصحيح: المنجم.**",
      "**الخطوة التالية:** أرسل الرقم أو المدى المطلوب من الملف الأول.",
      "**أمثلة مقبولة:** `1200` أو `1203` أو `1200 و 1203` أو `بين 1200 و 1203`."
    ].join("\n"));
    return;
  }

  if (account?.crafting?.level2Quest?.stage === "stage1_location_confirmed") {
    if (!isCraftingLevel2RangeAnswer(message.content)) {
      await message.reply("الإجابة الرقمية غير معتمدة. أرسل مثلًا: `1200` أو `1203` أو `1200 و 1203` أو `بين 1200 و 1203`.");
      return;
    }

    updateAccount(userId, (current) => {
      current.crafting ??= {};
      current.crafting.level2Quest ??= {};
      current.crafting.level2Quest.stage = "stage2_sent";
      current.crafting.level2Quest.firstPuzzleSolvedAt = new Date().toISOString();
      current.crafting.level2Quest.secondPuzzleSentAt = new Date().toISOString();
      return current;
    });

    const delivered = await sendCraftingLevel2SecondPuzzle(userId, "بعد حل الموقع والرقم");
    if (!delivered) {
      await message.reply("تم تسجيل الحل لكن تعذر إرسال المخطوطة الثانية. افتح الخاص مع البوت ثم أعد المحاولة.");
      return;
    }

    await message.reply("تم اعتماد حل المخطوطة الأولى وإرسال المخطوطة الثانية لك الآن.");
    return;
  }

  if (account?.crafting?.level2Quest?.stage === "stage2_sent") {
    if (isNumericDmMessage) {
      if (asciiDigitsText !== getCraftingLevel2FinalCode()) {
        await message.reply("الرقم غير صحيح. راجع المخطوطة جيدًا ثم أعد الإرسال.");
        return;
      }

      const result = await finalizeCraftingLevel2Unlock(userId);
      if (!result.ok) {
        await message.reply("لا يوجد ملف نهائي مفتوح لك حاليًا.");
        return;
      }

      await message.reply({
        embeds: [buildCraftingLevel2UnlockedEmbed()]
      });
      return;
    }
  }

  if (account?.crafting?.level2Upgrade?.stage === "puzzle_sent" && isNumericDmMessage) {
    if (asciiDigitsText !== getCraftingLevel2UpgradeFinalCode()) {
      await message.reply("الرقم غير صحيح. راجع قصة جونز مارك ثم أعد الإرسال.");
      return;
    }

    const result = await finalizeCraftingLevel2UpgradeUnlock(userId);
    if (!result.ok) {
      return;
    }

    await message.reply({
      embeds: [buildCraftingLevel2UpgradeUnlockedEmbed()]
    });
    return;
  }

  if (account?.crafting?.level3Quest?.stage === "puzzle_sent" && isNumericDmMessage) {
    if (asciiDigitsText !== getCraftingLevel3FinalCode()) {
      await message.reply("الرمز غير صحيح. راجع المخطوطة جيدًا ثم أعد الإرسال.");
      return;
    }

    const result = await finalizeCraftingLevel3Start(userId);
    if (!result.ok) {
      return;
    }

    await message.reply({
      embeds: [buildCraftingLevel3WaitingEmbed(result.waitingUntil)]
    });
    return;
  }

  if (isNumericDmMessage && account?.crafting?.level2Quest) {
    const currentStage = account.crafting.level2Quest.stage || "idle";
    if (currentStage === "stage1_sent") {
      await message.reply("هذا ليس وقت الرقم الآن. أرسل اسم الموقع الصحيح أولًا مثل: `المنجم` أو `منجم الجبل`.");
      return;
    }

    if (currentStage === "stage1_location_confirmed") {
      await message.reply("الرقم النهائي ليس الآن. في هذه المرحلة أرسل رقم اللغز الأول مثل: `1200` أو `1203` أو `بين 1200 و 1203`.");
      return;
    }

    if (currentStage === "completed") {
      return;
    }

    await message.reply("لا يوجد ملف رقم نهائي مفتوح لك حاليًا.");
    return;
  }

  if (isNumericDmMessage && account?.crafting?.level2Upgrade?.stage === "completed") {
    return;
  }

  if (isNumericDmMessage && account?.crafting?.level3Quest?.stage === "waiting") {
    return;
  }

  if (pendingCraftingApprovals.has(userId)) {
    if (CRAFTING_DECLINE_WORDS.has(normalized)) {
      pendingCraftingApprovals.delete(userId);
      await message.reply("تم إلغاء طلب شراء طاولة التصنيع.");
      return;
    }

    if (!CRAFTING_CONFIRM_WORDS.has(normalized)) {
      await message.reply("اكتب `موافق` للمتابعة أو `غير موافق` للإلغاء.");
      return;
    }

    const approval = pendingCraftingApprovals.get(userId);
    const result = await beginCraftingChallenge(userId, approval.levelKey);
    if (!result.ok) {
      if (result.error === "cooldown") {
        await message.reply(`يمكنك إعادة المحاولة بعد <t:${Math.floor(new Date(result.cooldownEndsAt).getTime() / 1000)}:R>.`);
        return;
      }

      await message.reply("تعذر بدء اختبار التصنيع الآن.");
      return;
    }

    pendingCraftingApprovals.delete(userId);
    return;
  }

  const session = activeCraftingChallenges.get(userId);
  if (!session) {
    return;
  }

  const question = session.questions[session.stage];
  if (!question) {
    return;
  }

  if (Date.now() > session.expiresAt) {
    await failCraftingChallenge(userId, "وصلت الإجابة بعد انتهاء الوقت");
    return;
  }

  const matched = question.answers.some((answer) => normalizeCraftingAnswer(answer) === normalized);
  if (!matched) {
    await failCraftingChallenge(userId, "إجابة غير صحيحة");
    return;
  }

  clearCraftingTimeout(userId);
  session.stage += 1;
  activeCraftingChallenges.set(userId, session);

  if (session.stage >= session.questions.length) {
    activeCraftingChallenges.delete(userId);
    const user = await client.users.fetch(userId).catch(() => null);
    if (!user) {
      return;
    }

    await user.send({
      embeds: [
        new EmbedBuilder()
          .setColor(0x0c1f3f)
          .setTitle("✅ تم اجتياز اختبار طاولة التصنيع")
          .setDescription([
            "**أحسنت، تم اجتياز جميع الأسئلة الستة بنجاح.**",
            `**السعر النهائي:** ${CRAFTING_TABLE_LEVELS.level1.price.toLocaleString("en-US")} ريال`,
            "",
            "**تنبيه:** لا يوجد استرداد بعد الموافقة النهائية.**"
          ].join("\n"))
          .setImage(CRAFTING_TABLE_IMAGE_URL)
          .setFooter({ text: "Arab World • طاولة تصنيع" })
          .setTimestamp()
      ],
      files: getCraftingImageFiles(),
      components: [buildCraftingPurchaseConfirmButtons(session.levelKey)]
    }).catch(() => null);
    return;
  }

  await message.reply("إجابة صحيحة، تم الانتقال إلى السؤال التالي.");
  await sendCraftingQuestion(userId);
}

function getCraftingCooldownText(account) {
  const cooldownEndsAt = account?.crafting?.cooldownEndsAt;
  if (!cooldownEndsAt) {
    return "";
  }

  const cooldownTime = new Date(cooldownEndsAt).getTime();
  if (Number.isNaN(cooldownTime) || cooldownTime <= Date.now()) {
    return "";
  }

  return `<t:${Math.floor(cooldownTime / 1000)}:R>`;
}

function hasCraftingTable(account, level = 1) {
  return Number(account?.crafting?.tableLevel || 0) >= level;
}

function hasLevel2UpgradedCraftingAccess(account) {
  return account?.crafting?.level2Upgrade?.stage === "completed";
}

function hasLevel3CraftingAccess(account) {
  return hasCraftingTable(account, 3) || account?.crafting?.level3Quest?.stage === "completed";
}

function refreshCraftingProgress(userId) {
  const account = requireAccount(userId);
  const waitingUntil = account?.crafting?.level3Quest?.waitingUntil;
  const stage = account?.crafting?.level3Quest?.stage || "idle";
  if (!account || stage !== "waiting" || !waitingUntil) {
    return account;
  }

  if (new Date(waitingUntil).getTime() > Date.now()) {
    return account;
  }

  updateAccount(userId, (current) => {
    current.crafting ??= {};
    current.crafting.tableLevel = Math.max(Number(current.crafting.tableLevel || 0), 3);
    current.crafting.level3Quest ??= {};
    current.crafting.level3Quest.stage = "completed";
    current.crafting.level3Quest.completedAt = new Date().toISOString();
    return current;
  });

  return getAccount(userId);
}

function hasLevel2CraftingAccess(member, account) {
  return Boolean(
    member?.roles?.cache?.has(CRAFTING_LEVEL2_ACCESS_ROLE_ID)
    || hasCraftingTable(account, 2)
    || account?.crafting?.level2Quest?.stage === "completed"
  );
}

function normalizeVehicleName(value) {
  return String(value || "")
    .trim()
    .replace(/\s+/g, " ")
    .toUpperCase();
}

function normalizeWebsiteVehicleInput(value) {
  const raw = String(value || "").trim().replace(/\s+/g, " ");
  if (!raw) {
    return "";
  }

  return raw
    .replace(/\s+[•|-]\s+(FREE|DEFAULT|مجاني)$/i, "")
    .replace(/\s+[•|-]\s+[\d,]+(?:\s*ريال)?$/i, "")
    .trim();
}

function resolveCanonicalVehicleName(value) {
  const cleaned = normalizeWebsiteVehicleInput(value);
  if (!cleaned) {
    return "";
  }

  const registeredVehicleName = resolveRegisteredVehicleName(cleaned);
  if (registeredVehicleName) {
    return registeredVehicleName;
  }

  const normalized = normalizeVehicleName(cleaned);
  const catalog = listVehicleCatalog();
  const exact = catalog.find((entry) => normalizeVehicleName(entry) === normalized);
  if (exact) {
    return exact;
  }

  const compactInput = normalized.replace(/[^A-Z0-9]/g, "");
  const compactMatch = catalog.find((entry) => normalizeVehicleName(entry).replace(/[^A-Z0-9]/g, "") === compactInput);
  if (compactMatch) {
    return compactMatch;
  }

  return cleaned;
}

function formatCurrency(amount) {
  return `${Number(amount || 0).toLocaleString("en-US")} ريال`;
}

function isFreeVehicleName(vehicleName = "", department = "") {
  if (isEmergencyVehicleName(vehicleName, department)) {
    return false;
  }

  const normalizedVehicle = normalizeVehicleName(vehicleName);

  return DEFAULT_FREE_VEHICLE_NAMES.some((name) => normalizeVehicleName(name) === normalizedVehicle);
}

function isEmergencyVehicleName(vehicleName = "", department = "") {
  const normalizedVehicle = normalizeVehicleName(vehicleName);
  const normalizedDepartment = normalizeVehicleName(department);

  if (EMERGENCY_VEHICLE_DEPARTMENTS.some((entry) => {
    const normalizedEntry = normalizeVehicleName(entry);
    return normalizedDepartment === normalizedEntry || normalizedDepartment.includes(normalizedEntry);
  })) {
    return true;
  }

  return EMERGENCY_VEHICLE_KEYWORDS.some((keyword) => {
    const normalizedKeyword = normalizeVehicleName(keyword);
    return normalizedVehicle.includes(normalizedKeyword) || normalizedDepartment.includes(normalizedKeyword);
  });
}

function isCitizenTeam(department = "") {
  const normalizedDepartment = normalizeVehicleName(department);
  if (!normalizedDepartment) {
    return false;
  }

  return [
    "CIVILIAN",
    "CITIZEN",
    "CIV",
    "PUBLIC",
    "CIVILIAN TEAM",
    "CITIZEN TEAM",
    "CITIZENS",
    "CIV TEAM",
    "CIVILIAN OPERATIONS",
    "PUBLIC TEAM",
    "REGULAR CIVILIAN",
    "المواطن",
    "مواطن",
    "مدني",
    "CIVILIAN ROLEPLAY"
  ].some((entry) => normalizedDepartment.includes(normalizeVehicleName(entry)));
}

function isPoliceTeam(department = "") {
  const normalizedDepartment = normalizeVehicleName(department);
  if (!normalizedDepartment) {
    return false;
  }

  return [
    "POLICE",
    "POLICE TEAM",
    "POLICE DEPARTMENT",
    "LSPD",
    "LEO",
    "STATE POLICE",
    "HIGHWAY PATROL",
    "STATE TROOPER",
    "TROOPER",
    "SHERIFF",
    "SHERIFF OFFICE",
    "SHERIFF DEPARTMENT",
    "BCSO",
    "SCSO"
  ].some((entry) => normalizedDepartment.includes(normalizeVehicleName(entry)));
}

function shouldSkipVehiclePunishment(vehicleName = "", department = "") {
  return isEmergencyVehicleName(vehicleName, department);
}

function getVehicleOffer(vehicleName, department = "") {
  const priceRecord = getVehiclePriceRecord(vehicleName);
  const freeByRule = isFreeVehicleName(vehicleName, department);
  const explicitPrice = priceRecord ? Number(priceRecord.price) : DEFAULT_CITIZEN_VEHICLE_PRICE;
  const isFree = freeByRule || explicitPrice === 0;

  return {
    name: String(vehicleName || "").trim(),
    price: isFree ? 0 : Number(explicitPrice ?? 0),
    isFree
  };
}

function invalidateVehicleCatalogCache() {
  sortedVehicleCatalogCache = null;
  sortedVehicleCatalogCacheKey = "";
}

function getSortedVehicleCatalog() {
  const vehicleCatalog = listVehicleCatalog();
  const cacheKey = vehicleCatalog.join("|");
  if (sortedVehicleCatalogCache && sortedVehicleCatalogCacheKey === cacheKey) {
    return sortedVehicleCatalogCache;
  }

  sortedVehicleCatalogCache = vehicleCatalog
    .map((vehicleName) => getVehicleOffer(vehicleName))
    .filter((vehicle) => vehicle.name && !isEmergencyVehicleName(vehicle.name) && (vehicle.isFree || vehicle.price > 0))
    .sort((left, right) => {
      if (left.isFree !== right.isFree) {
        return left.isFree ? -1 : 1;
      }
      if (left.price !== right.price) {
        return left.price - right.price;
      }
      return left.name.localeCompare(right.name);
    });

  sortedVehicleCatalogCacheKey = cacheKey;
  return sortedVehicleCatalogCache;
}

function paginateVehicles(page = 0) {
  const vehicles = getSortedVehicleCatalog();
  const totalPages = Math.max(1, Math.ceil(vehicles.length / CAR_SHOWROOM_PAGE_SIZE));
  const safePage = Math.min(Math.max(Number(page) || 0, 0), totalPages - 1);
  const startIndex = safePage * CAR_SHOWROOM_PAGE_SIZE;

  return {
    page: safePage,
    totalPages,
    vehicles: vehicles.slice(startIndex, startIndex + CAR_SHOWROOM_PAGE_SIZE)
  };
}

function createCarSaleModal() {
  return new ModalBuilder()
    .setCustomId("modal_car_sell")
    .setTitle("بيع سيارة")
    .addComponents(
      new ActionRowBuilder().addComponents(
        new TextInputBuilder()
          .setCustomId("vehicle_name")
          .setLabel("اسم السيارة")
          .setStyle(TextInputStyle.Short)
          .setRequired(true)
      ),
      new ActionRowBuilder().addComponents(
        new TextInputBuilder()
          .setCustomId("confirm_word")
          .setLabel("اكتب كلمة موافق")
          .setStyle(TextInputStyle.Short)
          .setRequired(true)
      )
    );
}

async function sendCarHome(interaction, page = 0, replyMethod = "reply") {
  const paged = paginateVehicles(page);
  const components = [];

  if (paged.vehicles.length) {
    components.push(buildCarSelectMenu(paged));
  }
  components.push(buildCarShowroomButtons(paged));

  const payload = {
    embeds: [buildCarShowroomEmbed(paged)],
    components
  };

  if (replyMethod !== "update") {
    payload.ephemeral = false;
  }

  await interaction[replyMethod](payload);
}

async function sendBudgetHome(interaction, budgetKey, replyMethod = "reply") {
  const definition = getBudgetDefinition(budgetKey);
  const budget = getBudget(budgetKey);
  const payload = {
    embeds: [buildBudgetHomeEmbed(definition, budget)],
    components: [buildBudgetMenu(definition), buildBudgetLogsButtonRow(budgetKey)],
    ephemeral: false
  };

  await interaction[replyMethod](payload);
}

function buildBudgetStatusPayload(budgetKey, content = "", ephemeral = true) {
  const definition = getBudgetDefinition(budgetKey);
  const budget = getBudget(budgetKey);
  const payload = {
    embeds: [buildBudgetHomeEmbed(definition, budget)],
    components: [buildBudgetMenu(definition), buildBudgetLogsButtonRow(budgetKey)],
    ephemeral
  };

  if (content) {
    payload.content = content;
  }

  return payload;
}

function rememberBudgetSourceMessage(interaction, budgetKey) {
  if (!interaction?.message?.id || !interaction.channelId) {
    return;
  }

  pendingBudgetSourceMessages.set(interaction.user.id, {
    budgetKey,
    channelId: interaction.channelId,
    messageId: interaction.message.id
  });
}

async function refreshBudgetSourceMessage(userId, budgetKey, content = "") {
  const source = pendingBudgetSourceMessages.get(userId);
  if (!source || source.budgetKey !== budgetKey) {
    return false;
  }

  const channel = await client.channels.fetch(source.channelId).catch(() => null);
  if (!channel?.messages?.fetch) {
    return false;
  }

  const message = await channel.messages.fetch(source.messageId).catch(() => null);
  if (!message?.editable) {
    return false;
  }

  const payload = buildBudgetStatusPayload(budgetKey, "", false);
  payload.content = null;
  delete payload.ephemeral;
  await message.edit(payload).catch(() => null);
  return true;
}

async function finalizeBudgetMutationResponse(interaction, budgetKey, content = "") {
  const refreshed = await refreshBudgetSourceMessage(interaction.user.id, budgetKey, content);
  if (refreshed) {
    if (!interaction.deferred && !interaction.replied) {
      await interaction.deferReply({ ephemeral: true }).catch(() => null);
    }
    await interaction.deleteReply().catch(() => null);
    return;
  }

  await interaction.reply(buildBudgetStatusPayload(budgetKey));
}

function buildPoliceSectorDraft(userId, fallbackBudgetKey = BUDGET_KEYS.police) {
  const draft = pendingBudgetDrafts.get(userId) ?? {
    budgetKey: fallbackBudgetKey,
    type: "police_sector",
    addons: []
  };

  const selectedAddons = draft.addons.map((key) => POLICE_SECTOR_ADDONS[key]).filter(Boolean);
  const totalPrice = 5_000_000 + selectedAddons.reduce((sum, addon) => sum + addon.price, 0);
  const budgetKey = draft.budgetKey || fallbackBudgetKey;

  return {
    ...draft,
    budgetKey,
    addons: selectedAddons.map((addon) => addon.key),
    totalPrice,
    embed: buildBudgetPurchaseDraftEmbed({
      definition: getBudgetDefinition(budgetKey),
      title: "🛡️ شراء عتاد قطاع",
      description: "**السعر الأساسي لعتاد القطاع هو 5,000,000 ريال ويمكنك إضافة ملحقات قبل الاعتماد.**",
      totalPrice,
      lines: [
        "• العتاد الأساسي: 5,000,000 ريال",
        ...(selectedAddons.length
          ? selectedAddons.map((addon) => `• ${addon.label}: ${formatBudgetCurrency(addon.price)}`)
          : ["• لا توجد إضافات محددة حاليًا"])
      ]
    }),
    components: [
      buildBudgetConfirmButtons(`budget_confirm_sector:${budgetKey}`, `budget_cancel_sector:${budgetKey}`),
      buildPoliceSectorAddonMenu(draft.addons || []),
      buildPoliceSectorAddonRemoveMenu(draft.addons || [])
    ]
  };
}

function buildSingleBudgetPurchaseDraft({ budgetKey, purchaseType, itemKey }) {
  const definition = getBudgetDefinition(budgetKey);
  const catalog = purchaseType === "police_military" ? POLICE_MILITARY_ITEMS : JUS_PURCHASE_ITEMS;
  const item = catalog[itemKey];
  if (!item) {
    return null;
  }

  return {
    budgetKey,
    type: purchaseType,
    itemKey,
    totalPrice: item.price,
    embed: buildBudgetPurchaseDraftEmbed({
      definition,
      title: purchaseType === "police_military" ? "🪖 شراء عتاد عسكري" : "⚖️ شراء للعدل",
      description: "**راجع الطلب جيدًا قبل اعتماده النهائي.**",
      totalPrice: item.price,
      lines: [`• ${item.label}: ${formatBudgetCurrency(item.price)}`]
    }),
    components: [
      buildBudgetConfirmButtons(
        `budget_confirm:${budgetKey}:${purchaseType}`,
        `budget_cancel:${budgetKey}:${purchaseType}`
      )
    ]
  };
}

async function respondWithOwnedCars(interaction, userId) {
  const ownedCars = listOwnedVehicles(userId, { includeRentals: true });

  try {
    const ownedCarsCard = await buildOwnedCarsCardAttachment(ownedCars);
    await interaction.reply({
      embeds: [
        new EmbedBuilder()
          .setColor(0x12345d)
          .setTitle("🚘 ممتلكاتك من السيارات")
          .setDescription("**هذه بطاقتك الحالية لمعرض السيارات المملوكة.**")
          .setImage("attachment://owned-cars-card.png")
      ],
      files: [ownedCarsCard],
      ephemeral: true
    });
    return;
  } catch (error) {
    console.error("[OWNED CARS CARD ERROR]", error);
    await interaction.reply({
      embeds: [
        buildOwnedCarsEmbed({ ownedCars }),
        buildPrivateNoticeEmbed({
          title: "⚠️ تعذر إنشاء بطاقة السيارات",
          description: "**تأكد من رفع صورة `owned-cars-template.png` أو `357_20260426160027.png` داخل مجلد `assets` أو في جذر السيرفر نفسه.**"
        })
      ],
      ephemeral: true
    });
  }
}

function buildPoliceBankTargetAuditFields(account, memberId) {
  return [
    { name: "👤 **المستهدف**", value: `**<@${memberId}>**`, inline: true },
    buildBankAccountAuditField(account, "🏦 **اسم الحساب**"),
    { name: "💰 **الرصيد الحالي**", value: `**${formatCurrency(account?.balance || 0)}**`, inline: true }
  ];
}

function buildVehicleAutocompleteChoices(focusedValue) {
  const normalized = String(focusedValue || "").trim().toLowerCase();
  const vehicles = getSortedVehicleCatalog();
  const filtered = normalized
    ? vehicles
      .filter((vehicle) => vehicle.name.toLowerCase().includes(normalized))
      .sort((left, right) => {
        const leftStartsWith = left.name.toLowerCase().startsWith(normalized);
        const rightStartsWith = right.name.toLowerCase().startsWith(normalized);
        if (leftStartsWith !== rightStartsWith) {
          return leftStartsWith ? -1 : 1;
        }
        return left.name.localeCompare(right.name);
      })
    : vehicles;

  return filtered.slice(0, 25).map((vehicle) => ({
    name: vehicle.isFree ? `${vehicle.name} • مجاني` : `${vehicle.name} • ${formatCurrency(vehicle.price)}`,
    value: vehicle.name
  }));
}

function buildOwnedVehicleAutocompleteChoices(userId, focusedValue) {
  const normalized = String(focusedValue || "").trim().toLowerCase();
  const vehicles = listOwnedVehicles(userId).map((vehicle) => vehicle.name).filter(Boolean);
  const filtered = normalized
    ? vehicles.filter((vehicleName) => vehicleName.toLowerCase().includes(normalized))
    : vehicles;

  return filtered.slice(0, 25).map((vehicleName) => ({
    name: vehicleName,
    value: vehicleName
  }));
}

function buildOwnedWeaponAutocompleteChoices(userId, focusedValue) {
  const account = getAccount(userId);
  if (!account) {
    return [];
  }

  const normalized = String(focusedValue || "").trim().toLowerCase();
  const entries = getAllWeaponInventoryEntries(account)
    .filter((entry) => entry.active !== false && !entry.brokenAt);

  const filtered = normalized
    ? entries.filter((entry) => {
        const haystack = `${entry.code} ${entry.weaponLabel} ${buildWeaponStatusText(entry)}`.toLowerCase();
        return haystack.includes(normalized);
      })
    : entries;

  return filtered.slice(0, 25).map((entry) => ({
    name: `${entry.code} • ${buildWeaponStatusText(entry)}`,
    value: entry.code
  }));
}

function buildWeaponRemovedDmEmbed({ weaponCode, weaponLabel, permanent, expiresAt, executorLabel }) {
  const weaponTypeText = permanent ? "دائم" : "مؤقت";
  return new EmbedBuilder()
    .setColor(0x8d1111)
    .setTitle("🚫 تم سحب سلاح من ممتلكاتك")
    .setDescription("**تم سحب إحدى نسخ السلاح من حسابك بواسطة الإدارة.**")
    .addFields(
      { name: "🔫 **السلاح**", value: `**${weaponLabel} • ${weaponCode}**`, inline: true },
      { name: "📜 **النوع**", value: `**${weaponTypeText}**`, inline: true },
      { name: "🧑‍⚖️ **بواسطة**", value: executorLabel || "**الإدارة**", inline: true },
      !permanent && expiresAt
        ? { name: "⏳ **كان ينتهي في**", value: `**<t:${Math.floor(new Date(expiresAt).getTime() / 1000)}:F>**`, inline: false }
        : null,
      { name: "📘 **تنبيه**", value: "**إذا كان لديك نسخ أخرى من نفس السلاح فستبقى معك بشكل طبيعي.**", inline: false }
    .filter(Boolean))
    .setFooter({ text: "Arab World • إدارة الأسلحة" })
    .setTimestamp();
}

function buildVehicleRemovedDmEmbed({ vehicleName, executorLabel }) {
  return new EmbedBuilder()
    .setColor(0xb91c1c)
    .setTitle("🚘 تم سحب مركبة من ممتلكاتك")
    .setDescription("**تمت إزالة إحدى مركباتك من الحساب بواسطة الإدارة.**")
    .addFields(
      { name: "🚗 المركبة", value: `**${vehicleName || "غير معروف"}**`, inline: true },
      { name: "🧑‍⚖️ بواسطة", value: executorLabel || "**الإدارة**", inline: true }
    )
    .setFooter({ text: "Arab World • إدارة المركبات" })
    .setTimestamp();
}

function buildResourcesGrantedDmEmbed({ executorLabel, lines }) {
  return new EmbedBuilder()
    .setColor(0x0f766e)
    .setTitle("📦 تمت إضافة موارد إلى حسابك")
    .setDescription("**أضافت الإدارة موارد جديدة إلى حسابك البنكي.**")
    .addFields(
      { name: "🧑‍⚖️ بواسطة", value: executorLabel || "**الإدارة**", inline: true },
      { name: "📋 التفاصيل", value: lines.join("\n") || "**لا توجد بيانات**", inline: false }
    )
    .setFooter({ text: "Arab World • إدارة الموارد" })
    .setTimestamp();
}

function getResourceRequirementGaps(account, requirements = {}) {
  return Object.entries(requirements).map(([resourceKey, requiredAmount]) => {
    const currentAmount = Number(account?.resources?.[resourceKey] || 0);
    return {
      resourceKey,
      requiredAmount: Number(requiredAmount || 0),
      currentAmount,
      missing: currentAmount < Number(requiredAmount || 0)
    };
  });
}

function buildWebsiteVerificationFallbackDm({ verificationId, pending }) {
  const safeUsername = String(pending?.robloxUsername || "غير معروف");
  const safeAccountNumber = String(pending?.accountNumber || "غير متوفر");
  const code = String(pending?.code || "").trim();
  const expiresAt = Number(pending?.expiresAt || 0);

  return {
    embeds: [
      new EmbedBuilder()
        .setColor(0x0b1f3a)
        .setTitle("بوابة Arab World | رمز التحقق")
        .setDescription("تم جلب آخر رمز تحقق نشط للموقع بناءً على طلبك.")
        .addFields(
          { name: "يوزر روبلوكس", value: `**${safeUsername}**`, inline: true },
          { name: "رقم الحساب", value: `**${safeAccountNumber}**`, inline: true },
          { name: "رمز التحقق", value: `\`${code}\``, inline: false },
          { name: "صلاحية الرمز", value: `**<t:${Math.floor(expiresAt / 1000)}:R>**`, inline: false }
        )
        .setFooter({ text: "Arab World Mobile Verification" })
        .setTimestamp()
    ],
    components: [
      new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setCustomId(`website_verify_copy:${verificationId}`)
          .setLabel("نسخ الرمز")
          .setStyle(ButtonStyle.Secondary)
      )
    ]
  };
}

const pendingCarPurchases = new Map();
const processedVehicleIds = new Map();
const recentVehicleSkipLogs = new Map();

client.on(Events.InteractionCreate, async (interaction) => {
  try {
    if (interaction.isAutocomplete()) {
      const supportedCommands = new Set(["add-car", "remove-car", "سحب-مركبه", "car-price", "سحب-سلاح"]);
      if (!supportedCommands.has(interaction.commandName)) {
        return;
      }

      const focused = interaction.options.getFocused(true);
      if (interaction.commandName === "سحب-سلاح" && focused.name === "weapon_code") {
        const memberId = String(interaction.options.get("member")?.value || "").trim();
        const choices = memberId ? buildOwnedWeaponAutocompleteChoices(memberId, focused.value) : [];
        await interaction.respond(choices).catch((error) => {
          if (error?.code !== 10062) {
            throw error;
          }
        });
        return;
      }

      if (focused.name !== "vehicle") {
        await interaction.respond([]).catch((error) => {
          if (error?.code !== 10062) {
            throw error;
          }
        });
        return;
      }

      const memberId = String(interaction.options.get("member")?.value || "").trim();
      const choices = interaction.commandName === "remove-car" || interaction.commandName === "سحب-مركبه"
        ? (memberId ? buildOwnedVehicleAutocompleteChoices(memberId, focused.value) : [])
        : buildVehicleAutocompleteChoices(focused.value);

      await interaction.respond(choices).catch((error) => {
        if (error?.code !== 10062) {
          throw error;
        }
      });
      return;
    }

    if (interaction.isChatInputCommand()) {
      const budgetCommandNames = new Set(["police", "guard", "gang", "jus", "ميزانيه-الدوله"]);
      const policeBankCommandNames = new Set([
        "bank-police",
        "اعطاء-مخطوطه",
        "سحب-ممتلكات",
        "سحب-موارد",
        "اضافه-سلاح",
        "اضافه-موارد",
        "سحب-سلاح",
        "اعطاء-مشروع",
        "سحب-مشروع",
        "اضافه-مال-لمشروع",
        "تغيير-اسم-مشروع",
        "سحب-مال-من-مشروع",
        "اضافه-بنزين",
        "تقليل-البنزين",
        "بدء-المحطات",
        "ايقاف-المحطات"
      ]);
      const publicCommandNames = new Set([
        "activite",
        "رمز-الموقع",
        "ايمبد-المعلومات",
        "المشاريع",
        "محطه-مدينه-اولى",
        "محطه-مدينه-ثانيه",
        "محطه-المزرعه",
        "معرض-1",
        "معرض-2",
        "معرض-3",
        "مطعم-1",
        "مطعم-2",
        "كوفي"
      ]);
      if (!canUseSlashCommands(interaction.member) && !publicCommandNames.has(interaction.commandName) && !budgetCommandNames.has(interaction.commandName) && !(policeBankCommandNames.has(interaction.commandName) && canManagePoliceBank(interaction.member))) {
        await interaction.reply({ content: `هذا الأمر متاح فقط لمن يملك الرتبة <@&${config.slashAccessRoleId}>.`, ephemeral: true });
        return;
      }

      if (interaction.commandName === "bank") {
        await sendBankHome(interaction);
        return;
      }

      if (interaction.commandName === "bank-police") {
        if (!(await ensurePoliceBankPermission(interaction))) {
          return;
        }

        await sendPoliceBankHome(interaction);
        return;
      }

      if (interaction.commandName === "gun") {
        await sendGunHome(interaction);
        return;
      }

      if (interaction.commandName === "gun2") {
        await sendGun2Home(interaction);
        return;
      }

      if (interaction.commandName === "موارد") {
        await sendResourcesHome(interaction);
        return;
      }

      if (interaction.commandName === "mdt") {
        await sendMdtHome(interaction);
        return;
      }

      if (interaction.commandName === "car") {
        await sendCarHome(interaction);
        return;
      }

      if (interaction.commandName === "المشاريع") {
        await interaction.reply({
          embeds: [buildProjectsOverviewEmbed(listProjects())],
          ephemeral: false
        });
        return;
      }

      if (interaction.commandName === "activite") {
        await interaction.reply({
          embeds: [buildActivationEntryEmbed()],
          components: [createActivationEntryButtons("open")],
          ephemeral: false
        });
        return;
      }

      if (interaction.commandName === "رمز-الموقع") {
        const now = Date.now();
        let latestPending = null;

        for (const [verificationId, pending] of pendingWebsiteLoginVerifications.entries()) {
          if (!pending || pending.discordUserId !== interaction.user.id) {
            continue;
          }

          if (now > Number(pending.expiresAt || 0)) {
            pendingWebsiteLoginVerifications.delete(verificationId);
            continue;
          }

          if (pending.used) {
            continue;
          }

          if (!latestPending || Number(pending.expiresAt || 0) > Number(latestPending.expiresAt || 0)) {
            latestPending = {
              verificationId,
              ...pending
            };
          }
        }

        if (!latestPending) {
          await interaction.reply({
            content: "لا يوجد لديك رمز موقع نشط الآن. اطلب رمزًا جديدًا من الموقع أولًا.",
            ephemeral: true
          });
          return;
        }

        await interaction.reply({
          content: [
            "رمز التحقق الخاص بالموقع:",
            `\`${latestPending.code}\``,
            `الصلاحية: <t:${Math.floor(Number(latestPending.expiresAt || 0) / 1000)}:R>`,
            latestPending.robloxUsername ? `يوزر روبلوكس: ${latestPending.robloxUsername}` : null,
            latestPending.accountNumber ? `رقم الحساب: ${latestPending.accountNumber}` : null
          ].filter(Boolean).join("\n"),
          ephemeral: true
        });
        return;
      }

      if (interaction.commandName === "ادخال-فويس") {
        await interaction.deferReply({ ephemeral: true });

        const channel = interaction.options.getChannel("channel", true);
        if (!channel || !channel.isVoiceBased?.()) {
          await interaction.editReply({ content: "اختر روم فويس صحيح أولًا." });
          return;
        }

        try {
          await connectBotToVoiceChannel(channel);
          await interaction.editReply({
            embeds: [
              new EmbedBuilder()
                .setColor(0x0b1f3a)
                .setTitle("🎙️ تم إدخال البوت إلى الفويس")
                .setDescription("**تم إدخال البوت إلى الروم الصوتي المحدد وسيبقى داخله حتى يتم فصله أو إعادة تشغيله.**")
                .addFields(
                  { name: "📍 الروم", value: `**${channel.name}**`, inline: true },
                  { name: "🏠 السيرفر", value: `**${channel.guild.name}**`, inline: true }
                )
                .setFooter({ text: "Arab World • Voice Control" })
                .setTimestamp()
            ]
          });
        } catch (error) {
          console.error("Voice join command failed:", error);
          await interaction.editReply({
            content: "تعذر إدخال البوت إلى الروم الصوتي. تأكد أن البوت يملك صلاحية الدخول والتحدث في هذا الروم."
          });
        }
        return;
      }

      if (interaction.commandName === "بدء-المحطات") {
        if (!(await ensurePoliceBankPermission(interaction))) {
          return;
        }

        await interaction.deferReply({ ephemeral: true });
        const started = await startStationAutoIncomeSystem();
        await interaction.editReply({
          embeds: [
            new EmbedBuilder()
              .setColor(0x0b1f3a)
              .setTitle(started ? "▶️ تم بدء نظام المحطات" : "ℹ️ نظام المحطات يعمل بالفعل")
              .setDescription(
                started
                  ? "**تم تشغيل دخل المحطات التلقائي بنجاح، وسيتم إرسال دفعات التعبئة كل خمس دقائق مع تحديث الميزانيات مباشرة.**"
                  : "**النظام التلقائي للمحطات يعمل حاليًا بالفعل، ولا يحتاج إلى تشغيل جديد.**"
              )
              .addFields(
                { name: "⏱️ التوقيت", value: "**كل 5 دقائق**", inline: true },
                { name: "🏢 المحطات", value: "**المدينة الأولى • المدينة الثانية • المزرعة**", inline: true },
                { name: "🧾 الحالة", value: started ? "**تم التشغيل والدفعة الأولى بدأت الآن.**" : "**لا يوجد تغيير لأن النظام كان مفعّلًا.**", inline: false }
              )
              .setFooter({ text: "Arab World • نظام المحطات" })
              .setTimestamp()
          ]
        });
        return;
      }

      if (interaction.commandName === "ايقاف-المحطات") {
        if (!(await ensurePoliceBankPermission(interaction))) {
          return;
        }

        await interaction.deferReply({ ephemeral: true });
        const stopped = stopStationAutoIncomeSystem();
        await interaction.editReply({
          embeds: [
            new EmbedBuilder()
              .setColor(0x0b1f3a)
              .setTitle(stopped ? "⏹️ تم إيقاف نظام المحطات" : "ℹ️ نظام المحطات متوقف أصلًا")
              .setDescription(
                stopped
                  ? "**تم إيقاف إضافة الدخل التلقائي للمحطات، ولن تُضاف أي مبالغ جديدة حتى يتم تشغيل النظام مرة أخرى.**"
                  : "**لا يوجد دخل تلقائي مفعّل حاليًا للمحطات، لذلك لم يتم إيقاف شيء جديد.**"
              )
              .addFields(
                { name: "🧾 الحالة", value: stopped ? "**تم إيقاف جميع دفعات المحطات التلقائية بنجاح.**" : "**النظام كان متوقفًا مسبقًا.**", inline: false }
              )
              .setFooter({ text: "Arab World • نظام المحطات" })
              .setTimestamp()
          ]
        });
        return;
      }

      const dashboardProjectKey = getProjectKeyForDashboardCommand(interaction.commandName);
      if (dashboardProjectKey) {
        const name = interaction.options.getString("name", true).trim();
        const owner = interaction.options.getUser("owner", true);
        const ordersRoom = interaction.options.getChannel("orders_room");
        const definition = getProjectDefinition(dashboardProjectKey);
        const ownerAccount = getAccount(owner.id);
        const existingProject = ensureProjectState(dashboardProjectKey);
        upsertProject(dashboardProjectKey, (current) => ({
          ...current,
          type: definition.type,
          name: name || current.name || definition.title,
          ownerUserId: current.ownerUserId || existingProject?.ownerUserId || owner.id,
          ownerName: current.ownerName || existingProject?.ownerName || ownerAccount?.name || owner.username,
          ordersChannelId: ordersRoom?.id || current.ordersChannelId || null
        }));

        await sendProjectStatus(interaction, dashboardProjectKey);
        return;
      }

      if (interaction.commandName === "تغيير-اسم-مشروع") {
        if (!(await ensurePoliceBankPermission(interaction))) {
          return;
        }

        await interaction.deferReply({ ephemeral: true });
        const projectKey = interaction.options.getString("project", true);
        const newName = interaction.options.getString("name", true).trim();
        const definition = getProjectDefinition(projectKey);
        const project = ensureProjectState(projectKey);

        if (!definition || !project) {
          await interaction.editReply({ content: "المشروع غير معروف." });
          return;
        }

        if (!newName) {
          await interaction.editReply({ content: "اكتب اسمًا صحيحًا للمشروع." });
          return;
        }

        const previousName = project.name || definition.title;
        const updated = upsertProject(projectKey, (current) => ({
          ...current,
          name: newName
        }));

        appendProjectTransaction({
          projectKey,
          type: "rename_project",
          label: "تغيير اسم المشروع",
          amount: 0,
          direction: "none",
          actorUserId: interaction.user.id,
          note: `تم تغيير الاسم من ${previousName} إلى ${newName}`,
          balanceAfter: updated.budget
        });

        await sendPoliceBankLog({
          title: "🏷️ **تغيير اسم مشروع**",
          description: "**تم تعديل اسم مشروع داخل نظام المشاريع.**",
          fields: [
            { name: "🧑‍⚖️ **المنفذ**", value: `**<@${interaction.user.id}>**`, inline: true },
            { name: "🏢 **الاسم السابق**", value: `**${previousName}**`, inline: true },
            { name: "✨ **الاسم الجديد**", value: `**${newName}**`, inline: true }
          ]
        });

        await refreshStoredProjectPanel(projectKey);
        await interaction.editReply({ content: `تم تغيير اسم المشروع من **${previousName}** إلى **${newName}**.` });
        return;
      }

      if (interaction.commandName === "اعطاء-مشروع") {
        if (!(await ensurePoliceBankPermission(interaction))) {
          return;
        }

        await interaction.deferReply({ ephemeral: true });
        const projectKey = interaction.options.getString("project", true);
        const member = interaction.options.getUser("member", true);
        const definition = getProjectDefinition(projectKey);
        const account = getAccount(member.id);
        const project = ensureProjectState(projectKey);

        if (!definition || !project) {
          await interaction.editReply({ content: "المشروع غير معروف." });
          return;
        }

        if (project.ownerUserId && project.ownerUserId !== member.id) {
          await interaction.editReply({ content: "هذا المشروع مملوك بالفعل. استخدم خيار **نقل الملكية** بدلًا من إعطائه مباشرة." });
          return;
        }

        if (!account) {
          await interaction.editReply({ content: "هذا الشخص لا يملك حسابًا بنكيًا." });
          return;
        }

        const updated = upsertProject(projectKey, (current) => ({
          ...current,
          ownerUserId: member.id,
          ownerName: account.name || member.username,
          name: current.name || definition.title
        }));

        appendProjectTransaction({
          projectKey,
          type: "assign_owner",
          label: "إعطاء مشروع",
          amount: 0,
          direction: "none",
          actorUserId: interaction.user.id,
          targetUserId: member.id,
          note: `تم منح المشروع إلى ${member.id}`,
          balanceAfter: updated.budget
        });

        await client.users.fetch(member.id).then((user) => user.send({
          embeds: [
            new EmbedBuilder()
              .setColor(definition.color)
              .setTitle("🏗️ تم منحك مشروع جديد")
              .setDescription("**تم منحك ملكية مشروع داخل عرب وورلد بنجاح.**")
              .addFields(
                { name: "🏢 المشروع", value: `**${updated.name || definition.title}**`, inline: true },
                { name: "🧑‍⚖️ بواسطة", value: `**<@${interaction.user.id}>**`, inline: true },
                { name: "💰 الميزانية الحالية", value: `**${formatProjectCurrency(updated.budget)}**`, inline: true }
              )
              .setFooter({ text: "Arab World • المشاريع" })
              .setTimestamp()
          ]
        }).catch(() => null)).catch(() => null);

        await sendPoliceBankLog({
          title: "🏗️ **منح مشروع لمواطن**",
          description: "**تم تسجيل منح مشروع جديد لأحد المواطنين.**",
          fields: [
            { name: "🧑‍⚖️ **المنفذ**", value: `**<@${interaction.user.id}>**`, inline: true },
            { name: "👤 **المالك الجديد**", value: `**<@${member.id}>**`, inline: true },
            { name: "🏢 **المشروع**", value: `**${updated.name || definition.title}**`, inline: true }
          ]
        });

        await refreshStoredProjectPanel(projectKey);
        await interaction.editReply({ content: `تم منح مشروع **${updated.name || definition.title}** إلى ${member}.` });
        return;
      }

      if (interaction.commandName === "سحب-مشروع") {
        if (!(await ensurePoliceBankPermission(interaction))) {
          return;
        }

        await interaction.deferReply({ ephemeral: true });
        const projectKey = interaction.options.getString("project", true);
        const member = interaction.options.getUser("member", true);
        const definition = getProjectDefinition(projectKey);
        const project = ensureProjectState(projectKey);

        if (!definition || !project) {
          await interaction.editReply({ content: "المشروع غير معروف." });
          return;
        }

        if (project.ownerUserId && project.ownerUserId !== member.id) {
          await interaction.editReply({ content: "هذا الشخص ليس المالك الحالي لهذا المشروع." });
          return;
        }

        upsertProject(projectKey, (current) => ({
          ...current,
          ownerUserId: null,
          ownerName: "",
          admins: [],
          employees: [],
          partners: []
        }));

        appendProjectTransaction({
          projectKey,
          type: "remove_owner",
          label: "سحب مشروع",
          amount: 0,
          direction: "none",
          actorUserId: interaction.user.id,
          targetUserId: member.id,
          note: `تم سحب المشروع من ${member.id}`,
          balanceAfter: project.budget
        });

        await refreshStoredProjectPanel(projectKey);
        await interaction.editReply({ content: `تم سحب مشروع **${project.name || definition.title}** من ${member}.` });
        return;
      }

      if (interaction.commandName === "اضافه-مال-لمشروع" || interaction.commandName === "سحب-مال-من-مشروع") {
        if (!(await ensurePoliceBankPermission(interaction))) {
          return;
        }

        await interaction.deferReply({ ephemeral: true });
        const projectKey = interaction.options.getString("project", true);
        const amount = interaction.options.getInteger("amount", true);
        const type = interaction.commandName === "اضافه-مال-لمشروع" ? "manual_add" : "manual_remove";
        const result = applyProjectMoneyMutation(projectKey, amount, type, interaction.user.id, "عملية إدارية على ميزانية المشروع");
        const definition = getProjectDefinition(projectKey);

        if (!result.ok) {
          await interaction.editReply({
            content: result.error === "insufficient_project_budget" ? "ميزانية المشروع أقل من المبلغ المطلوب." : "تعذر تنفيذ العملية على المشروع."
          });
          return;
        }

        await sendPoliceBankLog({
          title: interaction.commandName === "اضافه-مال-لمشروع" ? "💰 **إضافة مال لمشروع**" : "🏦 **سحب مال من مشروع**",
          description: "**تم تسجيل عملية على ميزانية مشروع.**",
          fields: [
            { name: "🧑‍⚖️ **المنفذ**", value: `**<@${interaction.user.id}>**`, inline: true },
            { name: "🏢 **المشروع**", value: `**${result.project.name || definition?.title || projectKey}**`, inline: true },
            { name: "💵 **المبلغ**", value: `**${formatProjectCurrency(amount)}**`, inline: true },
            { name: "💳 **الميزانية الحالية**", value: `**${formatProjectCurrency(result.project.budget)}**`, inline: true }
          ]
        });

        await refreshStoredProjectPanel(projectKey);
        await interaction.editReply({
          content: interaction.commandName === "اضافه-مال-لمشروع"
            ? `تمت إضافة **${formatProjectCurrency(amount)}** إلى مشروع **${result.project.name || definition?.title || projectKey}**.`
            : `تم سحب **${formatProjectCurrency(amount)}** من مشروع **${result.project.name || definition?.title || projectKey}**.`
        });
        return;
      }

      if (interaction.commandName === "اضافه-بنزين" || interaction.commandName === "تقليل-البنزين") {
        if (!(await ensurePoliceBankPermission(interaction))) {
          return;
        }

        await interaction.deferReply({ ephemeral: true });
        const projectKey = interaction.options.getString("project", true);
        const percent = interaction.options.getInteger("percent", true);
        const definition = getProjectDefinition(projectKey);
        const project = ensureProjectState(projectKey);

        if (!definition || !project || !STATION_PROJECT_KEYS.includes(projectKey)) {
          await interaction.editReply({ content: "هذا الأمر مخصص للمحطات فقط." });
          return;
        }

        const updated = upsertProject(projectKey, (current) => ({
          ...current,
          fuelPercent: Math.max(0, Math.min(100, Number(current.fuelPercent || 0) + (interaction.commandName === "اضافه-بنزين" ? percent : -percent))),
          lastFuelPercentNotified: Math.max(0, Math.min(100, Number(current.fuelPercent || 0) + (interaction.commandName === "اضافه-بنزين" ? percent : -percent)))
        }));

        appendProjectTransaction({
          projectKey,
          type: interaction.commandName === "اضافه-بنزين" ? "fuel_add" : "fuel_reduce",
          label: interaction.commandName === "اضافه-بنزين" ? "إضافة بنزين" : "تقليل البنزين",
          amount: percent,
          direction: interaction.commandName === "اضافه-بنزين" ? "credit" : "debit",
          actorUserId: interaction.user.id,
          note: "تعديل يدوي على وقود المحطة",
          balanceAfter: updated.budget
        });

        await refreshStoredProjectPanel(projectKey);
        await interaction.editReply({
          content: `${interaction.commandName === "اضافه-بنزين" ? "تمت إضافة" : "تم تقليل"} **${percent}%** ${interaction.commandName === "اضافه-بنزين" ? "إلى" : "من"} وقود **${updated.name || definition.title}**. النسبة الحالية: **${updated.fuelPercent}%**`
        });
        return;
      }

      if (interaction.commandName === "police") {
        if (!(await ensureBudgetPermission(interaction, BUDGET_KEYS.police))) {
          return;
        }

        await sendBudgetHome(interaction, BUDGET_KEYS.police);
        return;
      }

      if (interaction.commandName === "guard") {
        if (!(await ensureBudgetPermission(interaction, BUDGET_KEYS.guard))) {
          return;
        }

        await sendBudgetHome(interaction, BUDGET_KEYS.guard);
        return;
      }

      if (interaction.commandName === "gang") {
        await sendBudgetHome(interaction, BUDGET_KEYS.gang);
        return;
      }

      if (interaction.commandName === "jus") {
        if (!(await ensureBudgetPermission(interaction, BUDGET_KEYS.jus))) {
          return;
        }

        await sendBudgetHome(interaction, BUDGET_KEYS.jus);
        return;
      }

      if (interaction.commandName === "ميزانيه-الدوله") {
        if (!(await ensureBudgetPermission(interaction, BUDGET_KEYS.state))) {
          return;
        }

        await sendBudgetHome(interaction, BUDGET_KEYS.state);
        return;
      }

      if (interaction.commandName === "طاولة-تصنيع") {
        const account = refreshCraftingProgress(interaction.user.id);
        if (!account) {
          await interaction.reply({ content: "لا يوجد لديك حساب بنكي لفتح طاولة التصنيع.", ephemeral: true });
          return;
        }

        await interaction.reply({
          embeds: [buildCraftingHomeEmbed(account)],
          components: [createCraftingLevelMenu()],
          files: getCraftingImageFiles(),
          ephemeral: false
        });
        return;
      }

      if (interaction.commandName === "استخراج-طاولة-تصنيع") {
        const account = refreshCraftingProgress(interaction.user.id);
        if (!account) {
          await interaction.reply({ content: "لا يوجد لديك حساب بنكي لعرض طاولة التصنيع.", ephemeral: true });
          return;
        }

        const levelKey = interaction.options.getString("level", true);
        const level = CRAFTING_TABLE_LEVELS[levelKey];
        if (!level) {
          await interaction.reply({ content: "المستوى المطلوب غير موجود.", ephemeral: true });
          return;
        }

        const components = [];
        if (levelKey === CRAFTING_TABLE_LEVELS.level1.key) {
          components.push(createCraftingWeaponMenu(levelKey));
        }
        if (levelKey === CRAFTING_TABLE_LEVELS.level2.key) {
          if (!hasLevel2CraftingAccess(interaction.member, account)) {
            await interaction.reply({
              content: "لا يمكنك استخدام طاولة المستوى الثاني قبل فتحها من مسار الاستخراج أو امتلاك رتبة الوصول الخاصة بها.",
              ephemeral: true
            });
            return;
          }

          if (!hasCraftingTable(account, 2)) {
            updateAccount(interaction.user.id, (current) => {
              current.crafting ??= {};
              current.crafting.tableLevel = Math.max(Number(current.crafting.tableLevel || 0), 2);
              return current;
            });
          }
          components.push(createCraftingWeaponMenu(levelKey));
        }
        if (levelKey === CRAFTING_TABLE_LEVELS.level2upgraded.key) {
          if (!hasLevel2CraftingAccess(interaction.member, account)) {
            await interaction.reply({
              content: "يجب أن تفتح المستوى الثاني أولًا قبل التطوير.",
              ephemeral: true
            });
            return;
          }

          components.push(hasLevel2UpgradedCraftingAccess(account) ? createCraftingWeaponMenu(levelKey) : buildCraftingLevel2UpgradeButtons());
        }
        if (levelKey === CRAFTING_TABLE_LEVELS.level3.key) {
          if (!hasLevel2UpgradedCraftingAccess(account)) {
            await interaction.reply({
              content: "لا يمكنك فتح المستوى الثالث قبل امتلاك المستوى الثاني المطور.",
              ephemeral: true
            });
            return;
          }

          if (hasLevel3CraftingAccess(account)) {
            components.push(createCraftingWeaponMenu(levelKey));
          } else if (account?.crafting?.level3Quest?.stage !== "waiting") {
            components.push(buildCraftingLevel3StartButtons());
          }
        }

        await interaction.reply({
          embeds: [buildCraftingLevelEmbed(levelKey, refreshCraftingProgress(interaction.user.id))],
          components,
          files: getCraftingImageFiles(),
          ephemeral: false
        });
        return;
      }

      if (interaction.commandName === "اعطاء-مخطوطه") {
        if (!(await ensurePoliceBankPermission(interaction))) {
          return;
        }

        const deferred = await safelyDeferReply(interaction, { ephemeral: true });
        if (!deferred) {
          return;
        }

        const member = interaction.options.getUser("member", true);
        const type = interaction.options.getString("type") || "second";
        const account = getAccount(member.id);
        if (!account) {
          await interaction.editReply({ content: "هذا الشخص لا يملك حسابًا بنكيًا." });
          return;
        }

        let delivered = false;
        if (type === "first") {
          updateAccount(member.id, (current) => {
            current.crafting ??= {};
            current.crafting.level2Quest ??= {};
            current.crafting.level2Quest.stage = "stage1_sent";
            current.crafting.level2Quest.startedAt = current.crafting.level2Quest.startedAt || new Date().toISOString();
            current.crafting.level2Quest.firstPuzzleSentAt = new Date().toISOString();
            return current;
          });

          delivered = await sendCraftingLevel2FirstPuzzle(member.id);
        } else {
          updateAccount(member.id, (current) => {
            current.crafting ??= {};
            current.crafting.level2Quest ??= {};
            current.crafting.level2Quest.stage = "stage2_sent";
            current.crafting.level2Quest.secondPuzzleSentAt = new Date().toISOString();
            return current;
          });

          delivered = await sendCraftingLevel2SecondPuzzle(member.id, "بشكل يدوي من الإدارة");
        }

        if (!delivered) {
          await interaction.editReply({ content: "تعذر إرسال المخطوطة إلى الخاص. تأكد أن الخاص مفتوح مع البوت." });
          return;
        }

        await sendAuditLog(client, config.auditChannelId, {
          title: "📜 **إرسال مخطوطة يدويًا**",
          description: "**تم إرسال مخطوطة المستوى الثاني يدويًا إلى أحد الأعضاء.**",
          fields: [
            { name: "🧑‍⚖️ **المنفذ**", value: `**<@${interaction.user.id}>**`, inline: true },
            { name: "👤 **المستهدف**", value: `**<@${member.id}>**`, inline: true },
            { name: "📄 **نوع المخطوطة**", value: type === "first" ? "**الأولى**" : "**الثانية**", inline: true }
          ]
        });

        await interaction.editReply({
          content: `تم إرسال المخطوطة ${type === "first" ? "الأولى" : "الثانية"} إلى ${member} بنجاح.`
        });
        return;
      }

      if (interaction.commandName === "اضافه-مال-ميزانيه" || interaction.commandName === "خصم-مال-ميزانيه") {
        const budgetKey = interaction.options.getString("budget", true);
        const amount = interaction.options.getInteger("amount", true);
        const type = interaction.commandName === "اضافه-مال-ميزانيه" ? "manual_add" : "manual_remove";

        if (!canUseSlashCommands(interaction.member)) {
          await interaction.reply({ content: `هذا الأمر متاح فقط لمن يملك الرتبة <@&${config.slashAccessRoleId}>.`, ephemeral: true });
          return;
        }

        const result = applyBudgetTransaction({
          budgetKey,
          type,
          amount,
          actorUserId: interaction.user.id,
          label: type === "manual_add" ? "إضافة يدوية" : "خصم يدوي",
          note: `أمر إداري بواسطة ${interaction.user.id}`
        });

        if (!result.ok) {
          await interaction.reply({
            content: result.error === "insufficient_budget_balance" ? "رصيد الميزانية أقل من المبلغ المطلوب." : "تعذر تنفيذ العملية على الميزانية.",
            ephemeral: true
          });
          return;
        }

        await interaction.reply(buildBudgetStatusPayload(budgetKey));
        return;
      }

      if (interaction.commandName === "account-bank") {
        await interaction.deferReply({ ephemeral: true });

        const bankName = interaction.options.getString("bank_name", true);
        const removedAccount = removeAccountByName(bankName);

        if (!removedAccount) {
          await interaction.editReply({ content: "لم يتم العثور على حساب بنكي بهذا الاسم." });
          return;
        }

        clearPendingWebsiteLoginVerificationsForAccount(removedAccount);

        const removedMember = interaction.guild
          ? await interaction.guild.members.fetch(removedAccount.discordUserId).catch(() => null)
          : null;

        await removedMember?.roles.remove([
          config.m9RoleId,
          COLT_ROLE_ID,
          CRAFTING_LEVEL2_ACCESS_ROLE_ID
        ].filter(Boolean)).catch(() => null);

        await sendSystemLog(ADMIN_COMMANDS_LOG_CHANNEL_ID, {
          title: "🏦 **حذف حساب بنكي نهائيًا**",
          description: "**تم حذف الحساب البنكي نهائيًا من النظام ويمكن لصاحبه إنشاء حساب جديد لاحقًا.**",
          fields: [
            { name: "👤 **المسؤول**", value: `**<@${interaction.user.id}>**`, inline: true },
            { name: "📨 **صاحب الحساب**", value: `**<@${removedAccount.discordUserId}>**`, inline: true },
            { name: "🪪 **الاسم البنكي**", value: `**${removedAccount.name}**`, inline: true },
            { name: "🆔 **رقم الحساب**", value: `**${removedAccount.accountNumber}**`, inline: true }
          ]
        });

        await interaction.editReply({
          content: `تم حذف الحساب البنكي الخاص بـ **${removedAccount.name}** نهائيًا، ويمكنه فتح حساب جديد الآن.`
        });
        return;
      }

      if (interaction.commandName === "add-car") {
        await interaction.deferReply({ ephemeral: true });

        const member = interaction.options.getUser("member", true);
        const vehicleName = interaction.options.getString("vehicle", true).trim();
        const account = getAccount(member.id);
        if (!account) {
          await interaction.editReply({ content: "لا يوجد لهذا الشخص حساب بنكي." });
          return;
        }

        registerVehicleName(vehicleName);
        invalidateVehicleCatalogCache();
        addOwnedVehicle(member.id, vehicleName, {
          purchasePrice: getVehicleOffer(vehicleName).price,
          grantedBy: interaction.user.id,
          source: "admin_add"
        });

        await sendSystemLogs([ADMIN_COMMANDS_LOG_CHANNEL_ID, CARS_LOG_CHANNEL_ID], {
          title: "🚗 **إضافة مركبة يدويًا**",
          description: "**تمت إضافة مركبة إلى ممتلكات أحد الأعضاء يدويًا.**",
          fields: [
            { name: "👤 **المسؤول**", value: `**<@${interaction.user.id}>**`, inline: true },
            { name: "📨 **المستهدف**", value: `**<@${member.id}>**`, inline: true },
            { name: "🚘 **المركبة**", value: `**${vehicleName}**`, inline: true }
          ]
        });

        await interaction.editReply({ content: `تمت إضافة المركبة **${vehicleName}** إلى ${member}.` });
        return;
      }

      if (interaction.commandName === "remove-car" || interaction.commandName === "سحب-مركبه") {
        await interaction.deferReply({ ephemeral: true });

        const member = interaction.options.getUser("member", true);
        const vehicleName = interaction.options.getString("vehicle", true).trim();
        const removedVehicle = removeOwnedVehicle(member.id, vehicleName);

        if (!removedVehicle) {
          await interaction.editReply({ content: "هذا الشخص لا يملك هذه المركبة." });
          return;
        }

        await sendSystemLogs([ADMIN_COMMANDS_LOG_CHANNEL_ID, CARS_LOG_CHANNEL_ID], {
          title: "🧾 **سحب مركبة يدويًا**",
          description: "**تم سحب مركبة من ممتلكات أحد الأعضاء.**",
          fields: [
            { name: "👤 **المسؤول**", value: `**<@${interaction.user.id}>**`, inline: true },
            { name: "📨 **المستهدف**", value: `**<@${member.id}>**`, inline: true },
            { name: "🚘 **المركبة**", value: `**${removedVehicle.name}**`, inline: true }
          ]
        });

        await client.users.fetch(member.id).then((user) => user.send({
          embeds: [
            buildVehicleRemovedDmEmbed({
              vehicleName: removedVehicle.name,
              executorLabel: `<@${interaction.user.id}>`
            })
          ]
        }).catch(() => null)).catch(() => null);

        await interaction.editReply({ content: `تم سحب المركبة **${removedVehicle.name}** من ${member}.` });
        return;
      }

      if (interaction.commandName === "car-price") {
        await interaction.deferReply({ ephemeral: true });

        const vehicleName = interaction.options.getString("vehicle", true).trim();
        const price = interaction.options.getInteger("price", true);

        registerVehicleName(vehicleName);
        setVehiclePrice(vehicleName, price);
        invalidateVehicleCatalogCache();

        await sendSystemLogs([ADMIN_COMMANDS_LOG_CHANNEL_ID, CARS_LOG_CHANNEL_ID], {
          title: "💵 **تحديث سعر مركبة**",
          description: "**تم تحديث سعر مركبة داخل المعرض.**",
          fields: [
            { name: "👤 **المسؤول**", value: `**<@${interaction.user.id}>**`, inline: true },
            { name: "🚘 **المركبة**", value: `**${vehicleName}**`, inline: true },
            { name: "💰 **السعر الجديد**", value: `**${price === 0 ? "مجاني" : formatCurrency(price)}**`, inline: true }
          ]
        });

        await interaction.editReply({
          content: price === 0
            ? `تم جعل المركبة **${vehicleName}** مجانية.`
            : `تم تحديد سعر المركبة **${vehicleName}** إلى **${formatCurrency(price)}**.`
        });
        return;
      }

      if (interaction.commandName === "check-weapon") {
        const robloxUsername = interaction.options.getString("roblox_username", true);
        const weaponCode = String(interaction.options.getString("weapon") || "M9").trim().toUpperCase();

        if (weaponCode !== "M9") {
          await interaction.reply({ content: "التحقق اليدوي الحالي يدعم سلاح M9 فقط.", ephemeral: true });
          return;
        }

        const guild = await client.guilds.fetch(config.guildId);
        const result = await verifyWeaponOwnership({
          guild,
          robloxUsername,
          weaponRoleId: config.m9RoleId,
          memberPrefix: config.guildMemberPrefix
        });

        await sendWeaponEnforcementAudit({
          sourceLabel: `manual_check_by_${interaction.user.id}`,
          robloxUsername,
          weaponCode,
          result
        });

        await interaction.reply({
          embeds: [
            buildPrivateNoticeEmbed({
              title: result.allowed ? "🛡️ تحقق ناجح" : "🚨 تم تنفيذ الفحص",
              description: result.allowed
                ? `**اللاعب \`${robloxUsername}\` معه صلاحية السلاح ولم تُطبق أي عقوبة.**`
                : `**اللاعب \`${robloxUsername}\` لا يملك صلاحية السلاح، وتم تنفيذ مسار العقوبة.**`
            })
          ],
          ephemeral: true
        });
        return;
      }

      if (interaction.commandName === "اخذ-ايدي-شخص") {
        await interaction.deferReply({ ephemeral: true });

        const robloxUsername = interaction.options.getString("roblox_username", true).trim();
        const lookupResult = await fetchRobloxUserIdByUsername(robloxUsername);

        if (!lookupResult.ok) {
          const messageMap = {
            missing_username: "اكتب يوزر روبلوكس صحيح.",
            username_not_found: "تعذر العثور على هذا اليوزر في Roblox.",
            roblox_api_failed: "تعذر الوصول إلى Roblox الآن. جرّب مرة أخرى بعد قليل.",
            roblox_lookup_error: "حدث خطأ أثناء جلب Roblox ID."
          };

          await interaction.editReply({
            content: messageMap[lookupResult.error] || "تعذر جلب Roblox ID لهذا المستخدم."
          });
          return;
        }

        const token = createRobloxLookupToken();
        pendingRobloxProfileLookups.set(token, {
          requesterId: interaction.user.id,
          username: lookupResult.username,
          robloxUserId: lookupResult.robloxUserId,
          profileUrl: lookupResult.profileUrl || "",
          createdAt: Date.now()
        });

        await interaction.editReply({
          embeds: [
            buildRobloxLookupEmbed({
              username: lookupResult.username,
              robloxUserId: lookupResult.robloxUserId,
              profileUrl: lookupResult.profileUrl,
              avatarUrl: lookupResult.avatarUrl
            })
          ],
          components: [createRobloxLookupCopyButton(token)]
        });
        return;
      }

      if (interaction.commandName === "add-money" || interaction.commandName === "remove-money") {
        await interaction.deferReply({ ephemeral: true });

        const member = interaction.options.getUser("member", true);
        const amount = interaction.options.getInteger("amount", true);
        const result = await adjustBalance({
          targetUserId: member.id,
          amount,
          operationType: interaction.commandName === "add-money" ? "manual_add" : "manual_remove",
          actorId: interaction.user.id,
          reason: interaction.commandName === "add-money" ? "Admin add money command" : "Admin remove money command"
        });

        if (!result.ok) {
          await interaction.editReply({
            content: result.error === "insufficient_balance" ? "رصيد الشخص أقل من المبلغ المطلوب." : "لا يوجد لهذا الشخص حساب بنكي.",
          });
          return;
        }

        await sendSystemLog(ADMIN_COMMANDS_LOG_CHANNEL_ID, {
          title: interaction.commandName === "add-money" ? "💰 **إضافة فلوس يدويًا**" : "🏦 **خصم فلوس يدويًا**",
          description: "**تم تنفيذ عملية إدارية على الرصيد البنكي وتوثيقها بنجاح.**",
          fields: [
            { name: "👤 **المسؤول**", value: `**<@${interaction.user.id}>**`, inline: true },
            { name: "📨 **المستهدف**", value: `**<@${member.id}>**`, inline: true },
            buildBankAccountAuditField(result.account),
            { name: "💵 **المبلغ**", value: `**${amount.toLocaleString("en-US")} ريال**`, inline: true },
            { name: "💳 **الرصيد الحالي**", value: `**${result.account.balance.toLocaleString("en-US")} ريال**`, inline: true }
          ]
        });

        await sendPoliceBankLog({
          title: interaction.commandName === "add-money" ? "💰 **إضافة إدارية إلى حساب مواطن**" : "🏦 **خصم إداري من حساب مواطن**",
          description: "**تم تسجيل عملية إدارية على حساب مواطن ضمن لوق الداخلية.**",
          fields: [
            { name: "🧑‍⚖️ **المنفذ**", value: `**<@${interaction.user.id}>**`, inline: true },
            ...buildPoliceBankTargetAuditFields(result.account, member.id),
            { name: "💵 **المبلغ**", value: `**${formatCurrency(amount)}**`, inline: true },
            { name: "📌 **نوع العملية**", value: interaction.commandName === "add-money" ? "**إضافة**" : "**خصم**", inline: true }
          ]
        });

        await interaction.editReply({
          content: interaction.commandName === "add-money"
            ? `تمت إضافة ${amount.toLocaleString("en-US")} ريال إلى ${member}.`
            : `تم خصم ${amount.toLocaleString("en-US")} ريال من ${member}.`
        });
        return;
      }

      if (interaction.commandName === "اعطاء-بطاقه") {
        await interaction.deferReply({ ephemeral: true });

        const member = interaction.options.getUser("member", true);
        const cardType = interaction.options.getString("card_type", true);
        const cardDefinition = getBankCardDefinition(cardType);
        const guildMember = await interaction.guild.members.fetch(member.id).catch(() => null);

        if (!guildMember) {
          await interaction.editReply({ content: "تعذر العثور على العضو داخل السيرفر." });
          return;
        }

        const rolesToRemove = [BLACK_BANK_CARD_ROLE_ID, GOLD_BANK_CARD_ROLE_ID]
          .filter((roleId) => roleId !== cardDefinition.roleId && guildMember.roles.cache.has(roleId));

        try {
          if (!guildMember.roles.cache.has(cardDefinition.roleId)) {
            await guildMember.roles.add(cardDefinition.roleId);
          }
          if (rolesToRemove.length) {
            await guildMember.roles.remove(rolesToRemove);
          }
        } catch (error) {
          console.error("Failed to grant bank card role:", error);
          await interaction.editReply({
            content: "تعذر منح البطاقة. تأكد أن رتبة البوت أعلى من رتب البطاقات ثم جرّب مرة أخرى."
          });
          return;
        }

        await client.users.fetch(member.id).then((user) => user.send({
          embeds: [
            buildBankCardGrantedDmEmbed({
              cardDefinition,
              grantedByUserId: interaction.user.id
            })
          ]
        }).catch(() => null)).catch(() => null);

        const targetAccount = getAccount(member.id);
        await sendPoliceBankLog({
          title: `${cardDefinition.emoji} **منح بطاقة بنكية مميزة**`,
          description: `**تم منح ${cardDefinition.label} لمواطن داخل النظام البنكي.**`,
          color: cardDefinition.color,
          fields: [
            { name: "🧑‍⚖️ **المنفذ**", value: `**<@${interaction.user.id}>**`, inline: true },
            { name: "👤 **المستفيد**", value: `**<@${member.id}>**`, inline: true },
            ...(targetAccount ? buildPoliceBankTargetAuditFields(targetAccount, member.id) : []),
            { name: "🪪 **نوع البطاقة**", value: `**${cardDefinition.label}**`, inline: true },
            { name: "💸 **سقف التحويل**", value: `**${cardDefinition.limitText}**`, inline: true }
          ]
        });

        await interaction.editReply({
          content: `تم منح ${cardDefinition.label} إلى ${member} بنجاح.`
        });
        return;
      }

      if (interaction.commandName === "ايمبد-المعلومات") {
        const account = refreshCraftingProgress(interaction.user.id);
        if (!account) {
          await interaction.reply({ content: "لا يوجد لديك حساب بنكي.", ephemeral: true });
          return;
        }

        await interaction.reply({
          embeds: [buildWeaponsInfoEmbed(account)],
          components: [createWeaponsInfoMenu()],
          ephemeral: false
        });
        return;
      }

      if (interaction.commandName === "معلومات") {
        const deferred = await safelyDeferReply(interaction, { ephemeral: true });
        if (!deferred) {
          return;
        }

        const member = interaction.options.getUser("member", true);
        const account = requireAccount(member.id);

        if (!account) {
          await interaction.editReply({
            content: "لا يوجد لهذا الشخص حساب بنكي مسجل."
          });
          return;
        }

        const ownedVehicles = listOwnedVehicles(member.id, { includeRentals: true });
        const recentTransactions = listTransactionsForUser(member.id, 12);
        const weaponLines = buildAccountInfoWeaponLines(account);
        const transactionLines = recentTransactions.map((entry) => formatAccountInfoTransactionLine(entry));

        await interaction.editReply({
          embeds: [buildAccountInfoEmbedPolished({
            ...account,
            ownedVehicles,
            recentTransactions,
            weaponLines,
            transactionLines
          }, `<@${member.id}>`)],
        });
        return;
      }

      if (interaction.commandName === "رؤيه-مخالفات") {
        await interaction.deferReply({ ephemeral: false });

        const member = interaction.options.getUser("member");
        try {
          const payload = await buildFinesViewReplyPayload(member?.id || null);
          await interaction.editReply(payload);
          const reply = await interaction.fetchReply().catch(() => null);
          if (reply?.id && interaction.channelId) {
            activeFinesViewMessages.set(reply.id, {
              channelId: interaction.channelId,
              targetUserId: member?.id || null
            });
          }
        } catch (error) {
          console.error("Fines card failed:", error);
          await interaction.editReply({
            content: "تعذر إنشاء بطاقة المخالفات. تأكد من رفع صورة `360_20260428151402.png` أو `fines-view-template.png`."
          });
        }
        return;
      }

      if (interaction.commandName === "سحب-ممتلكات") {
        if (!(await ensurePoliceBankPermission(interaction))) {
          return;
        }
        await interaction.deferReply({ ephemeral: true });

        const member = interaction.options.getUser("member", true);
        const reason = interaction.options.getString("reason", true);
        const account = getAccount(member.id);

        if (!account) {
          await interaction.editReply({ content: "هذا الشخص لا يملك حسابًا بنكيًا." });
          return;
        }

        if (account.assetsSeized) {
          await interaction.editReply({ content: "ممتلكات هذا الشخص محجوزة بالفعل." });
          return;
        }

        const snapshot = {
          cars: structuredClone(account.cars ?? {}),
          resources: structuredClone(account.resources ?? {}),
          weapons: structuredClone(account.weapons ?? {})
        };

        const updated = updateAccount(member.id, (current) => {
          current.assetsSeized = true;
          current.assetsSeizedReason = reason;
          current.assetsSeizedBy = interaction.user.id;
          current.assetsSeizedAt = new Date().toISOString();
          current.seizedAssetsSnapshot = snapshot;
          current.cars = {};
          current.resources = { coal: 0, copper: 0, iron: 0, aluminum: 0, sulfur: 0, plastic: 0 };
          current.weapons = {};
          return current;
        });

        const guild = await client.guilds.fetch(config.guildId).catch(() => null);
        const memberTarget = guild ? await guild.members.fetch(member.id).catch(() => null) : null;
        await memberTarget?.roles.remove(config.m9RoleId).catch(() => null);
        await memberTarget?.roles.remove(COLT_ROLE_ID).catch(() => null);

        await sendPoliceBankLog({
          title: "📦 **سحب ممتلكات مواطن**",
          description: "**تم سحب ممتلكات مواطن بالكامل بأمر مباشر من الداخلية.**",
          fields: [
            { name: "🧑‍⚖️ **المنفذ**", value: `**<@${interaction.user.id}>**`, inline: true },
            ...buildPoliceBankTargetAuditFields(updated, member.id),
            { name: "🚗 **عدد المركبات المسحوبة**", value: `**${Object.keys(snapshot.cars || {}).length}**`, inline: true },
            { name: "📝 **السبب**", value: `**${reason}**`, inline: false }
          ]
        });

        await client.users.fetch(member.id).then((user) => user.send({ embeds: [buildAssetsSeizedDmEmbedPolished({ executorLabel: `<@${interaction.user.id}>`, reason })] }).catch(() => null)).catch(() => null);
        await interaction.editReply({ content: `تم سحب ممتلكات <@${member.id}> بالكامل.` });
        return;
      }

      if (interaction.commandName === "سحب-موارد") {
        if (!(await ensurePoliceBankPermission(interaction))) {
          return;
        }
        await interaction.deferReply({ ephemeral: true });

        const member = interaction.options.getUser("member", true);
        const resourceKey = interaction.options.getString("resource", true);
        const amount = interaction.options.getInteger("amount");
        const zero = interaction.options.getBoolean("zero") || false;
        const account = getAccount(member.id);

        if (!account) {
          await interaction.editReply({ content: "هذا الشخص لا يملك حسابًا بنكيًا." });
          return;
        }

        if (!RESOURCE_CATALOG[resourceKey]) {
          await interaction.editReply({ content: "المورد المطلوب غير صحيح." });
          return;
        }

        if (!zero && (!Number.isFinite(amount) || amount <= 0)) {
          await interaction.editReply({ content: "حدد كمية صحيحة أو استخدم خيار التصفير." });
          return;
        }

        const beforeAmount = Number(account.resources?.[resourceKey] || 0);
        const removedAmount = zero ? beforeAmount : Math.min(beforeAmount, Number(amount));

        const updated = updateAccount(member.id, (current) => {
          current.resources ??= {};
          current.resources[resourceKey] = zero ? 0 : Math.max(0, Number(current.resources?.[resourceKey] || 0) - Number(amount));
          return current;
        });

        await sendPoliceBankLog({
          title: zero ? "🧹 **تصفير مورد لمواطن**" : "📦 **سحب مورد من مواطن**",
          description: "**تم تنفيذ إجراء مباشر على موارد مواطن.**",
          fields: [
            { name: "🧑‍⚖️ **المنفذ**", value: `**<@${interaction.user.id}>**`, inline: true },
            ...buildPoliceBankTargetAuditFields(updated, member.id),
            { name: "⛏️ **المورد**", value: `**${RESOURCE_CATALOG[resourceKey].label}**`, inline: true },
            { name: "📉 **قبل**", value: `**${beforeAmount}**`, inline: true },
            { name: "📥 **المسحوب**", value: `**${removedAmount}**`, inline: true },
            { name: "📦 **بعد**", value: `**${updated.resources?.[resourceKey] ?? 0}**`, inline: true }
          ]
        });

        await interaction.reply({
          content: zero
            ? `تم تصفير مورد **${RESOURCE_CATALOG[resourceKey].label}** لدى ${member}.`
            : `تم سحب **${removedAmount}** من **${RESOURCE_CATALOG[resourceKey].label}** لدى ${member}.`,
          ephemeral: true
        });
        return;
      }

      if (interaction.commandName === "اضافه-سلاح") {
        if (!(await ensurePoliceBankPermission(interaction))) {
          return;
        }

        const member = interaction.options.getUser("member", true);
        const weaponKey = interaction.options.getString("weapon", true);
        const mode = interaction.options.getString("mode", true);
        const permanent = mode === "permanent";
        const account = getAccount(member.id);
        if (!account) {
          await interaction.reply({ content: "هذا الشخص لا يملك حسابًا بنكيًا.", ephemeral: true });
          return;
        }

        const guild = await client.guilds.fetch(config.guildId).catch(() => null);
        const memberTarget = guild ? await guild.members.fetch(member.id).catch(() => null) : null;
        if (!memberTarget) {
          await interaction.reply({ content: "تعذر العثور على العضو داخل السيرفر.", ephemeral: true });
          return;
        }

        const roleId = getWeaponInventoryDefinition(weaponKey).roleId || (weaponKey === "m9" ? config.m9RoleId : null);
        const weaponLabel = getWeaponBaseLabel(weaponKey);
        const expiresAt = permanent ? null : scheduleWeaponExpiryDate(account, weaponKey, getRandomWeaponExpiryDurationMs());

        if (roleId) {
          await memberTarget.roles.add(roleId).catch(() => null);
        }

        let grantedWeaponCode = "";
        const updated = updateAccount(member.id, (current) => {
          const slotIndex = appendWeaponInventory(current, weaponKey, {
            acquiredAt: new Date().toISOString(),
            purchasedAt: new Date().toISOString(),
            craftedAt: new Date().toISOString(),
            expiresAt,
            active: true,
            brokenAt: null,
            permanent,
            source: "admin_grant",
            weaponLabel
          });
          grantedWeaponCode = buildWeaponInventoryCode(weaponKey, slotIndex);
          return current;
        });

        appendTransaction({
          discordUserId: member.id,
          robloxUsername: updated?.robloxUsername,
          type: "weapon_admin_grant",
          amount: 0,
          direction: "credit",
          balanceAfter: updated?.balance ?? 0,
          metadata: {
            weaponKey,
            grantedBy: interaction.user.id,
            grantMode: permanent ? "permanent" : "temporary"
          }
        });

        await sendAuditLog(client, config.auditChannelId, {
          title: "🔫 **إضافة سلاح يدويًا**",
          description: "**تمت إضافة سلاح يدويًا مع الرتبة الخاصة به.**",
          fields: [
            { name: "👤 **المنفذ**", value: `**<@${interaction.user.id}>**`, inline: true },
            { name: "📨 **المستهدف**", value: `**<@${member.id}>**`, inline: true },
            { name: "🔫 **السلاح**", value: `**${weaponLabel}**`, inline: true },
            { name: "⏱️ **المدة**", value: permanent ? "**لا نهائي**" : "**مؤقت**", inline: true }
          ]
        });

        await sendPoliceBankLog({
          title: "🔫 **منح سلاح لمواطن**",
          description: "**تم تسجيل إضافة سلاح جديدة ضمن لوق النظام.**",
          fields: [
            { name: "🧑‍⚖️ **المنفذ**", value: `**<@${interaction.user.id}>**`, inline: true },
            ...buildPoliceBankTargetAuditFields(updated, member.id),
            { name: "🔫 **السلاح**", value: `**${weaponLabel}**`, inline: true },
            { name: "🆔 **رمز النسخة**", value: `**${grantedWeaponCode}**`, inline: true },
            { name: "📜 **النوع**", value: permanent ? "**دائم**" : "**مؤقت**", inline: true }
          ]
        });

        await memberTarget.send({
          embeds: [
            buildWeaponOperationDmEmbed({
              title: "🎁 تم منحك سلاح جديد",
              description: "أضافت الإدارة سلاحًا جديدًا إلى ممتلكاتك العسكرية.",
              weaponCode: grantedWeaponCode,
              weaponLabel,
              permanent,
              expiresAt,
              actorLabel: `<@${interaction.user.id}>`,
              extraLines: [
                "**📘 التعليمات:** احتفظ بكود السلاح لأنك ستحتاجه إذا أردت إعطاءه لشخص آخر.",
                "**📩 المعلومة المهمة:** يمكنك الآن امتلاك أكثر من نسخة من نفس السلاح."
              ]
            })
          ]
        }).catch(() => null);

        await interaction.reply({
          content: `تمت إضافة سلاح **${weaponLabel}** إلى ${member} برمز **${grantedWeaponCode}** ونوع **${permanent ? "دائم" : "مؤقت"}**.`,
          ephemeral: true
        });
        return;
      }

      if (interaction.commandName === "سحب-سلاح") {
        if (!(await ensurePoliceBankPermission(interaction))) {
          return;
        }

        await interaction.deferReply({ ephemeral: true });

        const member = interaction.options.getUser("member", true);
        const weaponCode = interaction.options.getString("weapon_code", true).trim();
        const weaponKey = interaction.options.getString("weapon", true);
        const mode = interaction.options.getString("mode", true);
        const parsedCode = parseWeaponInventoryCode(weaponCode);

        if (!parsedCode) {
          await interaction.editReply({ content: "كود السلاح غير صحيح. مثال: M9-1 أو COLT-1." });
          return;
        }

        if (parsedCode.weaponKey !== weaponKey) {
          await interaction.editReply({ content: "نوع السلاح المحدد لا يطابق كود السلاح المختار." });
          return;
        }

        const account = getAccount(member.id);
        if (!account) {
          await interaction.editReply({ content: "هذا الشخص لا يملك حسابًا بنكيًا." });
          return;
        }

        const inventory = getWeaponInventory(account, weaponKey);
        const weaponEntry = inventory[parsedCode.index - 1];
        if (!weaponEntry || weaponEntry.active === false || weaponEntry.brokenAt) {
          await interaction.editReply({ content: "هذه النسخة غير موجودة أو لم تعد صالحة." });
          return;
        }

        const actualMode = weaponEntry.permanent || !weaponEntry.expiresAt ? "permanent" : "temporary";
        if (actualMode !== mode) {
          await interaction.editReply({
            content: `مدة السلاح المحددة لا تطابق النسخة المختارة. هذه النسخة نوعها **${actualMode === "permanent" ? "دائم" : "مؤقت"}**.`
          });
          return;
        }

        const weaponLabel = getWeaponBaseLabel(weaponKey);
        const removedSnapshot = normalizeWeaponInventoryEntry(weaponEntry, weaponKey);

        updateAccount(member.id, (current) => {
          const items = getWeaponInventory(current, weaponKey);
          items.splice(parsedCode.index - 1, 1);
          setWeaponInventory(current, weaponKey, items);
          return current;
        });

        const updatedAccount = getAccount(member.id);
        const roleId = getWeaponInventoryDefinition(weaponKey).roleId || (weaponKey === "m9" ? config.m9RoleId : null);
        if (roleId && !hasAnyActiveWeapon(updatedAccount, weaponKey)) {
          const guildMember = interaction.guild ? await interaction.guild.members.fetch(member.id).catch(() => null) : null;
          await guildMember?.roles.remove(roleId).catch(() => null);
        }

        await client.users.fetch(member.id).then((user) => user.send({
          embeds: [
            buildWeaponRemovedDmEmbed({
              weaponCode: weaponCode.toUpperCase(),
              weaponLabel,
              permanent: removedSnapshot.permanent,
              expiresAt: removedSnapshot.expiresAt,
              executorLabel: `<@${interaction.user.id}>`
            })
          ]
        }).catch(() => null)).catch(() => null);

        await sendAuditLog(client, config.auditChannelId, {
          title: "🚫 **سحب سلاح إداريًا**",
          description: "**تم سحب نسخة سلاح من ممتلكات أحد الأعضاء وإزالتها من النظام.**",
          fields: [
            { name: "🧑‍⚖️ **المسؤول**", value: `**<@${interaction.user.id}>**`, inline: true },
            { name: "📨 **المستهدف**", value: `**<@${member.id}>**`, inline: true },
            { name: "🔫 **السلاح**", value: `**${weaponLabel}**`, inline: true },
            { name: "🆔 **رمز النسخة**", value: `**${weaponCode.toUpperCase()}**`, inline: true },
            { name: "📜 **النوع**", value: `**${actualMode === "permanent" ? "دائم" : "مؤقت"}**`, inline: true }
          ]
        });

        await sendPoliceBankLog({
          title: "🚫 **سحب سلاح من مواطن**",
          description: "**تم تسجيل سحب سلاح إداري من حساب مواطن.**",
          fields: [
            { name: "🧑‍⚖️ **المنفذ**", value: `**<@${interaction.user.id}>**`, inline: true },
            ...buildPoliceBankTargetAuditFields(updatedAccount, member.id),
            { name: "🔫 **السلاح**", value: `**${weaponLabel}**`, inline: true },
            { name: "🆔 **النسخة المسحوبة**", value: `**${weaponCode.toUpperCase()}**`, inline: true },
            { name: "📜 **النوع**", value: `**${actualMode === "permanent" ? "دائم" : "مؤقت"}**`, inline: true }
          ]
        });

        await interaction.editReply({
          content: `تم سحب السلاح **${weaponCode.toUpperCase()}** من ${member} بنجاح.`
        });
        return;
      }

      if (interaction.commandName === "اضافه-موارد") {
        if (!(await ensurePoliceBankPermission(interaction))) {
          return;
        }

        await interaction.deferReply({ ephemeral: true });

        const member = interaction.options.getUser("member", true);
        const resourceKey = interaction.options.getString("resource", true);
        const amount = interaction.options.getInteger("amount", true);
        const account = getAccount(member.id);

        if (!account) {
          await interaction.editReply({ content: "هذا الشخص لا يملك حسابًا بنكيًا." });
          return;
        }

        const resourceKeys = resourceKey === "all"
          ? ["coal", "copper", "iron", "aluminum", "sulfur", "plastic"]
          : [resourceKey];

        const invalidKey = resourceKeys.find((key) => !RESOURCE_CATALOG[key]);
        if (invalidKey) {
          await interaction.editReply({ content: "المورد المطلوب غير صحيح." });
          return;
        }

        const beforeSnapshot = Object.fromEntries(
          resourceKeys.map((key) => [key, Number(account.resources?.[key] || 0)])
        );

        const updated = updateAccount(member.id, (current) => {
          current.resources ??= {};
          for (const key of resourceKeys) {
            current.resources[key] = Number(current.resources?.[key] || 0) + amount;
          }
          return current;
        });

        const resourceLines = resourceKeys.map((key) => {
          const before = beforeSnapshot[key];
          const after = Number(updated.resources?.[key] || 0);
          return `• ${RESOURCE_CATALOG[key].emoji} ${RESOURCE_CATALOG[key].label}: **+${amount}** | ${before} → ${after}`;
        });

        appendTransaction({
          discordUserId: member.id,
          robloxUsername: updated?.robloxUsername,
          type: "resource_admin_grant",
          amount: 0,
          direction: "credit",
          balanceAfter: updated?.balance ?? 0,
          metadata: {
            grantedBy: interaction.user.id,
            resources: Object.fromEntries(resourceKeys.map((key) => [key, amount]))
          }
        });

        await sendPoliceBankLog({
          title: resourceKey === "all" ? "📦 **إضافة كل الموارد لمواطن**" : "📦 **إضافة مورد لمواطن**",
          description: "**تمت إضافة موارد إلى حساب مواطن من قبل الإدارة.**",
          fields: [
            { name: "🧑‍⚖️ **المنفذ**", value: `**<@${interaction.user.id}>**`, inline: true },
            ...buildPoliceBankTargetAuditFields(updated, member.id),
            { name: "🔢 **الكمية لكل مورد**", value: `**${amount}**`, inline: true },
            { name: "📋 **التفاصيل**", value: resourceLines.join("\n"), inline: false }
          ]
        });

        await client.users.fetch(member.id).then((user) => user.send({
          embeds: [
            buildResourcesGrantedDmEmbed({
              executorLabel: `<@${interaction.user.id}>`,
              lines: resourceLines
            })
          ]
        }).catch(() => null)).catch(() => null);

        await interaction.editReply({
          content: resourceKey === "all"
            ? `تمت إضافة **${amount}** إلى **كل الموارد** لدى ${member}.`
            : `تمت إضافة **${amount}** من **${RESOURCE_CATALOG[resourceKey].label}** إلى ${member}.`
        });
        return;
      }

      return;
    }

    if (interaction.isStringSelectMenu() && interaction.customId.startsWith("car_select:")) {
      const vehicleName = interaction.values[0];
      const offer = getVehicleOffer(vehicleName);

      if (!offer.name) {
        await interaction.reply({ content: "تعذر تحديد المركبة المطلوبة.", ephemeral: true });
        return;
      }

      pendingCarPurchases.set(interaction.user.id, offer.name);
      await interaction.reply({
        embeds: [buildCarPurchaseConfirmEmbed(offer)],
        components: [buildCarPurchaseButtons()],
        ephemeral: true
      });
      return;
    }

    if (interaction.isStringSelectMenu() && interaction.customId.startsWith("project_menu:")) {
      const projectKey = interaction.customId.split(":")[1];
      const project = ensureProjectState(projectKey);
      const definition = getProjectDefinition(projectKey);
      const action = interaction.values[0];

      if (!project || !definition) {
        await interaction.reply({ content: "المشروع غير موجود.", ephemeral: true });
        return;
      }

      if (action === `project_refill_notice:${projectKey}`) {
        if (!canUseProjectAction(interaction.member, project, "refill_notice")) {
          await interaction.reply({ content: "لا تملك صلاحية استخدام هذا الخيار.", ephemeral: true });
          return;
        }
        await interaction.reply({
          embeds: [buildProjectFuelNoticeEmbed(project.name || definition.title)],
          ephemeral: true
        });
        return;
      }

      if (action === `project_add_money:${projectKey}`) {
        if (!canUseProjectAction(interaction.member, project, "deposit")) {
          await interaction.reply({ content: "لا تملك صلاحية استخدام هذا الخيار.", ephemeral: true });
          return;
        }
        await interaction.showModal(createProjectBudgetModal(projectKey, "deposit", interaction.message.id));
        return;
      }

      if (action === `project_withdraw_money:${projectKey}`) {
        if (!canUseProjectAction(interaction.member, project, "withdraw")) {
          await interaction.reply({ content: "لا تملك صلاحية استخدام هذا الخيار.", ephemeral: true });
          return;
        }
        await interaction.showModal(createProjectBudgetModal(projectKey, "withdraw", interaction.message.id));
        return;
      }

      if (action === `project_transactions:${projectKey}`) {
        if (!canUseProjectAction(interaction.member, project, "transactions")) {
          await interaction.reply({ content: "لا تملك صلاحية استخدام هذا الخيار.", ephemeral: true });
          return;
        }
        await interaction.reply({
          embeds: [buildProjectTransactionsEmbed(definition, project, listProjectTransactions(projectKey, 15))],
          ephemeral: true
        });
        return;
      }

      if (action === `project_staff_manage:${projectKey}`) {
        if (!canUseProjectAction(interaction.member, project, "staff_manage")) {
          await interaction.reply({ content: "لا تملك صلاحية استخدام هذا الخيار.", ephemeral: true });
          return;
        }
        await interaction.showModal(createProjectStaffModal(projectKey, interaction.message.id));
        return;
      }

      if (action === `project_transfer_owner:${projectKey}`) {
        if (!canUseProjectAction(interaction.member, project, "transfer_owner")) {
          await interaction.reply({ content: "لا تملك صلاحية نقل ملكية هذا المشروع.", ephemeral: true });
          return;
        }
        await interaction.showModal(createProjectOwnerTransferModal(projectKey, interaction.message.id));
        return;
      }

      if (action === `project_staff_info:${projectKey}`) {
        await interaction.reply({
          embeds: [
            new EmbedBuilder()
              .setColor(definition.color)
              .setTitle("👥 إدارة الموظفين والشركاء")
              .setDescription("**استخدم أوامر التوظيف والفصل المخصصة للمشروع لإدارة الموظفين والشركاء.**")
              .addFields(
                { name: "🏢 المشروع", value: `**${project.name || definition.title}**`, inline: true },
                { name: "👤 المالك", value: `**${getProjectOwnerMention(project)}**`, inline: true },
                { name: "📋 الموظفون الحاليون", value: `**${project.employees?.length ? project.employees.map((id) => `<@${id}>`).join("، ") : "لا يوجد"}**`, inline: false }
              )
              .setFooter({ text: "Arab World • موظفو المشاريع" })
              .setTimestamp()
          ],
          ephemeral: true
        });
        return;
      }
    }

    if (interaction.isStringSelectMenu() && interaction.customId === "weapon_info_menu") {
      const account = refreshCraftingProgress(interaction.user.id);
      if (!account) {
        await interaction.reply({ content: "لا يوجد لديك حساب بنكي.", ephemeral: true }).catch(() => null);
        return;
      }

      const action = interaction.values[0];
      if (action === "give_weapon") {
        await safelyShowModal(interaction, createWeaponTransferModal());
        return;
      }

      const deferred = await safelyDeferReply(interaction, { ephemeral: true });
      if (!deferred) {
        return;
      }

      if (action === "view_my_weapons") {
        await interaction.editReply({
          embeds: [buildOwnedWeaponsEmbed(account)]
        });
        return;
      }

      await interaction.editReply({ content: "الخدمة المطلوبة غير معروفة." });
      return;
    }

    if (interaction.isStringSelectMenu() && interaction.customId === "fine_remove_select") {
      const fineId = interaction.values[0];
      const removed = removeFine(fineId);
      if (!removed) {
        await interaction.reply({ content: "المخالفة غير موجودة.", ephemeral: true });
        return;
      }

      await sendAuditLog(client, config.auditChannelId, {
        title: "🗑️ **إزالة مخالفة**",
        description: "**تمت إزالة مخالفة من النظام وتسجيل العملية بنجاح.**",
        fields: [
          { name: "👤 **المسؤول**", value: `**<@${interaction.user.id}>**`, inline: true },
          { name: "📨 **المخالف**", value: `**<@${removed.targetUserId}>**`, inline: true },
          { name: "🪪 **رقم المخالفة**", value: `**#${removed.fineId}**`, inline: true },
          { name: "📝 **السبب**", value: `**${removed.reason}**`, inline: false }
        ]
      });

      await refreshActiveFinesViews(removed.targetUserId);

      await interaction.update({
        content: `تمت إزالة المخالفة #${removed.fineId} بنجاح.`,
        embeds: [],
        components: []
      });
      return;
    }

    if (interaction.isStringSelectMenu() && interaction.customId === "crafting_level_select") {
      const deferred = await safelyDeferReply(interaction, { ephemeral: true });
      if (!deferred) {
        return;
      }

      const account = requireAccount(interaction.user.id);
      if (!account) {
        await interaction.editReply({ content: "لا يوجد لديك حساب بنكي." });
        return;
      }

      const levelKey = interaction.values[0];
      if (levelKey === "refresh") {
        await interaction.editReply({
          embeds: [buildCraftingHomeEmbed(account)],
          components: [createCraftingLevelMenu()],
          files: getCraftingImageFiles()
        });
        return;
      }
      const level = CRAFTING_TABLE_LEVELS[levelKey];
      if (!level) {
        await interaction.editReply({ content: "مستوى الطاولة غير صالح." });
        return;
      }

      const hasLevel1Role = interaction.member?.roles?.cache?.has(CRAFTING_LEVEL1_ACCESS_ROLE_ID);
      const hasLevel2Role = interaction.member?.roles?.cache?.has(CRAFTING_LEVEL2_ACCESS_ROLE_ID);
      if ((hasCraftingTable(account, 1) || hasLevel1Role) && levelKey === CRAFTING_TABLE_LEVELS.level1.key) {
        await interaction.editReply({
          embeds: [buildCraftingLevelEmbed(levelKey, account)],
          components: [createCraftingWeaponMenu(levelKey)],
          files: getCraftingImageFiles()
        });
        return;
      }

      if ((hasCraftingTable(account, 2) || hasLevel2Role) && levelKey === CRAFTING_TABLE_LEVELS.level2.key) {
        if (!hasCraftingTable(account, 2)) {
          updateAccount(interaction.user.id, (current) => {
            current.crafting ??= {};
            current.crafting.tableLevel = Math.max(Number(current.crafting.tableLevel || 0), 2);
            return current;
          });
        }
        await interaction.editReply({
          embeds: [buildCraftingLevelEmbed(levelKey, getAccount(interaction.user.id))],
          components: [createCraftingWeaponMenu(levelKey)],
          files: getCraftingImageFiles()
        });
        return;
      }

      if (levelKey === CRAFTING_TABLE_LEVELS.level2upgraded.key) {
        if (!hasLevel2CraftingAccess(interaction.member, account)) {
          await interaction.editReply({ content: "يجب أن تفتح المستوى الثاني أولًا." });
          return;
        }

        await interaction.editReply({
          embeds: [buildCraftingLevelEmbed(levelKey, account)],
          components: [hasLevel2UpgradedCraftingAccess(account) ? createCraftingWeaponMenu(levelKey) : buildCraftingLevel2UpgradeButtons()],
          files: getCraftingImageFiles()
        });
        return;
      }

      if (levelKey === CRAFTING_TABLE_LEVELS.level3.key) {
        if (!hasLevel2UpgradedCraftingAccess(account)) {
          await interaction.editReply({ content: "لا يمكنك الوصول للمستوى الثالث قبل امتلاك المستوى الثاني المطور." });
          return;
        }

        const nextComponents = [];
        if (hasLevel3CraftingAccess(account)) {
          nextComponents.push(createCraftingWeaponMenu(levelKey));
        } else if (account?.crafting?.level3Quest?.stage !== "waiting") {
          nextComponents.push(buildCraftingLevel3StartButtons());
        }

        await interaction.editReply({
          embeds: [buildCraftingLevelEmbed(levelKey, account)],
          components: nextComponents,
          files: getCraftingImageFiles()
        });
        return;
      }

      const levelComponents = [];
      if (level.purchasable) {
        levelComponents.push(buildCraftingStartButtons(levelKey));
      } else if (levelKey === CRAFTING_TABLE_LEVELS.level2.key) {
        levelComponents.push(buildCraftingLevel2ExtractionButtons());
      }

      await interaction.editReply({
        embeds: [buildCraftingLevelEmbed(levelKey, account)],
        components: levelComponents,
        files: level.purchasable || levelKey === CRAFTING_TABLE_LEVELS.level2.key ? getCraftingImageFiles() : []
      });
      return;
    }

    if (interaction.isStringSelectMenu() && interaction.customId.startsWith("crafting_weapon_select:")) {
      const deferred = await safelyDeferReply(interaction, { ephemeral: true });
      if (!deferred) {
        return;
      }

      const account = refreshCraftingProgress(interaction.user.id);
      const levelKey = interaction.customId.split(":")[1] || "level1";
      const availableWeaponKeys = new Set(getCraftingWeaponsForLevel(levelKey).map((weapon) => weapon.key));
      const hasLevel1Role = interaction.member?.roles?.cache?.has(CRAFTING_LEVEL1_ACCESS_ROLE_ID);
      const hasLevel2Role = interaction.member?.roles?.cache?.has(CRAFTING_LEVEL2_ACCESS_ROLE_ID);
      const hasAccess = levelKey === "level2"
        ? hasLevel2CraftingAccess(interaction.member, account)
        : levelKey === "level2upgraded"
          ? hasLevel2UpgradedCraftingAccess(account)
          : levelKey === "level3"
            ? hasLevel3CraftingAccess(account)
            : (hasCraftingTable(account, 1) || hasLevel1Role);
      if (!account || !hasAccess) {
        await interaction.editReply({
          content: levelKey === "level2"
            ? "أنت لا تملك صلاحية الوصول إلى طاولة المستوى الثاني."
            : levelKey === "level2upgraded"
              ? "أنت لا تملك المستوى الثاني المطور."
              : levelKey === "level3"
                ? "أنت لا تملك طاولة المستوى الثالث."
                : "أنت لا تملك طاولة تصنيع مستوى أول أو رتبة الوصول الخاصة بها."
        });
        return;
      }

      const weaponKey = interaction.values[0];
      if (weaponKey === "refresh") {
        await interaction.editReply({
          embeds: [buildCraftingLevelEmbed(levelKey, account)],
          components: [createCraftingWeaponMenu(levelKey)],
          files: getCraftingImageFiles()
        });
        return;
      }

      if (weaponKey === "upgrade_level2") {
        await interaction.editReply({
          embeds: [buildCraftingLevelEmbed("level2upgraded", account)],
          components: [buildCraftingLevel2UpgradeButtons()],
          files: getCraftingImageFiles()
        });
        return;
      }

      if (weaponKey === "upgrade_locked" || weaponKey === "upgrade_locked_level3") {
        await interaction.editReply({
          embeds: [
            new EmbedBuilder()
              .setColor(0x111111)
              .setTitle(levelKey === "level3" ? "🔒 تطوير طاولة المستوى الثالث" : "🔒 تطوير طاولة المستوى الثاني")
              .setDescription(
                levelKey === "level3"
                  ? "**هذا المسار مغلق إلى أن نجد مخطوطات جونز مارك الجديدة.**"
                  : "**هذا المسار مغلق حاليًا.**"
              )
              .setFooter({ text: "Arab World • أسرار جونز مارك" })
              .setTimestamp()
          ],
          components: [createCraftingWeaponMenu(levelKey)],
          files: getCraftingImageFiles()
        });
        return;
      }

      if (!CRAFTABLE_WEAPONS[weaponKey] || !availableWeaponKeys.has(weaponKey)) {
        await interaction.editReply({ content: "السلاح المطلوب غير صالح." });
        return;
      }

      await interaction.editReply({
        embeds: [buildCraftingWeaponEmbed(weaponKey)],
        components: [buildCraftingWeaponButtons(weaponKey)],
        files: getCraftingWeaponFiles(weaponKey)
      });
      return;
    }

    if (interaction.isStringSelectMenu() && interaction.customId === "resources_main_menu") {
      const account = requireAccount(interaction.user.id);
      if (!account) {
        await interaction.reply({ content: "لا يوجد لديك حساب بنكي.", ephemeral: true });
        return;
      }

      const action = interaction.values[0];
      if (action === "transfer") {
        await safelyShowModal(interaction, createResourceTransferModal());
        return;
      }

      const deferred = await safelyDeferReply(interaction, { ephemeral: true });
      if (!deferred) {
        return;
      }

      if (action === "inventory") {
        try {
          const inventoryCard = await buildResourceInventoryCardAttachment(
            account,
            account.name || interaction.member?.displayName || interaction.user.displayName || interaction.user.username
          );
          await interaction.editReply({
            files: [inventoryCard],
          });
        } catch (error) {
          console.error("Resource inventory card failed:", error);
          await interaction.editReply({
            content: "تعذر إنشاء بطاقة الموارد. تأكد من رفع صورة `resource-inventory-template-vertical.png` داخل مجلد assets.",
          });
        }
        return;
      }

      if (action === "shop") {
        await interaction.editReply({
          embeds: [buildGun2EmbedPolished()],
          components: [createResourceShopMenu()],
        });
        return;
      }

      if (action === "gather") {
        const cooldownEndsAt = resourceMiniGameCooldowns.get(interaction.user.id) || 0;
        if (cooldownEndsAt > Date.now()) {
          await interaction.editReply({
            content: `لا يمكنك بدء ميني قيم الموارد الآن. الموعد القادم <t:${Math.floor(cooldownEndsAt / 1000)}:R>.`,
          });
          return;
        }

        const questionId = `${interaction.user.id}_${Date.now()}`;
        const session = buildResourceMiniGameSession(interaction.user.id);
        const question = session.questions[0];
        const questionButtons = question ? createResourceGatherButtons(questionId, question) : [];

        if (!question || !questionButtons.length) {
          await interaction.editReply({
            content: "تعذر تجهيز سؤال الميني قيم الآن. حاول مرة أخرى بعد لحظات."
          });
          return;
        }

        resourceMiniGameCooldowns.set(interaction.user.id, Date.now() + RESOURCE_MINI_GAME_COOLDOWN_MS);
        activeResourceMiniGames.set(questionId, {
          ...session,
          questionId,
          correctValue: question.correctValue,
          expiresAt: Date.now() + question.timeLimitSec * 1000
        });
        activeResourceMiniGamesByUser.set(interaction.user.id, questionId);

        await interaction.editReply({
          embeds: [buildResourceGatherEmbed(question, 1, session.totalRounds)],
          components: questionButtons
        });
        return;
      }
    }

    if (interaction.isStringSelectMenu() && interaction.customId === "resource_shop_menu") {
      const selected = interaction.values[0];
      if (selected === "inventory") {
        const deferred = await safelyDeferReply(interaction, { ephemeral: true });
        if (!deferred) {
          return;
        }

        const account = requireAccount(interaction.user.id);
        if (!account) {
          await interaction.editReply({ content: "لا يوجد لديك حساب بنكي." });
          return;
        }

        try {
          const inventoryCard = await buildResourceInventoryCardAttachment(
            account,
            account.name || interaction.member?.displayName || interaction.user.displayName || interaction.user.username
          );

          await interaction.editReply({
            files: [inventoryCard]
          });
        } catch (error) {
          console.error("Resource inventory card failed:", error);
          await interaction.editReply({
            content: "تعذر إنشاء بطاقة الموارد. تأكد من رفع صورة `resource-inventory-template-vertical.png` داخل مجلد assets."
          });
        }
        return;
      }

      await safelyShowModal(interaction, createResourceModal(selected));
      return;
    }

    if (interaction.isButton() && interaction.customId.startsWith("resource_gather_answer:")) {
      const [, questionId, selectedValue] = interaction.customId.split(":");
      let resolvedQuestionId = questionId;
      let session = activeResourceMiniGames.get(resolvedQuestionId);
      if (!session) {
        const fallbackQuestionId = activeResourceMiniGamesByUser.get(interaction.user.id);
        if (fallbackQuestionId) {
          resolvedQuestionId = fallbackQuestionId;
          session = activeResourceMiniGames.get(resolvedQuestionId);
        }
      }
      if (!session || session.userId !== interaction.user.id) {
        const completedAt = completedResourceMiniGamesByUser.get(interaction.user.id);
        if (typeof completedAt === "number" && Date.now() - completedAt <= 15000) {
          await interaction.reply({
            content: "تم الفوز بالتحدي، راجع الخاص.",
            ephemeral: true
          });
          return;
        }
        await interaction.reply({ content: "انتهت صلاحية هذا التحدي.", ephemeral: true });
        return;
      }

      if (Number(session.expiresAt || 0) <= Date.now()) {
        activeResourceMiniGames.delete(resolvedQuestionId);
        activeResourceMiniGamesByUser.delete(interaction.user.id);
        await interaction.update({
          content: "انتهى الوقت",
          embeds: [],
          components: []
        }).catch(() => null);
        return;
      }

      if (String(selectedValue) !== String(session.correctValue)) {
        activeResourceMiniGames.delete(resolvedQuestionId);
        activeResourceMiniGamesByUser.delete(interaction.user.id);
        await interaction.update({
          content: "لم توفق هذه المرة. يجب الفوز في الجولات الثلاث كاملة للحصول على المكافأة.",
          embeds: [],
          components: []
        }).catch(() => null);
        return;
      }

      const completedRound = session.round + 1;
      if (completedRound < session.totalRounds) {
        session.round = completedRound;
        const nextQuestion = session.questions[session.round];
        session.correctValue = nextQuestion.correctValue;
        session.expiresAt = Date.now() + nextQuestion.timeLimitSec * 1000;
        activeResourceMiniGames.set(resolvedQuestionId, session);
        activeResourceMiniGamesByUser.set(interaction.user.id, resolvedQuestionId);

        await interaction.update({
          embeds: [
            buildResourceRoundPassedEmbed(completedRound, session.totalRounds),
            buildResourceGatherEmbed(nextQuestion, session.round + 1, session.totalRounds)
          ],
          components: createResourceGatherButtons(resolvedQuestionId, nextQuestion),
          content: null
        }).catch(() => null);
        return;
      }

      activeResourceMiniGames.delete(resolvedQuestionId);
      activeResourceMiniGamesByUser.delete(interaction.user.id);
      completedResourceMiniGamesByUser.set(interaction.user.id, Date.now());
      await interaction.update({
        content: "تم الفوز بالتحدي، راجع الخاص.",
        embeds: [],
        components: []
      }).catch(() => null);

      const rewards = rollResourceRewards();
      const updatedAccount = updateAccount(interaction.user.id, (current) => {
        for (const [resourceKey, amount] of Object.entries(rewards)) {
          current.resources[resourceKey] += amount;
        }
        return current;
      });

      const totalRewardAmount = Object.values(rewards).reduce((sum, amount) => sum + Number(amount || 0), 0);
      appendTransaction({
        discordUserId: interaction.user.id,
        robloxUsername: updatedAccount?.robloxUsername,
        type: "resource_gather_reward",
        amount: totalRewardAmount,
        direction: "credit",
        balanceAfter: updatedAccount?.balance ?? 0,
        metadata: {
          rewards
        }
      });

      await sendAuditLog(client, config.auditChannelId, {
        title: "⛏️ **إضافة موارد من الميني قيم**",
        description: "**تمت إضافة موارد جديدة إلى حساب أحد اللاعبين بعد الفوز في ميني قيم الموارد.**",
        fields: [
          { name: "👤 **العضو**", value: `**<@${interaction.user.id}>**`, inline: true },
          { name: "📛 **الاسم البنكي**", value: `**${updatedAccount?.name || "غير مسجل"}**`, inline: true },
          { name: "🎮 **يوزر روبلوكس**", value: `**${updatedAccount?.robloxUsername || "غير مسجل"}**`, inline: true },
          {
            name: "🎁 **الموارد المضافة**",
            value: Object.entries(rewards).map(([key, amount]) => `• ${RESOURCE_CATALOG[key]?.emoji || "📦"} ${RESOURCE_CATALOG[key]?.label || key}: **${amount}**`).join("\n"),
            inline: false
          },
          {
            name: "📦 **الموارد الحالية**",
            value: [
              `• ${RESOURCE_CATALOG.coal.emoji} ${RESOURCE_CATALOG.coal.label}: **${updatedAccount?.resources?.coal ?? 0}**`,
              `• ${RESOURCE_CATALOG.copper.emoji} ${RESOURCE_CATALOG.copper.label}: **${updatedAccount?.resources?.copper ?? 0}**`,
              `• ${RESOURCE_CATALOG.iron.emoji} ${RESOURCE_CATALOG.iron.label}: **${updatedAccount?.resources?.iron ?? 0}**`,
              `• ${RESOURCE_CATALOG.aluminum.emoji} ${RESOURCE_CATALOG.aluminum.label}: **${updatedAccount?.resources?.aluminum ?? 0}**`,
              `• ${RESOURCE_CATALOG.sulfur.emoji} ${RESOURCE_CATALOG.sulfur.label}: **${updatedAccount?.resources?.sulfur ?? 0}**`,
              `• ${RESOURCE_CATALOG.plastic.emoji} ${RESOURCE_CATALOG.plastic.label}: **${updatedAccount?.resources?.plastic ?? 0}**`
            ].join("\n"),
            inline: false
          }
        ]
      });

      try {
        const rewardCard = await buildResourceRewardCardAttachment(
          { resources: rewards },
          updatedAccount?.name || interaction.member?.displayName || interaction.user.username
        );

        await interaction.user.send({
          embeds: [
            buildResourceRewardDmEmbed(rewards).setImage("attachment://resource-reward-card.png")
          ],
          files: [rewardCard]
        }).catch(() => null);
      } catch (error) {
        console.error("Resource reward card failed:", error);
        await interaction.user.send({
          embeds: [buildResourceRewardDmEmbed(rewards)]
        }).catch(() => null);
      }
      return;
    }

    if (interaction.isStringSelectMenu() && interaction.customId.startsWith("budget_menu:")) {
      const value = interaction.values[0];
      const [rawAction, budgetKey] = value.split(":");
      const action = rawAction.replace("budget_", "");
      rememberBudgetSourceMessage(interaction, budgetKey);

      if (action === "add") {
        if (!(await ensureBudgetPermission(interaction, budgetKey, "deposit"))) {
          return;
        }

        await interaction.showModal(createBudgetAmountModal(budgetKey, "deposit"));
        return;
      }

      if (action === "withdraw") {
        if (!(await ensureBudgetPermission(interaction, budgetKey, "withdraw"))) {
          return;
        }

        await interaction.showModal(createBudgetAmountModal(budgetKey, "withdraw"));
        return;
      }

      if (action === "transfer") {
        if (!(await ensureBudgetPermission(interaction, budgetKey, "transfer"))) {
          return;
        }

        await interaction.showModal(createBudgetTransferModal(budgetKey));
        return;
      }

      if (action === "logs") {
        if (!(await ensureBudgetPermission(interaction, budgetKey, budgetKey === BUDGET_KEYS.gang ? "deposit" : "manage"))) {
          return;
        }

        const deferred = await safelyDeferReply(interaction, { ephemeral: true });
        if (!deferred) {
          return;
        }

        await interaction.editReply({
          embeds: [buildBudgetLogsEmbed(getBudgetDefinition(budgetKey), listBudgetTransactions(budgetKey))],
        });
        return;
      }

      if (action === "purchase_sector") {
        if (!(await ensureBudgetPermission(interaction, budgetKey, "purchase"))) {
          return;
        }

        pendingBudgetDrafts.set(interaction.user.id, {
          budgetKey,
          type: "police_sector",
          addons: []
        });
        const draft = buildPoliceSectorDraft(interaction.user.id, budgetKey);
        await interaction.reply({
          embeds: [draft.embed],
          components: draft.components,
          ephemeral: true
        });
        return;
      }

      if (action === "purchase_military") {
        if (!(await ensureBudgetPermission(interaction, budgetKey, "purchase"))) {
          return;
        }

        await interaction.reply({
          embeds: [
            buildBudgetPurchaseDraftEmbed({
              definition: getBudgetDefinition(budgetKey),
              title: "🪖 شراء عتاد عسكري",
              description: "**اختر النوع الذي تريد اعتماده من الميزانية.**",
              totalPrice: 0,
              lines: [
                `• ${POLICE_MILITARY_ITEMS.heavy_weapons.label}: ${formatBudgetCurrency(POLICE_MILITARY_ITEMS.heavy_weapons.price)}`,
                `• ${POLICE_MILITARY_ITEMS.heavy_gear.label}: ${formatBudgetCurrency(POLICE_MILITARY_ITEMS.heavy_gear.price)}`
              ]
            })
          ],
          components: [
            buildSinglePurchaseMenu(
              `budget_pick_military:${budgetKey}`,
              Object.values(POLICE_MILITARY_ITEMS)
            )
          ],
          ephemeral: true
        });
        return;
      }

      if (action === "purchase_jus") {
        if (!(await ensureBudgetPermission(interaction, budgetKey, "purchase"))) {
          return;
        }

        await interaction.reply({
          embeds: [
            buildBudgetPurchaseDraftEmbed({
              definition: getBudgetDefinition(budgetKey),
              title: "⚖️ شراء للعدل",
              description: "**اختر نوع الشراء ثم أكد العملية في الخطوة التالية.**",
              totalPrice: 0,
              lines: [
                `• ${JUS_PURCHASE_ITEMS.vehicle.label}: ${formatBudgetCurrency(JUS_PURCHASE_ITEMS.vehicle.price)}`,
                `• ${JUS_PURCHASE_ITEMS.outfit.label}: ${formatBudgetCurrency(JUS_PURCHASE_ITEMS.outfit.price)}`
              ]
            })
          ],
          components: [
            buildSinglePurchaseMenu(
              "budget_pick_jus_purchase",
              Object.values(JUS_PURCHASE_ITEMS)
            )
          ],
          ephemeral: true
        });
        return;
      }
    }

    if (interaction.isStringSelectMenu() && interaction.customId === "budget_sector_addons") {
      const current = pendingBudgetDrafts.get(interaction.user.id) ?? {
        budgetKey: BUDGET_KEYS.police,
        type: "police_sector",
        addons: []
      };
      current.addons = [...new Set([...(current.addons || []), ...interaction.values])];
      pendingBudgetDrafts.set(interaction.user.id, current);
      const draft = buildPoliceSectorDraft(interaction.user.id, current.budgetKey);
      await interaction.update({ embeds: [draft.embed], components: draft.components });
      return;
    }

    if (interaction.isStringSelectMenu() && interaction.customId === "budget_sector_remove_addons") {
      const current = pendingBudgetDrafts.get(interaction.user.id);
      if (!current) {
        await interaction.reply({ content: "لا يوجد طلب شراء نشط.", ephemeral: true });
        return;
      }

      current.addons = (current.addons || []).filter((key) => !interaction.values.includes(key));
      pendingBudgetDrafts.set(interaction.user.id, current);
      const draft = buildPoliceSectorDraft(interaction.user.id, current.budgetKey);
      await interaction.update({ embeds: [draft.embed], components: draft.components });
      return;
    }

    if (interaction.isStringSelectMenu() && interaction.customId.startsWith("budget_pick_military:")) {
      const budgetKey = interaction.customId.split(":")[1];
      const draft = buildSingleBudgetPurchaseDraft({
        budgetKey,
        purchaseType: "police_military",
        itemKey: interaction.values[0]
      });
      pendingBudgetDrafts.set(interaction.user.id, {
        budgetKey,
        type: "police_military",
        itemKey: interaction.values[0]
      });
      await interaction.update({ embeds: [draft.embed], components: draft.components });
      return;
    }

    if (interaction.isStringSelectMenu() && interaction.customId === "budget_pick_jus_purchase") {
      const draft = buildSingleBudgetPurchaseDraft({
        budgetKey: BUDGET_KEYS.jus,
        purchaseType: "jus_purchase",
        itemKey: interaction.values[0]
      });
      pendingBudgetDrafts.set(interaction.user.id, {
        budgetKey: BUDGET_KEYS.jus,
        type: "jus_purchase",
        itemKey: interaction.values[0]
      });
      await interaction.update({ embeds: [draft.embed], components: draft.components });
      return;
    }

    if (interaction.isStringSelectMenu() && interaction.customId === "bank_menu") {
      const action = interaction.values[0];

      if (action === BANK_ACTIONS.create) {
        if (getAccount(interaction.user.id)) {
          await interaction.reply({ content: "حسابك البنكي موجود بالفعل.", ephemeral: true });
          return;
        }

        await interaction.showModal(createAccountModal());
        return;
      }

      if (action === BANK_ACTIONS.balance) {
        const account = requireAccount(interaction.user.id);
        if (!account) {
          await interaction.reply({ content: "لا يوجد لديك حساب بنكي بعد.", ephemeral: true });
          return;
        }

        const deferred = await safelyDeferReply(interaction, { ephemeral: true });
        if (!deferred) {
          return;
        }

        try {
          const balanceCard = await buildBankBalanceCardAttachment(account);
          await interaction.editReply({
            files: [balanceCard]
          });
        } catch (error) {
          console.error("Bank balance card failed:", error);
          await interaction.editReply({
            embeds: [buildBalanceEmbedPolished(account, interaction.member)]
          });
        }
        return;
      }

      if (action === BANK_ACTIONS.salary) {
        const account = requireAccount(interaction.user.id);
        if (!account) {
          await interaction.reply({ content: "لا يوجد لديك حساب بنكي بعد.", ephemeral: true });
          return;
        }
        if (!(await ensureBankServicesAvailable(interaction, account, "استلام الراتب"))) {
          return;
        }

        const salaryRole = getHighestSalaryRole(interaction.member);
        if (!salaryRole) {
          await interaction.reply({ content: "لا توجد لديك رتبة مستحقة للراتب حاليًا.", ephemeral: true });
          return;
        }

        const schedule = getSalarySchedule(salaryRole.amount);
        const nextClaimText = getNextSalaryClaimText(account, salaryRole.roleId, salaryRole.amount);
        if (nextClaimText) {
          await interaction.reply({
            embeds: [
              buildPrivateNoticeEmbed({
                title: "⏳ الراتب غير متاح الآن",
                description: [
                  `**الرتبة المعتمدة:** <@&${salaryRole.roleId}>`,
                  `**نوع الراتب:** ${schedule.label}`,
                  `**قيمة الراتب:** ${formatCurrency(salaryRole.amount)}`,
                  `**يمكنك الاستلام مرة أخرى:** ${nextClaimText}`
                ].join("\n")
              })
            ],
            ephemeral: true
          });
          return;
        }

        const beforeBalance = Number(account.balance || 0);
        const updatedAccount = updateAccount(interaction.user.id, (current) => {
          current.balance += salaryRole.amount;
          current.salaryClaims ??= {};
          current.salaryClaims[salaryRole.roleId] = new Date().toISOString();
          return current;
        });

        appendTransaction({
          discordUserId: interaction.user.id,
          robloxUsername: updatedAccount.robloxUsername,
          type: "salary_claim",
          amount: salaryRole.amount,
          direction: "credit",
          balanceAfter: updatedAccount.balance,
          metadata: {
            roleId: salaryRole.roleId,
            schedule: schedule.key
          }
        });

        await interaction.reply({
          embeds: [
            buildPrivateNoticeEmbed({
              title: "💼 تم استلام الراتب",
              description: [
                `**الرتبة المعتمدة:** <@&${salaryRole.roleId}>`,
                `**نوع الراتب:** ${schedule.label}`,
                `**قيمة الراتب:** ${formatCurrency(salaryRole.amount)}`,
                `**الرصيد الحالي:** ${formatCurrency(updatedAccount.balance)}`
              ].join("\n"),
              color: 0x1f6b45
            })
          ],
          ephemeral: true
        });

        await interaction.user.send({
          embeds: [
            buildSalaryReceiptDmEmbed({
              amount: salaryRole.amount,
              beforeBalance,
              afterBalance: updatedAccount.balance,
              roleId: salaryRole.roleId,
              scheduleLabel: schedule.label
            })
          ]
        }).catch(() => null);

        await sendAuditLog(client, config.auditChannelId, {
          title: "💼 **استلام راتب**",
          description: "**تمت إضافة راتب العضو إلى حسابه البنكي بحسب أعلى رتبة مستحقة.**",
          fields: [
            { name: "👤 **العضو**", value: `**<@${interaction.user.id}>**`, inline: true },
            buildBankAccountAuditField(updatedAccount),
            { name: "🪪 **الرتبة**", value: `**<@&${salaryRole.roleId}>**`, inline: true },
            { name: "💵 **الراتب**", value: `**${formatCurrency(salaryRole.amount)}**`, inline: true },
            { name: "🕒 **النوع**", value: `**${schedule.label}**`, inline: true }
          ]
        });

        await sendPoliceBankLog({
          title: "💼 **إيداع راتب لمواطن**",
          description: "**تم تسجيل راتب جديد دخل إلى حساب مواطن.**",
          fields: [
            { name: "👤 **العضو**", value: `**<@${interaction.user.id}>**`, inline: true },
            buildBankAccountAuditField(updatedAccount),
            { name: "💵 **المبلغ الداخل**", value: `**${formatCurrency(salaryRole.amount)}**`, inline: true },
            { name: "💳 **الرصيد الحالي**", value: `**${formatCurrency(updatedAccount.balance)}**`, inline: true },
            { name: "🪪 **الرتبة**", value: `**<@&${salaryRole.roleId}>**`, inline: true }
          ]
        });
        return;
      }

      if (action === BANK_ACTIONS.transfer) {
        const account = requireAccount(interaction.user.id);
        if (!account) {
          await interaction.reply({ content: "لا يوجد لديك حساب بنكي لإجراء التحويل.", ephemeral: true });
          return;
        }
        if (!(await ensureBankServicesAvailable(interaction, account, "تحويل الرصيد"))) {
          return;
        }

        await safelyShowModal(interaction, createTransferModal());
        return;
      }

      if (action === BANK_ACTIONS.loan) {
        const account = requireAccount(interaction.user.id);
        if (!account) {
          await interaction.reply({ content: "لا يوجد لديك حساب بنكي لطلب قرض.", ephemeral: true });
          return;
        }
        if (!(await ensureBankServicesAvailable(interaction, account, "طلب القرض"))) {
          return;
        }

        await safelyShowModal(interaction, createLoanModal(account.accountNumber));
        return;
      }

      if (action === BANK_ACTIONS.payFine) {
        const account = requireAccount(interaction.user.id);
        if (!account) {
          await interaction.reply({ content: "ظ„ط§ ظٹظˆط¬ط¯ ظ„ط¯ظٹظƒ ط­ط³ط§ط¨ ط¨ظ†ظƒظٹ.", ephemeral: true });
          return;
        }
        if (!(await ensureBankServicesAvailable(interaction, account, "سداد المخالفات"))) {
          return;
        }

        await safelyShowModal(interaction, createPayFineModal());
        return;
      }

      if (action === BANK_ACTIONS.removeHold) {
        const account = requireAccount(interaction.user.id);
        if (!account) {
          await interaction.reply({ content: "لا يوجد لديك حساب بنكي.", ephemeral: true });
          return;
        }
        if (!(await ensureBankServicesAvailable(interaction, account, "رفع إيقاف الخدمات"))) {
          return;
        }
        await safelyShowModal(interaction, createRemoveHoldRequestModal());
        return;
      }

      return;
    }

    if (interaction.isButton()) {
      if (interaction.customId.startsWith("website_verify_copy:")) {
        const verificationId = interaction.customId.split(":")[1];
        const pending = pendingWebsiteLoginVerifications.get(verificationId);

        if (!pending) {
          await interaction.reply({ content: "انتهت صلاحية هذا الرمز أو لم يعد متاحًا.", ephemeral: true });
          return;
        }

        if (pending.discordUserId !== interaction.user.id) {
          await interaction.reply({ content: "هذا الزر خاص بصاحب رمز التحقق فقط.", ephemeral: true });
          return;
        }

        if (Date.now() > Number(pending.expiresAt || 0)) {
          pendingWebsiteLoginVerifications.delete(verificationId);
          await interaction.reply({ content: "انتهت صلاحية رمز التحقق، اطلب رمزًا جديدًا من الموقع.", ephemeral: true });
          return;
        }

        await interaction.reply({
          content: `رمز التحقق الخاص بك هو: \`${pending.code}\``,
          ephemeral: true
        });
        return;
      }

      if (interaction.customId.startsWith("roblox_lookup_copy:")) {
        const token = interaction.customId.split(":")[1];
        const lookup = pendingRobloxProfileLookups.get(token);

        if (!lookup) {
          await interaction.reply({ content: "انتهت صلاحية هذا الزر.", ephemeral: true });
          return;
        }

        if (lookup.requesterId !== interaction.user.id) {
          await interaction.reply({ content: "هذا الزر خاص بالشخص الذي نفذ الأمر فقط.", ephemeral: true });
          return;
        }

        await interaction.reply({
          content: [
            `يوزر الشخص: ${lookup.username}`,
            `ايدي روبلوكس: ${lookup.robloxUserId}`,
            lookup.profileUrl ? `رابط الحساب: ${lookup.profileUrl}` : ""
          ].filter(Boolean).join("\n"),
          ephemeral: true
        });
        return;
      }

      if (interaction.customId.startsWith("activation_open:")) {
        await safelyShowModal(interaction, createActivationModal(createActivationRequestId()));
        return;
      }

      if (interaction.customId.startsWith("activation_confirm:") || interaction.customId.startsWith("activation_cancel:")) {
        const [action, requestId] = interaction.customId.split(":");
        const draft = pendingActivationDrafts.get(requestId);
        if (!draft) {
          await safelyReply(interaction, { content: "انتهت صلاحية تأكيد الطلب أو لم يعد موجودًا.", ephemeral: true });
          return;
        }

        if (draft.applicantUserId !== interaction.user.id) {
          await safelyReply(interaction, { content: "هذا التأكيد خاص بصاحب الطلب فقط.", ephemeral: true });
          return;
        }

        if (action === "activation_cancel") {
          pendingActivationDrafts.delete(requestId);
          await interaction.update({
            embeds: [
              new EmbedBuilder()
                .setColor(0xb42318)
                .setTitle("❌ تم إلغاء طلب التفعيل")
                .setDescription("**تم إلغاء إرسال طلب التفعيل بناءً على اختيارك، ويمكنك إعادة التقديم بالمعلومات الصحيحة لاحقًا.**")
                .setFooter({ text: "AW , ARAB WORLD • Activation Confirmation" })
                .setTimestamp()
            ],
            components: []
          });
          return;
        }

        const deferred = await safelyDeferUpdate(interaction);
        if (!deferred) {
          return;
        }

        pendingActivationRequests.set(requestId, draft);
        const reviewChannel = await client.channels.fetch(ACTIVATION_REVIEW_CHANNEL_ID).catch(() => null);
        if (!reviewChannel?.isTextBased?.()) {
          pendingActivationRequests.delete(requestId);
          pendingActivationDrafts.delete(requestId);
          await interaction.followUp({ content: "تعذر العثور على روم مراجعة التفعيل.", ephemeral: true }).catch(() => null);
          return;
        }

        await reviewChannel.send({
          content: `<@&${ACTIVATION_REVIEW_PING_ROLE_ID}>`,
          embeds: [buildActivationReviewEmbed({
            applicant: { id: draft.applicantUserId },
            request: draft,
            avatarUrl: draft.avatarUrl
          })],
          components: [createActivationReviewButtons(requestId)]
        }).catch(() => null);

        pendingActivationDrafts.delete(requestId);
        await interaction.editReply({
          embeds: [
            new EmbedBuilder()
              .setColor(0x0b1f3a)
              .setTitle("📨 تم إرسال طلب التفعيل")
              .setDescription("**تم إرسال طلبك إلى إدارة عرب وورلد بنجاح بعد تأكيد معلوماتك.**")
              .addFields(
                { name: "📛 الاسم", value: `**${draft.fullName}**`, inline: true },
                { name: "🎮 يوزر روبلوكس", value: `**${draft.robloxUsername}**`, inline: true },
                { name: "📘 تنبيه", value: `**راجع القوانين باستمرار حتى يتم قبولك: [قوانين السيرفر](${ACTIVATION_RULES_URL})**`, inline: false }
              )
              .setFooter({ text: "AW , ARAB WORLD • Activation Request" })
              .setTimestamp()
          ],
          components: []
        });
        return;
      }

      if (interaction.customId.startsWith("activation_accept:") || interaction.customId.startsWith("activation_reject:")) {
        if (!canUseSlashCommands(interaction.member)) {
          await safelyReply(interaction, { content: `هذا الزر متاح فقط لمن يملك الرتبة <@&${config.slashAccessRoleId}>.`, ephemeral: true });
          return;
        }

        const [action, requestId] = interaction.customId.split(":");
        const request = pendingActivationRequests.get(requestId);
        if (!request) {
          await safelyReply(interaction, { content: "انتهت صلاحية طلب التفعيل أو لم يعد موجودًا.", ephemeral: true });
          return;
        }

        const deferred = await safelyDeferUpdate(interaction);
        if (!deferred) {
          return;
        }

        const guildMember = await interaction.guild?.members.fetch(request.applicantUserId).catch(() => null);
        if (!guildMember) {
          await interaction.followUp({ content: "تعذر العثور على مقدم الطلب داخل السيرفر.", ephemeral: true }).catch(() => null);
          return;
        }

        if (action === "activation_accept") {
          if (guildMember.roles.cache.has(ACTIVATION_ROLE_ID)) {
            await interaction.followUp({ content: "هذا الشخص مفعّل بالفعل، ولن يتم تنفيذ أي شيء جديد.", ephemeral: true }).catch(() => null);
            return;
          }

          await guildMember.roles.add(ACTIVATION_ROLE_ID).catch(() => null);
          await guildMember.setNickname(`AW | ${request.robloxUsername}`.slice(0, 32)).catch(() => null);
          await interaction.editReply({
            embeds: [buildActivationAcceptedEmbed({
              reviewerId: interaction.user.id,
              applicantId: request.applicantUserId,
              request,
              avatarUrl: request.avatarUrl
            })],
            components: []
          });

          await guildMember.send({
            embeds: [buildActivationAcceptedDmEmbed({
              request,
              reviewerId: interaction.user.id,
              avatarUrl: request.avatarUrl
            })]
          }).catch(() => null);

          pendingActivationRequests.delete(requestId);
          return;
        }

        await interaction.editReply({
          embeds: [buildActivationRejectedEmbed({
            reviewerId: interaction.user.id,
            applicantId: request.applicantUserId,
            request,
            avatarUrl: request.avatarUrl
          })],
          components: []
        });

        await guildMember.send({
          embeds: [buildActivationRejectedDmEmbed({
            request,
            reviewerId: interaction.user.id,
            avatarUrl: request.avatarUrl
          })]
        }).catch(() => null);

        pendingActivationRequests.delete(requestId);
        return;
      }

      if (interaction.customId === "police_bank_withdraw" || interaction.customId === "police_bank_freeze" || interaction.customId === "police_bank_unfreeze" || interaction.customId === "police_bank_seize_assets" || interaction.customId === "police_bank_release_assets") {
        if (!(await ensurePoliceBankPermission(interaction))) {
          return;
        }

        if (interaction.customId === "police_bank_withdraw") {
          await interaction.showModal(createPoliceBankWithdrawModal());
          return;
        }
        if (interaction.customId === "police_bank_freeze") {
          await interaction.showModal(createPoliceBankFreezeModal());
          return;
        }
        if (interaction.customId === "police_bank_unfreeze") {
          await interaction.showModal(createPoliceBankUnfreezeModal());
          return;
        }
        if (interaction.customId === "police_bank_seize_assets") {
          await interaction.showModal(createPoliceBankSeizeAssetsModal());
          return;
        }
        if (interaction.customId === "police_bank_release_assets") {
          await interaction.showModal(createPoliceBankReleaseAssetsModal());
          return;
        }
      }

      if (interaction.customId.startsWith("budget_logs_button:")) {
        const budgetKey = interaction.customId.split(":")[1];
        if (!(await ensureBudgetPermission(interaction, budgetKey, budgetKey === BUDGET_KEYS.gang ? "deposit" : "manage"))) {
          return;
        }

        const deferred = await safelyDeferReply(interaction, { ephemeral: true });
        if (!deferred) {
          return;
        }

        await interaction.editReply({
          embeds: [buildBudgetLogsEmbed(getBudgetDefinition(budgetKey), listBudgetTransactions(budgetKey))],
        });
        return;
      }

      if (interaction.customId.startsWith("car_page_prev:")) {
        const currentPage = Number(interaction.customId.split(":")[1] || 0);
        await sendCarHome(interaction, currentPage - 1, "update");
        return;
      }

      if (interaction.customId.startsWith("car_page_next:")) {
        const currentPage = Number(interaction.customId.split(":")[1] || 0);
        await sendCarHome(interaction, currentPage + 1, "update");
        return;
      }

      if (interaction.customId === CAR_ACTIONS.showOwned) {
        await respondWithOwnedCars(interaction, interaction.user.id);
        return;
      }

      if (interaction.customId === CAR_ACTIONS.sellOpen) {
        await interaction.showModal(createCarSaleModal());
        return;
      }

      if (interaction.customId === CAR_ACTIONS.cancelPurchase) {
        pendingCarPurchases.delete(interaction.user.id);
        await interaction.update({
          content: "تم إلغاء عملية شراء المركبة.",
          embeds: [],
          components: []
        });
        return;
      }

      if (interaction.customId === CAR_ACTIONS.confirmPurchase) {
        await interaction.deferUpdate().catch(() => null);

        const vehicleName = pendingCarPurchases.get(interaction.user.id);
        if (!vehicleName) {
          await interaction.editReply({ content: "انتهت صلاحية طلب الشراء. اختر المركبة من جديد.", embeds: [], components: [] }).catch(() => null);
          return;
        }

        const account = requireAccount(interaction.user.id);
        if (!account) {
          await interaction.editReply({ content: "لا يوجد لديك حساب بنكي.", embeds: [], components: [] }).catch(() => null);
          return;
        }

        if (userOwnsVehicle(interaction.user.id, vehicleName)) {
          pendingCarPurchases.delete(interaction.user.id);
          await interaction.editReply({ content: "هذه المركبة مسجلة لديك بالفعل.", embeds: [], components: [] }).catch(() => null);
          return;
        }

        const offer = getVehicleOffer(vehicleName);
        if (!offer.isFree && account.balance < offer.price) {
          await interaction.editReply({ content: "رصيدك البنكي لا يكفي لشراء هذه المركبة.", embeds: [], components: [] }).catch(() => null);
          return;
        }

        if (!offer.isFree) {
          updateAccount(interaction.user.id, (current) => {
            current.balance -= offer.price;
            return current;
          });
        }

        addOwnedVehicle(interaction.user.id, offer.name, {
          purchasePrice: offer.price,
          grantedBy: interaction.user.id,
          source: "purchase"
        });
        pendingCarPurchases.delete(interaction.user.id);

        const updatedAccount = getAccount(interaction.user.id);

        appendTransaction({
          discordUserId: interaction.user.id,
          robloxUsername: updatedAccount.robloxUsername,
          type: "vehicle_purchase",
          amount: offer.price,
          direction: offer.isFree ? "none" : "debit",
          balanceAfter: updatedAccount.balance,
          metadata: {
            vehicleName: offer.name,
            isFree: offer.isFree
          }
        });

        await sendAuditLog(client, config.auditChannelId, {
          title: "🚗 **شراء مركبة**",
          description: "**تم شراء مركبة وإضافتها إلى ممتلكات العضو.**",
          fields: [
            { name: "👤 **المشتري**", value: `**<@${interaction.user.id}>**`, inline: true },
            buildBankAccountAuditField(updatedAccount),
            { name: "🚘 **المركبة**", value: `**${offer.name}**`, inline: true },
            { name: "💵 **السعر**", value: `**${offer.isFree ? "مجاني" : formatCurrency(offer.price)}**`, inline: true },
            { name: "💳 **الرصيد بعد الشراء**", value: `**${formatCurrency(updatedAccount.balance)}**`, inline: true }
          ]
        });

        await interaction.editReply({
          content: offer.isFree
            ? `تم تسجيل المركبة **${offer.name}** ضمن ممتلكاتك مجانًا.`
            : `تم شراء المركبة **${offer.name}** مقابل **${formatCurrency(offer.price)}**.`,
          embeds: [],
          components: []
        }).catch(() => null);
        return;
      }

      if (interaction.customId.startsWith("budget_cancel_sector:")) {
        pendingBudgetDrafts.delete(interaction.user.id);
        await interaction.update({
          content: "تم إلغاء طلب شراء عتاد القطاع.",
          embeds: [],
          components: []
        });
        return;
      }

      if (interaction.customId.startsWith("budget_cancel:")) {
        pendingBudgetDrafts.delete(interaction.user.id);
        await interaction.update({
          content: "تم إلغاء العملية.",
          embeds: [],
          components: []
        });
        return;
      }

      if (interaction.customId.startsWith("budget_confirm_sector:")) {
        const budgetKey = interaction.customId.split(":")[1];
        const draft = buildPoliceSectorDraft(interaction.user.id, budgetKey);
        const result = applyBudgetTransaction({
          budgetKey,
          type: "purchase",
          amount: draft.totalPrice,
          actorUserId: interaction.user.id,
          label: "شراء عتاد قطاع",
          note: [
            "عتاد قطاع أساسي",
            ...draft.addons.map((key) => POLICE_SECTOR_ADDONS[key]?.label).filter(Boolean)
          ].join(" + ")
        });

        if (!result.ok) {
          await interaction.reply({ content: "رصيد الميزانية لا يكفي لإتمام هذا الطلب.", ephemeral: true });
          return;
        }

        await interaction.user.send({
          embeds: [
            buildBudgetPurchaseDmEmbed({
              definition: getBudgetDefinition(budgetKey),
              title: "تمت إضافة عتاد قطاع إلى طلبك",
              items: [
                "عتاد قطاع أساسي",
                ...draft.addons.map((key) => POLICE_SECTOR_ADDONS[key]?.label).filter(Boolean)
              ],
              totalPrice: draft.totalPrice
            })
          ]
        }).catch(() => null);

        pendingBudgetDrafts.delete(interaction.user.id);
        await refreshBudgetSourceMessage(
          interaction.user.id,
          budgetKey,
          `✅ تم اعتماد الطلب وخصم **${formatBudgetCurrency(draft.totalPrice)}** من **${getBudgetLabel(budgetKey)}**.`
        );
        const payload = buildBudgetStatusPayload(budgetKey, "", false);
        payload.content = null;
        delete payload.ephemeral;
        await interaction.update(payload);
        return;
      }

      if (interaction.customId.startsWith("budget_confirm:")) {
        const [, budgetKey, purchaseType] = interaction.customId.split(":");
        const current = pendingBudgetDrafts.get(interaction.user.id);
        if (!current || current.budgetKey !== budgetKey || current.type !== purchaseType) {
          await interaction.reply({ content: "انتهت صلاحية الطلب أو لم يعد موجودًا.", ephemeral: true });
          return;
        }

        if (purchaseType === "jus_finance_action") {
          if (current.action === "deposit") {
            const senderAccount = requireAccount(interaction.user.id);
            if (!senderAccount || senderAccount.balance < current.amount) {
              await interaction.reply({ content: "رصيدك الشخصي لا يكفي.", ephemeral: true });
              return;
            }

            updateAccount(interaction.user.id, (record) => {
              record.balance -= current.amount;
              return record;
            });

            applyBudgetTransaction({
              budgetKey,
              type: "deposit",
              amount: current.amount,
              actorUserId: interaction.user.id,
              label: "إيداع في الميزانية",
              note: "إيداع مؤكد للعدل"
            });
          } else {
            const result = applyBudgetTransaction({
              budgetKey,
              type: "withdraw",
              amount: current.amount,
              actorUserId: interaction.user.id,
              label: "سحب من الميزانية",
              note: "سحب مؤكد للعدل"
            });

            if (!result.ok) {
              await interaction.reply({ content: "رصيد الميزانية لا يكفي.", ephemeral: true });
              return;
            }

            updateAccount(interaction.user.id, (record) => {
              record.balance += current.amount;
              return record;
            });
          }

          pendingBudgetDrafts.delete(interaction.user.id);
          await refreshBudgetSourceMessage(
            interaction.user.id,
            budgetKey,
            `✅ تم اعتماد العملية و${current.action === "deposit" ? "إيداع" : "سحب"} **${formatBudgetCurrency(current.amount)}** بنجاح.`
          );
          const payload = buildBudgetStatusPayload(budgetKey, "", false);
          payload.content = null;
          delete payload.ephemeral;
          await interaction.update(payload);
          return;
        }

        if (purchaseType === "jus_transfer_action") {
          const result = applyBudgetTransaction({
            budgetKey,
            type: "transfer",
            amount: current.amount,
            actorUserId: interaction.user.id,
            targetUserId: current.targetUserId,
            label: "تحويل من الميزانية",
            note: `تحويل مؤكد إلى ${current.targetUserId}`
          });

          if (!result.ok) {
            await interaction.reply({ content: "رصيد الميزانية لا يكفي.", ephemeral: true });
            return;
          }

          updateAccount(current.targetUserId, (record) => {
            record.balance += current.amount;
            return record;
          });

          pendingBudgetDrafts.delete(interaction.user.id);
          await refreshBudgetSourceMessage(
            interaction.user.id,
            budgetKey,
            `✅ تم اعتماد التحويل إلى <@${current.targetUserId}> بمبلغ **${formatBudgetCurrency(current.amount)}**.`
          );
          const payload = buildBudgetStatusPayload(budgetKey, "", false);
          payload.content = null;
          delete payload.ephemeral;
          await interaction.update(payload);
          return;
        }

        const catalog = purchaseType === "police_military" ? POLICE_MILITARY_ITEMS : JUS_PURCHASE_ITEMS;
        const item = catalog[current.itemKey];
        if (!item) {
          await interaction.reply({ content: "العنصر المحدد غير صالح.", ephemeral: true });
          return;
        }

        const result = applyBudgetTransaction({
          budgetKey,
          type: "purchase",
          amount: item.price,
          actorUserId: interaction.user.id,
          label: purchaseType === "police_military" ? "شراء عتاد عسكري" : "شراء للعدل",
          note: item.label
        });

        if (!result.ok) {
          await interaction.reply({ content: "رصيد الميزانية لا يكفي لإتمام هذا الطلب.", ephemeral: true });
          return;
        }

        await interaction.user.send({
          embeds: [
            buildBudgetPurchaseDmEmbed({
              definition: getBudgetDefinition(budgetKey),
              title: `تم اعتماد ${item.label}`,
              items: [item.label],
              totalPrice: item.price
            })
          ]
        }).catch(() => null);

        pendingBudgetDrafts.delete(interaction.user.id);
        await refreshBudgetSourceMessage(
          interaction.user.id,
          budgetKey,
          `✅ تم اعتماد الطلب وخصم **${formatBudgetCurrency(item.price)}** من **${getBudgetLabel(budgetKey)}**.`
        );
        const payload = buildBudgetStatusPayload(budgetKey, "", false);
        payload.content = null;
        delete payload.ephemeral;
        await interaction.update(payload);
        return;
      }

      if (interaction.customId.startsWith("crafting_begin_purchase:")) {
        const levelKey = interaction.customId.split(":")[1];
        const account = requireAccount(interaction.user.id);
        const level = CRAFTING_TABLE_LEVELS[levelKey];
        const deferred = await safelyDeferReply(interaction, { ephemeral: true });
        if (!deferred) {
          return;
        }

        if (!account) {
          await interaction.editReply({ content: "لا يوجد لديك حساب بنكي." });
          return;
        }

        if (!level?.purchasable) {
          await interaction.editReply({ content: "هذا المستوى غير متاح للبيع حاليًا." });
          return;
        }

        if (hasCraftingTable(account, 1) && levelKey === CRAFTING_TABLE_LEVELS.level1.key) {
          await interaction.editReply({ content: "أنت تملك طاولة تصنيع مستوى أول بالفعل." });
          return;
        }

        const cooldownText = getCraftingCooldownText(account);
        if (cooldownText) {
          await interaction.editReply({ content: `لا يمكنك إعادة المحاولة الآن. الموعد القادم ${cooldownText}.` });
          return;
        }

        pendingCraftingApprovals.set(interaction.user.id, {
          levelKey,
          createdAt: Date.now()
        });

        await interaction.user.send({
          embeds: [
            new EmbedBuilder()
              .setColor(0x0c1f3f)
              .setTitle("🛠️ طلب شراء طاولة تصنيع")
              .setDescription([
                `**الطاولة المطلوبة:** ${level.label}`,
                `**السعر:** ${level.price.toLocaleString("en-US")} ريال`,
                "",
                "**التعليمات والتنبيهات:**",
                "• لا يوجد استرداد بعد الشراء النهائي",
                "• الاختبار يبدأ فقط إذا ضغطت موافق",
                "• عند الرسوب أو انتهاء الوقت تعاد المحاولة بعد 10 دقائق",
                "• الأسئلة عشوائية وتتصعب تدريجيًا",
                "• لديك دقيقة واحدة لكل سؤال"
              ].join("\n"))
              .setImage(CRAFTING_TABLE_IMAGE_URL)
              .setFooter({ text: "Arab World • طاولة تصنيع" })
              .setTimestamp()
          ],
          files: getCraftingImageFiles(),
          components: [buildCraftingApprovalButtons(levelKey)]
        }).catch(() => null);

        await interaction.editReply({
          content: "تم إرسال تعليمات الشراء إلى الخاص. راجع رسائلك وأرسل موافق إذا كنت مستعدًا.",
        });
        return;
      }

      if (interaction.customId.startsWith("crafting_dm_decline:")) {
        const deferred = await safelyDeferUpdate(interaction);
        if (!deferred) {
          return;
        }

        pendingCraftingApprovals.delete(interaction.user.id);
        await interaction.editReply({
          content: "تم إلغاء طلب شراء طاولة التصنيع.",
          embeds: [],
          components: []
        });
        return;
      }

      if (interaction.customId.startsWith("crafting_dm_approve:")) {
        const deferred = await safelyDeferUpdate(interaction);
        if (!deferred) {
          return;
        }

        const levelKey = interaction.customId.split(":")[1];
        const result = await beginCraftingChallenge(interaction.user.id, levelKey);
        if (!result.ok) {
          if (result.error === "cooldown") {
            await interaction.editReply({
              content: `لا يمكنك إعادة المحاولة الآن. الموعد القادم <t:${Math.floor(new Date(result.cooldownEndsAt).getTime() / 1000)}:R>.`,
            });
            return;
          }

          await interaction.editReply({ content: "تعذر بدء اختبار التصنيع الآن." });
          return;
        }

        pendingCraftingApprovals.delete(interaction.user.id);
        await interaction.editReply({
          content: "تمت الموافقة وبدأ الاختبار في الخاص الآن.",
          embeds: [],
          components: []
        });
        return;
      }

      if (interaction.customId.startsWith("crafting_cancel_purchase:")) {
        pendingCraftingApprovals.delete(interaction.user.id);
        activeCraftingChallenges.delete(interaction.user.id);
        clearCraftingTimeout(interaction.user.id);
        await interaction.update({
          content: "تم إلغاء عملية طاولة التصنيع.",
          embeds: [],
          components: []
        });
        return;
      }

      if (interaction.customId.startsWith("crafting_confirm_purchase:")) {
        const levelKey = interaction.customId.split(":")[1];
        const account = requireAccount(interaction.user.id);
        const level = CRAFTING_TABLE_LEVELS[levelKey];

        if (!account || !level) {
          await interaction.reply({ content: "تعذر إكمال شراء الطاولة.", ephemeral: true });
          return;
        }

        if (account.balance < level.price) {
          await interaction.reply({ content: "رصيدك البنكي لا يكفي لشراء الطاولة.", ephemeral: true });
          return;
        }

        updateAccount(interaction.user.id, (current) => {
          current.balance -= level.price;
          current.crafting ??= {};
          current.crafting.tableLevel = Math.max(Number(current.crafting.tableLevel || 0), 1);
          current.crafting.cooldownEndsAt = null;
          return current;
        });

        const updatedAccount = getAccount(interaction.user.id);
        if (levelKey === CRAFTING_TABLE_LEVELS.level1.key && interaction.member?.roles?.add) {
          await interaction.member.roles.add(CRAFTING_LEVEL1_ACCESS_ROLE_ID).catch(() => null);
        }
        appendTransaction({
          discordUserId: interaction.user.id,
          robloxUsername: updatedAccount.robloxUsername,
          type: "crafting_table_purchase",
          amount: level.price,
          direction: "debit",
          balanceAfter: updatedAccount.balance,
          metadata: { levelKey }
        });

        await sendSystemLog(CRAFTING_LOG_CHANNEL_ID, {
          title: "🛠️ **شراء طاولة تصنيع**",
          description: "**تم شراء طاولة تصنيع مستوى أول بعد اجتياز الاختبار.**",
          fields: [
            { name: "👤 **العضو**", value: `**<@${interaction.user.id}>**`, inline: true },
            buildBankAccountAuditField(updatedAccount),
            { name: "📦 **المستوى**", value: `**${level.label}**`, inline: true },
            { name: "💵 **السعر**", value: `**${level.price.toLocaleString("en-US")} ريال**`, inline: true }
          ]
        });

        await sendPoliceBankLog({
          title: "🛠️ **استخراج طاولة تصنيع**",
          description: "**تم استخراج وشراء طاولة تصنيع جديدة لمواطن.**",
          fields: [
            { name: "👤 **العضو**", value: `**<@${interaction.user.id}>**`, inline: true },
            buildBankAccountAuditField(updatedAccount),
            { name: "📦 **المستوى**", value: `**${level.label}**`, inline: true },
            { name: "💵 **السعر**", value: `**${formatCurrency(level.price)}**`, inline: true }
          ]
        });

        await interaction.update({
          content: "تم شراء طاولة التصنيع بنجاح. نتمنى منك فتح تذكرة لإكمال الإجراءات.",
          embeds: [],
          components: []
        });
        return;
      }

      if (interaction.customId.startsWith("crafting_confirm_weapon:")) {
        if (!(await ensureNoServiceHold(interaction))) {
          return;
        }

        const deferred = await safelyDeferReply(interaction, { ephemeral: true });
        if (!deferred) {
          return;
        }

        const weaponKey = interaction.customId.split(":")[1];
        const weapon = CRAFTABLE_WEAPONS[weaponKey];
        const account = requireAccount(interaction.user.id);
        const hasLevel1Role = interaction.member?.roles?.cache?.has(CRAFTING_LEVEL1_ACCESS_ROLE_ID);
        const hasLevel2Role = interaction.member?.roles?.cache?.has(CRAFTING_LEVEL2_ACCESS_ROLE_ID);
        const availableLevels = [];
        if (hasCraftingTable(account, 1) || hasLevel1Role) {
          availableLevels.push("level1");
        }
        if (hasLevel2CraftingAccess(interaction.member, account) || hasLevel2Role) {
          availableLevels.push("level2");
        }
        if (hasLevel2UpgradedCraftingAccess(account)) {
          availableLevels.push("level2upgraded");
        }
        if (hasLevel3CraftingAccess(account)) {
          availableLevels.push("level3");
        }
        const availableWeaponKeys = new Set(availableLevels.flatMap((levelKey) => getCraftingWeaponsForLevel(levelKey).map((item) => item.key)));

        if (!weapon || !account || !availableWeaponKeys.has(weaponKey)) {
          await interaction.editReply({ content: "تعذر إكمال التصنيع." });
          return;
        }

        if (!availableLevels.length) {
          await interaction.editReply({ content: "لا تملك أي صلاحية تصنيع فعالة حاليًا." });
          return;
        }

        if (account.balance < weapon.cash) {
          await interaction.editReply({ content: "رصيدك البنكي لا يكفي للتصنيع." });
          return;
        }

        const resourceGaps = getResourceRequirementGaps(account, weapon.resources);
        const missingResources = resourceGaps.filter((item) => item.missing);

        if (missingResources.length) {
          await interaction.editReply({
            content: [
              "الموارد غير مكتملة:",
              ...resourceGaps.map((item) =>
                `• ${RESOURCE_CATALOG[item.resourceKey].label}: المطلوب ${item.requiredAmount} | المتوفر ${item.currentAmount}`
              )
            ].join("\n")
          });
          return;
        }

        const inventoryWeaponKey = weapon.inventoryKey || weaponKey;
        const roleId = getWeaponInventoryDefinition(inventoryWeaponKey).roleId || (inventoryWeaponKey === "m9" ? config.m9RoleId : null);
        let craftedWeaponCode = "";
        const weaponCraftCommit = mutateStore((store) => {
          const current = getMutableAccount(store, interaction.user.id);
          if (!current) {
            return { ok: false, error: "account_not_found" };
          }

          current.resources ??= {
            coal: 0,
            copper: 0,
            iron: 0,
            aluminum: 0,
            sulfur: 0,
            plastic: 0
          };

          if (Number(current.balance || 0) < weapon.cash) {
            return { ok: false, error: "insufficient_balance" };
          }

          for (const [resourceKey, amount] of Object.entries(weapon.resources)) {
            if (Number(current.resources?.[resourceKey] || 0) < Number(amount || 0)) {
              return { ok: false, error: "insufficient_resources" };
            }
          }

          current.balance -= weapon.cash;
          const slotIndex = appendWeaponInventory(current, inventoryWeaponKey, {
            craftedAt: new Date().toISOString(),
            acquiredAt: new Date().toISOString(),
            purchasedAt: new Date().toISOString(),
            active: true,
            brokenAt: null,
            expiresAt: null,
            permanent: weapon.permanent !== false,
            source: weapon.levels.includes("level3")
              ? "crafting_level3"
              : weapon.levels.includes("level2upgraded")
                ? "crafting_level2upgraded"
                : weapon.levels.includes("level2")
                  ? "crafting_level2"
                  : "crafting_level1",
            weaponLabel: (weapon.label || "").replace(" مؤقت", "").replace(" دائم", ""),
            killCount: 0,
            qualityPercent: 100
          });
          craftedWeaponCode = buildWeaponInventoryCode(inventoryWeaponKey, slotIndex);
          for (const [resourceKey, amount] of Object.entries(weapon.resources)) {
            current.resources[resourceKey] -= amount;
          }

          appendTransactionToStore(store, {
            discordUserId: interaction.user.id,
            robloxUsername: current.robloxUsername,
            type: "weapon_craft",
            amount: weapon.cash,
            direction: "debit",
            balanceAfter: current.balance,
            metadata: {
              weaponKey: inventoryWeaponKey,
              roleId
            }
          });

          return {
            ok: true,
            updatedAccount: structuredClone(current)
          };
        });

        if (!weaponCraftCommit?.ok) {
          await interaction.editReply({
            content: weaponCraftCommit?.error === "insufficient_balance"
              ? "رصيدك البنكي لا يكفي للتصنيع."
              : weaponCraftCommit?.error === "insufficient_resources"
                ? [
                    "الموارد غير مكتملة:",
                    ...resourceGaps.map((item) =>
                      `• ${RESOURCE_CATALOG[item.resourceKey].label}: المطلوب ${item.requiredAmount} | المتوفر ${item.currentAmount}`
                    )
                  ].join("\n")
                : "تعذر إكمال التصنيع."
          });
          return;
        }

        const updatedAccount = weaponCraftCommit.updatedAccount;

        if (roleId) {
          await interaction.member.roles.add(roleId).catch((error) => {
            console.error("Failed to add crafted weapon role:", error);
          });
        }

        await sendSystemLogs([WEAPONS_LOG_CHANNEL_ID, CRAFTING_LOG_CHANNEL_ID], {
          title: "🔧 **تصنيع سلاح**",
          description: "**تم تصنيع سلاح عبر طاولة التصنيع وخصم قيمته وموارده.**",
          fields: [
            { name: "👤 **العضو**", value: `**<@${interaction.user.id}>**`, inline: true },
            buildBankAccountAuditField(updatedAccount),
            { name: "🔫 **السلاح**", value: `**${weapon.label}**`, inline: true },
            { name: "🆔 **رمز النسخة**", value: `**${craftedWeaponCode}**`, inline: true },
            { name: "💵 **السعر**", value: `**${weapon.cash.toLocaleString("en-US")} ريال**`, inline: true },
            { name: "📜 **النوع**", value: weapon.permanent === false ? "**مؤقت**" : "**دائم**", inline: true }
          ]
        });

        await sendPoliceBankLog({
          title: "🛠️ **تصنيع سلاح لمواطن**",
          description: "**تم تسجيل عملية تصنيع سلاح جديدة في النظام.**",
          fields: [
            { name: "👤 **العضو**", value: `**<@${interaction.user.id}>**`, inline: true },
            buildBankAccountAuditField(updatedAccount),
            { name: "🔫 **السلاح**", value: `**${weapon.label}**`, inline: true },
            { name: "🆔 **رمز النسخة**", value: `**${craftedWeaponCode}**`, inline: true },
            { name: "📜 **النوع**", value: weapon.permanent === false ? "**مؤقت**" : "**دائم**", inline: true }
          ]
        });

        await interaction.user.send({
          embeds: [
            buildWeaponOperationDmEmbed({
              title: weapon.permanent === false ? `🛠️ تم تصنيع ${weapon.label} بشكل مؤقت` : `🛠️ تم تصنيع ${weapon.label}`,
              description: weapon.permanent === false
                ? "تم تصنيع نسخة مؤقتة بنجاح، وجودة السلاح ستنخفض تدريجيًا مع القتلات حتى ينكسر."
                : "تم تصنيع نسخة جديدة من سلاحك بنجاح عبر طاولة التصنيع.",
              weaponCode: craftedWeaponCode,
              weaponLabel: (weapon.label || "").replace(" مؤقت", "").replace(" دائم", ""),
              permanent: weapon.permanent !== false,
              extraLines: [
                weapon.permanent === false
                  ? `**📘 التعليمات:** هذا السلاح مؤقت ويملك بار جودة يبدأ من 100% وينخفض مع الاستخدام القتالي.${weapon.levels.includes("level3") ? " كل 5 قتلات = 1%." : weapon.levels.includes("level2upgraded") ? " كل 4 قتلات = 1%." : ""}`
                  : "**📘 التعليمات:** هذا السلاح دائم من هذه الطاولة ولن تنتهي صلاحيته.",
                "**📦 ملاحظة:** إذا كان عندك سلاح سابق فسيبقى معك، وهذه نسخة إضافية.",
                "**🧭 للمراجعة:** استخدم `/ايمبد-المعلومات` ثم `رؤيه اسلحتي`."
              ]
            })
          ]
        }).catch(() => null);

        await interaction.editReply({
          content: `تم تصنيع **${weapon.label}** بنجاح برمز **${craftedWeaponCode}** وإرسال التفاصيل إلى الخاص.`
        });
        return;
      }

      if (interaction.customId.startsWith("crafting_cancel_weapon:")) {
        await interaction.update({
          content: "تم إلغاء عملية التصنيع.",
          embeds: [],
          components: []
        });
        return;
      }

      if (interaction.customId === "crafting_level2_begin_extraction") {
        const deferred = await safelyDeferReply(interaction, { ephemeral: true });
        if (!deferred) {
          return;
        }

        const account = requireAccount(interaction.user.id);
        if (!account) {
          await interaction.editReply({ content: "لا يوجد لديك حساب بنكي." });
          return;
        }

        if (!hasCraftingTable(account, 1) && !interaction.member?.roles?.cache?.has(CRAFTING_LEVEL1_ACCESS_ROLE_ID)) {
          await interaction.editReply({ content: "يجب أن تملك طاولة تصنيع مستوى أول قبل بدء استخراج المستوى الثاني." });
          return;
        }

        if (hasLevel2CraftingAccess(interaction.member, account)) {
          await interaction.editReply({ content: "أنت تملك الوصول إلى المستوى الثاني بالفعل." });
          return;
        }

        updateAccount(interaction.user.id, (current) => {
          current.crafting ??= {};
          current.crafting.level2Quest ??= {};
          current.crafting.level2Quest.stage = "stage1_sent";
          current.crafting.level2Quest.startedAt = current.crafting.level2Quest.startedAt || new Date().toISOString();
          current.crafting.level2Quest.firstPuzzleSentAt = new Date().toISOString();
          return current;
        });

        const delivered = await sendCraftingLevel2FirstPuzzle(interaction.user.id);
        if (!delivered) {
          await interaction.editReply({ content: "تعذر إرسال ملف الاستخراج إلى الخاص. افتح الخاص مع البوت ثم حاول مرة أخرى." });
          return;
        }

        await interaction.editReply({
          embeds: [
            new EmbedBuilder()
              .setColor(0x111111)
              .setTitle("☠️ بدأ مسار استخراج المستوى الثاني")
              .setDescription([
                "**تم إرسال الملف الأول إلى الخاص.**",
                "**المطلوب الآن:** أرسل الموقع الصحيح للبوت في الخاص.",
                "**بعدها:** سيرد عليك ويطلب الرقم أو المدى المطلوب من نفس الملف الأول.",
                "",
                "**بعد اعتماد الحل ستصلك المخطوطة الثانية تلقائيًا.**"
              ].join("\n"))
              .setFooter({ text: "Arab World • المسار السري" })
              .setTimestamp()
          ]
        });
        return;
      }

      if (interaction.customId === "crafting_level2_status") {
        const deferred = await safelyDeferReply(interaction, { ephemeral: true });
        if (!deferred) {
          return;
        }

        const account = requireAccount(interaction.user.id);
        const stage = account?.crafting?.level2Quest?.stage || "idle";
        const stageLabelMap = {
          idle: "لم يبدأ",
          stage1_sent: "بانتظار حل الموقع",
          stage1_location_confirmed: "تم اعتماد الموقع وبانتظار الرقم",
          beast_killed: "تم تجاوز مرحلة قديمة",
          stage2_sent: "تم إرسال المخطوطة الثانية",
          completed: "اكتمل الاستخراج"
        };

        await interaction.editReply({
          embeds: [
            new EmbedBuilder()
              .setColor(0x111111)
              .setTitle("📜 حالة ملف الاستخراج")
              .setDescription([
                `**الحالة الحالية:** ${stageLabelMap[stage] || stage}`,
                stage === "stage1_sent"
                  ? "**الخطوة القادمة:** أرسل الموقع الصحيح في الخاص."
                  : stage === "stage1_location_confirmed"
                    ? "**الخطوة القادمة:** أرسل الرقم أو المدى المطلوب من الملف الأول."
                  : stage === "stage2_sent"
                    ? "**الخطوة القادمة:** افتح الخاص واضغط زر `وضع الرقم`."
                    : stage === "completed"
                      ? "**الملف مكتمل. افتح تذكرة إذا احتجت استكمالًا إداريًا.**"
                      : "**ابدأ الملف من زر الاستخراج ثم راقب الخاص.**"
              ].join("\n"))
              .setFooter({ text: "Arab World • ملف المستوى الثاني" })
              .setTimestamp()
          ]
        });
        return;
      }

      if (interaction.customId === "crafting_level2_submit_code") {
        const deferred = await safelyDeferReply(interaction, { ephemeral: true });
        if (!deferred) {
          return;
        }

        const user = await client.users.fetch(interaction.user.id).catch(() => null);
        await user?.send({
          embeds: [
            new EmbedBuilder()
              .setColor(0x111111)
              .setTitle("🔐 وضع الرقم النهائي")
              .setDescription("**أرسل الرقم النهائي مباشرة هنا في الخاص الآن، وسأتحقق منه تلقائيًا بدون الحاجة إلى المودال.**")
              .setFooter({ text: "Arab World • الملف النهائي" })
              .setTimestamp()
          ]
        }).catch(() => null);

        await interaction.editReply({
          content: "تم فتح وضع الرقم في الخاص. أرسل الرقم النهائي هناك مباشرة."
        });
        return;
      }

      if (interaction.customId === "crafting_level2_upgrade_begin") {
        const deferred = await safelyDeferReply(interaction, { ephemeral: true });
        if (!deferred) {
          return;
        }

        const account = refreshCraftingProgress(interaction.user.id);
        if (!account || !hasLevel2CraftingAccess(interaction.member, account)) {
          await interaction.editReply({ content: "يجب أن تمتلك المستوى الثاني أولًا." });
          return;
        }

        if (hasLevel2UpgradedCraftingAccess(account)) {
          await interaction.editReply({ content: "أنت تملك المستوى الثاني المطور بالفعل." });
          return;
        }

        if (Number(account.balance || 0) < Number(CRAFTING_TABLE_LEVELS.level2upgraded.price || 0)) {
          await interaction.editReply({ content: "رصيدك البنكي لا يكفي لتطوير الطاولة." });
          return;
        }

        updateAccount(interaction.user.id, (current) => {
          current.balance -= Number(CRAFTING_TABLE_LEVELS.level2upgraded.price || 0);
          current.crafting ??= {};
          current.crafting.level2Upgrade ??= {};
          current.crafting.level2Upgrade.stage = "puzzle_sent";
          current.crafting.level2Upgrade.startedAt = current.crafting.level2Upgrade.startedAt || new Date().toISOString();
          current.crafting.level2Upgrade.paidAt = new Date().toISOString();
          current.crafting.level2Upgrade.puzzleSentAt = new Date().toISOString();
          return current;
        });

        const updatedAccount = getAccount(interaction.user.id);
        appendTransaction({
          discordUserId: interaction.user.id,
          robloxUsername: updatedAccount?.robloxUsername,
          type: "crafting_table_level2_upgrade",
          amount: Number(CRAFTING_TABLE_LEVELS.level2upgraded.price || 0),
          direction: "debit",
          balanceAfter: Number(updatedAccount?.balance || 0),
          metadata: { levelKey: "level2upgraded" }
        });

        const delivered = await sendCraftingLevel2UpgradePuzzle(interaction.user.id);
        if (!delivered) {
          updateAccount(interaction.user.id, (current) => {
            current.balance += Number(CRAFTING_TABLE_LEVELS.level2upgraded.price || 0);
            current.crafting ??= {};
            current.crafting.level2Upgrade ??= {};
            current.crafting.level2Upgrade.stage = "idle";
            current.crafting.level2Upgrade.puzzleSentAt = null;
            return current;
          });
          await interaction.editReply({ content: "تعذر إرسال اللغز إلى الخاص، وتم إرجاع مبلغ التطوير بالكامل. افتح الخاص مع البوت ثم حاول مرة أخرى." });
          return;
        }

        await interaction.editReply({ content: "تم خصم قيمة التطوير وإرسال ملف جونز مارك إلى الخاص." });
        return;
      }

      if (interaction.customId === "crafting_level2_upgrade_submit_code") {
        await safelyShowModal(interaction, createCraftingLevel2UpgradeCodeModal());
        return;
      }

      if (interaction.customId === "crafting_level3_begin") {
        const deferred = await safelyDeferReply(interaction, { ephemeral: true });
        if (!deferred) {
          return;
        }

        const account = refreshCraftingProgress(interaction.user.id);
        if (!account || !hasLevel2UpgradedCraftingAccess(account)) {
          await interaction.editReply({ content: "يجب أن تمتلك المستوى الثاني المطور قبل ملف المستوى الثالث." });
          return;
        }

        if (hasLevel3CraftingAccess(account)) {
          await interaction.editReply({ content: "المستوى الثالث مفتوح لديك بالفعل." });
          return;
        }

        if (account?.crafting?.level3Quest?.stage === "waiting") {
          await interaction.editReply({ embeds: [buildCraftingLevel3WaitingEmbed(account.crafting.level3Quest.waitingUntil)] });
          return;
        }

        updateAccount(interaction.user.id, (current) => {
          current.crafting ??= {};
          current.crafting.level3Quest ??= {};
          current.crafting.level3Quest.stage = "puzzle_sent";
          current.crafting.level3Quest.startedAt = current.crafting.level3Quest.startedAt || new Date().toISOString();
          current.crafting.level3Quest.puzzleSentAt = new Date().toISOString();
          return current;
        });

        const delivered = await sendCraftingLevel3Puzzle(interaction.user.id);
        if (!delivered) {
          await interaction.editReply({ content: "تعذر إرسال ملف المستوى الثالث إلى الخاص. افتح الخاص مع البوت ثم حاول مرة أخرى." });
          return;
        }

        await interaction.editReply({ content: "تم إرسال ملف المستوى الثالث إلى الخاص." });
        return;
      }

      if (interaction.customId === "crafting_level3_submit_code") {
        await safelyShowModal(interaction, createCraftingLevel3CodeModal());
        return;
      }

      if (interaction.customId === "bank_enter_pin") {
        await interaction.showModal(createPinModal());
        return;
      }

      if (interaction.customId === MDT_ACTIONS.addFine) {
        await interaction.showModal(createFineModal());
        return;
      }

      if (interaction.customId === MDT_ACTIONS.removeFine) {
        await interaction.showModal(createRemoveFineLookupModal());
        return;
      }

      if (interaction.customId === MDT_ACTIONS.applyHold) {
        if (!canManageMdtHold(interaction.member)) {
          await interaction.reply({ content: `هذا الزر متاح فقط لمن يملك الرتبة <@&${config.mdtHoldAccessRoleId}>.`, ephemeral: true });
          return;
        }

        await interaction.showModal(createApplyHoldModal());
        return;
      }

      if (interaction.customId === MDT_ACTIONS.removeHold) {
        if (!canManageMdtHold(interaction.member)) {
          await interaction.reply({ content: `هذا الزر متاح فقط لمن يملك الرتبة <@&${config.mdtHoldAccessRoleId}>.`, ephemeral: true });
          return;
        }

        await interaction.showModal(createAdminRemoveHoldModal());
        return;
      }

      if (interaction.customId === "gun_show_menu") {
        await interaction.reply({
          embeds: [buildGunPurchaseEmbedPolished()],
          components: [buildGunPurchaseButtonPolished()],
          ephemeral: true
        });
        return;
      }

      if (interaction.customId === "purchase_m9") {
        if (!(await ensureNoServiceHold(interaction))) {
          return;
        }

        const account = requireAccount(interaction.user.id);
        if (!account) {
          await interaction.reply({ content: "لا يوجد لديك حساب بنكي.", ephemeral: true });
          return;
        }

        const missingResources = Object.entries(M9_REQUIREMENTS.resources)
          .filter(([resourceKey, amount]) => account.resources[resourceKey] < amount)
          .map(([resourceKey, amount]) => `${RESOURCE_CATALOG[resourceKey].label} ${amount}`);

        if (account.balance < M9_REQUIREMENTS.cash) {
          await interaction.reply({ content: "رصيدك البنكي لا يكفي لشراء السلاح.", ephemeral: true });
          return;
        }

        if (missingResources.length) {
          await interaction.reply({
            content: `الموارد غير مكتملة.\n${resourceRequirementsText()}`,
            ephemeral: true
          });
          return;
        }

        let purchasedWeaponCode = "";
        let purchasedWeaponExpiry = null;
        const weaponPurchaseCommit = mutateStore((store) => {
          const current = getMutableAccount(store, interaction.user.id);
          if (!current) {
            return { ok: false, error: "account_not_found" };
          }

          if (Number(current.balance || 0) < M9_REQUIREMENTS.cash) {
            return { ok: false, error: "insufficient_balance" };
          }

          current.resources ??= {
            coal: 0,
            copper: 0,
            iron: 0,
            aluminum: 0,
            sulfur: 0,
            plastic: 0
          };

          for (const [resourceKey, amount] of Object.entries(M9_REQUIREMENTS.resources)) {
            if (Number(current.resources?.[resourceKey] || 0) < Number(amount || 0)) {
              return { ok: false, error: "insufficient_resources" };
            }
          }

          purchasedWeaponExpiry = scheduleWeaponExpiryDate(current, "m9", getRandomWeaponExpiryDurationMs());
          const slotIndex = appendWeaponInventory(current, "m9", {
            purchasedAt: new Date().toISOString(),
            acquiredAt: new Date().toISOString(),
            expiresAt: purchasedWeaponExpiry,
            active: true,
            brokenAt: null,
            permanent: false,
            source: "gun_store",
            weaponLabel: "M9",
            killCount: 0,
            qualityPercent: 100
          });
          purchasedWeaponCode = buildWeaponInventoryCode("m9", slotIndex);
          current.balance -= M9_REQUIREMENTS.cash;
          for (const [resourceKey, amount] of Object.entries(M9_REQUIREMENTS.resources)) {
            current.resources[resourceKey] -= amount;
          }

          appendTransactionToStore(store, {
            discordUserId: interaction.user.id,
            robloxUsername: current.robloxUsername,
            type: "weapon_purchase",
            amount: M9_REQUIREMENTS.cash,
            direction: "debit",
            balanceAfter: current.balance,
            metadata: {
              weaponCode: "M9",
              roleId: config.m9RoleId
            }
          });

          return {
            ok: true,
            updatedAccount: structuredClone(current)
          };
        });

        if (!weaponPurchaseCommit?.ok) {
          const failureMessage = weaponPurchaseCommit?.error === "insufficient_resources"
            ? `الموارد غير مكتملة.\n${resourceRequirementsText()}`
            : weaponPurchaseCommit?.error === "insufficient_balance"
              ? "رصيدك البنكي لا يكفي لشراء السلاح."
              : "تعذر شراء السلاح الآن.";
          await interaction.reply({
            content: failureMessage,
            ephemeral: true
          });
          return;
        }

        const updatedAccount = weaponPurchaseCommit.updatedAccount;

        try {
          await interaction.member.roles.add(config.m9RoleId);
        } catch (error) {
          console.error("Failed to add M9 role after purchase:", error);
        }
        await sendSystemLog(WEAPONS_LOG_CHANNEL_ID, {
          title: "🔫 **شراء سلاح M9**",
          description: "**تم شراء السلاح بنجاح وخصم قيمته وموارده من الحساب البنكي.**",
          fields: [
            { name: "👤 **المشتري**", value: `**<@${interaction.user.id}>**`, inline: true },
            buildBankAccountAuditField(updatedAccount),
            { name: "🎮 **يوزر روبلوكس**", value: `**${updatedAccount.robloxUsername || "غير مسجل"}**`, inline: true },
            { name: "💵 **السعر**", value: `**${M9_REQUIREMENTS.cash.toLocaleString("en-US")} ريال**`, inline: true },
            { name: "💳 **الرصيد بعد الشراء**", value: `**${updatedAccount.balance.toLocaleString("en-US")} ريال**`, inline: true },
            { name: "🪪 **الرتبة المضافة**", value: `**${config.m9RoleId}**`, inline: true },
            { name: "📦 **المواد المخصومة**", value: resourceRequirementsText(), inline: false }
          ]
        });

        await sendPoliceBankLog({
          title: "🔫 **شراء سلاح من المتجر**",
          description: "**تم تسجيل شراء سلاح جديد من المتجر.**",
          fields: [
            { name: "👤 **المشتري**", value: `**<@${interaction.user.id}>**`, inline: true },
            buildBankAccountAuditField(updatedAccount),
            { name: "🔫 **السلاح**", value: "**M9**", inline: true },
            { name: "🆔 **رمز النسخة**", value: `**${purchasedWeaponCode}**`, inline: true },
            { name: "📜 **النوع**", value: "**مؤقت**", inline: true }
          ]
        });
        await interaction.reply({
          content: `تم شراء سلاح M9 بنجاح برمز **${purchasedWeaponCode}**.`,
          ephemeral: true
        });
        await interaction.user.send({
          embeds: [
            buildWeaponOperationDmEmbed({
              title: "🛒 تم شراء سلاح M9",
              description: "تمت إضافة نسخة جديدة من السلاح إلى حسابك بنجاح.",
              weaponCode: purchasedWeaponCode,
              weaponLabel: "M9",
              permanent: false,
              expiresAt: purchasedWeaponExpiry,
              extraLines: [
                "**📘 التعليمات:** احتفظ بكود السلاح إذا أردت إعطاءه لاحقًا.",
                "**⏳ التنبيه:** هذه النسخة مؤقتة، وتنتقل بمدتها المتبقية إذا أعطيتها لشخص آخر."
              ]
            })
          ]
        }).catch(() => null);
        return;
      }

      if (interaction.customId.startsWith("transfer_confirm:")) {
        await interaction.deferUpdate().catch(() => null);

        const transferId = interaction.customId.split(":")[1];
        const transfer = consumeTransfer(transferId);
        if (!transfer) {
          await interaction.editReply({
            content: "عملية التحويل لم تعد متاحة.",
            embeds: [],
            components: []
          }).catch(() => null);
          return;
        }

        const senderAccount = requireAccount(transfer.fromUserId);
        const targetAccount = requireAccount(transfer.toUserId);

        if (!senderAccount || !targetAccount) {
          await interaction.editReply({
            content: "تعذر إتمام التحويل لعدم وجود حساب.",
            embeds: [],
            components: []
          }).catch(() => null);
          return;
        }
        if (isAccountBankFrozen(senderAccount) || isAccountBankFrozen(targetAccount)) {
          await interaction.editReply({
            content: "تعذر تنفيذ التحويل لأن أحد الحسابين مجمّد حكوميًا.",
            embeds: [],
            components: []
          }).catch(() => null);
          return;
        }

        if (senderAccount.balance < transfer.amount) {
          await interaction.editReply({
            content: "رصيدك لم يعد كافيًا لإتمام التحويل.",
            embeds: [],
            components: []
          }).catch(() => null);
          return;
        }

        const transferCommit = mutateStore((store) => {
          const mutableSender = getMutableAccount(store, transfer.fromUserId);
          const mutableTarget = getMutableAccount(store, transfer.toUserId);

          if (!mutableSender || !mutableTarget) {
            return { ok: false, error: "account_not_found" };
          }

          if (isAccountBankFrozen(mutableSender) || isAccountBankFrozen(mutableTarget)) {
            return { ok: false, error: "account_frozen" };
          }

          if (Number(mutableSender.balance || 0) < transfer.amount) {
            return { ok: false, error: "insufficient_balance" };
          }

          mutableSender.balance -= transfer.amount;
          mutableTarget.balance += transfer.amount;

          appendTransactionToStore(store, {
            discordUserId: transfer.fromUserId,
            robloxUsername: mutableSender.robloxUsername,
            type: "transfer_sent",
            amount: transfer.amount,
            direction: "debit",
            balanceAfter: mutableSender.balance,
            metadata: {
              targetUserId: transfer.toUserId,
              targetAccountNumber: mutableTarget.accountNumber
            }
          });

          appendTransactionToStore(store, {
            discordUserId: transfer.toUserId,
            robloxUsername: mutableTarget.robloxUsername,
            type: "transfer_received",
            amount: transfer.amount,
            direction: "credit",
            balanceAfter: mutableTarget.balance,
            metadata: {
              sourceUserId: transfer.fromUserId,
              sourceAccountNumber: mutableSender.accountNumber
            }
          });

          return {
            ok: true,
            senderAfter: structuredClone(mutableSender),
            targetAfter: structuredClone(mutableTarget)
          };
        });

        if (!transferCommit?.ok) {
          await interaction.editReply({
            content: transferCommit?.error === "account_frozen"
              ? "تعذر تنفيذ التحويل لأن أحد الحسابين مجمّد حكوميًا."
              : transferCommit?.error === "insufficient_balance"
                ? "رصيدك لم يعد كافيًا لإتمام التحويل."
                : "تعذر إتمام التحويل لعدم وجود حساب.",
            embeds: [],
            components: []
          }).catch(() => null);
          return;
        }

        const senderAfter = transferCommit.senderAfter;
        const targetAfter = transferCommit.targetAfter;

        await sendSystemLog(TRANSFERS_LOG_CHANNEL_ID, {
          title: "💸 **تحويل بنكي ناجح**",
          description: "**تم تنفيذ عملية تحويل بنكي بين عضوين بنجاح.**",
          fields: [
            { name: "👤 **المحوّل**", value: `**<@${transfer.fromUserId}>**`, inline: true },
            { name: "📥 **المحوّل إليه**", value: `**<@${transfer.toUserId}>**`, inline: true },
            buildBankAccountAuditField(senderAccount, "🏦 **اسم حساب المرسل**"),
            buildBankAccountAuditField(targetAccount, "🏦 **اسم حساب المستلم**"),
            { name: "💵 **المبلغ**", value: `**${transfer.amount.toLocaleString("en-US")} ريال**`, inline: true },
            { name: "🆔 **حساب المرسل**", value: `**${senderAccount.accountNumber}**`, inline: true },
            { name: "🆔 **حساب المستلم**", value: `**${targetAccount.accountNumber}**`, inline: true },
            { name: "🎮 **روبلوكس المرسل**", value: `**${senderAccount.robloxUsername || "غير مسجل"}**`, inline: true }
          ]
        });

        await sendPoliceBankLog({
          title: "💸 **حوالة بنكية بين مواطنين**",
          description: "**تم تسجيل حوالة بنكية جديدة ضمن لوق خدمات الداخلية.**",
          fields: [
            { name: "📤 **من**", value: `**<@${transfer.fromUserId}>**`, inline: true },
            { name: "📥 **إلى**", value: `**<@${transfer.toUserId}>**`, inline: true },
            buildBankAccountAuditField(senderAccount, "🏦 **اسم حساب المرسل**"),
            buildBankAccountAuditField(targetAccount, "🏦 **اسم حساب المستلم**"),
            { name: "💵 **المبلغ**", value: `**${formatCurrency(transfer.amount)}**`, inline: true },
            { name: "💳 **رصيد المرسل بعد**", value: `**${formatCurrency(senderAfter.balance)}**`, inline: true },
            { name: "💳 **رصيد المستلم بعد**", value: `**${formatCurrency(targetAfter.balance)}**`, inline: true }
          ]
        });

        const targetUser = await client.users.fetch(transfer.toUserId).catch(() => null);
        await targetUser?.send({
          embeds: [
            buildTransferReceivedDmEmbedPolished({
              senderUser: `<@${transfer.fromUserId}>`,
              amount: transfer.amount,
              afterBalance: targetAfter.balance
            })
          ]
        }).catch(() => null);

        await interaction.editReply({
          content: `تم تحويل ${transfer.amount.toLocaleString("en-US")} ريال بنجاح.`,
          embeds: [],
          components: []
        });
        return;
      }

      if (interaction.customId.startsWith("transfer_cancel:")) {
        await interaction.deferUpdate().catch(() => null);

        const transferId = interaction.customId.split(":")[1];
        consumeTransfer(transferId);
        await interaction.editReply({
          content: "تم إلغاء عملية التحويل.",
          embeds: [],
          components: []
        });
        return;
      }

      if (interaction.customId.startsWith("finepay_approve:")) {
        const deferred = await safelyDeferUpdate(interaction);
        if (!deferred) {
          return;
        }

        const fineId = interaction.customId.split(":")[1];
        const fine = getFine(fineId);
        const account = getAccount(interaction.user.id);
        if (!fine || !account || fine.targetUserId !== interaction.user.id || fine.status === "paid") {
          await interaction.editReply({ content: "تعذر إتمام سداد المخالفة.", embeds: [], components: [] });
          return;
        }

        if (account.balance < fine.amount) {
          await interaction.editReply({ content: "فشلت عملية السداد، رصيدك لا يكفي.", embeds: [], components: [] });
          return;
        }

        const updated = updateAccount(interaction.user.id, (current) => {
          current.balance -= fine.amount;
          return current;
        });

        updateFine(fineId, (current) => {
          current.status = "paid";
          current.paidAt = new Date().toISOString();
          return current;
        });

        appendTransaction({
          discordUserId: interaction.user.id,
          robloxUsername: updated.robloxUsername,
          type: "fine_payment",
          amount: fine.amount,
          direction: "debit",
          balanceAfter: updated.balance,
          metadata: { fineId }
        });

        applyBudgetTransaction({
          budgetKey: BUDGET_KEYS.police,
          type: "fine_income",
          amount: fine.amount,
          actorUserId: interaction.user.id,
          label: "دخل مخالفة",
          note: `المخالفة #${fineId}`
        });

        await sendAuditLog(client, config.auditChannelId, {
          title: "🚨 **سداد مخالفة**",
          description: "**تم سداد المخالفة بنجاح وتوثيقها.**",
          fields: [
            { name: "👤 **المخالف**", value: `**<@${interaction.user.id}>**`, inline: true },
            buildBankAccountAuditField(updated),
            { name: "🪪 **رقم المخالفة**", value: `**#${fineId}**`, inline: true },
            { name: "💵 **المبلغ**", value: `**${fine.amount.toLocaleString("en-US")} ريال**`, inline: true }
          ]
        });

        await sendFinePaymentLog({
          title: "✅ **تم سداد مخالفة مواطن**",
          description: "**تم تسجيل سداد مخالفة جديدة وإزالتها من سجل المخالفات غير المسددة.**",
          color: 0x1f6b45,
          fields: [
            { name: "👤 **المواطن**", value: `**<@${interaction.user.id}>**`, inline: true },
            buildBankAccountAuditField(updated),
            { name: "🪪 **رقم المخالفة**", value: `**#${fineId}**`, inline: true },
            { name: "💵 **قيمة المخالفة**", value: `**${formatCurrency(fine.amount)}**`, inline: true },
            { name: "📝 **سبب المخالفة**", value: `**${fine.reason || "غير محدد"}**`, inline: false },
            { name: "📂 **نوع المخالفة**", value: `**${fine.violationType || "غير محدد"}**`, inline: true },
            { name: "👮 **العسكري المسؤول**", value: `**${fine.officerName || "غير معروف"}**`, inline: true },
            { name: "💳 **الرصيد بعد السداد**", value: `**${formatCurrency(updated.balance)}**`, inline: true }
          ]
        });

        await refreshActiveFinesViews(interaction.user.id);

        await interaction.editReply({ content: "تم سداد المخالفة بنجاح.", embeds: [], components: [] });
        await interaction.user.send(`تم سداد المخالفة #${fineId} بنجاح.`).catch(() => null);
        return;
      }

      if (interaction.customId.startsWith("finepay_reject:")) {
        await interaction.update({ content: "تم إلغاء عملية السداد.", embeds: [], components: [] });
        return;
      }

      if (interaction.customId.startsWith("loan_approve:")) {
        await interaction.update({
          content: "تمت الموافقة على طلب القرض.",
          embeds: interaction.message.embeds,
          components: []
        });
        return;
      }

      if (interaction.customId.startsWith("loan_reject:")) {
        await interaction.update({
          content: "تم رفض طلب القرض.",
          embeds: interaction.message.embeds,
          components: []
        });
        return;
      }

      if (interaction.customId.startsWith("loan_reason:")) {
        const loanId = interaction.customId.split(":")[1];
        await interaction.showModal(createLoanReasonModal(loanId));
        return;
      }

      if (interaction.customId.startsWith("hold_approve:")) {
        const requestId = interaction.customId.split(":")[1];
        const request = getHoldRequest(requestId);
        if (!request) {
          await interaction.reply({ content: "الطلب غير موجود.", ephemeral: true });
          return;
        }

        const member = await interaction.guild.members.fetch(request.userId).catch(() => null);
        await member?.roles.remove(config.serviceHoldRoleId).catch(() => null);
        await member?.send({
          embeds: [buildServiceHoldDecisionEmbedPolished({ approved: true })]
        }).catch(() => null);
        updateHoldRequest(requestId, (current) => ({ ...current, status: "approved", reviewedBy: interaction.user.id }));
        await sendAuditLog(client, config.auditChannelId, {
          title: "🛡️ **قبول رفع إيقاف خدمات**",
          description: "**تم قبول طلب رفع إيقاف الخدمات وتوثيق العملية.**",
          fields: [
            { name: "👤 **العضو**", value: `**<@${request.userId}>**`, inline: true },
            { name: "🧑‍⚖️ **المراجع**", value: `**<@${interaction.user.id}>**`, inline: true }
          ]
        });
        await interaction.update({ content: "تم قبول الطلب ورفع الإيقاف.", embeds: interaction.message.embeds, components: [] });
        return;
      }

      if (interaction.customId.startsWith("hold_reject:")) {
        const requestId = interaction.customId.split(":")[1];
        const request = getHoldRequest(requestId);
        if (request) {
          updateHoldRequest(requestId, (current) => ({ ...current, status: "rejected", reviewedBy: interaction.user.id }));
          const member = await interaction.guild.members.fetch(request.userId).catch(() => null);
          await member?.send({
            embeds: [buildServiceHoldDecisionEmbedPolished({ approved: false, reason: "تم الرفض من الإدارة." })]
          }).catch(() => null);
          await sendAuditLog(client, config.auditChannelId, {
            title: "🛡️ **رفض رفع إيقاف خدمات**",
            description: "**تم رفض طلب رفع إيقاف الخدمات وتوثيق العملية.**",
            fields: [
              { name: "👤 **العضو**", value: `**<@${request.userId}>**`, inline: true },
              { name: "🧑‍⚖️ **المراجع**", value: `**<@${interaction.user.id}>**`, inline: true }
            ]
          });
        }
        await interaction.update({ content: "تم رفض طلب رفع إيقاف الخدمات.", embeds: interaction.message.embeds, components: [] });
        return;
      }

      if (interaction.customId.startsWith("hold_reason:")) {
        const requestId = interaction.customId.split(":")[1];
        await interaction.showModal(createHoldReasonModal(requestId));
        return;
      }

      if (interaction.customId === GUN2_ACTIONS.inventory) {
        const account = requireAccount(interaction.user.id);
        if (!account) {
          await interaction.reply({ content: "لا يوجد لديك حساب بنكي.", ephemeral: true });
          return;
        }

        const inventoryCard = await buildResourceInventoryCardAttachment(
          account,
          account.name || interaction.member?.displayName || interaction.user.displayName || interaction.user.username
        );

        await interaction.reply({
          files: [inventoryCard],
          ephemeral: true
        });
        return;
      }

      if (interaction.customId.startsWith("buy_resource_")) {
        if (!(await ensureNoServiceHold(interaction))) {
          return;
        }

        const resourceKey = interaction.customId.replace("buy_resource_", "");
        await interaction.showModal(createResourceModal(resourceKey));
        return;
      }

      return;
    }

    if (interaction.type === InteractionType.ModalSubmit) {
      if (interaction.customId === "modal_crafting_level2_final_code") {
        const account = requireAccount(interaction.user.id);
        const enteredCode = normalizeDigitsToAscii(String(interaction.fields.getTextInputValue("final_code") || "").trim());
        if (!account || account?.crafting?.level2Quest?.stage !== "stage2_sent") {
          await interaction.reply({ content: "لا يوجد ملف نهائي مفتوح لك حاليًا.", ephemeral: true });
          return;
        }

        if (enteredCode !== getCraftingLevel2FinalCode()) {
          await interaction.reply({ content: "الرقم غير صحيح. راجع المخطوطة جيدًا ثم حاول مرة أخرى.", ephemeral: true });
          return;
        }

        const result = await finalizeCraftingLevel2Unlock(interaction.user.id);
        if (!result.ok) {
          await interaction.reply({ content: "لا يوجد ملف نهائي مفتوح لك حاليًا.", ephemeral: true });
          return;
        }

        await interaction.reply({
          embeds: [buildCraftingLevel2UnlockedEmbed()],
          ephemeral: true
        });
        return;
      }

      if (interaction.customId === "modal_crafting_level2_upgrade_code") {
        const account = requireAccount(interaction.user.id);
        const enteredCode = normalizeDigitsToAscii(String(interaction.fields.getTextInputValue("final_code") || "").trim());
        if (!account || account?.crafting?.level2Upgrade?.stage !== "puzzle_sent") {
          await interaction.reply({ content: "لا يوجد ملف تطوير مفتوح لك حاليًا.", ephemeral: true });
          return;
        }

        if (enteredCode !== getCraftingLevel2UpgradeFinalCode()) {
          await interaction.reply({ content: "الرقم غير صحيح. راجع القصة جيدًا ثم حاول مرة أخرى.", ephemeral: true });
          return;
        }

        const result = await finalizeCraftingLevel2UpgradeUnlock(interaction.user.id);
        if (!result.ok) {
          await interaction.reply({ content: "لا يوجد ملف تطوير مفتوح لك حاليًا.", ephemeral: true });
          return;
        }

        await interaction.reply({
          embeds: [buildCraftingLevel2UpgradeUnlockedEmbed()],
          ephemeral: true
        });
        return;
      }

      if (interaction.customId === "modal_crafting_level3_code") {
        const account = requireAccount(interaction.user.id);
        const enteredCode = normalizeDigitsToAscii(String(interaction.fields.getTextInputValue("final_code") || "").trim());
        if (!account || account?.crafting?.level3Quest?.stage !== "puzzle_sent") {
          await interaction.reply({ content: "لا يوجد ملف مستوى ثالث مفتوح لك حاليًا.", ephemeral: true });
          return;
        }

        if (enteredCode !== getCraftingLevel3FinalCode()) {
          await interaction.reply({ content: "الرمز غير صحيح. راجع المخطوطة جيدًا.", ephemeral: true });
          return;
        }

        const result = await finalizeCraftingLevel3Start(interaction.user.id);
        if (!result.ok) {
          await interaction.reply({ content: "لا يوجد ملف مستوى ثالث مفتوح لك حاليًا.", ephemeral: true });
          return;
        }

        await interaction.reply({
          embeds: [buildCraftingLevel3WaitingEmbed(result.waitingUntil)],
          ephemeral: true
        });
        return;
      }

      if (interaction.customId.startsWith("modal_activation:")) {
        const deferred = await safelyDeferReply(interaction, { ephemeral: true });
        if (!deferred) {
          return;
        }

        if (interaction.member?.roles?.cache?.has(ACTIVATION_ROLE_ID)) {
          await interaction.editReply({ content: "أنت مفعّل بالفعل داخل عرب وورلد." });
          return;
        }

        const requestId = interaction.customId.split(":")[1];
        const fullName = interaction.fields.getTextInputValue("full_name").trim();
        const age = interaction.fields.getTextInputValue("age").trim();
        const robloxUsername = interaction.fields.getTextInputValue("roblox_username").trim();
        const pledge = interaction.fields.getTextInputValue("pledge").trim();

        if (!fullName || !age || !robloxUsername || !pledge) {
          await interaction.editReply({ content: "يرجى تعبئة جميع الحقول المطلوبة." });
          return;
        }

        const robloxLookup = await fetchRobloxUserIdByUsername(robloxUsername);
        const avatarUrl = robloxLookup?.ok ? robloxLookup.avatarUrl || "" : "";
        const normalizedRequest = {
          applicantUserId: interaction.user.id,
          fullName,
          age,
          robloxUsername: robloxLookup?.ok ? robloxLookup.username || robloxUsername : robloxUsername,
          robloxUserId: robloxLookup?.ok ? robloxLookup.robloxUserId || "" : "",
          pledge,
          avatarUrl
        };

        pendingActivationDrafts.set(requestId, normalizedRequest);

        await interaction.editReply({
          embeds: [buildActivationConfirmEmbed({
            request: normalizedRequest,
            avatarUrl
          })],
          components: [createActivationConfirmButtons(requestId)],
        });
        return;
      }

      if (interaction.customId.startsWith("modal_project_staff:")) {
        const [, projectKey, messageId] = interaction.customId.split(":");
        const definition = getProjectDefinition(projectKey);
        const project = ensureProjectState(projectKey);

        await interaction.deferReply({ ephemeral: true }).catch(() => null);

        if (!definition || !project) {
          await interaction.editReply({ content: "المشروع غير معروف." });
          return;
        }

        if (!canUseProjectAction(interaction.member, project, "staff_manage")) {
          await interaction.editReply({ content: "لا تملك صلاحية إدارة هذا المشروع." });
          return;
        }

        const rawTarget = interaction.fields.getTextInputValue("target").trim();
        const rawJobType = interaction.fields.getTextInputValue("job_type").trim().toLowerCase();
        const rawActionType = interaction.fields.getTextInputValue("action_type").trim().toLowerCase();

        let targetUser = await resolveUser(rawTarget);
        if (!targetUser) {
          const targetAccountByNumber = findAccountByAccountNumber(rawTarget);
          if (targetAccountByNumber) {
            targetUser = await client.users.fetch(targetAccountByNumber.discordUserId).catch(() => null);
          }
        }
        if (!targetUser) {
          const targetAccountByName = findAccountByName(rawTarget);
          if (targetAccountByName) {
            targetUser = await client.users.fetch(targetAccountByName.discordUserId).catch(() => null);
          }
        }

        if (!targetUser) {
          await interaction.editReply({ content: "تعذر العثور على الشخص المطلوب." });
          return;
        }

        const collectionKey = rawJobType.includes("شريك")
          ? "partners"
          : rawJobType.includes("اداري") || rawJobType.includes("إداري")
            ? "admins"
            : rawJobType.includes("موظف")
              ? "employees"
              : null;
        if (!collectionKey) {
          await interaction.editReply({ content: "اكتب الوظيفة بهذا الشكل: إداري أو موظف أو شريك." });
          return;
        }

        const actionType = rawActionType.includes("فصل") ? "remove" : rawActionType.includes("توظيف") ? "add" : null;
        if (!actionType) {
          await interaction.editReply({ content: "اكتب نوع العملية بهذا الشكل: توظيف أو فصل." });
          return;
        }

        const roleLabel = collectionKey === "partners" ? "شريك" : collectionKey === "admins" ? "إداري" : "موظف";
        const actionLabel = actionType === "add" ? "توظيف" : "فصل";
        const alreadyExists = Array.isArray(project[collectionKey]) && project[collectionKey].includes(targetUser.id);

        if (actionType === "add" && alreadyExists) {
          await interaction.editReply({ content: `هذا الشخص مسجل بالفعل كـ ${roleLabel} في المشروع.` });
          return;
        }

        if (actionType === "remove" && !alreadyExists) {
          await interaction.editReply({ content: `هذا الشخص ليس مسجلًا كـ ${roleLabel} في المشروع.` });
          return;
        }

        const updatedProject = upsertProject(projectKey, (current) => {
          const currentList = Array.isArray(current[collectionKey]) ? [...current[collectionKey]] : [];
          const nextList = actionType === "add"
            ? [...currentList, targetUser.id]
            : currentList.filter((id) => id !== targetUser.id);

          const cleanedAdmins = Array.isArray(current.admins) ? current.admins.filter((id) => id !== targetUser.id) : [];
          const cleanedEmployees = Array.isArray(current.employees) ? current.employees.filter((id) => id !== targetUser.id) : [];
          const cleanedPartners = Array.isArray(current.partners) ? current.partners.filter((id) => id !== targetUser.id) : [];

          return {
            ...current,
            admins: collectionKey === "admins" && actionType === "add" ? [...new Set(nextList)] : cleanedAdmins,
            employees: collectionKey === "employees" && actionType === "add" ? [...new Set(nextList)] : cleanedEmployees,
            partners: collectionKey === "partners" && actionType === "add" ? [...new Set(nextList)] : cleanedPartners,
            [collectionKey]: [...new Set(nextList)]
          };
        });

        appendProjectTransaction({
          projectKey,
          type: actionType === "add" ? "project_staff_add" : "project_staff_remove",
          label: `${actionLabel} ${roleLabel}`,
          amount: 0,
          direction: "none",
          actorUserId: interaction.user.id,
          targetUserId: targetUser.id,
          note: `${actionLabel} ${roleLabel} ${targetUser.id}`,
          balanceAfter: updatedProject.budget
        });

        await refreshProjectPanelMessage(interaction.channel, messageId, projectKey);
        await sendPoliceBankLog({
          title: actionType === "add" ? "👥✨ **توظيف داخل مشروع**" : "🚪👥 **فصل من مشروع**",
          description: actionType === "add"
            ? "**تمت إضافة عضو إلى طاقم المشروع بنجاح.**"
            : "**تمت إزالة عضو من طاقم المشروع بنجاح.**",
          fields: [
            { name: "🏢 **المشروع**", value: `**${updatedProject.name || definition.title}**`, inline: true },
            { name: "👤 **الشخص**", value: `**<@${targetUser.id}>**`, inline: true },
            { name: "🧾 **النوع**", value: `**${roleLabel}**`, inline: true },
            { name: "🛠️ **العملية**", value: `**${actionLabel}**`, inline: true },
            { name: "🧑‍⚖️ **المنفذ**", value: `**<@${interaction.user.id}>**`, inline: true },
            { name: "📋 **الحالة الحالية**", value: `**الموظفون:** ${updatedProject.employees?.length || 0} • **الشركاء:** ${updatedProject.partners?.length || 0}`, inline: false }
          ]
        });

        await targetUser.send({
          embeds: [
            new EmbedBuilder()
              .setColor(0x0b1f3a)
              .setTitle(actionType === "add" ? "💼✨ إشعار انضمام إلى مشروع" : "🚪✨ إشعار فصل من مشروع")
              .setDescription(actionType === "add"
                ? "**تمت إضافتك إلى هذا المشروع بنجاح، وتم حفظ بياناتك ضمن طاقم المشروع.**"
                : "**تمت إزالتك من هذا المشروع، ولم تعد ضمن طاقم الإدارة أو التشغيل.**")
              .addFields(
                { name: "🏢 المشروع", value: `**${updatedProject.name || definition.title}**`, inline: true },
                { name: "🧾 الصفة", value: `**${roleLabel}**`, inline: true },
                { name: "🧑‍⚖️ بواسطة", value: `**<@${interaction.user.id}>**`, inline: true },
                {
                  name: "✨ الصلاحيات",
                  value: actionType === "add"
                    ? roleLabel === "شريك"
                      ? "**تملك جميع صلاحيات المشروع بالكامل.**"
                      : roleLabel === "إداري"
                        ? "**تستطيع توظيف وفصل طاقم المشروع فقط.**"
                        : "**أنت موظف داخل المشروع بدون صلاحيات إدارة.**"
                    : "**تم سحب جميع صلاحياتك المرتبطة بهذا المشروع.**",
                  inline: false
                }
              )
              .setFooter({ text: "Arab World • إدارة المشاريع الفاخرة" })
              .setTimestamp()
          ]
        }).catch(() => null);

        await interaction.editReply({
          embeds: [
            new EmbedBuilder()
              .setColor(0x0b1f3a)
              .setTitle(actionType === "add" ? "💼✨ تمت عملية التوظيف" : "🚪✨ تمت عملية الفصل")
              .setDescription("**تم تحديث طاقم المشروع بنجاح، وتم تحديث اللوحة مباشرة مع حفظ البيانات في النظام.**")
              .addFields(
                { name: "🏢 المشروع", value: `**${updatedProject.name || definition.title}**`, inline: true },
                { name: "👤 الشخص", value: `**<@${targetUser.id}>**`, inline: true },
                { name: "🧾 الوظيفة", value: `**${roleLabel}**`, inline: true },
                { name: "🛡️ الإداريون الآن", value: `**${updatedProject.admins?.length || 0}**`, inline: true },
                { name: "📋 الموظفون الآن", value: `**${updatedProject.employees?.length || 0}**`, inline: true },
                { name: "🤝 الشركاء الآن", value: `**${updatedProject.partners?.length || 0}**`, inline: true },
                { name: "🛠️ العملية", value: `**${actionLabel}**`, inline: true }
              )
              .setFooter({ text: "Arab World • طاقم المشاريع الفاخر" })
              .setTimestamp()
          ]
        });
        return;
      }

      if (interaction.customId.startsWith("modal_project_transfer_owner:")) {
        const [, projectKey, messageId] = interaction.customId.split(":");
        const definition = getProjectDefinition(projectKey);
        const project = ensureProjectState(projectKey);

        if (!definition || !project) {
          await interaction.reply({ content: "المشروع غير معروف.", ephemeral: true });
          return;
        }

        if (!canUseProjectAction(interaction.member, project, "transfer_owner")) {
          await interaction.reply({ content: "لا تملك صلاحية نقل ملكية هذا المشروع.", ephemeral: true });
          return;
        }

        const rawTarget = interaction.fields.getTextInputValue("target").trim();
        let targetUser = await resolveUser(rawTarget);
        if (!targetUser) {
          const targetAccountByNumber = findAccountByAccountNumber(rawTarget);
          if (targetAccountByNumber) {
            targetUser = await client.users.fetch(targetAccountByNumber.discordUserId).catch(() => null);
          }
        }
        if (!targetUser) {
          const targetAccountByName = findAccountByName(rawTarget);
          if (targetAccountByName) {
            targetUser = await client.users.fetch(targetAccountByName.discordUserId).catch(() => null);
          }
        }

        if (!targetUser) {
          await interaction.reply({ content: "تعذر العثور على الشخص المطلوب.", ephemeral: true });
          return;
        }

        const targetAccount = getAccount(targetUser.id);
        if (!targetAccount) {
          await interaction.reply({ content: "هذا الشخص لا يملك حسابًا بنكيًا.", ephemeral: true });
          return;
        }

        const previousOwnerId = project.ownerUserId;
        const updatedProject = upsertProject(projectKey, (current) => ({
          ...current,
          ownerUserId: targetUser.id,
          ownerName: targetAccount.name || targetUser.username,
          admins: (Array.isArray(current.admins) ? current.admins : [])
            .filter((userId) => userId && userId !== previousOwnerId && userId !== targetUser.id),
          employees: (Array.isArray(current.employees) ? current.employees : [])
            .filter((userId) => userId && userId !== previousOwnerId && userId !== targetUser.id),
          partners: (Array.isArray(current.partners) ? current.partners : [])
            .filter((userId) => userId && userId !== previousOwnerId && userId !== targetUser.id)
        }));

        appendProjectTransaction({
          projectKey,
          type: "transfer_project_owner",
          label: "نقل ملكية المشروع",
          amount: 0,
          direction: "none",
          actorUserId: interaction.user.id,
          targetUserId: targetUser.id,
          note: `تم نقل الملكية من ${previousOwnerId || "غير محدد"} إلى ${targetUser.id}`,
          balanceAfter: updatedProject.budget
        });

        await refreshProjectPanelMessage(interaction.channel, messageId, projectKey);
        await sendPoliceBankLog({
          title: "👑 **نقل ملكية مشروع**",
          description: "**تم نقل ملكية المشروع إلى مالك جديد بنجاح.**",
          fields: [
            { name: "🏢 **المشروع**", value: `**${updatedProject.name || definition.title}**`, inline: true },
            { name: "👤 **المالك السابق**", value: previousOwnerId ? `**<@${previousOwnerId}>**` : "**غير محدد**", inline: true },
            { name: "👑 **المالك الجديد**", value: `**<@${targetUser.id}>**`, inline: true },
            { name: "🧑‍⚖️ **بواسطة**", value: `**<@${interaction.user.id}>**`, inline: true }
          ]
        });

        await targetUser.send({
          embeds: [
            new EmbedBuilder()
              .setColor(definition.color)
              .setTitle("👑✨ تم نقل ملكية مشروع لك")
              .setDescription("**أصبحت الآن المالك الرسمي لهذا المشروع.**")
              .addFields(
                { name: "🏢 المشروع", value: `**${updatedProject.name || definition.title}**`, inline: true },
                { name: "🧑‍⚖️ بواسطة", value: `**<@${interaction.user.id}>**`, inline: true },
                { name: "💰 الميزانية الحالية", value: `**${formatProjectCurrency(updatedProject.budget)}**`, inline: true }
              )
              .setFooter({ text: "Arab World • ملكية المشاريع" })
              .setTimestamp()
          ]
        }).catch(() => null);

        await interaction.reply({
          embeds: [
            new EmbedBuilder()
              .setColor(definition.color)
              .setTitle("👑✨ تمت عملية نقل الملكية")
              .setDescription("**تم تحديث مالك المشروع وحفظه في النظام.**")
              .addFields(
                { name: "🏢 المشروع", value: `**${updatedProject.name || definition.title}**`, inline: true },
                { name: "👤 المالك السابق", value: previousOwnerId ? `**<@${previousOwnerId}>**` : "**غير محدد**", inline: true },
                { name: "👑 المالك الجديد", value: `**<@${targetUser.id}>**`, inline: true }
              )
              .setFooter({ text: "Arab World • نقل ملكية المشاريع" })
              .setTimestamp()
          ],
          ephemeral: true
        });
        return;
      }

      if (interaction.customId.startsWith("modal_project_budget:")) {
        const [, projectKey, action, messageId] = interaction.customId.split(":");
        const amount = parseWholeNumberInput(interaction.fields.getTextInputValue("amount"));
        const definition = getProjectDefinition(projectKey);
        const project = ensureProjectState(projectKey);
        const account = requireAccount(interaction.user.id);

        if (!definition || !project) {
          await interaction.reply({ content: "المشروع غير معروف.", ephemeral: true });
          return;
        }

        if (!canManageProjectRecord(interaction.member, project)) {
          await interaction.reply({ content: "لا تملك صلاحية إدارة هذا المشروع.", ephemeral: true });
          return;
        }

        if (!account) {
          await interaction.reply({ content: "لا يوجد لديك حساب بنكي.", ephemeral: true });
          return;
        }

        if (!Number.isFinite(amount) || amount <= 0) {
          await interaction.reply({ content: "المبلغ غير صالح.", ephemeral: true });
          return;
        }

        if (action === "deposit") {
          if (account.balance < amount) {
            await interaction.reply({ content: "رصيدك الشخصي لا يكفي لهذه العملية.", ephemeral: true });
            return;
          }

          const beforePersonal = account.balance;
          updateAccount(interaction.user.id, (current) => {
            current.balance -= amount;
            return current;
          });

          const result = applyProjectMoneyMutation(projectKey, amount, "manual_add", interaction.user.id, "إيداع من الحساب الشخصي");
          if (!result.ok) {
            updateAccount(interaction.user.id, (current) => {
              current.balance += amount;
              return current;
            });
            await interaction.reply({ content: "تعذر إتمام العملية، حاول مرة أخرى.", ephemeral: true });
            return;
          }

          const updatedAccount = getAccount(interaction.user.id);
          appendTransaction({
            discordUserId: interaction.user.id,
            robloxUsername: updatedAccount?.robloxUsername,
            type: "project_budget_deposit",
            amount,
            direction: "debit",
            balanceAfter: updatedAccount?.balance ?? 0,
            metadata: {
              projectKey,
              projectName: result.project.name || definition.title
            }
          });

          await refreshProjectPanelMessage(interaction.channel, messageId, projectKey);
          await sendPoliceBankLog({
            title: "🏢💸 **إيداع في ميزانية مشروع**",
            description: "**تم إيداع مبلغ من الحساب الشخصي إلى ميزانية المشروع بنجاح.**",
            fields: [
              { name: "👤 **المنفذ**", value: `**<@${interaction.user.id}>**`, inline: true },
              { name: "🏢 **المشروع**", value: `**${result.project.name || definition.title}**`, inline: true },
              { name: "💵 **المبلغ**", value: `**${formatCurrency(amount)}**`, inline: true },
              { name: "💳 **رصيدك قبل**", value: `**${formatCurrency(beforePersonal)}**`, inline: true },
              { name: "💳 **رصيدك بعد**", value: `**${formatCurrency(updatedAccount?.balance ?? 0)}**`, inline: true },
              { name: "📦 **ميزانية المشروع الآن**", value: `**${formatProjectCurrency(result.project.budget)}**`, inline: true }
            ]
          });

          await interaction.reply({
            embeds: [
              new EmbedBuilder()
                .setColor(definition.color)
                .setTitle("🏢✨ تم الإيداع في ميزانية المشروع")
                .setDescription("**تمت إضافة المبلغ إلى ميزانية المشروع وتحديث اللوحة مباشرة.**")
                .addFields(
                  { name: "🏢 المشروع", value: `**${result.project.name || definition.title}**`, inline: true },
                  { name: "💵 المبلغ", value: `**${formatCurrency(amount)}**`, inline: true },
                  { name: "💳 رصيدك الحالي", value: `**${formatCurrency(updatedAccount?.balance ?? 0)}**`, inline: true },
                  { name: "📦 ميزانية المشروع", value: `**${formatProjectCurrency(result.project.budget)}**`, inline: true }
                )
                .setFooter({ text: "Arab World • ميزانيات المشاريع" })
                .setTimestamp()
            ],
            ephemeral: true
          });
          return;
        }

        const result = applyProjectMoneyMutation(projectKey, amount, "manual_remove", interaction.user.id, "سحب إلى الحساب الشخصي");
        if (!result.ok) {
          await interaction.reply({ content: "ميزانية المشروع لا تكفي لهذا السحب.", ephemeral: true });
          return;
        }

        const beforePersonal = account.balance;
        const updatedAccount = updateAccount(interaction.user.id, (current) => {
          current.balance += amount;
          return current;
        });

        appendTransaction({
          discordUserId: interaction.user.id,
          robloxUsername: updatedAccount?.robloxUsername,
          type: "project_budget_withdraw",
          amount,
          direction: "credit",
          balanceAfter: updatedAccount?.balance ?? 0,
          metadata: {
            projectKey,
            projectName: result.project.name || definition.title
          }
        });

        await refreshProjectPanelMessage(interaction.channel, messageId, projectKey);
        await sendPoliceBankLog({
          title: "🏢🏦 **سحب من ميزانية مشروع**",
          description: "**تم سحب مبلغ من ميزانية المشروع إلى الحساب الشخصي بنجاح.**",
          fields: [
            { name: "👤 **المنفذ**", value: `**<@${interaction.user.id}>**`, inline: true },
            { name: "🏢 **المشروع**", value: `**${result.project.name || definition.title}**`, inline: true },
            { name: "💵 **المبلغ**", value: `**${formatCurrency(amount)}**`, inline: true },
            { name: "💳 **رصيدك قبل**", value: `**${formatCurrency(beforePersonal)}**`, inline: true },
            { name: "💳 **رصيدك بعد**", value: `**${formatCurrency(updatedAccount?.balance ?? 0)}**`, inline: true },
            { name: "📦 **ميزانية المشروع الآن**", value: `**${formatProjectCurrency(result.project.budget)}**`, inline: true }
          ]
        });

        await interaction.reply({
          embeds: [
            new EmbedBuilder()
              .setColor(definition.color)
              .setTitle("🏦✨ تم السحب من ميزانية المشروع")
              .setDescription("**تم تحويل المبلغ إلى حسابك الشخصي وتحديث اللوحة مباشرة.**")
              .addFields(
                { name: "🏢 المشروع", value: `**${result.project.name || definition.title}**`, inline: true },
                { name: "💵 المبلغ", value: `**${formatCurrency(amount)}**`, inline: true },
                { name: "💳 رصيدك الحالي", value: `**${formatCurrency(updatedAccount?.balance ?? 0)}**`, inline: true },
                { name: "📦 ميزانية المشروع", value: `**${formatProjectCurrency(result.project.budget)}**`, inline: true }
              )
              .setFooter({ text: "Arab World • ميزانيات المشاريع" })
              .setTimestamp()
          ],
          ephemeral: true
        });
        return;
      }

      if (interaction.customId.startsWith("modal_budget_amount:")) {
        const [, budgetKey, action] = interaction.customId.split(":");
        const amount = parseWholeNumberInput(interaction.fields.getTextInputValue("budget_amount"));
        const account = requireAccount(interaction.user.id);

        if (!account) {
          await interaction.reply({ content: "لا يوجد لديك حساب بنكي.", ephemeral: true });
          return;
        }

        if (!Number.isFinite(amount) || amount <= 0) {
          await interaction.reply({ content: "المبلغ غير صالح.", ephemeral: true });
          return;
        }

        if (action === "deposit") {
          if (!canManageBudget(interaction.member, budgetKey, "deposit")) {
            await interaction.reply({ content: `هذه العملية متاحة فقط لمن يملك الرتبة <@&${getBudgetDefinition(budgetKey)?.managerRoleId}>.`, ephemeral: true });
            return;
          }

          if (account.balance < amount) {
            await interaction.reply({ content: "رصيدك الشخصي أقل من المبلغ المطلوب.", ephemeral: true });
            return;
          }

          if (budgetKey === BUDGET_KEYS.jus) {
            pendingBudgetDrafts.set(interaction.user.id, {
              budgetKey,
              type: "jus_finance_action",
              action,
              amount
            });

            await interaction.reply({
              embeds: [
                buildBudgetPurchaseDraftEmbed({
                  definition: getBudgetDefinition(budgetKey),
                  title: "⚖️ تأكيد إيداع للعدل",
                  description: "**هذه العملية حساسة وتحتاج اعتمادًا نهائيًا.**",
                  totalPrice: amount,
                  lines: [`• إيداع من رصيدك الشخصي إلى الميزانية: ${formatBudgetCurrency(amount)}`]
                })
              ],
              components: [
                buildBudgetConfirmButtons(
                  `budget_confirm:${budgetKey}:jus_finance_action`,
                  `budget_cancel:${budgetKey}:jus_finance_action`
                )
              ],
              ephemeral: true
            });
            return;
          }

          updateAccount(interaction.user.id, (current) => {
            current.balance -= amount;
            return current;
          });

          applyBudgetTransaction({
            budgetKey,
            type: "deposit",
            amount,
            actorUserId: interaction.user.id,
            label: "إيداع في الميزانية",
            note: `إيداع من الحساب الشخصي`
          });

          await finalizeBudgetMutationResponse(
            interaction,
            budgetKey,
            `✅ تم إيداع **${formatBudgetCurrency(amount)}** في **${getBudgetLabel(budgetKey)}**.`
          );
          return;
        }

        if (!canManageBudget(interaction.member, budgetKey, "withdraw")) {
          await interaction.reply({ content: `هذه العملية متاحة فقط لمن يملك الرتبة <@&${getBudgetDefinition(budgetKey)?.managerRoleId}>.`, ephemeral: true });
          return;
        }

        if (budgetKey === BUDGET_KEYS.jus) {
          pendingBudgetDrafts.set(interaction.user.id, {
            budgetKey,
            type: "jus_finance_action",
            action,
            amount
          });

          await interaction.reply({
            embeds: [
              buildBudgetPurchaseDraftEmbed({
                definition: getBudgetDefinition(budgetKey),
                title: "⚖️ تأكيد سحب من العدل",
                description: "**هذه العملية حساسة وتحتاج اعتمادًا نهائيًا.**",
                totalPrice: amount,
                lines: [`• سحب من الميزانية إلى رصيدك الشخصي: ${formatBudgetCurrency(amount)}`]
              })
            ],
            components: [
              buildBudgetConfirmButtons(
                `budget_confirm:${budgetKey}:jus_finance_action`,
                `budget_cancel:${budgetKey}:jus_finance_action`
              )
            ],
            ephemeral: true
          });
          return;
        }

        const budgetResult = applyBudgetTransaction({
          budgetKey,
          type: "withdraw",
          amount,
          actorUserId: interaction.user.id,
          label: "سحب من الميزانية",
          note: "تحويل إلى الحساب الشخصي"
        });

        if (!budgetResult.ok) {
          await interaction.reply({ content: "رصيد الميزانية لا يكفي.", ephemeral: true });
          return;
        }

        updateAccount(interaction.user.id, (current) => {
          current.balance += amount;
          return current;
        });

        await finalizeBudgetMutationResponse(
          interaction,
          budgetKey,
          `✅ تم سحب **${formatBudgetCurrency(amount)}** من **${getBudgetLabel(budgetKey)}** إلى حسابك الشخصي.`
        );
        return;
      }

      if (interaction.customId.startsWith("modal_budget_transfer:")) {
        const [, budgetKey] = interaction.customId.split(":");
        if (!canManageBudget(interaction.member, budgetKey, "transfer")) {
          await interaction.reply({ content: `هذه العملية متاحة فقط لمن يملك الرتبة <@&${getBudgetDefinition(budgetKey)?.managerRoleId}>.`, ephemeral: true });
          return;
        }

        const targetUser = await resolveUser(interaction.fields.getTextInputValue("target_user"));
        const amount = parseWholeNumberInput(interaction.fields.getTextInputValue("transfer_amount"));

        if (!targetUser) {
          await interaction.reply({ content: "الشخص غير موجود.", ephemeral: true });
          return;
        }

        if (!Number.isFinite(amount) || amount <= 0) {
          await interaction.reply({ content: "المبلغ غير صالح.", ephemeral: true });
          return;
        }

        const targetAccount = requireAccount(targetUser.id);
        if (!targetAccount) {
          await interaction.reply({ content: "الشخص لا يملك حسابًا بنكيًا.", ephemeral: true });
          return;
        }

        if (budgetKey === BUDGET_KEYS.jus) {
          pendingBudgetDrafts.set(interaction.user.id, {
            budgetKey,
            type: "jus_transfer_action",
            targetUserId: targetUser.id,
            amount
          });

          await interaction.reply({
            embeds: [
              buildBudgetPurchaseDraftEmbed({
                definition: getBudgetDefinition(budgetKey),
                title: "⚖️ تأكيد تحويل من العدل",
                description: "**هذه العملية حساسة وتحتاج اعتمادًا نهائيًا.**",
                totalPrice: amount,
                lines: [`• تحويل إلى ${targetUser}: ${formatBudgetCurrency(amount)}`]
              })
            ],
            components: [
              buildBudgetConfirmButtons(
                `budget_confirm:${budgetKey}:jus_transfer_action`,
                `budget_cancel:${budgetKey}:jus_transfer_action`
              )
            ],
            ephemeral: true
          });
          return;
        }

        const budgetResult = applyBudgetTransaction({
          budgetKey,
          type: "transfer",
          amount,
          actorUserId: interaction.user.id,
          targetUserId: targetUser.id,
          label: "تحويل من الميزانية",
          note: `تحويل إلى ${targetUser.id}`
        });

        if (!budgetResult.ok) {
          await interaction.reply({ content: "رصيد الميزانية لا يكفي.", ephemeral: true });
          return;
        }

        updateAccount(targetUser.id, (current) => {
          current.balance += amount;
          return current;
        });

        await finalizeBudgetMutationResponse(
          interaction,
          budgetKey,
          `✅ تم تحويل **${formatBudgetCurrency(amount)}** من **${getBudgetLabel(budgetKey)}** إلى ${targetUser}.`
        );
        return;
      }

      if (interaction.customId === "modal_car_sell") {
        const vehicleName = interaction.fields.getTextInputValue("vehicle_name").trim();
        const confirmWord = interaction.fields.getTextInputValue("confirm_word").trim();

        if (confirmWord !== "موافق") {
          await interaction.reply({ content: "يجب كتابة كلمة موافق لإتمام بيع السيارة.", ephemeral: true });
          return;
        }

        const ownedCars = listOwnedVehicles(interaction.user.id);
        const carRecord = ownedCars.find((car) => normalizeVehicleName(car.name) === normalizeVehicleName(vehicleName));
        if (!carRecord) {
          await interaction.reply({ content: "هذه المركبة غير موجودة ضمن ممتلكاتك.", ephemeral: true });
          return;
        }

        if (String(carRecord.source || "") === "rental") {
          await interaction.reply({ content: "لا يمكنك بيع مركبة مؤجرة. انتظر حتى تنتهي مدة الإيجار.", ephemeral: true });
          return;
        }

        removeOwnedVehicle(interaction.user.id, carRecord.name);
        const latestOffer = getVehicleOffer(carRecord.name);
        const refundAmount = Math.floor((latestOffer.price > 0 ? latestOffer.price : carRecord.purchasePrice || 0) * 0.5);

        if (refundAmount > 0) {
          updateAccount(interaction.user.id, (current) => {
            current.balance += refundAmount;
            return current;
          });
        }

        const updatedAccount = getAccount(interaction.user.id);
        appendTransaction({
          discordUserId: interaction.user.id,
          robloxUsername: updatedAccount?.robloxUsername,
          type: "vehicle_sale",
          amount: refundAmount,
          direction: refundAmount > 0 ? "credit" : "none",
          balanceAfter: updatedAccount?.balance ?? 0,
          metadata: {
            vehicleName: carRecord.name
          }
        });

        await sendAuditLog(client, config.auditChannelId, {
          title: "💼 **بيع مركبة**",
          description: "**تم بيع مركبة وإرجاع 50% من قيمتها إلى الحساب البنكي.**",
          fields: [
            { name: "👤 **المالك**", value: `**<@${interaction.user.id}>**`, inline: true },
            buildBankAccountAuditField(updatedAccount),
            { name: "🚘 **المركبة**", value: `**${carRecord.name}**`, inline: true },
            { name: "💵 **المبلغ المسترد**", value: `**${formatCurrency(refundAmount)}**`, inline: true }
          ]
        });

        await interaction.reply({
          content: refundAmount > 0
            ? `تم بيع المركبة **${carRecord.name}** وإرجاع **${formatCurrency(refundAmount)}** إلى حسابك.`
            : `تم بيع المركبة **${carRecord.name}**، لكنها لا تحمل قيمة مستردة.`,
          ephemeral: true
        });
        return;
      }

      if (interaction.customId === "modal_mdt_add_fine") {
        const targetUser = await resolveUser(interaction.fields.getTextInputValue("target_user"));
        const amount = parseWholeNumberInput(interaction.fields.getTextInputValue("fine_amount"));
        if (!targetUser) {
          await interaction.reply({ content: "الشخص غير موجود. اكتب منشنه أو آيديه أو اسمه البنكي الكامل.", ephemeral: true });
          return;
        }

        if (!Number.isFinite(amount) || amount <= 0) {
          await interaction.reply({ content: "مبلغ المخالفة يجب أن يكون أرقامًا فقط.", ephemeral: true });
          return;
        }

        const fine = createFine({
          targetUserId: targetUser.id,
          targetName: targetUser.username,
          officerName: interaction.fields.getTextInputValue("officer_name"),
          issuerUserId: interaction.user.id,
          reason: interaction.fields.getTextInputValue("fine_reason"),
          violationType: interaction.fields.getTextInputValue("fine_type"),
          amount
        });

        await targetUser.send({ embeds: [buildFineDmEmbedPolished(fine)] }).catch(() => null);
        await sendAuditLog(client, config.auditChannelId, {
          title: "🚔 **إضافة مخالفة جديدة**",
          description: "**تمت إضافة مخالفة جديدة وإشعار المخالف بها.**",
          fields: [
            { name: "👮 **العسكري**", value: `**${fine.officerName}**`, inline: true },
            { name: "📨 **المخالف**", value: `**<@${fine.targetUserId}>**`, inline: true },
            { name: "🧾 **رقم المخالفة**", value: `**#${fine.fineId}**`, inline: true },
            { name: "💵 **المبلغ**", value: `**${fine.amount.toLocaleString("en-US")} ريال**`, inline: true }
          ]
        });
        await refreshActiveFinesViews(targetUser.id);
        await interaction.reply({ content: `تمت إضافة المخالفة #${fine.fineId} بنجاح.`, ephemeral: true });
        return;
      }

      if (interaction.customId === "modal_create_bank_account") {
        await interaction.deferReply({ ephemeral: true });

        const payload = {
          name: interaction.fields.getTextInputValue("bank_name"),
          age: interaction.fields.getTextInputValue("bank_age"),
          country: interaction.fields.getTextInputValue("bank_country"),
          robloxUsername: interaction.fields.getTextInputValue("bank_roblox_username"),
          info: interaction.fields.getTextInputValue("bank_info")
        };

        const pin = createPendingPin(interaction.user.id, payload);
        const dm = await interaction.user.createDM();
        await dm.send({ embeds: [buildPinDmEmbed(pin)] });

        await interaction.editReply({
          content: "تم إرسال الرقم السري إلى الخاص. اكتب الرقم عبر الزر أدناه لإكمال فتح الحساب.",
          components: [
            new ActionRowBuilder().addComponents(
              new ButtonBuilder()
                .setCustomId("bank_enter_pin")
                .setLabel("إدخال الرقم السري")
                .setStyle(ButtonStyle.Success)
            )
          ],
          ephemeral: true
        });
        return;
      }

      if (interaction.customId === "modal_confirm_bank_pin") {
        const deferred = await safelyDeferReply(interaction, { ephemeral: true });
        if (!deferred) {
          return;
        }

        const pending = getPendingPin(interaction.user.id);
        if (!pending) {
          await interaction.editReply({ content: "لا يوجد طلب إنشاء حساب معلق." });
          return;
        }

        const enteredPin = interaction.fields.getTextInputValue("bank_pin");
        if (pending.pin !== enteredPin) {
          await interaction.editReply({ content: "الرقم السري غير صحيح." });
          return;
        }

        const account = createAccount(interaction.user.id, pending);
        appendTransaction({
          discordUserId: interaction.user.id,
          robloxUsername: account.robloxUsername,
          type: "account_created",
          amount: account.balance,
          direction: "credit",
          balanceAfter: account.balance,
          metadata: {
            accountNumber: account.accountNumber
          }
        });
        await sendSystemLog(BANK_ACCOUNT_CREATIONS_LOG_CHANNEL_ID, {
          title: "🏦 **إنشاء حساب بنكي**",
          description: "**تم فتح حساب بنكي جديد داخل Arab World Bank.**",
          fields: [
            { name: "👤 **صاحب الحساب**", value: `**<@${interaction.user.id}>**`, inline: true },
            buildBankAccountAuditField(account),
            { name: "🎮 **يوزر روبلوكس**", value: `**${account.robloxUsername || "غير مسجل"}**`, inline: true },
            { name: "🆔 **رقم الحساب**", value: `**${account.accountNumber}**`, inline: true },
            { name: "🌍 **البلد**", value: `**${account.country}**`, inline: true },
            { name: "🎂 **العمر**", value: `**${account.age}**`, inline: true }
          ]
        });
        await sendPoliceBankLog({
          title: "🏦 **فتح حساب بنكي جديد لمواطن**",
          description: "**تم تسجيل فتح حساب بنكي جديد ضمن لوق الداخلية.**",
          fields: [
            { name: "👤 **صاحب الحساب**", value: `**<@${interaction.user.id}>**`, inline: true },
            buildBankAccountAuditField(account),
            { name: "🎮 **روبلوكس**", value: `**${account.robloxUsername || "غير مسجل"}**`, inline: true }
          ]
        });
        await interaction.editReply({
          content: `تم إنشاء حسابك البنكي بنجاح.\nرقم حسابك: ${account.accountNumber}`
        });
        return;
      }

      if (interaction.customId === "modal_bank_transfer") {
        const deferred = await safelyDeferReply(interaction, { ephemeral: true });
        if (!deferred) {
          return;
        }

        const senderAccount = requireAccount(interaction.user.id);
        if (!senderAccount) {
          await interaction.editReply({ content: "لا يوجد لديك حساب بنكي." });
          return;
        }
        if (!(await ensureBankServicesAvailable(interaction, senderAccount, "تحويل الرصيد"))) {
          return;
        }

        const rawTarget = interaction.fields.getTextInputValue("target_user");
        const amount = parseWholeNumberInput(interaction.fields.getTextInputValue("transfer_amount"));
        let targetUser = await resolveUser(rawTarget);

        if (!targetUser) {
          const targetAccountByName = findAccountByName(rawTarget);
          if (targetAccountByName?.discordUserId) {
            targetUser = await client.users.fetch(targetAccountByName.discordUserId).catch(() => null);
          }
        }

        if (!targetUser) {
          await interaction.editReply({ content: "حساب الشخص غير موجود." });
          return;
        }

        if (interaction.user.id === targetUser.id) {
          await interaction.editReply({ content: "لا يمكنك التحويل لنفسك." });
          return;
        }

        const transferPolicy = getMemberBankCardDefinition(interaction.member);
        if (!Number.isFinite(amount) || amount <= 0) {
          await interaction.editReply({ content: "المبلغ غير صالح." });
          return;
        }

        if (Number.isFinite(transferPolicy.limit) && amount > transferPolicy.limit) {
          await interaction.editReply({
            content: `الحد الأقصى المسموح لك بالتحويل هو **${transferPolicy.limitText}** حسب **${transferPolicy.label}**.`
          });
          return;
        }

        const targetAccount = requireAccount(targetUser.id);
        if (!targetAccount) {
          await interaction.editReply({ content: "حساب الشخص غير موجود." });
          return;
        }
        if (isAccountBankFrozen(targetAccount)) {
          await interaction.editReply({ content: "لا يمكن التحويل إلى هذا الحساب لأنه مجمّد." });
          return;
        }

        if (senderAccount.balance < amount) {
          await interaction.editReply({ content: "رصيدك أقل من المبلغ المطلوب." });
          return;
        }

        const transfer = createTransfer({
          fromUserId: interaction.user.id,
          toUserId: targetUser.id,
          amount
        });

        await interaction.editReply({
          embeds: [buildTransferConfirmationEmbedPolished(`<@${targetUser.id}>`, amount)],
          components: [buildTransferButtons(transfer.transferId)]
        });
        return;
      }

      if (interaction.customId === "modal_bank_pay_fine") {
        const account = requireAccount(interaction.user.id);
        if (account && !(await ensureBankServicesAvailable(interaction, account, "سداد المخالفات"))) {
          return;
        }
        const fine = getFine(interaction.fields.getTextInputValue("fine_id"));
        if (!fine || fine.targetUserId !== interaction.user.id) {
          await interaction.reply({ content: "المخالفة غير موجودة أو ليست لك.", ephemeral: true });
          return;
        }

        if (fine.status === "paid") {
          await interaction.reply({ content: "هذه المخالفة مسددة مسبقًا.", ephemeral: true });
          return;
        }

        await interaction.reply({
          embeds: [buildFinePaymentConfirmEmbed(fine)],
          components: [buildApproveRejectButtons("finepay", fine.fineId)],
          ephemeral: true
        });
        return;
      }

      if (interaction.customId === "modal_remove_hold_request") {
        const deferred = await safelyDeferReply(interaction, { ephemeral: true });
        if (!deferred) {
          return;
        }

        const request = createHoldRequest({
          userId: interaction.user.id,
          name: interaction.fields.getTextInputValue("request_name"),
          fineCount: interaction.fields.getTextInputValue("request_fine_count"),
          paidStatus: interaction.fields.getTextInputValue("request_paid_status")
        });

        const channel = await client.channels.fetch(config.serviceHoldRequestChannelId);
        await channel.send({
          embeds: [buildHoldRequestEmbedPolished({ member: interaction.member, fineCount: request.fineCount, paidStatus: request.paidStatus })],
          components: [buildHoldRequestButtons(request.requestId)]
        });

        await sendAuditLog(client, config.auditChannelId, {
          title: "🛡️ **طلب رفع إيقاف خدمات**",
          description: "**تم إرسال طلب جديد لرفع إيقاف الخدمات.**",
          fields: [
            { name: "👤 **العضو**", value: `**<@${interaction.user.id}>**`, inline: true },
            { name: "🚨 **عدد المخالفات**", value: `**${request.fineCount}**`, inline: true },
            { name: "💳 **حالة السداد**", value: `**${request.paidStatus}**`, inline: true }
          ]
        });

        await interaction.editReply({ content: "تم إرسال طلب رفع إيقاف الخدمات." });
        return;
      }

      if (interaction.customId === "modal_apply_hold") {
        if (!canManageMdtHold(interaction.member)) {
          await interaction.reply({ content: `هذا الإجراء متاح فقط لمن يملك الرتبة <@&${config.mdtHoldAccessRoleId}>.`, ephemeral: true });
          return;
        }

        const targetUser = await resolveAdministrativeTargetUser(interaction.fields.getTextInputValue("hold_target"));
        if (!targetUser) {
          await interaction.reply({ content: "اكتب منشن الشخص أو آيدي الديسكورد أو رقم الحساب فقط.", ephemeral: true });
          return;
        }

        const result = await applyManualServiceHold({
          guild: interaction.guild,
          actorUserId: interaction.user.id,
          targetUserId: targetUser.id,
          sourceAction: "modal_apply_hold"
        });

        if (!result.ok) {
          await interaction.reply({
            content: result.error === "service_hold_already_applied"
              ? "إيقاف الخدمات مطبق بالفعل على هذا الشخص."
              : "تعذر تطبيق إيقاف الخدمات على هذا الشخص.",
            ephemeral: true
          });
          return;
        }

        await result.member.send({
          embeds: [buildServiceHoldAppliedEmbed()]
        }).catch(() => null);
        await sendAuditLog(client, config.auditChannelId, {
          title: "⛔ **تطبيق إيقاف خدمات**",
          description: "**تم تطبيق إيقاف خدمات على عضو وتسجيل العملية.**",
          fields: [
            { name: "👤 **العضو**", value: `**<@${targetUser.id}>**`, inline: true },
            { name: "🧑‍⚖️ **بواسطة**", value: `**<@${interaction.user.id}>**`, inline: true },
            { name: "🪪 **الرتبة**", value: `**${config.serviceHoldRoleId}**`, inline: true }
          ]
        });
        await interaction.reply({ content: `تم تطبيق إيقاف الخدمات على ${targetUser}.`, ephemeral: true });
        return;
      }

      if (interaction.customId === "modal_admin_remove_hold") {
        if (!canManageMdtHold(interaction.member)) {
          await interaction.reply({ content: `هذا الإجراء متاح فقط لمن يملك الرتبة <@&${config.mdtHoldAccessRoleId}>.`, ephemeral: true });
          return;
        }

        const targetUser = await resolveAdministrativeTargetUser(interaction.fields.getTextInputValue("hold_target"));
        if (!targetUser) {
          await interaction.reply({ content: "اكتب منشن الشخص أو آيدي الديسكورد أو رقم الحساب فقط.", ephemeral: true });
          return;
        }

        const result = await removeManualServiceHold({
          guild: interaction.guild,
          actorUserId: interaction.user.id,
          targetUserId: targetUser.id,
          sourceAction: "modal_admin_remove_hold"
        });

        if (!result.ok) {
          await interaction.reply({
            content: result.error === "service_hold_not_applied"
              ? "هذا الشخص لا يملك إيقاف خدمات أصلًا."
              : "تعذر رفع إيقاف الخدمات عن هذا الشخص.",
            ephemeral: true
          });
          return;
        }

        await result.member.send({
          embeds: [buildServiceHoldDecisionEmbedPolished({ approved: true })]
        }).catch(() => null);
        await sendAuditLog(client, config.auditChannelId, {
          title: "🛡️ **رفع إيقاف خدمات يدويًا**",
          description: "**تم رفع إيقاف الخدمات يدويًا من خلال لوحة MDT.**",
          fields: [
            { name: "👤 **العضو**", value: `**<@${targetUser.id}>**`, inline: true },
            { name: "🧑‍⚖️ **بواسطة**", value: `**<@${interaction.user.id}>**`, inline: true }
          ]
        });
        await interaction.reply({ content: `تم رفع إيقاف الخدمات عن ${targetUser}.`, ephemeral: true });
        return;
      }

      if (interaction.customId === "modal_remove_fine_lookup") {
        const targetUser = await resolveUser(interaction.fields.getTextInputValue("fine_lookup_target"));
        if (!targetUser) {
          await interaction.reply({ content: "الشخص غير موجود.", ephemeral: true });
          return;
        }

        const fines = getFinesForUser(targetUser.id).filter((fine) => fine.status !== "paid");
        if (!fines.length) {
          await interaction.reply({ content: "لا توجد مخالفات غير مسددة لهذا الشخص.", ephemeral: true });
          return;
        }

        await interaction.reply({
          content: `مخالفات ${targetUser}:`,
          components: [buildFineSelectMenu(fines)],
          ephemeral: true
        });
        return;
      }

      if (interaction.customId === "modal_bank_loan") {
        const deferred = await safelyDeferReply(interaction, { ephemeral: true });
        if (!deferred) {
          return;
        }

        const account = requireAccount(interaction.user.id);
        if (!account) {
          await interaction.editReply({ content: "لا يوجد لديك حساب بنكي." });
          return;
        }
        if (!(await ensureBankServicesAvailable(interaction, account, "طلب القرض"))) {
          return;
        }

        const loanName = interaction.fields.getTextInputValue("loan_name");
        const accountNumber = interaction.fields.getTextInputValue("loan_account_number");
        const amount = parseWholeNumberInput(interaction.fields.getTextInputValue("loan_amount"));

        if (account.accountNumber !== accountNumber) {
          await interaction.editReply({ content: "رقم الحساب البنكي غير مطابق." });
          return;
        }

        if (!Number.isFinite(amount) || amount <= 0) {
          await interaction.editReply({ content: "مبلغ القرض غير صالح." });
          return;
        }

        const loanId = `${interaction.user.id}_${Date.now()}`;
        const channel = await client.channels.fetch(config.loanChannelId);
        await channel.send({
          embeds: [buildLoanEmbedPolished({ member: interaction.member, account: { ...account, name: loanName }, amount })],
          components: [buildLoanButtons(loanId)]
        });

        await sendAuditLog(client, config.auditChannelId, {
          title: "🧾 **طلب قرض جديد**",
          description: "**تم إرسال طلب قرض جديد إلى إدارة البنك للمراجعة.**",
          fields: [
            { name: "👤 **صاحب الطلب**", value: `**<@${interaction.user.id}>**`, inline: true },
            buildBankAccountAuditField(account),
            { name: "🎮 **يوزر روبلوكس**", value: `**${account.robloxUsername || "غير مسجل"}**`, inline: true },
            { name: "🆔 **رقم الحساب**", value: `**${account.accountNumber}**`, inline: true },
            { name: "💵 **مبلغ القرض**", value: `**${amount.toLocaleString("en-US")} ريال**`, inline: true }
          ]
        });

        await interaction.editReply({ content: "تم إرسال طلب القرض إلى الإدارة." });
        return;
      }

      if (interaction.customId === "modal_police_bank_withdraw") {
        if (!(await ensurePoliceBankPermission(interaction))) {
          return;
        }

        const targetUser = await resolveAdministrativeTargetUser(interaction.fields.getTextInputValue("target_user"));
        const amount = parseWholeNumberInput(interaction.fields.getTextInputValue("amount"));
        const reason = interaction.fields.getTextInputValue("reason");
        if (!targetUser) {
          await interaction.reply({ content: "اكتب منشن الشخص أو آيدي الديسكورد أو رقم الحساب فقط.", ephemeral: true });
          return;
        }
        if (targetUser.id === interaction.user.id) {
          await interaction.reply({ content: "لا يمكنك تنفيذ السحب الحكومي على حسابك الشخصي.", ephemeral: true });
          return;
        }
        if (!Number.isFinite(amount) || amount <= 0) {
          await interaction.reply({ content: "المبلغ غير صالح.", ephemeral: true });
          return;
        }
        const account = getAccount(targetUser.id);
        if (!account) {
          await interaction.reply({ content: "هذا الشخص لا يملك حسابًا بنكيًا.", ephemeral: true });
          return;
        }
        if (account.balance < amount) {
          await interaction.reply({ content: "رصيد الشخص أقل من المبلغ المطلوب.", ephemeral: true });
          return;
        }

        const beforeBalance = Number(account.balance || 0);
        const updated = updateAccount(targetUser.id, (current) => {
          current.balance -= amount;
          return current;
        });

        appendTransaction({
          discordUserId: targetUser.id,
          robloxUsername: updated.robloxUsername,
          type: "government_withdrawal",
          amount,
          direction: "debit",
          balanceAfter: updated.balance,
          metadata: {
            actorId: interaction.user.id,
            reason
          }
        });

        applyBudgetTransaction({
          budgetKey: BUDGET_KEYS.state,
          type: "deposit",
          amount,
          actorUserId: interaction.user.id,
          targetUserId: targetUser.id,
          label: "إيداع حكومي من سحب مواطن",
          note: reason
        });

        await sendPoliceBankLog({
          title: "💸 **سحب حكومي من حساب مواطن**",
          description: "**تم خصم مبلغ من حساب أحد المواطنين من قبل الداخلية.**",
          fields: [
            { name: "🧑‍⚖️ **المنفذ**", value: `**<@${interaction.user.id}>**`, inline: true },
            ...buildPoliceBankTargetAuditFields(updated, targetUser.id),
            { name: "💵 **الرصيد قبل السحب**", value: `**${formatCurrency(beforeBalance)}**`, inline: true },
            { name: "💵 **المبلغ المسحوب**", value: `**${formatCurrency(amount)}**`, inline: true },
            { name: "💳 **الرصيد بعد السحب**", value: `**${formatCurrency(updated.balance)}**`, inline: true },
            { name: "📝 **السبب**", value: `**${reason}**`, inline: false }
          ]
        });

        await client.users.fetch(targetUser.id).then((user) => user.send({
          embeds: [buildGovernmentDebitDmEmbedPolished({
            amount,
            beforeBalance,
            afterBalance: updated.balance,
            executorLabel: `<@${interaction.user.id}>`,
            reason
          })]
        }).catch(() => null)).catch(() => null);

        await interaction.reply({
          embeds: [
            buildPrivateNoticeEmbed({
              title: "✅ تم سحب المال بنجاح",
              description: [
                `**المستهدف:** <@${targetUser.id}>`,
                `**الرصيد قبل:** ${formatCurrency(beforeBalance)}`,
                `**المبلغ المسحوب:** ${formatCurrency(amount)}`,
                `**الرصيد بعد:** ${formatCurrency(updated.balance)}`,
                `**تم تحويل المبلغ إلى:** ميزانية الدولة`
              ].join("\n"),
              color: 0x1f6b45
            })
          ],
          ephemeral: true
        });
        return;
      }

      if (interaction.customId === "modal_police_bank_freeze" || interaction.customId === "modal_police_bank_unfreeze" || interaction.customId === "modal_police_bank_seize_assets" || interaction.customId === "modal_police_bank_release_assets") {
        if (!(await ensurePoliceBankPermission(interaction))) {
          return;
        }

        const targetUser = await resolveAdministrativeTargetUser(interaction.fields.getTextInputValue("target_user"));
        const reason = interaction.fields.getTextInputValue("reason");
        if (!targetUser) {
          await interaction.reply({ content: "اكتب منشن الشخص أو آيدي الديسكورد أو رقم الحساب فقط.", ephemeral: true });
          return;
        }

        if (interaction.customId === "modal_police_bank_freeze") {
          const result = applyManualBankFreeze({
            actorUserId: interaction.user.id,
            targetUserId: targetUser.id,
            reason,
            sourceAction: "modal_police_bank_freeze"
          });

          if (!result.ok) {
            await interaction.reply({ content: "هذا الحساب مجمّد بالفعل.", ephemeral: true });
            return;
          }
          const updated = result.account;

          await sendPoliceBankLog({
            title: "❄️ **تجميد حساب بنكي**",
            description: "**تم تجميد حساب مواطن ومنع الخدمات البنكية عنه.**",
            fields: [
              { name: "🧑‍⚖️ **المنفذ**", value: `**<@${interaction.user.id}>**`, inline: true },
              ...buildPoliceBankTargetAuditFields(updated, targetUser.id),
              { name: "📝 **السبب**", value: `**${reason}**`, inline: false }
            ]
          });

          await client.users.fetch(targetUser.id).then((user) => user.send({ embeds: [buildBankFreezeDmEmbedPolished({ executorLabel: `<@${interaction.user.id}>`, reason })] }).catch(() => null)).catch(() => null);
          await interaction.reply({ content: `تم تجميد الحساب البنكي لـ <@${targetUser.id}>.`, ephemeral: true });
          return;
        }

        if (interaction.customId === "modal_police_bank_unfreeze") {
          const result = removeManualBankFreeze({
            actorUserId: interaction.user.id,
            targetUserId: targetUser.id,
            reason,
            sourceAction: "modal_police_bank_unfreeze"
          });

          if (!result.ok) {
            await interaction.reply({ content: "هذا الحساب غير مجمّد أصلًا.", ephemeral: true });
            return;
          }
          const updated = result.account;

          await sendPoliceBankLog({
            title: "✅ **رفع تجميد حساب بنكي**",
            description: "**تم رفع التجميد عن حساب مواطن وإعادة الخدمات البنكية له.**",
            fields: [
              { name: "🧑‍⚖️ **المنفذ**", value: `**<@${interaction.user.id}>**`, inline: true },
              ...buildPoliceBankTargetAuditFields(updated, targetUser.id),
              { name: "📝 **ملاحظة الرفع**", value: `**${reason}**`, inline: false }
            ]
          });

          await client.users.fetch(targetUser.id).then((user) => user.send({ embeds: [buildBankUnfreezeDmEmbedPolished({ executorLabel: `<@${interaction.user.id}>`, reason })] }).catch(() => null)).catch(() => null);
          await interaction.reply({ content: `تم رفع تجميد الحساب البنكي عن <@${targetUser.id}>.`, ephemeral: true });
          return;
        }

        if (interaction.customId === "modal_police_bank_seize_assets") {
          const result = await applyManualAssetsSeizure({
            guild: interaction.guild,
            actorUserId: interaction.user.id,
            targetUserId: targetUser.id,
            reason,
            sourceAction: "modal_police_bank_seize_assets"
          });

          if (!result.ok) {
            await interaction.reply({ content: "ممتلكات هذا الشخص محجوزة بالفعل.", ephemeral: true });
            return;
          }
          const updated = result.account;
          const snapshot = result.snapshot;

          await sendPoliceBankLog({
            title: "📦 **حجز ممتلكات مواطن**",
            description: "**تم حجز ممتلكات مواطن بالكامل من قبل الداخلية.**",
            fields: [
              { name: "🧑‍⚖️ **المنفذ**", value: `**<@${interaction.user.id}>**`, inline: true },
              ...buildPoliceBankTargetAuditFields(updated, targetUser.id),
              { name: "🚗 **عدد المركبات المحجوزة**", value: `**${Object.keys(snapshot.cars || {}).length}**`, inline: true },
              { name: "📝 **السبب**", value: `**${reason}**`, inline: false }
            ]
          });

          await client.users.fetch(targetUser.id).then((user) => user.send({ embeds: [buildAssetsSeizedDmEmbedPolished({ executorLabel: `<@${interaction.user.id}>`, reason })] }).catch(() => null)).catch(() => null);
          await interaction.reply({ content: `تم حجز ممتلكات <@${targetUser.id}> بالكامل.`, ephemeral: true });
          return;
        }

        const result = releaseManualAssetsSeizure({
          actorUserId: interaction.user.id,
          targetUserId: targetUser.id,
          reason,
          sourceAction: "modal_police_bank_release_assets"
        });

        if (!result.ok) {
          await interaction.reply({ content: "لا يوجد حجز ممتلكات مسجل على هذا الشخص.", ephemeral: true });
          return;
        }
        const updated = result.account;

        const guild = await client.guilds.fetch(config.guildId).catch(() => null);
        const member = guild ? await guild.members.fetch(targetUser.id).catch(() => null) : null;
        if (hasAnyActiveWeapon(updated, "m9")) {
          await member?.roles.add(config.m9RoleId).catch(() => null);
        }
        if (hasAnyActiveWeapon(updated, "colt")) {
          await member?.roles.add(COLT_ROLE_ID).catch(() => null);
        }

        await sendPoliceBankLog({
          title: "🗝️ **رفع حجز ممتلكات**",
          description: "**تم رفع الحجز عن ممتلكات مواطن وإعادة ما كان محفوظًا له.**",
          fields: [
            { name: "🧑‍⚖️ **المنفذ**", value: `**<@${interaction.user.id}>**`, inline: true },
            ...buildPoliceBankTargetAuditFields(updated, targetUser.id),
            { name: "📝 **ملاحظة الرفع**", value: `**${reason}**`, inline: false }
          ]
        });

        await client.users.fetch(targetUser.id).then((user) => user.send({ embeds: [buildAssetsReleasedDmEmbedPolished({ executorLabel: `<@${interaction.user.id}>`, reason })] }).catch(() => null)).catch(() => null);
        await interaction.reply({ content: `تم رفع حجز الممتلكات عن <@${targetUser.id}>.`, ephemeral: true });
        return;
      }

      if (interaction.customId === "modal_transfer_resource") {
        const senderAccount = requireAccount(interaction.user.id);
        if (!senderAccount) {
          await interaction.reply({ content: "لا يوجد لديك حساب بنكي.", ephemeral: true });
          return;
        }

        const rawTarget = interaction.fields.getTextInputValue("target_user");
        const resourceKey = resolveResourceKeyInput(interaction.fields.getTextInputValue("resource_key"));
        const quantity = parseWholeNumberInput(interaction.fields.getTextInputValue("resource_quantity"));
        let targetUser = await resolveUser(rawTarget);

        if (!targetUser) {
          const targetAccountByName = findAccountByName(rawTarget);
          if (targetAccountByName?.discordUserId) {
            targetUser = await client.users.fetch(targetAccountByName.discordUserId).catch(() => null);
          }
        }

        if (!targetUser) {
          await interaction.reply({ content: "الشخص غير موجود.", ephemeral: true });
          return;
        }

        if (targetUser.id === interaction.user.id) {
          await interaction.reply({ content: "لا يمكنك تحويل الموارد لنفسك.", ephemeral: true });
          return;
        }

        if (!resourceKey || !RESOURCE_CATALOG[resourceKey]) {
          await interaction.reply({ content: "اسم المورد غير صحيح. اكتب مثلًا: فحم، نحاس، حديد، ألمنيوم، كبريت، بلاستيك.", ephemeral: true });
          return;
        }

        if (!Number.isFinite(quantity) || quantity <= 0) {
          await interaction.reply({ content: "الكمية غير صحيحة.", ephemeral: true });
          return;
        }

        const targetAccount = requireAccount(targetUser.id);
        if (!targetAccount) {
          await interaction.reply({ content: "الشخص لا يملك حسابًا بنكيًا.", ephemeral: true });
          return;
        }

        const senderAmount = Number(senderAccount.resources?.[resourceKey] || 0);
        if (senderAmount < quantity) {
          await interaction.reply({
            content: `لا تملك كمية كافية من ${RESOURCE_CATALOG[resourceKey].label}. المتوفر لديك: ${senderAmount}.`,
            ephemeral: true
          });
          return;
        }

        updateAccount(interaction.user.id, (current) => {
          current.resources[resourceKey] -= quantity;
          return current;
        });

        updateAccount(targetUser.id, (current) => {
          current.resources[resourceKey] += quantity;
          return current;
        });

        await targetUser.send({
          embeds: [
            buildResourceTransferDmEmbed({
              senderLabel: interaction.user.toString(),
              resourceKey,
              quantity
            })
          ]
        }).catch(() => null);

        await sendSystemLog(RESOURCES_GENERAL_LOG_CHANNEL_ID, {
          title: "📦 **تحويل موارد**",
          description: "**تم تحويل موارد بين حسابين بنجاح.**",
          fields: [
            { name: "👤 **المرسل**", value: `**<@${interaction.user.id}>**`, inline: true },
            { name: "📨 **المستلم**", value: `**<@${targetUser.id}>**`, inline: true },
            buildBankAccountAuditField(senderAccount, "🏦 **اسم حساب المرسل**"),
            buildBankAccountAuditField(targetAccount, "🏦 **اسم حساب المستلم**"),
            { name: "🧱 **المورد**", value: `**${RESOURCE_CATALOG[resourceKey].label}**`, inline: true },
            { name: "🔢 **الكمية**", value: `**${quantity}**`, inline: true }
          ]
        });

        await interaction.reply({
          content: `تم تحويل **${quantity}** من **${RESOURCE_CATALOG[resourceKey].label}** إلى ${targetUser}.`,
          ephemeral: true
        });
        return;
      }

      if (interaction.customId === "modal_weapon_transfer") {
        const deferred = await safelyDeferReply(interaction, { ephemeral: true });
        if (!deferred) {
          return;
        }

        const senderAccount = requireAccount(interaction.user.id);
        if (!senderAccount) {
          await interaction.editReply({ content: "لا يوجد لديك حساب بنكي." });
          return;
        }

        const rawTarget = interaction.fields.getTextInputValue("target").trim();
        const requestedCode = interaction.fields.getTextInputValue("weapon_code").trim();
        const rawType = interaction.fields.getTextInputValue("weapon_type").trim();
        const parsedCode = parseWeaponInventoryCode(requestedCode);

        if (!parsedCode) {
          await interaction.editReply({ content: "كود السلاح غير صحيح. مثال صحيح: M9-1 أو COLT-1 أو TEC9-1." });
          return;
        }

        const normalizedType = rawType.replace(/\s+/g, "");
        if (!["دائم", "مؤقت"].includes(normalizedType)) {
          await interaction.editReply({ content: "نوع السلاح يجب أن يكون: دائم أو مؤقت." });
          return;
        }

        let targetUser = await resolveUser(rawTarget);
        if (!targetUser && /^\d{4,6}$/.test(rawTarget)) {
          const targetAccountByNumber = findAccountByAccountNumber(rawTarget);
          if (targetAccountByNumber?.discordUserId) {
            targetUser = await client.users.fetch(targetAccountByNumber.discordUserId).catch(() => null);
          }
        }
        if (!targetUser) {
          const targetAccountByName = findAccountByName(rawTarget);
          if (targetAccountByName?.discordUserId) {
            targetUser = await client.users.fetch(targetAccountByName.discordUserId).catch(() => null);
          }
        }

        if (!targetUser) {
          await interaction.editReply({ content: "الشخص غير موجود. استخدم آيدي دسكورد أو الرقم البنكي أو الاسم البنكي." });
          return;
        }

        if (targetUser.id === interaction.user.id) {
          await interaction.editReply({ content: "لا يمكنك إعطاء السلاح لنفسك." });
          return;
        }

        const targetAccount = requireAccount(targetUser.id);
        if (!targetAccount) {
          await interaction.editReply({ content: "الشخص لا يملك حسابًا بنكيًا." });
          return;
        }

        const senderInventory = getWeaponInventory(senderAccount, parsedCode.weaponKey);
        const weaponEntry = senderInventory[parsedCode.index - 1];
        if (!weaponEntry || weaponEntry.active === false || weaponEntry.brokenAt) {
          await interaction.editReply({ content: "هذا السلاح غير موجود في ممتلكاتك أو لم يعد صالحًا." });
          return;
        }

        const actualType = weaponEntry.permanent || !weaponEntry.expiresAt ? "دائم" : "مؤقت";
        if (normalizedType !== actualType) {
          await interaction.editReply({ content: `النوع الذي كتبته لا يطابق السلاح المحدد. السلاح **${requestedCode}** نوعه **${actualType}**.` });
          return;
        }

        const roleId = getWeaponInventoryDefinition(parsedCode.weaponKey).roleId || (parsedCode.weaponKey === "m9" ? config.m9RoleId : null);
        const weaponLabel = getWeaponBaseLabel(parsedCode.weaponKey);
        const transferredEntry = normalizeWeaponInventoryEntry({
          ...weaponEntry,
          transferredAt: new Date().toISOString(),
          transferredBy: interaction.user.id,
          source: "player_transfer"
        }, parsedCode.weaponKey);

        updateAccount(interaction.user.id, (current) => {
          const items = getWeaponInventory(current, parsedCode.weaponKey);
          items.splice(parsedCode.index - 1, 1);
          setWeaponInventory(current, parsedCode.weaponKey, items);
          return current;
        });

        let receivedWeaponCode = "";
        updateAccount(targetUser.id, (current) => {
          const slotIndex = appendWeaponInventory(current, parsedCode.weaponKey, transferredEntry);
          receivedWeaponCode = buildWeaponInventoryCode(parsedCode.weaponKey, slotIndex);
          return current;
        });

        const senderAfter = getAccount(interaction.user.id);
        if (roleId && !hasAnyActiveWeapon(senderAfter, parsedCode.weaponKey)) {
          const member = interaction.guild ? await interaction.guild.members.fetch(interaction.user.id).catch(() => null) : null;
          await member?.roles.remove(roleId).catch(() => null);
        }

        if (roleId) {
          const targetMember = interaction.guild ? await interaction.guild.members.fetch(targetUser.id).catch(() => null) : null;
          await targetMember?.roles.add(roleId).catch(() => null);
        }

        await targetUser.send({
          embeds: [
            buildWeaponOperationDmEmbed({
              title: "🎁 تم إعطاءك سلاح",
              description: "وصلك سلاح جديد من لاعب آخر وتمت إضافته إلى ممتلكاتك.",
              weaponCode: receivedWeaponCode,
              weaponLabel,
              permanent: transferredEntry.permanent,
              expiresAt: transferredEntry.expiresAt,
              actorLabel: `<@${interaction.user.id}>`,
              extraLines: [
                `**📅 التاريخ:** <t:${Math.floor(Date.now() / 1000)}:F>`,
                "**📘 التعليمات:** استخدم `/ايمبد-المعلومات` لرؤية جميع أسلحتك الحالية."
              ]
            })
          ]
        }).catch(() => null);

        await interaction.user.send({
          embeds: [
            buildWeaponOperationDmEmbed({
              title: "📤 تم إعطاء سلاح لشخص",
              description: "تم نقل السلاح من ممتلكاتك إلى الشخص المحدد بنجاح.",
              weaponCode: requestedCode.toUpperCase(),
              weaponLabel,
              permanent: transferredEntry.permanent,
              expiresAt: transferredEntry.expiresAt,
              actorLabel: `<@${targetUser.id}>`,
              extraLines: [
                `**🆔 الرمز الجديد عند المستلم:** ${receivedWeaponCode}`,
                `**📅 التاريخ:** <t:${Math.floor(Date.now() / 1000)}:F>`
              ]
            })
          ]
        }).catch(() => null);

        await sendSystemLog(WEAPONS_LOG_CHANNEL_ID, {
          title: "🔫 **تحويل سلاح بين الأعضاء**",
          description: "**تم نقل سلاح من عضو إلى عضو آخر مع الحفاظ على حالته ومدة صلاحيته.**",
          fields: [
            { name: "📤 **المرسل**", value: `**<@${interaction.user.id}>**`, inline: true },
            { name: "📥 **المستلم**", value: `**<@${targetUser.id}>**`, inline: true },
            { name: "🔫 **السلاح**", value: `**${weaponLabel}**`, inline: true },
            { name: "🆔 **الرمز المنقول**", value: `**${requestedCode.toUpperCase()}**`, inline: true },
            { name: "🆔 **الرمز الجديد**", value: `**${receivedWeaponCode}**`, inline: true },
            { name: "📜 **النوع**", value: `**${actualType}**`, inline: true }
          ]
        });

        await sendPoliceBankLog({
          title: "🔫 **إعطاء سلاح بين المواطنين**",
          description: "**تم تسجيل نقل سلاح من شخص إلى شخص آخر.**",
          fields: [
            { name: "📤 **المرسل**", value: `**<@${interaction.user.id}>**`, inline: true },
            { name: "📥 **المستلم**", value: `**<@${targetUser.id}>**`, inline: true },
            { name: "🔫 **السلاح**", value: `**${weaponLabel}**`, inline: true },
            { name: "🆔 **الرمز القديم**", value: `**${requestedCode.toUpperCase()}**`, inline: true },
            { name: "🆔 **الرمز الجديد**", value: `**${receivedWeaponCode}**`, inline: true },
            { name: "📜 **النوع**", value: `**${actualType}**`, inline: true }
          ]
        });

        await interaction.editReply({
          content: `تم إعطاء السلاح **${requestedCode.toUpperCase()}** إلى <@${targetUser.id}> بنجاح.`
        });
        return;
      }

      if (interaction.customId.startsWith("modal_buy_resource:")) {
        if (!(await ensureNoServiceHold(interaction))) {
          return;
        }

        const account = requireAccount(interaction.user.id);
        if (!account) {
          await interaction.reply({ content: "لا يوجد لديك حساب بنكي.", ephemeral: true });
          return;
        }

        const resourceKey = interaction.customId.split(":")[1];
        const quantity = parseWholeNumberInput(interaction.fields.getTextInputValue("resource_quantity"));
        const resource = RESOURCE_CATALOG[resourceKey];

        if (!resource || !Number.isFinite(quantity) || quantity <= 0) {
          await interaction.reply({ content: "الكمية المطلوبة غير صحيحة.", ephemeral: true });
          return;
        }

        const total = quantity * resource.price;
        if (account.balance < total) {
          await interaction.reply({ content: "رصيدك البنكي أقل من قيمة الشراء.", ephemeral: true });
          return;
        }

        const resourcePurchaseCommit = mutateStore((store) => {
          const current = getMutableAccount(store, interaction.user.id);
          if (!current) {
            return { ok: false, error: "account_not_found" };
          }

          current.resources ??= {
            coal: 0,
            copper: 0,
            iron: 0,
            aluminum: 0,
            sulfur: 0,
            plastic: 0
          };

          if (Number(current.balance || 0) < total) {
            return { ok: false, error: "insufficient_balance" };
          }

          current.balance -= total;
          current.resources[resourceKey] = Number(current.resources?.[resourceKey] || 0) + quantity;

          appendTransactionToStore(store, {
            discordUserId: interaction.user.id,
            robloxUsername: current.robloxUsername,
            type: "resource_purchase",
            amount: total,
            direction: "debit",
            balanceAfter: current.balance,
            metadata: {
              resourceKey,
              quantity
            }
          });

          return {
            ok: true,
            account: structuredClone(current)
          };
        });

        if (!resourcePurchaseCommit?.ok || !resourcePurchaseCommit.account) {
          await interaction.reply({
            content: "تعذر حفظ عملية شراء الموارد. حاول مرة أخرى.",
            ephemeral: true
          });
          return;
        }

        const updatedAccount = resourcePurchaseCommit.account;
        await sendSystemLogs([RESOURCE_PURCHASES_LOG_CHANNEL_ID, RESOURCES_GENERAL_LOG_CHANNEL_ID], {
          title: "⛏️ **شراء مورد من المتجر**",
          description: "**تمت عملية شراء مورد وخصم قيمته من الحساب البنكي بنجاح.**",
          fields: [
            { name: "👤 **المشتري**", value: `**<@${interaction.user.id}>**`, inline: true },
            buildBankAccountAuditField(updatedAccount),
            { name: "🎮 **يوزر روبلوكس**", value: `**${updatedAccount.robloxUsername || "غير مسجل"}**`, inline: true },
            { name: "📦 **المورد**", value: `**${resource.label}**`, inline: true },
            { name: "🔢 **الكمية**", value: `**${quantity}**`, inline: true },
            { name: "💵 **القيمة**", value: `**${total.toLocaleString("en-US")} ريال**`, inline: true },
            { name: "💳 **الرصيد بعد الشراء**", value: `**${updatedAccount.balance.toLocaleString("en-US")} ريال**`, inline: true }
          ]
        });

        await interaction.reply({
          content: `تم شراء ${quantity} من ${resource.label} مقابل ${total.toLocaleString("en-US")} ريال.`,
          ephemeral: true
        });
        return;
      }

      if (interaction.customId.startsWith("modal_loan_reason:")) {
        const reason = interaction.fields.getTextInputValue("loan_reject_reason");
        await interaction.reply({ content: `تم تسجيل سبب الرفض: ${reason}`, ephemeral: true });
        return;
      }

      if (interaction.customId.startsWith("modal_hold_reason:")) {
        const requestId = interaction.customId.split(":")[1];
        const request = getHoldRequest(requestId);
        const reason = interaction.fields.getTextInputValue("hold_reject_reason");
        if (request) {
          updateHoldRequest(requestId, (current) => ({ ...current, status: "rejected_with_reason", reviewedBy: interaction.user.id, reason }));
          const member = await interaction.guild.members.fetch(request.userId).catch(() => null);
          await member?.send({
            embeds: [buildServiceHoldDecisionEmbedPolished({ approved: false, reason })]
          }).catch(() => null);
          await sendAuditLog(client, config.auditChannelId, {
            title: "🛡️ **رفض رفع إيقاف خدمات مع سبب**",
            description: "**تم رفض طلب رفع إيقاف الخدمات مع تسجيل السبب.**",
            fields: [
              { name: "👤 **العضو**", value: `**<@${request.userId}>**`, inline: true },
              { name: "🧑‍⚖️ **المراجع**", value: `**<@${interaction.user.id}>**`, inline: true },
              { name: "📝 **السبب**", value: `**${reason}**`, inline: false }
            ]
          });
        }
        await interaction.reply({ content: "تم رفض الطلب مع تسجيل السبب.", ephemeral: true });
      }
    }
  } catch (error) {
    const interactionLabel = interaction.isChatInputCommand()
      ? `/${interaction.commandName}`
      : interaction.customId || interaction.commandName || interaction.type;

    console.error(`[INTERACTION ERROR] ${interactionLabel}`, error);

    if (interaction.isAutocomplete()) {
      return;
    }

    const rawMessage = error instanceof Error ? error.message : String(error || "unknown_error");
    const safeMessage = rawMessage.length > 180 ? `${rawMessage.slice(0, 180)}...` : rawMessage;
    const fallback = {
      embeds: [
        buildPrivateNoticeEmbed({
          title: "⚠️ تعذر إكمال العملية",
          description: [
            "**حدث خطأ أثناء تنفيذ العملية.**",
            `**السبب المختصر:** \`${safeMessage}\``,
            "",
            "**جرّب مرة أخرى، وإذا استمرت المشكلة أرسل هذا السبب مع اسم الزر أو الأمر الذي ضغطته.**"
          ].join("\n")
        })
      ],
      ephemeral: true
    };

    if (interaction.deferred || interaction.replied) {
      await interaction.followUp(fallback).catch(() => null);
    } else {
      await interaction.reply(fallback).catch(() => null);
    }
  }
});

app.get("/api/weapon-check", (req, res) => {
  return res.status(200).json({ ok: true, endpoint: "weapon-check", status: "ready" });
});
app.post("/api/weapon-check", async (req, res) => {
  try {
    const apiKey = req.headers["x-api-key"];
    if (apiKey !== config.internalApiKey) {
      return res.status(401).json({ ok: false, error: "unauthorized" });
    }

    const discordId = String(req.body?.discordId || "").trim();
    if (!discordId) {
      return res.status(400).json({ ok: false, error: "missing_discord_id" });
    }

    const result = await runWeaponCheckForDiscordId({
      discordId,
      sourceLabel: "roblox_weapon_check"
    });

    return res.status(200).json({
      ok: true,
      allowed: result.allowed,
      inServer: result.inServer,
      hasRole: result.hasRole,
      reason: result.reason
    });
  } catch (error) {
    console.error("Discord ID weapon-check failure:", error);
    return res.status(500).json({ ok: false, error: "internal_error" });
  }
});

  registerWebsiteRoutes(app, {
    client,
    config,
    EmbedBuilder,
  pendingWebsiteLoginVerifications,
  formatCurrency,
  getAccount,
  findAccountByAccountNumber,
  findAccountByName,
  findAccountByRobloxUsername,
  listOwnedVehicles,
  listTransactionsForUser,
  listProjects,
  listProjectTransactions,
  getProjectDefinition,
  ensureProjectState,
  getProjectOwnerMention,
  normalizeVehicleName,
  getSortedVehicleCatalog,
    processWebsiteCarPurchase,
    processWebsiteCarSale,
    processWebsiteBankTransfer,
    sendWebsiteNameChangeRequest,
    sendSystemLogs,
    sendFinePaymentLog,
    findGuildMemberForWebsiteAccess,
    findGuildMemberByRobloxUsername,
  updateAccount,
  addOwnedVehicle,
  appendTransaction,
  getFinesForUser,
  listAllFines,
  getFine,
  updateFine,
    applyBudgetTransaction,
    applyProjectMoneyMutation,
    BUDGET_KEYS,
    PROJECT_DEFINITIONS,
    getVehicleShowroomMetaRecord,
    listVehicleShowroomMetaRecords,
    upsertVehicleShowroomMeta,
    upsertProject,
  appendProjectTransaction
});

app.get("/", (req, res) => {
  return res.status(200).send("Server Online");
});

app.all(["/webhook", "/erlc/event-webhook"], async (req, res) => {
  try {
    const method = String(req.method || "GET").toUpperCase();
    if (method !== "POST") {
      return res.status(405).json({ ok: false, error: "method_not_allowed" });
    }

    const payload = req.body ?? {};
    const hasPayload = payload && typeof payload === "object" && Object.keys(payload).length > 0;
    const isValidSignature = verifyErlcEventWebhookRequest(req);

    if (!isValidSignature) {
      return res.status(401).json({ ok: false, error: "invalid_signature" });
    }

    if (!hasPayload) {
      return res.status(200).json({
        ok: true,
        endpoint: "event-webhook",
        probe: true
      });
    }

    const eventType = String(
      payload?.eventType ||
      payload?.type ||
      payload?.event ||
      "unknown"
    ).trim() || "unknown";

    console.log("[ER:LC EVENT WEBHOOK]", JSON.stringify({
      eventType,
      payload
    }));

    void sendErlcEventWebhookToDiscord(payload, { eventType }).catch((error) => {
      console.error("ER:LC event webhook discord forwarding failure:", error);
    });

    void handleGameplayEventWebhook(payload).catch((error) => {
      console.error("ER:LC event webhook gameplay handling failure:", error);
    });

    return res.status(200).json({
      ok: true,
      endpoint: "event-webhook",
      eventType
    });
  } catch (error) {
    console.error("ER:LC event webhook failure:", error);
    return res.status(500).json({ ok: false, error: "internal_error" });
  }
});

app.post("/erlc/robbery-success", async (req, res) => {
  try {
    if (req.headers["x-webhook-key"] !== config.erlcWebhookKey) {
      return res.status(401).json({ ok: false, error: "unauthorized" });
    }

    const { robloxUsername, robberyType, success } = extractRobberyEventPayload(req.body ?? {});
    const normalizedType = normalizeRobberyTypeInput(robberyType);
    const reward = ROBBERY_REWARDS[normalizedType];

    console.log("[ROBBERY WEBHOOK RECEIVED]", JSON.stringify({
      robloxUsername,
      robberyType,
      normalizedType,
      success,
      rawBody: req.body ?? {}
    }));

    if (!robloxUsername || !normalizedType || (success !== true && success !== false)) {
      console.log("[ROBBERY WEBHOOK SKIP]", JSON.stringify({
        robloxUsername,
        robberyType,
        normalizedType,
        success,
        reward: reward ?? null
      }));
      return res.status(400).json({ ok: false, error: "invalid_payload" });
    }

    const result = await processRobberyReward({
      robloxUsername,
      robberyType: normalizedType,
      sourceLabel: "robbery_webhook",
      forceSuccess: success
    });

    if (!result.ok) {
      const status = result.error === "account_not_found" ? 404 : 400;
      return res.status(status).json({ ok: false, error: result.error });
    }

    return res.json({
      ok: true,
      robberyType: result.robberyType,
      success: result.success,
      reward: result.reward ?? 0,
      balance: result.balance ?? null
    });
  } catch (error) {
    console.error("ER:LC robbery webhook failure:", error);
    return res.status(500).json({ ok: false, error: "internal_error" });
  }
});

app.post("/erlc/balance-change", async (req, res) => {
  try {
    if (req.headers["x-webhook-key"] !== config.erlcWebhookKey) {
      return res.status(401).json({ ok: false, error: "unauthorized" });
    }

    const { robloxUsername, amount, operationType, reason } = req.body ?? {};
    const value = Number(amount);
    const normalizedType = String(operationType || "").trim().toLowerCase();

    if (!robloxUsername || !Number.isFinite(value) || value <= 0 || !normalizedType) {
      return res.status(400).json({ ok: false, error: "invalid_payload" });
    }

    const account = findAccountByRobloxUsername(robloxUsername);
    if (!account) {
      return res.status(404).json({ ok: false, error: "account_not_found" });
    }

    const creditTypes = ["deposit", "reward", "salary", "bonus"];
    const debitTypes = ["withdraw", "fine", "purchase", "penalty"];
    const isCredit = creditTypes.includes(normalizedType);
    const isDebit = debitTypes.includes(normalizedType);

    if (!isCredit && !isDebit) {
      return res.status(400).json({ ok: false, error: "unsupported_operation_type" });
    }

    if (isDebit && account.balance < value) {
      return res.status(400).json({ ok: false, error: "insufficient_balance" });
    }

    const updated = updateAccount(account.discordUserId, (current) => {
      current.balance += isCredit ? value : -value;
      return current;
    });

    appendTransaction({
      discordUserId: account.discordUserId,
      robloxUsername,
      type: normalizedType,
      amount: value,
      direction: isCredit ? "credit" : "debit",
      balanceAfter: updated.balance,
      metadata: {
        reason: reason || "No reason provided"
      }
    });

    await sendAuditLog(client, config.auditChannelId, {
      title: isCredit ? "💰 **إضافة أموال إلى الحساب**" : "🏦 **خصم أو سحب أموال من الحساب**",
      description: isCredit
        ? "**تمت إضافة مبلغ للحساب البنكي وتسجيل العملية بنجاح.**"
        : "**تم خصم أو سحب مبلغ من الحساب البنكي وتسجيل العملية بنجاح.**",
      fields: [
        { name: "👤 **صاحب الحساب**", value: `**<@${account.discordUserId}>**`, inline: true },
        buildBankAccountAuditField(account),
        { name: "🎮 **يوزر روبلوكس**", value: `**${robloxUsername}**`, inline: true },
        { name: "🧾 **نوع العملية**", value: `**${normalizedType}**`, inline: true },
        { name: "💵 **المبلغ**", value: `**${value.toLocaleString("en-US")} ريال**`, inline: true },
        { name: "💳 **الرصيد بعد العملية**", value: `**${updated.balance.toLocaleString("en-US")} ريال**`, inline: true },
        { name: "📝 **السبب**", value: `**${reason || "No reason provided"}**`, inline: false }
      ]
    });

    await sendPoliceBankLog({
      title: isCredit ? "💰 **عملية إيداع على حساب مواطن**" : "🏦 **عملية خصم على حساب مواطن**",
      description: "**تم تسجيل حركة بنكية جديدة داخل لوق الداخلية.**",
      fields: [
        { name: "👤 **صاحب الحساب**", value: `**<@${account.discordUserId}>**`, inline: true },
        buildBankAccountAuditField(updated),
        { name: "🧾 **نوع العملية**", value: `**${normalizedType}**`, inline: true },
        { name: "💵 **المبلغ**", value: `**${formatCurrency(value)}**`, inline: true },
        { name: "💳 **الرصيد الحالي**", value: `**${formatCurrency(updated.balance)}**`, inline: true },
        { name: "📝 **السبب**", value: `**${reason || "No reason provided"}**`, inline: false }
      ]
    });

    return res.json({
      ok: true,
      operationType: normalizedType,
      amount: value,
      balance: updated.balance
    });
  } catch (error) {
    console.error("ER:LC balance-change webhook failure:", error);
    return res.status(500).json({ ok: false, error: "internal_error" });
  }
});

app.get("/erlc/fuel-sale", (req, res) => {
  return res.status(200).json({ ok: true, endpoint: "fuel-sale", service: "arab-world-bot-webhook" });
});

app.post("/erlc/fuel-sale", async (req, res) => {
  try {
    if (req.headers["x-webhook-key"] !== config.erlcWebhookKey) {
      return res.status(401).json({ ok: false, error: "unauthorized" });
    }

    const projectKey = resolveFuelSaleProjectKey(req.body ?? {});
    const amount = extractFuelSaleAmount(req.body ?? {});
    const playerLabel = extractFuelSalePlayerLabel(req.body ?? {});

    if (!projectKey || !STATION_PROJECT_KEYS.includes(projectKey) || !Number.isFinite(amount) || amount <= 0) {
      console.log("[FUEL SALE WEBHOOK INVALID]", JSON.stringify(req.body ?? {}));
      return res.status(400).json({ ok: false, error: "invalid_payload" });
    }

    const definition = getProjectDefinition(projectKey);
    const result = applyProjectMoneyMutation(
      projectKey,
      amount,
      "fuel_income",
      null,
      playerLabel ? `دخل تعبئة وقود بواسطة ${playerLabel}` : "دخل تعبئة وقود"
    );

    if (!result.ok) {
      return res.status(400).json({ ok: false, error: result.error });
    }

    await refreshStoredProjectPanel(projectKey);
    await sendPoliceBankLog({
      title: "⛽💰 **دخل تعبئة وقود للمحطة**",
      description: "**تمت إضافة مبلغ تعبئة الوقود إلى ميزانية المحطة تلقائيًا.**",
      fields: [
        { name: "🏢 **المحطة**", value: `**${result.project.name || definition?.title || projectKey}**`, inline: true },
        { name: "💵 **المبلغ**", value: `**${formatProjectCurrency(amount)}**`, inline: true },
        { name: "🎮 **اللاعب**", value: `**${playerLabel || "غير معروف"}**`, inline: true },
        { name: "📦 **ميزانية المحطة الآن**", value: `**${formatProjectCurrency(result.project.budget)}**`, inline: true }
      ]
    });

    return res.status(200).json({
      ok: true,
      projectKey,
      amount,
      budget: result.project.budget
    });
  } catch (error) {
    console.error("ER:LC fuel-sale webhook failure:", error);
    return res.status(500).json({ ok: false, error: "internal_error" });
  }
});

client.on(Events.MessageCreate, async (message) => {
  try {
    await handleCraftingDmMessage(message);
  } catch (error) {
    console.error("Crafting DM handler failed:", error);
  }

  try {
    if (message.author.bot || !message.guild || !message.content) {
      return;
    }

    const normalizedContent = String(message.content || "").trim();
    if (normalizedContent === "!رمز") {
      const now = Date.now();
      let latestPending = null;

      for (const [verificationId, pending] of pendingWebsiteLoginVerifications.entries()) {
        if (!pending || pending.discordUserId !== message.author.id) {
          continue;
        }

        if (now > Number(pending.expiresAt || 0)) {
          pendingWebsiteLoginVerifications.delete(verificationId);
          continue;
        }

        if (pending.used) {
          continue;
        }

        if (!latestPending || Number(pending.expiresAt || 0) > Number(latestPending.pending?.expiresAt || 0)) {
          latestPending = { verificationId, pending };
        }
      }

      if (!latestPending) {
        await message.reply("لا يوجد لديك رمز موقع نشط الآن. اطلب رمزًا جديدًا من الموقع أولًا.").catch(() => null);
        return;
      }

      try {
        await message.author.send(buildWebsiteVerificationFallbackDm(latestPending));
        await message.reply("تم إرسال رمز التحقق لك في الخاص.").catch(() => null);
      } catch (error) {
        console.error("Website fallback DM command failed:", error);
        await message.reply("تعذر إرسال الرمز في الخاص. تأكد أن الخاص مفتوح مع البوت ثم أعد المحاولة.").catch(() => null);
      }
      return;
    }

    if (normalizedContent !== "!اعطاء مال اخر سرقات") {
      return;
    }

    const member = message.member ?? await message.guild.members.fetch(message.author.id).catch(() => null);
    if (!canManagePoliceBank(member) && !canUseSlashCommands(member)) {
      await message.reply({
        embeds: [
          buildPrivateNoticeEmbed({
            title: "⛔ لا تملك الصلاحية",
            description: "**هذا الأمر مخصص للإدارة فقط.**"
          })
        ]
      }).catch(() => null);
      return;
    }

    const results = await grantPendingRecentRobberyRewards({
      actorId: message.author.id
    });

    const granted = results.filter((entry) => entry.status === "granted");
    const missingAccounts = results.filter((entry) => entry.status === "missing_account");
    const totalGranted = granted.reduce((sum, entry) => sum + Number(entry.reward || 0), 0);

    await sendAuditLog(client, config.auditChannelId, {
      title: "💸 **تعويض آخر السرقات الناجحة**",
      description: "**تم تنفيذ مراجعة آخر 24 ساعة وتحويل المكافآت غير المصروفة سابقًا.**",
      color: 0x0b1f3a,
      fields: [
        { name: "👤 **المنفذ**", value: `**<@${message.author.id}>**`, inline: true },
        { name: "✅ **عدد المحول لهم**", value: `**${granted.length}**`, inline: true },
        { name: "💵 **إجمالي المبالغ**", value: `**${formatCurrency(totalGranted)}**`, inline: true },
        { name: "⚠️ **حسابات غير موجودة**", value: `**${missingAccounts.length}**`, inline: true }
      ]
    });

    const grantedLines = granted.slice(0, 10).map((entry) => {
      const robberyLabel = getRobberyDisplayLabel(entry.transaction.metadata?.robberyType || "");
      const accountLabel = entry.account?.accountNumber ? ` • ${entry.account.accountNumber}` : "";
      return `• <@${entry.transaction.discordUserId}> — ${robberyLabel} — ${formatCurrency(entry.reward)}${accountLabel}`;
    });
    const missingLines = missingAccounts.slice(0, 5).map((entry) =>
      `• \`${entry.transaction.robloxUsername || "غير معروف"}\` — ${getRobberyDisplayLabel(entry.transaction.metadata?.robberyType || "")}`
    );

    await message.reply({
      embeds: [
        new EmbedBuilder()
          .setColor(0x0b1f3a)
          .setTitle("💸 تعويض آخر السرقات الناجحة")
          .setDescription("**تمت مراجعة آخر 24 ساعة وتحويل فقط السرقات الناجحة التي لم يُصرف لها سابقًا.**")
          .addFields(
            { name: "✅ تم التحويل لهم", value: `**${granted.length}**`, inline: true },
            { name: "💵 إجمالي المحول", value: `**${formatCurrency(totalGranted)}**`, inline: true },
            { name: "⚠️ غير مربوطين/غير موجودين", value: `**${missingAccounts.length}**`, inline: true },
            { name: "📋 آخر من تم تحويلهم", value: grantedLines.length ? grantedLines.join("\n") : "**لا يوجد أحد يحتاج تعويض حاليًا.**", inline: false },
            { name: "📝 ملاحظات", value: missingLines.length ? missingLines.join("\n") : "**لا توجد حالات فاشلة.**", inline: false }
          )
          .setFooter({ text: "Arab World • تعويض السرقات" })
          .setTimestamp()
      ]
    }).catch(() => null);
  } catch (error) {
    console.error("Recent robberies compensation command failed:", error);
  }
});

let webServerStarted = false;

function startWebServer() {
  if (webServerStarted) {
    return;
  }

  webServerStarted = true;
  app.listen(config.port, () => {
    console.log(`ER:LC webhook listening on port ${config.port}`);
  });
}

client.once(Events.ClientReady, async (readyClient) => {
  console.log(`Logged in as ${readyClient.user.tag}`);
  readyClient.user.setPresence({
    activities: [
      {
        name: "ملكية ArAbWoRld",
        type: ActivityType.Playing
      }
    ],
    status: "online"
  });

  const readyGuild = readyClient.guilds.cache.get(config.guildId)
    || await readyClient.guilds.fetch(config.guildId).catch(() => null);
  if (readyGuild) {
    await readyGuild.members.fetch().catch((error) => {
      console.error("Initial guild member cache warmup failed:", error);
    });
  }

  const vehicleRepairResult = repairAllVehicleOwnershipRecords();
  if (vehicleRepairResult.repairedAccounts > 0 || vehicleRepairResult.repairedVehicles > 0) {
    console.log(`[VEHICLE REPAIR] repairedAccounts=${vehicleRepairResult.repairedAccounts} repairedVehicles=${vehicleRepairResult.repairedVehicles}`);
  }

  applyWeeklyBudgetAllowances();
  await processProjectSystems().catch((error) => {
    console.error("Initial project system processing failed:", error);
  });
  await processExpiredWeapons({ notifyUsers: false }).catch((error) => {
    console.error("Initial weapon expiry check failed:", error);
  });
  const initialRentalOwnershipSync = syncActiveRentalOwnerships();
  if (initialRentalOwnershipSync.syncedRentalCars > 0) {
    console.log(`[RENTAL OWNERSHIP SYNC] syncedRentalCars=${initialRentalOwnershipSync.syncedRentalCars}`);
  }
  const initialExpiredRentalCleanup = processExpiredRentalOwnerships();
  if (initialExpiredRentalCleanup.removedRentalCars > 0 || initialExpiredRentalCleanup.removedRentalEntries > 0) {
    console.log(`[RENTAL CLEANUP] removedRentalCars=${initialExpiredRentalCleanup.removedRentalCars} removedRentalEntries=${initialExpiredRentalCleanup.removedRentalEntries}`);
  }
  await notifyExpiredRentalOwnerships(initialExpiredRentalCleanup.expiredRentalSnapshots).catch((error) => {
    console.error("Initial expired rental notification failed:", error);
  });
  await pollKillLogs().catch((error) => {
    console.error("Initial kill log poll failed:", error);
  });
  await pollActiveVehicles().catch((error) => {
    console.error("Initial vehicle poll failed:", error);
  });
  await pollEmergencyCallsForRobberies().catch((error) => {
    console.error("Initial emergency calls poll failed:", error);
  });
  setInterval(() => {
    applyWeeklyBudgetAllowances();
  }, 60 * 60 * 1000);
  setInterval(() => {
    processProjectSystems().catch((error) => {
      console.error("Scheduled project system processing failed:", error);
    });
  }, 60 * 60 * 1000);
  setInterval(() => {
    processExpiredWeapons().catch((error) => {
      console.error("Scheduled weapon expiry check failed:", error);
    });
  }, 60 * 60 * 1000);
  setInterval(() => {
    const sync = syncActiveRentalOwnerships();
    if (sync.syncedRentalCars > 0) {
      console.log(`[RENTAL OWNERSHIP SYNC] syncedRentalCars=${sync.syncedRentalCars}`);
    }
  }, 60 * 1000);
  setInterval(() => {
    const cleanup = processExpiredRentalOwnerships();
    if (cleanup.removedRentalCars > 0 || cleanup.removedRentalEntries > 0) {
      console.log(`[RENTAL CLEANUP] removedRentalCars=${cleanup.removedRentalCars} removedRentalEntries=${cleanup.removedRentalEntries}`);
    }
    notifyExpiredRentalOwnerships(cleanup.expiredRentalSnapshots).catch((error) => {
      console.error("Scheduled expired rental notification failed:", error);
    });
  }, 60 * 1000);
  setInterval(() => {
    pollKillLogs().catch((error) => {
      console.error("Scheduled kill log poll failed:", error);
    });
  }, config.erlcKillLogsPollIntervalMs);
  setInterval(() => {
    pollActiveVehicles().catch((error) => {
      console.error("Scheduled vehicle poll failed:", error);
    });
  }, config.erlcVehiclesPollIntervalMs);
  setInterval(() => {
    pollEmergencyCallsForRobberies().catch((error) => {
      console.error("Scheduled emergency calls poll failed:", error);
    });
  }, config.erlcEmergencyCallsPollIntervalMs);
});

startWebServer();

client.login(config.token).catch((error) => {
  console.error("Discord login failed:", error);
});

