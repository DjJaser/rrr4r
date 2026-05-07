import {
  ActionRowBuilder,
  AttachmentBuilder,
  ButtonBuilder,
  ButtonStyle,
  EmbedBuilder,
  StringSelectMenuBuilder,
  StringSelectMenuOptionBuilder
} from "discord.js";
import {
  BANK_ACTIONS,
  BANK_BALANCE_IMAGE_URL,
  CAR_ACTIONS,
  COLORS,
  FINE_NOTICE_IMAGE_URL,
  GUN2_ACTIONS,
  MDT_ACTIONS,
  M9_REQUIREMENTS,
  RESOURCE_CATALOG,
  RESOURCE_EMBED_IMAGE_URL,
  WEAPON_MARKET_IMAGE_URL
} from "./constants.js";
import fs from "fs";
import path from "path";
import zlib from "zlib";

function formatCurrency(value) {
  return `${Number(value || 0).toLocaleString("en-US")} ريال`;
}

function buildFooter(text) {
  return { text: `Arab World • ${text}` };
}

const DIGIT_FONT = {
  ",": ["00000", "00000", "00000", "00000", "00110", "00110", "00100"],
  "0": ["01110", "10001", "10011", "10101", "11001", "10001", "01110"],
  "1": ["00100", "01100", "00100", "00100", "00100", "00100", "01110"],
  "2": ["01110", "10001", "00001", "00010", "00100", "01000", "11111"],
  "3": ["11110", "00001", "00001", "01110", "00001", "00001", "11110"],
  "4": ["00010", "00110", "01010", "10010", "11111", "00010", "00010"],
  "5": ["11111", "10000", "10000", "11110", "00001", "00001", "11110"],
  "6": ["01110", "10000", "10000", "11110", "10001", "10001", "01110"],
  "7": ["11111", "00001", "00010", "00100", "01000", "01000", "01000"],
  "8": ["01110", "10001", "10001", "01110", "10001", "10001", "01110"],
  "9": ["01110", "10001", "10001", "01111", "00001", "00001", "01110"]
};

function crc32(buffer) {
  let crc = 0xffffffff;
  for (let i = 0; i < buffer.length; i += 1) {
    crc ^= buffer[i];
    for (let j = 0; j < 8; j += 1) {
      const mask = -(crc & 1);
      crc = (crc >>> 1) ^ (0xedb88320 & mask);
    }
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function pngChunk(type, data) {
  const typeBuffer = Buffer.from(type, "ascii");
  const lengthBuffer = Buffer.alloc(4);
  lengthBuffer.writeUInt32BE(data.length, 0);
  const crcBuffer = Buffer.alloc(4);
  crcBuffer.writeUInt32BE(crc32(Buffer.concat([typeBuffer, data])), 0);
  return Buffer.concat([lengthBuffer, typeBuffer, data, crcBuffer]);
}

function createPng(width, height, pixels) {
  const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8;
  ihdr[9] = 6;
  ihdr[10] = 0;
  ihdr[11] = 0;
  ihdr[12] = 0;

  const stride = width * 4;
  const raw = Buffer.alloc((stride + 1) * height);
  for (let y = 0; y < height; y += 1) {
    raw[y * (stride + 1)] = 0;
    pixels.copy(raw, y * (stride + 1) + 1, y * stride, (y + 1) * stride);
  }

  const compressed = zlib.deflateSync(raw);
  return Buffer.concat([
    signature,
    pngChunk("IHDR", ihdr),
    pngChunk("IDAT", compressed),
    pngChunk("IEND", Buffer.alloc(0))
  ]);
}

function setPixel(buffer, width, x, y, color) {
  if (x < 0 || y < 0) {
    return;
  }
  const height = buffer.length / (width * 4);
  if (x >= width || y >= height) {
    return;
  }
  const index = (y * width + x) * 4;
  buffer[index] = color[0];
  buffer[index + 1] = color[1];
  buffer[index + 2] = color[2];
  buffer[index + 3] = color[3] ?? 255;
}

function fillRect(buffer, width, x, y, rectWidth, rectHeight, color) {
  for (let py = y; py < y + rectHeight; py += 1) {
    for (let px = x; px < x + rectWidth; px += 1) {
      setPixel(buffer, width, px, py, color);
    }
  }
}

function drawHorizontalLine(buffer, width, x, y, lineWidth, thickness, color) {
  fillRect(buffer, width, x, y, lineWidth, thickness, color);
}

function drawVerticalLine(buffer, width, x, y, lineHeight, thickness, color) {
  fillRect(buffer, width, x, y, thickness, lineHeight, color);
}

function drawDigit(buffer, width, digit, x, y, scale, color) {
  const glyph = DIGIT_FONT[digit];
  if (!glyph) {
    return;
  }

  for (let row = 0; row < glyph.length; row += 1) {
    for (let col = 0; col < glyph[row].length; col += 1) {
      if (glyph[row][col] === "1") {
        fillRect(buffer, width, x + col * scale, y + row * scale, scale, scale, color);
      }
    }
  }
}

function drawNumber(buffer, width, value, x, y, scale, color, gap = 2) {
  const text = String(value || "0").replace(/[^\d,]/g, "") || "0";
  let cursor = x;
  for (const char of text) {
    drawDigit(buffer, width, char, cursor, y, scale, color);
    cursor += 5 * scale + gap * scale;
  }
}

function measureNumberWidth(value, scale, gap = 2) {
  const text = String(value || "0").replace(/[^\d,]/g, "") || "0";
  return Math.max(0, text.length * (5 * scale + gap * scale) - gap * scale);
}

function drawNumberRightAligned(buffer, width, value, rightX, y, scale, color, gap = 2) {
  const text = String(value || "0").replace(/[^\d,]/g, "") || "0";
  const textWidth = measureNumberWidth(text, scale, gap);
  drawNumber(buffer, width, text, rightX - textWidth, y, scale, color, gap);
}

function formatCardNumber(value) {
  return String(value || "0")
    .replace(/\D/g, "")
    .replace(/\B(?=(\d{3})+(?!\d))/g, ",");
}

function escapeSvgText(value) {
  return String(value || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function buildBalanceCardPng(account) {
  const width = 1400;
  const height = 820;
  const pixels = Buffer.alloc(width * height * 4);

  for (let y = 0; y < height; y += 1) {
    const mix = y / (height - 1);
    const r = Math.round(8 + (10 * mix));
    const g = Math.round(22 + (22 * mix));
    const b = Math.round(45 + (55 * mix));
    for (let x = 0; x < width; x += 1) {
      const idx = (y * width + x) * 4;
      pixels[idx] = r;
      pixels[idx + 1] = g;
      pixels[idx + 2] = b;
      pixels[idx + 3] = 255;
    }
  }

  fillRect(pixels, width, 72, 72, 1256, 676, [255, 255, 255, 18]);
  fillRect(pixels, width, 86, 86, 1228, 648, [7, 16, 33, 255]);
  fillRect(pixels, width, 86, 86, 1228, 10, [213, 171, 83, 255]);
  fillRect(pixels, width, 980, 86, 334, 648, [213, 171, 83, 24]);
  fillRect(pixels, width, 112, 118, 160, 112, [214, 175, 93, 255]);
  fillRect(pixels, width, 132, 140, 120, 68, [246, 225, 173, 255]);
  fillRect(pixels, width, 120, 300, 1160, 180, [255, 255, 255, 12]);
  fillRect(pixels, width, 120, 520, 1160, 150, [255, 255, 255, 8]);
  drawHorizontalLine(pixels, width, 120, 276, 1160, 5, [255, 255, 255, 42]);
  drawHorizontalLine(pixels, width, 120, 500, 1160, 5, [255, 255, 255, 42]);
  drawVerticalLine(pixels, width, 944, 120, 560, 4, [255, 255, 255, 26]);

  for (let i = 0; i < 7; i += 1) {
    fillRect(pixels, width, 1020 + i * 32, 150 + i * 22, 12, 12, [255, 255, 255, 38]);
  }

  const accountNumber = String(account?.accountNumber || "0").replace(/\D/g, "") || "0";
  const balanceNumber = formatCardNumber(Number(account?.balance || 0));

  drawNumberRightAligned(pixels, width, accountNumber, 1220, 328, 18, [244, 248, 255, 255], 3);
  drawNumberRightAligned(pixels, width, balanceNumber, 1220, 548, 20, [246, 220, 140, 255], 3);

  return createPng(width, height, pixels);
}

export async function buildBalanceCardAttachment(account) {
  const templatePath = path.resolve(process.cwd(), "assets", "bank-balance-template.png");

  try {
    if (fs.existsSync(templatePath)) {
      const sharpModule = await import("sharp");
      const sharp = sharpModule.default;
      const balanceText = escapeSvgText(Number(account?.balance || 0).toLocaleString("en-US"));
      const accountText = escapeSvgText(String(account?.accountNumber || "0").replace(/\D/g, "") || "0");
      const ownerName = escapeSvgText(account?.name || "صاحب الحساب");
      const ownerInfo = escapeSvgText([
        account?.robloxUsername ? `روبلوكس: ${account.robloxUsername}` : "",
        account?.country ? `البلد: ${account.country}` : ""
      ].filter(Boolean).join(" • "));

      const svg = `
        <svg width="1578" height="996" viewBox="0 0 1578 996" xmlns="http://www.w3.org/2000/svg">
          <rect x="155" y="452" width="280" height="118" rx="24" fill="#0b1626" fill-opacity="0.94"/>
          <rect x="155" y="648" width="250" height="108" rx="24" fill="#0b1626" fill-opacity="0.94"/>
          <rect x="150" y="790" width="520" height="132" rx="24" fill="#0b1626" fill-opacity="0.88"/>
          <text x="295" y="535" text-anchor="middle" font-family="Arial, Tahoma, sans-serif" font-size="94" font-weight="700" fill="#b79458">${balanceText}</text>
          <text x="280" y="728" text-anchor="middle" font-family="Arial, Tahoma, sans-serif" font-size="86" font-weight="700" fill="#b79458">${accountText}</text>
          <text x="410" y="835" text-anchor="middle" font-family="Arial, Tahoma, sans-serif" font-size="44" font-weight="700" fill="#d8b16a">${ownerName}</text>
          <text x="410" y="878" text-anchor="middle" font-family="Arial, Tahoma, sans-serif" font-size="26" font-weight="600" fill="#cfb991">${ownerInfo}</text>
        </svg>
      `;

      const buffer = await sharp(templatePath)
        .composite([{ input: Buffer.from(svg) }])
        .png()
        .toBuffer();

      return new AttachmentBuilder(buffer, { name: "bank-balance-card.png" });
    }
  } catch {
    // Fall back to the internal generator if the image library is unavailable.
  }

  return new AttachmentBuilder(buildBalanceCardPng(account), { name: "bank-balance-card.png" });
}

export function buildPrivateNoticeEmbed({ title, description, color = COLORS.charcoal }) {
  return new EmbedBuilder()
    .setColor(color)
    .setTitle(title)
    .setDescription(description)
    .setFooter(buildFooter("رسالة خاصة"));
}

export function buildServiceHoldDecisionEmbed({ approved, reason }) {
  return new EmbedBuilder()
    .setColor(approved ? COLORS.emerald : COLORS.red)
    .setTitle(approved ? "تم رفع إيقاف الخدمات" : "تم رفض رفع إيقاف الخدمات")
    .setDescription(
      approved
        ? [
            "**تمت الموافقة على طلبك ورفع إيقاف الخدمات عن حسابك.**",
            "**يمكنك الآن العودة لاستخدام المتاجر والأنظمة بشكل طبيعي.**"
          ].join("\n")
        : [
            "**تم رفض طلب رفع إيقاف الخدمات.**",
            `**السبب:** ${reason || "لم يتم توضيح السبب."}`
          ].join("\n")
    )
    .setFooter(buildFooter("إدارة الخدمات"))
    .setTimestamp();
}

export function buildServiceHoldAppliedEmbed() {
  return new EmbedBuilder()
    .setColor(COLORS.red)
    .setTitle("تم تطبيق إيقاف الخدمات")
    .setDescription([
      "**تم تقييد حسابك مؤقتًا بإيقاف الخدمات، لذلك لن تتمكن من شراء الموارد أو الأسلحة حتى تتم المعالجة.**",
      "",
      "**كيف تزيل الإيقاف:**",
      "• افتح `/bank`",
      "• اختر `رفع إيقاف الخدمات`",
      "• عبئ النموذج بدقة مع عدد المخالفات وحالة السداد",
      "• انتظر مراجعة الإدارة والرد عليك في الخاص",
      "",
      "**تنبيهات مهمة:**",
      "• تأكد من سداد ما عليك قبل الإرسال",
      "• أي بيانات غير صحيحة قد تؤخر قبول الطلب"
    ].join("\n"))
    .setFooter(buildFooter("إيقاف الخدمات"))
    .setTimestamp();
}

export function buildResourceTransferDmEmbed({ senderLabel, resourceKey, quantity }) {
  const resource = RESOURCE_CATALOG[resourceKey];

  return new EmbedBuilder()
    .setColor(COLORS.navy)
    .setTitle("وصلك تحويل موارد")
    .setDescription([
      `**المرسل:** ${senderLabel}`,
      `**المورد:** ${resource?.emoji || "📦"} ${resource?.label || resourceKey}`,
      `**الكمية:** ${quantity}`,
      "",
      "**تمت إضافة الموارد إلى مخزونك مباشرة.**"
    ].join("\n"))
    .setImage(RESOURCE_EMBED_IMAGE_URL)
    .setFooter(buildFooter("تحويل الموارد"))
    .setTimestamp();
}

export function buildWeaponPurchasedDmEmbed({ expiresAt, permanent = false, weaponLabel = "M9" }) {
  const expireText = expiresAt ? `<t:${Math.floor(new Date(expiresAt).getTime() / 1000)}:F>` : "غير محدد";
  return new EmbedBuilder()
    .setColor(COLORS.emerald)
    .setTitle("تم شراء السلاح بنجاح")
    .setDescription([
      `**تمت إضافة سلاح ${weaponLabel} إلى حسابك بنجاح.**`,
      permanent
        ? "**نوع التصريح:** لا نهائي"
        : `**تاريخ الانتهاء المتوقع:** ${expireText}`,
      permanent
        ? "**تنبيه:** هذا السلاح لا نهائي ولن تنتهي صلاحيته تلقائيًا.**"
        : "**تنبيه:** عند انتهاء الصلاحية سيتم سحب رتبة السلاح تلقائيًا.**"
    ].join("\n"))
    .setFooter(buildFooter("إشعار السلاح"))
    .setTimestamp();
}

export function buildWeaponBrokenDmEmbed() {
  return new EmbedBuilder()
    .setColor(COLORS.red)
    .setTitle("انتهت صلاحية سلاحك")
    .setDescription([
      "**انتهت صلاحية السلاح وتمت إزالة الرتبة المرتبطة به.**",
      "",
      "**للعودة من جديد:**",
      "1. اشتر الموارد من `/gun2` أو `/موارد`",
      "2. تأكد من توفر الرصيد الكافي",
      "3. اشتر السلاح من `/gun` أو اصنعه من طاولة التصنيع"
    ].join("\n"))
    .setFooter(buildFooter("انتهاء السلاح"))
    .setTimestamp();
}

export function buildBankEmbed() {
  return new EmbedBuilder()
    .setColor(COLORS.navy)
    .setTitle("Arab World Bank")
    .setDescription([
      "**واجهة البنك الرسمية داخل Arab World.**",
      "من هنا يمكنك فتح حسابك البنكي، إدارة رصيدك، تنفيذ التحويلات، تقديم طلب قرض، وسداد المخالفات.",
      "",
      "**ملاحظات مهمة:**",
      "• جميع العمليات موثقة داخل النظام",
      "• تأكد من صحة البيانات قبل الإرسال",
      "• بعض الطلبات تحتاج مراجعة واعتماد من الإدارة"
    ].join("\n"))
    .addFields(
      { name: "كيف تستخدم البنك", value: "اختر الخدمة المناسبة من القائمة بالأسفل ثم أكمل البيانات المطلوبة بدقة.", inline: false },
      { name: "الخصوصية", value: "المعلومات الحساسة مثل الرصيد والتحويلات تظهر لك بشكل خاص فقط.", inline: false }
    )
    .setFooter(buildFooter("خدمات بنكية آمنة"))
    .setTimestamp();
}

export function buildBankMenu() {
  return new ActionRowBuilder().addComponents(
    new StringSelectMenuBuilder()
      .setCustomId("bank_menu")
      .setPlaceholder("اختر من خدمات البنك")
      .addOptions(
        { label: "إنشاء حساب بنكي", value: BANK_ACTIONS.create, emoji: "🏦", description: "فتح حساب جديد وتفعيل الرقم السري" },
        { label: "رصيدي البنكي", value: BANK_ACTIONS.balance, emoji: "💳", description: "عرض بيانات الحساب والرصيد الحالي" },
        { label: "استلام راتب", value: BANK_ACTIONS.salary, emoji: "💼", description: "استلام راتبك حسب أعلى رتبة مستحقة" },
        { label: "تحويل رصيد", value: BANK_ACTIONS.transfer, emoji: "💸", description: "إرسال مبلغ من حسابك البنكي" },
        { label: "طلب قرض", value: BANK_ACTIONS.loan, emoji: "🧾", description: "إرسال طلب قرض إلى الإدارة" },
        { label: "سداد المخالفات", value: BANK_ACTIONS.payFine, emoji: "🚨", description: "سداد مخالفة برقمها مباشرة" },
        { label: "رفع إيقاف الخدمات", value: BANK_ACTIONS.removeHold, emoji: "🛡️", description: "تقديم طلب مراجعة لرفع الإيقاف" }
      )
  );
}

export function buildSalaryReceiptDmEmbed({ amount, beforeBalance, afterBalance, roleId, scheduleLabel }) {
  const embed = new EmbedBuilder()
    .setColor(COLORS.emerald)
    .setTitle("تم استلام الراتب")
    .setDescription([
      `**الرتبة المعتمدة:** <@&${roleId}>`,
      `**نوع الراتب:** ${scheduleLabel}`,
      `**قيمة الراتب:** ${formatCurrency(amount)}`,
      `**الرصيد قبل:** ${formatCurrency(beforeBalance)}`,
      `**الرصيد بعد:** ${formatCurrency(afterBalance)}`
    ].join("\n"))
    .setFooter(buildFooter("إشعار الراتب"))
    .setTimestamp();

  if (BANK_BALANCE_IMAGE_URL) {
    embed.setImage(BANK_BALANCE_IMAGE_URL);
  }

  return embed;
}

export function buildPinDmEmbed(pin) {
  return new EmbedBuilder()
    .setColor(COLORS.navy)
    .setTitle("الرقم السري المؤقت")
    .setDescription([
      `**رمز التفعيل الخاص بك هو:** \`${pin}\``,
      "استخدم هذا الرمز داخل زر تأكيد فتح الحساب لإكمال العملية.",
      "**لا تشارك هذا الرمز مع أي شخص.**"
    ].join("\n"))
    .setFooter(buildFooter("OTP Verification"))
    .setTimestamp();
}

export function buildBalanceEmbed(account, member) {
  return new EmbedBuilder()
    .setColor(COLORS.navy)
    .setTitle("معلومات حسابك البنكي")
    .setDescription([
      "**هذه البيانات خاصة بك ولا تظهر إلا لك.**",
      "**يمكنك من هنا مراجعة معلومات حسابك البنكي بشكل مباشر وواضح.**"
    ].join("\n"))
    .addFields(
      { name: "الاسم", value: `**${account.name}**`, inline: true },
      { name: "العمر", value: `**${account.age}**`, inline: true },
      { name: "البلد", value: `**${account.country}**`, inline: true },
      { name: "روبلوكس", value: `**${account.robloxUsername || "غير مسجل"}**`, inline: true },
      { name: "رقم الحساب", value: `**${account.accountNumber}**`, inline: true },
      { name: "الرصيد", value: `**${formatCurrency(account.balance)}**`, inline: true },
      { name: "العضو", value: `**${member}**`, inline: true }
    )
    .setFooter(buildFooter("بيانات الحساب"))
    .setTimestamp();
}

export function buildTransferConfirmationEmbed(targetUser, amount) {
  return new EmbedBuilder()
    .setColor(COLORS.gold)
    .setTitle("تأكيد التحويل البنكي")
    .setDescription([
      `**أنت على وشك تحويل \`${Number(amount).toLocaleString("en-US")}\` ريال إلى ${targetUser}.**`,
      "راجع البيانات جيدًا قبل تنفيذ العملية."
    ].join("\n"))
    .setFooter(buildFooter("تحويل بنكي"))
    .setTimestamp();
}

export function buildTransferButtons(transferId) {
  return new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId(`transfer_confirm:${transferId}`).setLabel("موافق").setStyle(ButtonStyle.Success),
    new ButtonBuilder().setCustomId(`transfer_cancel:${transferId}`).setLabel("إلغاء").setStyle(ButtonStyle.Danger)
  );
}

export function buildLoanEmbed({ member, account, amount }) {
  return new EmbedBuilder()
    .setColor(COLORS.gold)
    .setTitle("طلب قرض جديد")
    .setDescription("**تم إرسال طلب جديد ويحتاج مراجعة الإدارة قبل الاعتماد.**")
    .addFields(
      { name: "المتقدم", value: `${member}`, inline: true },
      { name: "رقم الحساب", value: `**${account.accountNumber}**`, inline: true },
      { name: "مبلغ القرض", value: `**${formatCurrency(amount)}**`, inline: true },
      { name: "الاسم", value: `**${account.name}**`, inline: true },
      { name: "البلد", value: `**${account.country}**`, inline: true },
      { name: "المراجعة", value: "**يرجى دراسة الطلب واتخاذ القرار المناسب.**", inline: false }
    )
    .setFooter(buildFooter("طلبات القروض"))
    .setTimestamp();
}

export function buildLoanButtons(loanId) {
  return new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId(`loan_approve:${loanId}`).setLabel("موافقة").setStyle(ButtonStyle.Success),
    new ButtonBuilder().setCustomId(`loan_reject:${loanId}`).setLabel("رفض").setStyle(ButtonStyle.Danger),
    new ButtonBuilder().setCustomId(`loan_reason:${loanId}`).setLabel("رفض مع سبب").setStyle(ButtonStyle.Secondary)
  );
}

export function buildGunEmbed() {
  return new EmbedBuilder()
    .setColor(COLORS.navy)
    .setTitle("بوابة الأسلحة")
    .setDescription([
      "**الواجهة الرسمية والمنظمة لشراء السلاح داخل Arab World.**",
      "قبل الشراء تأكد من توفر الرصيد البنكي والموارد المطلوبة كاملة حتى تتم العملية مباشرة بدون تأخير.",
      "",
      "**مهم:**",
      "• الشراء يخصم مباشرة من حسابك البنكي",
      "• استخدام السلاح بدون الرتبة المطلوبة يعرضك للعقوبة",
      "• جميع العمليات موثقة ومراقبة"
    ].join("\n"))
    .addFields(
      { name: "المتاح الآن", value: "**سلاح M9**", inline: true },
      { name: "السعر", value: `**${formatCurrency(M9_REQUIREMENTS.cash)}**`, inline: true },
      { name: "المتطلبات", value: "**رصيد + موارد تصنيع**", inline: true }
    )
    .setFooter(buildFooter("سوق الأسلحة"))
    .setTimestamp();
}

export function buildGunButton() {
  return new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId("gun_show_menu")
      .setLabel("فتح متجر الأسلحة")
      .setEmoji("🔫")
      .setStyle(ButtonStyle.Danger)
  );
}

export function buildGunPurchaseEmbed() {
  return new EmbedBuilder()
    .setColor(COLORS.charcoal)
    .setTitle("شراء سلاح M9")
    .setDescription([
      "**هذا السلاح مرتبط برتبة خاصة داخل السيرفر.**",
      "عند إتمام الشراء سيتم خصم المبلغ والموارد من حسابك مباشرة."
    ].join("\n"))
    .addFields(
      { name: "السعر النقدي", value: `**${formatCurrency(M9_REQUIREMENTS.cash)}**`, inline: false },
      {
        name: "الموارد المطلوبة",
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

export function buildGunPurchaseButton() {
  return new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId("purchase_m9")
      .setLabel("شراء M9")
      .setStyle(ButtonStyle.Secondary)
  );
}

export function buildGun2Embed() {
  return new EmbedBuilder()
    .setColor(COLORS.navy)
    .setTitle("مركز الموارد")
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

export function buildGun2Buttons() {
  const resourceButtons = Object.values(GUN2_ACTIONS).map((action) => {
    if (action === GUN2_ACTIONS.inventory) {
      return new ButtonBuilder()
        .setCustomId(action)
        .setLabel("ممتلكاتي")
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

export function buildInventoryEmbed(account) {
  return new EmbedBuilder()
    .setColor(COLORS.gold)
    .setTitle("مخزونك من الموارد")
    .setDescription("**هذا هو المخزون الحالي المرتبط بحسابك، ويستخدم في الشراء والتصنيع وجميع العمليات المرتبطة بالموارد.**")
    .addFields(
      ...Object.values(RESOURCE_CATALOG).map((resource) => ({
        name: `${resource.emoji} ${resource.label}`,
        value: `**${account.resources[resource.key]}**`,
        inline: true
      }))
    )
    .setImage(RESOURCE_EMBED_IMAGE_URL)
    .setFooter(buildFooter("مستودع الموارد"))
    .setTimestamp();
}

export function buildMdtEmbed() {
  return new EmbedBuilder()
    .setColor(COLORS.navy)
    .setTitle("Arab World MDT")
    .setDescription([
      "**نظام إدارة المخالفات والسجلات الرسمية داخل السيرفر.**",
      "من هذه الواجهة يمكن إضافة المخالفات، إزالتها، تطبيق إيقاف الخدمات، أو رفعه بشكل منظم.",
      "",
      "**تنبيه:** كل عملية يتم تسجيلها داخل السجل الإداري."
    ].join("\n"))
    .addFields(
      { name: "طريقة الاستخدام", value: "اختر الإجراء المناسب من الأزرار ثم أكمل البيانات المطلوبة.", inline: false },
      { name: "المدة النظامية", value: "يجب سداد المخالفات خلال 3 أيام لتفادي إيقاف الخدمات.", inline: false }
    )
    .setFooter(buildFooter("سجلات الشرطة"))
    .setTimestamp();
}

export function buildMdtButtons() {
  return new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId(MDT_ACTIONS.addFine).setLabel("إضافة مخالفة").setStyle(ButtonStyle.Danger),
    new ButtonBuilder().setCustomId(MDT_ACTIONS.removeFine).setLabel("إزالة مخالفة").setStyle(ButtonStyle.Secondary),
    new ButtonBuilder().setCustomId(MDT_ACTIONS.applyHold).setLabel("إيقاف خدمات").setStyle(ButtonStyle.Primary),
    new ButtonBuilder().setCustomId(MDT_ACTIONS.removeHold).setLabel("رفع إيقاف الخدمات").setStyle(ButtonStyle.Success)
  );
}

export function buildFineDmEmbed(fine) {
  const embed = new EmbedBuilder()
    .setColor(COLORS.red)
    .setTitle("تم تسجيل مخالفة جديدة عليك")
    .setDescription([
      `**رقم المخالفة:** #${fine.fineId}`,
      `**المبلغ:** ${formatCurrency(fine.amount)}`,
      `**العسكري المسؤول:** ${fine.officerName}`,
      `**السبب:** ${fine.reason}`,
      `**نوع المخالفة:** ${fine.violationType}`,
      "",
      "يمكنك السداد من خلال قائمة البنك ثم اختيار سداد المخالفات.",
      "**يجب السداد خلال 3 أيام لتفادي إيقاف الخدمات.**"
    ].join("\n"))
    .setFooter(buildFooter(`مخالفة رقم #${fine.fineId}`))
    .setTimestamp();

  if (FINE_NOTICE_IMAGE_URL) {
    embed.setImage(FINE_NOTICE_IMAGE_URL);
  }

  return embed;
}

export function buildFinePaymentConfirmEmbed(fine) {
  return new EmbedBuilder()
    .setColor(COLORS.gold)
    .setTitle("تأكيد سداد المخالفة")
    .setDescription([
      `**هل تريد سداد المخالفة #${fine.fineId}?**`,
      `**المبلغ المطلوب:** ${formatCurrency(fine.amount)}`,
      `**السبب:** ${fine.reason}`
    ].join("\n"))
    .setFooter(buildFooter("سداد مخالفة"))
    .setTimestamp();
}

export function buildApproveRejectButtons(prefix, id) {
  return new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId(`${prefix}_approve:${id}`).setLabel("موافق").setStyle(ButtonStyle.Success),
    new ButtonBuilder().setCustomId(`${prefix}_reject:${id}`).setLabel("رفض").setStyle(ButtonStyle.Danger)
  );
}

export function buildHoldRequestEmbed({ member, fineCount, paidStatus }) {
  return new EmbedBuilder()
    .setColor(COLORS.gold)
    .setTitle("طلب رفع إيقاف خدمات")
    .setDescription("**تم إرسال طلب جديد ويحتاج مراجعة الإدارة.**")
    .addFields(
      { name: "صاحب الطلب", value: `${member}`, inline: true },
      { name: "عدد المخالفات", value: `**${fineCount}**`, inline: true },
      { name: "حالة السداد", value: `**${paidStatus}**`, inline: true }
    )
    .setFooter(buildFooter("طلبات الخدمة"))
    .setTimestamp();
}

export function buildHoldRequestButtons(requestId) {
  return new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId(`hold_approve:${requestId}`).setLabel("موافقة").setStyle(ButtonStyle.Success),
    new ButtonBuilder().setCustomId(`hold_reject:${requestId}`).setLabel("رفض").setStyle(ButtonStyle.Danger),
    new ButtonBuilder().setCustomId(`hold_reason:${requestId}`).setLabel("رفض مع سبب").setStyle(ButtonStyle.Secondary)
  );
}

export function buildFineSelectMenu(fines) {
  return new ActionRowBuilder().addComponents(
    new StringSelectMenuBuilder()
      .setCustomId("fine_remove_select")
      .setPlaceholder("اختر المخالفة المراد إزالتها")
      .addOptions(
        fines.slice(0, 25).map((fine) =>
          new StringSelectMenuOptionBuilder()
            .setLabel(`#${fine.fineId} - ${fine.targetName}`)
            .setDescription(`${fine.violationType} - ${formatCurrency(fine.amount)}`)
            .setValue(fine.fineId)
        )
      )
  );
}

export function buildCarShowroomEmbed({ vehicles, page, totalPages }) {
  const lines = vehicles.length
    ? vehicles.map((vehicle, index) => {
        const marker = vehicle.isFree ? "مجاني" : formatCurrency(vehicle.price);
        return `**${index + 1}. ${vehicle.name}**\nالسعر: **${marker}**`;
      })
    : ["**لا توجد مركبات مسعرة في المعرض حاليًا. استخدم `/car-price` لإضافة مركبات جديدة.**"];

  return new EmbedBuilder()
    .setColor(COLORS.navy)
    .setTitle("معرض سيارات Arab World")
    .setDescription([
      "**واجهة الشراء الرسمية لمركبات المواطنين داخل السيرفر.**",
      "المركبات الحكومية مثل الشرطة والشيرف والدفاع المدني وDOT مجانية ولا تحتاج شراء.",
      "اختر مركبة من القائمة ثم أكد العملية من نافذة التأكيد.",
      "",
      ...lines
    ].join("\n"))
    .addFields(
      { name: "التعليمات", value: "الشراء يخصم مباشرة من حسابك البنكي ثم تسجل المركبة ضمن ممتلكاتك.", inline: false },
      { name: "تنبيه", value: "استخدام مركبة مواطن غير مسجلة باسمك يعرضك للعقوبة التلقائية.", inline: false }
    )
    .setFooter(buildFooter(`صفحة ${page + 1} من ${Math.max(totalPages, 1)}`))
    .setTimestamp();
}

export function buildCarSelectMenu({ vehicles, page }) {
  return new ActionRowBuilder().addComponents(
    new StringSelectMenuBuilder()
      .setCustomId(`car_select:${page}`)
      .setPlaceholder("اختر المركبة التي تريد شراءها")
      .addOptions(
        vehicles.slice(0, 25).map((vehicle) =>
          new StringSelectMenuOptionBuilder()
            .setLabel(vehicle.name.slice(0, 100))
            .setDescription((vehicle.isFree ? "مجانية" : formatCurrency(vehicle.price)).slice(0, 100))
            .setValue(vehicle.name)
        )
      )
  );
}

export function buildCarShowroomButtons({ page, totalPages }) {
  return new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId(`car_page_prev:${page}`)
      .setLabel("السابق")
      .setStyle(ButtonStyle.Secondary)
      .setDisabled(page <= 0),
    new ButtonBuilder()
      .setCustomId(`car_page_next:${page}`)
      .setLabel("التالي")
      .setStyle(ButtonStyle.Secondary)
      .setDisabled(page >= totalPages - 1),
    new ButtonBuilder()
      .setCustomId(CAR_ACTIONS.showOwned)
      .setLabel("ممتلكاتي")
      .setStyle(ButtonStyle.Success),
    new ButtonBuilder()
      .setCustomId(CAR_ACTIONS.sellOpen)
      .setLabel("بيع سيارة")
      .setStyle(ButtonStyle.Danger)
  );
}

export function buildCarPurchaseConfirmEmbed({ vehicleName, name, price, isFree }) {
  const finalName = vehicleName || name;
  return new EmbedBuilder()
    .setColor(COLORS.gold)
    .setTitle("تأكيد شراء مركبة")
    .setDescription([
      `**هل أنت متأكد من شراء مركبة \`${finalName}\`؟**`,
      `**السعر:** ${isFree ? "مجاني" : formatCurrency(price)}`,
      "عند الموافقة سيتم تسجيل المركبة ضمن ممتلكاتك مباشرة."
    ].join("\n"))
    .setFooter(buildFooter("تأكيد الشراء"))
    .setTimestamp();
}

export function buildCarPurchaseButtons() {
  return new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId(CAR_ACTIONS.confirmPurchase).setLabel("موافق").setStyle(ButtonStyle.Success),
    new ButtonBuilder().setCustomId(CAR_ACTIONS.cancelPurchase).setLabel("إلغاء").setStyle(ButtonStyle.Danger)
  );
}

export function buildOwnedCarsEmbed({ ownedCars }) {
  const description = ownedCars.length
    ? ownedCars.map((car, index) => `**${index + 1}. ${car.name}**\nقيمة الشراء: **${formatCurrency(car.purchasePrice)}**`).join("\n")
    : "**لا تملك أي مركبات مسجلة حاليًا.**";

  return new EmbedBuilder()
    .setColor(COLORS.emerald)
    .setTitle("ممتلكاتك من السيارات")
    .setDescription(description)
    .addFields({ name: "عدد المركبات", value: `**${ownedCars.length}**`, inline: true })
    .setFooter(buildFooter("سجل المركبات"))
    .setTimestamp();
}


