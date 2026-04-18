import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";

export const errorHandler = (err: unknown, _req: Request, res: Response, _next: NextFunction) => {
	console.error(err instanceof Error ? err.stack : err);
	res.status(500).send("Something broke!");
};

export interface AutRequest extends Request {
	user?: { id: number; username: string };
}

export const auth = (req: AutRequest, res: Response, next: NextFunction) => {
	const autHead = req.headers.authorization;
	if (!autHead || !autHead.startsWith("Bearer ")) {
		return res.status(401).json({ error: "not approuved" });
	}

	const token = autHead.substring("Bearer".length).trim();
	try {
		const payload = jwt.verify(token, process.env.JWT_SECRET || "secret") as {
			id: number;
			username: string;
		};
		req.user = { id: payload.id, username: payload.username };
		next();
	} catch (error) {
		return res.status(401).json({ error: "Invalid token" });
	}
};
