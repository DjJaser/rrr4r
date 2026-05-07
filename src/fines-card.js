import { AttachmentBuilder } from "discord.js";
import fs from "fs";
import path from "path";

const DESIGN_WIDTH = 2956;
const DESIGN_HEIGHT = 1793;

const START_Y = 625;
const ROW_HEIGHT = 129;
const AMOUNT_X = 455;
const REASON_X = 1520;
const NAME_X = 2640;

const AMOUNT_FONT_SIZE = 80;
const CELL_FONT_SIZE = 72;

const MAX_NAME_CHARS = 20;
const MAX_REASON_CHARS = 18;

function scaleX(value, width) {
  return (value / DESIGN_WIDTH) * width;
}

function scaleY(value, height) {
  return (value / DESIGN_HEIGHT) * height;
}

function scaleFont(value, width) {
  return (value / DESIGN_WIDTH) * width;
}

function escapeSvgText(value) {
  return String(value || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function resolveTemplatePath() {
  const candidates = [
    path.resolve(process.cwd(), "assets", "360_20260428151402.png"),
    path.resolve(process.cwd(), "360_20260428151402.png"),
    path.resolve(process.cwd(), "assets", "fines-view-template.png"),
    path.resolve(process.cwd(), "fines-view-template.png")
  ];

  const matched = candidates.find((candidate) => fs.existsSync(candidate));
  if (!matched) {
    throw new Error("Fines template image not found");
  }

  return matched;
}

function normalizeText(value, fallback) {
  const text = String(value || "").trim();
  return text || fallback;
}

function truncateText(value, maxChars, fallback) {
  const text = normalizeText(value, fallback);
  if (text.length <= maxChars) {
    return text;
  }

  return `${text.slice(0, Math.max(0, maxChars - 1)).trim()}…`;
}

function buildText({ x, y, className, anchor, value }) {
  return `<text x="${x}" y="${y}" text-anchor="${anchor}" class="${className}">${escapeSvgText(value)}</text>`;
}

function buildRowsSvg(width, height, rows) {
  const rowTexts = rows
    .map((row, index) => {
      const centerY = scaleY(START_Y + (index * ROW_HEIGHT), height);

      return [
        buildText({
          x: scaleX(AMOUNT_X, width),
          y: centerY,
          className: "amount",
          anchor: "middle",
          value: row.amountText
        }),
        buildText({
          x: scaleX(REASON_X, width),
          y: centerY,
          className: "cell",
          anchor: "middle",
          value: row.reasonText
        }),
        buildText({
          x: scaleX(NAME_X, width),
          y: centerY,
          className: "cell",
          anchor: "end",
          value: row.nameText
        })
      ].join("");
    })
    .join("");

  return `
    <svg width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" xmlns="http://www.w3.org/2000/svg">
      <style>
        .cell, .amount {
          font-family: Arial, Tahoma, sans-serif;
          font-weight: 700;
          fill: #ffffff;
          dominant-baseline: middle;
        }

        .cell {
          font-size: ${scaleFont(CELL_FONT_SIZE, width)}px;
        }

        .amount {
          font-size: ${scaleFont(AMOUNT_FONT_SIZE, width)}px;
        }
      </style>
      ${rowTexts}
    </svg>
  `;
}

export async function buildFinesCardAttachment(fines, fallbackName = "") {
  const sharpModule = await import("sharp");
  const sharp = sharpModule.default || sharpModule;
  const templatePath = resolveTemplatePath();
  const template = sharp(templatePath);
  const metadata = await template.metadata();
  const width = Number(metadata.width || DESIGN_WIDTH);
  const height = Number(metadata.height || DESIGN_HEIGHT);

  const visibleRows = (Array.isArray(fines) ? fines : [])
    .map((fine) => ({
      amountText: String(Number(fine.amount || 0)),
      reasonText: truncateText(fine.reason || fine.violationType, MAX_REASON_CHARS, "مخالفة"),
      nameText: truncateText(fine.targetName || fallbackName, MAX_NAME_CHARS, "غير معروف")
    }))
    .slice(0, 5);

  const svg = buildRowsSvg(width, height, visibleRows);
  const composed = await template
    .composite([{ input: Buffer.from(svg), top: 0, left: 0 }])
    .png()
    .toBuffer();

  return new AttachmentBuilder(composed, { name: "fines-view-card.png" });
}
