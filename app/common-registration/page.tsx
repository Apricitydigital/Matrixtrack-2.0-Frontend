'use client';

import React, { useState } from "react";
import CommonRegistrationModal from "@components/CommonRegistrationModal";
import { UserPlus, Sparkles, ShieldCheck, Building2, CheckCircle2 } from "lucide-react";
import Link from "next/link";

export default function IntegratedRegistrationPage() {
  const [modalOpen, setModalOpen] = useState(true);

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "linear-gradient(135deg, #0f172a 0%, #1e293b 50%, #0f172a 100%)",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        padding: "32px 16px",
        fontFamily: "'Inter', sans-serif"
      }}
    >
      <div style={{ textAlign: "center", maxWidth: "600px", color: "#ffffff", marginBottom: "24px" }}>
        <div
          style={{
            width: 64,
            height: 64,
            borderRadius: "20px",
            background: "linear-gradient(135deg, #3b82f6 0%, #6366f1 100%)",
            display: "inline-grid",
            placeItems: "center",
            boxShadow: "0 8px 24px rgba(59, 130, 246, 0.4)",
            marginBottom: "16px"
          }}
        >
          <Sparkles size={32} />
        </div>
        <h1 style={{ fontSize: "32px", fontWeight: 800, margin: "0 0 8px", letterSpacing: "-0.02em" }}>
          Matrixtrack & Swachh Ranking Integration
        </h1>
        <p style={{ fontSize: "16px", color: "#94a3b8", margin: 0, lineHeight: 1.5 }}>
          Unified cross-platform employee registration and role assignment management.
        </p>
      </div>

      <div style={{ display: "flex", gap: "16px" }}>
        <button
          onClick={() => setModalOpen(true)}
          style={{
            padding: "14px 28px",
            background: "linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%)",
            color: "#ffffff",
            border: "none",
            borderRadius: "14px",
            fontSize: "15px",
            fontWeight: 700,
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            gap: "10px",
            boxShadow: "0 4px 14px rgba(37, 99, 235, 0.4)"
          }}
        >
          <UserPlus size={18} /> Open Registration Portal
        </button>
        <Link
          href="/employees"
          style={{
            padding: "14px 28px",
            background: "rgba(255, 255, 255, 0.1)",
            color: "#ffffff",
            borderRadius: "14px",
            fontSize: "15px",
            fontWeight: 700,
            textDecoration: "none",
            display: "flex",
            alignItems: "center",
            gap: "10px",
            border: "1px solid rgba(255,255,255,0.2)"
          }}
        >
          View Employees Dashboard
        </Link>
      </div>

      <CommonRegistrationModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        onSuccess={() => {
          console.log("Registration complete");
        }}
      />
    </div>
  );
}
