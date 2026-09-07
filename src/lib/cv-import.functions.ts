import { createServerFn } from "@tanstack/react-start";

export type CvExtract = {
  full_name: string;
  role_title: string;
  expertise: string;
  bio: string;
  organization: string;
  contact_email: string;
  contact_phone: string;
};

const EMPTY: CvExtract = {
  full_name: "",
  role_title: "",
  expertise: "",
  bio: "",
  organization: "",
  contact_email: "",
  contact_phone: "",
};

const MAX_BYTES = 8 * 1024 * 1024;

function b64ToBytes(b64: string): Uint8Array {
  const bin = atob(b64);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

/** Extract readable text from a .docx or .pptx (Open XML zip) buffer. */
async function officeText(bytes: Uint8Array): Promise<string> {
  const JSZip = (await import("jszip")).default;
  const zip = await JSZip.loadAsync(bytes);
  const names = Object.keys(zip.files).filter(
    (n) =>
      n === "word/document.xml" ||
      n.startsWith("word/") && n.endsWith(".xml") && n.includes("document") ||
      (n.startsWith("ppt/slides/slide") && n.endsWith(".xml")),
  );
  let text = "";
  for (const n of names.slice(0, 60)) {
    const xml = await zip.files[n]!.async("string");
    text +=
      xml
        .replace(/<\/w:p>|<\/a:p>/g, "\n")
        .replace(/<[^>]+>/g, " ")
        .replace(/&amp;/g, "&")
        .replace(/&lt;/g, "<")
        .replace(/&gt;/g, ">")
        .replace(/[ \t]+/g, " ") + "\n";
  }
  return text.slice(0, 40000).trim();
}

const SYSTEM =
  "Tu es un assistant RH. À partir d'un CV, tu renvoies UNIQUEMENT un objet JSON valide, sans texte autour, " +
  'avec exactement ces clés: {"full_name","role_title","expertise","bio","organization","contact_email","contact_phone"}. ' +
  "full_name = nom complet. role_title = poste/fonction actuelle. expertise = 2 à 5 domaines séparés par des virgules. " +
  "bio = résumé professionnel en français, 2 à 3 phrases (parcours, réalisations clés). organization = employeur actuel. " +
  "Laisse une chaîne vide pour toute information absente. N'invente rien.";

export const extractCvFields = createServerFn({ method: "POST" })
  .inputValidator((data: { fileName: string; mimeType: string; dataBase64: string }) => {
    if (!data?.dataBase64 || typeof data.dataBase64 !== "string") throw new Error("Fichier manquant");
    if (data.dataBase64.length > MAX_BYTES * 1.4) throw new Error("Fichier trop volumineux (max 8 Mo)");
    return {
      fileName: String(data.fileName ?? "cv").slice(0, 200),
      mimeType: String(data.mimeType ?? ""),
      dataBase64: data.dataBase64,
    };
  })
  .handler(async ({ data }): Promise<CvExtract> => {
    const key = process.env["LOVABLE_API_KEY"];
    if (!key) throw new Error("Analyse IA indisponible : clé manquante.");

    const mime = data.mimeType.toLowerCase();
    const name = data.fileName.toLowerCase();
    let content: any[];

    if (mime === "application/pdf" || name.endsWith(".pdf")) {
      content = [
        { type: "text", text: "Analyse ce CV et renvoie le JSON demandé." },
        {
          type: "file",
          file: { filename: data.fileName, file_data: `data:application/pdf;base64,${data.dataBase64}` },
        },
      ];
    } else if (mime.startsWith("image/")) {
      content = [
        { type: "text", text: "Analyse ce CV (image) et renvoie le JSON demandé." },
        { type: "image_url", image_url: { url: `data:${mime};base64,${data.dataBase64}` } },
      ];
    } else if (
      name.endsWith(".docx") ||
      name.endsWith(".pptx") ||
      mime.includes("officedocument")
    ) {
      const text = await officeText(b64ToBytes(data.dataBase64));
      if (!text) throw new Error("Impossible de lire le contenu de ce fichier.");
      content = [{ type: "text", text: `Analyse ce CV et renvoie le JSON demandé.\n\n${text}` }];
    } else {
      throw new Error("Format non pris en charge (PDF, Word, PowerPoint ou image).");
    }

    const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "google/gemini-3.8-flash",
        messages: [
          { role: "system", content: SYSTEM },
          { role: "user", content },
        ],
        response_format: { type: "json_object" },
      }),
    });

    if (res.status === 429) throw new Error("Trop de demandes d'analyse, réessayez dans un instant.");
    if (res.status === 402) throw new Error("Crédits IA épuisés : rechargez l'espace de travail.");
    if (!res.ok) throw new Error(`Analyse impossible (${res.status}).`);

    const json: any = await res.json();
    const raw: string = json?.choices?.[0]?.message?.content ?? "";
    const match = raw.match(/\{[\s\S]*\}/);
    if (!match) throw new Error("Le CV n'a pas pu être interprété.");
    let parsed: any;
    try {
      parsed = JSON.parse(match[0]);
    } catch {
      throw new Error("Le CV n'a pas pu être interprété.");
    }

    const str = (v: unknown) => (typeof v === "string" ? v.trim().slice(0, 2000) : "");
    return {
      ...EMPTY,
      full_name: str(parsed.full_name),
      role_title: str(parsed.role_title),
      expertise: str(parsed.expertise),
      bio: str(parsed.bio),
      organization: str(parsed.organization),
      contact_email: str(parsed.contact_email),
      contact_phone: str(parsed.contact_phone),
    };
  });
