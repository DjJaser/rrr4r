import {
  ActionRowBuilder,
  EmbedBuilder,
  StringSelectMenuBuilder,
  StringSelectMenuOptionBuilder
} from "discord.js";
import { COLORS } from "./constants.js";

export const PROJECT_KEYS = {
  station_city_1: "station_city_1",
  station_city_2: "station_city_2",
  station_farm: "station_farm",
  coffee_respawn: "coffee_respawn",
  restaurant_1: "restaurant_1",
  restaurant_2: "restaurant_2",
  showroom_1: "showroom_1",
  showroom_2: "showroom_2",
  showroom_3: "showroom_3"
};

export const PROJECT_DEFINITIONS = {
  [PROJECT_KEYS.station_city_1]: {
    key: PROJECT_KEYS.station_city_1,
    title: "محطه مدينه اولى",
    type: "station",
    color: 0x0b1f3a,
    weeklyIncome: 0
  },
  [PROJECT_KEYS.station_city_2]: {
    key: PROJECT_KEYS.station_city_2,
    title: "محطه مدينه ثانيه",
    type: "station",
    color: 0x0b1f3a,
    weeklyIncome: 0
  },
  [PROJECT_KEYS.station_farm]: {
    key: PROJECT_KEYS.station_farm,
    title: "محطه المزرعه",
    type: "station",
    color: 0x0b1f3a,
    weeklyIncome: 0
  },
  [PROJECT_KEYS.coffee_respawn]: {
    key: PROJECT_KEYS.coffee_respawn,
    title: "كوفي الريسبون",
    type: "coffee",
    color: 0x0b1f3a,
    weeklyIncome: 100000
  },
  [PROJECT_KEYS.restaurant_1]: {
    key: PROJECT_KEYS.restaurant_1,
    title: "مطعم 1",
    type: "restaurant",
    color: 0x0b1f3a,
    weeklyIncome: 50000
  },
  [PROJECT_KEYS.restaurant_2]: {
    key: PROJECT_KEYS.restaurant_2,
    title: "مطعم 2",
    type: "restaurant",
    color: 0x0b1f3a,
    weeklyIncome: 50000
  },
  [PROJECT_KEYS.showroom_1]: {
    key: PROJECT_KEYS.showroom_1,
    title: "معرض 1",
    type: "showroom",
    color: 0x0b1f3a,
    weeklyIncome: 0
  },
  [PROJECT_KEYS.showroom_2]: {
    key: PROJECT_KEYS.showroom_2,
    title: "معرض 2",
    type: "showroom",
    color: 0x0b1f3a,
    weeklyIncome: 0
  },
  [PROJECT_KEYS.showroom_3]: {
    key: PROJECT_KEYS.showroom_3,
    title: "معرض 3",
    type: "showroom",
    color: 0x0b1f3a,
    weeklyIncome: 0
  }
};

export const STATION_PROJECT_KEYS = [
  PROJECT_KEYS.station_city_1,
  PROJECT_KEYS.station_city_2,
  PROJECT_KEYS.station_farm
];

export const SHOWROOM_PROJECT_KEYS = [
  PROJECT_KEYS.showroom_1,
  PROJECT_KEYS.showroom_2,
  PROJECT_KEYS.showroom_3
];

export function getProjectDefinition(projectKey) {
  return PROJECT_DEFINITIONS[projectKey] ?? null;
}

export function listProjectDefinitions() {
  return Object.values(PROJECT_DEFINITIONS);
}

export function buildProjectChoices(filterFn = null) {
  return listProjectDefinitions()
    .filter((definition) => (typeof filterFn === "function" ? filterFn(definition) : true))
    .map((definition) => ({
      name: definition.title,
      value: definition.key
    }));
}

export function formatProjectCurrency(amount) {
  return `${Number(amount || 0).toLocaleString("en-US")} ريال`;
}

export function getProjectFuelDecaySteps() {
  return [15, 15, 15, 15, 15, 15, 10];
}

export function describeProjectBenefits(definition) {
  if (!definition) {
    return "• لا توجد مميزات مسجلة";
  }

  if (definition.type === "station") {
    return [
      "• كل عملية تعبئة تضيف دخلًا فعليًا إلى ميزانية المشروع عند ربط العمليات.",
      "• يمكن متابعة الوقود والميزانية بشكل مستمر.",
      "• عند انخفاض الوقود يجب التواصل مع العقاري بوب مارلي لإعادة التعبئة."
    ].join("\n");
  }

  if (definition.type === "coffee") {
    return [
      "• يضاف للمشروع دخل أسبوعي ثابت قدره 100,000 ريال.",
      "• يمكن إدارة الموظفين والميزانية من نفس الواجهة.",
      "• كل عملية مالية تسجل داخل سجل المشروع."
    ].join("\n");
  }

  if (definition.type === "restaurant") {
    return [
      "• يضاف للمشروع دخل أسبوعي ثابت قدره 50,000 ريال.",
      "• يمكن إدارة الموظفين والميزانية من نفس الواجهة.",
      "• كل عملية مالية تسجل داخل سجل المشروع."
    ].join("\n");
  }

  return [
    "• المعرض يسمح بعرض المركبات المملوكة للمشروع للتأجير أو البيع لاحقًا.",
    "• كل عملية مالية داخل المعرض تضاف إلى ميزانية المشروع.",
    "• يمكن تخصيص روم خاص للطلبات والتنبيهات."
  ].join("\n");
}

function formatMentionList(items = []) {
  return Array.isArray(items) && items.length ? items.map((id) => `<@${id}>`).join("، ") : "لا يوجد";
}

export function buildProjectsOverviewEmbed(projectRecords = []) {
  const map = new Map((Array.isArray(projectRecords) ? projectRecords : []).map((record) => [record.key, record]));

  return new EmbedBuilder()
    .setColor(COLORS.navy)
    .setTitle("📗 مشاريع عرب وورلد")
    .setDescription([
      "**هذه قائمة المشاريع الحالية داخل عرب وورلد.**",
      "",
      "**التعليمات والمميزات:**",
      "• المشاريع تكسب منها مال فعلي داخل النظام.",
      "• المحطات يضاف لها دخل التعبئة ويجب متابعة الوقود أسبوعيًا.",
      "• المطاعم يضاف لها 50,000 ريال أسبوعيًا.",
      "• الكوفي يضاف له 100,000 ريال أسبوعيًا.",
      "• المعارض مخصصة لإدارة السيارات والتأجير والبيع عبر النظام."
    ].join("\n"))
    .addFields(
      ...listProjectDefinitions().map((definition) => {
        const record = map.get(definition.key);
        const ownerText = record?.ownerUserId ? `<@${record.ownerUserId}>` : "المشروع غير مملوك";
        return {
          name: `🏢 ${definition.title}`,
          value: `**المالك:** ${ownerText}`,
          inline: false
        };
      })
    )
    .setFooter({ text: "Arab World • نظام المشاريع" })
    .setTimestamp();
}

export function buildProjectDashboardEmbed(definition, projectRecord, transactions = []) {
  const isStation = definition.type === "station";
  const latestTransactions = Array.isArray(transactions) && transactions.length
    ? transactions
        .slice(0, 5)
        .map((entry) => `• ${entry.label || entry.type} — ${formatProjectCurrency(entry.amount)} — <t:${Math.floor(new Date(entry.createdAt).getTime() / 1000)}:R>`)
        .join("\n")
    : "لا توجد عمليات حتى الآن";

  const fields = [
    { name: "💰 الميزانية", value: `**${formatProjectCurrency(projectRecord.budget)}**`, inline: true },
    { name: "🛡️ الإداريون", value: `**${formatMentionList(projectRecord.admins)}**`, inline: false },
    { name: "👥 الموظفون", value: `**${formatMentionList(projectRecord.employees)}**`, inline: false },
    { name: "🤝 الشركاء", value: `**${formatMentionList(projectRecord.partners)}**`, inline: false },
    isStation
      ? { name: "⛽ الوقود الحالي", value: `**${Number(projectRecord.fuelPercent || 0)}%**`, inline: true }
      : null,
    definition.type === "showroom"
      ? { name: "🚗 مركبات المعرض", value: `**${Array.isArray(projectRecord.showroomVehicles) ? projectRecord.showroomVehicles.length : 0}**`, inline: true }
      : null,
    definition.type === "showroom"
      ? { name: "📨 روم الطلبات", value: projectRecord.ordersChannelId ? `<#${projectRecord.ordersChannelId}>` : "غير محدد", inline: true }
      : null,
    { name: "🧾 سجل العمليات", value: latestTransactions, inline: false }
  ].filter(Boolean);

  return new EmbedBuilder()
    .setColor(definition.color)
    .setTitle(`🏢 ${definition.title}`)
    .setDescription([
      `**اسم المشروع:** ${projectRecord.name || definition.title}`,
      `**مالك المشروع:** ${projectRecord.ownerUserId ? `<@${projectRecord.ownerUserId}>` : "العقار غير مملوك"}`,
      "",
      "**المميزات والتعليمات:**",
      describeProjectBenefits(definition)
    ].join("\n"))
    .addFields(...fields)
    .setFooter({ text: "Arab World • لوحة المشروع" })
    .setTimestamp();
}

export function createProjectMenu(definition) {
  const options = [
    new StringSelectMenuOptionBuilder()
      .setLabel("💰 إضافة مال")
      .setDescription("إضافة مبلغ إلى ميزانية المشروع")
      .setValue(`project_add_money:${definition.key}`),
    new StringSelectMenuOptionBuilder()
      .setLabel("🏦 سحب مال")
      .setDescription("سحب مبلغ من ميزانية المشروع")
      .setValue(`project_withdraw_money:${definition.key}`),
    new StringSelectMenuOptionBuilder()
      .setLabel("👥 توظيف / فصل")
      .setDescription("إدارة الموظفين والشركاء لهذا المشروع")
      .setValue(`project_staff_manage:${definition.key}`),
    new StringSelectMenuOptionBuilder()
      .setLabel("👑 نقل ملكيه")
      .setDescription("نقل ملكية المشروع لشخص آخر")
      .setValue(`project_transfer_owner:${definition.key}`),
    new StringSelectMenuOptionBuilder()
      .setLabel("🧾 سجل العمليات")
      .setDescription("عرض سجل عمليات المشروع بشكل مفصل")
      .setValue(`project_transactions:${definition.key}`)
  ];

  if (definition.type === "station") {
    options.push(
      new StringSelectMenuOptionBuilder()
        .setLabel("⛽ تعبئة المحطة")
        .setDescription("يعرض تعليمات تعبئة الوقود")
        .setValue(`project_refill_notice:${definition.key}`)
    );
  }

  return new ActionRowBuilder().addComponents(
    new StringSelectMenuBuilder()
      .setCustomId(`project_menu:${definition.key}`)
      .setPlaceholder("اختر الخدمة المطلوبة")
      .addOptions(options)
  );
}

export function buildProjectFuelNoticeEmbed(projectName) {
  return new EmbedBuilder()
    .setColor(0xf59e0b)
    .setTitle("⛽ تعبئة وقود المشروع")
    .setDescription("**تواصل مع العقاري بوب مارلي لتعبئة محطتك بالوقود وتجديد المخزون.**")
    .addFields(
      { name: "🏢 المشروع", value: `**${projectName}**`, inline: true },
      { name: "📘 تعليمات", value: "**يجب متابعة نسبة الوقود أسبوعيًا، وعند انخفاضها عن 50% يجب طلب التعبئة مباشرة.**", inline: false },
      { name: "🚨 تنبيه", value: "**كل أسبوع ينخفض الوقود تلقائيًا حتى تحتاج لتعبئة جديدة.**", inline: false }
    )
    .setFooter({ text: "Arab World • وقود المشاريع" })
    .setTimestamp();
}

export function buildProjectMoneyPromptEmbed(definition, actionLabel) {
  return new EmbedBuilder()
    .setColor(definition.color)
    .setTitle(`💼 ${actionLabel} • ${definition.title}`)
    .setDescription("**استخدم أوامر الإدارة الخاصة بالمشاريع لتعديل ميزانية هذا المشروع بشكل مباشر.**")
    .addFields(
      { name: "🧾 التوجيه", value: `**العملية المطلوبة:** ${actionLabel}`, inline: true },
      { name: "📌 ملاحظة", value: "**كل عملية على المشروع يتم تسجيلها في سجل العمليات وترسل لوقًا عند التنفيذ.**", inline: false }
    )
    .setFooter({ text: "Arab World • إدارة المشاريع" })
    .setTimestamp();
}
