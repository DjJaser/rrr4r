import { ChannelType, REST, Routes, SlashCommandBuilder } from "discord.js";
import * as configModule from "./config.js";
import { buildBudgetCommandChoices } from "./budget-system.js";
import { buildProjectChoices, STATION_PROJECT_KEYS } from "./project-system.js";

const config = configModule.config ?? configModule.default;
const assertConfig = configModule.assertConfig;

assertConfig();

function addBudgetChoices(option) {
  for (const choice of buildBudgetCommandChoices()) {
    option.addChoices(choice);
  }

  return option;
}

function addProjectChoiceOptions(option, filterFn = null) {
  for (const choice of buildProjectChoices(filterFn)) {
    option.addChoices(choice);
  }

  return option;
}

const commands = [
  new SlashCommandBuilder().setName("bank").setDescription("يفتح واجهة البنك العربي"),
  new SlashCommandBuilder().setName("bank-police").setDescription("يفتح لوحة خدمات الداخلية البنكية"),
  new SlashCommandBuilder().setName("gun").setDescription("يفتح واجهة شراء السلاح"),
  new SlashCommandBuilder().setName("gun2").setDescription("يفتح متجر الموارد والمعادن"),
  new SlashCommandBuilder().setName("موارد").setDescription("يفتح واجهة الموارد والتجميع والشراء"),
  new SlashCommandBuilder().setName("mdt").setDescription("يفتح نظام مخالفات الشرطة"),
  new SlashCommandBuilder().setName("car").setDescription("يفتح معرض السيارات وواجهة الشراء"),
  new SlashCommandBuilder().setName("المشاريع").setDescription("يعرض جميع مشاريع عرب وورلد الحالية"),
  new SlashCommandBuilder().setName("police").setDescription("يفتح ميزانية وزارة الداخلية"),
  new SlashCommandBuilder().setName("ميزانيه-الدوله").setDescription("يفتح ميزانية الدولة"),
  new SlashCommandBuilder().setName("guard").setDescription("يفتح ميزانية الحرس الملكي"),
  new SlashCommandBuilder().setName("gang").setDescription("يفتح ميزانية العصابات"),
  new SlashCommandBuilder().setName("jus").setDescription("يفتح ميزانية وزارة العدل"),
  new SlashCommandBuilder().setName("طاولة-تصنيع").setDescription("يفتح واجهة طاولة التصنيع"),
  new SlashCommandBuilder()
    .setName("استخراج-طاولة-تصنيع")
    .setDescription("يعرض تفاصيل مستوى طاولة التصنيع")
    .addStringOption((option) =>
      option
        .setName("level")
        .setDescription("المستوى المطلوب")
        .setRequired(true)
        .addChoices(
          { name: "المستوى الأول", value: "level1" },
          { name: "المستوى الثاني", value: "level2" },
          { name: "المستوى الثالث", value: "level3" }
        )
    ),
  new SlashCommandBuilder()
    .setName("اعطاء-مخطوطه")
    .setDescription("إرسال مخطوطة المستوى الثاني يدويًا إلى شخص")
    .addUserOption((option) => option.setName("member").setDescription("الشخص المستهدف").setRequired(true))
    .addStringOption((option) =>
      option
        .setName("type")
        .setDescription("نوع المخطوطة")
        .setRequired(false)
        .addChoices(
          { name: "المخطوطة الأولى", value: "first" },
          { name: "المخطوطة الثانية", value: "second" }
        )
    ),
  new SlashCommandBuilder()
    .setName("اعطاء-مشروع")
    .setDescription("إعطاء مشروع لشخص محدد")
    .addStringOption((option) =>
      addProjectChoiceOptions(option.setName("project").setDescription("المشروع").setRequired(true))
    )
    .addUserOption((option) => option.setName("member").setDescription("مالك المشروع").setRequired(true)),
  new SlashCommandBuilder()
    .setName("سحب-مشروع")
    .setDescription("سحب مشروع من شخص محدد")
    .addStringOption((option) =>
      addProjectChoiceOptions(option.setName("project").setDescription("المشروع").setRequired(true))
    )
    .addUserOption((option) => option.setName("member").setDescription("الشخص الحالي للمشروع").setRequired(true)),
  new SlashCommandBuilder()
    .setName("اضافه-مال-لمشروع")
    .setDescription("إضافة مبلغ إلى ميزانية مشروع")
    .addStringOption((option) =>
      addProjectChoiceOptions(option.setName("project").setDescription("المشروع").setRequired(true))
    )
    .addIntegerOption((option) => option.setName("amount").setDescription("المبلغ").setRequired(true).setMinValue(1)),
  new SlashCommandBuilder()
    .setName("سحب-مال-من-مشروع")
    .setDescription("سحب مبلغ من ميزانية مشروع")
    .addStringOption((option) =>
      addProjectChoiceOptions(option.setName("project").setDescription("المشروع").setRequired(true))
    )
    .addIntegerOption((option) => option.setName("amount").setDescription("المبلغ").setRequired(true).setMinValue(1)),
  new SlashCommandBuilder()
    .setName("اضافه-بنزين")
    .setDescription("إضافة نسبة وقود إلى محطة")
    .addStringOption((option) =>
      addProjectChoiceOptions(
        option.setName("project").setDescription("المحطة").setRequired(true),
        (definition) => STATION_PROJECT_KEYS.includes(definition.key)
      )
    )
    .addIntegerOption((option) => option.setName("percent").setDescription("النسبة").setRequired(true).setMinValue(1).setMaxValue(100)),
  new SlashCommandBuilder()
    .setName("تقليل-البنزين")
    .setDescription("تقليل نسبة الوقود من محطة")
    .addStringOption((option) =>
      addProjectChoiceOptions(
        option.setName("project").setDescription("المحطة").setRequired(true),
        (definition) => STATION_PROJECT_KEYS.includes(definition.key)
      )
    )
    .addIntegerOption((option) => option.setName("percent").setDescription("النسبة").setRequired(true).setMinValue(1).setMaxValue(100)),
  new SlashCommandBuilder().setName("بدء-المحطات").setDescription("يبدأ الدخل التلقائي لمحطات الوقود كل خمس دقائق"),
  new SlashCommandBuilder().setName("ايقاف-المحطات").setDescription("يوقف الدخل التلقائي لمحطات الوقود"),
  new SlashCommandBuilder()
    .setName("محطه-مدينه-اولى")
    .setDescription("عرض لوحة محطة مدينة أولى")
    .addStringOption((option) => option.setName("name").setDescription("اسم المحطة").setRequired(true))
    .addUserOption((option) => option.setName("owner").setDescription("مالك المشروع").setRequired(true)),
  new SlashCommandBuilder()
    .setName("محطه-مدينه-ثانيه")
    .setDescription("عرض لوحة محطة مدينة ثانية")
    .addStringOption((option) => option.setName("name").setDescription("اسم المحطة").setRequired(true))
    .addUserOption((option) => option.setName("owner").setDescription("مالك المشروع").setRequired(true)),
  new SlashCommandBuilder()
    .setName("محطه-المزرعه")
    .setDescription("عرض لوحة محطة المزرعة")
    .addStringOption((option) => option.setName("name").setDescription("اسم المحطة").setRequired(true))
    .addUserOption((option) => option.setName("owner").setDescription("مالك المشروع").setRequired(true)),
  new SlashCommandBuilder()
    .setName("معرض-1")
    .setDescription("عرض لوحة معرض 1")
    .addStringOption((option) => option.setName("name").setDescription("اسم المعرض").setRequired(true))
    .addUserOption((option) => option.setName("owner").setDescription("مالك المشروع").setRequired(true))
    .addChannelOption((option) => option.setName("orders_room").setDescription("روم الطلبات").setRequired(false)),
  new SlashCommandBuilder()
    .setName("معرض-2")
    .setDescription("عرض لوحة معرض 2")
    .addStringOption((option) => option.setName("name").setDescription("اسم المعرض").setRequired(true))
    .addUserOption((option) => option.setName("owner").setDescription("مالك المشروع").setRequired(true))
    .addChannelOption((option) => option.setName("orders_room").setDescription("روم الطلبات").setRequired(false)),
  new SlashCommandBuilder()
    .setName("معرض-3")
    .setDescription("عرض لوحة معرض 3")
    .addStringOption((option) => option.setName("name").setDescription("اسم المعرض").setRequired(true))
    .addUserOption((option) => option.setName("owner").setDescription("مالك المشروع").setRequired(true))
    .addChannelOption((option) => option.setName("orders_room").setDescription("روم الطلبات").setRequired(false)),
  new SlashCommandBuilder()
    .setName("مطعم-1")
    .setDescription("عرض لوحة مطعم 1")
    .addStringOption((option) => option.setName("name").setDescription("اسم المطعم").setRequired(true))
    .addUserOption((option) => option.setName("owner").setDescription("مالك المشروع").setRequired(true)),
  new SlashCommandBuilder()
    .setName("مطعم-2")
    .setDescription("عرض لوحة مطعم 2")
    .addStringOption((option) => option.setName("name").setDescription("اسم المطعم").setRequired(true))
    .addUserOption((option) => option.setName("owner").setDescription("مالك المشروع").setRequired(true)),
  new SlashCommandBuilder()
    .setName("كوفي")
    .setDescription("عرض لوحة الكوفي")
    .addStringOption((option) => option.setName("name").setDescription("اسم الكوفي").setRequired(true))
    .addUserOption((option) => option.setName("owner").setDescription("مالك المشروع").setRequired(true)),
  new SlashCommandBuilder()
    .setName("تغيير-اسم-مشروع")
    .setDescription("تغيير اسم مشروع موجود")
    .addStringOption((option) =>
      addProjectChoiceOptions(option.setName("project").setDescription("المشروع").setRequired(true))
    )
    .addStringOption((option) => option.setName("name").setDescription("الاسم الجديد").setRequired(true)),
  new SlashCommandBuilder()
    .setName("اضافه-مال-ميزانيه")
    .setDescription("إضافة مبلغ يدوي إلى ميزانية")
    .addStringOption((option) =>
      addBudgetChoices(option.setName("budget").setDescription("الميزانية المستهدفة").setRequired(true))
    )
    .addIntegerOption((option) => option.setName("amount").setDescription("المبلغ").setRequired(true).setMinValue(1)),
  new SlashCommandBuilder()
    .setName("خصم-مال-ميزانيه")
    .setDescription("خصم مبلغ يدوي من ميزانية")
    .addStringOption((option) =>
      addBudgetChoices(option.setName("budget").setDescription("الميزانية المستهدفة").setRequired(true))
    )
    .addIntegerOption((option) => option.setName("amount").setDescription("المبلغ").setRequired(true).setMinValue(1)),
  new SlashCommandBuilder()
    .setName("account-bank")
    .setDescription("حذف الحساب البنكي نهائيًا باستخدام الاسم المسجل")
    .addStringOption((option) =>
      option.setName("bank_name").setDescription("اسم الحساب البنكي أو اسم صاحبه").setRequired(true)
    ),
  new SlashCommandBuilder()
    .setName("add-money")
    .setDescription("إضافة مبلغ إلى حساب شخص")
    .addUserOption((option) => option.setName("member").setDescription("الشخص المستهدف").setRequired(true))
    .addIntegerOption((option) => option.setName("amount").setDescription("المبلغ").setRequired(true).setMinValue(1)),
  new SlashCommandBuilder()
    .setName("remove-money")
    .setDescription("خصم مبلغ من حساب شخص")
    .addUserOption((option) => option.setName("member").setDescription("الشخص المستهدف").setRequired(true))
    .addIntegerOption((option) => option.setName("amount").setDescription("المبلغ").setRequired(true).setMinValue(1)),
  new SlashCommandBuilder()
    .setName("معلومات")
    .setDescription("يعرض جميع معلومات الحساب البنكي لشخص")
    .addUserOption((option) => option.setName("member").setDescription("الشخص المستهدف").setRequired(true)),
  new SlashCommandBuilder()
    .setName("رؤيه-مخالفات")
    .setDescription("يعرض صورة المخالفات غير المسددة")
    .addUserOption((option) => option.setName("member").setDescription("الشخص المستهدف بشكل اختياري").setRequired(false)),
  new SlashCommandBuilder()
    .setName("سحب-ممتلكات")
    .setDescription("سحب جميع ممتلكات شخص وحجزها حكوميًا")
    .addUserOption((option) => option.setName("member").setDescription("الشخص المستهدف").setRequired(true))
    .addStringOption((option) => option.setName("reason").setDescription("سبب سحب الممتلكات").setRequired(true)),
  new SlashCommandBuilder()
    .setName("سحب-موارد")
    .setDescription("سحب مورد محدد من شخص أو تصفيره")
    .addUserOption((option) => option.setName("member").setDescription("الشخص المستهدف").setRequired(true))
    .addStringOption((option) =>
      option
        .setName("resource")
        .setDescription("المورد المطلوب")
        .setRequired(true)
        .addChoices(
          { name: "فحم", value: "coal" },
          { name: "نحاس", value: "copper" },
          { name: "حديد", value: "iron" },
          { name: "ألمنيوم", value: "aluminum" },
          { name: "كبريت", value: "sulfur" },
          { name: "بلاستيك", value: "plastic" }
        )
    )
    .addIntegerOption((option) => option.setName("amount").setDescription("الكمية المراد سحبها").setRequired(false).setMinValue(1))
    .addBooleanOption((option) => option.setName("zero").setDescription("تصفير هذا المورد بالكامل").setRequired(false)),
  new SlashCommandBuilder()
    .setName("اضافه-سلاح")
    .setDescription("إضافة سلاح لشخص مع الرتبة والإشعار")
    .addUserOption((option) => option.setName("member").setDescription("الشخص المستهدف").setRequired(true))
    .addStringOption((option) =>
      option
        .setName("weapon")
        .setDescription("نوع السلاح")
        .setRequired(true)
        .addChoices(
          { name: "M9", value: "m9" },
          { name: "Colt", value: "colt" }
        )
    )
    .addStringOption((option) =>
      option
        .setName("mode")
        .setDescription("نوع مدة السلاح")
        .setRequired(true)
        .addChoices(
          { name: "مؤقت", value: "temporary" },
          { name: "دائم", value: "permanent" }
        )
    ),
  new SlashCommandBuilder()
    .setName("سحب-سلاح")
    .setDescription("سحب سلاح محدد من ممتلكات شخص")
    .addUserOption((option) => option.setName("member").setDescription("الشخص المستهدف").setRequired(true))
    .addStringOption((option) =>
      option
        .setName("weapon_code")
        .setDescription("اختر نسخة السلاح من ممتلكاته")
        .setRequired(true)
        .setAutocomplete(true)
    )
    .addStringOption((option) =>
      option
        .setName("weapon")
        .setDescription("نوع السلاح")
        .setRequired(true)
        .addChoices(
          { name: "M9", value: "m9" },
          { name: "Colt", value: "colt" }
        )
    )
    .addStringOption((option) =>
      option
        .setName("mode")
        .setDescription("نوع مدة السلاح")
        .setRequired(true)
        .addChoices(
          { name: "دائم", value: "permanent" },
          { name: "مؤقت", value: "temporary" }
        )
    ),
  new SlashCommandBuilder()
    .setName("اضافه-موارد")
    .setDescription("إضافة مورد أو كل الموارد إلى شخص")
    .addUserOption((option) => option.setName("member").setDescription("الشخص المستهدف").setRequired(true))
    .addStringOption((option) =>
      option
        .setName("resource")
        .setDescription("المورد المطلوب")
        .setRequired(true)
        .addChoices(
          { name: "كل الموارد", value: "all" },
          { name: "فحم", value: "coal" },
          { name: "نحاس", value: "copper" },
          { name: "حديد", value: "iron" },
          { name: "ألمنيوم", value: "aluminum" },
          { name: "كبريت", value: "sulfur" },
          { name: "بلاستيك", value: "plastic" }
        )
    )
    .addIntegerOption((option) => option.setName("amount").setDescription("الكمية").setRequired(true).setMinValue(1)),
  new SlashCommandBuilder()
    .setName("اعطاء-بطاقه")
    .setDescription("منح بطاقة بنكية ذهبية أو سوداء لمواطن")
    .addUserOption((option) => option.setName("member").setDescription("الشخص المستهدف").setRequired(true))
    .addStringOption((option) =>
      option
        .setName("card_type")
        .setDescription("نوع البطاقة")
        .setRequired(true)
        .addChoices(
          { name: "ذهبية", value: "gold" },
          { name: "سوداء", value: "black" }
        )
    ),
  new SlashCommandBuilder()
    .setName("add-car")
    .setDescription("إضافة سيارة إلى ممتلكات شخص")
    .addUserOption((option) => option.setName("member").setDescription("الشخص المستهدف").setRequired(true))
    .addStringOption((option) =>
      option.setName("vehicle").setDescription("اسم المركبة").setRequired(true).setAutocomplete(true)
    ),
  new SlashCommandBuilder()
    .setName("remove-car")
    .setDescription("سحب سيارة من ممتلكات شخص")
    .addUserOption((option) => option.setName("member").setDescription("الشخص المستهدف").setRequired(true))
    .addStringOption((option) =>
      option.setName("vehicle").setDescription("اسم المركبة").setRequired(true).setAutocomplete(true)
    ),
  new SlashCommandBuilder()
    .setName("سحب-مركبه")
    .setDescription("سحب مركبة من ممتلكات شخص")
    .addUserOption((option) => option.setName("member").setDescription("الشخص المستهدف").setRequired(true))
    .addStringOption((option) =>
      option.setName("vehicle").setDescription("اسم المركبة").setRequired(true).setAutocomplete(true)
    ),
  new SlashCommandBuilder()
    .setName("car-price")
    .setDescription("تحديد سعر سيارة داخل المعرض")
    .addStringOption((option) =>
      option.setName("vehicle").setDescription("اسم المركبة").setRequired(true).setAutocomplete(true)
    )
    .addIntegerOption((option) => option.setName("price").setDescription("السعر الجديد").setRequired(true).setMinValue(0)),
  new SlashCommandBuilder()
    .setName("check-weapon")
    .setDescription("اختبار تحقق سلاح ER:LC يدويًا")
    .addStringOption((option) =>
      option.setName("roblox_username").setDescription("اسم اللاعب في روبلوكس").setRequired(true)
    )
    .addStringOption((option) =>
      option.setName("weapon").setDescription("اسم السلاح").setRequired(false)
    ),
  new SlashCommandBuilder()
    .setName("اخذ-ايدي-شخص")
    .setDescription("جلب Roblox ID من يوزر روبلوكس")
    .addStringOption((option) =>
      option
        .setName("roblox_username")
        .setDescription("يوزر الشخص في روبلوكس")
        .setRequired(true)
    ),
  new SlashCommandBuilder().setName("ايمبد-المعلومات").setDescription("يعرض لوحة معلومات وممتلكات الأسلحة"),
  new SlashCommandBuilder().setName("activite").setDescription("عرض واجهة التفعيل داخل عرب وورلد")
,
  new SlashCommandBuilder()
    .setName("ادخال-فويس")
    .setDescription("إدخال البوت إلى روم فويس محدد وإبقاؤه داخله")
    .addChannelOption((option) =>
      option
        .setName("channel")
        .setDescription("روم الفويس المطلوب")
        .addChannelTypes(ChannelType.GuildVoice)
        .setRequired(true)
    )
];

const rest = new REST({ version: "10" }).setToken(config.token);

await rest.put(
  Routes.applicationGuildCommands(config.clientId, config.guildId),
  { body: commands.map((command) => command.toJSON()) }
);

console.log("Slash commands registered successfully.");
