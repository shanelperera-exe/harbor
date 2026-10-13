import { useEffect, useState } from 'react';
import { Icon } from '../icons';
import { IoCopyOutline } from 'react-icons/io5';

interface LogConfigurationModalProps {
  isOpen: boolean;
  onClose: () => void;
  provider: string;
  serviceId: string;
}

export function LogConfigurationModal({
  isOpen,
  onClose,
  provider,
  serviceId
}: LogConfigurationModalProps) {
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
      setCopied(false);
    }
    return () => { document.body.style.overflow = ''; };
  }, [isOpen]);

  if (!isOpen) return null;

  const getBaseOrigin = () => {
    if (import.meta.env.VITE_PUBLIC_URL) {
      return import.meta.env.VITE_PUBLIC_URL.replace(/\/$/, '');
    }
    // On localhost, external webhooks (Vercel, AWS, Render, etc.) require public production domain
    if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
      return 'https://harborapp.tech';
    }
    return window.location.origin;
  };

  const getProviderConfig = () => {
    const p = (provider || '').toLowerCase();
    const origin = getBaseOrigin();
    const webhookUrl = `${origin}/api/Webhooks/${p || 'custom'}/${serviceId}`;
    
    switch (p) {
      case 'vercel':
        return {
          title: 'Vercel Log Drains',
          requiresPro: true,
          description: 'Live HTTP access logs for Vercel projects require a Vercel Pro subscription. You can configure Log Drains to forward logs to Harbor.',
          steps: [
            'Go to your Vercel Dashboard and select your project.',
            'Navigate to Settings > Log Drains.',
            'Create a new HTTPS drain and paste the webhook URL below.'
          ],
          link: 'https://vercel.com/docs/observability/log-drains',
          webhookUrl
        };
      case 'render':
        return {
          title: 'Render Log Streams',
          description: 'Render allows you to stream logs from your services to any HTTP endpoint.',
          steps: [
            'Go to your Render Dashboard and select your service.',
            'Navigate to Log Streams.',
            'Add a new Log Stream and paste the webhook URL below.'
          ],
          link: 'https://render.com/docs/log-streams',
          webhookUrl
        };
      case 'digitalocean':
        return {
          title: 'DigitalOcean Log Forwarding',
          description: 'DigitalOcean App Platform allows you to forward runtime logs to external providers.',
          steps: [
            'Go to DigitalOcean App Platform and select your app.',
            'Go to Settings > Log Forwarding.',
            'Add an HTTP endpoint and paste the webhook URL below.'
          ],
          link: 'https://docs.digitalocean.com/products/app-platform/how-to/forward-logs/',
          webhookUrl
        };
      case 'aws':
        return {
          title: 'AWS CloudWatch Log Subscriptions',
          description: 'AWS requires setting up a Subscription Filter to forward CloudWatch logs to an HTTP endpoint.',
          steps: [
            'Open the AWS CloudWatch Console.',
            'Navigate to Log Groups and select your service\'s log group.',
            'Create a Subscription Filter via AWS Lambda or Data Firehose pointing to the webhook URL below.'
          ],
          link: 'https://docs.aws.amazon.com/AmazonCloudWatch/latest/logs/SubscriptionFilters.html',
          webhookUrl
        };
      case 'gcp':
        return {
          title: 'GCP Cloud Logging Router',
          description: 'Use GCP Log Router sinks to forward Cloud Logging entries to an HTTP endpoint.',
          steps: [
            'Go to GCP Console > Logging > Log Router.',
            'Create a new sink.',
            'Choose Pub/Sub or an HTTP endpoint destination pointing to the webhook URL below.'
          ],
          link: 'https://cloud.google.com/logging/docs/routing/overview',
          webhookUrl
        };
      case 'azure':
        return {
          title: 'Azure Monitor Action Groups',
          description: 'Forward Azure logs using Monitor Action Groups or Event Hubs to an HTTP webhook.',
          steps: [
            'Go to Azure Portal > Monitor > Alerts > Action groups.',
            'Create an action group with an action type of "Webhook".',
            'Paste the webhook URL below as the URI.'
          ],
          link: 'https://learn.microsoft.com/en-us/azure/azure-monitor/alerts/action-groups',
          webhookUrl
        };
      case 'docker':
        return {
          title: 'Docker Logging Driver',
          description: 'Configure your Docker daemon or container to use a logging driver that forwards to an HTTP endpoint.',
          steps: [
            'Set up a log forwarder like Fluentd or Fluent Bit.',
            'Configure the Docker container to use the forwarder as its log driver.',
            'Point the forwarder\'s HTTP output to the webhook URL below.'
          ],
          link: 'https://docs.docker.com/config/containers/logging/configure/',
          webhookUrl
        };
      case 'kubernetes':
        return {
          title: 'Kubernetes Log Forwarding',
          description: 'Forward pod logs to Harbor using an agent deployed to your cluster.',
          steps: [
            'Deploy a logging agent (like Fluent Bit, Fluentd, or Promtail) as a DaemonSet.',
            'Configure the agent to tail container logs from /var/log/containers.',
            'Set the agent\'s HTTP output destination to the webhook URL below.'
          ],
          link: 'https://kubernetes.io/docs/concepts/cluster-administration/logging/',
          webhookUrl
        };
      default:
        return {
          title: 'Custom Log Forwarding',
          description: `Forward logs from your ${provider || 'custom'} service to Harbor using our generic HTTP webhook.`,
          steps: [
            'Identify the log forwarding capability of your service provider.',
            'Configure an HTTP POST destination.',
            'Use the webhook URL below to send newline-delimited JSON or raw text logs.'
          ],
          link: '#',
          webhookUrl
        };
    }
  };

  const config = getProviderConfig();

  const handleCopy = () => {
    navigator.clipboard.writeText(config.webhookUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 px-4 backdrop-blur-[2px]" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) { onClose(); } }}>
      <div className="inline-block w-full text-left align-middle transform page-primary bg-white dark:bg-[oklch(0.21_0.03_263.45)] border border-solid border-gray-300 dark:border-[#525252] max-w-2xl rounded-sm overflow-hidden">
        <div className="flex items-center justify-between border-b border-gray-300 dark:border-[#525252] p-5 bg-gray-50 dark:bg-[oklch(0.19_0.03_263.45)]">
          <div className="flex items-center gap-3">
            <h2 className="text-xl font-medium text-gray-900 dark:text-white flex items-center gap-2">
              {config.title}
              {config.requiresPro && (
                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-[#0070f3] text-white uppercase tracking-wider">
                  PRO FEATURE
                </span>
              )}
            </h2>
          </div>
          <button type="button" aria-label="Close modal" onClick={onClose} className="p-1 rounded-sm text-gray-500 hover:bg-gray-200 dark:hover:bg-white/10 dark:text-gray-400 dark:hover:text-white transition-colors">
            <Icon name="close" aria-hidden="true" />
          </button>
        </div>
        
        <div className="p-6 space-y-6">
          <div className="text-gray-600 dark:text-[#c7c7c7] leading-relaxed text-[15px]">
            {config.description}
          </div>

          <div className="space-y-3">
            <h3 className="text-sm font-semibold text-gray-900 dark:text-[#e5e5e5] uppercase tracking-wide">Webhook Endpoint</h3>
            <div className="flex items-stretch gap-2">
              <div className="flex-1 bg-gray-100 dark:bg-[oklch(0.18_0.03_263.45)] border border-gray-200 dark:border-[#525252] rounded-sm px-3 py-2.5 font-mono text-sm text-gray-800 dark:text-[#a3a3a3] truncate overflow-x-auto flex items-center">
                {config.webhookUrl}
              </div>
              <button 
                onClick={handleCopy}
                className="shrink-0 px-4 py-2 bg-black hover:bg-gray-800 dark:bg-white dark:hover:bg-gray-200 text-white dark:text-black font-medium text-sm rounded-sm transition-colors flex items-center gap-2"
              >
                <IoCopyOutline className="w-4 h-4" />
                {copied ? 'Copied!' : 'Copy URL'}
              </button>
            </div>
          </div>

          <div className="space-y-3">
            <h3 className="text-sm font-semibold text-gray-900 dark:text-[#e5e5e5] uppercase tracking-wide">Configuration Steps</h3>
            <ol className="list-decimal pl-5 space-y-2.5 text-[15px] text-gray-700 dark:text-[#d4d4d4]">
              {config.steps.map((step, idx) => (
                <li key={idx} className="pl-1 leading-relaxed">{step}</li>
              ))}
            </ol>
          </div>
        </div>
        
        <div className="flex items-center justify-between p-5 border-t border-gray-200 dark:border-[#525252] bg-gray-50 dark:bg-[oklch(0.19_0.03_263.45)]">
          {config.link !== '#' ? (
            <a 
              href={config.link} 
              target="_blank" 
              rel="noopener noreferrer" 
              className="text-sm text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1.5 font-medium transition-colors"
            >
              Read official documentation
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" /></svg>
            </a>
          ) : (
            <div></div>
          )}
          <button 
            type="button" 
            onClick={onClose} 
            className="px-5 py-2 text-sm font-medium border border-gray-300 dark:border-[#525252] bg-white dark:bg-transparent hover:bg-gray-50 dark:hover:bg-white/10 text-gray-700 dark:text-white rounded-sm transition-colors"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
}
