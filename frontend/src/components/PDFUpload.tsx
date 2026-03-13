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
        className="flex items-center gap-2 px-4 py-2 bg-gray-700 hover:bg-gray-600 text-gray-200 rounded-lg text-sm transition-colors disabled:opacity-50 cursor-pointer"
      >
        {uploading ? (
          "Uploading..."
        ) : (
          <>
            <span>📎</span> Upload PDF
          </>
        )}
      </button>
      {uploaded && (
        <p className="text-xs text-gray-400 mt-2">
          {uploaded.name} — {uploaded.chunks} chunks indexed
        </p>
      )}
    </div>
  );
}
