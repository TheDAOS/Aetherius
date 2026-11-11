import { Download, GitFork, HardDrive, LogOut } from "lucide-react";
import type React from "react";
import { useState } from "react";
import { Button } from "../components/common/Button";
import { Modal } from "../components/common/Modal";
import { useAuth } from "../contexts/AuthContext";
import { usePWA } from "../hooks/usePWA";
import type { SyncStatus, Vault } from "../types/vault";

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  vault: Vault | null;
  syncStatus: SyncStatus | null;
  isDirty?: boolean;
  onResetVault?: () => void;
  onChangeBranch?: (branch: string) => Promise<void>;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  onClose,
  vault,
  syncStatus,
  isDirty = false,
  onChangeBranch,
}) => {
  const { isInstallable, installApp, isOnline } = usePWA();
  const { signOut } = useAuth();
  const [actionError, setActionError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Vault & PWA Settings"
      badgeText="CONFIG"
      maxWidth="max-w-xl"
    >
      <div className="flex flex-col gap-6 text-sm text-ink-primary">
        {/* GitHub Canonical Vault Info */}
        <section className="flex flex-col gap-2.5">
          <div className="flex items-center gap-2 font-display font-bold text-xs uppercase tracking-wider text-ink-secondary">
            <GitFork size={15} />
            <span>Canonical GitHub Repository</span>
          </div>
          <div className="neo-box p-3.5 bg-paper-canvas flex flex-col gap-2 font-mono text-xs">
            <div className="flex justify-between">
              <span className="text-ink-muted">Owner / Repo:</span>
              <span className="font-bold text-ink-primary">
                {vault?.owner}/{vault?.repository}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-ink-muted">Active Branch:</span>
              <span className="font-bold text-accent-cobalt">
                {vault?.branch}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-ink-muted">Vault UUID:</span>
              <span className="text-[11px] text-ink-muted truncate max-w-[240px]">
                {vault?.id}
              </span>
            </div>
          </div>
        </section>

        {/* PWA & Offline Cache Status */}
        <section className="flex flex-col gap-2.5">
          <div className="flex items-center gap-2 font-display font-bold text-xs uppercase tracking-wider text-ink-secondary">
            <HardDrive size={15} />
            <span>PWA & Local State</span>
          </div>
          <div className="neo-box p-3.5 bg-paper-canvas flex flex-col gap-3 font-mono text-xs">
            <div className="flex items-center justify-between">
              <span className="text-ink-muted">Network Status:</span>
              <span className="flex items-center gap-1.5 font-bold">
                <span
                  className={`w-2 h-2 rounded-full ${isOnline ? "bg-accent-mint" : "bg-accent-pink"}`}
                />
                {isOnline ? "ONLINE" : "OFFLINE"}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-ink-muted">Last Sync:</span>
              <span className="text-[11px] text-ink-secondary">
                {syncStatus?.lastSyncAt
                  ? new Date(syncStatus.lastSyncAt).toLocaleTimeString()
                  : "Never"}
              </span>
            </div>
            {isInstallable && (
              <div className="pt-2 border-t border-cream-border">
                <Button
                  variant="acid"
                  size="sm"
                  icon={<Download size={14} />}
                  onClick={installApp}
                  className="w-full"
                >
                  Install Aetherius App (PWA)
                </Button>
              </div>
            )}
          </div>
        </section>

        {onChangeBranch && (
          <form
            onSubmit={async (e) => {
              e.preventDefault();
              const branch = String(
                new FormData(e.currentTarget).get("branch") ?? "",
              ).trim();
              setBusy(true);
              setActionError(null);
              try {
                await onChangeBranch(branch);
              } catch (err) {
                setActionError((err as Error).message);
              } finally {
                setBusy(false);
              }
            }}
            className="flex gap-2"
          >
            <label className="flex-1">
              Vault branch
              <input
                name="branch"
                defaultValue={vault?.branch}
                required
                className="neo-box w-full p-2"
              />
            </label>
            <Button type="submit" disabled={busy}>
              Change Branch
            </Button>
          </form>
        )}
        {actionError && <p role="alert">{actionError}</p>}
        <p className="text-xs">
          Saved offline changes stay on this device for your account until
          synchronized. Signing out does not erase them.
        </p>

        {/* Account Management */}
        <section className="flex flex-col gap-2.5 pt-4 border-t border-cream-border">
          <div className="flex items-center justify-between">
            <span className="font-display font-bold text-xs uppercase tracking-wider text-ink-secondary">
              Account
            </span>
            <Button
              variant="secondary"
              size="sm"
              icon={<LogOut size={13} />}
              disabled={busy}
              onClick={async () => {
                if (
                  isDirty &&
                  !window.confirm(
                    "You have unsaved editor changes. Sign out and discard this editor draft? Saved offline changes will be kept.",
                  )
                )
                  return;
                setBusy(true);
                setActionError(null);
                try {
                  await signOut();
                  onClose();
                } catch (err) {
                  setActionError((err as Error).message);
                } finally {
                  setBusy(false);
                }
              }}
            >
              Sign Out
            </Button>
          </div>
        </section>
      </div>
    </Modal>
  );
};
