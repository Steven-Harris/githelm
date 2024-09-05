export const config = `
{
  "JHADigitalCore": {
    "general-ledger-service": {
      "pullRequestConfig": {
        "enabled": true,
        "filter": ""
      },
      "actionConfig": {
        "enabled": true,
        "filter": "deploy"
      }
    },
    "general-ledger-translation-service": {
      "pullRequestConfig": {
        "enabled": true,
        "filter": ""
      },
      "actionConfig": {
        "enabled": true,
        "filter": "deploy"
      }
    },
    "general-ledger-transfers-processor": {
      "pullRequestConfig": {
        "enabled": true,
        "filter": ""
      },
      "actionConfig": {
        "enabled": true,
        "filter": "deploy"
      }
    },
    "general-ledger-manual-journal-processor": {
      "pullRequestConfig": {
        "enabled": true,
        "filter": ""
      },
      "actionConfig": {
        "enabled": true,
        "filter": "deploy"
      }
    },
    "general-ledger-import-service": {
      "pullRequestConfig": {
        "enabled": true,
        "filter": ""
      },
      "actionConfig": {
        "enabled": true,
        "filter": "deploy"
      }
    },
    "environments": {
      "pullRequestConfig": {
        "enabled": true,
        "filter": "label:general-ledger"
      },
      "actionConfig": {
        "enabled": false
      }
    },
    "k8s-apps": {
      "pullRequestConfig": {
        "enabled": true,
        "filter": "label:general-ledger"
      },
      "actionConfig": {
        "enabled": false
      }
    },
    "digitalcore-contracts": {
      "pullRequestConfig": {
        "enabled": true,
        "filter": "label:general-ledger"
      },
      "actionConfig": {
        "enabled": false
      }
    },
    "digitalcore-messages-doc": {
      "pullRequestConfig": {
        "enabled": true,
        "filter": "label:general-ledger"
      },
      "actionConfig": {
        "enabled": false
      }
    }
  }
}
`