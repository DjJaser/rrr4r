import { ActionRowBuilder, ButtonBuilder, ButtonStyle, Routes } from "discord.js";

export function registerWebsiteRoutes(app, deps) {
  const {
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
  } = deps;
  const websiteRouteCache = new Map();
  const WEBSITE_ROUTE_CACHE_TTL_MS = 4000;

  function getWebsiteCacheKey(kind, discordUserId, extra = "") {
    return `${kind}:${String(discordUserId || "unknown")}:${String(extra || "")}`;
  }

  function readWebsiteRouteCache(kind, discordUserId, extra = "") {
    const key = getWebsiteCacheKey(kind, discordUserId, extra);
    const cached = websiteRouteCache.get(key);
    if (!cached) {
      return null;
    }

    if (Date.now() - cached.createdAt > WEBSITE_ROUTE_CACHE_TTL_MS) {
      websiteRouteCache.delete(key);
      return null;
    }

    return structuredClone(cached.value);
  }

  function writeWebsiteRouteCache(kind, discordUserId, value, extra = "") {
    const key = getWebsiteCacheKey(kind, discordUserId, extra);
    websiteRouteCache.set(key, {
      createdAt: Date.now(),
      value: structuredClone(value)
    });
    return value;
  }

  function invalidateWebsiteRouteCache(discordUserId) {
    const needle = `:${String(discordUserId || "unknown")}:`;
    for (const key of websiteRouteCache.keys()) {
      if (key.includes(needle)) {
        websiteRouteCache.delete(key);
      }
    }
  }

  function isAuthorizedInternalRequest(req) {
    const apiKey = String(req.headers["x-api-key"] || req.headers["x-internal-api-key"] || "").trim();
    return Boolean(apiKey) && apiKey === config.internalApiKey;
  }

  async function logWebsiteAction(payload) {
    if (typeof sendSystemLogs !== "function") {
      return;
    }

    await sendSystemLogs([config.websiteLogChannelId || "1503717012315308123"], payload).catch(() => null);
  }

  function buildWebsiteActorFields(account) {
    return [
      { name: "👤 **صاحب الحساب**", value: `**<@${account?.discordUserId || "0"}>**`, inline: true },
      { name: "🎮 **يوزر روبلوكس**", value: `**${account?.robloxUsername || "غير معروف"}**`, inline: true }
    ];
  }

  function buildWebsiteAccountSnapshot(account) {
    if (!account) {
      return null;
    }

    const ownedVehicles = account.discordUserId
      ? listOwnedVehicles(account.discordUserId, { includeRentals: true }).map((vehicle) => vehicle.name).filter(Boolean)
      : [];

    return {
      discordUserId: account.discordUserId,
      bankAccountId: account.accountNumber,
      accountNumber: account.accountNumber,
      name: account.name,
      age: account.age ?? null,
      country: account.country ?? null,
      info: account.info ?? null,
      robloxUsername: account.robloxUsername,
      balance: Number(account.balance || 0),
      bankFrozen: Boolean(account.bankFrozen),
      bankFrozenReason: account.bankFrozenReason || null,
      ownedCarsCount: ownedVehicles.length,
      ownedCars: ownedVehicles
    };
  }

  function authenticateWebsiteAccountFromBody(payload = {}, options = {}) {
    const requireUsername = options.requireUsername !== false;
    const bankAccountId = String(payload?.bankAccountId || payload?.accountNumber || "").trim();
    const robloxUsername = extractWebsiteRobloxUsername(payload);

    if (!bankAccountId || (requireUsername && !robloxUsername)) {
      return {
        ok: false,
        status: 400,
        error: requireUsername ? "missing_credentials" : "missing_account_number"
      };
    }

    let account = findAccountByAccountNumber(bankAccountId);
    if (!account && requireUsername && robloxUsername) {
      account = findAccountByRobloxUsername(robloxUsername);
    }

    if (!account) {
      return { ok: false, status: 404, error: "account_not_found" };
    }

    if (
      requireUsername
      && normalizeWebsiteRobloxUsername(account.robloxUsername) !== normalizeWebsiteRobloxUsername(robloxUsername)
      && normalizeWebsiteRobloxUsernameVisual(account.robloxUsername) !== normalizeWebsiteRobloxUsernameVisual(robloxUsername)
    ) {
      return { ok: false, status: 403, error: "username_mismatch" };
    }

    return {
      ok: true,
      account,
      bankAccountId: account.accountNumber,
      robloxUsername
    };
  }

  function buildWebsiteTransactionSnapshot(entry = {}) {
    return {
      id: entry.id || "",
      type: entry.type || "",
      amount: Number(entry.amount || 0),
      direction: entry.direction || "none",
      balanceAfter: Number(entry.balanceAfter || 0),
      robloxUsername: entry.robloxUsername || "",
      createdAt: entry.createdAt || null,
      metadata: entry.metadata || {}
    };
  }

  function getProjectAccessLevelByUserId(discordUserId, project) {
    if (!discordUserId || !project) {
      return "none";
    }

    if (project.ownerUserId === discordUserId) {
      return "owner";
    }

    if (project.partners?.includes(discordUserId)) {
      return "partner";
    }

    if (project.admins?.includes(discordUserId)) {
      return "admin";
    }

    if (project.employees?.includes(discordUserId)) {
      return "employee";
    }

    return "none";
  }

  function buildWebsiteProjectSnapshot(projectRecord, discordUserId) {
    if (!projectRecord) {
      return null;
    }

    const project = ensureProjectState(projectRecord.key) || projectRecord;
    const definition = getProjectDefinition(project.key);
    const accessLevel = getProjectAccessLevelByUserId(discordUserId, project);

    return {
      key: project.key,
      name: project.name || definition?.title || project.key,
      type: project.type || definition?.type || "",
      title: definition?.title || project.name || project.key,
      color: definition?.color || 0,
      ownerUserId: project.ownerUserId || null,
      ownerMention: getProjectOwnerMention(project),
      budget: Number(project.budget || 0),
      fuelPercent: definition?.type === "station" ? Number(project.fuelPercent || 0) : null,
      accessLevel,
      dashboardChannelId: project.dashboardChannelId || null,
      dashboardMessageId: project.dashboardMessageId || null,
      ordersChannelId: project.ordersChannelId || null,
      partners: Array.isArray(project.partners) ? [...project.partners] : [],
      admins: Array.isArray(project.admins) ? [...project.admins] : [],
      employees: Array.isArray(project.employees) ? [...project.employees] : [],
      showroomVehicles: Array.isArray(project.showroomVehicles) ? [...project.showroomVehicles] : [],
      rentals: Array.isArray(project.rentals) ? [...project.rentals] : [],
      metrics: {
        fuelPercent: definition?.type === "station" ? Number(project.fuelPercent || 0) : null,
        showroomVehiclesCount: definition?.type === "showroom"
          ? (Array.isArray(project.showroomVehicles) ? project.showroomVehicles.length : 0)
          : 0,
        rentalsCount: definition?.type === "showroom"
          ? (Array.isArray(project.rentals) ? project.rentals.length : 0)
          : 0
      }
    };
  }

  function buildWebsiteVehicleCatalogForUser(discordUserId) {
    const ownedVehicleNames = new Set(
      listOwnedVehicles(discordUserId, { includeRentals: true })
        .map((vehicle) => normalizeVehicleName(vehicle.name))
        .filter(Boolean)
    );
    const showroomMetaRecords = typeof listVehicleShowroomMetaRecords === "function"
      ? listVehicleShowroomMetaRecords()
      : {};

    return getSortedVehicleCatalog()
      .map((vehicle) => {
        const meta = showroomMetaRecords[normalizeVehicleName(vehicle.name)] || null;
        if (meta?.hidden) {
          return null;
        }

        return {
          name: vehicle.name,
          price: Number(vehicle.price || 0),
          isFree: Boolean(vehicle.isFree),
          owned: ownedVehicleNames.has(normalizeVehicleName(vehicle.name)),
          image: meta?.image || "",
          description: meta?.description || "",
          speed: Number(meta?.speed || 0),
          acceleration: meta?.acceleration || "",
          seats: Number(meta?.seats || 4),
          hidden: Boolean(meta?.hidden)
        };
      })
      .filter(Boolean);
  }

  function buildWebsiteProjectsForUser(discordUserId) {
    const projectRecords = new Map();

    for (const project of listProjects()) {
      if (project?.key) {
        projectRecords.set(project.key, project);
      }
    }

    for (const projectKey of Object.keys(PROJECT_DEFINITIONS || {})) {
      if (!projectRecords.has(projectKey)) {
        const definition = getProjectDefinition(projectKey);
        if (!definition) {
          continue;
        }

        projectRecords.set(projectKey, {
          key: projectKey,
          type: definition.type,
          name: definition.title,
          ownerUserId: null,
          ownerName: "",
          budget: 0,
          fuelPercent: definition.type === "station" ? 100 : 0,
          dashboardChannelId: null,
          dashboardMessageId: null,
          ordersChannelId: null,
          partners: [],
          admins: [],
          employees: [],
          showroomVehicles: [],
          rentals: []
        });
      }
    }

    return Array.from(projectRecords.values())
      .map((project) => buildWebsiteProjectSnapshot(project, discordUserId))
      .filter((project) => project && project.accessLevel !== "none");
  }

  function canManageWebsiteProject(account, project) {
    const accessLevel = getProjectAccessLevelByUserId(account?.discordUserId, project);
    return ["owner", "partner", "admin"].includes(accessLevel);
  }

  function buildWebsiteRentalOfferSnapshot(project, vehicle = {}, meta = null) {
    const canonicalName = String(vehicle.vehicleName || vehicle.name || "").trim();
    const pricePerHour = Number(vehicle.pricePerHour || 0);
    const pricePerDay = Number(vehicle.pricePerDay || 0);

    return {
      vehicleName: canonicalName,
      projectKey: project.key,
      projectName: project.name || getProjectDefinition(project.key)?.title || project.key,
      image: vehicle.image || meta?.image || "",
      description: vehicle.description || meta?.description || "",
      speed: Number(vehicle.speed || meta?.speed || 0),
      acceleration: vehicle.acceleration || meta?.acceleration || "",
      seats: Number(vehicle.seats || meta?.seats || 4),
      pricePerHour,
      pricePerDay,
      hidden: Boolean(vehicle.hidden),
      rentable: !Boolean(vehicle.hidden) && (pricePerHour > 0 || pricePerDay > 0),
      maxHours: 12,
      maxDays: 3
    };
  }

  function buildWebsiteRentalCatalog(discordUserId) {
    const showroomProjects = listProjects()
      .filter((project) => getProjectDefinition(project.key)?.type === "showroom");
    const showroomMetaRecords = typeof listVehicleShowroomMetaRecords === "function"
      ? listVehicleShowroomMetaRecords()
      : {};

    const activeRentalByListingKey = new Map();
    const now = Date.now();
    for (const project of showroomProjects) {
      for (const rental of Array.isArray(project.rentals) ? project.rentals : []) {
        const expiresAt = rental?.expiresAt ? new Date(rental.expiresAt).getTime() : 0;
        if (!rental?.vehicleName || !rental?.projectKey || expiresAt <= now) {
          continue;
        }

        const rentalKey = `${String(rental.projectKey).trim()}|${normalizeVehicleName(rental.vehicleName)}`;
        if (!rentalKey || activeRentalByListingKey.has(rentalKey)) {
          continue;
        }

        activeRentalByListingKey.set(rentalKey, rental);
      }
    }

    const ownedVehicleNames = new Set(
      listOwnedVehicles(discordUserId, { includeRentals: true })
        .map((vehicle) => normalizeVehicleName(vehicle.name))
        .filter(Boolean)
    );

    return showroomProjects
      .flatMap((project) =>
        (Array.isArray(project.showroomVehicles) ? project.showroomVehicles : []).map((vehicle) => {
          const meta = showroomMetaRecords[normalizeVehicleName(vehicle.vehicleName || vehicle.name || "")] || null;
          const offer = buildWebsiteRentalOfferSnapshot(project, vehicle, meta);
          const listingKey = `${project.key}|${normalizeVehicleName(offer.vehicleName)}`;
          const activeRental = activeRentalByListingKey.get(listingKey) || null;
          const normalizedVehicleName = normalizeVehicleName(offer.vehicleName);

          if (meta?.hidden || offer.hidden) {
            return null;
          }

          return {
            name: offer.vehicleName,
            price: 0,
            isFree: false,
            owned: ownedVehicleNames.has(normalizedVehicleName),
            image: offer.image || meta?.image || "",
            description: offer.description || meta?.description || "",
            speed: Number(offer.speed || meta?.speed || 0),
            acceleration: offer.acceleration || meta?.acceleration || "",
            seats: Number(offer.seats || meta?.seats || 4),
            hidden: false,
            rentable: Boolean(offer.rentable) && !activeRental,
            currentRenter: activeRental?.userId || null,
            availableUntil: activeRental?.expiresAt || null,
            projectKey: offer.projectKey,
            projectName: offer.projectName,
            rentalOffers: [offer]
          };
        })
      )
      .filter(Boolean);
  }

  function buildWebsiteFineSnapshot(fine = {}) {
    return {
      fineId: String(fine.fineId || ""),
      amount: Number(fine.amount || 0),
      status: String(fine.status || "unpaid"),
      reason: String(fine.reason || ""),
      violationType: String(fine.violationType || ""),
      officerName: String(fine.officerName || ""),
      targetName: String(fine.targetName || ""),
      createdAt: fine.createdAt || null,
      paidAt: fine.paidAt || null
    };
  }

  function normalizeLookupValue(value = "") {
    return String(value || "")
      .trim()
      .toLowerCase()
      .replace(/^aw\s*\|\s*/i, "")
      .replace(/\s+/g, " ");
  }

  async function findAccountByDiscordIdentityText(value = "") {
    const guild = client?.guilds?.cache?.get?.(config.guildId)
      || await client?.guilds?.fetch?.(config.guildId).catch(() => null)
      || null;
    const normalized = normalizeLookupValue(value);
    if (!guild || !normalized) {
      return null;
    }

    const mentionMatch = String(value || "").match(/^<@!?(\d{10,20})>$/);
    if (mentionMatch?.[1]) {
      return getAccount(mentionMatch[1]);
    }

    const findMatchingMember = (members) => members.find((member) => {
      const candidateValues = [
        member.user?.username,
        member.user?.globalName,
        member.displayName,
        member.nickname
      ];

      return candidateValues.some((candidate) => {
        const normalizedCandidate = normalizeLookupValue(candidate || "");
        return Boolean(
          normalizedCandidate
          && (
            normalizedCandidate === normalized
            || normalizedCandidate.includes(normalized)
            || normalized.includes(normalizedCandidate)
          )
        );
      });
    }) || null;

    let matchedMember = findMatchingMember([...guild.members.cache.values()]);

    if (!matchedMember) {
      const fetchedMembers = await guild.members.fetch({ query: value, limit: 25 }).catch(() => null);
      if (fetchedMembers?.size) {
        matchedMember = findMatchingMember([...fetchedMembers.values()]);
      }
    }

    return matchedMember ? getAccount(matchedMember.id) : null;
  }

  function doesFineBelongToAccount(fine, account) {
    if (!fine || !account) {
      return false;
    }

    const accountDiscordUserId = String(account.discordUserId || "").trim();
    const fineTargetUserId = String(fine.targetUserId || "").trim();
    const accountName = normalizeLookupValue(account.name || "");
    const accountRobloxUsername = normalizeLookupValue(account.robloxUsername || "");
    const fineTargetName = normalizeLookupValue(fine.targetName || "");

    return Boolean(
      (accountDiscordUserId && fineTargetUserId && fineTargetUserId === accountDiscordUserId)
      || (accountName && fineTargetName && fineTargetName === accountName)
      || (accountRobloxUsername && fineTargetName && fineTargetName === accountRobloxUsername)
    );
  }

  function getWebsiteAccessibleFinesForAccount(account) {
    const directMatches = getFinesForUser(account.discordUserId).filter(Boolean);
    const fallbackMatches = listAllFines().filter((fine) => doesFineBelongToAccount(fine, account));
    const merged = new Map();

    for (const fine of [...directMatches, ...fallbackMatches]) {
      if (fine?.fineId) {
        merged.set(String(fine.fineId), fine);
      }
    }

    return [...merged.values()];
  }

  function createWebsiteVerificationCode() {
    return String(Math.floor(100000 + Math.random() * 900000));
  }

  function normalizeWebsiteVerificationCode(value) {
    return String(value || "")
      .replace(/[٠-٩]/g, (digit) => String("٠١٢٣٤٥٦٧٨٩".indexOf(digit)))
      .replace(/\D+/g, "");
  }

  function clearOlderWebsiteVerifications(discordUserId, robloxUsername) {
    const normalizedUsername = String(robloxUsername || "").trim().toLowerCase();
    const now = Date.now();
    const staleUsedWindowMs = 30 * 60 * 1000;

    for (const [key, pending] of pendingWebsiteLoginVerifications.entries()) {
      if (!pending) {
        pendingWebsiteLoginVerifications.delete(key);
        continue;
      }

      const sameDiscordUser = discordUserId && pending?.discordUserId === discordUserId;
      const sameUsername =
        normalizedUsername
        && String(pending?.robloxUsername || "").trim().toLowerCase() === normalizedUsername;

      if (!sameDiscordUser && !sameUsername) {
        continue;
      }

      const expired = now > Number(pending.expiresAt || 0) + 60 * 1000;
      const usedAtTime = pending.usedAt ? new Date(pending.usedAt).getTime() : 0;
      const staleUsed = Boolean(pending.used) && usedAtTime > 0 && now - usedAtTime > staleUsedWindowMs;

      if (expired || staleUsed) {
        pendingWebsiteLoginVerifications.delete(key);
      }
    }
  }

  function createWebsiteVerificationId() {
    return `verify_${Date.now()}_${Math.floor(Math.random() * 100000)}`;
  }

  function normalizeWebsiteRobloxUsername(value) {
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

    return String(preferredToken || tokens[0] || raw).trim().toLowerCase();
  }

  function normalizeWebsiteRobloxUsernameVisual(value) {
    return normalizeWebsiteRobloxUsername(value).replace(/[li1]/g, "1");
  }

  function extractWebsiteRobloxUsername(payload = {}) {
    const raw = String(
      payload?.robloxUsername ||
      payload?.username ||
      payload?.robloxUser ||
      payload?.userName ||
      ""
    ).trim();
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

    return String(preferredToken || tokens[0] || raw).trim();
  }

  function getCachedDiscordUser(discordUserId) {
    const directUser = client?.users?.cache?.get?.(discordUserId) || null;
    if (directUser) {
      return directUser;
    }

    const guild = client?.guilds?.cache?.get?.(config.guildId) || null;
    const memberUser = guild?.members?.cache?.get?.(discordUserId)?.user || null;
    return memberUser || null;
  }

  function delay(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  function buildWebsiteVerificationDmPayload({ verificationId, account, robloxUsername, code, expiresAt }) {
    const safeUsername = account?.robloxUsername || robloxUsername || "غير معروف";
    const safeAccountNumber = account?.accountNumber || "غير متوفر";

    return {
      content: [
        "بوابة Arab World | رمز التحقق",
        `يوزر روبلوكس: ${safeUsername}`,
        `رقم الحساب: ${safeAccountNumber}`,
        `رمز التحقق: ${code}`,
        `صلاحية الرمز: <t:${Math.floor(expiresAt / 1000)}:R>`
      ].join("\n"),
      embeds: [
        new EmbedBuilder()
          .setColor(0x0b1f3a)
          .setTitle("بوابة عرب وورلد | رمز التحقق")
          .setDescription(
            [
              "تم طلب تسجيل دخول جديد إلى موقع عرب وورلد.",
              "استخدم رمز التحقق أدناه لإكمال الدخول بأمان."
            ].join("\n")
          )
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

  const softWebsiteDeliveryErrors = new Set([
    "discord_cached_dm_timeout",
    "discord_user_fetch_failed",
    "discord_user_fetch_timeout",
    "discord_fetched_dm_timeout",
    "guild_member_lookup_timeout",
    "guild_member_not_found",
    "discord_dm_channel_timeout",
    "discord_dm_send_timeout"
  ]);

  async function sendWebsiteVerificationDm(discordUserId, payload) {
    if (!discordUserId) {
      return { ok: false, error: "discord_user_not_found" };
    }

    const attemptViaCachedUser = async () => {
      const cachedUser = getCachedDiscordUser(discordUserId);
      if (!cachedUser) {
        return { ok: false, error: "discord_user_not_cached" };
      }

      await withTimeout(
        () => cachedUser.send(payload),
        15000,
        "discord_cached_dm_timeout"
      );

      return { ok: true, delivery: "dm_cache" };
    };

    const attemptViaFetchedUser = async () => {
      const fetchedUser = await withTimeout(
        () => client.users.fetch(discordUserId, { force: true }),
        60000,
        "discord_user_fetch_timeout"
      );

      if (!fetchedUser) {
        return { ok: false, error: "discord_user_fetch_failed" };
      }

      await withTimeout(
        () => fetchedUser.send(payload),
        15000,
        "discord_fetched_dm_timeout"
      );

      return { ok: true, delivery: "dm_fetch" };
    };

    const attemptViaGuildMember = async () => {
      const member = await withTimeout(
        () => findGuildMemberForWebsiteAccess(discordUserId),
        15000,
        "guild_member_lookup_timeout"
      );

      if (!member?.user) {
        return { ok: false, error: "guild_member_not_found" };
      }

      await withTimeout(
        () => member.user.send(payload),
        15000,
        "discord_member_dm_timeout"
      );

      return { ok: true, delivery: "dm_member" };
    };

    const attempts = [
      attemptViaCachedUser,
      attemptViaFetchedUser
    ];

    let lastError = "dm_delivery_failed";

    try {
      for (let index = 0; index < attempts.length; index += 1) {
        try {
          const result = await attempts[index]();
          if (result?.ok) {
            return result;
          }
          if (result?.error) {
            lastError = result.error;
          }
          console.warn("[WEBSITE LOGIN] DM attempt returned non-ok", JSON.stringify({
            discordUserId,
            attemptIndex: index,
            error: result?.error || null
          }));
        } catch (error) {
          lastError = error?.message || lastError;
          console.warn("[WEBSITE LOGIN] DM attempt threw", JSON.stringify({
            discordUserId,
            attemptIndex: index,
            error: error?.message || String(error)
          }));
        }

        if (index < attempts.length - 1) {
          await delay(1200);
        }
      }
    } catch (error) {
      lastError = error?.message || (error?.code ? `discord_api_${error.code}` : lastError);
    }

    return {
      ok: false,
      error: lastError || "dm_delivery_failed"
    };
  }

  async function sendWebsiteVerificationDmForLogin(discordUserId, payload) {
    if (!discordUserId) {
      return { ok: false, error: "discord_user_not_found" };
    }

    try {
      const cachedUser = client?.users?.cache?.get?.(discordUserId) || null;
      const fetchedUser = cachedUser
        ? null
        : await withTimeout(
            () => client.users.fetch(discordUserId, { force: true }),
            30000,
            "discord_user_fetch_timeout"
          ).catch(() => null);
      const targetUser = cachedUser || fetchedUser || null;

      if (!targetUser) {
        return { ok: false, error: "discord_user_fetch_failed" };
      }

      await withTimeout(
        () => targetUser.send(payload),
        15000,
        "discord_dm_send_timeout"
      );

      return {
        ok: true,
        delivery: cachedUser ? "dm_cache" : "dm_fetch",
        targetId: targetUser.id,
        targetTag: targetUser.tag || targetUser.username || null
      };
    } catch (error) {
      return {
        ok: false,
        error: error?.message || error?.code || "dm_delivery_failed"
      };
    }
  }

  async function withTimeout(promiseFactory, timeoutMs = 5000, timeoutError = "timeout") {
    let timer = null;

    try {
      return await Promise.race([
        Promise.resolve().then(() => promiseFactory()),
        new Promise((_, reject) => {
          timer = setTimeout(() => reject(new Error(timeoutError)), timeoutMs);
        })
      ]);
    } finally {
      if (timer) {
        clearTimeout(timer);
      }
    }
  }

  async function resolveWebsiteTransferTarget(payload = {}) {
    const explicitAccountNumber = String(
      payload.targetBankAccountId ||
      payload.targetAccountNumber ||
      payload.recipientAccountNumber ||
      ""
    ).trim();
    const explicitDiscordId = String(
      payload.targetDiscordUserId ||
      payload.recipientDiscordUserId ||
      ""
    ).trim();
    const explicitName = String(
      payload.targetName ||
      payload.recipientName ||
      payload.targetBankName ||
      ""
    ).trim();
    const explicitRobloxUsername = String(
      payload.targetRobloxUsername ||
      payload.recipientRobloxUsername ||
      payload.targetUsername ||
      payload.recipientUsername ||
      ""
    ).trim();
    const genericTarget = String(payload.target || payload.recipient || "").trim();
    const mentionMatch = genericTarget.match(/^<@!?(\d{10,20})>$/);

    if (explicitAccountNumber) {
      return findAccountByAccountNumber(explicitAccountNumber);
    }

    if (explicitDiscordId) {
      return getAccount(explicitDiscordId);
    }

    if (explicitName) {
      return findAccountByName(explicitName)
        || findAccountByRobloxUsername(explicitName)
        || await findAccountByDiscordIdentityText(explicitName);
    }

    if (explicitRobloxUsername) {
      return findAccountByRobloxUsername(explicitRobloxUsername);
    }

    if (!genericTarget) {
      return null;
    }

    if (mentionMatch?.[1]) {
      return getAccount(mentionMatch[1]);
    }

    if (/^\d{4,6}$/.test(genericTarget)) {
      return findAccountByAccountNumber(genericTarget);
    }

    if (/^\d{10,20}$/.test(genericTarget)) {
      return getAccount(genericTarget);
    }

    return findAccountByName(genericTarget)
      || findAccountByRobloxUsername(genericTarget)
      || await findAccountByDiscordIdentityText(genericTarget);
  }

  app.get("/web/health", (req, res) => {
    return res.status(200).json({ ok: true, service: "arab-world-bot-web-api" });
  });

  app.post(["/web/showroom-request-code", "/web/mobile-request-code"], async (req, res, next) => {
    try {
      console.log("[WEBSITE LOGIN] incoming request", JSON.stringify({
        hasApiKey: Boolean(String(req.headers["x-internal-api-key"] || req.headers["x-api-key"] || "").trim()),
        body: req.body ?? {}
      }));

      if (!isAuthorizedInternalRequest(req)) {
        return res.status(401).json({ ok: false, error: "unauthorized" });
      }

      const robloxUsername = extractWebsiteRobloxUsername(req.body ?? {});
      if (!robloxUsername) {
        return res.status(400).json({ ok: false, error: "missing_roblox_username" });
      }

      const account = findAccountByRobloxUsername(robloxUsername);
      if (!account) {
        return res.status(404).json({ ok: false, error: "account_not_found" });
      }

      console.log("[WEBSITE LOGIN] account resolved", JSON.stringify({
        robloxUsername,
        discordUserId: account.discordUserId,
        accountNumber: account.accountNumber
      }));

      clearOlderWebsiteVerifications(account.discordUserId, account.robloxUsername || robloxUsername);

      const verificationId = createWebsiteVerificationId();
      const code = createWebsiteVerificationCode();
      const expiresAt = Date.now() + 10 * 60 * 1000;
      const payload = buildWebsiteVerificationDmPayload({
        verificationId,
        account,
        robloxUsername,
        code,
        expiresAt
      });
      const deliveryResult = await sendWebsiteVerificationDmForLogin(account.discordUserId, payload);

      console.log("[WEBSITE LOGIN] delivery result", JSON.stringify({
        robloxUsername,
        discordUserId: account.discordUserId,
        ok: Boolean(deliveryResult?.ok),
        error: deliveryResult?.ok ? null : (deliveryResult?.error || "dm_delivery_failed"),
        deliveryMethod: deliveryResult?.delivery || null,
        targetId: account.discordUserId || null,
        targetTag: null
      }));

      if (!deliveryResult?.ok) {
        return res.status(409).json({
          ok: false,
          error: deliveryResult?.error || "dm_delivery_failed",
          linkedDiscordUserId: account.discordUserId,
          accountNumber: account.accountNumber
        });
      }

      pendingWebsiteLoginVerifications.set(verificationId, {
        verificationId,
        code,
        discordUserId: account.discordUserId,
        robloxUsername: account.robloxUsername,
        accountNumber: account.accountNumber,
        expiresAt,
        used: false,
        deliveryStatus: "sent",
        deliveryError: null,
        deliveryCompletedAt: new Date().toISOString()
      });

      return res.status(200).json({
        ok: true,
        verificationId,
        expiresAt,
        maskedAccountNumber: account.accountNumber ? `****${String(account.accountNumber).slice(-2)}` : null,
        delivery: "dm",
        linkedDiscordUserId: account.discordUserId || null,
        deliveryMethod: deliveryResult?.delivery || null
      });
    } catch (error) {
      console.error("Website mobile-request-code primary handler failure:", error);
      if (softWebsiteDeliveryErrors.has(error?.message)) {
        return res.status(409).json({ ok: false, error: error?.message });
      }
      return res.status(500).json({ ok: false, error: "internal_error" });
    }
  });

  app.post(["/web/_legacy_disabled/showroom-request-code", "/web/_legacy_disabled/mobile-request-code"], async (req, res, next) => {
    try {
      if (!isAuthorizedInternalRequest(req)) {
        return res.status(401).json({ ok: false, error: "unauthorized" });
      }

      const robloxUsername = extractWebsiteRobloxUsername(req.body ?? {});
      if (!robloxUsername) {
        return res.status(400).json({ ok: false, error: "missing_roblox_username" });
      }

      const account = findAccountByRobloxUsername(robloxUsername);
      if (!account) {
        return res.status(404).json({ ok: false, error: "account_not_found" });
      }

      {
        const verificationId = createWebsiteVerificationId();
        const code = createWebsiteVerificationCode();
        const expiresAt = Date.now() + 10 * 60 * 1000;

        const verificationEmbed = new EmbedBuilder()
          .setColor(0x0b1f3a)
          .setTitle("Verification Code")
          .setDescription("Login requested for Arab World. Use this code in the website to continue.")
          .addFields(
            { name: "Roblox Username", value: `**${account.robloxUsername || robloxUsername}**`, inline: true },
            { name: "Account Number", value: `**${account.accountNumber}**`, inline: true },
            { name: "Verification Code", value: `**${code}**`, inline: false },
            { name: "Expires", value: `**<t:${Math.floor(expiresAt / 1000)}:R>**`, inline: false }
          )
          .setFooter({ text: "Arab World Mobile Verification" })
          .setTimestamp();

        const deliveryResult = await sendWebsiteVerificationDm(account.discordUserId, {
          embeds: [verificationEmbed]
        });

        if (!deliveryResult.ok) {
          return res.status(409).json({
            ok: false,
            error: deliveryResult.error || "dm_delivery_failed",
            linkedDiscordUserId: account.discordUserId,
            accountNumber: account.accountNumber
          });
        }

        pendingWebsiteLoginVerifications.set(verificationId, {
          verificationId,
          code,
          discordUserId: account.discordUserId,
          robloxUsername: account.robloxUsername,
          accountNumber: account.accountNumber,
          expiresAt,
          used: false,
          deliveryStatus: "sent",
          deliveryError: null,
          deliveryCompletedAt: new Date().toISOString()
        });

        return res.status(200).json({
          ok: true,
          verificationId,
          expiresAt,
          maskedAccountNumber: account.accountNumber ? `****${String(account.accountNumber).slice(-2)}` : null,
          delivery: "dm"
        });
      }

      const verificationId = createWebsiteVerificationId();
      const code = createWebsiteVerificationCode();
      const expiresAt = Date.now() + 10 * 60 * 1000;

      pendingWebsiteLoginVerifications.set(verificationId, {
        verificationId,
        code,
        discordUserId: account.discordUserId,
        robloxUsername: account.robloxUsername,
        accountNumber: account.accountNumber,
        expiresAt,
        used: false,
        deliveryStatus: "pending",
        deliveryError: null,
        deliveryCompletedAt: null
      });

      sendWebsiteVerificationDm(account.discordUserId, {
        embeds: [
          new EmbedBuilder()
            .setColor(0x0b1f3a)
            .setTitle("Verification Code")
            .setDescription("Login requested for Arab World. Use this code in the website to continue.")
            .addFields(
              { name: "Roblox Username", value: `**${account.robloxUsername || robloxUsername}**`, inline: true },
              { name: "Account Number", value: `**${account.accountNumber}**`, inline: true },
              { name: "Verification Code", value: `**${code}**`, inline: false },
              { name: "Expires", value: `**<t:${Math.floor(expiresAt / 1000)}:R>**`, inline: false }
            )
            .setFooter({ text: "Arab World Mobile Verification" })
            .setTimestamp()
        ]
      }).then((sendResult) => {
        const current = pendingWebsiteLoginVerifications.get(verificationId);
        if (!current || current.used) {
          return;
        }

        pendingWebsiteLoginVerifications.set(verificationId, {
          ...current,
          deliveryStatus: sendResult.ok ? "sent" : "failed",
          deliveryError: sendResult.ok ? null : (sendResult.error || "dm_delivery_failed"),
          deliveryCompletedAt: new Date().toISOString()
        });
      }).catch((error) => {
        const current = pendingWebsiteLoginVerifications.get(verificationId);
        if (!current || current.used) {
          return;
        }

        pendingWebsiteLoginVerifications.set(verificationId, {
          ...current,
          deliveryStatus: "failed",
          deliveryError: error?.message || "dm_delivery_failed",
          deliveryCompletedAt: new Date().toISOString()
        });
      });

      return res.status(202).json({
        ok: true,
        verificationId,
        expiresAt,
        maskedAccountNumber: account.accountNumber ? `****${String(account.accountNumber).slice(-2)}` : null,
        delivery: "pending"
      });

      const verificationEmbed = new EmbedBuilder()
        .setColor(0x0b1f3a)
        .setTitle("Verification Code")
        .setDescription("Login requested for Arab World. Use this code in the website to continue.")
        .addFields(
          { name: "Roblox Username", value: `**${account.robloxUsername || robloxUsername}**`, inline: true },
          { name: "Account Number", value: `**${account.accountNumber}**`, inline: true },
          { name: "Verification Code", value: `**${code}**`, inline: false },
          { name: "Expires", value: `**<t:${Math.floor(expiresAt / 1000)}:R>**`, inline: false }
        )
        .setFooter({ text: "Arab World Mobile Verification" })
        .setTimestamp();

      const restSendResult = await sendWebsiteVerificationDm(account.discordUserId, {
        embeds: [verificationEmbed]
      });

      if (!restSendResult.ok) {
        pendingWebsiteLoginVerifications.delete(verificationId);
        if (restSendResult.error === "discord_dm_send_timeout") {
          return res.status(504).json({
            ok: false,
            error: "discord_dm_send_timeout",
            linkedDiscordUserId: account.discordUserId,
            accountNumber: account.accountNumber
          });
        }

        return res.status(409).json({
          ok: false,
          error: restSendResult.error || "dm_delivery_failed",
          linkedDiscordUserId: account.discordUserId,
          accountNumber: account.accountNumber
        });
      }

      return res.status(200).json({
        ok: true,
        verificationId,
        expiresAt,
        maskedAccountNumber: account.accountNumber ? `****${String(account.accountNumber).slice(-2)}` : null,
        delivery: "dm"
      });

      const sendResult = await withTimeout(
        () => userResult.user.send({
          embeds: [
            new EmbedBuilder()
              .setColor(0x0b1f3a)
              .setTitle("🔐 رمز تحقق تسجيل الدخول")
              .setDescription("**تم طلب تسجيل دخول جديد إلى واجهة Arab World. استخدم رمز التحقق التالي داخل الموقع لإكمال الدخول.**")
              .addFields(
                { name: "🎮 يوزر روبلوكس", value: `**${account.robloxUsername || robloxUsername}**`, inline: true },
                { name: "💳 رقم الحساب", value: `**${account.accountNumber}**`, inline: true },
                { name: "🔢 رمز التحقق", value: `**${code}**`, inline: false },
                { name: "⏳ الصلاحية", value: `**ينتهي <t:${Math.floor(expiresAt / 1000)}:R>**`, inline: false }
              )
              .setFooter({ text: "Arab World Mobile • Verification" })
              .setTimestamp()
          ]
        }).then(() => ({ ok: true })).catch(() => ({ ok: false })),
        4500,
        "discord_dm_send_timeout"
      ).catch((error) => ({ ok: false, error: error?.message || "discord_dm_send_failed" }));

      if (!sendResult.ok) {
        pendingWebsiteLoginVerifications.delete(verificationId);
        if (sendResult.error === "discord_dm_send_timeout") {
          return res.status(504).json({ ok: false, error: "discord_dm_send_timeout" });
        }
        return res.status(409).json({ ok: false, error: "dm_delivery_failed" });
      }

      return res.status(200).json({
        ok: true,
        verificationId,
        expiresAt,
        maskedAccountNumber: account.accountNumber ? `****${String(account.accountNumber).slice(-2)}` : null
      });
    } catch (error) {
      console.error("Website mobile-request-code fast handler failure:", error);
      return res.status(500).json({ ok: false, error: "internal_error" });
    }
  });

  app.post(["/web/showroom-verify-code", "/web/mobile-verify-code"], async (req, res, next) => {
    try {
      if (!isAuthorizedInternalRequest(req)) {
        return res.status(401).json({ ok: false, error: "unauthorized" });
      }

      const verificationId = String(req.body?.verificationId || req.body?.sessionId || req.body?.requestId || "").trim();
      const robloxUsername = extractWebsiteRobloxUsername(req.body ?? {});
      const code = normalizeWebsiteVerificationCode(
        req.body?.code || req.body?.verificationCode || req.body?.otp || req.body?.pin || ""
      );

      if (!robloxUsername || !code) {
        return res.status(400).json({ ok: false, error: "missing_verification_fields" });
      }

      const normalizedUsername = normalizeWebsiteRobloxUsername(robloxUsername);
      const now = Date.now();
      const recentReuseWindowMs = 2 * 60 * 1000;
      const directPending = verificationId
        ? (pendingWebsiteLoginVerifications.get(verificationId) || null)
        : null;

      const matchingEntries = Array.from(pendingWebsiteLoginVerifications.entries())
        .map(([entryId, pending]) => {
          if (!pending) {
            return null;
          }

          const sameUsername =
            normalizeWebsiteRobloxUsername(pending.robloxUsername) === normalizedUsername;
          const sameCode = normalizeWebsiteVerificationCode(pending.code) === code;
          if (!sameUsername || !sameCode) {
            return null;
          }

          const expiresAt = Number(pending.expiresAt || 0);
          const expired = now > expiresAt + 15000;
          const usedAtTime = pending.usedAt ? new Date(pending.usedAt).getTime() : 0;
          const usedRecently = Boolean(pending.used) && usedAtTime > 0 && now - usedAtTime <= recentReuseWindowMs;
          const freshness = pending.deliveryCompletedAt
            ? new Date(pending.deliveryCompletedAt).getTime()
            : expiresAt;

          return {
            entryId,
            pending,
            expired,
            usedRecently,
            freshness
          };
        })
        .filter(Boolean)
        .filter((entry) => !entry.expired && (!entry.pending.used || entry.usedRecently))
        .sort((left, right) => {
          const leftExact = verificationId && left.entryId === verificationId ? 1 : 0;
          const rightExact = verificationId && right.entryId === verificationId ? 1 : 0;
          if (leftExact !== rightExact) {
            return rightExact - leftExact;
          }

          const leftUnused = left.pending.used ? 0 : 1;
          const rightUnused = right.pending.used ? 0 : 1;
          if (leftUnused !== rightUnused) {
            return rightUnused - leftUnused;
          }

          return right.freshness - left.freshness;
        });

      const matchedFallbackEntry = matchingEntries[0] || null;

      const resolvedVerificationId = matchedFallbackEntry?.entryId || verificationId;
      const pending = matchedFallbackEntry?.pending || directPending;

      if (!pending) {
        console.warn("Website verification failed: verification_not_found", {
          verificationId,
          robloxUsername
        });
        return res.status(404).json({ ok: false, error: "verification_not_found" });
      }

      if (pending.used) {
          const normalizedPendingUsername = normalizeWebsiteRobloxUsername(pending.robloxUsername);
        const normalizedPendingCode = normalizeWebsiteVerificationCode(pending.code);
        const usedAtTime = pending.usedAt ? new Date(pending.usedAt).getTime() : 0;
        const isSafeDuplicateSuccess =
          normalizedPendingUsername === normalizedUsername
          && normalizedPendingCode === code
          && usedAtTime > 0
          && now - usedAtTime <= recentReuseWindowMs;

        if (isSafeDuplicateSuccess) {
          const account = getAccount(pending.discordUserId);
          if (!account) {
            pendingWebsiteLoginVerifications.delete(resolvedVerificationId);
            return res.status(404).json({ ok: false, error: "account_not_found" });
          }

          return res.status(200).json({
            ok: true,
            verified: true,
            account: buildWebsiteAccountSnapshot(account)
          });
        }

        console.warn("Website verification failed: verification_already_used", {
          verificationId: resolvedVerificationId,
          robloxUsername
        });
        return res.status(409).json({ ok: false, error: "verification_already_used" });
      }

      if (now > Number(pending.expiresAt || 0) + 15000) {
        pendingWebsiteLoginVerifications.delete(resolvedVerificationId);
        console.warn("Website verification failed: verification_expired", {
          verificationId: resolvedVerificationId,
          robloxUsername,
          expiresAt: pending.expiresAt
        });
        return res.status(410).json({ ok: false, error: "verification_expired" });
      }

      if (
        normalizeWebsiteRobloxUsername(pending.robloxUsername) !== normalizedUsername
        && normalizeWebsiteRobloxUsernameVisual(pending.robloxUsername) !== normalizeWebsiteRobloxUsernameVisual(robloxUsername)
      ) {
        console.warn("Website verification failed: username_mismatch", {
          verificationId: resolvedVerificationId,
          robloxUsername,
          pendingUsername: pending.robloxUsername
        });
        return res.status(403).json({ ok: false, error: "username_mismatch" });
      }

      if (normalizeWebsiteVerificationCode(pending.code) !== code) {
        console.warn("Website verification failed: invalid_code", {
          verificationId: resolvedVerificationId,
          robloxUsername,
          enteredCode: code,
          pendingCode: normalizeWebsiteVerificationCode(pending.code)
        });
        return res.status(403).json({ ok: false, error: "invalid_code" });
      }

      const account = getAccount(pending.discordUserId);
      if (!account) {
        pendingWebsiteLoginVerifications.delete(resolvedVerificationId);
        return res.status(404).json({ ok: false, error: "account_not_found" });
      }

      pending.used = true;
      pending.usedAt = new Date().toISOString();
      pendingWebsiteLoginVerifications.set(resolvedVerificationId, pending);

      return res.status(200).json({
        ok: true,
        verified: true,
        account: buildWebsiteAccountSnapshot(account)
      });
    } catch (error) {
      console.error("Website mobile-verify-code fast handler failure:", error);
      return res.status(500).json({ ok: false, error: "internal_error" });
    }
  });

  app.post([
    "/web/showroom-request-status",
    "/web/mobile-request-status",
    "/web/_legacy_disabled/showroom-request-status",
    "/web/_legacy_disabled/mobile-request-status"
  ], async (req, res) => {
    try {
      if (!isAuthorizedInternalRequest(req)) {
        return res.status(401).json({ ok: false, error: "unauthorized" });
      }

      const verificationId = String(req.body?.verificationId || req.body?.sessionId || req.body?.requestId || "").trim();
      if (!verificationId) {
        return res.status(400).json({ ok: false, error: "missing_verification_id" });
      }

      const pending = pendingWebsiteLoginVerifications.get(verificationId);
      if (!pending) {
        return res.status(404).json({ ok: false, error: "verification_not_found" });
      }

      if (Date.now() > Number(pending.expiresAt || 0)) {
        pendingWebsiteLoginVerifications.delete(verificationId);
        return res.status(410).json({ ok: false, error: "verification_expired" });
      }

      return res.status(200).json({
        ok: true,
        verificationId,
        deliveryStatus: pending.deliveryStatus || "pending",
        deliveryError: pending.deliveryError || null,
        linkedDiscordUserId: pending.discordUserId || null,
        accountNumber: pending.accountNumber || null
      });
    } catch (error) {
      console.error("Website mobile-request-status failure:", error);
      return res.status(500).json({ ok: false, error: "internal_error" });
    }
  });

  app.post(["/web/_legacy_disabled/showroom-request-code", "/web/_legacy_disabled/mobile-request-code"], async (req, res) => {
    try {
      if (!isAuthorizedInternalRequest(req)) {
        return res.status(401).json({ ok: false, error: "unauthorized" });
      }

      if (!client?.isReady?.()) {
        return res.status(503).json({ ok: false, error: "discord_client_not_ready" });
      }

      const robloxUsername = extractWebsiteRobloxUsername(req.body ?? {});
      if (!robloxUsername) {
        return res.status(400).json({ ok: false, error: "missing_roblox_username" });
      }

      const account = findAccountByRobloxUsername(robloxUsername);
      if (!account) {
        return res.status(404).json({ ok: false, error: "account_not_found" });
      }

      const member = await withTimeout(
        () => findGuildMemberForWebsiteAccess(account.discordUserId),
        5000,
        "guild_member_lookup_timeout"
      ).catch((error) => {
        if (error?.message === "guild_member_lookup_timeout") {
          return "__timeout__";
        }
        return null;
      });
      if (member === "__timeout__") {
        return res.status(504).json({ ok: false, error: "guild_member_lookup_timeout" });
      }
      if (!member) {
        return res.status(403).json({ ok: false, error: "not_in_guild" });
      }

      const verificationId = createWebsiteVerificationId();
      const code = createWebsiteVerificationCode();
      const expiresAt = Date.now() + 10 * 60 * 1000;

      pendingWebsiteLoginVerifications.set(verificationId, {
        verificationId,
        code,
        discordUserId: account.discordUserId,
        robloxUsername: account.robloxUsername,
        accountNumber: account.accountNumber,
        expiresAt,
        used: false
      });

      const user = await withTimeout(
        () => client.users.fetch(account.discordUserId).catch(() => null),
        5000,
        "discord_user_fetch_timeout"
      ).catch((error) => {
        if (error?.message === "discord_user_fetch_timeout") {
          return "__timeout__";
        }
        return null;
      });
      if (user === "__timeout__") {
        pendingWebsiteLoginVerifications.delete(verificationId);
        return res.status(504).json({ ok: false, error: "discord_user_fetch_timeout" });
      }
      if (!user) {
        pendingWebsiteLoginVerifications.delete(verificationId);
        return res.status(404).json({ ok: false, error: "discord_user_not_found" });
      }

      const deliveryResult = await user.send({
        embeds: [
          new EmbedBuilder()
            .setColor(0x0b1f3a)
            .setTitle("🔐 رمز تحقق تسجيل الدخول")
            .setDescription("**تم طلب تسجيل دخول جديد إلى واجهة Arab World. استخدم رمز التحقق التالي داخل الموقع لإكمال الدخول.**")
            .addFields(
              { name: "🎮 يوزر روبلوكس", value: `**${account.robloxUsername || robloxUsername}**`, inline: true },
              { name: "💳 رقم الحساب", value: `**${account.accountNumber}**`, inline: true },
              { name: "🔢 رمز التحقق", value: `**${code}**`, inline: false },
              { name: "⏳ الصلاحية", value: `**ينتهي <t:${Math.floor(expiresAt / 1000)}:R>**`, inline: false }
            )
            .setFooter({ text: "Arab World Mobile • Verification" })
            .setTimestamp()
        ]
      }).then(() => ({ ok: true })).catch(() => ({ ok: false }));

      if (!deliveryResult.ok) {
        pendingWebsiteLoginVerifications.delete(verificationId);
        return res.status(409).json({ ok: false, error: "dm_delivery_failed" });
      }

      return res.status(200).json({
        ok: true,
        verificationId,
        expiresAt,
        maskedAccountNumber: account.accountNumber ? `****${String(account.accountNumber).slice(-2)}` : null
      });
    } catch (error) {
      console.error("Website showroom-request-code failure:", error);
      return res.status(500).json({ ok: false, error: "internal_error" });
    }
  });

  app.post(["/web/_legacy_disabled/showroom-verify-code", "/web/_legacy_disabled/mobile-verify-code"], async (req, res) => {
    try {
      if (!isAuthorizedInternalRequest(req)) {
        return res.status(401).json({ ok: false, error: "unauthorized" });
      }

      const verificationId = String(req.body?.verificationId || req.body?.sessionId || req.body?.requestId || "").trim();
      const robloxUsername = extractWebsiteRobloxUsername(req.body ?? {});
      const code = String(req.body?.code || req.body?.verificationCode || req.body?.otp || req.body?.pin || "").trim();

      if (!verificationId || !robloxUsername || !code) {
        return res.status(400).json({ ok: false, error: "missing_verification_fields" });
      }

      const pending = pendingWebsiteLoginVerifications.get(verificationId);
      if (!pending) {
        return res.status(404).json({ ok: false, error: "verification_not_found" });
      }

      if (pending.used) {
        return res.status(409).json({ ok: false, error: "verification_already_used" });
      }

      if (Date.now() > Number(pending.expiresAt || 0)) {
        pendingWebsiteLoginVerifications.delete(verificationId);
        return res.status(410).json({ ok: false, error: "verification_expired" });
      }

      if (
        normalizeWebsiteRobloxUsername(pending.robloxUsername) !== normalizeWebsiteRobloxUsername(robloxUsername)
        && normalizeWebsiteRobloxUsernameVisual(pending.robloxUsername) !== normalizeWebsiteRobloxUsernameVisual(robloxUsername)
      ) {
        return res.status(403).json({ ok: false, error: "username_mismatch" });
      }

      if (pending.code !== code) {
        return res.status(403).json({ ok: false, error: "invalid_code" });
      }

      const account = getAccount(pending.discordUserId);
      if (!account) {
        pendingWebsiteLoginVerifications.delete(verificationId);
        return res.status(404).json({ ok: false, error: "account_not_found" });
      }

      const member = await findGuildMemberForWebsiteAccess(account.discordUserId);
      if (!member) {
        pendingWebsiteLoginVerifications.delete(verificationId);
        return res.status(403).json({ ok: false, error: "not_in_guild" });
      }

      pending.used = true;
      pendingWebsiteLoginVerifications.set(verificationId, pending);

      return res.status(200).json({
        ok: true,
        verified: true,
        account: buildWebsiteAccountSnapshot(account)
      });
    } catch (error) {
      console.error("Website showroom-verify-code failure:", error);
      return res.status(500).json({ ok: false, error: "internal_error" });
    }
  });

  app.post("/web/account-login", async (req, res) => {
    try {
      if (!isAuthorizedInternalRequest(req)) {
        return res.status(401).json({ ok: false, error: "unauthorized" });
      }

      const authResult = authenticateWebsiteAccountFromBody(req.body ?? {}, { requireUsername: true });
      if (!authResult.ok) {
        return res.status(authResult.status).json({ ok: false, error: authResult.error });
      }

      return res.status(200).json({
        ok: true,
        ...buildWebsiteAccountSnapshot(authResult.account)
      });
    } catch (error) {
      console.error("Website account-login failure:", error);
      return res.status(500).json({ ok: false, error: "internal_error" });
    }
  });

  app.post("/web/account-balance", async (req, res) => {
    try {
      if (!isAuthorizedInternalRequest(req)) {
        return res.status(401).json({ ok: false, error: "unauthorized" });
      }

      const authResult = authenticateWebsiteAccountFromBody(req.body ?? {}, { requireUsername: false });
      if (!authResult.ok) {
        return res.status(authResult.status).json({ ok: false, error: authResult.error });
      }

      return res.status(200).json({
        ok: true,
        ...buildWebsiteAccountSnapshot(authResult.account)
      });
    } catch (error) {
      console.error("Website account-balance failure:", error);
      return res.status(500).json({ ok: false, error: "internal_error" });
    }
  });

  app.post("/web/account-transactions", async (req, res) => {
    try {
      if (!isAuthorizedInternalRequest(req)) {
        return res.status(401).json({ ok: false, error: "unauthorized" });
      }

      const authResult = authenticateWebsiteAccountFromBody(req.body ?? {}, { requireUsername: true });
      if (!authResult.ok) {
        return res.status(authResult.status).json({ ok: false, error: authResult.error });
      }

      const limit = Math.max(1, Math.min(Number(req.body?.limit || 15) || 15, 50));
      const transactions = readWebsiteRouteCache("account-transactions", authResult.account.discordUserId, limit)
        || writeWebsiteRouteCache(
          "account-transactions",
          authResult.account.discordUserId,
          listTransactionsForUser(authResult.account.discordUserId, limit)
            .map((entry) => buildWebsiteTransactionSnapshot(entry)),
          limit
        );

      return res.status(200).json({
        ok: true,
        account: buildWebsiteAccountSnapshot(authResult.account),
        transactions
      });
    } catch (error) {
      console.error("Website account-transactions failure:", error);
      return res.status(500).json({ ok: false, error: "internal_error" });
    }
  });

  app.post("/web/vehicle-catalog", async (req, res) => {
    try {
      if (!isAuthorizedInternalRequest(req)) {
        return res.status(401).json({ ok: false, error: "unauthorized" });
      }

      const authResult = authenticateWebsiteAccountFromBody(req.body ?? {}, { requireUsername: true });
      if (!authResult.ok) {
        return res.status(authResult.status).json({ ok: false, error: authResult.error });
      }

      const vehicles = readWebsiteRouteCache("vehicle-catalog", authResult.account.discordUserId)
        || writeWebsiteRouteCache(
          "vehicle-catalog",
          authResult.account.discordUserId,
          buildWebsiteVehicleCatalogForUser(authResult.account.discordUserId)
        );

      return res.status(200).json({
        ok: true,
        account: buildWebsiteAccountSnapshot(authResult.account),
        vehicles
      });
    } catch (error) {
      console.error("Website vehicle-catalog failure:", error);
      return res.status(500).json({ ok: false, error: "internal_error" });
    }
  });

  app.post("/web/buy-car", async (req, res) => {
    try {
      if (!isAuthorizedInternalRequest(req)) {
        return res.status(401).json({ ok: false, error: "unauthorized" });
      }

      const authResult = authenticateWebsiteAccountFromBody(req.body ?? {}, { requireUsername: true });
      if (!authResult.ok) {
        return res.status(authResult.status).json({ ok: false, error: authResult.error });
      }

      const vehicleName = String(req.body?.vehicleName || req.body?.carName || req.body?.carId || "").trim();
      const amount = Number(req.body?.amount);
      if (!vehicleName) {
        return res.status(400).json({ ok: false, error: "missing_purchase_fields" });
      }

      const result = await processWebsiteCarPurchase({
        account: authResult.account,
        vehicleName,
        requestedPrice: Number.isFinite(amount) ? amount : null,
        sourceLabel: "website_purchase"
      });

      if (!result.ok) {
        const statusMap = {
          missing_vehicle_name: 400,
          account_frozen: 403,
          vehicle_already_owned: 409,
          invalid_price: 400,
          insufficient_balance: 400,
          vehicle_store_failed: 500,
          account_not_found: 500
        };

        return res.status(statusMap[result.error] || 400).json({
          ok: false,
          error: result.error,
          price: result.price || 0,
          account: result.account ? buildWebsiteAccountSnapshot(result.account) : null
        });
      }

      void logWebsiteAction({
        title: "🌐 **شراء مركبة من الموقع**",
        description: "**تم شراء مركبة من الموقع وربطها مباشرة بممتلكات البوت.**",
        fields: [
          ...buildWebsiteActorFields(authResult.account),
          { name: "🚘 **المركبة**", value: `**${result.vehicleName}**`, inline: true },
          { name: "💵 **السعر**", value: `**${formatCurrency(result.price)}**`, inline: true },
          { name: "💳 **الرصيد بعد الشراء**", value: `**${formatCurrency(result.account?.balance || 0)}**`, inline: true }
        ]
      }).catch(() => null);

      invalidateWebsiteRouteCache(authResult.account.discordUserId);

      return res.status(200).json({
        ok: true,
        vehicleName: result.vehicleName,
        price: result.price,
        account: buildWebsiteAccountSnapshot(result.account)
      });
      
    } catch (error) {
      console.error("Website buy-car failure:", error);
      return res.status(500).json({ ok: false, error: "internal_error" });
    }
  });

  app.post("/web/sell-car", async (req, res) => {
    try {
      if (!isAuthorizedInternalRequest(req)) {
        return res.status(401).json({ ok: false, error: "unauthorized" });
      }

      const authResult = authenticateWebsiteAccountFromBody(req.body ?? {}, { requireUsername: true });
      if (!authResult.ok) {
        return res.status(authResult.status).json({ ok: false, error: authResult.error });
      }

      const vehicleName = String(req.body?.vehicleName || req.body?.carName || req.body?.carId || "").trim();
      const amount = Number(req.body?.amount);
      if (!vehicleName) {
        return res.status(400).json({ ok: false, error: "missing_sale_fields" });
      }

      const result = await processWebsiteCarSale({
        account: authResult.account,
        vehicleName,
        requestedAmount: Number.isFinite(amount) ? amount : null,
        sourceLabel: "website_sale"
      });

      if (!result.ok) {
        const statusMap = {
          missing_vehicle_name: 400,
          missing_sale_fields: 400,
          account_frozen: 403,
          vehicle_not_owned: 404,
          invalid_price: 400
        };

        return res.status(statusMap[result.error] || 400).json({
          ok: false,
          error: result.error,
          price: result.price || 0,
          account: result.account ? buildWebsiteAccountSnapshot(result.account) : null
        });
      }

      invalidateWebsiteRouteCache(authResult.account.discordUserId);

      await logWebsiteAction({
        title: "🌐 **بيع مركبة من الموقع**",
        description: "**تم بيع مركبة من الموقع وتحديث ممتلكات البوت.**",
        fields: [
          ...buildWebsiteActorFields(authResult.account),
          { name: "🚘 **المركبة**", value: `**${result.vehicleName}**`, inline: true },
          { name: "💵 **المبلغ المسترد**", value: `**${formatCurrency(result.price)}**`, inline: true },
          { name: "💳 **الرصيد بعد البيع**", value: `**${formatCurrency(result.account?.balance || 0)}**`, inline: true }
        ]
      });

      invalidateWebsiteRouteCache(authResult.account.discordUserId);

      return res.status(200).json({
        ok: true,
        vehicleName: result.vehicleName,
        price: result.price,
        account: buildWebsiteAccountSnapshot(result.account)
      });
    } catch (error) {
      console.error("Website sell-car failure:", error);
      return res.status(500).json({ ok: false, error: "internal_error" });
    }
  });

  app.post("/web/account-transfer", async (req, res) => {
    try {
      if (!isAuthorizedInternalRequest(req)) {
        return res.status(401).json({ ok: false, error: "unauthorized" });
      }

      const authResult = authenticateWebsiteAccountFromBody(req.body ?? {}, { requireUsername: true });
      if (!authResult.ok) {
        return res.status(authResult.status).json({ ok: false, error: authResult.error });
      }

      const amount = Number(req.body?.amount);
      if (!Number.isFinite(amount)) {
        return res.status(400).json({ ok: false, error: "missing_transfer_fields" });
      }

      const targetAccount = await resolveWebsiteTransferTarget(req.body ?? {});
      if (!targetAccount) {
        console.warn("Website account-transfer target lookup failed", {
          sourceAccount: authResult.account.accountNumber,
          rawTarget: req.body?.target || req.body?.recipient || null,
          payload: req.body ?? {}
        });
        return res.status(404).json({ ok: false, error: "target_account_not_found" });
      }

      const result = await processWebsiteBankTransfer({
        senderAccount: authResult.account,
        targetAccount,
        amount,
        sourceLabel: "website_transfer"
      });

      if (!result.ok) {
        const statusMap = {
          invalid_amount: 400,
          account_not_found: 404,
          same_account_transfer: 400,
          account_frozen: 403,
          insufficient_balance: 400,
          transfer_limit_exceeded: 400
        };

        return res.status(statusMap[result.error] || 400).json({
          ok: false,
          error: result.error,
          limit: result.limit ?? null,
          cardLabel: result.cardLabel ?? null,
          account: buildWebsiteAccountSnapshot(getAccount(authResult.account.discordUserId))
        });
      }

      invalidateWebsiteRouteCache(authResult.account.discordUserId);

      await logWebsiteAction({
        title: "🌐 **تحويل بنكي من الموقع**",
        description: "**تم تنفيذ تحويل بنكي من الموقع وتسجيله داخل النظام.**",
        fields: [
          ...buildWebsiteActorFields(authResult.account),
          { name: "💵 **المبلغ**", value: `**${formatCurrency(result.amount || amount)}**`, inline: true },
          { name: "🎯 **المستفيد**", value: `**${result.targetAccount?.name || result.targetAccount?.robloxUsername || "غير معروف"}**`, inline: true },
          { name: "💳 **الرصيد بعد التحويل**", value: `**${formatCurrency(result.senderAccount?.balance || 0)}**`, inline: true }
        ]
      });

      invalidateWebsiteRouteCache(authResult.account.discordUserId);
      if (result.targetAccount?.discordUserId) {
        invalidateWebsiteRouteCache(result.targetAccount.discordUserId);
      }

      return res.status(200).json({
        ok: true,
        amount: result.amount,
        account: buildWebsiteAccountSnapshot(result.senderAccount),
        targetAccount: buildWebsiteAccountSnapshot(result.targetAccount)
      });
    } catch (error) {
      console.error("Website account-transfer failure:", error);
      return res.status(500).json({ ok: false, error: "internal_error" });
    }
  });

  app.post("/web/add-money", async (req, res) => {
    try {
      if (!isAuthorizedInternalRequest(req)) {
        return res.status(401).json({ ok: false, error: "unauthorized" });
      }

      const bankAccountId = String(req.body?.bankAccountId || req.body?.accountNumber || "").trim();
      const amount = Number(req.body?.amount);

      if (!bankAccountId || !Number.isFinite(amount) || amount <= 0) {
        return res.status(400).json({ ok: false, error: "missing_add_money_fields" });
      }

      const account = findAccountByAccountNumber(bankAccountId);
      if (!account) {
        return res.status(404).json({ ok: false, error: "account_not_found" });
      }

      const updated = updateAccount(account.discordUserId, (current) => {
        current.balance = Number(current.balance || 0) + amount;
        return current;
      });

      appendTransaction({
        discordUserId: account.discordUserId,
        robloxUsername: updated?.robloxUsername || account.robloxUsername,
        type: "manual_add",
        amount,
        direction: "credit",
        balanceAfter: Number(updated?.balance || 0),
        metadata: {
          source: "website_admin_panel"
        }
      });

      invalidateWebsiteRouteCache(account.discordUserId);

      return res.status(200).json({
        ok: true,
        account: buildWebsiteAccountSnapshot(updated),
        newBalance: Number(updated?.balance || 0)
      });
    } catch (error) {
      console.error("Website add-money failure:", error);
      return res.status(500).json({ ok: false, error: "internal_error" });
    }
  });

  app.post("/web/name-change-request", async (req, res) => {
    try {
      if (!isAuthorizedInternalRequest(req)) {
        return res.status(401).json({ ok: false, error: "unauthorized" });
      }

      const authResult = authenticateWebsiteAccountFromBody(req.body ?? {}, { requireUsername: true });
      if (!authResult.ok) {
        return res.status(authResult.status).json({ ok: false, error: authResult.error });
      }

      const oldName = String(req.body?.oldName || req.body?.old_name || "").trim();
      const newName = String(req.body?.newName || req.body?.new_name || "").trim();
      const age = String(req.body?.age || "").trim();
      const origin = String(req.body?.origin || req.body?.country || req.body?.from || "").trim();
      const discordUsername = String(req.body?.discordUsername || req.body?.discordTag || "").trim();

      if (!oldName || !newName) {
        return res.status(400).json({ ok: false, error: "missing_request_fields" });
      }

      const result = await sendWebsiteNameChangeRequest({
        oldName,
        newName,
        age,
        origin,
        bankAccountId: authResult.bankAccountId,
        accountName: authResult.account.name,
        discordUserId: authResult.account.discordUserId,
        discordUsername,
        robloxUsername: authResult.robloxUsername
      });

      if (!result.ok) {
        return res.status(503).json({ ok: false, error: result.error });
      }

      return res.status(200).json({
        ok: true,
        message: "request_sent",
        account: buildWebsiteAccountSnapshot(authResult.account)
      });
    } catch (error) {
      console.error("Website name-change-request failure:", error);
      return res.status(500).json({ ok: false, error: "internal_error" });
    }
  });

  app.post("/web/projects", async (req, res) => {
    try {
      if (!isAuthorizedInternalRequest(req)) {
        return res.status(401).json({ ok: false, error: "unauthorized" });
      }

      const authResult = authenticateWebsiteAccountFromBody(req.body ?? {}, { requireUsername: true });
      if (!authResult.ok) {
        return res.status(authResult.status).json({ ok: false, error: authResult.error });
      }

      const projects = readWebsiteRouteCache("projects", authResult.account.discordUserId)
        || writeWebsiteRouteCache(
          "projects",
          authResult.account.discordUserId,
          buildWebsiteProjectsForUser(authResult.account.discordUserId)
        );

      return res.status(200).json({
        ok: true,
        account: buildWebsiteAccountSnapshot(authResult.account),
        projects
      });
    } catch (error) {
      console.error("Website projects failure:", error);
      return res.status(500).json({ ok: false, error: "internal_error" });
    }
  });

  app.post("/web/projects/showroom-vehicle", async (req, res) => {
    try {
      if (!isAuthorizedInternalRequest(req)) {
        return res.status(401).json({ ok: false, error: "unauthorized" });
      }

      const authResult = authenticateWebsiteAccountFromBody(req.body ?? {}, { requireUsername: true });
      if (!authResult.ok) {
        return res.status(authResult.status).json({ ok: false, error: authResult.error });
      }

      const projectKey = String(req.body?.projectKey || "").trim();
      const vehicleName = String(req.body?.vehicleName || "").trim();
      const pricePerHour = Number(req.body?.pricePerHour || 0);
      const pricePerDay = Number(req.body?.pricePerDay || 0);

      if (!projectKey || !vehicleName) {
        return res.status(400).json({ ok: false, error: "missing_showroom_vehicle_fields" });
      }

      const project = ensureProjectState(projectKey);
      const definition = getProjectDefinition(projectKey);
      if (!project || !definition) {
        return res.status(404).json({ ok: false, error: "project_not_found" });
      }

      if (definition.type !== "showroom") {
        return res.status(400).json({ ok: false, error: "project_not_showroom" });
      }

      if (!canManageWebsiteProject(authResult.account, project)) {
        return res.status(403).json({ ok: false, error: "project_access_denied" });
      }

      const canonicalVehicleName = getSortedVehicleCatalog()
        .find((entry) => normalizeVehicleName(entry.name) === normalizeVehicleName(vehicleName))?.name
        || vehicleName;
      const existingVehicleRecord = (Array.isArray(project.showroomVehicles) ? project.showroomVehicles : [])
        .find((entry) => normalizeVehicleName(entry?.vehicleName) === normalizeVehicleName(canonicalVehicleName));
      const normalizedPricePerHour = Number.isFinite(pricePerHour) && pricePerHour > 0
        ? Math.max(0, pricePerHour)
        : Number(existingVehicleRecord?.pricePerHour || 0);
      const normalizedPricePerDay = Number.isFinite(pricePerDay) && pricePerDay > 0
        ? Math.max(0, pricePerDay)
        : Number(existingVehicleRecord?.pricePerDay || 0);

      if (normalizedPricePerHour <= 0 && normalizedPricePerDay <= 0) {
        return res.status(400).json({ ok: false, error: "showroom_vehicle_price_required" });
      }

      const metaPatch = {
        image: String(req.body?.image || ""),
        description: String(req.body?.description || ""),
        speed: Number(req.body?.speed || 0),
        acceleration: String(req.body?.acceleration || ""),
        seats: Number(req.body?.seats || 4),
        hidden: Boolean(req.body?.hidden)
      };

      upsertVehicleShowroomMeta(canonicalVehicleName, metaPatch);

      const nextVehicle = {
        vehicleName: canonicalVehicleName,
        pricePerHour: normalizedPricePerHour,
        pricePerDay: normalizedPricePerDay,
        image: metaPatch.image || getVehicleShowroomMetaRecord(canonicalVehicleName)?.image || "",
        description: metaPatch.description || getVehicleShowroomMetaRecord(canonicalVehicleName)?.description || "",
        speed: Number(metaPatch.speed || getVehicleShowroomMetaRecord(canonicalVehicleName)?.speed || 0),
        acceleration: metaPatch.acceleration || getVehicleShowroomMetaRecord(canonicalVehicleName)?.acceleration || "",
        seats: Number(metaPatch.seats || getVehicleShowroomMetaRecord(canonicalVehicleName)?.seats || 4),
        hidden: Boolean(metaPatch.hidden)
      };

      const updatedProject = upsertProject(projectKey, (current) => {
        const showroomVehicles = Array.isArray(current.showroomVehicles) ? [...current.showroomVehicles] : [];
        const existingIndex = showroomVehicles.findIndex((entry) => normalizeVehicleName(entry.vehicleName) === normalizeVehicleName(canonicalVehicleName));
        if (existingIndex >= 0) {
          showroomVehicles[existingIndex] = {
            ...showroomVehicles[existingIndex],
            ...nextVehicle
          };
        } else {
          showroomVehicles.push(nextVehicle);
        }

        return {
          ...current,
          showroomVehicles
        };
      });

      console.info("[WEB SHOWROOM VEHICLE SAVED]", JSON.stringify({
        projectKey,
        vehicleName: canonicalVehicleName,
        showroomVehiclesCount: Array.isArray(updatedProject?.showroomVehicles) ? updatedProject.showroomVehicles.length : 0,
        showroomVehicles: (Array.isArray(updatedProject?.showroomVehicles) ? updatedProject.showroomVehicles : []).map((entry) => ({
          vehicleName: entry?.vehicleName || "",
          pricePerHour: Number(entry?.pricePerHour || 0),
          pricePerDay: Number(entry?.pricePerDay || 0)
        }))
      }));
      invalidateWebsiteRouteCache(authResult.account.discordUserId);

      appendProjectTransaction({
        projectKey,
        type: "showroom_vehicle_configured",
        label: "ضبط مركبة تأجير",
        amount: 0,
        direction: "none",
        actorUserId: authResult.account.discordUserId,
        note: `${canonicalVehicleName} | ساعة: ${nextVehicle.pricePerHour} | يوم: ${nextVehicle.pricePerDay}`
      });

      await logWebsiteAction({
        title: "🌐 **حفظ مركبة تأجير من الموقع**",
        description: "**تم حفظ مركبة تأجير داخل مشروع المعرض.**",
        fields: [
          ...buildWebsiteActorFields(authResult.account),
          { name: "🏢 **المشروع**", value: `**${updatedProject.name || definition?.title || projectKey}**`, inline: true },
          { name: "🚘 **المركبة**", value: `**${canonicalVehicleName}**`, inline: true },
          { name: "🕐 **سعر الساعة**", value: `**${formatCurrency(nextVehicle.pricePerHour)}**`, inline: true },
          { name: "📅 **سعر اليوم**", value: `**${formatCurrency(nextVehicle.pricePerDay)}**`, inline: true },
          { name: "📦 **عدد المركبات الآن**", value: `**${Array.isArray(updatedProject?.showroomVehicles) ? updatedProject.showroomVehicles.length : 0}**`, inline: true }
        ]
      });

      return res.status(200).json({
        ok: true,
        project: buildWebsiteProjectSnapshot(updatedProject, authResult.account.discordUserId),
        vehicle: buildWebsiteRentalOfferSnapshot(updatedProject, nextVehicle)
      });
    } catch (error) {
      console.error("Website project showroom-vehicle failure:", error);
      return res.status(500).json({ ok: false, error: "internal_error" });
    }
  });

  app.post("/web/projects/showroom-vehicle-delete", async (req, res) => {
    try {
      if (!isAuthorizedInternalRequest(req)) {
        return res.status(401).json({ ok: false, error: "unauthorized" });
      }

      const authResult = authenticateWebsiteAccountFromBody(req.body ?? {}, { requireUsername: true });
      if (!authResult.ok) {
        return res.status(authResult.status).json({ ok: false, error: authResult.error });
      }

      const projectKey = String(req.body?.projectKey || "").trim();
      const vehicleName = String(req.body?.vehicleName || "").trim();

      if (!projectKey || !vehicleName) {
        return res.status(400).json({ ok: false, error: "missing_showroom_vehicle_fields" });
      }

      const project = ensureProjectState(projectKey);
      const definition = getProjectDefinition(projectKey);
      if (!project || !definition) {
        return res.status(404).json({ ok: false, error: "project_not_found" });
      }

      if (definition.type !== "showroom") {
        return res.status(400).json({ ok: false, error: "project_not_showroom" });
      }

      if (!canManageWebsiteProject(authResult.account, project)) {
        return res.status(403).json({ ok: false, error: "project_access_denied" });
      }

      const normalizedVehicleName = normalizeVehicleName(vehicleName);
      const existingVehicle = (Array.isArray(project.showroomVehicles) ? project.showroomVehicles : [])
        .find((entry) => normalizeVehicleName(entry?.vehicleName) === normalizedVehicleName);

      if (!existingVehicle) {
        return res.status(404).json({ ok: false, error: "showroom_vehicle_not_found" });
      }

      const activeRental = (Array.isArray(project.rentals) ? project.rentals : []).find((entry) => {
        const expiresAt = entry?.expiresAt ? new Date(entry.expiresAt).getTime() : 0;
        return normalizeVehicleName(entry?.vehicleName) === normalizedVehicleName && expiresAt > Date.now();
      });

      if (activeRental) {
        return res.status(409).json({ ok: false, error: "showroom_vehicle_has_active_rental" });
      }

      const updatedProject = upsertProject(projectKey, (current) => ({
        ...current,
        showroomVehicles: (Array.isArray(current.showroomVehicles) ? current.showroomVehicles : [])
          .filter((entry) => normalizeVehicleName(entry?.vehicleName) !== normalizedVehicleName)
      }));

      console.info("[WEB SHOWROOM VEHICLE DELETED]", JSON.stringify({
        projectKey,
        vehicleName: existingVehicle.vehicleName || vehicleName,
        showroomVehiclesCount: Array.isArray(updatedProject?.showroomVehicles) ? updatedProject.showroomVehicles.length : 0
      }));
      invalidateWebsiteRouteCache(authResult.account.discordUserId);

      appendProjectTransaction({
        projectKey,
        type: "showroom_vehicle_deleted",
        label: "حذف مركبة تأجير",
        amount: 0,
        direction: "none",
        actorUserId: authResult.account.discordUserId,
        note: existingVehicle.vehicleName || vehicleName
      });

      await logWebsiteAction({
        title: "🌐 **حذف مركبة تأجير من الموقع**",
        description: "**تم حذف مركبة من قائمة تأجير مشروع المعرض عبر الموقع.**",
        fields: [
          ...buildWebsiteActorFields(authResult.account),
          { name: "🏢 **المشروع**", value: `**${updatedProject.name || definition?.title || projectKey}**`, inline: true },
          { name: "🚘 **المركبة**", value: `**${existingVehicle.vehicleName || vehicleName}**`, inline: true },
          { name: "📦 **المتبقي الآن**", value: `**${Array.isArray(updatedProject?.showroomVehicles) ? updatedProject.showroomVehicles.length : 0}**`, inline: true }
        ]
      });

      return res.status(200).json({
        ok: true,
        project: buildWebsiteProjectSnapshot(updatedProject, authResult.account.discordUserId),
        deletedVehicleName: existingVehicle.vehicleName || vehicleName
      });
    } catch (error) {
      console.error("Website project showroom-vehicle-delete failure:", error);
      return res.status(500).json({ ok: false, error: "internal_error" });
    }
  });

  app.post("/web/rentals/catalog", async (req, res) => {
    try {
      if (!isAuthorizedInternalRequest(req)) {
        return res.status(401).json({ ok: false, error: "unauthorized" });
      }

      const authResult = authenticateWebsiteAccountFromBody(req.body ?? {}, { requireUsername: true });
      if (!authResult.ok) {
        return res.status(authResult.status).json({ ok: false, error: authResult.error });
      }

      const vehicles = readWebsiteRouteCache("rentals-catalog", authResult.account.discordUserId)
        || writeWebsiteRouteCache(
          "rentals-catalog",
          authResult.account.discordUserId,
          buildWebsiteRentalCatalog(authResult.account.discordUserId)
        );

      return res.status(200).json({
        ok: true,
        account: buildWebsiteAccountSnapshot(authResult.account),
        vehicles
      });
    } catch (error) {
      console.error("Website rentals catalog failure:", error);
      return res.status(500).json({ ok: false, error: "internal_error" });
    }
  });

  app.post("/web/rentals/book", async (req, res) => {
    try {
      if (!isAuthorizedInternalRequest(req)) {
        return res.status(401).json({ ok: false, error: "unauthorized" });
      }

      const authResult = authenticateWebsiteAccountFromBody(req.body ?? {}, { requireUsername: true });
      if (!authResult.ok) {
        return res.status(authResult.status).json({ ok: false, error: authResult.error });
      }

      const projectKey = String(req.body?.projectKey || "").trim();
      const vehicleName = String(req.body?.vehicleName || "").trim();
      const durationUnit = String(req.body?.durationUnit || "hour").trim().toLowerCase();
      const durationValue = Number(req.body?.durationValue || 0);

      if (!projectKey || !vehicleName || !["hour", "day"].includes(durationUnit) || !Number.isInteger(durationValue)) {
        return res.status(400).json({ ok: false, error: "missing_rental_fields" });
      }

      const maxDuration = durationUnit === "hour" ? 12 : 3;
      if (durationValue <= 0 || durationValue > maxDuration) {
        return res.status(400).json({ ok: false, error: "invalid_rental_duration" });
      }

      const project = ensureProjectState(projectKey);
      const definition = getProjectDefinition(projectKey);
      if (!project || definition?.type !== "showroom") {
        return res.status(404).json({ ok: false, error: "project_not_showroom" });
      }

      const offerRecord = (Array.isArray(project.showroomVehicles) ? project.showroomVehicles : [])
        .find((entry) => normalizeVehicleName(entry.vehicleName) === normalizeVehicleName(vehicleName));

      if (!offerRecord) {
        console.error("[WEB RENTAL BOOK NOT FOUND]", JSON.stringify({
          projectKey,
          requestedVehicleName: vehicleName,
          normalizedRequestedVehicleName: normalizeVehicleName(vehicleName),
          availableProjectVehicles: (Array.isArray(project.showroomVehicles) ? project.showroomVehicles : []).map((entry) => ({
            vehicleName: entry?.vehicleName || "",
            normalizedVehicleName: normalizeVehicleName(entry?.vehicleName || ""),
            pricePerHour: Number(entry?.pricePerHour || 0),
            pricePerDay: Number(entry?.pricePerDay || 0)
          }))
        }));
        return res.status(404).json({ ok: false, error: "rental_offer_not_found" });
      }

      const existingActiveRental = (Array.isArray(project.rentals) ? project.rentals : []).find((entry) => {
        const expiresAt = entry?.expiresAt ? new Date(entry.expiresAt).getTime() : 0;
        return normalizeVehicleName(entry?.vehicleName) === normalizeVehicleName(vehicleName) && expiresAt > Date.now();
      });

      if (existingActiveRental) {
        return res.status(409).json({ ok: false, error: "rental_vehicle_already_booked" });
      }

      const pricePerHour = Number(offerRecord.pricePerHour || 0);
      const pricePerDay = Number(offerRecord.pricePerDay || 0);
      const unitPrice = durationUnit === "day" ? pricePerDay : pricePerHour;
      const totalPrice = unitPrice * durationValue;

      if (!Number.isFinite(unitPrice) || unitPrice <= 0 || !Number.isFinite(totalPrice) || totalPrice <= 0) {
        return res.status(400).json({ ok: false, error: "rental_offer_not_configured" });
      }

      if (Boolean(authResult.account.bankFrozen)) {
        return res.status(403).json({ ok: false, error: "account_frozen" });
      }

      if (Number(authResult.account.balance || 0) < totalPrice) {
        return res.status(400).json({ ok: false, error: "insufficient_balance" });
      }

      const now = Date.now();
      const expiresAt = new Date(
        now + (durationUnit === "day" ? durationValue * 24 * 60 * 60 * 1000 : durationValue * 60 * 60 * 1000)
      ).toISOString();
      const rentalId = `rental_${Date.now()}_${Math.floor(Math.random() * 100000)}`;

      const updatedAccount = updateAccount(authResult.account.discordUserId, (current) => {
        current.balance = Number(current.balance || 0) - totalPrice;
        return current;
      });

      appendTransaction({
        discordUserId: authResult.account.discordUserId,
        robloxUsername: updatedAccount?.robloxUsername || authResult.account.robloxUsername,
        type: "website_vehicle_rental",
        amount: totalPrice,
        direction: "debit",
        balanceAfter: Number(updatedAccount?.balance || 0),
        metadata: {
          rentalId,
          vehicleName: offerRecord.vehicleName,
          projectKey,
          durationUnit,
          durationValue
        }
      });

      const projectIncomeResult = applyProjectMoneyMutation(
        projectKey,
        totalPrice,
        "showroom_income",
        authResult.account.discordUserId,
        `دخل تأجير ${offerRecord.vehicleName} لمدة ${durationValue} ${durationUnit === "day" ? "يوم" : "ساعة"}`
      );

      const updatedProject = upsertProject(projectKey, (current) => ({
        ...current,
        rentals: [
          ...(Array.isArray(current.rentals) ? current.rentals.filter((entry) => entry?.expiresAt ? new Date(entry.expiresAt).getTime() > now : true) : []),
          {
            rentalId,
            userId: authResult.account.discordUserId,
            vehicleName: offerRecord.vehicleName,
            projectKey,
            projectName: current.name || definition?.title || projectKey,
            startedAt: new Date(now).toISOString(),
            expiresAt,
            durationUnit,
            durationValue,
            totalPrice,
            pricePerHour,
            pricePerDay
          }
        ]
      }));

      const grantedRentalVehicle = addOwnedVehicle(authResult.account.discordUserId, offerRecord.vehicleName, {
        purchasePrice: 0,
        grantedBy: "website_rental",
        source: "rental",
        expiresAt,
        rentalId,
        projectKey,
        projectName: updatedProject.name || definition?.title || projectKey
      });

      console.info("[WEB RENTAL BOOKED]", JSON.stringify({
        projectKey,
        vehicleName: offerRecord.vehicleName,
        rentalId,
        renterUserId: authResult.account.discordUserId,
        grantedRentalVehicle: grantedRentalVehicle?.name || null,
        projectBudgetAfter: Number(updatedProject?.budget || 0),
        rentalsCount: Array.isArray(updatedProject?.rentals) ? updatedProject.rentals.length : 0,
        showroomVehiclesCount: Array.isArray(updatedProject?.showroomVehicles) ? updatedProject.showroomVehicles.length : 0,
        expiresAt
      }));

      invalidateWebsiteRouteCache(authResult.account.discordUserId);

      const responsePayload = {
        ok: true,
        rentalId,
        expiresAt,
        totalPrice,
        durationUnit,
        durationValue,
        account: buildWebsiteAccountSnapshot(updatedAccount),
        project: buildWebsiteProjectSnapshot(updatedProject, authResult.account.discordUserId),
        projectBudget: projectIncomeResult?.project?.budget ?? updatedProject?.budget ?? 0
      };

      await logWebsiteAction({
        title: "🌐 **تأجير مركبة من الموقع**",
        description: "**تم تسجيل تأجير مركبة عبر الموقع وربطها بممتلكات البوت بشكل فعلي.**",
        fields: [
          ...buildWebsiteActorFields(authResult.account),
          { name: "🏢 **المعرض**", value: `**${updatedProject.name || definition?.title || projectKey}**`, inline: true },
          { name: "🚘 **المركبة**", value: `**${offerRecord.vehicleName}**`, inline: true },
          { name: "💵 **الإجمالي**", value: `**${formatCurrency(totalPrice)}**`, inline: true },
          { name: "⏳ **المدة**", value: `**${durationValue} ${durationUnit === "day" ? "يوم" : "ساعة"}**`, inline: true },
          { name: "🕒 **ينتهي**", value: `**<t:${Math.floor(new Date(expiresAt).getTime() / 1000)}:R>**`, inline: true },
          { name: "🏦 **ميزانية المشروع بعد الحجز**", value: `**${formatCurrency(projectIncomeResult?.project?.budget ?? updatedProject?.budget ?? 0)}**`, inline: true }
        ]
      });

      void client.users.fetch(authResult.account.discordUserId)
        .then((user) => user.send({
          embeds: [
            new EmbedBuilder()
              .setColor(0x0b1f3a)
              .setTitle("🚘 تم تسجيل تأجير مركبة بنجاح")
              .setDescription("**أصبحت المركبة متاحة لك داخل البوت خلال مدة الإيجار المحددة.**")
              .addFields(
                { name: "المركبة", value: `**${offerRecord.vehicleName}**`, inline: true },
                { name: "المعرض", value: `**${updatedProject.name || definition?.title || projectKey}**`, inline: true },
                { name: "الإجمالي", value: `**${formatCurrency(totalPrice)}**`, inline: true },
                { name: "المدة", value: `**${durationValue} ${durationUnit === "day" ? "يوم" : "ساعة"}**`, inline: true },
                { name: "ينتهي", value: `**<t:${Math.floor(new Date(expiresAt).getTime() / 1000)}:R>**`, inline: true },
                { name: "رصيدك بعد الخصم", value: `**${formatCurrency(updatedAccount?.balance || 0)}**`, inline: true }
              )
              .setTimestamp()
          ]
        }).catch(() => null))
        .catch(() => null);

      return res.status(200).json(responsePayload);
    } catch (error) {
      console.error("Website rentals book failure:", error);
      return res.status(500).json({ ok: false, error: "internal_error" });
    }
  });

  app.post("/web/fines", async (req, res) => {
    try {
      if (!isAuthorizedInternalRequest(req)) {
        return res.status(401).json({ ok: false, error: "unauthorized" });
      }

      const authResult = authenticateWebsiteAccountFromBody(req.body ?? {}, { requireUsername: true });
      if (!authResult.ok) {
        return res.status(authResult.status).json({ ok: false, error: authResult.error });
      }

      const fines = getWebsiteAccessibleFinesForAccount(authResult.account)
        .map((fine) => buildWebsiteFineSnapshot(fine))
        .sort((a, b) => String(b.createdAt || "").localeCompare(String(a.createdAt || "")));

      return res.status(200).json({
        ok: true,
        account: buildWebsiteAccountSnapshot(authResult.account),
        fines
      });
    } catch (error) {
      console.error("Website fines failure:", error);
      return res.status(500).json({ ok: false, error: "internal_error" });
    }
  });

  app.post("/web/pay-fine", async (req, res) => {
    try {
      if (!isAuthorizedInternalRequest(req)) {
        return res.status(401).json({ ok: false, error: "unauthorized" });
      }

      const authResult = authenticateWebsiteAccountFromBody(req.body ?? {}, { requireUsername: true });
      if (!authResult.ok) {
        return res.status(authResult.status).json({ ok: false, error: authResult.error });
      }

      const fineId = String(req.body?.fineId || "").trim();
      if (!fineId) {
        return res.status(400).json({ ok: false, error: "missing_fine_id" });
      }

      const fine = getFine(fineId);
      if (!fine || !doesFineBelongToAccount(fine, authResult.account)) {
        return res.status(404).json({ ok: false, error: "fine_not_found" });
      }

      if (String(fine.status || "").toLowerCase() === "paid") {
        return res.status(409).json({ ok: false, error: "fine_already_paid" });
      }

      if (Boolean(authResult.account.bankFrozen)) {
        return res.status(403).json({ ok: false, error: "account_frozen" });
      }

      if (Number(authResult.account.balance || 0) < Number(fine.amount || 0)) {
        return res.status(400).json({ ok: false, error: "insufficient_balance" });
      }

      const updatedAccount = updateAccount(authResult.account.discordUserId, (current) => {
        current.balance = Number(current.balance || 0) - Number(fine.amount || 0);
        return current;
      });

      const updatedFine = updateFine(fineId, (current) => {
        current.status = "paid";
        current.paidAt = new Date().toISOString();
        return current;
      });

      appendTransaction({
        discordUserId: authResult.account.discordUserId,
        robloxUsername: updatedAccount?.robloxUsername || authResult.account.robloxUsername,
        type: "fine_payment",
        amount: Number(fine.amount || 0),
        direction: "debit",
        balanceAfter: Number(updatedAccount?.balance || 0),
        metadata: {
          fineId
        }
      });

      invalidateWebsiteRouteCache(authResult.account.discordUserId);

      applyBudgetTransaction({
        budgetKey: BUDGET_KEYS.police,
        type: "fine_income",
        amount: Number(fine.amount || 0),
        actorUserId: authResult.account.discordUserId,
        label: "دخل مخالفة من الموقع",
        note: `المخالفة #${fineId}`
      });

      await logWebsiteAction({
        title: "🌐 **سداد مخالفة من الموقع**",
        description: "**تم سداد مخالفة عبر الموقع وتحديث الحساب والميزانية الأمنية.**",
        fields: [
          ...buildWebsiteActorFields(authResult.account),
          { name: "🪪 **رقم المخالفة**", value: `**#${fineId}**`, inline: true },
          { name: "💵 **المبلغ**", value: `**${formatCurrency(fine.amount)}**`, inline: true },
          { name: "🏦 **الرصيد بعد السداد**", value: `**${formatCurrency(updatedAccount?.balance || 0)}**`, inline: true },
          { name: "📄 **السبب**", value: `**${fine.reason || "غير محدد"}**`, inline: false }
        ]
      });

      if (typeof sendFinePaymentLog === "function") {
        await sendFinePaymentLog({
          title: "✅ **سداد مخالفة من الموقع**",
          description: "**تم سداد مخالفة عبر الموقع وربط العملية مباشرة مع البوت والميزانية الأمنية.**",
          color: 0x1f6b45,
          fields: [
            { name: "👤 **صاحب الحساب**", value: `**<@${authResult.account.discordUserId}>**`, inline: true },
            { name: "🎮 **يوزر روبلوكس**", value: `**${updatedAccount?.robloxUsername || authResult.account.robloxUsername || "غير معروف"}**`, inline: true },
            { name: "🪪 **رقم المخالفة**", value: `**#${fineId}**`, inline: true },
            { name: "💵 **المبلغ**", value: `**${formatCurrency(fine.amount)}**`, inline: true },
            { name: "🏦 **الرصيد بعد السداد**", value: `**${formatCurrency(updatedAccount?.balance || 0)}**`, inline: true },
            { name: "📄 **السبب**", value: `**${fine.reason || "غير محدد"}**`, inline: false },
            { name: "🗂️ **الحالة**", value: `**${String(updatedFine?.status || "paid")}**`, inline: true },
            { name: "🕒 **وقت السداد**", value: `**<t:${Math.floor(Date.now() / 1000)}:F>**`, inline: true }
          ]
        }).catch(() => null);
      }

      await client.users.fetch(authResult.account.discordUserId)
        .then((user) => user.send({
          embeds: [
            new EmbedBuilder()
              .setColor(0x1f6b45)
              .setTitle("✅ تم سداد مخالفة بنجاح")
              .setDescription("**تم خصم مبلغ المخالفة من حسابك البنكي وتحديث السجل الرسمي داخل البوت.**")
              .addFields(
                { name: "🪪 رقم المخالفة", value: `**#${fineId}**`, inline: true },
                { name: "💵 المبلغ", value: `**${formatCurrency(fine.amount)}**`, inline: true },
                { name: "💳 الرصيد بعد السداد", value: `**${formatCurrency(updatedAccount?.balance || 0)}**`, inline: true },
                { name: "📝 السبب", value: `**${fine.reason || "غير محدد"}**`, inline: false }
              )
              .setTimestamp()
          ]
        }).catch(() => null))
        .catch(() => null);

      return res.status(200).json({
        ok: true,
        message: "تم سداد المخالفة بنجاح",
        account: buildWebsiteAccountSnapshot(updatedAccount),
        fine: buildWebsiteFineSnapshot(updatedFine)
      });
    } catch (error) {
      console.error("Website pay-fine failure:", error);
      return res.status(500).json({ ok: false, error: "internal_error" });
    }
  });

  app.post("/web/admin/showroom-vehicles", async (req, res) => {
    try {
      if (!isAuthorizedInternalRequest(req)) {
        return res.status(401).json({ ok: false, error: "unauthorized" });
      }

      const vehicles = getSortedVehicleCatalog().map((vehicle) => {
        const meta = getVehicleShowroomMetaRecord(vehicle.name);
        return {
          name: vehicle.name,
          price: Number(vehicle.price || 0),
          isFree: Boolean(vehicle.isFree),
          image: meta?.image || "",
          description: meta?.description || "",
          speed: Number(meta?.speed || 0),
          acceleration: meta?.acceleration || "",
          seats: Number(meta?.seats || 4),
          hidden: Boolean(meta?.hidden)
        };
      });

      return res.status(200).json({ ok: true, vehicles });
    } catch (error) {
      console.error("Website admin showroom-vehicles failure:", error);
      return res.status(500).json({ ok: false, error: "internal_error" });
    }
  });

  app.post("/web/admin/showroom-vehicle-meta", async (req, res) => {
    try {
      if (!isAuthorizedInternalRequest(req)) {
        return res.status(401).json({ ok: false, error: "unauthorized" });
      }

      const vehicleName = String(req.body?.vehicleName || "").trim();
      if (!vehicleName) {
        return res.status(400).json({ ok: false, error: "missing_vehicle_name" });
      }

      const vehicle = upsertVehicleShowroomMeta(vehicleName, {
        image: req.body?.image,
        description: req.body?.description,
        speed: req.body?.speed,
        acceleration: req.body?.acceleration,
        seats: req.body?.seats,
        hidden: req.body?.hidden
      });

      return res.status(200).json({ ok: true, vehicle });
    } catch (error) {
      console.error("Website admin showroom-vehicle-meta failure:", error);
      return res.status(500).json({ ok: false, error: "internal_error" });
    }
  });

  app.post("/web/project-details", async (req, res) => {
    try {
      if (!isAuthorizedInternalRequest(req)) {
        return res.status(401).json({ ok: false, error: "unauthorized" });
      }

      const authResult = authenticateWebsiteAccountFromBody(req.body ?? {}, { requireUsername: true });
      if (!authResult.ok) {
        return res.status(authResult.status).json({ ok: false, error: authResult.error });
      }

      const projectKey = String(req.body?.projectKey || req.body?.key || "").trim();
      if (!projectKey) {
        return res.status(400).json({ ok: false, error: "missing_project_key" });
      }

      const project = ensureProjectState(projectKey);
      if (!project) {
        return res.status(404).json({ ok: false, error: "project_not_found" });
      }

      const snapshot = buildWebsiteProjectSnapshot(project, authResult.account.discordUserId);
      if (!snapshot || snapshot.accessLevel === "none") {
        return res.status(403).json({ ok: false, error: "project_access_denied" });
      }

      const transactions = listProjectTransactions(projectKey, 25).map((entry) => ({
        id: entry.id || "",
        type: entry.type || "",
        label: entry.label || entry.type || "",
        amount: Number(entry.amount || 0),
        direction: entry.direction || "none",
        actorUserId: entry.actorUserId || null,
        targetUserId: entry.targetUserId || null,
        note: entry.note || "",
        balanceAfter: Number(entry.balanceAfter || 0),
        createdAt: entry.createdAt || null
      }));

      return res.status(200).json({
        ok: true,
        account: buildWebsiteAccountSnapshot(authResult.account),
        project: snapshot,
        transactions
      });
    } catch (error) {
      console.error("Website project-details failure:", error);
      return res.status(500).json({ ok: false, error: "internal_error" });
    }
  });

  app.post("/web/mobile-bootstrap", async (req, res) => {
    try {
      if (!isAuthorizedInternalRequest(req)) {
        return res.status(401).json({ ok: false, error: "unauthorized" });
      }

      const authResult = authenticateWebsiteAccountFromBody(req.body ?? {}, { requireUsername: true });
      if (!authResult.ok) {
        return res.status(authResult.status).json({ ok: false, error: authResult.error });
      }

      const limit = Math.max(1, Math.min(Number(req.body?.transactionsLimit || 10) || 10, 25));
      const payload = readWebsiteRouteCache("mobile-bootstrap", authResult.account.discordUserId, limit)
        || writeWebsiteRouteCache(
          "mobile-bootstrap",
          authResult.account.discordUserId,
          {
            transactions: listTransactionsForUser(authResult.account.discordUserId, limit)
              .map((entry) => buildWebsiteTransactionSnapshot(entry)),
            vehicles: buildWebsiteVehicleCatalogForUser(authResult.account.discordUserId),
            projects: buildWebsiteProjectsForUser(authResult.account.discordUserId)
          },
          limit
        );

      return res.status(200).json({
        ok: true,
        account: buildWebsiteAccountSnapshot(authResult.account),
        transactions: payload.transactions,
        vehicles: payload.vehicles,
        projects: payload.projects
      });
    } catch (error) {
      console.error("Website mobile-bootstrap failure:", error);
      return res.status(500).json({ ok: false, error: "internal_error" });
    }
  });
}
