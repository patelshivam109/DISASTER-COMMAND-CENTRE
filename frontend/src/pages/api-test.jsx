import { useEffect, useState } from "react";
import { API_BASE_URL } from "../api/config";

export default function ApiTest() {
  const [data, setData] = useState(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;

    async function fetchTest() {
      try {
        const response = await fetch(`${API_BASE_URL}/test`);
        const payload = await response.json();

        if (!response.ok) {
          throw new Error(payload.error || "API request failed");
        }

        if (isMounted) {
          setData(payload);
        }
      } catch (requestError) {
        if (isMounted) {
          setError(requestError.message || "Could not connect to API");
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    }

    fetchTest();

    return () => {
      isMounted = false;
    };
  }, []);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 px-4 py-10">
      <div className="mx-auto max-w-3xl rounded-2xl border border-slate-800 bg-slate-900 p-6 shadow-xl">
        <h1 className="text-2xl font-semibold">API Connection Test</h1>
        <p className="mt-2 text-sm text-slate-400">Frontend calling Render backend through Vercel env config.</p>

        {loading && <p className="mt-6 text-sm text-amber-300">Checking API connection...</p>}

        {error && (
          <div className="mt-6 rounded-lg border border-red-900 bg-red-950/40 p-4 text-sm text-red-300">
            {error}
          </div>
        )}

        {data && (
          <pre className="mt-6 overflow-x-auto rounded-lg border border-emerald-900 bg-emerald-950/30 p-4 text-sm text-emerald-200">
            {JSON.stringify(data, null, 2)}
          </pre>
        )}
      </div>
    </div>
  );
}
