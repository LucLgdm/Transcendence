import express from "express";
import { loadSecrets } from "./config/vault";
import { errorHandler } from "./middleware/index";

import cors from 'cors';

const app = express();
app.use(cors({ origin: true }));
app.use(express.json());
const PORT = Number(process.env.PORT) || 3000;

async function bootstrap(): Promise<void> {
	await loadSecrets();
	const { connectDatabase } = await import("./config/database");
	const { default: userRoutes } = await import("./routes/index");

	app.use("/users", userRoutes);
	app.use(errorHandler);
	await connectDatabase();
	app.listen(PORT, "0.0.0.0", () => {
		console.log(`Server is running on http://0.0.0.0:${PORT}`);
	});
}

bootstrap().catch((err) => {
	console.error(err);
	process.exit(1);
});
