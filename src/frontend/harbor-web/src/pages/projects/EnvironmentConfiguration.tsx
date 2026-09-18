import { useEffect, useState } from 'react';
import type { FormEvent } from 'react';
import { Link, useParams } from 'react-router-dom';
import {
  AlertCircle, CheckCircle2, Eye, EyeOff, Globe, Loader2, Lock, Plus, ShieldCheck, Trash2,
} from 'lucide-react';
import {
  getEnvironmentConfiguration, saveEnvironmentConfiguration, getEnvironments,
  type ConfigurationItem, type SecureValueInput, type DeploymentEnvironment,
} from '../../services/environmentService';
import EnvironmentTypeBadge from '../../components/ui/EnvironmentTypeBadge';

interface Row { id: string; key: string; value: string; }
interface SecretRow { id: string; key: string; value: string; isSet: boolean; revealed: boolean; }

const providerSuggestions = ['AWS', 'Azure', 'Google Cloud', 'DigitalOcean', 'Kubernetes', 'On-Premises'];

function newRow(): Row { return { id: crypto.randomUUID(), key: '', value: '' }; }
function newSecretRow(): SecretRow { return { id: crypto.randomUUID(), key: '', value: '', isSet: false, revealed: true }; }

export default function EnvironmentConfiguration() {
  const { id, environmentId } = useParams();
  const projectId = Number(id);
  const envId = Number(environmentId);

  const [environment, setEnvironment] = useState<DeploymentEnvironment>();
  const [deploymentUrl, setDeploymentUrl] = useState('');
  const [provider, setProvider] = useState('');
  const [configRows, setConfigRows] = useState<Row[]>([]);
  const [secretRows, setSecretRows] = useState<SecretRow[]>([]);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  useEffect(() => {
    if (!Number.isInteger(projectId) || !Number.isInteger(envId)) { setError('Invalid environment.'); setLoading(false); return; }
    Promise.all([getEnvironments(projectId), getEnvironmentConfiguration(projectId, envId)])
      .then(([environments, configuration]) => {
        const found = environments.find(e => e.id === envId);
        if (!found) throw new Error('Environment not found.');
        setEnvironment(found);
        setDeploymentUrl(configuration.deploymentUrl ?? '');
        setProvider(configuration.provider ?? '');
        setConfigRows(configuration.configuration.length
          ? configuration.configuration.map(item => ({ id: crypto.randomUUID(), key: item.key, value: item.value }))
          : [newRow()]);
        setSecretRows(configuration.secureValues.length
          ? configuration.secureValues.map(item => ({ id: crypto.randomUUID(), key: item.key, value: '', isSet: true, revealed: false }))
          : [newSecretRow()]);
      })
      .catch(err => setError(err instanceof Error ? err.message : 'Unable to load environment configuration.'))
      .finally(() => setLoading(false));
  }, [projectId, envId]);

  function updateConfigRow(id: string, patch: Partial<Row>) {
    setConfigRows(current => current.map(row => row.id === id ? { ...row, ...patch } : row));
  }
  function updateSecretRow(id: string, patch: Partial<SecretRow>) {
    setSecretRows(current => current.map(row => row.id === id ? { ...row, ...patch } : row));
  }

  function validate(nonEmptyConfig: Row[], nonEmptySecrets: SecretRow[]): string | null {
    if (!deploymentUrl.trim()) return 'Deployment URL is required.';
    try { const parsed = new URL(deploymentUrl.trim()); if (!['http:', 'https:'].includes(parsed.protocol)) throw new Error(); }
    catch { return 'Deployment URL must be a valid http(s) URL.'; }
    if (!provider.trim()) return 'Provider is required.';

    const allKeys = [...nonEmptyConfig.map(r => r.key), ...nonEmptySecrets.map(r => r.key)].map(k => k.trim().toLowerCase());
    if (new Set(allKeys).size !== allKeys.length) return 'Configuration and secure value keys must be unique.';
    for (const row of nonEmptyConfig) if (!row.value.trim()) return `Configuration '${row.key.trim()}' requires a value.`;
    for (const row of nonEmptySecrets) if (!row.isSet && !row.value.trim()) return `Secure value '${row.key.trim()}' requires a value.`;
    return null;
  }

  async function submit(event: FormEvent) {
    event.preventDefault(); setError(null); setNotice(null);

    const nonEmptyConfig = configRows.filter(row => row.key.trim());
    const nonEmptySecrets = secretRows.filter(row => row.key.trim());

    const validationError = validate(nonEmptyConfig, nonEmptySecrets);
    if (validationError) { setError(validationError); return; }

    setSaving(true);
    try {
      const configuration: ConfigurationItem[] = nonEmptyConfig.map(row => ({ key: row.key.trim(), value: row.value.trim() }));
      const secureValues: SecureValueInput[] = nonEmptySecrets.map(row => ({
        key: row.key.trim(),
        value: row.value.trim() ? row.value.trim() : undefined,
      }));

      const saved = await saveEnvironmentConfiguration(projectId, envId, {
        deploymentUrl: deploymentUrl.trim(), provider: provider.trim(), configuration, secureValues,
      });

      setConfigRows(saved.configuration.length
        ? saved.configuration.map(item => ({ id: crypto.randomUUID(), key: item.key, value: item.value }))
        : [newRow()]);
      setSecretRows(saved.secureValues.length
        ? saved.secureValues.map(item => ({ id: crypto.randomUUID(), key: item.key, value: '', isSet: true, revealed: false }))
        : [newSecretRow()]);
      setNotice('Configuration saved.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to save environment configuration.');
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return <div className="w-full h-full p-8 lg:px-24 xl:px-48 bg-white dark:bg-[#090909] text-gray-900 dark:text-white">
      <p className="text-gray-500">Loading configuration...</p>
    </div>;
  }

  if (!environment) {
    return <div className="w-full h-full p-8 lg:px-24 xl:px-48 bg-white dark:bg-[#090909] text-gray-900 dark:text-white">
      <div className="flex items-center gap-2 text-sm text-red-600 dark:text-red-400">
        <AlertCircle className="w-4 h-4" /><p>{error ?? 'Environment not found.'}</p>
      </div>
      <Link to={`/projects/${projectId}/environments`} className="text-[15px] text-blue-600 dark:text-[#3b82f6]">Back to environments</Link>
    </div>;
  }

  return (
    <div className="w-full h-full p-8 lg:px-24 xl:px-48 text-gray-900 dark:text-white overflow-y-auto bg-white dark:bg-[#090909] transition-colors duration-300">
      <Link to={`/projects/${projectId}/environments`} className="text-[13px] text-blue-600 dark:text-[#3b82f6]">← Environments</Link>

      <div className="flex items-center gap-3 mt-3">
        <h1 className="text-3xl font-semibold">{environment.name}</h1>
        <EnvironmentTypeBadge type={environment.type} />
      </div>
      <p className="text-gray-500 dark:text-gray-400 mt-2 max-w-xl">
        Set the deployment target, configuration values, and secrets Harbor will use when deploying to this environment.
      </p>

      {error && (
        <div className="flex items-center gap-2 text-sm text-red-600 dark:text-red-400 mt-5" data-testid="configuration-error">
          <AlertCircle className="w-4 h-4 flex-shrink-0" /><p>{error}</p>
        </div>
      )}
      {notice && (
        <div className="flex items-center gap-2 text-sm text-blue-600 dark:text-[#3b82f6] mt-5" data-testid="configuration-notice">
          <CheckCircle2 className="w-4 h-4 flex-shrink-0" /><p>{notice}</p>
        </div>
      )}

      <form onSubmit={submit} className="mt-7 max-w-2xl grid gap-8">
        <section className="border border-gray-300 dark:border-[#525252] p-5 grid gap-4">
          <div className="flex items-center gap-2 text-[15px] font-medium">
            <Globe className="w-4 h-4" /> Deployment information
          </div>
          <label className="grid gap-1 text-[15px]">Deployment URL
            <input
              type="url" required value={deploymentUrl} onChange={e => setDeploymentUrl(e.target.value)}
              placeholder="https://api.staging.example.com"
              className="h-10 font-roobert border border-gray-300 dark:border-[#525252] px-3 bg-transparent focus:outline-none focus:ring-1 focus:ring-[#2563eb] focus:border-[#2563eb]"
            />
          </label>
          <label className="grid gap-1 text-[15px]">Provider
            <input
              list="provider-suggestions" required value={provider} onChange={e => setProvider(e.target.value)}
              placeholder="e.g. AWS"
              className="h-10 border border-gray-300 dark:border-[#525252] px-3 bg-transparent focus:outline-none focus:ring-1 focus:ring-[#2563eb] focus:border-[#2563eb]"
            />
            <datalist id="provider-suggestions">
              {providerSuggestions.map(option => <option key={option} value={option} />)}
            </datalist>
          </label>
        </section>

        <section className="border border-gray-300 dark:border-[#525252] p-5 grid gap-4">
          <div className="flex items-center gap-2 text-[15px] font-medium">
            Configuration
          </div>
          <div className="grid gap-3">
            {configRows.map(row => (
              <div key={row.id} className="flex gap-2 items-center">
                <input
                  value={row.key} onChange={e => updateConfigRow(row.id, { key: e.target.value })}
                  placeholder="KEY" maxLength={100}
                  className="h-10 flex-1 min-w-0 font-roobert border border-gray-300 dark:border-[#525252] px-3 bg-transparent focus:outline-none focus:ring-1 focus:ring-[#2563eb] focus:border-[#2563eb]"
                />
                <input
                  value={row.value} onChange={e => updateConfigRow(row.id, { value: e.target.value })}
                  placeholder="value" maxLength={2000}
                  className="h-10 flex-[2] min-w-0 font-roobert border border-gray-300 dark:border-[#525252] px-3 bg-transparent focus:outline-none focus:ring-1 focus:ring-[#2563eb] focus:border-[#2563eb]"
                />
                <button
                  type="button" onClick={() => setConfigRows(current => current.filter(r => r.id !== row.id))}
                  aria-label="Remove configuration value" className="text-gray-400 hover:text-red-600 dark:hover:text-red-400 flex-shrink-0"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
          <button
            type="button" onClick={() => setConfigRows(current => [...current, newRow()])}
            className="flex items-center gap-1 text-[13px] text-blue-600 dark:text-[#3b82f6] font-medium w-fit"
          >
            <Plus className="w-3.5 h-3.5" /> Add configuration value
          </button>
        </section>

        <section className="border border-gray-300 dark:border-[#525252] p-5 grid gap-4">
          <div className="flex items-center gap-2 text-[15px] font-medium">
            <Lock className="w-4 h-4" /> Secure values
          </div>
          <p className="text-[13px] text-gray-500 dark:text-gray-400 -mt-2">
            Secure values are encrypted and never displayed again after saving. Leave a set value blank to keep it unchanged.
          </p>
          <div className="grid gap-3">
            {secretRows.map(row => (
              <div key={row.id} className="flex gap-2 items-center">
                <input
                  value={row.key} onChange={e => updateSecretRow(row.id, { key: e.target.value })}
                  placeholder="KEY" maxLength={100} disabled={row.isSet}
                  className="h-10 flex-1 min-w-0 font-roobert border border-gray-300 dark:border-[#525252] px-3 bg-transparent focus:outline-none focus:ring-1 focus:ring-[#2563eb] focus:border-[#2563eb] disabled:opacity-60"
                />
                <div className="flex-[2] min-w-0 relative">
                  <input
                    type={row.revealed ? 'text' : 'password'}
                    value={row.value} onChange={e => updateSecretRow(row.id, { value: e.target.value })}
                    placeholder={row.isSet ? 'Set · leave blank to keep' : 'value'} maxLength={2000}
                    className="h-10 w-full font-roobert border border-gray-300 dark:border-[#525252] pl-3 pr-9 bg-transparent focus:outline-none focus:ring-1 focus:ring-[#2563eb] focus:border-[#2563eb]"
                  />
                  <button
                    type="button" onClick={() => updateSecretRow(row.id, { revealed: !row.revealed })}
                    aria-label={row.revealed ? 'Hide value' : 'Show value'}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                  >
                    {row.revealed ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                {row.isSet && <ShieldCheck className="w-4 h-4 text-blue-600 dark:text-[#3b82f6] flex-shrink-0" aria-label="Value is set" />}
                <button
                  type="button" onClick={() => setSecretRows(current => current.filter(r => r.id !== row.id))}
                  aria-label="Remove secure value" className="text-gray-400 hover:text-red-600 dark:hover:text-red-400 flex-shrink-0"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
          <button
            type="button" onClick={() => setSecretRows(current => [...current, newSecretRow()])}
            className="flex items-center gap-1 text-[13px] text-blue-600 dark:text-[#3b82f6] font-medium w-fit"
          >
            <Plus className="w-3.5 h-3.5" /> Add secure value
          </button>
        </section>

        <button
          type="submit" disabled={saving}
          className="h-10 px-5 w-fit flex items-center gap-2 bg-black dark:bg-white text-white dark:text-black font-medium disabled:opacity-50"
        >
          {saving && <Loader2 className="w-4 h-4 animate-spin" />}
          {saving ? 'Saving…' : 'Save configuration'}
        </button>
      </form>
    </div>
  );
}