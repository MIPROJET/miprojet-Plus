import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  FolderPlus,
  Upload,
  Folder as FolderIcon,
  FileText,
  Download,
  Trash2,
  Search,
  ChevronRight,
  Pencil,
} from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/documents")({
  head: () => ({
    meta: [
      { title: "Espace documentaire · MiProjet+" },
      {
        name: "description",
        content:
          "Classez, partagez et sécurisez les documents de votre organisation : dossiers, contrôle d'accès par rôle et téléchargement sécurisé.",
      },
      { property: "og:title", content: "Espace documentaire · MiProjet+" },
      {
        property: "og:description",
        content: "Cloud documentaire sécurisé pour votre organisation.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: DocumentsPage,
});

type Folder = { id: string; name: string; parent_id: string | null; org_id: string | null };
type Doc = {
  id: string;
  name: string;
  description: string | null;
  storage_path: string;
  mime_type: string | null;
  size_bytes: number | null;
  category: string | null;
  folder_id: string | null;
  created_at: string;
  owner_id: string;
  org_id: string | null;
  min_role?: string | null;
};

const CATEGORIES = [
  "Juridique",
  "Financier",
  "Commercial",
  "Technique",
  "RH",
  "Communication",
  "Autre",
];

function humanSize(n: number | null): string {
  if (!n) return "—";
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  return `${(n / 1024 / 1024).toFixed(1)} MB`;
}

function DocumentsPage() {
  const [orgId, setOrgId] = useState<string | null>(null);
  const [folders, setFolders] = useState<Folder[]>([]);
  const [docs, setDocs] = useState<Doc[]>([]);
  const [currentFolder, setCurrentFolder] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [uploading, setUploading] = useState(false);
  const [editing, setEditing] = useState<Doc | null>(null);

  async function load() {
    const { data: u } = await supabase.auth.getUser();
    if (!u.user) return;
    const { data: memberships } = await supabase
      .from("mp_org_members" as never)
      .select("org_id")
      .eq("user_id", u.user.id)
      .eq("status", "active")
      .limit(1);
    let oid = ((memberships as Array<{ org_id: string }> | null)?.[0]?.org_id) ?? null;
    if (!oid) {
      const { data: orgs } = await supabase
        .from("mp_organizations" as never)
        .select("id")
        .eq("owner_id", u.user.id)
        .limit(1);
      oid = ((orgs as Array<{ id: string }> | null)?.[0]?.id) ?? null;
    }
    setOrgId(oid);

    const [{ data: fs }, { data: ds }] = await Promise.all([
      supabase.from("mp_document_folders" as never).select("*").order("name"),
      supabase.from("mp_documents" as never).select("*").order("created_at", { ascending: false }),
    ]);
    setFolders((fs as Folder[] | null) ?? []);
    setDocs((ds as Doc[] | null) ?? []);
  }
  useEffect(() => {
    load();
  }, []);

  const visibleFolders = folders.filter((f) => f.parent_id === currentFolder);
  const visibleDocs = useMemo(() => {
    const s = search.trim().toLowerCase();
    let list = s ? docs : docs.filter((d) => d.folder_id === currentFolder);
    if (s) {
      list = list.filter(
        (d) =>
          d.name.toLowerCase().includes(s) ||
          (d.description ?? "").toLowerCase().includes(s) ||
          (d.category ?? "").toLowerCase().includes(s),
      );
    }
    return list;
  }, [docs, currentFolder, search]);

  const breadcrumb = useMemo(() => {
    const path: Folder[] = [];
    let id: string | null = currentFolder;
    while (id) {
      const f = folders.find((x) => x.id === id);
      if (!f) break;
      path.unshift(f);
      id = f.parent_id;
    }
    return path;
  }, [currentFolder, folders]);

  async function createFolder() {
    const name = prompt("Nom du dossier ?");
    if (!name) return;
    const { data: u } = await supabase.auth.getUser();
    if (!u.user) return;
    const { error } = await supabase.from("mp_document_folders" as never).insert({
      name,
      parent_id: currentFolder,
      org_id: orgId,
      owner_id: u.user.id,
    } as never);
    if (error) toast.error(error.message);
    else {
      toast.success("Dossier créé");
      await load();
    }
  }

  async function renameFolder(f: Folder) {
    const name = prompt("Nouveau nom", f.name);
    if (!name || name === f.name) return;
    const { error } = await supabase
      .from("mp_document_folders" as never)
      .update({ name } as never)
      .eq("id", f.id);
    if (error) toast.error(error.message);
    else {
      toast.success("Dossier renommé");
      await load();
    }
  }

  async function deleteFolder(f: Folder) {
    if (!confirm(`Supprimer le dossier "${f.name}" ? Les fichiers seront remis à la racine.`)) return;
    await supabase
      .from("mp_documents" as never)
      .update({ folder_id: null } as never)
      .eq("folder_id", f.id);
    const { error } = await supabase.from("mp_document_folders" as never).delete().eq("id", f.id);
    if (error) toast.error(error.message);
    else {
      toast.success("Dossier supprimé");
      await load();
    }
  }

  async function uploadFiles(files: FileList) {
    setUploading(true);
    const { data: u } = await supabase.auth.getUser();
    if (!u.user) {
      setUploading(false);
      return;
    }
    let ok = 0;
    for (const file of Array.from(files)) {
      const key = `${u.user.id}/${crypto.randomUUID()}-${file.name.replace(/[^\w.\-]+/g, "_")}`;
      const { error: upErr } = await supabase.storage
        .from("documents")
        .upload(key, file, { cacheControl: "3600", upsert: false });
      if (upErr) {
        toast.error(`${file.name} : ${upErr.message}`);
        continue;
      }
      const { error } = await supabase.from("mp_documents" as never).insert({
        name: file.name,
        storage_path: key,
        mime_type: file.type || null,
        size_bytes: file.size,
        folder_id: currentFolder,
        org_id: orgId,
        owner_id: u.user.id,
      } as never);
      if (error) {
        await supabase.storage.from("documents").remove([key]);
        toast.error(`${file.name} : ${error.message}`);
      } else ok++;
    }
    setUploading(false);
    if (ok > 0) {
      toast.success(`${ok} fichier(s) ajouté(s)`);
      await load();
    }
  }

  async function saveMeta(d: Doc) {
    const { error } = await supabase
      .from("mp_documents" as never)
      .update({
        name: d.name,
        description: d.description,
        category: d.category,
        folder_id: d.folder_id,
      } as never)
      .eq("id", d.id);
    if (error) toast.error(error.message);
    else {
      toast.success("Document mis à jour");
      setEditing(null);
      await load();
    }
  }

  async function download(doc: Doc) {
    const { data, error } = await supabase.storage
      .from("documents")
      .createSignedUrl(doc.storage_path, 60);
    if (error || !data?.signedUrl) {
      toast.error("Impossible de générer le lien");
      return;
    }
    window.open(data.signedUrl, "_blank");
  }

  async function del(doc: Doc) {
    if (!confirm(`Supprimer "${doc.name}" ?`)) return;
    await supabase.storage.from("documents").remove([doc.storage_path]);
    const { error } = await supabase.from("mp_documents" as never).delete().eq("id", doc.id);
    if (error) toast.error(error.message);
    else {
      toast.success("Supprimé");
      await load();
    }
  }

  return (
    <div className="mx-auto max-w-6xl space-y-6 p-4 sm:p-8">
      <div className="flex flex-wrap items-center gap-3">
        <FileText className="h-7 w-7 text-primary" />
        <div className="flex-1">
          <h1 className="text-2xl font-bold sm:text-3xl">Espace documentaire</h1>
          <p className="text-sm text-muted-foreground">
            Dossiers, fichiers, catégories et recherche — sécurisés par rôle et partagés avec votre
            organisation.
          </p>
        </div>
        <Button variant="outline" onClick={createFolder}>
          <FolderPlus className="mr-2 h-4 w-4" /> Dossier
        </Button>
        <label className="inline-flex cursor-pointer">
          <input
            type="file"
            multiple
            className="hidden"
            onChange={(e) => e.target.files?.length && uploadFiles(e.target.files)}
            disabled={uploading}
          />
          <span className="inline-flex h-9 items-center rounded-md bg-primary px-3 text-sm font-medium text-primary-foreground hover:bg-primary/90">
            <Upload className="mr-2 h-4 w-4" /> {uploading ? "Envoi…" : "Fichiers"}
          </span>
        </label>
      </div>

      <div className="flex flex-wrap items-center gap-2 text-sm">
        <button className="text-primary hover:underline" onClick={() => setCurrentFolder(null)}>
          Racine
        </button>
        {breadcrumb.map((f) => (
          <span key={f.id} className="inline-flex items-center gap-2">
            <ChevronRight className="h-3 w-3 text-muted-foreground" />
            <button className="text-primary hover:underline" onClick={() => setCurrentFolder(f.id)}>
              {f.name}
            </button>
          </span>
        ))}
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Rechercher dans tous les documents…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-9"
        />
      </div>

      {visibleFolders.length > 0 && !search.trim() && (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          {visibleFolders.map((f) => (
            <div key={f.id} className="flex items-center gap-2 rounded-lg border p-3">
              <button
                onClick={() => setCurrentFolder(f.id)}
                className="flex min-w-0 flex-1 items-center gap-2 text-left"
              >
                <FolderIcon className="h-5 w-5 shrink-0 text-primary" />
                <span className="truncate text-sm font-medium">{f.name}</span>
              </button>
              <Button variant="ghost" size="icon" onClick={() => renameFolder(f)}>
                <Pencil className="h-4 w-4" />
              </Button>
              <Button variant="ghost" size="icon" onClick={() => deleteFolder(f)}>
                <Trash2 className="h-4 w-4 text-destructive" />
              </Button>
            </div>
          ))}
        </div>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Fichiers ({visibleDocs.length})</CardTitle>
        </CardHeader>
        <CardContent className="divide-y">
          {visibleDocs.length === 0 ? (
            <div className="py-8 text-center text-sm text-muted-foreground">Aucun fichier</div>
          ) : (
            visibleDocs.map((d) => (
              <div key={d.id} className="flex items-center gap-3 py-3">
                <FileText className="h-5 w-5 shrink-0 text-muted-foreground" />
                <div className="min-w-0 flex-1">
                  <div className="truncate text-sm font-medium">{d.name}</div>
                  <div className="text-xs text-muted-foreground">
                    {humanSize(d.size_bytes)} · {new Date(d.created_at).toLocaleDateString("fr-FR")}
                    {d.description ? ` · ${d.description}` : ""}
                  </div>
                </div>
                {d.category && <Badge variant="outline">{d.category}</Badge>}
                <Button variant="ghost" size="icon" onClick={() => setEditing({ ...d })}>
                  <Pencil className="h-4 w-4" />
                </Button>
                <Button variant="ghost" size="icon" onClick={() => download(d)}>
                  <Download className="h-4 w-4" />
                </Button>
                <Button variant="ghost" size="icon" onClick={() => del(d)}>
                  <Trash2 className="h-4 w-4 text-destructive" />
                </Button>
              </div>
            ))
          )}
        </CardContent>
      </Card>

      <Dialog open={!!editing} onOpenChange={(o) => !o && setEditing(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Modifier le document</DialogTitle>
          </DialogHeader>
          {editing && (
            <div className="space-y-4">
              <div>
                <Label>Nom</Label>
                <Input
                  className="mt-1.5"
                  value={editing.name}
                  onChange={(e) => setEditing({ ...editing, name: e.target.value })}
                />
              </div>
              <div>
                <Label>Description</Label>
                <Input
                  className="mt-1.5"
                  value={editing.description ?? ""}
                  onChange={(e) => setEditing({ ...editing, description: e.target.value })}
                />
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <Label>Catégorie</Label>
                  <Select
                    value={editing.category ?? "none"}
                    onValueChange={(v) =>
                      setEditing({ ...editing, category: v === "none" ? null : v })
                    }
                  >
                    <SelectTrigger className="mt-1.5">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">Aucune</SelectItem>
                      {CATEGORIES.map((c) => (
                        <SelectItem key={c} value={c}>
                          {c}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Dossier</Label>
                  <Select
                    value={editing.folder_id ?? "root"}
                    onValueChange={(v) =>
                      setEditing({ ...editing, folder_id: v === "root" ? null : v })
                    }
                  >
                    <SelectTrigger className="mt-1.5">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="root">Racine</SelectItem>
                      {folders.map((f) => (
                        <SelectItem key={f.id} value={f.id}>
                          {f.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="flex justify-end gap-2">
                <Button variant="ghost" onClick={() => setEditing(null)}>
                  Annuler
                </Button>
                <Button onClick={() => saveMeta(editing)}>Enregistrer</Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
