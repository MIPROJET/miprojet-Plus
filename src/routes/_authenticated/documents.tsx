import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { FolderPlus, Upload, Folder, FileText, Download, Trash2, Search, ChevronRight } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/documents")({
  head: () => ({ meta: [{ title: "Espace documentaire · MiProjet+" }] }),
  component: DocumentsPage,
});

type Folder = { id: string; name: string; parent_id: string | null; org_id: string | null };
type Doc = {
  id: string; name: string; description: string | null; storage_path: string;
  mime_type: string | null; size_bytes: number | null; category: string | null;
  folder_id: string | null; created_at: string; owner_id: string; org_id: string | null;
};

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

  async function load() {
    const { data: u } = await supabase.auth.getUser();
    if (!u.user) return;
    const { data: orgs } = await supabase.from("mp_organizations" as never).select("id").eq("owner_id", u.user.id).limit(1);
    const oid = ((orgs as Array<{id:string}> | null)?.[0]?.id) ?? null;
    setOrgId(oid);

    const foldersQ = supabase.from("mp_document_folders" as never).select("*").order("name");
    const docsQ = supabase.from("mp_documents" as never).select("*").order("created_at", { ascending: false });
    const [{ data: fs }, { data: ds }] = await Promise.all([foldersQ, docsQ]);
    setFolders((fs as Folder[] | null) ?? []);
    setDocs((ds as Doc[] | null) ?? []);
  }
  useEffect(() => { load(); }, []);

  const visibleFolders = folders.filter((f) => f.parent_id === currentFolder);
  const visibleDocs = useMemo(() => {
    let list = docs.filter((d) => d.folder_id === currentFolder);
    if (search.trim()) {
      const s = search.toLowerCase();
      list = list.filter((d) => d.name.toLowerCase().includes(s) || (d.description ?? "").toLowerCase().includes(s));
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
      name, parent_id: currentFolder, org_id: orgId, owner_id: u.user.id,
    } as never);
    if (error) toast.error(error.message); else { toast.success("Dossier créé"); await load(); }
  }

  async function uploadFile(file: File) {
    setUploading(true);
    const { data: u } = await supabase.auth.getUser();
    if (!u.user) { setUploading(false); return; }
    const key = `${u.user.id}/${crypto.randomUUID()}-${file.name}`;
    const { error: upErr } = await supabase.storage.from("documents").upload(key, file, { cacheControl: "3600", upsert: false });
    if (upErr) { toast.error(upErr.message); setUploading(false); return; }
    const { error } = await supabase.from("mp_documents" as never).insert({
      name: file.name, storage_path: key, mime_type: file.type,
      size_bytes: file.size, folder_id: currentFolder, org_id: orgId, owner_id: u.user.id,
    } as never);
    setUploading(false);
    if (error) toast.error(error.message);
    else { toast.success("Fichier ajouté"); await load(); }
  }

  async function download(doc: Doc) {
    const { data, error } = await supabase.storage.from("documents").createSignedUrl(doc.storage_path, 60);
    if (error || !data?.signedUrl) { toast.error("Impossible de générer le lien"); return; }
    window.open(data.signedUrl, "_blank");
  }

  async function del(doc: Doc) {
    if (!confirm(`Supprimer "${doc.name}" ?`)) return;
    await supabase.storage.from("documents").remove([doc.storage_path]);
    const { error } = await supabase.from("mp_documents" as never).delete().eq("id", doc.id);
    if (error) toast.error(error.message); else { toast.success("Supprimé"); await load(); }
  }

  return (
    <div className="mx-auto max-w-6xl space-y-6 p-4 sm:p-8">
      <div className="flex flex-wrap items-center gap-3">
        <FileText className="h-7 w-7 text-primary" />
        <div className="flex-1">
          <h1 className="text-2xl font-bold sm:text-3xl">Espace documentaire</h1>
          <p className="text-sm text-muted-foreground">Dossiers, fichiers et recherche — sécurisés par rôle.</p>
        </div>
        <Button variant="outline" onClick={createFolder}><FolderPlus className="mr-2 h-4 w-4" /> Dossier</Button>
        <label className="inline-flex cursor-pointer">
          <input type="file" className="hidden" onChange={(e) => e.target.files?.[0] && uploadFile(e.target.files[0])} disabled={uploading} />
          <span className="inline-flex h-9 items-center rounded-md bg-primary px-3 text-sm font-medium text-primary-foreground hover:bg-primary/90">
            <Upload className="mr-2 h-4 w-4" /> {uploading ? "…" : "Fichier"}
          </span>
        </label>
      </div>

      <div className="flex flex-wrap items-center gap-2 text-sm">
        <button className="text-primary hover:underline" onClick={() => setCurrentFolder(null)}>Racine</button>
        {breadcrumb.map((f) => (
          <span key={f.id} className="inline-flex items-center gap-2">
            <ChevronRight className="h-3 w-3 text-muted-foreground" />
            <button className="text-primary hover:underline" onClick={() => setCurrentFolder(f.id)}>{f.name}</button>
          </span>
        ))}
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input placeholder="Rechercher…" value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
      </div>

      {visibleFolders.length > 0 && (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {visibleFolders.map((f) => (
            <button key={f.id} onClick={() => setCurrentFolder(f.id)}
              className="flex items-center gap-2 rounded-lg border p-3 text-left hover:bg-muted">
              <Folder className="h-5 w-5 text-primary" />
              <span className="truncate text-sm font-medium">{f.name}</span>
            </button>
          ))}
        </div>
      )}

      <Card>
        <CardHeader><CardTitle className="text-base">Fichiers ({visibleDocs.length})</CardTitle></CardHeader>
        <CardContent className="divide-y">
          {visibleDocs.length === 0 ? (
            <div className="py-8 text-center text-sm text-muted-foreground">Aucun fichier</div>
          ) : visibleDocs.map((d) => (
            <div key={d.id} className="flex items-center gap-3 py-3">
              <FileText className="h-5 w-5 shrink-0 text-muted-foreground" />
              <div className="min-w-0 flex-1">
                <div className="truncate text-sm font-medium">{d.name}</div>
                <div className="text-xs text-muted-foreground">{humanSize(d.size_bytes)} · {new Date(d.created_at).toLocaleDateString()}</div>
              </div>
              {d.category && <Badge variant="outline">{d.category}</Badge>}
              <Button variant="ghost" size="icon" onClick={() => download(d)}><Download className="h-4 w-4" /></Button>
              <Button variant="ghost" size="icon" onClick={() => del(d)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
