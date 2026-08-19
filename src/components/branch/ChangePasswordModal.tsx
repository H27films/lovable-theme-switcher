import React, { useState } from "react";
import { X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

interface ChangePasswordModalProps {
  open: boolean;
  onClose: () => void;
}

const getUserSession = () => {
  const session = localStorage.getItem("sb_user_session");
  if (session) {
    try {
      return JSON.parse(session);
    } catch {
      return null;
    }
  }
  return null;
};

export const ChangePasswordModal = ({ open, onClose }: ChangePasswordModalProps) => {
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(false);

    if (!newPassword || newPassword.length < 4) {
      setError("New password must be at least 4 characters");
      return;
    }

    if (newPassword !== confirmPassword) {
      setError("New passwords do not match");
      return;
    }

    setLoading(true);

    try {
      const session = getUserSession();
      if (!session || !session.name) {
        setError("No user session found");
        setLoading(false);
        return;
      }

      // Use Supabase RPC to change password
      const { data, error: rpcError } = await (supabase as any).rpc(
        "change_password_secure",
        {
          p_user_name: session.name,
          p_current_password: currentPassword,
          p_new_password: newPassword,
        }
      );

      if (rpcError) {
        setError(rpcError.message || "Failed to update password");
        setLoading(false);
        return;
      }

      if (!data.success) {
        setError(data.message || "Current password is incorrect");
        setLoading(false);
        return;
      }

      setSuccess(true);
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch (err: any) {
      setError("An error occurred: " + (err?.message || "Unknown error"));
    }

    setLoading(false);
  };

  if (!open) return null;

  return (
    <div
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        background: "rgba(0, 0, 0, 0.5)",
        backdropFilter: "blur(4px)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 2000,
        padding: "20px",
      }}
    >
      <div
        style={{
          background: "hsl(var(--background))",
          color: "hsl(var(--foreground))",
          borderRadius: "12px",
          width: "100%",
          maxWidth: "400px",
          maxHeight: "90vh",
          overflow: "auto",
          fontFamily: "'Raleway', sans-serif",
          boxShadow: "0 10px 30px rgba(0, 0, 0, 0.3)",
        }}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            padding: "16px 20px",
            borderBottom: "1px solid hsl(var(--border))",
          }}
        >
          <h3 style={{ margin: 0, fontSize: "18px", fontWeight: 500 }}>
            Change Password
          </h3>
          <button
            onClick={onClose}
            style={{
              background: "none",
              border: "none",
              cursor: "pointer",
              padding: 0,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "hsl(var(--foreground))",
            }}
          >
            <X size={20} />
          </button>
        </div>

        <div style={{ padding: "20px" }}>

          {error && (
            <div
              style={{
                color: "hsl(var(--destructive))",
                fontSize: "13px",
                marginBottom: "12px",
                padding: "8px",
                backgroundColor: "hsla(0, 100%, 50%, 0.1)",
                borderRadius: "6px",
              }}
            >
              {error}
            </div>
          )}

          {success && (
            <div
              style={{
                color: "hsl(var(--green))",
                fontSize: "13px",
                marginBottom: "12px",
                padding: "8px",
                backgroundColor: "hsla(150, 50%, 50%, 0.1)",
                borderRadius: "6px",
              }}
            >
              Password updated successfully!
            </div>
          )}

          <form onSubmit={handleSubmit}>
            <div style={{ marginBottom: "16px" }}>
              <label
                style={{
                  display: "block",
                  fontSize: "12px",
                  fontWeight: 600,
                  letterSpacing: "0.06em",
                  textTransform: "uppercase",
                  color: "hsl(var(--muted-foreground))",
                  marginBottom: "6px",
                }}
              >
                Current Password
              </label>
              <input
                type="password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                placeholder="Enter current password"
                style={{
                  width: "100%",
                  padding: "10px 12px",
                  fontSize: "15px",
                  border: "1px solid hsl(var(--border))",
                  borderRadius: "8px",
                  background: "hsl(var(--input))",
                  color: "hsl(var(--foreground))",
                  fontFamily: "inherit",
                  outline: "none",
                }}
              />
            </div>

            <div style={{ marginBottom: "16px" }}>
              <label
                style={{
                  display: "block",
                  fontSize: "12px",
                  fontWeight: 600,
                  letterSpacing: "0.06em",
                  textTransform: "uppercase",
                  color: "hsl(var(--muted-foreground))",
                  marginBottom: "6px",
                }}
              >
                New Password
              </label>
              <input
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Enter new password"
                style={{
                  width: "100%",
                  padding: "10px 12px",
                  fontSize: "15px",
                  border: "1px solid hsl(var(--border))",
                  borderRadius: "8px",
                  background: "hsl(var(--input))",
                  color: "hsl(var(--foreground))",
                  fontFamily: "inherit",
                  outline: "none",
                }}
              />
            </div>

            <div style={{ marginBottom: "20px" }}>
              <label
                style={{
                  display: "block",
                  fontSize: "12px",
                  fontWeight: 600,
                  letterSpacing: "0.06em",
                  textTransform: "uppercase",
                  color: "hsl(var(--muted-foreground))",
                  marginBottom: "6px",
                }}
              >
                Confirm New Password
              </label>
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Confirm new password"
                style={{
                  width: "100%",
                  padding: "10px 12px",
                  fontSize: "15px",
                  border: "1px solid hsl(var(--border))",
                  borderRadius: "8px",
                  background: "hsl(var(--input))",
                  color: "hsl(var(--foreground))",
                  fontFamily: "inherit",
                  outline: "none",
                }}
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              style={{
                width: "100%",
                padding: "12px",
                fontSize: "15px",
                fontWeight: 500,
                letterSpacing: "0.04em",
                color: "hsl(var(--background))",
                background: "hsl(var(--foreground))",
                border: "none",
                borderRadius: "8px",
                cursor: loading ? "not-allowed" : "pointer",
                opacity: loading ? 0.6 : 1,
                transition: "opacity 0.2s",
              }}
            >
              {loading ? "Changing..." : "Change Password"}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};
