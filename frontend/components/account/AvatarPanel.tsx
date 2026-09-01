"use client";

import { useRef, useState } from "react";
import { api, type AuthUser } from "@/lib/api";
import { useFeedback } from "@/components/feedback";
import { Spinner } from "@/components/ui";
import { AvatarCropper } from "@/components/AvatarCropper";
import { Avatar, Panel } from "@/components/account/shared";
import { useT } from "@/lib/i18n";

/** Profile picture: pick a file, crop it, save or remove. */
export function AvatarPanel({
  user,
  onChanged,
}: {
  user: AuthUser;
  onChanged: () => Promise<void>;
}) {
  const { t } = useT();
  const { toast } = useFeedback();

  const fileInputRef = useRef<HTMLInputElement>(null);
  // Held between choosing a file and finishing the crop.
  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);

  function onFileSelected(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = ""; // allow re-selecting the same file later
    if (file) setPendingFile(file);
  }

  async function save(dataUrl: string) {
    setBusy(true);
    try {
      await api.updateAvatar(dataUrl);
      await onChanged();
      toast(t("account.avatarChanged"), "success");
    } catch (e) {
      toast(e instanceof Error ? e.message : String(e), "error");
    } finally {
      setBusy(false);
      setPendingFile(null);
    }
  }

  async function remove() {
    setBusy(true);
    try {
      await api.updateAvatar(null);
      await onChanged();
      toast(t("account.avatarRemoved"), "success");
    } catch (e) {
      toast(e instanceof Error ? e.message : String(e), "error");
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <Panel title={t("account.avatar")}>
        <div className="row" style={{ alignItems: "center", gap: 16 }}>
          <Avatar email={user.email} src={user.avatar} />
          <div className="row" style={{ gap: 8 }}>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={onFileSelected}
              style={{ display: "none" }}
            />
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={busy}
            >
              {busy ? <Spinner /> : t("account.avatarUpload")}
            </button>
            {user.avatar && (
              <button
                type="button"
                onClick={remove}
                disabled={busy}
                style={{
                  background: "transparent",
                  color: "var(--text)",
                  border: "1px solid var(--border)",
                }}
              >
                {t("account.avatarRemove")}
              </button>
            )}
          </div>
        </div>
      </Panel>

      {pendingFile && (
        <AvatarCropper
          file={pendingFile}
          onCancel={() => setPendingFile(null)}
          onSave={save}
        />
      )}
    </>
  );
}
