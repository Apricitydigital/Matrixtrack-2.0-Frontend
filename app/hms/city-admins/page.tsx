'use client';

import { useState } from "react";
import { KeyRound, Send, CheckCircle2 } from "lucide-react";
import { apiFetch } from "@lib/apiClient";
import { Card } from "@components/ui/Card";
import { Button } from "@components/ui/Button";
import { FormField } from "@components/ui/FormField";

export default function CityAdminCredentialPage() {
  const [cityId, setCityId] = useState("");
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState("");
  const [creating, setCreating] = useState(false);

  const inputClass = "h-11 w-full rounded-lg border border-slate-200 bg-slate-50 px-3.5 text-sm text-slate-700 transition-all duration-200 focus:border-primary/40 focus:bg-white focus:outline-none focus:ring-4 focus:ring-primary/10";

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreating(true);
    setStatus("Saving...");
    try {
      await apiFetch(`/hms/cities/${cityId}/admins`, {
        method: "POST",
        body: JSON.stringify({ email })
      });
      setStatus("Credential created and emailed.");
      setCityId(""); setEmail("");
    } catch {
      setStatus("Failed to create credential.");
    } finally {
      setCreating(false);
    }
  };

  const isSuccess = status.toLowerCase().includes("created");
  const isError = status.toLowerCase().includes("failed");

  return (
    <div className="mx-auto max-w-lg">
      <Card title="Create City Admin Credentials" subtitle="Provision login access for a city administrator">
        <div className="mb-5 flex items-center gap-3 rounded-lg bg-primary-soft px-4 py-3 text-primary-strong">
          <KeyRound size={18} />
          <span className="text-xs font-semibold">A secure invite email will be sent to the provided address.</span>
        </div>

        <form onSubmit={handleCreate} className="flex flex-col gap-5">
          <FormField label="City ID" required hint="Internal identifier for the target city">
            <input className={inputClass} value={cityId} onChange={(e) => setCityId(e.target.value)} placeholder="e.g. 64f2a1..." required />
          </FormField>
          <FormField label="Admin Email" required>
            <input className={inputClass} type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="admin@city.local" required />
          </FormField>

          {status && (
            <div
              className={`flex items-center gap-2 rounded-lg px-3.5 py-2.5 text-sm font-semibold ${
                isSuccess ? "bg-success-bg text-success" : isError ? "bg-danger-bg text-danger" : "bg-primary-soft text-primary"
              }`}
            >
              {isSuccess && <CheckCircle2 size={16} />}
              {status}
            </div>
          )}

          <Button type="submit" loading={creating} icon={<Send size={15} />}>
            Create Credential
          </Button>
        </form>
      </Card>
    </div>
  );
}