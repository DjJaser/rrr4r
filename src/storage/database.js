import fs from "fs";
import path from "path";
import { CITIZEN_VEHICLE_NAMES, DEFAULT_FREE_VEHICLE_NAMES } from "../constants.js";
import { BUDGET_DEFINITIONS } from "../budget-system.js";

const configuredDataDir = String(process.env.BOT_DATA_DIR || "").trim();
const configuredDataFile = String(process.env.BOT_DATA_FILE || "").trim();
const repoDataDir = path.resolve(process.cwd(), "data");
const repoDataFile = path.join(repoDataDir, "store.json");
const previousRuntimeDataDir = path.resolve(process.cwd(), ".aw-data");
const previousRuntimeDataFile = path.join(previousRuntimeDataDir, "store.json");
const legacyDataDir = path.resolve("C:\\Users\\Dell\\Documents\\Codex\\2026-04-23-new-chat\\data");
const legacyDataFile = path.join(legacyDataDir, "store.json");

const runtimeDataDir = configuredDataDir
  ? path.resolve(configuredDataDir)
  : repoDataDir;
const runtimeDataFile = configuredDataFile
  ? path.resolve(configuredDataFile)
  : path.join(runtimeDataDir, "store.json");

const defaultStore = {
  accounts: {},
  pendingPins: {},
  pendingTransfers: {},
  loans: {},
  transactions: [],
  budgets: {},
  budgetTransactions: [],
  projects: {},
  projectTransactions: [],
  fines: {},
  holdRequests: {},
  vehiclePrices: {},
  vehicleShowroomMeta: {},
  vehicleCatalog: [...new Set([...CITIZEN_VEHICLE_NAMES, ...DEFAULT_FREE_VEHICLE_NAMES])]
};

let storePathLogged = false;

function isValidStoreShape(store) {
  return Boolean(
    store
    && typeof store === "object"
    && store.accounts
    && store.pendingPins
    && store.pendingTransfers
  );
}

function tryReadJsonFile(filePath) {
  try {
    if (!fs.existsSync(filePath)) {
      return null;
    }

    const raw = fs.readFileSync(filePath, "utf8");
    if (!String(raw || "").trim()) {
      return null;
    }

    return JSON.parse(raw);
  } catch {
    return null;
  }
}

function getMigrationSourceFile() {
  const candidates = [
    runtimeDataFile,
    repoDataFile,
    previousRuntimeDataFile,
    legacyDataFile
  ].filter((candidate, index, array) => candidate && array.indexOf(candidate) === index);

  for (const candidate of candidates) {
    const parsed = tryReadJsonFile(candidate);
    if (isValidStoreShape(parsed)) {
      return candidate;
    }
  }

  return null;
}

function ensureStore() {
  if (!fs.existsSync(runtimeDataDir)) {
    fs.mkdirSync(runtimeDataDir, { recursive: true });
  }

  if (!fs.existsSync(runtimeDataFile)) {
    const sourceFile = getMigrationSourceFile();
    if (sourceFile) {
      fs.copyFileSync(sourceFile, runtimeDataFile);
      console.info(`[STORE] migrated data file from ${sourceFile} to ${runtimeDataFile}`);
    }
  }

  if (!fs.existsSync(runtimeDataFile)) {
    fs.writeFileSync(runtimeDataFile, JSON.stringify(defaultStore, null, 2), "utf8");
    console.warn(`[STORE] created new empty store at ${runtimeDataFile}`);
  }

  const runtimeStore = tryReadJsonFile(runtimeDataFile);
  if (!isValidStoreShape(runtimeStore)) {
    const sourceFile = getMigrationSourceFile();
    if (sourceFile && path.resolve(sourceFile) !== path.resolve(runtimeDataFile)) {
      fs.copyFileSync(sourceFile, runtimeDataFile);
      console.warn(`[STORE] runtime store was missing or invalid, restored from ${sourceFile}`);
    } else {
      fs.writeFileSync(runtimeDataFile, JSON.stringify(defaultStore, null, 2), "utf8");
      console.warn(`[STORE] runtime store was invalid, recreated default store at ${runtimeDataFile}`);
    }
  }

  if (!storePathLogged) {
    storePathLogged = true;
    console.info(`[STORE] active store file: ${runtimeDataFile}`);
    console.info(`[STORE] configured BOT_DATA_DIR: ${configuredDataDir || "(default)"}`);
    console.info(`[STORE] configured BOT_DATA_FILE: ${configuredDataFile || "(default)"}`);
  }
}

export function getActiveStoreFilePath() {
  ensureStore();
  return runtimeDataFile;
}

function readStore() {
  ensureStore();
  const parsed = tryReadJsonFile(runtimeDataFile);
  if (isValidStoreShape(parsed)) {
    return parsed;
  }

  console.warn(`[STORE] failed to parse active store file, falling back to default shape: ${runtimeDataFile}`);
  return structuredClone(defaultStore);
}

function writeStore(store) {
  ensureStore();
  const tempFile = `${runtimeDataFile}.tmp`;
  const payload = JSON.stringify(store, null, 2);
  const fd = fs.openSync(tempFile, "w");

  try {
    fs.writeFileSync(fd, payload, "utf8");
    fs.fsyncSync(fd);
  } finally {
    fs.closeSync(fd);
  }

  fs.renameSync(tempFile, runtimeDataFile);

  try {
    const dirFd = fs.openSync(path.dirname(runtimeDataFile), "r");
    try {
      fs.fsyncSync(dirFd);
    } finally {
      fs.closeSync(dirFd);
    }
  } catch {
    // Best-effort durability flush for platforms/filesystems that support it.
  }
}

function buildTransactionRecord(entry) {
  return {
    id: `${Date.now()}_${Math.floor(Math.random() * 10000)}`,
    createdAt: new Date().toISOString(),
    ...entry
  };
}

function makeAccountNumber() {
  return String(Math.floor(1000 + Math.random() * 9000));
}

function normalizeName(value) {
  return String(value || "")
    .trim()
    .replace(/\s+/g, " ")
    .toLowerCase();
}

function normalizeVehicleName(value) {
  return String(value || "")
    .trim()
    .replace(/\s+/g, " ")
    .toUpperCase();
}

function stripVehicleDisplaySuffix(value) {
  return normalizeVehicleName(value)
    .replace(/\s+[•|-]\s+(FREE|DEFAULT|مجاني)$/i, "")
    .replace(/\s+[•|-]\s+[\d,]+(?:\s*ريال)?$/i, "")
    .trim();
}

function normalizeVehicleLookupKey(value) {
  return stripVehicleDisplaySuffix(value).replace(/[^A-Z0-9]/g, "");
}

function normalizeVehicleComparableName(value) {
  return stripVehicleDisplaySuffix(value)
    .replace(/\b(19|20)\d{2}\b/g, " ")
    .replace(/\b(FREE|DEFAULT)\b/g, " ")
    .replace(/\b\d{1,3}(?:,\d{3})+\b/g, " ")
    .replace(/\b(STOCK|BASE|EDITION|SEDAN|SUV|TRUCK|CAR)\b/g, " ")
    .replace(/[^A-Z0-9 ]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function getVehicleComparableTokens(value) {
  const rawTokens = normalizeVehicleComparableName(value)
    .split(" ")
    .map((token) => token.trim())
    .filter((token) => token && token.length > 1);

  if (!rawTokens.length) {
    return [];
  }

  const mergedTokens = [];
  for (let index = 0; index < rawTokens.length; index += 1) {
    const current = rawTokens[index];
    const next = rawTokens[index + 1] || "";

    if (/^[A-Z]$/.test(current) && /^\d{1,4}[A-Z]{0,2}$/.test(next)) {
      mergedTokens.push(`${current}${next}`);
      index += 1;
      continue;
    }

    if (/^\d{1,4}$/.test(current) && /^[A-Z]{1,3}\d{0,3}$/.test(next)) {
      mergedTokens.push(`${next}${current}`);
      index += 1;
      continue;
    }

    if (/^[A-Z]{1,3}$/.test(current) && /^\d{1,4}$/.test(next)) {
      mergedTokens.push(`${current}${next}`);
      index += 1;
      continue;
    }

    mergedTokens.push(current);
  }

  return [...new Set([...rawTokens, ...mergedTokens])];
}

function getSortedVehicleComparableTokenKey(value) {
  return [...new Set(getVehicleComparableTokens(value))]
    .sort((left, right) => left.localeCompare(right))
    .join("|");
}

function areVehicleNamesEquivalent(left, right) {
  const leftLookup = normalizeVehicleLookupKey(left);
  const rightLookup = normalizeVehicleLookupKey(right);
  if (!leftLookup || !rightLookup) {
    return false;
  }

  if (leftLookup === rightLookup) {
    return true;
  }

  const leftComparable = normalizeVehicleComparableName(left);
  const rightComparable = normalizeVehicleComparableName(right);
  if (leftComparable && rightComparable && leftComparable === rightComparable) {
    return true;
  }

  const compactLeft = leftComparable.replace(/\s+/g, "");
  const compactRight = rightComparable.replace(/\s+/g, "");
  if (compactLeft && compactRight && (compactLeft.includes(compactRight) || compactRight.includes(compactLeft))) {
    return true;
  }

  const leftTokens = getVehicleComparableTokens(left);
  const rightTokens = getVehicleComparableTokens(right);
  if (!leftTokens.length || !rightTokens.length) {
    return false;
  }

  const leftTokenKey = getSortedVehicleComparableTokenKey(left);
  const rightTokenKey = getSortedVehicleComparableTokenKey(right);
  if (leftTokenKey && rightTokenKey && leftTokenKey === rightTokenKey) {
    return true;
  }

  const overlap = leftTokens.filter((token) => rightTokens.includes(token));
  const minTokenCount = Math.min(leftTokens.length, rightTokens.length);

  if (overlap.length >= minTokenCount && overlap.length >= 2) {
    return true;
  }

  const fuzzyOverlap = leftTokens.filter((leftToken) =>
    rightTokens.some((rightToken) =>
      leftToken === rightToken
      || leftToken.includes(rightToken)
      || rightToken.includes(leftToken)
    )
  );

  if (fuzzyOverlap.length >= minTokenCount && fuzzyOverlap.length >= 2) {
    return true;
  }

  if (minTokenCount === 1 && overlap.length === 1) {
    const [leftToken] = leftTokens;
    const [rightToken] = rightTokens;
    return leftToken.length >= 5 && rightToken.length >= 5;
  }

  return false;
}

function prettifyVehicleName(value) {
  return String(value || "")
    .trim()
    .replace(/\s+/g, " ");
}

function ensureAccountShape(account) {
  account.resources ??= {
    coal: 0,
    copper: 0,
    iron: 0,
    aluminum: 0,
    sulfur: 0,
    plastic: 0
  };
  account.weapons ??= {};
  account.cars ??= {};
  account.crafting ??= {
    tableLevel: 0,
    cooldownEndsAt: null,
    lastChallengeAt: null,
    level2Quest: {
      stage: "idle",
      startedAt: null,
      firstPuzzleSentAt: null,
      beastKilledAt: null,
      secondPuzzleSentAt: null,
      completedAt: null
    },
    level2Upgrade: {
      stage: "idle",
      startedAt: null,
      paidAt: null,
      puzzleSentAt: null,
      completedAt: null
    },
    level3Quest: {
      stage: "idle",
      startedAt: null,
      puzzleSentAt: null,
      waitingUntil: null,
      completedAt: null
    }
  };
  account.crafting.level2Quest ??= {
    stage: "idle",
    startedAt: null,
    firstPuzzleSentAt: null,
    beastKilledAt: null,
    secondPuzzleSentAt: null,
    completedAt: null
  };
  account.crafting.level2Upgrade ??= {
    stage: "idle",
    startedAt: null,
    paidAt: null,
    puzzleSentAt: null,
    completedAt: null
  };
  account.crafting.level3Quest ??= {
    stage: "idle",
    startedAt: null,
    puzzleSentAt: null,
    waitingUntil: null,
    completedAt: null
  };
  account.salaryClaims ??= {};
  account.bankFrozen ??= false;
  account.bankFrozenReason ??= null;
  account.bankFrozenBy ??= null;
  account.bankFrozenAt ??= null;
  account.assetsSeized ??= false;
  account.assetsSeizedReason ??= null;
  account.assetsSeizedBy ??= null;
  account.assetsSeizedAt ??= null;
  account.seizedAssetsSnapshot ??= null;
  return account;
}

function ensureBudgetStoreShape(store) {
  store.budgets ??= {};
  store.budgetTransactions ??= [];

  for (const definition of Object.values(BUDGET_DEFINITIONS)) {
    store.budgets[definition.key] ??= {
      key: definition.key,
      balance: Number(definition.startingBalance || 0),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      lastWeeklyAllowanceAt: null
    };

    store.budgets[definition.key].balance = Number(store.budgets[definition.key].balance || 0);
    store.budgets[definition.key].updatedAt ??= new Date().toISOString();
    store.budgets[definition.key].createdAt ??= new Date().toISOString();
    store.budgets[definition.key].lastWeeklyAllowanceAt ??= null;
  }

  return store;
}

function ensureVehicleStoreShape(store) {
  ensureBudgetStoreShape(store);
  store.vehiclePrices ??= {};
  store.vehicleShowroomMeta ??= {};
  store.vehicleCatalog ??= [];

  for (const vehicleName of [...CITIZEN_VEHICLE_NAMES, ...DEFAULT_FREE_VEHICLE_NAMES]) {
    const normalized = normalizeVehicleName(vehicleName);
    if (!normalized) {
      continue;
    }

    const exists = store.vehicleCatalog.some((name) => normalizeVehicleName(name) === normalized);
    if (!exists) {
      store.vehicleCatalog.push(prettifyVehicleName(vehicleName));
    }
  }

  return store;
}

function ensureProjectRecordShape(record, fallback = {}) {
  return {
    key: fallback.key ?? record?.key ?? "",
    type: fallback.type ?? record?.type ?? "generic",
    name: fallback.name ?? record?.name ?? "",
    ownerUserId: record?.ownerUserId ?? fallback.ownerUserId ?? null,
    ownerName: record?.ownerName ?? fallback.ownerName ?? "",
    budget: Number(record?.budget ?? fallback.budget ?? 0),
    fuelPercent: Math.max(0, Math.min(100, Number(record?.fuelPercent ?? fallback.fuelPercent ?? 100))),
    ordersChannelId: record?.ordersChannelId ?? fallback.ordersChannelId ?? null,
    dashboardChannelId: record?.dashboardChannelId ?? fallback.dashboardChannelId ?? null,
    dashboardMessageId: record?.dashboardMessageId ?? fallback.dashboardMessageId ?? null,
    admins: Array.isArray(record?.admins) ? [...new Set(record.admins.filter(Boolean))] : [],
    employees: Array.isArray(record?.employees) ? [...new Set(record.employees.filter(Boolean))] : [],
    partners: Array.isArray(record?.partners) ? [...new Set(record.partners.filter(Boolean))] : [],
    showroomVehicles: Array.isArray(record?.showroomVehicles) ? record.showroomVehicles : [],
    rentals: Array.isArray(record?.rentals) ? record.rentals : [],
    createdAt: record?.createdAt ?? fallback.createdAt ?? new Date().toISOString(),
    updatedAt: record?.updatedAt ?? fallback.updatedAt ?? new Date().toISOString(),
    lastWeeklyIncomeAt: record?.lastWeeklyIncomeAt ?? fallback.lastWeeklyIncomeAt ?? null,
    lastFuelDecayAt: record?.lastFuelDecayAt ?? fallback.lastFuelDecayAt ?? null,
    lastFuelAlertAt: record?.lastFuelAlertAt ?? fallback.lastFuelAlertAt ?? null,
    lastFuelPercentNotified: Number(record?.lastFuelPercentNotified ?? fallback.lastFuelPercentNotified ?? 100)
  };
}

function ensureProjectStoreShape(store) {
  store.projects ??= {};
  store.projectTransactions ??= [];

  for (const [projectKey, record] of Object.entries(store.projects)) {
    store.projects[projectKey] = ensureProjectRecordShape(record, { key: projectKey });
  }

  return store;
}

function ensureVehicleRegistered(store, vehicleName) {
  ensureBudgetStoreShape(store);
  store.vehiclePrices ??= {};
  store.vehicleShowroomMeta ??= {};
  store.vehicleCatalog ??= [];
  const normalized = normalizeVehicleName(vehicleName);
  if (!normalized) {
    return;
  }

  const exists = store.vehicleCatalog.some((name) => normalizeVehicleName(name) === normalized);
  if (!exists) {
    store.vehicleCatalog.push(prettifyVehicleName(vehicleName));
  }
}

function resolveRegisteredVehicleNameFromStore(store, vehicleName) {
  const cleanInput = prettifyVehicleName(vehicleName);
  const normalizedInput = normalizeVehicleName(cleanInput);
  if (!normalizedInput) {
    return "";
  }

  const candidates = [
    ...(store.vehicleCatalog ?? []),
    ...Object.values(store.vehiclePrices ?? {}).map((entry) => entry?.name),
    ...Object.values(store.accounts ?? {}).flatMap((account) => Object.values(ensureAccountShape(account).cars ?? {}).map((car) => car?.name))
  ]
    .map(prettifyVehicleName)
    .filter(Boolean);

  const exactMatch = candidates.find((entry) => normalizeVehicleName(entry) === normalizedInput);
  if (exactMatch) {
    return exactMatch;
  }

  const lookupInput = normalizeVehicleLookupKey(cleanInput);
  const lookupMatch = candidates.find((entry) => normalizeVehicleLookupKey(entry) === lookupInput);
  if (lookupMatch) {
    return lookupMatch;
  }

  const equivalentMatch = candidates.find((entry) => areVehicleNamesEquivalent(entry, cleanInput));
  if (equivalentMatch) {
    return equivalentMatch;
  }

  return cleanInput;
}

export function getAccount(userId) {
  const store = readStore();
  const account = store.accounts[userId] ?? null;
  return account ? ensureAccountShape(account) : null;
}

export function createPendingPin(userId, payload) {
  const store = readStore();
  const pin = String(Math.floor(1000 + Math.random() * 9000));
  store.pendingPins[userId] = {
    ...payload,
    pin,
    createdAt: new Date().toISOString()
  };
  writeStore(store);
  return pin;
}

export function getPendingPin(userId) {
  const store = readStore();
  return store.pendingPins[userId] ?? null;
}

export function createAccount(userId, payload) {
  const store = readStore();
  const accountNumber = makeAccountNumber();

  store.accounts[userId] = {
    discordUserId: userId,
    name: payload.name,
    age: payload.age,
    country: payload.country,
    robloxUsername: payload.robloxUsername,
    info: payload.info,
    pin: payload.pin,
    accountNumber,
    balance: 0,
    resources: {
      coal: 0,
      copper: 0,
      iron: 0,
      aluminum: 0,
      sulfur: 0,
      plastic: 0
    },
    weapons: {},
    cars: {},
    crafting: {
      tableLevel: 0,
      cooldownEndsAt: null,
      lastChallengeAt: null,
      level2Quest: {
        stage: "idle",
        startedAt: null,
        firstPuzzleSentAt: null,
        beastKilledAt: null,
        secondPuzzleSentAt: null,
        completedAt: null
      }
    },
    salaryClaims: {},
    bankFrozen: false,
    bankFrozenReason: null,
    bankFrozenBy: null,
    bankFrozenAt: null,
    assetsSeized: false,
    assetsSeizedReason: null,
    assetsSeizedBy: null,
    assetsSeizedAt: null,
    seizedAssetsSnapshot: null,
    createdAt: new Date().toISOString()
  };

  delete store.pendingPins[userId];
  writeStore(store);
  return store.accounts[userId];
}

export function updateAccount(userId, updater) {
  const store = readStore();
  const current = store.accounts[userId];
  if (!current) {
    return null;
  }

  store.accounts[userId] = ensureAccountShape(updater(structuredClone(ensureAccountShape(current))));
  writeStore(store);
  return store.accounts[userId];
}

export function mutateStore(mutator) {
  const store = readStore();
  const result = mutator(store);
  writeStore(store);
  return result;
}

export function getMutableAccount(store, userId) {
  const current = store.accounts?.[userId];
  if (!current) {
    return null;
  }

  const shaped = ensureAccountShape(current);
  store.accounts[userId] = shaped;
  return shaped;
}

export function removeAccountByName(name) {
  const store = readStore();
  const normalized = normalizeName(name);

  if (!normalized) {
    return null;
  }

  const entry = Object.entries(store.accounts).find(([, account]) => normalizeName(account.name) === normalized);
  if (!entry) {
    return null;
  }

  const [userId, account] = entry;
  delete store.accounts[userId];
  delete store.pendingPins[userId];

  for (const transferId of Object.keys(store.pendingTransfers)) {
    const transfer = store.pendingTransfers[transferId];
    if (transfer?.fromUserId === userId || transfer?.toUserId === userId) {
      delete store.pendingTransfers[transferId];
    }
  }

  store.transactions = Array.isArray(store.transactions)
    ? store.transactions.filter((entry) => String(entry?.discordUserId || "") !== String(userId))
    : [];

  writeStore(store);
  return account;
}

export function createTransfer(payload) {
  const store = readStore();
  const transferId = `${Date.now()}_${Math.floor(Math.random() * 10000)}`;
  store.pendingTransfers[transferId] = {
    ...payload,
    transferId,
    createdAt: new Date().toISOString()
  };
  writeStore(store);
  return store.pendingTransfers[transferId];
}

export function getTransfer(transferId) {
  const store = readStore();
  return store.pendingTransfers[transferId] ?? null;
}

export function consumeTransfer(transferId) {
  const store = readStore();
  const record = store.pendingTransfers[transferId] ?? null;
  delete store.pendingTransfers[transferId];
  writeStore(store);
  return record;
}

export function allAccounts() {
  const store = readStore();
  for (const userId of Object.keys(store.accounts)) {
    ensureAccountShape(store.accounts[userId]);
  }
  return store.accounts;
}

function normalizeRobloxUsernameLookup(value) {
  const raw = String(value || "").trim();
  if (!raw) {
    return "";
  }

  const afterPipe = raw.includes("|") ? raw.split("|").pop() : raw;
  const tokens = String(afterPipe || raw)
    .trim()
    .split(/\s+/)
    .map((entry) => entry.trim())
    .filter(Boolean);

  const preferredToken = tokens.find((token) => {
    const normalized = token.replace(/[^\w]/g, "");
    return (
      normalized.length >= 3
      && /^[a-z0-9_]+$/i.test(normalized)
      && !/^m-?\d+$/i.test(token)
    );
  });

  const candidate = preferredToken || tokens[0] || raw;
  return String(candidate).trim().toLowerCase();
}

function normalizeRobloxUsernameVisualLookup(value) {
  return normalizeRobloxUsernameLookup(value).replace(/[li1]/g, "1");
}

export function findAccountByRobloxUsername(robloxUsername) {
  const store = readStore();
  const normalized = normalizeRobloxUsernameLookup(robloxUsername);
  const visualNormalized = normalizeRobloxUsernameVisualLookup(robloxUsername);

  const exactAccount = Object.values(store.accounts).find((entry) => {
    return normalizeRobloxUsernameLookup(entry.robloxUsername) === normalized;
  }) ?? null;

  if (exactAccount) {
    return ensureAccountShape(exactAccount);
  }

  const fallbackAccount = Object.values(store.accounts).find((entry) => {
    return normalizeRobloxUsernameVisualLookup(entry.robloxUsername) === visualNormalized;
  }) ?? null;

  const account = fallbackAccount ?? null;
  return account ? ensureAccountShape(account) : null;
}

export function findAccountByAccountNumber(accountNumber) {
  const store = readStore();
  const normalized = String(accountNumber || "").trim();
  if (!normalized) {
    return null;
  }

  const account = Object.values(store.accounts).find((entry) => {
    return String(entry.accountNumber || "").trim() === normalized;
  }) ?? null;

  return account ? ensureAccountShape(account) : null;
}

export function findAccountByName(name) {
  const store = readStore();
  const normalized = normalizeName(name);

  if (!normalized) {
    return null;
  }

  const accounts = Object.values(store.accounts);
  const exactMatch = accounts.find((account) => normalizeName(account.name) === normalized);
  if (exactMatch) {
    return ensureAccountShape(exactMatch);
  }

  const partialMatch = accounts.find((account) => normalizeName(account.name).includes(normalized)) ?? null;
  return partialMatch ? ensureAccountShape(partialMatch) : null;
}

export function appendTransaction(entry) {
  return mutateStore((store) => appendTransactionToStore(store, entry));
}

export function appendTransactionToStore(store, entry) {
  store.transactions ??= [];
  const record = buildTransactionRecord(entry);
  store.transactions.push(record);
  return record;
}

export function listTransactionsForUser(discordUserId, limit = 10) {
  const store = readStore();
  return store.transactions
    .filter((entry) => entry.discordUserId === discordUserId)
    .sort((left, right) => new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime())
    .slice(0, limit);
}

export function listAllTransactions() {
  const store = readStore();
  return [...store.transactions].sort(
    (left, right) => new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime()
  );
}

function appendBudgetTransaction(store, entry) {
  ensureBudgetStoreShape(store);
  const record = {
    id: `${Date.now()}_${Math.floor(Math.random() * 10000)}`,
    createdAt: new Date().toISOString(),
    ...entry
  };
  store.budgetTransactions.push(record);
  return record;
}

export function getBudget(budgetKey) {
  const store = ensureBudgetStoreShape(readStore());
  return store.budgets[budgetKey] ?? null;
}

export function listBudgetTransactions(budgetKey, limit = 20) {
  const store = ensureBudgetStoreShape(readStore());
  return store.budgetTransactions
    .filter((entry) => entry.budgetKey === budgetKey)
    .sort((left, right) => new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime())
    .slice(0, limit);
}

export function updateBudget(budgetKey, updater) {
  const store = ensureBudgetStoreShape(readStore());
  const current = store.budgets[budgetKey];
  if (!current) {
    return null;
  }

  store.budgets[budgetKey] = {
    ...updater(structuredClone(current)),
    key: budgetKey,
    updatedAt: new Date().toISOString()
  };
  writeStore(store);
  return store.budgets[budgetKey];
}

export function applyBudgetTransaction({
  budgetKey,
  type,
  amount,
  actorUserId = null,
  targetUserId = null,
  note = "",
  label = ""
}) {
  const numericAmount = Number(amount);
  if (!Number.isFinite(numericAmount) || numericAmount <= 0) {
    return { ok: false, error: "invalid_amount" };
  }

  const store = ensureBudgetStoreShape(readStore());
  const budget = store.budgets[budgetKey];
  if (!budget) {
    return { ok: false, error: "budget_not_found" };
  }

  const isCredit = ["deposit", "weekly_allowance", "fine_income", "manual_add"].includes(type);
  if (!isCredit && budget.balance < numericAmount) {
    return { ok: false, error: "insufficient_budget_balance" };
  }

  budget.balance += isCredit ? numericAmount : -numericAmount;
  budget.updatedAt = new Date().toISOString();

  const transaction = appendBudgetTransaction(store, {
    budgetKey,
    type,
    label: label || type,
    amount: numericAmount,
    direction: isCredit ? "credit" : "debit",
    actorUserId,
    targetUserId,
    note,
    balanceAfter: budget.balance
  });

  writeStore(store);
  return { ok: true, budget: store.budgets[budgetKey], transaction };
}

export function applyWeeklyBudgetAllowances() {
  const store = ensureBudgetStoreShape(readStore());
  const now = Date.now();
  let changed = false;
  const applied = [];

  for (const definition of Object.values(BUDGET_DEFINITIONS)) {
    const amount = Number(definition.weeklyAllowance || 0);
    if (amount <= 0) {
      continue;
    }

    const budget = store.budgets[definition.key];
    if (!budget.lastWeeklyAllowanceAt) {
      budget.lastWeeklyAllowanceAt = new Date(now).toISOString();
      changed = true;
      continue;
    }

    const lastAppliedAt = new Date(budget.lastWeeklyAllowanceAt).getTime();

    if (now - lastAppliedAt < 7 * 24 * 60 * 60 * 1000) {
      continue;
    }

    budget.balance += amount;
    budget.updatedAt = new Date().toISOString();
    budget.lastWeeklyAllowanceAt = new Date(now).toISOString();
    appendBudgetTransaction(store, {
      budgetKey: definition.key,
      type: "weekly_allowance",
      label: "إضافة أسبوعية",
      amount,
      direction: "credit",
      actorUserId: null,
      targetUserId: null,
      note: "إضافة أسبوعية تلقائية",
      balanceAfter: budget.balance
    });
    changed = true;
    applied.push({ budgetKey: definition.key, amount, balance: budget.balance });
  }

  if (changed) {
    writeStore(store);
  }

  return applied;
}

function makeFourDigitId() {
  return String(Math.floor(1000 + Math.random() * 9000));
}

export function createFine(payload) {
  const store = readStore();
  const fineId = makeFourDigitId();
  store.fines[fineId] = {
    fineId,
    status: "unpaid",
    createdAt: new Date().toISOString(),
    ...payload
  };
  writeStore(store);
  return store.fines[fineId];
}

export function getFine(fineId) {
  const store = readStore();
  return store.fines[String(fineId)] ?? null;
}

export function getFinesForUser(discordUserId) {
  const store = readStore();
  return Object.values(store.fines).filter((fine) => fine.targetUserId === discordUserId);
}

export function listAllFines() {
  const store = readStore();
  return Object.values(store.fines);
}

export function updateFine(fineId, updater) {
  const store = readStore();
  const current = store.fines[String(fineId)];
  if (!current) {
    return null;
  }

  store.fines[String(fineId)] = updater(structuredClone(current));
  writeStore(store);
  return store.fines[String(fineId)];
}

export function removeFine(fineId) {
  const store = readStore();
  const record = store.fines[String(fineId)] ?? null;
  delete store.fines[String(fineId)];
  writeStore(store);
  return record;
}

export function createHoldRequest(payload) {
  const store = readStore();
  const requestId = `${Date.now()}_${Math.floor(Math.random() * 10000)}`;
  store.holdRequests[requestId] = {
    requestId,
    status: "pending",
    createdAt: new Date().toISOString(),
    ...payload
  };
  writeStore(store);
  return store.holdRequests[requestId];
}

export function getHoldRequest(requestId) {
  const store = readStore();
  return store.holdRequests[requestId] ?? null;
}

export function updateHoldRequest(requestId, updater) {
  const store = readStore();
  const current = store.holdRequests[requestId];
  if (!current) {
    return null;
  }

  store.holdRequests[requestId] = updater(structuredClone(current));
  writeStore(store);
  return store.holdRequests[requestId];
}

export function registerVehicleName(vehicleName) {
  const store = readStore();
  const resolvedVehicleName = resolveRegisteredVehicleNameFromStore(store, vehicleName);
  ensureVehicleRegistered(store, resolvedVehicleName);
  writeStore(store);
  return prettifyVehicleName(resolvedVehicleName);
}

export function listVehicleCatalog() {
  const store = ensureVehicleStoreShape(readStore());
  const ownedVehicles = Object.values(store.accounts).flatMap((account) => {
    const cars = ensureAccountShape(account).cars;
    return Object.values(cars).map((car) => car.name);
  });

  const merged = [...store.vehicleCatalog, ...Object.values(store.vehiclePrices).map((entry) => entry.name), ...ownedVehicles];
  const seen = new Set();
  return merged
    .map(prettifyVehicleName)
    .filter(Boolean)
    .filter((vehicleName) => {
      const normalized = normalizeVehicleName(vehicleName);
      if (seen.has(normalized)) {
        return false;
      }
      seen.add(normalized);
      return true;
    })
    .sort((left, right) => left.localeCompare(right));
}

export function getVehicleShowroomMetaRecord(vehicleName) {
  const store = ensureVehicleStoreShape(readStore());
  const normalized = normalizeVehicleName(vehicleName);
  if (!normalized) {
    return null;
  }

  const record = store.vehicleShowroomMeta[normalized];
  if (!record) {
    return null;
  }

  return {
    vehicleName: prettifyVehicleName(record.vehicleName || vehicleName),
    image: String(record.image || "").trim(),
    description: String(record.description || "").trim(),
    speed: Number(record.speed || 0),
    acceleration: String(record.acceleration || "").trim(),
    seats: Number(record.seats || 4),
    hidden: Boolean(record.hidden),
    updatedAt: record.updatedAt || null
  };
}

export function listVehicleShowroomMetaRecords() {
  const store = ensureVehicleStoreShape(readStore());
  const output = {};

  for (const [normalizedKey, record] of Object.entries(store.vehicleShowroomMeta || {})) {
    if (!record) {
      continue;
    }

    output[normalizedKey] = {
      vehicleName: prettifyVehicleName(record.vehicleName || normalizedKey),
      image: String(record.image || "").trim(),
      description: String(record.description || "").trim(),
      speed: Number(record.speed || 0),
      acceleration: String(record.acceleration || "").trim(),
      seats: Number(record.seats || 4),
      hidden: Boolean(record.hidden),
      updatedAt: record.updatedAt || null
    };
  }

  return output;
}

export function upsertVehicleShowroomMeta(vehicleName, metadata = {}) {
  const store = ensureVehicleStoreShape(readStore());
  const normalized = normalizeVehicleName(vehicleName);
  if (!normalized) {
    return null;
  }

  const resolvedVehicleName = resolveRegisteredVehicleNameFromStore(store, vehicleName);
  ensureVehicleRegistered(store, resolvedVehicleName);

  const current = store.vehicleShowroomMeta[normalized] ?? {
    vehicleName: prettifyVehicleName(resolvedVehicleName)
  };

  store.vehicleShowroomMeta[normalized] = {
    ...current,
    vehicleName: prettifyVehicleName(resolvedVehicleName),
    image: metadata.image === undefined ? String(current.image || "") : String(metadata.image || "").trim(),
    description: metadata.description === undefined
      ? String(current.description || "")
      : String(metadata.description || "").trim(),
    speed: metadata.speed === undefined ? Number(current.speed || 0) : Number(metadata.speed || 0),
    acceleration: metadata.acceleration === undefined
      ? String(current.acceleration || "")
      : String(metadata.acceleration || "").trim(),
    seats: metadata.seats === undefined ? Number(current.seats || 4) : Number(metadata.seats || 4),
    hidden: metadata.hidden === undefined ? Boolean(current.hidden) : Boolean(metadata.hidden),
    updatedAt: new Date().toISOString()
  };

  writeStore(store);
  return getVehicleShowroomMetaRecord(resolvedVehicleName);
}

export function setVehiclePrice(vehicleName, price) {
  const store = readStore();
  const normalized = normalizeVehicleName(vehicleName);
  if (!normalized) {
    return null;
  }

  const cleanName = prettifyVehicleName(vehicleName);
  ensureVehicleRegistered(store, cleanName);
  store.vehiclePrices[normalized] = {
    name: cleanName,
    price: Number(price),
    updatedAt: new Date().toISOString()
  };
  writeStore(store);
  return store.vehiclePrices[normalized];
}

export function getVehiclePriceRecord(vehicleName) {
  const store = ensureVehicleStoreShape(readStore());
  const normalized = normalizeVehicleName(vehicleName);
  if (!normalized) {
    return null;
  }

  const record = store.vehiclePrices[normalized];
  if (!record) {
    return null;
  }

  return {
    ...record,
    name: prettifyVehicleName(record.name)
  };
}

export function addOwnedVehicle(userId, vehicleName, metadata = {}) {
  const store = ensureVehicleStoreShape(readStore());
  const account = store.accounts[userId];
  if (!account) {
    return null;
  }

  ensureAccountShape(account);
  const resolvedVehicleName = resolveRegisteredVehicleNameFromStore(store, vehicleName);
  ensureVehicleRegistered(store, resolvedVehicleName);
  const normalized = normalizeVehicleName(resolvedVehicleName);
  account.cars ??= {};
  account.cars[normalized] = {
    name: prettifyVehicleName(resolvedVehicleName),
    purchasedAt: new Date().toISOString(),
    purchasePrice: Number(metadata.purchasePrice ?? 0),
    grantedBy: metadata.grantedBy ?? null,
    source: metadata.source ?? "purchase",
    expiresAt: metadata.expiresAt ?? null,
    rentalId: metadata.rentalId ?? null,
    projectKey: metadata.projectKey ?? null,
    projectName: metadata.projectName ?? null
  };

  writeStore(store);
  return account.cars[normalized];
}

export function removeOwnedVehicle(userId, vehicleName) {
  const store = readStore();
  const account = store.accounts[userId];
  if (!account) {
    return null;
  }

  ensureAccountShape(account);
  const normalized = normalizeVehicleName(vehicleName);
  const record = account.cars[normalized] ?? null;
  if (!record) {
    return null;
  }

  delete account.cars[normalized];
  writeStore(store);
  return record;
}

export function listOwnedVehicles(userId, options = {}) {
  const account = getAccount(userId);
  if (!account) {
    return [];
  }

  const ownedVehicles = Object.values(account.cars ?? {});
  if (options.includeRentals !== true) {
    return ownedVehicles.sort((left, right) => left.name.localeCompare(right.name));
  }

  const mergedVehicles = [...ownedVehicles];
  const ownedKeys = new Set(
    ownedVehicles
      .map((vehicle) => normalizeVehicleName(vehicle?.name))
      .filter(Boolean)
  );

  for (const rental of listActiveRentalsForUser(userId, options.at)) {
    const rentalName = prettifyVehicleName(rental?.vehicleName || "");
    const normalizedRentalName = normalizeVehicleName(rentalName);
    if (!normalizedRentalName || ownedKeys.has(normalizedRentalName)) {
      continue;
    }

    ownedKeys.add(normalizedRentalName);
    mergedVehicles.push({
      name: rentalName,
      source: "rental",
      rentalId: rental?.rentalId || "",
      expiresAt: rental?.expiresAt || null,
      projectKey: rental?.projectKey || null,
      projectName: rental?.projectName || null,
      purchasePrice: 0
    });
  }

  return mergedVehicles.sort((left, right) => {
    const leftRental = left?.source === "rental" ? 0 : 1;
    const rightRental = right?.source === "rental" ? 0 : 1;
    if (leftRental !== rightRental) {
      return leftRental - rightRental;
    }

    const leftExpiry = left?.source === "rental" && left?.expiresAt ? new Date(left.expiresAt).getTime() : 0;
    const rightExpiry = right?.source === "rental" && right?.expiresAt ? new Date(right.expiresAt).getTime() : 0;
    if (leftExpiry !== rightExpiry) {
      return rightExpiry - leftExpiry;
    }

    return String(left?.name || "").localeCompare(String(right?.name || ""));
  });
}

export function listActiveRentalsForUser(userId, at = Date.now()) {
  const store = ensureProjectStoreShape(readStore());
  const timestamp = Number(at) || Date.now();

  return Object.values(store.projects)
    .flatMap((record) => ensureProjectRecordShape(record, { key: record?.key }).rentals || [])
    .filter((rental) => {
      if (!rental || String(rental.userId || "") !== String(userId || "")) {
        return false;
      }

      const expiresAt = rental.expiresAt ? new Date(rental.expiresAt).getTime() : 0;
      return expiresAt > timestamp;
    });
}

export function listActiveRentalsMatchingVehicle(vehicleName, at = Date.now()) {
  const store = ensureProjectStoreShape(readStore());
  const timestamp = Number(at) || Date.now();
  const lookupKey = normalizeVehicleLookupKey(vehicleName);
  const comparableTarget = normalizeVehicleComparableName(vehicleName);

  if (!lookupKey && !comparableTarget) {
    return [];
  }

  return Object.values(store.projects)
    .flatMap((record) => ensureProjectRecordShape(record, { key: record?.key }).rentals || [])
    .filter((rental) => {
      const expiresAt = rental?.expiresAt ? new Date(rental.expiresAt).getTime() : 0;
      if (expiresAt <= timestamp) {
        return false;
      }

      const rentalLookupKey = normalizeVehicleLookupKey(rental?.vehicleName);
      if (lookupKey && rentalLookupKey === lookupKey) {
        return true;
      }

      if (areVehicleNamesEquivalent(rental?.vehicleName, vehicleName)) {
        return true;
      }

      const comparableRental = normalizeVehicleComparableName(rental?.vehicleName);
      return Boolean(
        comparableTarget
        && comparableRental
        && (
          comparableRental === comparableTarget
          || comparableRental.includes(comparableTarget)
          || comparableTarget.includes(comparableRental)
        )
      );
    });
}

export function userOwnsVehicle(userId, vehicleName) {
  const account = getAccount(userId);
  const store = ensureVehicleStoreShape(readStore());
  const resolvedVehicleName = resolveRegisteredVehicleNameFromStore(store, vehicleName);
  const normalized = normalizeVehicleName(resolvedVehicleName);
  if (account?.cars?.[normalized]) {
    return true;
  }

  const lookupKey = normalizeVehicleLookupKey(resolvedVehicleName || vehicleName);
  if (!lookupKey) {
    return false;
  }

  const ownsPermanently = Object.entries(account?.cars ?? {}).some(([storedKey, record]) => {
    return normalizeVehicleLookupKey(storedKey) === lookupKey
      || normalizeVehicleLookupKey(record?.name) === lookupKey
      || areVehicleNamesEquivalent(record?.name, resolvedVehicleName || vehicleName);
  }) || Object.values(account?.cars ?? {}).some((record) => {
    return areVehicleNamesEquivalent(record?.name, resolvedVehicleName || vehicleName);
  });

  if (ownsPermanently) {
    return true;
  }

  return listActiveRentalsForUser(userId).some((rental) => {
    return areVehicleNamesEquivalent(rental?.vehicleName, resolvedVehicleName || vehicleName)
      || normalizeVehicleLookupKey(rental?.vehicleName) === lookupKey;
  });
}

export function findOwnedVehicleMatch(userId, vehicleName) {
  const account = getAccount(userId);
  const store = ensureVehicleStoreShape(readStore());
  const resolvedVehicleName = resolveRegisteredVehicleNameFromStore(store, vehicleName);
  const comparableTarget = normalizeVehicleComparableName(resolvedVehicleName || vehicleName);
  const lookupKey = normalizeVehicleLookupKey(resolvedVehicleName || vehicleName);

  const records = Object.values(account?.cars ?? {}).filter(Boolean);
  for (const record of records) {
    if (
      normalizeVehicleLookupKey(record?.name) === lookupKey
      || areVehicleNamesEquivalent(record?.name, resolvedVehicleName || vehicleName)
    ) {
      return record;
    }

    const comparableOwned = normalizeVehicleComparableName(record?.name);
    if (
      comparableTarget
      && comparableOwned
      && (
        comparableOwned === comparableTarget
        || comparableOwned.includes(comparableTarget)
        || comparableTarget.includes(comparableOwned)
      )
    ) {
      return record;
    }
  }

  const activeRental = listActiveRentalsForUser(userId).find((rental) => {
    return normalizeVehicleLookupKey(rental?.vehicleName) === lookupKey
      || areVehicleNamesEquivalent(rental?.vehicleName, resolvedVehicleName || vehicleName)
      || (
        comparableTarget
        && normalizeVehicleComparableName(rental?.vehicleName)
        && (
          normalizeVehicleComparableName(rental?.vehicleName) === comparableTarget
          || normalizeVehicleComparableName(rental?.vehicleName).includes(comparableTarget)
          || comparableTarget.includes(normalizeVehicleComparableName(rental?.vehicleName))
        )
      );
  });

  if (activeRental) {
    return {
      name: prettifyVehicleName(activeRental.vehicleName),
      source: "rental",
      rentalId: activeRental.rentalId || "",
      expiresAt: activeRental.expiresAt || null,
      projectKey: activeRental.projectKey || null
    };
  }

  return null;
}

export function resolveRegisteredVehicleName(vehicleName) {
  const store = ensureVehicleStoreShape(readStore());
  return resolveRegisteredVehicleNameFromStore(store, vehicleName);
}

export function processExpiredRentalOwnerships(at = Date.now()) {
  const store = ensureVehicleStoreShape(ensureProjectStoreShape(readStore()));
  const timestamp = Number(at) || Date.now();
  let removedRentalCars = 0;
  let removedRentalEntries = 0;
  const expiredRentalSnapshots = [];

  for (const account of Object.values(store.accounts ?? {})) {
    ensureAccountShape(account);
    const nextCars = {};

    for (const [vehicleKey, record] of Object.entries(account.cars ?? {})) {
      const isRentalVehicle = String(record?.source || "") === "rental";
      const expiresAt = record?.expiresAt ? new Date(record.expiresAt).getTime() : 0;
      if (isRentalVehicle && expiresAt > 0 && expiresAt <= timestamp) {
        removedRentalCars += 1;
        expiredRentalSnapshots.push({
          userId: account.discordUserId || null,
          vehicleName: prettifyVehicleName(record?.name || ""),
          expiresAt: record?.expiresAt || null,
          projectKey: record?.projectKey || null,
          projectName: record?.projectName || null,
          rentalId: record?.rentalId || null
        });
        continue;
      }

      nextCars[vehicleKey] = record;
    }

    account.cars = nextCars;
  }

  for (const projectKey of Object.keys(store.projects ?? {})) {
    const current = ensureProjectRecordShape(store.projects[projectKey] ?? {}, { key: projectKey });
    const currentRentals = Array.isArray(current.rentals) ? current.rentals : [];
    const nextRentals = currentRentals.filter((rental) => {
      const expiresAt = rental?.expiresAt ? new Date(rental.expiresAt).getTime() : 0;
      const keep = expiresAt > timestamp;
      if (!keep) {
        removedRentalEntries += 1;
      }
      return keep;
    });

    store.projects[projectKey] = ensureProjectRecordShape({
      ...current,
      rentals: nextRentals
    }, { key: projectKey });
  }

  if (removedRentalCars > 0 || removedRentalEntries > 0) {
    writeStore(store);
  }

  return {
    removedRentalCars,
    removedRentalEntries,
    expiredRentalSnapshots
  };
}

export function syncActiveRentalOwnerships(at = Date.now()) {
  const store = ensureVehicleStoreShape(ensureProjectStoreShape(readStore()));
  const timestamp = Number(at) || Date.now();
  let syncedRentalCars = 0;

  for (const projectKey of Object.keys(store.projects ?? {})) {
    const project = ensureProjectRecordShape(store.projects[projectKey] ?? {}, { key: projectKey });
    const rentals = Array.isArray(project.rentals) ? project.rentals : [];

    for (const rental of rentals) {
      const userId = String(rental?.userId || "").trim();
      const vehicleName = prettifyVehicleName(rental?.vehicleName || "");
      const expiresAt = rental?.expiresAt ? new Date(rental.expiresAt).getTime() : 0;
      if (!userId || !vehicleName || expiresAt <= timestamp) {
        continue;
      }

      const account = store.accounts?.[userId];
      if (!account) {
        continue;
      }

      ensureAccountShape(account);
      ensureVehicleRegistered(store, vehicleName);
      const resolvedVehicleName = resolveRegisteredVehicleNameFromStore(store, vehicleName);
      const normalizedVehicleKey = normalizeVehicleName(resolvedVehicleName || vehicleName);
      if (!normalizedVehicleKey) {
        continue;
      }

      const currentRecord = account.cars?.[normalizedVehicleKey] ?? null;
      const nextRecord = {
        ...(currentRecord || {}),
        name: prettifyVehicleName(resolvedVehicleName || vehicleName),
        purchasedAt: currentRecord?.purchasedAt || rental?.startedAt || new Date().toISOString(),
        purchasePrice: 0,
        grantedBy: "website_rental",
        source: "rental",
        expiresAt: rental.expiresAt || null,
        rentalId: rental.rentalId || null,
        projectKey: rental.projectKey || project.key || null,
        projectName: rental.projectName || project.name || null
      };

      const changed = !currentRecord
        || String(currentRecord?.source || "") !== "rental"
        || String(currentRecord?.rentalId || "") !== String(nextRecord.rentalId || "")
        || String(currentRecord?.expiresAt || "") !== String(nextRecord.expiresAt || "")
        || String(currentRecord?.projectKey || "") !== String(nextRecord.projectKey || "");

      account.cars ??= {};
      account.cars[normalizedVehicleKey] = nextRecord;

      if (changed) {
        syncedRentalCars += 1;
      }
    }
  }

  if (syncedRentalCars > 0) {
    writeStore(store);
  }

  return { syncedRentalCars };
}

export function repairAllVehicleOwnershipRecords() {
  const store = ensureVehicleStoreShape(readStore());
  let repairedAccounts = 0;
  let repairedVehicles = 0;

  for (const account of Object.values(store.accounts ?? {})) {
    ensureAccountShape(account);
    const originalCars = Object.values(account.cars ?? {});
    if (!originalCars.length) {
      continue;
    }

    const nextCars = {};
    let accountChanged = false;

    for (const car of originalCars) {
      const rawName = prettifyVehicleName(car?.name || "");
      const repairedName = resolveRegisteredVehicleNameFromStore(store, rawName);
      const normalizedKey = normalizeVehicleName(repairedName || rawName);
      if (!normalizedKey) {
        continue;
      }

      const previousRecord = nextCars[normalizedKey];
      nextCars[normalizedKey] = {
        ...previousRecord,
        ...car,
        name: prettifyVehicleName(repairedName || rawName)
      };

      if (!previousRecord) {
        ensureVehicleRegistered(store, repairedName || rawName);
      }

      if ((car?.name || "") !== (repairedName || rawName) || !account.cars?.[normalizedKey]) {
        accountChanged = true;
        repairedVehicles += 1;
      }
    }

    if (accountChanged || Object.keys(nextCars).length !== Object.keys(account.cars ?? {}).length) {
      account.cars = nextCars;
      repairedAccounts += 1;
    }
  }

  if (repairedAccounts > 0 || repairedVehicles > 0) {
    writeStore(store);
  }

  return {
    repairedAccounts,
    repairedVehicles
  };
}

export function getProject(projectKey) {
  const store = ensureProjectStoreShape(readStore());
  const record = store.projects[String(projectKey)] ?? null;
  return record ? ensureProjectRecordShape(record, { key: String(projectKey) }) : null;
}

export function listProjects() {
  const store = ensureProjectStoreShape(readStore());
  return Object.values(store.projects).map((record) => ensureProjectRecordShape(record, { key: record.key }));
}

export function upsertProject(projectKey, updater) {
  const store = ensureProjectStoreShape(readStore());
  const key = String(projectKey);
  const current = ensureProjectRecordShape(store.projects[key] ?? {}, { key });
  const updated = ensureProjectRecordShape(
    updater(structuredClone(current)) ?? current,
    { key }
  );
  updated.updatedAt = new Date().toISOString();
  store.projects[key] = updated;
  writeStore(store);
  return store.projects[key];
}

export function appendProjectTransaction(entry) {
  const store = ensureProjectStoreShape(readStore());
  const record = {
    id: `${Date.now()}_${Math.floor(Math.random() * 10000)}`,
    createdAt: new Date().toISOString(),
    ...entry
  };
  store.projectTransactions.push(record);
  writeStore(store);
  return record;
}

export function listProjectTransactions(projectKey, limit = 20) {
  const store = ensureProjectStoreShape(readStore());
  return store.projectTransactions
    .filter((entry) => entry.projectKey === projectKey)
    .sort((left, right) => new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime())
    .slice(0, limit);
}
