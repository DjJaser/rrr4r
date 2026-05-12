import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  EmbedBuilder,
  StringSelectMenuBuilder
} from "discord.js";
import {
  BANK_ACTIONS,
  MDT_ACTIONS,
  COLORS,
  GUN2_ACTIONS,
  M9_REQUIREMENTS,
  RESOURCE_CATALOG,
  RESOURCE_EMBED_IMAGE_URL,
  WEAPON_MARKET_IMAGE_URL
} from "./constants.js";

function formatCurrency(value) {
  return `${Number(value || 0).toLocaleString("en-US")} ريال`;
}

function buildFooter(text) {
  return { text: `Arab World • ${text}` };
}

export function buildBankEmbedPolished() {
  return new EmbedBuilder()
    .setColor(COLORS.navy)
    .setTitle("🏦 Arab World Bank")
    .setDescription([
      "**واجهة البنك الرسمية لإدارة حسابك داخل Arab World.**",
      "من هنا تقدر تفتح حسابك البنكي، تراجع رصيدك، تنفذ التحويلات، تطلب قرض، وتسدد المخالفات بشكل مرتب وآمن.",
      "",
      "**📌 ملاحظات مهمة:**",
      "• جميع العمليات البنكية موثقة داخل النظام",
      "• تأكد من صحة البيانات قبل الإرسال",
      "• بعض الطلبات تحتاج مراجعة واعتماد من الإدارة"
    ].join("\n"))
    .addFields(
      { name: "🧭 كيف تستخدم البنك", value: "اختر الخدمة المناسبة من القائمة بالأسفل ثم أكمل البيانات المطلوبة بدقة.", inline: false },
      { name: "🔒 الخصوصية", value: "المعلومات الحساسة مثل الرصيد والتحويلات تظهر لك بشكل خاص فقط.", inline: false }
    )
    .setFooter(buildFooter("خدمات بنكية آمنة"))
    .setTimestamp();
}

export function buildBankMenuPolished() {
  return new ActionRowBuilder().addComponents(
    new StringSelectMenuBuilder()
      .setCustomId("bank_menu")
      .setPlaceholder("اختر من خدمات البنك")
      .addOptions(
        { label: "إنشاء حساب بنكي", value: BANK_ACTIONS.create, emoji: "🏦", description: "فتح حساب جديد وتفعيل الرقم السري" },
        { label: "رصيدي البنكي", value: BANK_ACTIONS.balance, emoji: "💳", description: "عرض بيانات الحساب والرصيد الحالي" },
        { label: "استلام راتب", value: BANK_ACTIONS.salary, emoji: "💸", description: "استلام راتبك حسب أعلى رتبة مستحقة" },
        { label: "تحويل رصيد", value: BANK_ACTIONS.transfer, emoji: "📤", description: "إرسال مبلغ من حسابك البنكي" },
        { label: "طلب قرض", value: BANK_ACTIONS.loan, emoji: "🧾", description: "إرسال طلب قرض إلى الإدارة" },
        { label: "سداد المخالفات", value: BANK_ACTIONS.payFine, emoji: "🚨", description: "سداد مخالفة برقمها مباشرة" },
        { label: "رفع إيقاف الخدمات", value: BANK_ACTIONS.removeHold, emoji: "🛡️", description: "تقديم طلب مراجعة لرفع الإيقاف" }
      )
  );
}

export function buildBalanceEmbedPolished(account, member) {
  return new EmbedBuilder()
    .setColor(COLORS.navy)
    .setTitle("💳 معلومات حسابك البنكي")
    .setDescription([
      "**هذه البيانات خاصة بك ولا تظهر إلا لك.**",
      "**من هنا تقدر تراجع معلومات حسابك البنكي بشكل مباشر وواضح.**"
    ].join("\n"))
    .addFields(
      { name: "📛 الاسم", value: `**${account.name}**`, inline: true },
      { name: "🎂 العمر", value: `**${account.age}**`, inline: true },
      { name: "🌍 البلد", value: `**${account.country}**`, inline: true },
      { name: "🎮 روبلوكس", value: `**${account.robloxUsername || "غير مسجل"}**`, inline: true },
      { name: "🏦 رقم الحساب", value: `**${account.accountNumber}**`, inline: true },
      { name: "💰 الرصيد", value: `**${formatCurrency(account.balance)}**`, inline: true },
      { name: "👤 العضو", value: `**${member}**`, inline: true }
    )
    .setFooter(buildFooter("بيانات الحساب"))
    .setTimestamp();
}

export function buildAccountInfoEmbedPolished(account, member) {
  const resources = account.resources ?? {};
  const fallbackOwnedVehicles = Object.values(account.cars ?? {})
    .filter((vehicle) => vehicle?.name)
    .map((vehicle) => ({ name: vehicle.name }));
  const ownedVehicles = Array.isArray(account.ownedVehicles) && account.ownedVehicles.length
    ? account.ownedVehicles
    : fallbackOwnedVehicles;
  const carsCount = ownedVehicles.length;
  const weaponLines = Array.isArray(account.weaponLines) ? account.weaponLines : [];
  const transactionLines = Array.isArray(account.transactionLines) ? account.transactionLines : [];

  return new EmbedBuilder()
    .setColor(COLORS.navy)
    .setTitle("📘 معلومات الحساب البنكي")
    .setDescription("**هذه البطاقة تعرض جميع بيانات الحساب البنكي المسجلة للشخص بشكل كامل وواضح.**")
    .addFields(
      { name: "👤 العضو", value: `**${member}**`, inline: true },
      { name: "📛 الاسم البنكي", value: `**${account.name || "غير مسجل"}**`, inline: true },
      { name: "🏦 رقم الحساب", value: `**${account.accountNumber || "غير متوفر"}**`, inline: true },
      { name: "💰 الرصيد", value: `**${formatCurrency(account.balance)}**`, inline: true },
      { name: "🎮 يوزر روبلوكس", value: `**${account.robloxUsername || "غير مسجل"}**`, inline: true },
      { name: "🌍 البلد", value: `**${account.country || "غير مسجل"}**`, inline: true },
      { name: "🎂 العمر", value: `**${account.age || "غير مسجل"}**`, inline: true },
      { name: "🚗 عدد المركبات", value: `**${carsCount}**`, inline: true },
      { name: "🔫 عدد الأسلحة", value: `**${weaponLines.length}**`, inline: true },
      {
        name: "🧷 تفاصيل الأسلحة",
        value: weaponLines.length ? weaponLines.join("\n").slice(0, 1024) : "**لا يوجد أسلحة مسجلة**",
        inline: false
      },
      {
        name: "🚘 المركبات المملوكة",
        value: ownedVehicles.length ? ownedVehicles.map((vehicle) => `• **${vehicle.name}**`).join("\n").slice(0, 1024) : "**لا توجد مركبات مسجلة**",
        inline: false
      },
      {
        name: "📦 الموارد",
        value: [
          `${RESOURCE_CATALOG.coal.emoji} الفحم: **${Number(resources.coal || 0)}**`,
          `${RESOURCE_CATALOG.copper.emoji} النحاس: **${Number(resources.copper || 0)}**`,
          `${RESOURCE_CATALOG.iron.emoji} الحديد: **${Number(resources.iron || 0)}**`,
          `${RESOURCE_CATALOG.aluminum.emoji} الألمنيوم: **${Number(resources.aluminum || 0)}**`,
          `${RESOURCE_CATALOG.sulfur.emoji} الكبريت: **${Number(resources.sulfur || 0)}**`,
          `${RESOURCE_CATALOG.plastic.emoji} البلاستيك: **${Number(resources.plastic || 0)}**`
        ].join("\n"),
        inline: false
      },
      {
        name: "🧾 آخر العمليات",
        value: transactionLines.length
          ? transactionLines.join("\n").slice(0, 1024)
          : "**لا توجد عمليات حديثة**",
        inline: false
      },
      { name: "📝 المعلومات الشخصية", value: `**${account.info || "غير مسجلة"}**`, inline: false },
      {
        name: "🕒 تاريخ إنشاء الحساب",
        value: account.createdAt ? `**<t:${Math.floor(new Date(account.createdAt).getTime() / 1000)}:F>**` : "**غير متوفر**",
        inline: false
      }
    )
    .setFooter(buildFooter("تفاصيل الحساب البنكي"))
    .setTimestamp();
}

export function buildGunEmbedPolished() {
  return new EmbedBuilder()
    .setColor(COLORS.navy)
    .setTitle("🔫 بوابة الأسلحة")
    .setDescription([
      "**الواجهة الرسمية والمنظمة لشراء السلاح داخل Arab World.**",
      "قبل الشراء تأكد من توفر الرصيد البنكي والموارد المطلوبة كاملة حتى تتم العملية مباشرة بدون تأخير.",
      "",
      "**📌 تنبيهات مهمة:**",
      "• الشراء يخصم مباشرة من حسابك البنكي",
      "• استخدام السلاح بدون الرتبة المطلوبة يعرضك للعقوبة",
      "• جميع العمليات موثقة ومراقبة"
    ].join("\n"))
    .addFields(
      { name: "🧩 المتاح الآن", value: "**سلاح M9**", inline: true },
      { name: "💰 السعر", value: `**${formatCurrency(M9_REQUIREMENTS.cash)}**`, inline: true },
      { name: "📦 المتطلبات", value: "**رصيد + موارد تصنيع**", inline: true }
    )
    .setFooter(buildFooter("سوق الأسلحة"))
    .setTimestamp();
}

export function buildGunButtonPolished() {
  return new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId("gun_show_menu")
      .setLabel("فتح متجر الأسلحة")
      .setEmoji("🔓")
      .setStyle(ButtonStyle.Danger)
  );
}

export function buildGunPurchaseEmbedPolished() {
  return new EmbedBuilder()
    .setColor(COLORS.charcoal)
    .setTitle("🛒 شراء سلاح M9")
    .setDescription([
      "**هذا السلاح مرتبط برتبة خاصة داخل السيرفر.**",
      "عند إتمام الشراء سيتم خصم المبلغ والموارد من حسابك مباشرة ثم إضافة الرتبة الخاصة بالسلاح."
    ].join("\n"))
    .addFields(
      { name: "💰 السعر النقدي", value: `**${formatCurrency(M9_REQUIREMENTS.cash)}**`, inline: false },
      {
        name: "📦 الموارد المطلوبة",
        value: [
          `• فحم: **${M9_REQUIREMENTS.resources.coal}**`,
          `• نحاس: **${M9_REQUIREMENTS.resources.copper}**`,
          `• حديد: **${M9_REQUIREMENTS.resources.iron}**`,
          `• ألمنيوم: **${M9_REQUIREMENTS.resources.aluminum}**`,
          `• كبريت: **${M9_REQUIREMENTS.resources.sulfur}**`,
          `• بلاستيك: **${M9_REQUIREMENTS.resources.plastic}**`
        ].join("\n"),
        inline: false
      }
    )
    .setFooter(buildFooter("تأكيد الشراء"))
    .setTimestamp();
}

export function buildGunPurchaseButtonPolished() {
  return new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId("purchase_m9")
      .setLabel("شراء M9")
      .setEmoji("✅")
      .setStyle(ButtonStyle.Secondary)
  );
}

export function buildGun2EmbedPolished() {
  return new EmbedBuilder()
    .setColor(COLORS.navy)
    .setTitle("⛏️ مركز الموارد")
    .setDescription([
      "**واجهة مرتبة وسريعة لشراء الموارد الأساسية المستخدمة في التصنيع والشراء.**",
      "كل عملية تخصم القيمة مباشرة من رصيدك البنكي حسب الكمية المطلوبة، ويمكنك مراجعة مخزونك من نفس المكان."
    ].join("\n"))
    .addFields(
      { name: `${RESOURCE_CATALOG.coal.emoji} ${RESOURCE_CATALOG.coal.label}`, value: `**${formatCurrency(RESOURCE_CATALOG.coal.price)} للوحدة**`, inline: true },
      { name: `${RESOURCE_CATALOG.copper.emoji} ${RESOURCE_CATALOG.copper.label}`, value: `**${formatCurrency(RESOURCE_CATALOG.copper.price)} للوحدة**`, inline: true },
      { name: `${RESOURCE_CATALOG.iron.emoji} ${RESOURCE_CATALOG.iron.label}`, value: `**${formatCurrency(RESOURCE_CATALOG.iron.price)} للوحدة**`, inline: true },
      { name: `${RESOURCE_CATALOG.aluminum.emoji} ${RESOURCE_CATALOG.aluminum.label}`, value: `**${formatCurrency(RESOURCE_CATALOG.aluminum.price)} للوحدة**`, inline: true },
      { name: `${RESOURCE_CATALOG.sulfur.emoji} ${RESOURCE_CATALOG.sulfur.label}`, value: `**${formatCurrency(RESOURCE_CATALOG.sulfur.price)} للوحدة**`, inline: true },
      { name: `${RESOURCE_CATALOG.plastic.emoji} ${RESOURCE_CATALOG.plastic.label}`, value: `**${formatCurrency(RESOURCE_CATALOG.plastic.price)} للوحدة**`, inline: true },
      { name: "📦 ممتلكاتي", value: "**راجع مخزونك الحالي مباشرة من نفس الواجهة.**", inline: true }
    )
    .setImage(RESOURCE_EMBED_IMAGE_URL)
    .setFooter(buildFooter("سوق الموارد"))
    .setTimestamp();
}

export function buildGun2ButtonsPolished() {
  const resourceButtons = Object.values(GUN2_ACTIONS).map((action) => {
    if (action === GUN2_ACTIONS.inventory) {
      return new ButtonBuilder()
        .setCustomId(action)
        .setLabel("ممتلكاتي")
        .setEmoji("📦")
        .setStyle(ButtonStyle.Success);
    }

    const resource = RESOURCE_CATALOG[action.replace("buy_resource_", "")];
    return new ButtonBuilder()
      .setCustomId(action)
      .setLabel(resource.label)
      .setEmoji(resource.emoji)
      .setStyle(ButtonStyle.Primary);
  });

  return [
    new ActionRowBuilder().addComponents(...resourceButtons.slice(0, 5)),
    new ActionRowBuilder().addComponents(...resourceButtons.slice(5))
  ];
}

export function buildMdtEmbedPolished() {
  return new EmbedBuilder()
    .setColor(COLORS.navy)
    .setTitle("🚔 Arab World MDT")
    .setDescription([
      "**نظام إدارة المخالفات والسجلات الرسمية داخل السيرفر.**",
      "من هذه الواجهة تقدر تضيف مخالفة، تزيلها، تطبق إيقاف خدمات، أو ترفع الإيقاف بشكل مرتب وواضح.",
      "",
      "**📌 تنبيه:** كل عملية هنا يتم تسجيلها داخل السجل الإداري."
    ].join("\n"))
    .addFields(
      { name: "🧭 طريقة الاستخدام", value: "اختر الإجراء المناسب من الأزرار ثم أكمل البيانات المطلوبة بدقة.", inline: false },
      { name: "⏳ المدة النظامية", value: "يجب سداد المخالفات خلال 3 أيام لتفادي إيقاف الخدمات.", inline: false }
    )
    .setFooter(buildFooter("سجلات الشرطة"))
    .setTimestamp();
}

export function buildMdtButtonsPolished() {
  return new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId(MDT_ACTIONS.addFine).setLabel("إضافة مخالفة").setEmoji("🚨").setStyle(ButtonStyle.Danger),
    new ButtonBuilder().setCustomId(MDT_ACTIONS.removeFine).setLabel("إزالة مخالفة").setEmoji("🧾").setStyle(ButtonStyle.Secondary),
    new ButtonBuilder().setCustomId(MDT_ACTIONS.applyHold).setLabel("إيقاف خدمات").setEmoji("⛔").setStyle(ButtonStyle.Primary),
    new ButtonBuilder().setCustomId(MDT_ACTIONS.removeHold).setLabel("رفع الإيقاف").setEmoji("✅").setStyle(ButtonStyle.Success)
  );
}

export function buildFineDmEmbedPolished(fine) {
  return new EmbedBuilder()
    .setColor(COLORS.red)
    .setTitle("🚨 تم تسجيل مخالفة جديدة عليك")
    .setDescription([
      `**🧾 رقم المخالفة:** #${fine.fineId}`,
      `**💵 المبلغ:** ${formatCurrency(fine.amount)}`,
      `**👮 العسكري المسؤول:** ${fine.officerName}`,
      `**📌 السبب:** ${fine.reason}`,
      `**📂 النوع:** ${fine.violationType}`,
      "",
      "يمكنك السداد من خلال قائمة البنك ثم اختيار سداد المخالفات.",
      "**⏳ يجب السداد خلال 3 أيام لتفادي إيقاف الخدمات.**"
    ].join("\n"))
    .setFooter(buildFooter(`مخالفة رقم #${fine.fineId}`))
    .setTimestamp();
}

export function buildTransferConfirmationEmbedPolished(targetUser, amount) {
  return new EmbedBuilder()
    .setColor(COLORS.gold)
    .setTitle("💸 تأكيد التحويل البنكي")
    .setDescription([
      `**أنت على وشك تحويل \`${Number(amount).toLocaleString("en-US")}\` ريال إلى ${targetUser}.**`,
      "راجع البيانات جيدًا قبل تنفيذ العملية."
    ].join("\n"))
    .setFooter(buildFooter("تحويل بنكي"))
    .setTimestamp();
}

export function buildTransferReceivedDmEmbedPolished({ senderUser, amount, afterBalance }) {
  return new EmbedBuilder()
    .setColor(COLORS.navy)
    .setTitle("💸 وصلك تحويل بنكي")
    .setDescription([
      `**تم تحويل مبلغ \`${Number(amount || 0).toLocaleString("en-US")}\` ريال إلى حسابك.**`,
      `**المرسل:** ${senderUser}`,
      afterBalance != null ? `**الرصيد بعد الإضافة:** ${formatCurrency(afterBalance)}` : "",
      "",
      "**تمت إضافة المبلغ إلى حسابك البنكي بنجاح.**"
    ].filter(Boolean).join("\n"))
    .setFooter(buildFooter("إشعار تحويل بنكي"))
    .setTimestamp();
}

export function buildPoliceBankEmbedPolished() {
  return new EmbedBuilder()
    .setColor(COLORS.navy)
    .setTitle("🏛️ خدمات الداخلية البنكية")
    .setDescription([
      "**هذه اللوحة مخصصة للإجراءات الحكومية على الحسابات البنكية وممتلكات المواطنين.**",
      "",
      "**📌 التعليمات:**",
      "• استخدم كل إجراء بدقة وبعد التحقق من بيانات الشخص",
      "• كل العمليات هنا موثقة في لوق الداخلية",
      "• التجميد يمنع الخدمات البنكية حتى يتم رفعه",
      "• حجز الممتلكات يحجز سيارات وموارد وأسلحة الشخص حتى يتم فك الحجز"
    ].join("\n"))
    .addFields(
      { name: "💸 سحب حكومي", value: "خصم مبلغ من حساب مواطن مع إشعار رسمي.", inline: true },
      { name: "❄️ تجميد الحساب", value: "إيقاف خدمات البنك بالكامل عن الحساب.", inline: true },
      { name: "📦 حجز الممتلكات", value: "حجز الممتلكات المسجلة واستعادتها لاحقًا.", inline: true }
    )
    .setFooter(buildFooter("لوحة الداخلية"))
    .setTimestamp();
}

export function buildPoliceBankButtonsPolished() {
  return [
    new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId("police_bank_withdraw").setLabel("سحب مال شخص").setEmoji("💸").setStyle(ButtonStyle.Danger),
      new ButtonBuilder().setCustomId("police_bank_freeze").setLabel("تجميد حساب").setEmoji("❄️").setStyle(ButtonStyle.Primary),
      new ButtonBuilder().setCustomId("police_bank_unfreeze").setLabel("رفع التجميد").setEmoji("✅").setStyle(ButtonStyle.Success)
    ),
    new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId("police_bank_seize_assets").setLabel("حجز ممتلكات").setEmoji("📦").setStyle(ButtonStyle.Secondary),
      new ButtonBuilder().setCustomId("police_bank_release_assets").setLabel("رفع الحجز").setEmoji("🗝️").setStyle(ButtonStyle.Success)
    )
  ];
}

export function buildGovernmentDebitDmEmbedPolished({ amount, beforeBalance, afterBalance, executorLabel, reason }) {
  return new EmbedBuilder()
    .setColor(COLORS.red)
    .setTitle("🏛️ إشعار حكومي بسحب من الحساب")
    .setDescription([
      `**تم سحب مبلغ ${formatCurrency(amount)} من رصيدك البنكي من قبل الحكومة.**`,
      `**الرصيد قبل السحب:** ${formatCurrency(beforeBalance)}`,
      `**الرصيد بعد السحب:** ${formatCurrency(afterBalance)}`,
      `**المنفذ:** ${executorLabel}`,
      reason ? `**السبب:** ${reason}` : "",
      "",
      "**إذا كان لديك استفسار توجه إلى مركز الشرطة.**"
    ].filter(Boolean).join("\n"))
    .setFooter(buildFooter("إشعار حكومي"))
    .setTimestamp();
}

export function buildBankFreezeDmEmbedPolished({ executorLabel, reason }) {
  return new EmbedBuilder()
    .setColor(COLORS.red)
    .setTitle("❄️ تم تجميد حسابك البنكي")
    .setDescription([
      "**تم تجميد حسابك البنكي وإيقاف الخدمات البنكية عليه من قبل الحكومة.**",
      `**المنفذ:** ${executorLabel}`,
      reason ? `**السبب:** ${reason}` : "",
      "",
      "**للاستفسار توجه إلى مركز الشرطة.**"
    ].filter(Boolean).join("\n"))
    .setFooter(buildFooter("تجميد حساب"))
    .setTimestamp();
}

export function buildBankUnfreezeDmEmbedPolished({ executorLabel, reason }) {
  return new EmbedBuilder()
    .setColor(COLORS.emerald)
    .setTitle("✅ تم رفع تجميد حسابك البنكي")
    .setDescription([
      "**تم رفع التجميد عن حسابك البنكي ويمكنك الآن استخدام خدمات البنك بشكل طبيعي.**",
      `**المنفذ:** ${executorLabel}`,
      reason ? `**الملاحظة:** ${reason}` : ""
    ].filter(Boolean).join("\n"))
    .setFooter(buildFooter("رفع التجميد"))
    .setTimestamp();
}

export function buildAssetsSeizedDmEmbedPolished({ executorLabel, reason }) {
  return new EmbedBuilder()
    .setColor(COLORS.red)
    .setTitle("📦 تم حجز ممتلكاتك")
    .setDescription([
      "**تم حجز ممتلكاتك المسجلة من قبل الحكومة بشكل مؤقت.**",
      `**المنفذ:** ${executorLabel}`,
      reason ? `**السبب:** ${reason}` : "",
      "",
      "**للاستفسار توجه إلى مركز الشرطة.**"
    ].filter(Boolean).join("\n"))
    .setFooter(buildFooter("حجز ممتلكات"))
    .setTimestamp();
}

export function buildAssetsReleasedDmEmbedPolished({ executorLabel, reason }) {
  return new EmbedBuilder()
    .setColor(COLORS.emerald)
    .setTitle("🗝️ تم رفع الحجز عن ممتلكاتك")
    .setDescription([
      "**تم رفع الحجز عن ممتلكاتك ويمكنك الآن استخدام ممتلكاتك من جديد.**",
      `**المنفذ:** ${executorLabel}`,
      reason ? `**الملاحظة:** ${reason}` : ""
    ].filter(Boolean).join("\n"))
    .setFooter(buildFooter("رفع الحجز"))
    .setTimestamp();
}

export function buildLoanEmbedPolished({ member, account, amount }) {
  return new EmbedBuilder()
    .setColor(COLORS.gold)
    .setTitle("🧾 طلب قرض جديد")
    .setDescription("**تم إرسال طلب جديد ويحتاج مراجعة الإدارة قبل الاعتماد.**")
    .addFields(
      { name: "👤 المتقدم", value: `${member}`, inline: true },
      { name: "🏦 رقم الحساب", value: `**${account.accountNumber}**`, inline: true },
      { name: "💵 مبلغ القرض", value: `**${formatCurrency(amount)}**`, inline: true },
      { name: "📛 الاسم", value: `**${account.name}**`, inline: true },
      { name: "🌍 البلد", value: `**${account.country}**`, inline: true },
      { name: "📌 المراجعة", value: "**يرجى دراسة الطلب واتخاذ القرار المناسب.**", inline: false }
    )
    .setFooter(buildFooter("طلبات القروض"))
    .setTimestamp();
}

export function buildHoldRequestEmbedPolished({ member, fineCount, paidStatus }) {
  return new EmbedBuilder()
    .setColor(COLORS.gold)
    .setTitle("🛡️ طلب رفع إيقاف خدمات")
    .setDescription("**تم إرسال طلب جديد ويحتاج مراجعة الإدارة.**")
    .addFields(
      { name: "👤 صاحب الطلب", value: `${member}`, inline: true },
      { name: "🚨 عدد المخالفات", value: `**${fineCount}**`, inline: true },
      { name: "💳 حالة السداد", value: `**${paidStatus}**`, inline: true }
    )
    .setFooter(buildFooter("طلبات الخدمة"))
    .setTimestamp();
}

export function buildServiceHoldDecisionEmbedPolished({ approved, reason }) {
  return new EmbedBuilder()
    .setColor(approved ? COLORS.emerald : COLORS.red)
    .setTitle(approved ? "✅ تم رفع إيقاف الخدمات" : "⛔ تم رفض رفع إيقاف الخدمات")
    .setDescription(
      approved
        ? [
            "**تمت الموافقة على طلبك ورفع إيقاف الخدمات عن حسابك.**",
            "**يمكنك الآن العودة لاستخدام المتاجر والأنظمة بشكل طبيعي.**"
          ].join("\n")
        : [
            "**تم رفض طلب رفع إيقاف الخدمات.**",
            `**📌 السبب:** ${reason || "لم يتم توضيح السبب."}`
          ].join("\n")
    )
    .setFooter(buildFooter("إدارة الخدمات"))
    .setTimestamp();
}


