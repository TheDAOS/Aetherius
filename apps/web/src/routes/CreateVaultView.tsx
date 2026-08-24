import { ArrowRight, Database, GitFork, Loader2 } from "lucide-react";
import type React from "react";
import { useState } from "react";
import { Button } from "../components/common/Button";
import { Input } from "../components/common/Input";
import { vaultService } from "../services/vault";

interface CreateVaultViewProps {
  onVaultCreated: () => void;
}

export const CreateVaultView: React.FC<CreateVaultViewProps> = ({
  onVaultCreated,
}) => {
  const [repoName, setRepoName] = useState("");
  const [description, setDescription] = useState(
    "My Aetherius knowledge vault",
  );
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!repoName.trim()) return;

    setIsSubmitting(true);
    setError(null);

    try {
      await vaultService.createVault(repoName.trim(), description.trim());
      onVaultCreated();
    } catch (err: any) {
      setError(err.message || "Failed to create vault.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-cream-shell font-mono p-4">
      <div className="w-full max-w-md bg-white neo-box p-8 flex flex-col gap-6">
        <div className="flex flex-col gap-2 items-center text-center">
          <div className="w-12 h-12 neo-box bg-accent-acid flex items-center justify-center text-ink-primary mb-2">
            <Database size={24} />
          </div>
          <h1 className="font-display font-black text-2xl tracking-tight text-ink-primary uppercase">
            Initialize Vault
          </h1>
          <p className="text-xs text-ink-muted leading-relaxed">
            Aetherius stores your notes in a private GitHub repository. Give
            your new vault a name, and we'll set everything up for you.
          </p>
        </div>

        {error && (
          <div className="p-3 bg-accent-pink/10 border-2 border-accent-pink text-accent-pink font-bold text-xs">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="flex flex-col gap-5">
          <Input
            label="Repository Name"
            name="repoName"
            placeholder="e.g. aetherius-vault"
            value={repoName}
            onChange={(e) => setRepoName(e.target.value)}
            required
            pattern="[a-zA-Z0-9_\-\.]+"
            title="Alphanumeric, hyphens, underscores, and periods only"
            disabled={isSubmitting}
          />

          <Input
            label="Description (Optional)"
            name="description"
            placeholder="My Aetherius knowledge vault"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            disabled={isSubmitting}
          />

          <div className="bg-paper-canvas p-4 border border-ink-primary/20 text-xs text-ink-secondary flex flex-col gap-2">
            <div className="flex items-center gap-2 font-bold text-ink-primary">
              <GitFork size={14} className="text-accent-cobalt" />
              <span>What happens next?</span>
            </div>
            <ul className="list-disc list-inside space-y-1 ml-1">
              <li>A private repo will be created on your GitHub account.</li>
              <li>A standard vault folder structure will be generated.</li>
              <li>Starter templates and a welcome note will be added.</li>
            </ul>
          </div>

          <Button
            type="submit"
            variant="acid"
            size="lg"
            className="w-full justify-center"
            disabled={!repoName.trim() || isSubmitting}
            icon={
              isSubmitting ? (
                <Loader2 size={16} className="animate-spin" />
              ) : (
                <ArrowRight size={16} />
              )
            }
          >
            {isSubmitting ? "Creating Vault..." : "Create Vault"}
          </Button>
        </form>
      </div>
    </div>
  );
};
