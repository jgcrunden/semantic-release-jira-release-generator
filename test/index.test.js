import SemanticReleaseError from "@semantic-release/error";
import { deriveJiraReleaseName, extractJiraIssues, generateNotes, verifyCondition } from "..";
import { jest } from "@jest/globals";
import axios from "axios";

let context = {};

beforeEach(() => {
	context = {
		logger: console,
		env: {},
		nextRelease: {
			version: "1.2.3"
		}
	}
});

const jiraHost = "https://jira.atlassian.com";
const jiraProjectKey = "ABC";

const noJiraHostError = "jiraHost is not set correct. It must be a URL";
const invalidURLError = "jiraHost in not a valid URL";
const noJiraPojectKeyError = "jiraProjectKey is not set correct. It must be a URL";
const noJiraReleaseNameTemplateError = "jiraReleaseNameTemplate must be a string containing '${version}'. If omitted in config, it will default to ${version}";
const noJiraPATTokenError = "jiraPATToken not set as an environment variable";

test("jiraHost not set", () => {
	const pluginConfig = {};
	const res = () => verifyCondition(pluginConfig, context);
	expect(res).toThrow(SemanticReleaseError);
	expect(res).toThrow(noJiraHostError);
});

test("jiraHost is not a string", () => {
	const pluginConfig = {
		jiraHost: 2
	};
	const res = () => verifyCondition(pluginConfig, context);
	expect(res).toThrow(SemanticReleaseError);
	expect(res).toThrow(noJiraHostError);
});

test("jiraHost is an empty string", () => {
	const pluginConfig = {
		jiraHost: ""
	};
	const res = () => verifyCondition(pluginConfig, context);
	expect(res).toThrow(SemanticReleaseError);
	expect(res).toThrow(noJiraHostError);
});

test("invalid url", () => {
	const pluginConfig = {
		jiraHost: "1234"
	};
	const res = () => verifyCondition(pluginConfig, context);
	expect(res).toThrow(SemanticReleaseError);
	expect(res).toThrow(invalidURLError);

});

test("jiraProjectKey not set", () => {
	const pluginConfig = {
		jiraHost
	};
	const res = () => verifyCondition(pluginConfig, context);
	expect(res).toThrow(SemanticReleaseError);
	expect(res).toThrow(noJiraPojectKeyError);
});

test("jiraProjectKey is not a string", () => {
	const pluginConfig = {
		jiraHost,
		jiraProjectKey: true
	};
	const res = () => verifyCondition(pluginConfig, context);
	expect(res).toThrow(SemanticReleaseError);
	expect(res).toThrow(noJiraPojectKeyError);
});

test("jiraProjectKey is an empty string", () => {
	const pluginConfig = {
		jiraHost,
		jiraProjectKey: ""
	};
	const res = () => verifyCondition(pluginConfig, context);
	expect(res).toThrow(SemanticReleaseError);
	expect(res).toThrow(noJiraPojectKeyError);
});


test("jiraReleaseNameTemplate is not a string", () => {
	const pluginConfig = {
		jiraHost,
		jiraProjectKey,
		jiraReleaseNameTemplate: []
	}
	const res = () => verifyCondition(pluginConfig, context);
	expect(res).toThrow(SemanticReleaseError);
	expect(res).toThrow(noJiraReleaseNameTemplateError);
});

test("jiraReleaseNameTemplate is a string that doesn't contain ${version}", () => {
	const pluginConfig = {
		jiraHost,
		jiraProjectKey,
		jiraReleaseNameTemplate: "version 1.2.3"
	}
	const res = () => verifyCondition(pluginConfig, context);
	expect(res).toThrow(SemanticReleaseError);
	expect(res).toThrow(noJiraReleaseNameTemplateError);
});

test("jiraPATToken is not set a environment variable", () => {
	const pluginConfig = {
		jiraHost,
		jiraProjectKey,
		jiraReleaseNameTemplate: "${version}",
		env: {
		}
	}
	context = {
		...context,
		env: {}
	}
	const res = () => verifyCondition(pluginConfig, context);
	expect(res).toThrow(SemanticReleaseError);
	expect(res).toThrow(noJiraPATTokenError);
});

test("jiraPATToken is undefined", () => {
	const pluginConfig = {
		jiraHost,
		jiraProjectKey,
	}
	context = {
		...context,
		env: {
		}
	}
	const res = () => verifyCondition(pluginConfig, context);
	expect(res).toThrow(SemanticReleaseError);
	expect(res).toThrow(noJiraPATTokenError);
});

test("jiraPATToken is not a string", () => {
	const pluginConfig = {
		jiraHost,
		jiraProjectKey,
	}
	context = {
		...context,
		env: {
			jiraPATToken: 2
		}
	}
	const res = () => verifyCondition(pluginConfig, context);
	expect(res).toThrow(SemanticReleaseError);
	expect(res).toThrow(noJiraPATTokenError);
});

test("jiraPATToken is an empty string", () => {
	const pluginConfig = {
		jiraHost,
		jiraProjectKey,
		jiraReleaseNameTemplate: "${version}",
	}
	context = {
		...context,
		env: {
			jiraPATToken: ""
		}
	}
	const res = () => verifyCondition(pluginConfig, context);
	expect(res).toThrow(SemanticReleaseError);
	expect(res).toThrow(noJiraPATTokenError);
});

test("parameters are set successfully", () => {
	const pluginConfig = {
		jiraHost,
		jiraProjectKey,
		jiraReleaseNameTemplate: "${version}",
	}
	context = {
		...context,
		env: {
			jiraPATToken: "abcd"
		}
	}

	const res = () => verifyCondition(pluginConfig, context);
	expect(res).not.toThrowError();
});

test("derive Jira Release Name from undefined", () => {
	const release = "1.2.3";
	const res = deriveJiraReleaseName(undefined, release);
	expect(res).toBe(release);
});

test("derive Jira Release Name from specified template", () => {
	const release = "1.2.3";
	const template = "myapp-${version}";
	const expectedResult = "myapp-1.2.3";
	const res = deriveJiraReleaseName(template, release);
	expect(res).toBe(expectedResult);
});

test("extract jira issues, no issues present", () => {
	const commits = [
		{ subject: "here is one commit" },
		{ subject: "here is another commit" },
		{ subject: "here is a third commit" },
	];

	const res = extractJiraIssues(commits);
	expect(res.length).toBe(0);
});

test("extract jira issues, one issues present", () => {
	const commits = [
		{ subject: "ABC-1234 here is one commit" },
		{ subject: "here is another commit" },
		{ subject: "here is a third commit" },
	];

	const res = extractJiraIssues(commits);
	expect(res.length).toBe(1);
	expect(res[0]).toBe("ABC-1234");
});

test("extract jira issues, two issues present", () => {
	const commits = [
		{ subject: "ABC-1234 here is one commit" },
		{ subject: "DEF-789 here is another commit" },
		{ subject: "here is a third commit" },
	];

	const res = extractJiraIssues(commits);
	expect(res.length).toBe(2);
	expect(res[0]).toBe("ABC-1234");
	expect(res[1]).toBe("DEF-789");
});

test("extract jira issues, two issues present in same commit message", () => {
	const commits = [
		{ subject: "ABC-1234 DEF-789 here is one commit" },
		{ subject: "here is another commit" },
		{ subject: "here is a third commit" },
	];

	const res = extractJiraIssues(commits);
	expect(res.length).toBe(2);
	expect(res[0]).toBe("ABC-1234");
	expect(res[1]).toBe("DEF-789");
});

test("get Jira project fails", () => {
	const pluginConfig = {
		jiraHost,
		jiraProjectKey,
		jiraReleaseNameTemplate: "${version}",
	}
	context = {
		...context,
		env: {
			jiraPATToken: "abcd"
		}
	}
	const err = new Error();
	err.response = {
		status: 403,
		data: { "message": "you do not have permission" }
	}
	jest.spyOn(axios, "get").mockRejectedValueOnce(err); 
	expect(generateNotes(pluginConfig, context)).rejects.toThrow("Unable to get Jira project");
});

test("jiraReleaseExists fails", () => {
	const pluginConfig = {
		jiraHost,
		jiraProjectKey,
		jiraReleaseNameTemplate: "${version}",
	}
	context = {
		...context,
		env: {
			jiraPATToken: "abcd"
		}
	}
	const err = new Error();
	err.response = {
		status: 403,
		data: { "message": "you do not have permission" }
	}
	jest.spyOn(axios, "get").mockResolvedValueOnce({ data: { id: "1234"  }}); 
	jest.spyOn(axios, "get").mockRejectedValueOnce(err); 
	expect(generateNotes(pluginConfig, context)).rejects.toThrow("Unable to get Jira releases");
});

test("generateNotes: createJiraRelease fails, insufficient permissions", async () => {
	const pluginConfig = {
		jiraHost,
		jiraProjectKey,
		jiraReleaseNameTemplate: "${version}",
	}
	context = {
		...context,
		env: {
			jiraPATToken: "abcd"
		}
	}
	const err = new Error();
	err.response = {
		status: 403,
		data: { "message": "you do not have permission" }
	}
	jest.spyOn(axios, "post").mockRejectedValue(err);
	jest.spyOn(axios, "get").mockResolvedValueOnce({ data: { id: 1234 } }); 
	jest.spyOn(axios, "get").mockResolvedValueOnce({ data: { values: [] } }); 
	expect(generateNotes(pluginConfig, context)).rejects.toThrow("Issue creating Jira Release");
});

test("generateNotes: createJiraRelease fails, the version doesn't exist", async () => {
	const pluginConfig = {
		jiraHost,
		jiraProjectKey,
		jiraReleaseNameTemplate: "${version}",
	}
	context = {
		...context,
		env: {
			jiraPATToken: "abcd"
		}
	}
	const err = new Error();
	err.response = {
		status: 404,
		data: { "message": "the version does not exist" }
	}
	jest.spyOn(axios, "post").mockRejectedValue(err);
	jest.spyOn(axios, "get").mockResolvedValueOnce({ data: { id: 1234 } }); 
	jest.spyOn(axios, "get").mockResolvedValueOnce({ data: { values: [] } }); 
	expect(generateNotes(pluginConfig, context)).rejects.toThrow("Issue creating Jira Release");
});

test("generateNotes: addVersionToJiraIssue fails, the version doesn't exist", async () => {
	const pluginConfig = {
		jiraHost,
		jiraProjectKey,
		jiraReleaseNameTemplate: "${version}",
	}
	context = {
		...context,
		env: {
			jiraPATToken: "abcd"
		},
		commits: [
			{ subject: "ABC-1234 here is one commit" },
			{ subject: "here is another commit" },
			{ subject: "here is a third commit" },
		]
	}
	const err = new Error();
	err.response = {
		status: 400,
		data: { "message": "the requested issue update failed" }
	}
	jest.spyOn(axios, "post").mockResolvedValue(true);
	jest.spyOn(axios, "get").mockResolvedValueOnce({ data: { id: 1234 } }); 
	jest.spyOn(axios, "get").mockResolvedValueOnce({ data: { values: [] } }); 
	jest.spyOn(axios, "put").mockRejectedValue(err);
	expect(generateNotes(pluginConfig, context)).rejects.toThrow("Issue adding Version to Jira Issue");
});


test("generateNotes: runs successfully", async () => {
	const pluginConfig = {
		jiraHost,
		jiraProjectKey,
		jiraReleaseNameTemplate: "${version}",
	}
	context = {
		...context,
		env: {
			jiraPATToken: "abcd"
		},
		commits: [
			{ subject: "ABC-1234 here is one commit" },
			{ subject: "here is another commit" },
			{ subject: "here is a third commit" },
		]
	}
	jest.spyOn(axios, "post").mockResolvedValue(true);
	jest.spyOn(axios, "get").mockResolvedValueOnce({ data: { id: 1234 } }); 
	jest.spyOn(axios, "get").mockResolvedValueOnce({ data: { values: [] } }); 
	jest.spyOn(axios, "put").mockResolvedValue(true);
	expect(generateNotes(pluginConfig, context)).resolves;
});

test("generateNotes: runs successfully, version already exists", async () => {
	const pluginConfig = {
		jiraHost,
		jiraProjectKey,
		jiraReleaseNameTemplate: "${version}",
	}
	context = {
		...context,
		env: {
			jiraPATToken: "abcd"
		},
		commits: [
			{ subject: "ABC-1234 here is one commit" },
			{ subject: "here is another commit" },
			{ subject: "here is a third commit" },
		]
	}
	jest.spyOn(axios, "post").mockResolvedValue(true);
	jest.spyOn(axios, "get").mockResolvedValueOnce({ data: { id: 1234 } }); 
	jest.spyOn(axios, "get").mockResolvedValueOnce({ data: { values: ["1.2.3"] } }); 
	jest.spyOn(axios, "put").mockResolvedValue(true);
	expect(generateNotes(pluginConfig, context)).resolves;
});
