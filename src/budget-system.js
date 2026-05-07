import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  EmbedBuilder,
  StringSelectMenuBuilder,
  StringSelectMenuOptionBuilder
} from "discord.js";
import { COLORS } from "./constants.js";

export const BUDGET_KEYS = {
  police: "police",
  guard: "guard",
  gang: "gang",
  jus: "jus",
  state: "state"
};

export const BUDGET_DEFINITIONS = {
  [BUDGET_KEYS.police]: {
    key: BUDGET_KEYS.police,
    title: "ميزانية وزارة الداخلية",
    shortTitle: "الداخلية",
    emoji: "🏛️",
    color: COLORS.navy,
    managerRoleId: "1497340390192320683",
    allowPublicDeposit: false,
    startingBalance: 5_000_000,
    weeklyAllowance: 150_000,
    supportsSectorPurchase: true,
    supportsMilitaryPurchase: true
  },
  [BUDGET_KEYS.guard]: {
    key: BUDGET_KEYS.guard,
    title: "ميزانية الحرس الملكي",
    shortTitle: "الحرس الملكي",
    emoji: "👑",
    color: COLORS.navy,
    managerRoleId: "1497340390192320683",
    allowPublicDeposit: false,
    startingBalance: 5_000_000,
    weeklyAllowance: 0,
    supportsSectorPurchase: true,
    supportsMilitaryPurchase: false
  },
  [BUDGET_KEYS.gang]: {
    key: BUDGET_KEYS.gang,
    title: "ميزانية العصابات",
    shortTitle: "العصابات",
    emoji: "💸",
    color: COLORS.navy,
    managerRoleId: "1497342671633518703",
    allowPublicDeposit: true,
    startingBalance: 15_000,
    weeklyAllowance: 0,
    supportsSectorPurchase: false,
    supportsMilitaryPurchase: false
  },
  [BUDGET_KEYS.jus]: {
    key: BUDGET_KEYS.jus,
    title: "ميزانية وزارة العدل",
    shortTitle: "العدل",
    emoji: "⚖️",
    color: COLORS.navy,
    managerRoleId: "1497343430383370260",
    allowPublicDeposit: false,
    startingBalance: 100_000_000,
    weeklyAllowance: 0,
    supportsSectorPurchase: false,
    supportsMilitaryPurchase: false
  },
  [BUDGET_KEYS.state]: {
    key: BUDGET_KEYS.state,
    title: "ميزانية الدولة",
    shortTitle: "الدولة",
    emoji: "🏛️",
    color: COLORS.navy,
    managerRoleId: "1497340390192320683",
    allowPublicDeposit: false,
    startingBalance: 0,
    weeklyAllowance: 0,
    supportsSectorPurchase: false,
    supportsMilitaryPurchase: false
  }
};

export const POLICE_SECTOR_ADDONS = {
  heavy_weapons: {
    key: "heavy_weapons",
    label: "إضافة أسلحة ثقيلة",
    price: 6_000_000
  },
  stronger_gear: {
    key: "stronger_gear",
    label: "إضافة عتاد أقوى",
    price: 4_000_000
  }
};

export const POLICE_MILITARY_ITEMS = {
  heavy_weapons: {
    key: "heavy_weapons",
    label: "أسلحة ثقيلة",
    price: 5_000_000
  },
  heavy_gear: {
    key: "heavy_gear",
    label: "عتاد ثقيل",
    price: 4_000_000
  }
};

export const JUS_PURCHASE_ITEMS = {
  vehicle: {
    key: "vehicle",
    label: "شراء مركبة",
    price: 1_000_000
  },
  outfit: {
    key: "outfit",
    label: "شراء ملابس",
    price: 500_000
  }
};

export function formatBudgetCurrency(amount) {
  return `${Number(amount || 0).toLocaleString("en-US")} ريال`;
}

function buildFooter(text) {
  return { text: `Arab World • ${text}` };
}

export function getBudgetDefinition(budgetKey) {
  return BUDGET_DEFINITIONS[budgetKey] ?? null;
}

export function buildBudgetCommandChoices() {
  return Object.values(BUDGET_DEFINITIONS).map((definition) => ({
    name: definition.shortTitle,
    value: definition.key
  }));
}

function buildBudgetGuidance(definition) {
  if (definition.key === BUDGET_KEYS.police || definition.key === BUDGET_KEYS.guard) {
    return [
      "• الإيداع يخصم من رصيدك الشخصي ويضاف إلى الميزانية",
      "• السحب ينقل المبلغ من الميزانية إلى رصيدك الشخصي",
      "• شراء عتاد القطاع يبدأ من 5,000,000 ريال",
      "• لا يوجد استرداد بعد تأكيد أي طلب شراء",
      definition.key === BUDGET_KEYS.police
        ? "• المخالفات المسددة تضاف تلقائيًا إلى ميزانية الداخلية"
        : "• جميع العمليات هنا مراقبة ومسجلة باسم المنفذ"
    ].join("\n");
  }

  if (definition.key === BUDGET_KEYS.gang) {
    return [
      "• أي عضو يمكنه دعم الميزانية عبر الإيداع",
      "• السحب والتحويل محصوران على المسؤول المعتمد",
      "• كل عملية تسجل باسم المنفذ والمبلغ والتاريخ"
    ].join("\n");
  }

  if (definition.key === BUDGET_KEYS.state) {
    return [
      "• هذه الميزانية مخصصة للأموال الحكومية العامة",
      "• أي سحب حكومي من حسابات المواطنين يضاف لها تلقائيًا",
      "• لا يوجد فيها شراء عتاد أو مشتريات خاصة",
      "• جميع عمليات الإضافة والسحب مسجلة باسم المنفذ"
    ].join("\n");
  }

  return [
    "• جميع العمليات هنا حساسة وتحتاج اعتمادًا نهائيًا",
    `• شراء مركبة للعدل: ${formatBudgetCurrency(JUS_PURCHASE_ITEMS.vehicle.price)}`,
    `• شراء ملابس للعدل: ${formatBudgetCurrency(JUS_PURCHASE_ITEMS.outfit.price)}`,
    "• السحب والتحويل والشراء محصورة على المسؤول المعتمد"
  ].join("\n");
}

export function buildBudgetHomeEmbed(definition, budget) {
  return new EmbedBuilder()
    .setColor(definition.color)
    .setTitle(`${definition.emoji} ${definition.title}`)
    .setDescription([
      `**💰 الرصيد الحالي:** ${formatBudgetCurrency(budget.balance)}`,
      "",
      "**📋 التعليمات والتنبيهات:**",
      buildBudgetGuidance(definition),
      "",
      `**👤 المسؤول المعتمد:** <@&${definition.managerRoleId}>`
    ].join("\n"))
    .setFooter(buildFooter(`واجهة ${definition.shortTitle}`))
    .setTimestamp();
}

export function buildBudgetMenu(definition) {
  const options = [
    new StringSelectMenuOptionBuilder()
      .setLabel("إضافة مال للميزانية")
      .setDescription("تحويل مبلغ من رصيدك الشخصي إلى الميزانية")
      .setEmoji("➕")
      .setValue(`budget_add:${definition.key}`),
    new StringSelectMenuOptionBuilder()
      .setLabel("سحب مال من الميزانية")
      .setDescription("سحب مبلغ من الميزانية إلى رصيدك الشخصي")
      .setEmoji("➖")
      .setValue(`budget_withdraw:${definition.key}`)
  ];

  if (definition.key === BUDGET_KEYS.gang || definition.key === BUDGET_KEYS.jus) {
    options.push(
      new StringSelectMenuOptionBuilder()
        .setLabel("تحويل من الميزانية")
        .setDescription("تحويل مبلغ من الميزانية إلى حساب عضو")
        .setEmoji("💸")
        .setValue(`budget_transfer:${definition.key}`)
    );
  }

  if (definition.supportsSectorPurchase) {
    options.push(
      new StringSelectMenuOptionBuilder()
        .setLabel("شراء عتاد قطاع")
        .setDescription("شراء العتاد الأساسي مع إضافات اختيارية")
        .setEmoji("🏛️")
        .setValue(`budget_purchase_sector:${definition.key}`)
    );
  }

  if (definition.supportsMilitaryPurchase) {
    options.push(
      new StringSelectMenuOptionBuilder()
        .setLabel("شراء عتاد عسكري")
        .setDescription("شراء أسلحة ثقيلة أو عتاد ثقيل")
        .setEmoji("🪖")
        .setValue(`budget_purchase_military:${definition.key}`)
    );
  }

  if (definition.key === BUDGET_KEYS.jus) {
    options.push(
      new StringSelectMenuOptionBuilder()
        .setLabel("شراء للعدل")
        .setDescription("شراء مركبات أو ملابس من الميزانية")
        .setEmoji("⚖️")
        .setValue(`budget_purchase_jus:${definition.key}`)
    );
  }

  return new ActionRowBuilder().addComponents(
    new StringSelectMenuBuilder()
      .setCustomId(`budget_menu:${definition.key}`)
      .setPlaceholder("اختر العملية المطلوبة")
      .addOptions(options)
  );
}

export function buildBudgetLogsButtonRow(budgetKey) {
  return new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId(`budget_logs_button:${budgetKey}`)
      .setLabel("سجل العمليات")
      .setEmoji("📒")
      .setStyle(ButtonStyle.Secondary)
  );
}

export function buildBudgetLogsEmbed(definition, operations = []) {
  const description = operations.length
    ? operations
        .map((entry, index) => {
          const actor = entry.actorUserId ? `<@${entry.actorUserId}>` : "النظام";
          const target = entry.targetUserId ? `\n👥 المستهدف: <@${entry.targetUserId}>` : "";
          const createdAt = entry.createdAt
            ? `<t:${Math.floor(new Date(entry.createdAt).getTime() / 1000)}:f>`
            : "غير معروف";

          return [
            `**${index + 1}. ${entry.label || entry.type}**`,
            `👤 المنفذ: ${actor}`,
            `💵 المبلغ: ${formatBudgetCurrency(entry.amount)}`,
            `🕒 التاريخ: ${createdAt}${target}`,
            entry.note ? `📝 التفاصيل: ${entry.note}` : null
          ]
            .filter(Boolean)
            .join("\n");
        })
        .join("\n\n")
    : "**لا توجد عمليات مسجلة على هذه الميزانية حتى الآن.**";

  return new EmbedBuilder()
    .setColor(definition.color)
    .setTitle(`📒 سجل ${definition.shortTitle}`)
    .setDescription(description)
    .setFooter(buildFooter(`سجل ${definition.shortTitle}`))
    .setTimestamp();
}

export function buildBudgetPurchaseDraftEmbed({
  definition,
  title,
  description,
  totalPrice,
  lines = []
}) {
  return new EmbedBuilder()
    .setColor(definition.color)
    .setTitle(title)
    .setDescription([
      description,
      "",
      ...lines,
      "",
      `**💰 الإجمالي:** ${formatBudgetCurrency(totalPrice)}`
    ].join("\n"))
    .setFooter(buildFooter(`اعتماد ${definition.shortTitle}`))
    .setTimestamp();
}

export function buildBudgetConfirmButtons(confirmId, cancelId) {
  return new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId(confirmId)
      .setLabel("اعتماد")
      .setEmoji("✅")
      .setStyle(ButtonStyle.Success),
    new ButtonBuilder()
      .setCustomId(cancelId)
      .setLabel("إلغاء")
      .setEmoji("✖️")
      .setStyle(ButtonStyle.Danger)
  );
}

export function buildPoliceSectorAddonMenu(selectedKeys = []) {
  const selected = new Set(selectedKeys);

  return new ActionRowBuilder().addComponents(
    new StringSelectMenuBuilder()
      .setCustomId("budget_sector_addons")
      .setPlaceholder("أضف ملحقًا إلى عتاد القطاع")
      .addOptions(
        Object.values(POLICE_SECTOR_ADDONS)
          .filter((addon) => !selected.has(addon.key))
          .map((addon) =>
            new StringSelectMenuOptionBuilder()
              .setLabel(`➕ ${addon.label}`)
              .setDescription(formatBudgetCurrency(addon.price))
              .setValue(addon.key)
          )
      )
  );
}

export function buildPoliceSectorAddonRemoveMenu(selectedKeys = []) {
  const selectedAddons = selectedKeys
    .map((key) => POLICE_SECTOR_ADDONS[key])
    .filter(Boolean);

  return new ActionRowBuilder().addComponents(
    new StringSelectMenuBuilder()
      .setCustomId("budget_sector_remove_addons")
      .setPlaceholder("احذف ملحقًا من الطلب")
      .setDisabled(!selectedAddons.length)
      .addOptions(
        selectedAddons.length
          ? selectedAddons.map((addon) =>
              new StringSelectMenuOptionBuilder()
                .setLabel(`➖ ${addon.label}`)
                .setDescription(formatBudgetCurrency(addon.price))
                .setValue(addon.key)
            )
          : [
              new StringSelectMenuOptionBuilder()
                .setLabel("لا توجد إضافات محددة")
                .setDescription("أضف ملحقًا أولًا من القائمة السابقة")
                .setValue("none")
            ]
      )
  );
}

export function buildSinglePurchaseMenu(customId, placeholderOrItems, maybeItems) {
  const placeholder = Array.isArray(placeholderOrItems)
    ? "اختر العنصر المطلوب"
    : String(placeholderOrItems || "اختر العنصر المطلوب");
  const items = Array.isArray(placeholderOrItems) ? placeholderOrItems : maybeItems;

  return new ActionRowBuilder().addComponents(
    new StringSelectMenuBuilder()
      .setCustomId(customId)
      .setPlaceholder(placeholder)
      .addOptions(
        (Array.isArray(items) ? items : []).map((item) =>
          new StringSelectMenuOptionBuilder()
            .setLabel(`🧾 ${item.label}`)
            .setDescription(formatBudgetCurrency(item.price))
            .setValue(item.key)
        )
      )
  );
}

export function buildBudgetPurchaseDmEmbed({
  definition,
  title,
  items = [],
  totalPrice
}) {
  return new EmbedBuilder()
    .setColor(definition.color)
    .setTitle(`✅ ${title}`)
    .setDescription([
      "**تم اعتماد العملية بنجاح.**",
      "",
      ...items.map((item) => `• ${item}`),
      "",
      `**💰 الإجمالي:** ${formatBudgetCurrency(totalPrice)}`
    ].join("\n"))
    .setFooter(buildFooter(`إشعار ${definition.shortTitle}`))
    .setTimestamp();
}
