# GitHub Actions deployment integration

Harbor triggers a repository's `workflow_dispatch` event when a deployment is
created. The workflow file is stored on each service (default: `deploy.yml`).
Harbor sends these inputs:

| Input | Value |
|---|---|
| `environment` | Harbor environment name |
| `project` | Harbor project id |
| `service` | Harbor service id |
| `deployment_id` | Harbor deployment id |
| `version` | Selected version |
| `commit_sha` | Selected commit, or an empty string |

## Repository prerequisites

1. The repository must be accessible by the token configured in Harbor.
2. The configured workflow must exist at `.github/workflows/<workflow-file>`.
3. The workflow must declare `on: workflow_dispatch` and define the inputs
   above (input names are case-sensitive).
4. The workflow must check out the requested ref and implement build, test,
   and deployment steps. Harbor does not execute those steps itself.
5. The token needs Actions: **write** permission and repository contents
   **read** permission. Fine-grained repository tokens are preferred.
6. Any cloud, registry, or environment secrets must remain GitHub Actions
   secrets/variables; never put them in Harbor requests or source code.

Example workflow:

```yaml
name: Deploy
on:
  workflow_dispatch:
    inputs:
      environment: { required: true, type: string }
      project: { required: true, type: string }
      service: { required: true, type: string }
      deployment_id: { required: true, type: string }
      version: { required: true, type: string }
      commit_sha: { required: false, type: string }
jobs:
  deploy:
    runs-on: ubuntu-latest
    environment: ${{ inputs.environment }}
    steps:
      - uses: actions/checkout@v4
        with:
          ref: ${{ inputs.commit_sha || inputs.version }}
      - run: ./scripts/deploy.sh
```

Set `GITHUB_TOKEN`, `GITHUB_ACTIONS_WORKFLOW`, and optionally
`GITHUB_API_BASE_URL` in Harbor's deployment service environment. Set
`GITHUB_WEBHOOK_SECRET` if the workflow calls Harbor's status callback:
`POST /api/deployments/{deploymentId}/status` with
`X-Harbor-Signature` equal to the HMAC-SHA256 hex digest of the JSON body.
