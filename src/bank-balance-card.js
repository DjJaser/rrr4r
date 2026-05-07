import { AttachmentBuilder } from "discord.js";
import fs from "fs";
import path from "path";

const DESIGN_WIDTH = 1008;
const DESIGN_HEIGHT = 519;

const TEMPLATE = {
  pathCandidates: [
    path.resolve(process.cwd(), "bank-balance-template.png"),
    path.resolve(process.cwd(), "assets", "bank-balance-template.png"),
    path.resolve(process.cwd(), "359_20260427133335.png"),
    path.resolve(process.cwd(), "assets", "359_20260427133335.png"),
    path.resolve(process.cwd(), "353_20260425144528.png"),
    path.resolve(process.cwd(), "assets", "353_20260425144528.png")
  ],
  ownerX: 145,
  ownerY: 164,
  ownerFontSize: 37,
  balanceX: 145,
  balanceY: 320,
  balanceFontSize: 35,
  accountNumberX: 145,
  accountNumberY: 425,
  accountNumberFontSize: 39
};

function resolveTemplatePath(candidates) {
  const matchedPath = candidates.find((candidatePath) => fs.existsSync(candidatePath));
  if (matchedPath) {
    return matchedPath;
  }

  const searchDirs = [process.cwd(), path.resolve(process.cwd(), "assets")];

  for (const searchDir of searchDirs) {
    if (!fs.existsSync(searchDir)) {
      continue;
    }

    const pngFiles = fs.readdirSync(searchDir).filter((fileName) => fileName.toLowerCase().endsWith(".png"));
    const preferred = pngFiles.find((fileName) => /bank|359_|353_/i.test(fileName));
    if (preferred) {
      return path.resolve(searchDir, preferred);
    }
  }

  throw new Error(`Input file is missing: ${candidates[0]}`);
}

function escapeSvgText(value) {
  return String(value || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function scale(value, actual, design) {
  return (Number(value) / design) * actual;
}

function formatBalanceText(value) {
  return `${Number(value || 0).toLocaleString("en-US")} ريال`;
}

function buildCardSvg(account, width, height) {
  const ownerName = escapeSvgText(account?.name || "غير معروف");
  const balance = escapeSvgText(formatBalanceText(account?.balance || 0));
  const accountNumber = escapeSvgText(String(account?.accountNumber || "----"));

  return `
    <svg width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" xmlns="http://www.w3.org/2000/svg">
      <style>
        .owner {
          font-family: Arial, Tahoma, sans-serif;
          font-size: ${scale(TEMPLATE.ownerFontSize, width, DESIGN_WIDTH)}px;
          font-weight: 700;
          fill: #bf8f00;
          text-anchor: start;
          dominant-baseline: middle;
        }

        .balance {
          font-family: Arial, Tahoma, sans-serif;
          font-size: ${scale(TEMPLATE.balanceFontSize, width, DESIGN_WIDTH)}px;
          font-weight: 700;
          fill: #bf8f00;
          text-anchor: start;
          dominant-baseline: middle;
        }

        .account-number {
          font-family: Arial, Tahoma, sans-serif;
          font-size: ${scale(TEMPLATE.accountNumberFontSize, width, DESIGN_WIDTH)}px;
          font-weight: 700;
          fill: #bf8f00;
          text-anchor: start;
          dominant-baseline: middle;
        }
      </style>

      <text x="${scale(TEMPLATE.ownerX, width, DESIGN_WIDTH)}" y="${scale(TEMPLATE.ownerY, height, DESIGN_HEIGHT)}" class="owner">${ownerName}</text>
      <text x="${scale(TEMPLATE.balanceX, width, DESIGN_WIDTH)}" y="${scale(TEMPLATE.balanceY, height, DESIGN_HEIGHT)}" class="balance">${balance}</text>
      <text x="${scale(TEMPLATE.accountNumberX, width, DESIGN_WIDTH)}" y="${scale(TEMPLATE.accountNumberY, height, DESIGN_HEIGHT)}" class="account-number">${accountNumber}</text>
    </svg>
  `;
}

export async function buildBankBalanceCardAttachment(account) {
  const sharpModule = await import("sharp");
  const sharp = sharpModule.default || sharpModule;
  const templatePath = resolveTemplatePath(TEMPLATE.pathCandidates);
  const template = sharp(templatePath);
  const metadata = await template.metadata();
  const width = Number(metadata.width || DESIGN_WIDTH);
  const height = Number(metadata.height || DESIGN_HEIGHT);
  const svg = buildCardSvg(account, width, height);

  const output = await template
    .composite([{ input: Buffer.from(svg) }])
    .png()
    .toBuffer();

  return new AttachmentBuilder(output, { name: "bank-balance-card.png" });
}
