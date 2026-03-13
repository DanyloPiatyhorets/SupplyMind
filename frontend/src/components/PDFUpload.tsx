import { useRef, useState } from "react";
import { uploadDoc } from "../api/client";

interface Props {
  onUploaded: (docId: string) => void;
}

export default function PDFUpload({ onUploaded }: Props) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [uploaded, setUploaded] = useState<{ name: string; chunks: number } | null>(null);

  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    try {
      const result = await uploadDoc(file);
      setUploaded({ name: file.name, chunks: result.chunks });
      onUploaded(result.doc_id);
    } catch {
      console.error("Upload failed");
    } finally {
      setUploading(false);
    }
  }

  return (
    <div>
      <input
        ref={fileRef}
        type="file"
        accept=".pdf"
        onChange={handleUpload}
        className="hidden"
      />
      <button
        onClick={() => fileRef.current?.click()}
        disabled={uploading}
        className="ghost-button cursor-pointer px-4 py-3 text-sm font-medium disabled:opacity-50"
      >
        {uploading ? (
          "Uploading..."
        ) : (
          <>
            <span className="rounded-full bg-fuchsia-300/15 px-2 py-1 text-xs text-fuchsia-100">PDF</span>
            Upload briefing document
          </>
        )}
      </button>
      {uploaded && (
        <div className="mt-3 rounded-2xl border border-emerald-300/12 bg-emerald-300/6 px-3 py-2 text-xs text-emerald-100">
          {uploaded.name} indexed into {uploaded.chunks} retrievable chunks
        </div>
      )}
    </div>
  );
}
