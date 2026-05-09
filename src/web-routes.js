import { Routes } from "discord.js";

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
    findGuildMemberForWebsiteAccess
  } = deps;

  function isAuthorizedInternalRequest(req) {
    const apiKey = String(req.headers["x-api-key"] || req.headers["x-internal-api-key"] || "").trim();
    return Boolean(apiKey) && apiKey === config.internalApiKey;
  }

  function buildWebsiteAccountSnapshot(account) {
    if (!account) {
      return null;
    }

    const ownedVehicles = account.discordUserId
      ? listOwnedVehicles(account.discordUserId).map((vehicle) => vehicle.name).filter(Boolean)
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
    const robloxUsername = String(payload?.robloxUsername || "").trim();

    if (!bankAccountId || (requireUsername && !robloxUsername)) {
      return {
        ok: false,
        status: 400,
        error: requireUsername ? "missing_credentials" : "missing_account_number"
      };
    }

    const account = findAccountByAccountNumber(bankAccountId);
    if (!account) {
      return { ok: false, status: 404, error: "account_not_found" };
    }

    if (
      requireUsername
      && String(account.robloxUsername || "").trim().toLowerCase() !== robloxUsername.toLowerCase()
    ) {
      return { ok: false, status: 403, error: "username_mismatch" };
    }

    return {
      ok: true,
      account,
      bankAccountId,
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
      fuelPercent: Number(project.fuelPercent || 0),
      accessLevel,
      dashboardChannelId: project.dashboardChannelId || null,
      dashboardMessageId: project.dashboardMessageId || null,
      partners: Array.isArray(project.partners) ? [...project.partners] : [],
      admins: Array.isArray(project.admins) ? [...project.admins] : [],
      employees: Array.isArray(project.employees) ? [...project.employees] : []
    };
  }

  function buildWebsiteVehicleCatalogForUser(discordUserId) {
    const ownedVehicleNames = new Set(
      listOwnedVehicles(discordUserId)
        .map((vehicle) => normalizeVehicleName(vehicle.name))
        .filter(Boolean)
    );

    return getSortedVehicleCatalog().map((vehicle) => ({
      name: vehicle.name,
      price: Number(vehicle.price || 0),
      isFree: Boolean(vehicle.isFree),
      owned: ownedVehicleNames.has(normalizeVehicleName(vehicle.name))
    }));
  }

  function buildWebsiteProjectsForUser(discordUserId) {
    return listProjects()
      .map((project) => buildWebsiteProjectSnapshot(project, discordUserId))
      .filter((project) => project && project.accessLevel !== "none");
  }

  function createWebsiteVerificationCode() {
    return String(Math.floor(100000 + Math.random() * 900000));
  }

  function createWebsiteVerificationId() {
    return `verify_${Date.now()}_${Math.floor(Math.random() * 100000)}`;
  }

  function extractWebsiteRobloxUsername(payload = {}) {
    return String(
      payload?.robloxUsername ||
      payload?.username ||
      payload?.robloxUser ||
      payload?.userName ||
      ""
    ).trim();
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

  async function resolveDiscordUserForWebsiteAccess(discordUserId) {
    const cachedUser = getCachedDiscordUser(discordUserId);
    if (cachedUser) {
      return { ok: true, user: cachedUser };
    }

    return {
      ok: true,
      user: {
        send: async (payload) => {
          const result = await sendWebsiteVerificationDm(discordUserId, payload);
          if (!result.ok) {
            throw new Error(result.error || "discord_dm_send_failed");
          }
        }
      }
    };
  }

  async function sendWebsiteVerificationDm(discordUserId, payload) {
    const cachedUser = getCachedDiscordUser(discordUserId);
    if (cachedUser) {
      return withTimeout(
        () => cachedUser.send(payload)
          .then(() => ({ ok: true }))
          .catch((error) => ({ ok: false, error: error?.code ? `discord_api_${error.code}` : (error?.message || "discord_dm_send_failed") })),
        9000,
        "discord_dm_send_timeout"
      ).catch((error) => ({ ok: false, error: error?.message || "discord_dm_send_failed" }));
    }

    return (async () => {
      try {
        const dmChannel = await withTimeout(
          () => client.rest.post(Routes.userChannels(), {
            body: { recipient_id: discordUserId }
          }),
          4000,
          "discord_dm_channel_timeout"
        );

        await withTimeout(
          () => client.rest.post(Routes.channelMessages(dmChannel.id), {
            body: {
              embeds: Array.isArray(payload?.embeds)
                ? payload.embeds.map((embed) => typeof embed?.toJSON === "function" ? embed.toJSON() : embed)
                : []
            }
          }),
          6000,
          "discord_dm_send_timeout"
        );

        return { ok: true };
      } catch (error) {
        return { ok: false, error: error?.code ? `discord_api_${error.code}` : (error?.message || "discord_dm_send_failed") };
      }
    })();
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

  function resolveWebsiteTransferTarget(payload = {}) {
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

    if (explicitAccountNumber) {
      return findAccountByAccountNumber(explicitAccountNumber);
    }

    if (explicitDiscordId) {
      return getAccount(explicitDiscordId);
    }

    if (explicitName) {
      return findAccountByName(explicitName);
    }

    if (explicitRobloxUsername) {
      return findAccountByRobloxUsername(explicitRobloxUsername);
    }

    if (!genericTarget) {
      return null;
    }

    if (/^\d{4,6}$/.test(genericTarget)) {
      return findAccountByAccountNumber(genericTarget);
    }

    if (/^\d{10,20}$/.test(genericTarget)) {
      return getAccount(genericTarget);
    }

    return findAccountByName(genericTarget) || findAccountByRobloxUsername(genericTarget);
  }

  app.get("/web/health", (req, res) => {
    return res.status(200).json({ ok: true, service: "arab-world-bot-web-api" });
  });

  app.post(["/web/showroom-request-code", "/web/mobile-request-code"], async (req, res, next) => {
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
        if (restSendResult.error === "discord_user_fetch_timeout") {
          return res.status(504).json({ ok: false, error: "discord_user_fetch_timeout" });
        }
        if (restSendResult.error === "discord_dm_send_timeout") {
          return res.status(504).json({ ok: false, error: "discord_dm_send_timeout" });
        }
        if (restSendResult.error === "discord_user_not_found") {
          return res.status(404).json({ ok: false, error: "discord_user_not_found" });
        }
        return res.status(409).json({ ok: false, error: "dm_delivery_failed" });
      }

      return res.status(200).json({
        ok: true,
        verificationId,
        expiresAt,
        maskedAccountNumber: account.accountNumber ? `****${String(account.accountNumber).slice(-2)}` : null
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

      if (String(pending.robloxUsername || "").trim().toLowerCase() !== robloxUsername.toLowerCase()) {
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

      pending.used = true;
      pendingWebsiteLoginVerifications.set(verificationId, pending);

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

      if (String(pending.robloxUsername || "").trim().toLowerCase() !== robloxUsername.toLowerCase()) {
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
      const transactions = listTransactionsForUser(authResult.account.discordUserId, limit)
        .map((entry) => buildWebsiteTransactionSnapshot(entry));

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

      const vehicles = buildWebsiteVehicleCatalogForUser(authResult.account.discordUserId);

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

      const targetAccount = resolveWebsiteTransferTarget(req.body ?? {});
      if (!targetAccount) {
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

      const projects = buildWebsiteProjectsForUser(authResult.account.discordUserId);

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
      const transactions = listTransactionsForUser(authResult.account.discordUserId, limit)
        .map((entry) => buildWebsiteTransactionSnapshot(entry));
      const vehicles = buildWebsiteVehicleCatalogForUser(authResult.account.discordUserId);
      const projects = buildWebsiteProjectsForUser(authResult.account.discordUserId);

      return res.status(200).json({
        ok: true,
        account: buildWebsiteAccountSnapshot(authResult.account),
        transactions,
        vehicles,
        projects
      });
    } catch (error) {
      console.error("Website mobile-bootstrap failure:", error);
      return res.status(500).json({ ok: false, error: "internal_error" });
    }
  });
}
