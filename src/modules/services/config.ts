export const config = `
{
  "pullRequests": [
    {
      "org": "JHADigitalCore",
      "repo": "general-ledger",
      "filters": [""]
    },
    {
      "org": "JHADigitalCore",
      "repo": "general-ledger-service",
      "filters": [""]
    },
    {
      "org": "JHADigitalCore",
      "repo": "general-ledger-translation-service",
      "filters": [""]
    },
    {
      "org": "JHADigitalCore",
      "repo": "general-ledger-query-service",
      "filters": [""]
    },
    {
      "org": "JHADigitalCore",
      "repo": "general-ledger-deposit-interest-processor",
      "filters": [""]
    },
    {
      "org": "JHADigitalCore",
      "repo": "general-ledger-transfers-processor",
      "filters": [""]
    },
    {
      "org": "JHADigitalCore",
      "repo": "general-ledger-manual-journal-processor",
      "filters": [""]
    },
    {
      "org": "JHADigitalCore",
      "repo": "general-ledger-import-service",
      "filters": [""]
    },
    {
      "org": "JHADigitalCore",
      "repo": "general-ledger-load-tester",
      "filters": [""]
    },
    {
      "org": "JHADigitalCore",
      "repo": "environments",
      "filters": ["label:general-ledger"]
    },
    {
      "org": "JHADigitalCore",
      "repo": "k8s-apps",
      "filters": ["label:general-ledger"]
    },
    {
      "org": "JHADigitalCore",
      "repo": "digitalcore-contracts",
      "filters": ["label:general-ledger"]
    },
    {
      "org": "JHADigitalCore",
      "repo": "digitalcore-messages-doc",
      "filters": ["label:general-ledger"]
    }
  ],
  "actions": [
    {
      "org": "JHADigitalCore",
      "repo": "general-ledger-service",
      "filters": ["deploy"]
    },
    {
      "org": "JHADigitalCore",
      "repo": "general-ledger-translation-service",
      "filters": ["deploy"]
    },
    {
      "org": "JHADigitalCore",
      "repo": "general-ledger-query-service",
      "filters": ["deploy"]
    },
    {
      "org": "JHADigitalCore",
      "repo": "general-ledger-transfers-processor",
      "filters": ["deploy"]
    },
    {
      "org": "JHADigitalCore",
      "repo": "general-ledger-deposit-interest-processor",
      "filters": ["deploy"]
    },
    {
      "org": "JHADigitalCore",
      "repo": "general-ledger-manual-journal-processor",
      "filters": ["deploy"]
    },
    {
      "org": "JHADigitalCore",
      "repo": "general-ledger-import-service",
      "filters": ["deploy"]
    }
  ]
}
`