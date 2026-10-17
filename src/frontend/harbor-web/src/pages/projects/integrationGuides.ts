export interface DocLink {
  title: string;
  url: string;
  description: string;
}

export interface SetupStep {
  title: string;
  description: string;
  codeSnippet?: string;
}

export interface IntegrationGuide {
  providerId: string;
  name: string;
  category: string;
  summary: string;
  credentialType: string;
  credentialFormat: string;
  steps: SetupStep[];
  docs: DocLink[];
  securityNote?: string;
}

export const INTEGRATION_GUIDES: Record<string, IntegrationGuide> = {
  AWS: {
    providerId: "AWS",
    name: "Amazon Web Services",
    category: "Cloud Provider",
    summary: "Connect your AWS account to deploy containerized services to Amazon ECS (Fargate), run serverless workloads with AWS Lambda, pull from private ECR repositories, and stream logs to Amazon CloudWatch.",
    credentialType: "IAM Access Key ID & Secret Access Key",
    credentialFormat: "AKIA...:<SecretAccessKey> or Programmatic Access Token",
    steps: [
      {
        title: "Sign in to the AWS Management Console",
        description: "Navigate to console.aws.amazon.com and open the IAM (Identity and Access Management) dashboard.",
      },
      {
        title: "Create an IAM User for Harbor",
        description: "Go to \"Users\" > \"Create user\". Enter a recognizable username such as \"harbor-deployer\" and select Programmatic access.",
      },
      {
        title: "Attach Deployment Permissions",
        description: "Attach least-privilege policies according to your deployment targets. For container services, include AmazonECS_FullAccess and AmazonEC2ContainerRegistryPowerUser. For serverless functions, include AWSLambda_FullAccess.",
      },
      {
        title: "Generate Access Key Pair",
        description: "Open the user details, select the \"Security credentials\" tab, click \"Create access key\", and select \"Application running outside AWS\".",
      },
      {
        title: "Paste Credentials into Harbor",
        description: "Copy the Access Key ID and Secret Access Key. Enter them into Harbor in the format AccessKeyId:SecretAccessKey (or paste your session token). Harbor will encrypt them using AES-256.",
        codeSnippet: "AKIAIOSFODNN7EXAMPLE:wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY",
      },
    ],
    docs: [
      {
        title: "AWS IAM: Managing Access Keys",
        url: "https://docs.aws.amazon.com/IAM/latest/UserGuide/id_credentials_access-keys.html",
        description: "Official AWS guide on creating, rotating, and managing IAM programmatic access keys safely.",
      },
      {
        title: "Amazon ECS Developer Guide",
        url: "https://docs.aws.amazon.com/AmazonECS/latest/developerguide/Welcome.html",
        description: "Learn how Amazon Elastic Container Service runs containers on AWS Fargate and EC2.",
      },
      {
        title: "AWS Security Best Practices for Credentials",
        url: "https://docs.aws.amazon.com/general/latest/gr/aws-access-keys-best-practices.html",
        description: "AWS security recommendations for protecting long-term credentials and applying least privilege.",
      },
    ],
    securityNote: "Harbor recommends creating a dedicated IAM user with scoped permissions rather than using your root account credentials.",
  },

  GCP: {
    providerId: "GCP",
    name: "Google Cloud Platform",
    category: "Cloud Provider",
    summary: "Connect Google Cloud to build and deploy microservices on Google Cloud Run, orchestrate containers on Google Kubernetes Engine (GKE), and publish artifacts to Google Artifact Registry.",
    credentialType: "Service Account Key (JSON) or OAuth2 Token",
    credentialFormat: "One-line JSON key or Base64-encoded Service Account JSON",
    steps: [
      {
        title: "Navigate to IAM & Admin in GCP Console",
        description: "Open console.cloud.google.com, pick your target GCP Project, and navigate to \"IAM & Admin\" > \"Service Accounts\".",
      },
      {
        title: "Create a Service Account",
        description: "Click \"+ Create Service Account\", enter a service account name (e.g., \"harbor-deployer\"), and set an optional description.",
      },
      {
        title: "Grant Deployment Roles",
        description: "Assign the necessary roles: \"Cloud Run Admin\" (roles/run.admin), \"Service Account User\" (roles/iam.serviceAccountUser), and \"Artifact Registry Writer\" for pushing container images.",
      },
      {
        title: "Create and Download JSON Key",
        description: "Click on the created Service Account > \"Keys\" tab > \"Add Key\" > \"Create new key\", then select \"JSON\". The private key file will download to your machine.",
      },
      {
        title: "Paste Service Account Key into Harbor",
        description: "Open the downloaded JSON file, copy the full JSON text (or base64 encoded content), and paste it into Harbor's credential field.",
        codeSnippet: `{"type":"service_account","project_id":"my-project","private_key_id":"...","private_key":"-----BEGIN PRIVATE KEY..."}`,
      },
    ],
    docs: [
      {
        title: "GCP: Creating and Managing Service Account Keys",
        url: "https://cloud.google.com/iam/docs/creating-managing-service-account-keys",
        description: "Google Cloud official instructions on generating JSON keys for IAM service accounts.",
      },
      {
        title: "Google Cloud Run: Deployment Overview",
        url: "https://cloud.google.com/run/docs/deploying",
        description: "Comprehensive guide to containerized serverless deployments on Google Cloud Run.",
      },
      {
        title: "Google Kubernetes Engine (GKE) Docs",
        url: "https://cloud.google.com/kubernetes-engine/docs",
        description: "Deploying, managing, and scaling containerized applications on Google Cloud GKE.",
      },
    ],
    securityNote: "Ensure the service account only has roles assigned for the specific GCP services you plan to manage through Harbor.",
  },

  Azure: {
    providerId: "Azure",
    name: "Microsoft Azure",
    category: "Cloud Provider",
    summary: "Integrate Microsoft Azure to deploy web applications to Azure App Services, run scalable microservices on Azure Container Apps (ACA), and orchestrate clusters on Azure Kubernetes Service (AKS).",
    credentialType: "Service Principal Client Secret or API Access Token",
    credentialFormat: "appId:clientSecret:tenantId or Azure CLI Access Token",
    steps: [
      {
        title: "Open Microsoft Entra ID (Azure Active Directory)",
        description: "Sign in to portal.azure.com and navigate to \"Microsoft Entra ID\" (formerly Azure Active Directory).",
      },
      {
        title: "Register an Application (Service Principal)",
        description: "Go to \"App registrations\" > \"New registration\". Name your app \"Harbor Integration\", leave the default account type, and click Register. Record the \"Application (client) ID\" and \"Directory (tenant) ID\".",
      },
      {
        title: "Create a Client Secret",
        description: "Under \"Certificates & secrets\" in the left menu, select \"New client secret\", give it a description, choose an expiration period, and click \"Add\". Copy the Secret Value immediately.",
      },
      {
        title: "Assign Role to Subscription or Resource Group",
        description: "Navigate to your Subscription or target Resource Group > \"Access control (IAM)\" > \"Add role assignment\". Choose the \"Contributor\" role and select your newly registered application.",
      },
      {
        title: "Input Credentials in Harbor",
        description: "Enter your credentials formatted as appId:clientSecret:tenantId or paste your Azure management token into Harbor.",
        codeSnippet: "00000000-0000-0000-0000-000000000000:SECRET_VALUE:11111111-1111-1111-1111-111111111111",
      },
    ],
    docs: [
      {
        title: "Azure Entra ID: Create Service Principal in Portal",
        url: "https://learn.microsoft.com/en-us/entra/identity-platform/howto-create-service-principal-portal",
        description: "Microsoft documentation on registering an app and creating a service principal with role assignments.",
      },
      {
        title: "Azure Container Apps Overview",
        url: "https://learn.microsoft.com/en-us/azure/container-apps/overview",
        description: "Serverless container orchestration for microservices and APIs on Azure.",
      },
      {
        title: "Azure App Service Documentation",
        url: "https://learn.microsoft.com/en-us/azure/app-service/",
        description: "Quickstarts and guides for hosting web applications and REST APIs on Azure App Service.",
      },
    ],
    securityNote: "Set an expiration reminder for your Azure client secret to rotate it periodically without deployment downtime.",
  },

  Vercel: {
    providerId: "Vercel",
    name: "Vercel",
    category: "Serverless & Edge",
    summary: "Connect your Vercel account or team to manage fast edge deployments, synchronize environment variables, monitor preview environments, and coordinate custom domains.",
    credentialType: "Personal Access Token (PAT) / Team Token",
    credentialFormat: "vercel_pat_... or 24-character hex API Token",
    steps: [
      {
        title: "Open Vercel Account Settings",
        description: "Log in to vercel.com/dashboard. Click your profile avatar in the top right corner and choose \"Settings\".",
      },
      {
        title: "Navigate to Tokens Tab",
        description: "In the left sidebar of your Account Settings, click \"Tokens\".",
      },
      {
        title: "Generate an Access Token",
        description: "Under \"Create Token\", enter a descriptive name (e.g. \"Harbor Integration\"), set your desired expiration date, and choose scope (Full Account or Specific Team).",
      },
      {
        title: "Copy and Secure Your Token",
        description: "Click \"Create\". Vercel will display your secret token once. Copy it immediately to your clipboard.",
      },
      {
        title: "Paste Token into Harbor",
        description: "Return to Harbor, paste your Vercel Personal Access Token into the API token field, and click Save Connection.",
        codeSnippet: "vercel_pat_xxxxxxxxxxxxxxxxxxxxxx",
      },
    ],
    docs: [
      {
        title: "Vercel: Creating an API Token",
        url: "https://vercel.com/docs/rest-api#creating-an-api-token",
        description: "Official guide to generating personal access tokens for authentication with the Vercel REST API.",
      },
      {
        title: "Vercel Deployments Overview",
        url: "https://vercel.com/docs/deployments/overview",
        description: "Understand how Vercel triggers builds, preview environments, and production edge routing.",
      },
      {
        title: "Vercel REST API Reference",
        url: "https://vercel.com/docs/rest-api",
        description: "Complete API reference for managing projects, deployments, aliases, and certificates.",
      },
    ],
    securityNote: "If you work within a Vercel Team, ensure the token is created with the team scope so Harbor can access the team's projects.",
  },

  Render: {
    providerId: "Render",
    name: "Render",
    category: "Cloud Platform",
    summary: "Connect to Render to trigger automated continuous deploys for web services, background workers, cron jobs, and managed databases with zero infrastructure configuration.",
    credentialType: "Render User API Key",
    credentialFormat: "rnd_... (starts with rnd_)",
    steps: [
      {
        title: "Open Render Dashboard",
        description: "Sign in to dashboard.render.com.",
      },
      {
        title: "Access Account Settings",
        description: "Click your profile avatar in the top-right corner of the Render navigation bar and select \"Account Settings\".",
      },
      {
        title: "Locate API Keys Section",
        description: "Scroll down to the \"API Keys\" section on your Account Settings page.",
      },
      {
        title: "Create a New API Key",
        description: "Click \"Create API Key\", provide a recognizable name (e.g. \"Harbor CI/CD\"), and click Create.",
      },
      {
        title: "Copy and Connect in Harbor",
        description: "Copy the secret API key beginning with rnd_ and paste it into Harbor to link your Render account.",
        codeSnippet: "rnd_xxxxxxxxxxxxxxxxxxxxxxxxxxxx",
      },
    ],
    docs: [
      {
        title: "Render API Keys Setup Guide",
        url: "https://render.com/docs/api-keys",
        description: "How to create and manage user API keys for the Render REST API.",
      },
      {
        title: "Render Web Services Documentation",
        url: "https://render.com/docs/web-services",
        description: "Deploying Docker containers, Node.js, Python, Go, and Ruby services on Render.",
      },
      {
        title: "Render REST API Reference",
        url: "https://api-docs.render.com/reference/overview",
        description: "API endpoints for triggering deploys, checking service health, and updating environment configs.",
      },
    ],
    securityNote: "Render API keys carry full account access for the user who generated them. Store them securely in Harbor.",
  },

  Railway: {
    providerId: "Railway",
    name: "Railway",
    category: "Cloud Infrastructure",
    summary: "Connect Railway to deploy backend microservices, Redis/PostgreSQL instances, and serverless containers with instant builds, metrics, and zero downtime updates.",
    credentialType: "Railway Project Token or Personal API Token",
    credentialFormat: "railway_token_... or Account API Token",
    steps: [
      {
        title: "Sign in to Railway Dashboard",
        description: "Log in at railway.app/dashboard and open your project.",
      },
      {
        title: "Option A: Generate a Project Token (Recommended)",
        description: "Within your project, click \"Settings\" tab > \"Tokens\" section > click \"New Token\". Select the environment (e.g. Production) and create the token.",
      },
      {
        title: "Option B: Generate a Personal API Token",
        description: "Click your avatar in the top right > \"Account Settings\" > \"Tokens\" > \"Create New Token\" to manage multiple projects.",
      },
      {
        title: "Copy the Token",
        description: "Copy the generated token string to your clipboard.",
      },
      {
        title: "Save Integration in Harbor",
        description: "Paste your Railway token into Harbor's credential field and click Save Connection to authenticate.",
        codeSnippet: "railway_token_xxxxxxxxxxxxxxxxxxxxxxxx",
      },
    ],
    docs: [
      {
        title: "Railway Tokens Documentation",
        url: "https://docs.railway.app/reference/tokens",
        description: "Learn the difference between Railway Project Tokens and Account API Tokens.",
      },
      {
        title: "Railway Public API & GraphQL Guide",
        url: "https://docs.railway.app/reference/public-api",
        description: "Interact programmatically with Railway services, deployments, and variables.",
      },
      {
        title: "Railway CLI and Deployments",
        url: "https://docs.railway.app/guides/cli",
        description: "CLI commands, environment management, and deployment workflows on Railway.",
      },
    ],
    securityNote: "Project tokens limit access to a single project and environment, providing superior isolation over personal account tokens.",
  },

  DigitalOcean: {
    providerId: "DigitalOcean",
    name: "DigitalOcean",
    category: "Cloud Platform",
    summary: "Integrate DigitalOcean to deploy applications to App Platform, orchestrate Kubernetes clusters (DOKS), provision Droplets, and store assets in Spaces Object Storage.",
    credentialType: "Personal Access Token (PAT) with Read & Write access",
    credentialFormat: "dop_v1_... (64-character token)",
    steps: [
      {
        title: "Sign in to DigitalOcean Control Panel",
        description: "Log in at cloud.digitalocean.com.",
      },
      {
        title: "Navigate to the API Section",
        description: "In the left sidebar, click \"API\" near the bottom of the navigation menu.",
      },
      {
        title: "Generate a New Personal Access Token",
        description: "Under the \"Tokens\" tab, click \"Generate New Token\". Give it a name like \"Harbor Integration\" and choose an expiration duration.",
      },
      {
        title: "Select Read & Write Scopes",
        description: "Under Scopes, ensure you select both \"Read (read-only)\" and \"Write (read-write)\" so Harbor can manage deployments and retrieve status.",
      },
      {
        title: "Copy and Paste Token into Harbor",
        description: "Click \"Generate Token\", copy the token string starting with dop_v1_, and paste it into Harbor.",
        codeSnippet: "dop_v1_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx",
      },
    ],
    docs: [
      {
        title: "DigitalOcean: How to Create a Personal Access Token",
        url: "https://docs.digitalocean.com/reference/api/create-personal-access-token/",
        description: "Official DigitalOcean tutorial for generating and revoking API access tokens.",
      },
      {
        title: "DigitalOcean App Platform Docs",
        url: "https://docs.digitalocean.com/products/app-platform/",
        description: "Build, deploy, and scale apps and static sites without managing infrastructure.",
      },
      {
        title: "DigitalOcean API Reference",
        url: "https://docs.digitalocean.com/reference/api/api-reference/",
        description: "Comprehensive REST API documentation for all DigitalOcean cloud resources.",
      },
    ],
    securityNote: "Ensure the Write scope is enabled, otherwise Harbor will not be able to trigger deployments or update service configs.",
  },

  Kubernetes: {
    providerId: "Kubernetes",
    name: "Kubernetes",
    category: "Self-Hosted / BYOC",
    summary: "Connect your self-hosted or cloud-managed Kubernetes cluster (EKS, GKE, AKS, k3s, Minikube, or bare metal) to deploy pods, services, and manage namespaces natively.",
    credentialType: "ServiceAccount Bearer Token or Kubeconfig YAML",
    credentialFormat: "eyJhbGciOiJSUzI1NiIs... or Base64 Kubeconfig",
    steps: [
      {
        title: "Access Your Cluster via kubectl",
        description: "Ensure you have cluster admin access in your terminal to create a service account and role binding.",
      },
      {
        title: "Create a Harbor ServiceAccount",
        description: "Create a dedicated service account in the target namespace (e.g. default or harbor-system):",
        codeSnippet: "kubectl create serviceaccount harbor-deployer -n default",
      },
      {
        title: "Bind Cluster Role Permissions",
        description: "Grant deployment permissions using a ClusterRoleBinding (use admin or a scoped custom role):",
        codeSnippet: `kubectl create clusterrolebinding harbor-deployer-binding \\\n  --clusterrole=admin \\\n  --serviceaccount=default:harbor-deployer`,
      },
      {
        title: "Generate Long-Lived Token",
        description: "Generate an API bearer token for the service account with your desired duration:",
        codeSnippet: "kubectl create token harbor-deployer -n default --duration=8760h",
      },
      {
        title: "Paste Bearer Token or Kubeconfig",
        description: "Copy the output JWT token string (or your full kubeconfig YAML/JSON) and paste it into Harbor's credential field.",
      },
    ],
    docs: [
      {
        title: "Kubernetes: Managing Service Accounts",
        url: "https://kubernetes.io/docs/tasks/configure-pod-container/configure-service-account/",
        description: "Official Kubernetes guide on creating and assigning service accounts to pods and external clients.",
      },
      {
        title: "Kubernetes RBAC Authorization Guide",
        url: "https://kubernetes.io/docs/reference/access-authn-authz/rbac/",
        description: "How to configure Role-Based Access Control (RBAC) to enforce least-privilege security.",
      },
      {
        title: "Kubectl Command Line Reference",
        url: "https://kubernetes.io/docs/reference/kubectl/cheatsheet/",
        description: "Official kubectl cheat sheet for cluster inspection, secrets, and token inspection.",
      },
    ],
    securityNote: "For production clusters, create a custom Role restricted only to the namespaces where your applications reside instead of granting cluster-admin.",
  },

  Docker: {
    providerId: "Docker",
    name: "Docker",
    category: "Self-Hosted / Daemon",
    summary: "Connect a remote Docker Daemon or Docker Swarm node to build containers, run standalone stacks, pull images, and manage host environments directly.",
    credentialType: "Docker Remote TCP Socket / TLS Token or Docker Hub PAT",
    credentialFormat: "tcp://your-host:2376 or dckr_pat_... Access Token",
    steps: [
      {
        title: "Option A: Remote Docker Daemon (TLS)",
        description: "Configure Docker Daemon to listen on tcp://0.0.0.0:2376 with TLS encryption and certificate verification in /etc/docker/daemon.json.",
        codeSnippet: `{\n  "hosts": ["unix:///var/run/docker.sock", "tcp://0.0.0.0:2376"],\n  "tls": true,\n  "tlsverify": true\n}`,
      },
      {
        title: "Option B: Docker Hub Access Token",
        description: "Log in to hub.docker.com > click your username in top-right > \"Account Settings\" > \"Security\" tab > \"New Access Token\".",
      },
      {
        title: "Configure Token Permissions",
        description: "Provide a description (e.g. \"Harbor CI\"), set Access permissions to \"Read & Write\", and click Generate.",
      },
      {
        title: "Restart Docker Daemon (if TCP)",
        description: "If configuring remote daemon, reload and restart Docker: sudo systemctl daemon-reload && sudo systemctl restart docker.",
      },
      {
        title: "Paste Credentials in Harbor",
        description: "Enter your Docker Hub access token (dckr_pat_...) or remote daemon connection string into Harbor.",
        codeSnippet: "dckr_pat_xxxxxxxxxxxxxxxxxxxxxxxxxxxx",
      },
    ],
    docs: [
      {
        title: "Protecting the Docker Daemon Socket with TLS",
        url: "https://docs.docker.com/engine/security/protect-access/",
        description: "Official Docker tutorial on securing TCP daemon connections using HTTPS and client TLS certificates.",
      },
      {
        title: "Docker Hub Personal Access Tokens Guide",
        url: "https://docs.docker.com/security/for-developers/access-tokens/",
        description: "How to create, use, and revoke personal access tokens for Docker Hub authentication.",
      },
      {
        title: "Docker Engine REST API Reference",
        url: "https://docs.docker.com/engine/api/",
        description: "Documentation for controlling containers, images, volumes, and networks via the Docker Engine API.",
      },
    ],
    securityNote: "Never expose an unencrypted, unauthenticated Docker TCP socket (port 2375) to the public internet. Always use TLS authentication.",
  },
};
