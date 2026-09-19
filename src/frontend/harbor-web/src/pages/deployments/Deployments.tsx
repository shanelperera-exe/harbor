import { useEffect, useState } from 'react';
import { getDeploymentDetails, getDeploymentHistory, type Deployment, type DeploymentDetails } from '../../services/deploymentService';

const statuses = ['', 'Succeeded', 'Failed', 'Running'];

function formatDate(value: string) {
  return new Intl.DateTimeFormat(undefined, { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value));
}

function statusClass(status: string) {
  return status.toLowerCase() === 'failed' ? 'text-red-700 bg-red-100 dark:text-red-300 dark:bg-red-950' : status.toLowerCase() === 'succeeded' ? 'text-green-700 bg-green-100 dark:text-green-300 dark:bg-green-950' : 'text-amber-700 bg-amber-100 dark:text-amber-300 dark:bg-amber-950';
}

export default function Deployments() {
  const [history, setHistory] = useState<Deployment[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState('');
  const [selected, setSelected] = useState<DeploymentDetails | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setIsLoading(true);
    setError(null);
    getDeploymentHistory({ status: status || undefined, page })
      .then((result) => { setHistory(result.items); setTotalCount(result.totalCount); })
      .catch((err) => setError(err instanceof Error ? err.message : 'Unable to load deployment history.'))
      .finally(() => setIsLoading(false));
  }, [status, page]);

  async function selectDeployment(deployment: Deployment) {
    try {
      setError(null);
      setSelected(await getDeploymentDetails(deployment.id));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to load deployment details.');
    }
  }

  return <div className="w-full h-full p-8 lg:px-16 xl:px-24 text-gray-900 dark:text-white overflow-y-auto bg-white dark:bg-[oklch(0.21_0.03_263.45)]">
    <div className="flex flex-wrap justify-between items-center gap-4 mb-8">
      <div><h1 className="text-3xl font-semibold">Deployments</h1><p className="mt-1 text-gray-500 dark:text-gray-400">Review previous releases and their execution output.</p></div>
      <label className="text-sm">Status <select value={status} onChange={(e) => { setStatus(e.target.value); setPage(1); }} className="ml-2 border border-gray-300 dark:border-[#525252] bg-transparent p-2" aria-label="Filter deployment status">{statuses.map((value) => <option className="text-black" key={value} value={value}>{value || 'All statuses'}</option>)}</select></label>
    </div>
    {error && <p role="alert" className="mb-4 text-red-600">{error}</p>}
    {isLoading ? <p className="text-gray-500">Loading deployment history...</p> : history.length === 0 ? <p className="text-gray-500 dark:text-gray-400">No deployments match this filter.</p> : <div className="grid grid-cols-1 xl:grid-cols-[minmax(0,1fr)_minmax(360px,0.8fr)] gap-6">
      <section className="border border-gray-300 dark:border-[#525252]" aria-label="Deployment history"><div className="overflow-x-auto"><table className="min-w-full text-left"><thead className="bg-gray-50 dark:bg-[#151515] text-sm text-gray-500"><tr><th className="p-4">Status</th><th className="p-4">Environment</th><th className="p-4">Version / commit</th><th className="p-4">Timestamp</th><th className="p-4"><span className="sr-only">Details</span></th></tr></thead><tbody>{history.map((deployment) => <tr key={deployment.id} className="border-t border-gray-300 dark:border-[#525252]"><td className="p-4"><span className={`px-2 py-1 text-xs font-medium ${statusClass(deployment.status)}`}>{deployment.status}</span></td><td className="p-4">{deployment.environment}</td><td className="p-4"><div>{deployment.version}</div>{deployment.commitSha && <code className="text-xs text-gray-500">{deployment.commitSha.slice(0, 12)}</code>}</td><td className="p-4 whitespace-nowrap text-sm">{formatDate(deployment.startedAt)}</td><td className="p-4"><button onClick={() => selectDeployment(deployment)} className="text-blue-600 dark:text-[#3b82f6]">Details</button></td></tr>)}</tbody></table></div>
      <div className="p-4 flex justify-between items-center text-sm"><span>{totalCount} deployment{totalCount === 1 ? '' : 's'}</span><div className="space-x-2"><button disabled={page === 1} onClick={() => setPage(page - 1)} className="disabled:opacity-40">Previous</button><span>Page {page}</span><button disabled={history.length < 20} onClick={() => setPage(page + 1)} className="disabled:opacity-40">Next</button></div></div></section>
      <DeploymentPanel deployment={selected} />
    </div>}
  </div>;
}

function DeploymentPanel({ deployment }: { deployment: DeploymentDetails | null }) {
  if (!deployment) return <aside className="border border-dashed border-gray-300 dark:border-[#525252] p-6 text-gray-500">Select a deployment to view its logs and result.</aside>;
  return <aside className="border border-gray-300 dark:border-[#525252] p-6" aria-label="Deployment details"><div className="flex justify-between gap-3"><h2 className="text-xl font-medium">Deployment #{deployment.id}</h2><span className={`px-2 py-1 h-fit text-xs font-medium ${statusClass(deployment.status)}`}>{deployment.status}</span></div><dl className="grid grid-cols-2 gap-3 my-5 text-sm"><div><dt className="text-gray-500">Environment</dt><dd>{deployment.environment}</dd></div><div><dt className="text-gray-500">Version</dt><dd>{deployment.version}</dd></div><div><dt className="text-gray-500">Commit</dt><dd className="break-all">{deployment.commitSha || '—'}</dd></div><div><dt className="text-gray-500">Started</dt><dd>{formatDate(deployment.startedAt)}</dd></div></dl>{deployment.status.toLowerCase() === 'failed' && <div className="mb-5 border-l-4 border-red-500 bg-red-50 dark:bg-red-950 p-3 text-sm"><strong>Deployment failed</strong><p>{deployment.failureReason || 'No additional failure information was recorded.'}</p></div>}<h3 className="font-medium mb-2">Execution logs</h3>{deployment.logs.length === 0 ? <p className="text-sm text-gray-500">No logs were recorded.</p> : <ol className="bg-[#151515] text-gray-100 p-3 text-xs font-mono space-y-2 max-h-96 overflow-y-auto">{deployment.logs.map((log, index) => <li key={`${log.timestamp}-${index}`}><span className="text-gray-400">{formatDate(log.timestamp)} [{log.level}] </span>{log.message}</li>)}</ol>}</aside>;
}
