import axios from "axios";
export async function loadSecrets() {
	try {
		const response = await axios.get(
			"http://vault:8200/v1/secret/data/db",
			{
				headers: {
					"X-Vault-Token": process.env.VAULT_TOKEN || "root",
				},
			}
		);
		const data = response.data.data.data;

		process.env.DB_USER = data.DB_USER;
		process.env.DB_PASSWORD = data.DB_PASSWORD;
		process.env.DB_NAME = data.DB_NAME;

		console.log("Secrets loaded");
	} catch (error) {
		console.error("fail to load secrets", error);
		process.exit(1);
	}
}