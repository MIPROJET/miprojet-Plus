/**
 * Compression vidéo côté navigateur — cible FHD (1920x1080 max), bitrate ~2.5 Mbps.
 * Utilise MediaRecorder + canvas. Compatible Chrome/Edge/Firefox récents.
 * Fallback : si compression impossible ou inutile, retourne le fichier original.
 */

const TARGET_MAX_WIDTH = 1920;
const TARGET_MAX_HEIGHT = 1080;
const TARGET_VIDEO_BITRATE = 2_500_000; // 2.5 Mbps — FHD nette
const TARGET_AUDIO_BITRATE = 128_000;

export type CompressProgress = (info: {
  phase: "preparing" | "encoding" | "finalizing";
  ratio: number; // 0..1
}) => void;

function pickMimeType(): string | null {
  const candidates = [
    "video/webm;codecs=vp9,opus",
    "video/webm;codecs=vp8,opus",
    "video/webm",
    "video/mp4",
  ];
  for (const m of candidates) {
    if (typeof MediaRecorder !== "undefined" && MediaRecorder.isTypeSupported(m)) return m;
  }
  return null;
}

export async function compressVideoToFHD(
  file: File,
  onProgress?: CompressProgress,
): Promise<File> {
  // Si déjà petit (<25 Mo) et raisonnable, ne touche pas.
  if (file.size < 25 * 1024 * 1024) return file;

  const mime = pickMimeType();
  if (!mime) return file; // navigateur sans MediaRecorder utile

  onProgress?.({ phase: "preparing", ratio: 0 });

  const url = URL.createObjectURL(file);
  const video = document.createElement("video");
  video.src = url;
  video.muted = true;
  video.playsInline = true;
  video.preload = "auto";

  try {
    await new Promise<void>((res, rej) => {
      video.onloadedmetadata = () => res();
      video.onerror = () => rej(new Error("Lecture vidéo impossible"));
    });

    const srcW = video.videoWidth;
    const srcH = video.videoHeight;
    if (!srcW || !srcH) return file;

    const scale = Math.min(1, TARGET_MAX_WIDTH / srcW, TARGET_MAX_HEIGHT / srcH);
    const dstW = Math.floor((srcW * scale) / 2) * 2;
    const dstH = Math.floor((srcH * scale) / 2) * 2;

    const canvas = document.createElement("canvas");
    canvas.width = dstW;
    canvas.height = dstH;
    const ctx = canvas.getContext("2d", { alpha: false });
    if (!ctx) return file;

    const stream = (canvas as HTMLCanvasElement).captureStream(30);

    // Tente d'ajouter l'audio
    try {
      // @ts-expect-error captureStream non typé partout
      const v: MediaStream | undefined = (video as any).captureStream?.();
      v?.getAudioTracks().forEach((t) => stream.addTrack(t));
    } catch {
      /* ignore */
    }

    const recorder = new MediaRecorder(stream, {
      mimeType: mime,
      videoBitsPerSecond: TARGET_VIDEO_BITRATE,
      audioBitsPerSecond: TARGET_AUDIO_BITRATE,
    });

    const chunks: BlobPart[] = [];
    recorder.ondataavailable = (e) => {
      if (e.data && e.data.size) chunks.push(e.data);
    };

    const done = new Promise<void>((res) => {
      recorder.onstop = () => res();
    });

    recorder.start(500);
    await video.play();

    const duration = video.duration || 0;
    let raf = 0;
    const draw = () => {
      ctx.drawImage(video, 0, 0, dstW, dstH);
      if (duration > 0) {
        onProgress?.({
          phase: "encoding",
          ratio: Math.min(1, video.currentTime / duration),
        });
      }
      raf = requestAnimationFrame(draw);
    };
    draw();

    await new Promise<void>((res) => {
      video.onended = () => res();
      // sécurité timeout (5 min max)
      setTimeout(res, 5 * 60 * 1000);
    });

    cancelAnimationFrame(raf);
    onProgress?.({ phase: "finalizing", ratio: 1 });
    recorder.stop();
    await done;

    const blob = new Blob(chunks, { type: mime });
    if (blob.size >= file.size * 0.95) return file; // gain négligeable

    const ext = mime.includes("webm") ? "webm" : "mp4";
    const name = file.name.replace(/\.[^.]+$/, "") + "-fhd." + ext;
    return new File([blob], name, { type: mime });
  } catch {
    return file;
  } finally {
    URL.revokeObjectURL(url);
  }
}
