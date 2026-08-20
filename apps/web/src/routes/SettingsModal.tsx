import React from 'react';
import { GitFork, HardDrive, Download, RefreshCw } from 'lucide-react';
import { Modal } from '../components/common/Modal';
import { Button } from '../components/common/Button';
import { Vault, SyncStatus } from '../types/vault';
import { usePWA } from '../hooks/usePWA';
import { vaultService } from '../services/vault';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  vault: Vault | null;
  syncStatus: SyncStatus | null;
  onResetVault: () => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  onClose,
  vault,
  syncStatus,
  onResetVault
}) => {
  const { isInstallable, installApp, isOnline } = usePWA();

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
              <span className="font-bold text-ink-primary">{vault?.owner}/{vault?.repository}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-ink-muted">Active Branch:</span>
              <span className="font-bold text-accent-cobalt">{vault?.branch}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-ink-muted">Vault UUID:</span>
              <span className="text-[11px] text-ink-muted truncate max-w-[240px]">{vault?.id}</span>
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
                <span className={`w-2 h-2 rounded-full ${isOnline ? 'bg-accent-mint' : 'bg-accent-pink'}`} />
                {isOnline ? 'ONLINE' : 'OFFLINE'}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-ink-muted">Last Sync:</span>
              <span className="text-[11px] text-ink-secondary">
                {syncStatus?.lastSyncAt ? new Date(syncStatus.lastSyncAt).toLocaleTimeString() : 'Never'}
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

        {/* Danger Zone: Reset Mock Data */}
        <section className="flex flex-col gap-2.5">
          <div className="flex items-center justify-between">
            <span className="font-display font-bold text-xs uppercase tracking-wider text-accent-pink">
              Reset Demo Vault
            </span>
            <Button
              variant="danger"
              size="sm"
              icon={<RefreshCw size={13} />}
              onClick={() => {
                if (window.confirm('Reset local mock vault back to starter notes?')) {
                  vaultService.resetToDefaults();
                  onResetVault();
                  onClose();
                }
              }}
            >
              Reset to Defaults
            </Button>
          </div>
        </section>
      </div>
    </Modal>
  );
};
