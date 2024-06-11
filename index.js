import SemanticReleaseError from '@semantic-release/error';
import axios from "axios";

const VERSION_VAR_PLACEHOLDER = "${version}";
let logger;

export function verifyCondition(pluginConfig, context) {
	const { jiraHost, jiraProjectKey, jiraReleaseNameTemplate } = pluginConfig;
	logger = context.logger;

	if (jiraHost === undefined || typeof jiraHost !== "string" || jiraHost === "") {
		const error = "jiraHost is not set correct. It must be a URL";
		logger.warn(error);
		throw new SemanticReleaseError(error);
	}

	validateJiraURL(jiraHost);

	if (jiraProjectKey === undefined || typeof jiraProjectKey !== "string" || jiraProjectKey === "") {
		const error = "jiraProjectKey is not set correct. It must be a URL";
		logger.warn(error);
		throw new SemanticReleaseError(error);
	}

	if (jiraReleaseNameTemplate !== undefined) {
		if (typeof jiraReleaseNameTemplate !== "string" || !jiraReleaseNameTemplate.includes(VERSION_VAR_PLACEHOLDER)) {
			const error = "jiraReleaseNameTemplate must be a string containing '${version}'. If omitted in config, it will default to ${version}";
			logger.warn(error);
			throw new SemanticReleaseError(error);
		}
	}

	const { jiraPATToken } = context.env;
	if (jiraPATToken === undefined || typeof jiraPATToken !== "string" || jiraPATToken === "") {
		const error = "jiraPATToken not set as an environment variable";
		throw new SemanticReleaseError(error);
	}
}

function validateJiraURL(url) {
	try {
		new URL(url);
	} catch (e) {
		throw new SemanticReleaseError("jiraHost in not a valid URL");
	}
}

export async function generateNotes(pluginConfig, context) {
	const { version } = context.nextRelease;
	const { jiraHost, jiraProjectKey, jiraReleaseNameTemplate } = pluginConfig;
	const { jiraPATToken } = context.env;
	const { commits } = context;
	logger = context.logger;

	const jiraReleaseName = deriveJiraReleaseName(jiraReleaseNameTemplate, version);
	const jiraProjectId = await getJiraProjectId(jiraHost, jiraPATToken, jiraProjectKey);
	const releaseExists = await jiraReleaseExists(jiraReleaseName, jiraHost, jiraPATToken, jiraProjectId);

	if(!releaseExists)
		await createJiraRelease(jiraReleaseName, jiraHost, jiraPATToken, jiraProjectKey);

	const jiraIssues = extractJiraIssues(commits);
	for (const issue of jiraIssues)
		await addVersionToJiraIssue(jiraReleaseName, jiraHost, jiraPATToken, issue);
}

export function deriveJiraReleaseName(jiraReleaseNameTemplate, version) {
	return (jiraReleaseNameTemplate === undefined) ? version : jiraReleaseNameTemplate.replace(VERSION_VAR_PLACEHOLDER, version);
}

async function addVersionToJiraIssue(releaseName, jiraBaseURL, apiToken, issueKey) {
	const data = {
		update: {
			fixVersions: [
				{
					add: {
						name: releaseName
					}
				}
			]
		}
	};
	const config = {
		headers: {
			"Authorization": `Bearer ${apiToken}`,
			"Content-Type": "application/json"
		},
	}
	try {
		await axios.put(`${jiraBaseURL}/rest/api/latest/issue/${issueKey}`, data, config);
	} catch(e) {
		logger.error("Issue adding Version to Jira Issue", e.response);
		throw new SemanticReleaseError("Issue adding Version to Jira Issue", e.response);
	}
}

async function getJiraProjectId(jiraBaseURL, apiToken, projectKey) {
	const config = {
		"Authorization": `Bearer ${apiToken}`
	};
	let res; 
	try {
		res = await axios.get(`${jiraBaseURL}/rest/api/latest/project/${projectKey}`, config);
	} catch(e) {
		throw new SemanticReleaseError("Unable to get Jira project", e);
	}
	return res.data.id;
}

async function jiraReleaseExists(releaseName, jiraBaseURL, apiToken, projectId) {
	const config = {
		"Authorization": `Bearer ${apiToken}`
	};
	let res;
	try {
		res = await axios.get(`${jiraBaseURL}/rest/api/latest/version?query=${releaseName}&projectIds=${projectId}`, config);
	} catch(e) {
		throw new SemanticReleaseError("Unable to get Jira releases", e);
	}
	return res.data.values.length > 0;
}

async function createJiraRelease(releaseName, jiraBaseURL, apiToken, projectKey) {
	const data = {
		description: "Generated by Semantic Release",
		name: releaseName,
		archived: false,
		released: true,
		releaseDate: new Date().toISOString().split('T')[0],
		project: projectKey
	};

	const config = {
		"Authorization": `Bearer ${apiToken}`
	};
	try {
		await axios.post(`${jiraBaseURL}/rest/api/latest/version`, data, config);
	} catch(e) {
		logger.error("Issue creating Jira Release", e.response);
		throw new SemanticReleaseError("Issue creating Jira Release", e.response);
	}
}

export function extractJiraIssues(commits) {
	let regex = /([A-Z]+-[\d]+)/g;
	return commits.flatMap(commit => commit.subject.match(regex)).filter(val => val !== null);
}

