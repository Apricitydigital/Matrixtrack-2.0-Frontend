"use client";

import React from "react";

interface DeleteConfirmationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title?: string;
  itemName?: string;
  itemType?: "User" | "City" | "Record" | string;
  isDeleting?: boolean;
}

export const DeleteConfirmationModal: React.FC<DeleteConfirmationModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  title,
  itemName,
  itemType = "Item",
  isDeleting = false,
}) => {
  if (!isOpen) return null;

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        backgroundColor: "rgba(15, 23, 42, 0.65)",
        backdropFilter: "blur(4px)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 9999,
        padding: "16px",
      }}
    >
      <div
        style={{
          backgroundColor: "#ffffff",
          borderRadius: "16px",
          width: "100%",
          maxWidth: "460px",
          padding: "24px",
          boxShadow: "0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)",
          border: "1px solid #f1f5f9",
          animation: "scaleUp 0.15s ease-out",
        }}
      >
        {/* Header Icon */}
        <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "16px" }}>
          <div
            style={{
              width: "44px",
              height: "44px",
              borderRadius: "12px",
              backgroundColor: "#fef2f2",
              border: "1px solid #fee2e2",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "#dc2626",
              fontSize: "20px",
              flexShrink: 0,
            }}
          >
            🗑️
          </div>
          <div>
            <h3 style={{ margin: 0, fontSize: "17px", fontWeight: 700, color: "#0f172a" }}>
              {title || `Delete ${itemType}?`}
            </h3>
            {itemName && (
              <p style={{ margin: "2px 0 0", fontSize: "13px", color: "#64748b", fontWeight: 500 }}>
                {itemName}
              </p>
            )}
          </div>
        </div>

        {/* 10-Day Retention Notice Card */}
        <div
          style={{
            backgroundColor: "#eff6ff",
            border: "1px solid #bfdbfe",
            borderRadius: "10px",
            padding: "12px 14px",
            marginBottom: "20px",
          }}
        >
          <div style={{ display: "flex", alignItems: "flex-start", gap: "8px" }}>
            <span style={{ fontSize: "16px", lineHeight: "1.2" }}>🛡️</span>
            <div>
              <p style={{ margin: 0, fontSize: "13px", fontWeight: 600, color: "#1e40af" }}>
                10-Day Safe Recovery Protection
              </p>
              <p style={{ margin: "4px 0 0", fontSize: "12px", color: "#3b82f6", lineHeight: "1.4" }}>
                This {itemType.toLowerCase()} will be moved to <strong>Trash</strong>. You can easily restore it anytime within <strong>10 days</strong>. After 10 days, it will be automatically and permanently removed.
              </p>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px" }}>
          <button
            type="button"
            onClick={onClose}
            disabled={isDeleting}
            style={{
              padding: "9px 16px",
              fontSize: "13px",
              fontWeight: 600,
              borderRadius: "8px",
              border: "1px solid #e2e8f0",
              backgroundColor: "#ffffff",
              color: "#475569",
              cursor: isDeleting ? "not-allowed" : "pointer",
            }}
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={isDeleting}
            style={{
              padding: "9px 18px",
              fontSize: "13px",
              fontWeight: 600,
              borderRadius: "8px",
              border: "none",
              backgroundColor: "#dc2626",
              color: "#ffffff",
              cursor: isDeleting ? "not-allowed" : "pointer",
              display: "flex",
              alignItems: "center",
              gap: "6px",
              boxShadow: "0 2px 4px rgba(220, 38, 38, 0.2)",
            }}
          >
            {isDeleting ? "Moving to Trash..." : "Move to Trash"}
          </button>
        </div>
      </div>
    </div>
  );
};
