import { AttachmentBuilder } from "discord.js";
import fs from "fs";
import path from "path";

const VERTICAL_TEMPLATE = {
  width: 941,
  height: 1672,
  pathCandidates: [
    path.resolve(process.cwd(), "assets", "resource-inventory-template-vertical.png"),
    path.resolve(process.cwd(), "resource-inventory-template-vertical.png")
  ],
  ownerX: 471,
  ownerY: 202,
  ownerMaskWidth: 320,
  ownerMaskHeight: 44,
  ownerFontSize: 31,
  valueX: 814,
  valueY: {
    sulfur: 378,
    aluminum: 603,
    iron: 812,
    coal: 1019,
    plastic: 1226,
    copper: 1438
  },
  valueFontSize: 52
};

const WIDE_TEMPLATE = {
  width: 1536,
  height: 1024,
  pathCandidates: [
    path.resolve(process.cwd(), "assets", "resource-reward-template-wide.png"),
    path.resolve(process.cwd(), "resource-reward-template-wide.png")
  ],
  ownerX: 768,
  ownerY: 220,
  ownerMaskWidth: 520,
  ownerMaskHeight: 60,
  ownerFontSize: 42,
  valueX: {
    sulfur: 160,
    aluminum: 405,
    iron: 648,
    coal: 890,
    plastic: 1135,
    copper: 1377
  },
  valueY: {
    sulfur: 758,
    aluminum: 758,
    iron: 758,
    coal: 758,
    plastic: 758,
    copper: 758
  },
  valueFontSize: 54
};

const RESOURCE_COLORS = {
  sulfur: "#f3c54d",
  aluminum: "#ececec",
  iron: "#ff5a4a",
  coal: "#f1f1f1",
  plastic: "#4aa3ff",
  copper: "#f19943"
};

const RESOURCE_ORDER = ["sulfur", "aluminum", "iron", "coal", "plastic", "copper"];

function escapeSvgText(value) {
  return String(value || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function resolveTemplatePath(candidates) {
  const matchedPath = candidates.find((candidatePath) => fs.existsSync(candidatePath));
  if (!matchedPath) {
    throw new Error(`Input file is missing: ${candidates[0]}`);
  }

  return matchedPath;
}

function formatResourceValue(value, plusPrefix = false) {
  const amount = Number(value || 0);
  if (plusPrefix && amount > 0) {
    return `+${amount.toLocaleString("en-US")}`;
  }

  return amount.toLocaleString("en-US");
}

function getResourceValues(payload = {}, plusPrefix = false) {
  const resources = payload.resources ?? payload;
  return {
    sulfur: formatResourceValue(resources?.sulfur, plusPrefix),
    aluminum: formatResourceValue(resources?.aluminum, plusPrefix),
    iron: formatResourceValue(resources?.iron, plusPrefix),
    coal: formatResourceValue(resources?.coal, plusPrefix),
    plastic: formatResourceValue(resources?.plastic, plusPrefix),
    copper: formatResourceValue(resources?.copper, plusPrefix)
  };
}

function buildOwnerMask(template) {
  const x = template.ownerX - (template.ownerMaskWidth / 2);
  const y = template.ownerY - (template.ownerMaskHeight / 2);
  return `
    <rect
      x="${x}"
      y="${y}"
      width="${template.ownerMaskWidth}"
      height="${template.ownerMaskHeight}"
      fill="#131a28"
      rx="10"
      ry="10"
    />
  `;
}

function buildOwnerText(template, ownerName) {
  return `
    <text
      x="${template.ownerX}"
      y="${template.ownerY}"
      class="owner"
    >${ownerName}</text>
  `;
}

function buildValueTexts(template, values) {
  return RESOURCE_ORDER.map((key) => {
    const x = typeof template.valueX === "object" ? template.valueX[key] : template.valueX;
    const y = typeof template.valueY === "object" ? template.valueY[key] : template.valueY;

    return `
      <text
        x="${x}"
        y="${y}"
        class="num"
        fill="${RESOURCE_COLORS[key]}"
      >${escapeSvgText(values[key])}</text>
    `;
  }).join("");
}

function buildCardSvg(template, payload, displayName, plusPrefix = false) {
  const ownerName = escapeSvgText(displayName || payload?.name || "غير معروف");
  const values = getResourceValues(payload, plusPrefix);

  return `
    <svg width="${template.width}" height="${template.height}" viewBox="0 0 ${template.width} ${template.height}" xmlns="http://www.w3.org/2000/svg">
      <style>
        .owner {
          font-family: Arial, Tahoma, sans-serif;
          font-size: ${template.ownerFontSize}px;
          font-weight: 700;
          text-anchor: middle;
          dominant-baseline: middle;
          fill: #d7d7d7;
        }

        .num {
          font-family: Arial, Tahoma, sans-serif;
          font-size: ${template.valueFontSize}px;
          font-weight: 800;
          text-anchor: middle;
          dominant-baseline: middle;
        }
      </style>

      ${buildOwnerMask(template)}
      ${buildOwnerText(template, ownerName)}
      ${buildValueTexts(template, values)}
    </svg>
  `;
}

async function compositeCard(templateConfig, payload, displayName, options = {}) {
  const sharpModule = await import("sharp");
  const sharp = sharpModule.default || sharpModule;
  const templatePath = resolveTemplatePath(templateConfig.pathCandidates);
  const svg = buildCardSvg(templateConfig, payload, displayName, options.plusPrefix === true);

  const buffer = await sharp(templatePath)
    .composite([{ input: Buffer.from(svg) }])
    .png()
    .toBuffer();

  return new AttachmentBuilder(buffer, {
    name: options.fileName || "resource-card.png"
  });
}

export async function buildResourceInventoryCardAttachment(payload, displayName) {
  return compositeCard(VERTICAL_TEMPLATE, payload, displayName, {
    plusPrefix: false,
    fileName: "resource-inventory-card.png"
  });
}

export async function buildResourceRewardCardAttachment(payload, displayName) {
  return compositeCard(WIDE_TEMPLATE, payload, displayName, {
    plusPrefix: true,
    fileName: "resource-reward-card.png"
  });
}
