export const config = `
{
  "pullRequests": [
    {
      "org": "JHADigitalCore",
      "repo": "general-ledger-service",
      "filter": ""
    },
    {
      "org": "JHADigitalCore",
      "repo": "general-ledger-translation-service",
      "filter": ""
    },
    {
      "org": "JHADigitalCore",
      "repo": "general-ledger-transfers-processor",
      "filter": ""
    },
    {
      "org": "JHADigitalCore",
      "repo": "general-ledger-manual-journal-processor",
      "filter": ""
    },
    {
      "org": "JHADigitalCore",
      "repo": "general-ledger-import-service",
      "filter": ""
    },
    {
      "org": "JHADigitalCore",
      "repo": "general-ledger-load-tester",
      "filter": ""
    },
    {
      "org": "JHADigitalCore",
      "repo": "environments",
      "filter": "label:general-ledger"
    },
    {
      "org": "JHADigitalCore",
      "repo": "k8s-apps",
      "filter": "label:general-ledger"
    },
    {
      "org": "JHADigitalCore",
      "repo": "digitalcore-contracts",
      "filter": "label:general-ledger"
    },
    {
      "org": "JHADigitalCore",
      "repo": "digitalcore-messages-doc",
      "filter": "label:general-ledger"
    }
  ],
  "actions": [
    {
      "org": "JHADigitalCore",
      "repo": "general-ledger-service",
      "filter": "deploy"
    },
    {
      "org": "JHADigitalCore",
      "repo": "general-ledger-translation-service",
      "filter": "deploy"
    },
    {
      "org": "JHADigitalCore",
      "repo": "general-ledger-transfers-processor",
      "filter": "deploy"
    },
    {
      "org": "JHADigitalCore",
      "repo": "general-ledger-manual-journal-processor",
      "filter": "deploy"
    },
    {
      "org": "JHADigitalCore",
      "repo": "general-ledger-import-service",
      "filter": "deploy"
    }
  ]
}
`