import { AttachmentBuilder } from "discord.js";
import fs from "fs";
import path from "path";

const TEMPLATE = {
  width: 941,
  height: 1672,
  pathCandidates: [
    path.resolve(process.cwd(), "assets", "owned-cars-template.png"),
    path.resolve(process.cwd(), "owned-cars-template.png"),
    path.resolve(process.cwd(), "assets", "357_20260426160027.png"),
    path.resolve(process.cwd(), "357_20260426160027.png")
  ],
  countX: 328,
  countY: 438,
  totalX: 627,
  totalY: 438,
  listRightX: 835,
  listStartY: 660,
  listLineHeight: 52,
  listMaxItems: 6
};

function resolveTemplatePath(candidates) {
  const matchedPath = candidates.find((candidatePath) => fs.existsSync(candidatePath));
  if (!matchedPath) {
    throw new Error(`Input file is missing: ${candidates[0]}`);
  }

  return matchedPath;
}

function escapeSvgText(value) {
  return String(value || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function formatNumber(value) {
  return Number(value || 0).toLocaleString("en-US");
}

function trimVehicleName(name, maxLength = 30) {
  const normalized = String(name || "").trim();
  if (normalized.length <= maxLength) {
    return normalized;
  }

  return `${normalized.slice(0, maxLength - 1)}…`;
}

function buildVehicleRows(ownedCars) {
  const rows = ownedCars
    .slice(0, TEMPLATE.listMaxItems)
    .map((car) => trimVehicleName(car.source === "rental" ? `${car.name} (إيجار)` : car.name));

  if (ownedCars.length > TEMPLATE.listMaxItems) {
    rows.push(`+${ownedCars.length - TEMPLATE.listMaxItems} أكثر...`);
  }

  if (!rows.length) {
    rows.push("لا توجد مركبات مسجلة");
  }

  return rows;
}

function buildCardSvg({ ownedCars, totalValue }) {
  const rows = buildVehicleRows(ownedCars);
  const countText = escapeSvgText(formatNumber(ownedCars.length));
  const totalText = escapeSvgText(formatNumber(totalValue));

  const rowTexts = rows.map((row, index) => `
    <text
      x="${TEMPLATE.listRightX}"
      y="${TEMPLATE.listStartY + (index * TEMPLATE.listLineHeight)}"
      class="vehicleRow"
    >${escapeSvgText(row)}</text>
  `).join("");

  return `
    <svg width="${TEMPLATE.width}" height="${TEMPLATE.height}" viewBox="0 0 ${TEMPLATE.width} ${TEMPLATE.height}" xmlns="http://www.w3.org/2000/svg">
      <style>
        .stat {
          font-family: Arial, Tahoma, sans-serif;
          font-size: 34px;
          font-weight: 800;
          text-anchor: middle;
          dominant-baseline: middle;
          fill: #122f57;
        }

        .vehicleRow {
          font-family: Arial, Tahoma, sans-serif;
          font-size: 28px;
          font-weight: 700;
          text-anchor: end;
          dominant-baseline: middle;
          fill: #17263f;
        }
      </style>

      <text x="${TEMPLATE.countX}" y="${TEMPLATE.countY}" class="stat">${countText}</text>
      <text x="${TEMPLATE.totalX}" y="${TEMPLATE.totalY}" class="stat">${totalText}</text>
      ${rowTexts}
    </svg>
  `;
}

export async function buildOwnedCarsCardAttachment(ownedCars) {
  const sharpModule = await import("sharp");
  const sharp = sharpModule.default || sharpModule;
  const templatePath = resolveTemplatePath(TEMPLATE.pathCandidates);
  const totalValue = ownedCars.reduce((sum, car) => sum + Number(car.purchasePrice || 0), 0);
  const svg = buildCardSvg({ ownedCars, totalValue });

  const buffer = await sharp(templatePath)
    .composite([{ input: Buffer.from(svg) }])
    .png()
    .toBuffer();

  return new AttachmentBuilder(buffer, { name: "owned-cars-card.png" });
}

