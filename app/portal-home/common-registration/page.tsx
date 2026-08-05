'use client';

import React, { useState } from "react";
import CommonRegistrationModal from "@components/CommonRegistrationModal";
import { UserPlus, Sparkles, ShieldCheck, Building2, CheckCircle2 } from "lucide-react";
import Link from "next/link";

export default function IntegratedRegistrationPage() {
  return (
    <div className="min-w-0 space-y-5 pb-10">
      <CommonRegistrationModal
        isOpen={true}
        onClose={() => {}}
        onSuccess={() => {
          console.log("Registration complete");
        }}
        asPage={true}
      />
    </div>
  );
}
