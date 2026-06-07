import { readFileSync } from "node:fs";

const files = [
  "src/routes/_authenticated/route.tsx",
  "src/routes/_authenticated/dashboard.tsx",
  "src/routes/_authenticated/finances.tsx",
  "src/routes/_authenticated/projets.tsx",
  "src/routes/_authenticated/score.tsx",
  "src/components/MiProjetCard.tsx",
];

const riskyPatterns = [
  {
    pattern: /md:hidden[^`"']*overflow-x-auto/,
    message: "Le menu mobile ne doit pas nécessiter de scroll horizontal.",
  },
  {
    pattern: /(?<!sm:)(?<!md:)(?<!lg:)(?<!xl:)grid-cols-2/,
    message: "Une grille à 2 colonnes doit rester en 1 colonne sous 640px.",
  },
  {
    pattern: /(?<!sm:)(?<!md:)(?<!lg:)(?<!xl:)text-8xl/,
    message: "Les très grands textes doivent être réduits sur mobile.",
  },
  {
    pattern: /tracking-widest/,
    message: "Le tracking large peut provoquer des débordements sur mobile.",
  },
  {
    pattern: /<table className="(?![^"]*table-fixed)/,
    message:
      "Les tableaux visibles sur mobile doivent limiter leurs colonnes ou utiliser table-fixed.",
  },
];

const viewportChecklist = ["320x568", "360x800", "375x812", "390x844", "414x896", "768x1024"];
const failures = [];

for (const file of files) {
  const lines = readFileSync(file, "utf8").split("\n");
  for (const [index, line] of lines.entries()) {
    if (line.includes("TabsList")) continue;
    for (const { pattern, message } of riskyPatterns) {
      if (pattern.test(line)) failures.push(`${file}:${index + 1}: ${message}`);
    }
  }
}

if (failures.length) {
  console.error("Contrôle responsive MiProjet+ échoué.");
  console.error(`Tailles à protéger: ${viewportChecklist.join(", ")}`);
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log(`Contrôle responsive OK: ${viewportChecklist.join(", ")}`);
