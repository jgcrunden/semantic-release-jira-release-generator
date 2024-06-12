# semantic-release-jira-release-generator

A [Semantic Release](https://github.com/semantic-release/semantic-release) plugin that uses the Jira REST API to create a Jira Release. It will also associate any Jira issues referenced in commit message with the release.

## Install

```bash
npm install -D semantic-release-jira-release-generator
```

## Usage

This plugin can be configured in the [Semantic Release Configuration file](https://github.com/semantic-release/semantic-release/blob/master/docs/usage/configuration.md#configuration) like so:

```json
{
  "plugins": [
    "@semantic-release/commit-analyzer",
    ["semantic-release-jira-release-generator", {
      "jiraHost": "https://<jira-host-name>",
      "jiraProjectKey": "ABC",
      "jiraReleaseNameTemplate": "v${version}" // optional
    }]
  ]
}
```
`jiraReleaseNameTemplate` is optional but if provided, must include the string `${version}`, which will be evaluated to the version dirived by Semantic Release. If not provided, it will default to `${version}`.

## Authentication

Currently this semantic release plugin only supports PAT (personal access token) as a means of authentication with Jira. Please follow Atlassian's [guide](https://confluence.atlassian.com/enterprise/using-personal-access-tokens-1026032365.html) on creating PAT tokens.

The token must be provided to this plugin by setting it as the following environment variable
```bash
export jiraPATToken=<personal-access-token-here>
```

## Limitations

This has only been tested with Jira Software Data Center (9.12.x). It has not been tested with Atlassian's Cloud offering of Jira

This plugin does not support Basic Auth as a means of authenticating with Jira, but this functionality could be added if there was appetite.
