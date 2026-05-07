export const COLORS = {
  navy: 0x0c1f3f,
  red: 0x8d1111,
  gold: 0xd4a017,
  emerald: 0x1f6b45,
  charcoal: 0x23272a
};

export const WEAPON_MARKET_IMAGE_URL = "https://cdn.discordapp.com/attachments/1480613370259439698/1497538742326657084/351_20260425130407.png?ex=69ede323&is=69ec91a3&hm=fef625153a86b22c065729a71b58415e9bfb6a5bbdeab61e546d7473f7b3df4f&";
export const CRAFTING_TABLE_IMAGE_URL = "attachment://crafting-table-guide.png";
export const RESOURCE_EMBED_IMAGE_URL = "https://cdn.discordapp.com/attachments/1096734655903973407/1497562368987631827/352_20260425140853.png?ex=69edf924&is=69eca7a4&hm=8ab2e1470beb8ebed2ad4797196612815eaeed094422ac3e6d1908d8a3478310&";
export const BANK_BALANCE_IMAGE_URL = null;
export const FINE_NOTICE_IMAGE_URL = null;

export const RESOURCE_CATALOG = {
  coal: { key: "coal", label: "فحم", emoji: "🪨", price: 10 },
  copper: { key: "copper", label: "نحاس", emoji: "🟠", price: 5 },
  iron: { key: "iron", label: "حديد", emoji: "⚙️", price: 20 },
  aluminum: { key: "aluminum", label: "ألمنيوم", emoji: "🔩", price: 50 },
  sulfur: { key: "sulfur", label: "كبريت", emoji: "🧪", price: 90 },
  plastic: { key: "plastic", label: "بلاستيك", emoji: "🧴", price: 15 }
};

export const M9_REQUIREMENTS = {
  cash: 3000,
  resources: {
    coal: 20,
    copper: 22,
    iron: 30,
    aluminum: 10,
    sulfur: 10,
    plastic: 46
  }
};

export const CRAFTING_LEVEL1_M9_REQUIREMENTS = {
  cash: 5000,
  resources: {
    coal: 200,
    copper: 100,
    iron: 100,
    aluminum: 30,
    sulfur: 50,
    plastic: 300
  }
};

export const COLT_ROLE_ID = "1496139911726760118";
export const CRAFTING_LEVEL2_ACCESS_ROLE_ID = "1501899632228307074";

export const CRAFTING_TABLE_LEVELS = {
  level1: {
    key: "level1",
    label: "طاولة تصنيع مستوى أول",
    price: 15_000,
    purchasable: true
  },
  level2: {
    key: "level2",
    label: "طاولة تصنيع مستوى ثان",
    price: 35_000,
    purchasable: false,
    unlockMethod: "extraction"
  },
  level3: {
    key: "level3",
    label: "طاولة تصنيع مستوى ثالث",
    price: null,
    purchasable: false
  }
};

export const CRAFTABLE_WEAPONS = {
  m9: {
    key: "m9",
    label: "M9",
    cash: CRAFTING_LEVEL1_M9_REQUIREMENTS.cash,
    resources: { ...CRAFTING_LEVEL1_M9_REQUIREMENTS.resources },
    levels: ["level1"],
    roleId: null
  },
  m9_level2: {
    key: "m9_level2",
    inventoryKey: "m9",
    label: "M9 دائم",
    cash: CRAFTING_LEVEL1_M9_REQUIREMENTS.cash,
    resources: { ...CRAFTING_LEVEL1_M9_REQUIREMENTS.resources },
    levels: ["level2"],
    roleId: null,
    permanent: true
  },
  colt: {
    key: "colt",
    inventoryKey: "colt",
    label: "Colt مؤقت",
    cash: 5000,
    resources: {
      coal: 170,
      iron: 50,
      aluminum: 60,
      copper: 200,
      sulfur: 20,
      plastic: 100
    },
    levels: ["level2", "level3"],
    roleId: COLT_ROLE_ID,
    permanent: false
  }
};

export const ROBBERY_REWARDS = {
  atm: 1000,
  alsaraf: 1000,
  store: 500,
  cash_register: 500,
  register: 500,
  shop: 500,
  gas_station: 500,
  clerk: 500
};

export const BANK_ACTIONS = {
  create: "bank_create_account",
  balance: "bank_show_balance",
  salary: "bank_claim_salary",
  transfer: "bank_transfer_balance",
  loan: "bank_request_loan",
  payFine: "bank_pay_fine",
  removeHold: "bank_remove_hold"
};

export const SALARY_ROLE_DEFINITIONS = [
  { roleId: "1460726055202459881", amount: 1500 },
  { roleId: "1460726053537583353", amount: 2500 },
  { roleId: "1460726052962959501", amount: 3500 },
  { roleId: "1460726052815896801", amount: 3500 },
  { roleId: "1460726051394027763", amount: 4000 },
  { roleId: "1460726050530263237", amount: 4000 },
  { roleId: "1460728007311233105", amount: 5000 },
  { roleId: "1460728091801554944", amount: 6000 },
  { roleId: "1460726049976357083", amount: 6000 },
  { roleId: "1460726048965529861", amount: 8000 },
  { roleId: "1460726048596562156", amount: 8000 },
  { roleId: "1460726047396855869", amount: 8500 },
  { roleId: "1460726045207433418", amount: 9000 },
  { roleId: "1460726045132062862", amount: 10000 },
  { roleId: "1475279236536340530", amount: 11000 },
  { roleId: "1475279236813295689", amount: 13000 },
  { roleId: "1475279238180372511", amount: 16000 },
  { roleId: "1482565320140132565", amount: 20000 },
  { roleId: "1460726043471249448", amount: 22000 },
  { roleId: "1460726041201869089", amount: 26000 },
  { roleId: "1480675559917879426", amount: 30000 },
  { roleId: "1480675439235043379", amount: 35000 },
  { roleId: "1460726056179994968", amount: 7000 },
  { roleId: "1485712325548965898", amount: 10000 },
  { roleId: "1469469322710749407", amount: 14000 },
  { roleId: "1489658101786214453", amount: 16000 },
  { roleId: "1478870729603682356", amount: 20000 },
  { roleId: "1460726058092331185", amount: 29000 },
  { roleId: "1460726057094090918", amount: 35000 },
  { roleId: "1491488861103198278", amount: 20000 },
  { roleId: "1491488673844433099", amount: 25000 },
  { roleId: "1460728006644465764", amount: 35000 },
  { roleId: "1460728008447885403", amount: 33000 },
  { roleId: "1470083613096808721", amount: 27000 },
  { roleId: "1487234446561116280", amount: 25000 },
  { roleId: "1486691672577282121", amount: 20000 },
  { roleId: "1469310419788370034", amount: 15000 },
  { roleId: "1469359855965044960", amount: 12000 },
  { roleId: "1475165742281396264", amount: 4000 },
  { roleId: "1487203673208524972", amount: 5000 },
  { roleId: "1485983988689670274", amount: 6000 },
  { roleId: "1485983918569033839", amount: 8000 },
  { roleId: "1485983839338631268", amount: 13000 }
];

export const GUN2_ACTIONS = {
  coal: "buy_resource_coal",
  copper: "buy_resource_copper",
  iron: "buy_resource_iron",
  aluminum: "buy_resource_aluminum",
  sulfur: "buy_resource_sulfur",
  plastic: "buy_resource_plastic",
  inventory: "show_resource_inventory"
};

export const MDT_ACTIONS = {
  addFine: "mdt_add_fine",
  removeFine: "mdt_remove_fine",
  applyHold: "mdt_apply_hold",
  removeHold: "mdt_remove_hold"
};

export const CAR_ACTIONS = {
  showOwned: "car_show_owned",
  sellOpen: "car_sell_open",
  confirmPurchase: "car_confirm_purchase",
  cancelPurchase: "car_cancel_purchase"
};

export const CAR_SHOWROOM_PAGE_SIZE = 25;
export const DEFAULT_CITIZEN_VEHICLE_PRICE = 50000;

export const DEFAULT_FREE_VEHICLE_NAMES = [
  "1992 CHEVLON CAPTAIN"
];

export const CITIZEN_VEHICLE_NAMES = [
  "1992 CHEVLON CAPTAIN"
];

export const EMERGENCY_VEHICLE_DEPARTMENTS = [
  "POLICE",
  "POLICE TEAM",
  "POLICE DEPARTMENT",
  "LSPD",
  "LEO",
  "SHERIFF",
  "SHERIFF'S OFFICE",
  "SHERIFF OFFICE",
  "SHERIFF DEPARTMENT",
  "BCSO",
  "SCSO",
  "STATE POLICE",
  "HIGHWAY PATROL",
  "STATE TROOPER",
  "DOT",
  "DEPARTMENT OF TRANSPORTATION",
  "TRANSPORTATION",
  "PUBLIC WORKS",
  "FIRE",
  "FIREFIGHTER",
  "FIRE FIGHTER",
  "FIERFIGHTER",
  "FIRE DEPARTMENT",
  "FIRE RESCUE",
  "FIRE & RESCUE",
  "FIRE AND RESCUE",
  "FIRE TEAM",
  "FIRE FIGHTING",
  "FD",
  "EMS",
  "EMS FIRE",
  "AMBULANCE",
  "RESCUE",
  "CIVIL DEFENSE",
  "CIVILDEFENSE",
  "CD",
  "MEDICAL",
  "MEDIC",
  "CIVILIAN PROTECTION"
];

export const EMERGENCY_VEHICLE_KEYWORDS = [
  "POLICE",
  "LSPD",
  "LEPD",
  "POLICE K9",
  "POLICE SLICKTOP",
  "POLICE INTERCEPTOR",
  "POLICE SUV",
  "POLICE TAHOE",
  "POLICE CHARGER",
  "POLICE EXPLORER",
  "POLICE FPIU",
  "POLICE FPIU UNMARKED",
  "POLICE UNMARKED",
  "LEO",
  "SHERIFF",
  "BCSO",
  "SCSO",
  "SHERIFF K9",
  "SHERIFF SUV",
  "SHERIFF TRUCK",
  "SHERIFF OFFICE",
  "STATE POLICE",
  "HIGHWAY PATROL",
  "TROOPER",
  "STATE TROOPER",
  "DOT",
  "TRANSPORT",
  "DEPARTMENT OF TRANSPORTATION",
  "TOW TRUCK",
  "FIRE",
  "FIREFIGHTER",
  "FIRE FIGHTER",
  "FIERFIGHTER",
  "FIRE ENGINE",
  "FIRE TRUCK",
  "LADDER",
  "BRUSH",
  "HAZMAT",
  "AMBULANCE",
  "EMS",
  "MEDIC",
  "PARAMEDIC",
  "CIVIL DEFENSE",
  "CIVILDEFENSE",
  "CIVILIAN PROTECTION",
  "DISASTER RESPONSE",
  "DEFENSE",
  "RESCUE",
  "FD",
  "SO",
  "SWAT"
];

