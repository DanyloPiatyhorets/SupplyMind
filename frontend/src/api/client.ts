const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5001";

export async function runAgent(goal: string, docIds: string[] = []) {
  const res = await fetch(`${API_URL}/api/run`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ goal, doc_ids: docIds }),
  });
  return res.json() as Promise<{ job_id: string; status: string }>;
}

export function traceStream(jobId: string): EventSource {
  return new EventSource(`${API_URL}/api/trace/${jobId}`);
}

export async function getReport(jobId: string, maxRetries = 30): Promise<Record<string, unknown>> {
  for (let i = 0; i < maxRetries; i++) {
    const res = await fetch(`${API_URL}/api/report/${jobId}`);
    if (res.status === 200) {
      return res.json();
    }
    // 202 = not ready yet, retry after delay
    await new Promise((r) => setTimeout(r, 2000));
  }
  throw new Error("Report not ready after polling");
}

export async function uploadDoc(file: File) {
  const formData = new FormData();
  formData.append("file", file);
  const res = await fetch(`${API_URL}/api/upload-doc`, {
    method: "POST",
    body: formData,
  });
  return res.json() as Promise<{ doc_id: string; chunks: number }>;
}

export async function approve(jobId: string, flavourId: string) {
  const res = await fetch(`${API_URL}/api/approve`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ job_id: jobId, flavour_id: flavourId }),
  });
  return res.json() as Promise<{ approved: boolean; flavour_id: string }>;
}

export async function getContracts() {
  const res = await fetch(`${API_URL}/api/contracts`);
  return res.json();
}

export async function getProducts() {
  const res = await fetch(`${API_URL}/api/products`);
  return res.json();
}
