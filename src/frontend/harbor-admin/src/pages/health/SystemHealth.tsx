import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { 
  Activity, 
  RefreshCw, 
  CheckCircle2, 
  AlertTriangle, 
  XCircle, 
  Cpu, 
  Server, 
  Zap,
  LineChart
} from 'lucide-react';
import { 
  getSystemHealthTelemetry, 
  pingService, 
  type ClusterTelemetry, 
  type ServiceHealthItem 
} from '../../services/healthService';

export default function SystemHealth() {
  const [telemetry, setTelemetry] = useState<ClusterTelemetry | null>(null);
  const [loading, setLoading] = useState(true);
  const [probingServiceId, setProbingServiceId] = useState<string | null>(null);

  const fetchTelemetry = async () => {
    setLoading(true);
    try {
      const data = await getSystemHealthTelemetry();
      setTelemetry(data);
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTelemetry();
    const interval = setInterval(fetchTelemetry, 30000); // 30s auto-refresh
    return () => clearInterval(interval);
  }, []);

  const handleProbeService = async (item: ServiceHealthItem) => {
    setProbingServiceId(item.id);
    try {
      const probed = await pingService(item);
      setTelemetry(prev => {
        if (!prev) return prev;
        const newItems = prev.items.map(i => i.id === item.id ? probed : i);
        const healthyCount = newItems.filter(i => i.status === 'healthy').length;
        return {
          ...prev,
          items: newItems,
          healthyCount,
          lastSync: new Date().toISOString()
        };
      });
    } finally {
      setProbingServiceId(null);
    }
  };

  const getStatusBadge = (status: ServiceHealthItem['status']) => {
    switch (status) {
      case 'healthy':
        return (
          <span className="inline-flex items-center space-x-1 px-1.5 py-0.5 rounded-sm bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 font-mono text-[10px]">
            <CheckCircle2 className="w-3 h-3 text-emerald-600 dark:text-emerald-400" />
            <span>OPERATIONAL</span>
          </span>
        );
      case 'degraded':
        return (
          <span className="inline-flex items-center space-x-1 px-1.5 py-0.5 rounded-sm bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800 font-mono text-[10px]">
            <AlertTriangle className="w-3 h-3 text-amber-600 dark:text-amber-400" />
            <span>DEGRADED</span>
          </span>
        );
      case 'unhealthy':
        return (
          <span className="inline-flex items-center space-x-1 px-1.5 py-0.5 rounded-sm bg-red-50 dark:bg-red-950/40 text-red-700 dark:text-red-300 border border-red-200 dark:border-red-800 font-mono text-[10px]">
            <XCircle className="w-3 h-3 text-red-600 dark:text-red-400" />
            <span>OFFLINE</span>
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center space-x-1 px-1.5 py-0.5 rounded-sm bg-gray-100 dark:bg-[#3c4043] text-gray-600 dark:text-gray-300 font-mono text-[10px]">
            <span>CHECKING</span>
          </span>
        );
    }
  };

  return (
    <div className="w-full min-h-full bg-white dark:bg-[#202124] text-gray-900 dark:text-white px-4 py-6 sm:px-8 sm:py-8 transition-colors duration-200">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between pb-6 border-b border-gray-300 dark:border-[#3c4043] gap-4">
        <div>
          <div className="flex items-center space-x-2.5">
            <h1 className="text-xl sm:text-2xl font-medium tracking-tight text-gray-900 dark:text-white">
              System Health & Telemetry
            </h1>
            <span className="text-xs font-mono px-2 py-0.5 rounded-sm bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300">
              Live Pulse
            </span>
          </div>
          <p className="text-sm text-gray-600 dark:text-[#9aa0a6] mt-1 font-normal">
            Cluster heartbeat matrix, real-time microservice round-trip latencies, and container connectivity.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Link
            id="health-open-observability"
            to="/observability"
            className="inline-flex items-center space-x-2 text-xs font-medium px-3 py-2 border border-gray-300 dark:border-[#3c4043] rounded-sm hover:bg-gray-100 dark:hover:bg-[#2c2d30] transition-colors focus:outline-none"
          >
            <LineChart className="w-3.5 h-3.5" />
            <span>Metrics Dashboards</span>
          </Link>
          <button
            type="button"
            onClick={fetchTelemetry}
            disabled={loading}
            className="inline-flex items-center space-x-2 text-xs font-medium px-3 py-2 border border-gray-300 dark:border-[#3c4043] rounded-sm hover:bg-gray-100 dark:hover:bg-[#2c2d30] transition-colors focus:outline-none disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            <span>Probe All Services</span>
          </button>
        </div>
      </div>

      {/* Cluster Overview Banner */}
      <div className="my-6 p-4 border border-gray-300 dark:border-[#3c4043] rounded-sm bg-white dark:bg-[#202124]">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center space-x-3">
            <div className={`w-3 h-3 rounded-full ${
              telemetry?.clusterStatus === 'operational' 
                ? 'bg-emerald-500' 
                : telemetry?.clusterStatus === 'degraded' 
                  ? 'bg-amber-500' 
                  : 'bg-red-500'
            }`} />
            <div>
              <div className="text-sm font-medium text-gray-900 dark:text-white">
                {telemetry?.clusterStatus === 'operational' 
                  ? 'Harbor Microservices Cluster Operational' 
                  : 'Partial Service Degradation Detected'}
              </div>
              <div className="text-xs text-gray-500 dark:text-[#9aa0a6] font-mono mt-0.5">
                {telemetry?.healthyCount} of {telemetry?.totalServices} services operational &bull; Last synchronized {new Date().toLocaleTimeString()}
              </div>
            </div>
          </div>

          <div className="flex items-center space-x-6 text-xs font-mono">
            <div>
              <span className="text-gray-400 dark:text-[#9aa0a6]">Avg Latency:</span>{' '}
              <span className="font-medium text-gray-900 dark:text-white">{telemetry?.averageLatencyMs || 0}ms</span>
            </div>
            <div>
              <span className="text-gray-400 dark:text-[#9aa0a6]">Containers:</span>{' '}
              <span className="font-medium text-gray-900 dark:text-white">{telemetry?.activeContainers || 0}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Service Metrics Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-6">
        <div className="p-3 border border-gray-300 dark:border-[#3c4043] rounded-sm bg-white dark:bg-[#202124]">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-mono text-gray-500 dark:text-[#9aa0a6] uppercase tracking-wider">Gateway Ingress</span>
            <Server className="w-3.5 h-3.5 text-gray-400" />
          </div>
          <div className="text-base font-medium mt-1 text-gray-900 dark:text-white">YARP Reverse Proxy</div>
          <div className="text-xs text-gray-500 dark:text-[#9aa0a6] font-mono mt-0.5">Port 5000 &bull; 99.98% Uptime</div>
        </div>

        <div className="p-3 border border-gray-300 dark:border-[#3c4043] rounded-sm bg-white dark:bg-[#202124]">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-mono text-gray-500 dark:text-[#9aa0a6] uppercase tracking-wider">State & Storage</span>
            <Cpu className="w-3.5 h-3.5 text-gray-400" />
          </div>
          <div className="text-base font-medium mt-1 text-gray-900 dark:text-white">PostgreSQL & Redis</div>
          <div className="text-xs text-gray-500 dark:text-[#9aa0a6] font-mono mt-0.5">Ports 5433, 6379 &bull; Synced</div>
        </div>

        <div className="p-3 border border-gray-300 dark:border-[#3c4043] rounded-sm bg-white dark:bg-[#202124]">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-mono text-gray-500 dark:text-[#9aa0a6] uppercase tracking-wider">Message Bus</span>
            <Zap className="w-3.5 h-3.5 text-gray-400" />
          </div>
          <div className="text-base font-medium mt-1 text-gray-900 dark:text-white">Kafka Event Bus</div>
          <div className="text-xs text-gray-500 dark:text-[#9aa0a6] font-mono mt-0.5">Port 9092 &bull; Active Streams</div>
        </div>
      </div>

      {/* Services Table */}
      <div className="border border-gray-300 dark:border-[#3c4043] rounded-sm overflow-hidden bg-white dark:bg-[#202124]">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-gray-300 dark:border-[#3c4043] bg-gray-50/75 dark:bg-[#28292c] text-gray-600 dark:text-[#9aa0a6] font-mono uppercase tracking-wider text-[11px]">
                <th className="py-2.5 px-3">Microservice</th>
                <th className="py-2.5 px-3">Role & Scope</th>
                <th className="py-2.5 px-3">Port</th>
                <th className="py-2.5 px-3">Status</th>
                <th className="py-2.5 px-3">Round-Trip Latency</th>
                <th className="py-2.5 px-3">Uptime</th>
                <th className="py-2.5 px-3">Build</th>
                <th className="py-2.5 px-3 text-right">Heartbeat Probe</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-[#3c4043]">
              {telemetry?.items.map(item => {
                const isProbing = probingServiceId === item.id;

                return (
                  <tr 
                    key={item.id} 
                    className="hover:bg-gray-50/80 dark:hover:bg-[#27282b] transition-colors"
                  >
                    <td className="py-2.5 px-3 font-mono font-medium text-gray-900 dark:text-white">
                      <div className="flex items-center space-x-2">
                        <Activity className="w-3.5 h-3.5 text-blue-500 shrink-0" />
                        <span>{item.name}</span>
                      </div>
                    </td>

                    <td className="py-2.5 px-3 text-gray-600 dark:text-[#bdc1c6] max-w-xs truncate">
                      {item.description}
                    </td>

                    <td className="py-2.5 px-3 font-mono text-gray-500 dark:text-[#9aa0a6]">
                      :{item.port}
                    </td>

                    <td className="py-2.5 px-3">
                      {getStatusBadge(item.status)}
                    </td>

                    <td className="py-2.5 px-3 font-mono">
                      <span className={`px-1.5 py-0.5 rounded-sm ${
                        item.latencyMs < 50 
                          ? 'text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/30' 
                          : item.latencyMs < 200 
                            ? 'text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/30' 
                            : 'text-red-700 dark:text-red-400 bg-red-50 dark:bg-red-950/30'
                      }`}>
                        {item.latencyMs} ms
                      </span>
                    </td>

                    <td className="py-2.5 px-3 font-mono text-gray-700 dark:text-[#bdc1c6]">
                      {item.uptime}
                    </td>

                    <td className="py-2.5 px-3 font-mono text-gray-500 dark:text-[#9aa0a6]">
                      {item.version}
                    </td>

                    <td className="py-2.5 px-3 text-right">
                      <button
                        type="button"
                        onClick={() => handleProbeService(item)}
                        disabled={isProbing}
                        className="px-2 py-1 border border-gray-300 dark:border-[#3c4043] rounded-sm text-[11px] font-normal hover:bg-gray-100 dark:hover:bg-[#2c2d30] transition-colors disabled:opacity-50 inline-flex items-center space-x-1"
                      >
                        <RefreshCw className={`w-3 h-3 ${isProbing ? 'animate-spin' : ''}`} />
                        <span>Ping</span>
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
