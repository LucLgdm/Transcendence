"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const middleware_1 = require("../middleware");
const Tournament_1 = __importDefault(require("../models/Tournament"));
const TournamentParticipant_1 = __importDefault(require("../models/TournamentParticipant"));
const TournamentMatch_1 = __importDefault(require("../models/TournamentMatch"));
const User_1 = __importDefault(require("../models/User"));
const database_1 = __importDefault(require("../config/database"));
const router = (0, express_1.Router)();
const ALLOWED_CAPACITIES = new Set([4, 8]);
const ALLOWED_GAMES = new Set(["chess"]);
function shuffleIds(ids) {
    const a = [...ids];
    for (let i = a.length - 1; i > 0; i -= 1) {
        const j = Math.floor(Math.random() * (i + 1));
        [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
}
router.post("/", middleware_1.auth, async (req, res) => {
    try {
        if (!req.user)
            return res.status(401).json({ error: "unauthorized" });
        const { name, capacity, game } = req.body;
        if (!name || typeof name !== "string" || name.trim().length < 2) {
            return res.status(400).json({ error: "invalid-name" });
        }
        const cap = Number(capacity);
        if (!ALLOWED_CAPACITIES.has(cap))
            return res.status(400).json({ error: "invalid-capacity" });
        const gameStr = typeof game === "string" ? game : "chess";
        if (!ALLOWED_GAMES.has(gameStr))
            return res.status(400).json({ error: "invalid-game" });
        const t = await Tournament_1.default.create({
            name: name.trim().slice(0, 160),
            game: "chess",
            capacity: cap,
            status: "registration",
            createdByUserId: req.user.id,
        });
        res.status(201).json(t);
    }
    catch {
        res.status(500).json({ error: "server-error" });
    }
});
router.get("/", middleware_1.auth, async (_req, res) => {
    const rows = await Tournament_1.default.findAll({ order: [["id", "DESC"]], limit: 100 });
    res.json(rows);
});
router.get("/:id", middleware_1.auth, async (req, res) => {
    const id = Number(req.params.id);
    if (!Number.isFinite(id) || id < 1)
        return res.status(400).json({ error: "bad-id" });
    const t = await Tournament_1.default.findByPk(id);
    if (!t)
        return res.status(404).json({ error: "not-found" });
    const participants = await TournamentParticipant_1.default.findAll({
        where: { tournamentId: id },
        include: [{ model: User_1.default, as: "user", attributes: ["id", "username"] }],
        order: [["id", "ASC"]],
    });
    const matches = await TournamentMatch_1.default.findAll({
        where: { tournamentId: id },
        order: [
            ["round", "ASC"],
            ["indexInRound", "ASC"],
        ],
    });
    res.json({ tournament: t, participants, matches });
});
router.post("/:id/register", middleware_1.auth, async (req, res) => {
    try {
        if (!req.user)
            return res.status(401).json({ error: "unauthorized" });
        const id = Number(req.params.id);
        const t = await Tournament_1.default.findByPk(id);
        if (!t)
            return res.status(404).json({ error: "not-found" });
        if (t.status !== "registration")
            return res.status(400).json({ error: "registration-closed" });
        const count = await TournamentParticipant_1.default.count({ where: { tournamentId: id } });
        if (count >= t.capacity)
            return res.status(400).json({ error: "tournament-full" });
        const existing = await TournamentParticipant_1.default.findOne({
            where: { tournamentId: id, userId: req.user.id },
        });
        if (existing)
            return res.status(400).json({ error: "already-registered" });
        const p = await TournamentParticipant_1.default.create({ tournamentId: id, userId: req.user.id });
        res.status(201).json(p);
    }
    catch {
        res.status(500).json({ error: "server-error" });
    }
});
router.post("/:id/start", middleware_1.auth, async (req, res) => {
    const id = Number(req.params.id);
    const t = await Tournament_1.default.findByPk(id);
    if (!t)
        return res.status(404).json({ error: "not-found" });
    if (!req.user || req.user.id !== t.createdByUserId)
        return res.status(403).json({ error: "not-creator" });
    if (t.status !== "registration")
        return res.status(400).json({ error: "bad-state" });
    const rows = await TournamentParticipant_1.default.findAll({ where: { tournamentId: id } });
    if (rows.length !== t.capacity)
        return res.status(400).json({ error: "wrong-participant-count" });
    const userIds = shuffleIds(rows.map((r) => r.userId));
    const n = t.capacity;
    const numRounds = Math.round(Math.log2(n));
    const tx = await database_1.default.transaction();
    try {
        await TournamentMatch_1.default.destroy({ where: { tournamentId: id }, transaction: tx });
        const bulk = [];
        for (let r = 0; r < numRounds; r += 1) {
            const matchesInRound = n / 2 ** (r + 1);
            for (let i = 0; i < matchesInRound; i += 1) {
                let p1 = null;
                let p2 = null;
                if (r === 0) {
                    p1 = userIds[2 * i] ?? null;
                    p2 = userIds[2 * i + 1] ?? null;
                }
                bulk.push({
                    tournamentId: id,
                    round: r,
                    indexInRound: i,
                    player1Id: p1,
                    player2Id: p2,
                    winnerId: null,
                });
            }
        }
        await TournamentMatch_1.default.bulkCreate(bulk, { transaction: tx });
        await t.update({ status: "in_progress" }, { transaction: tx });
        await tx.commit();
    }
    catch (e) {
        await tx.rollback();
        console.error(e);
        return res.status(500).json({ error: "bracket-failed" });
    }
    const matches = await TournamentMatch_1.default.findAll({
        where: { tournamentId: id },
        order: [
            ["round", "ASC"],
            ["indexInRound", "ASC"],
        ],
    });
    const updated = await Tournament_1.default.findByPk(id);
    res.json({ tournament: updated, matches });
});
router.post("/:id/matches/:matchId/result", middleware_1.auth, async (req, res) => {
    const tid = Number(req.params.id);
    const matchId = Number(req.params.matchId);
    const winnerUserId = Number(req.body.winnerUserId);
    if (!Number.isFinite(winnerUserId))
        return res.status(400).json({ error: "bad-winner" });
    const t = await Tournament_1.default.findByPk(tid);
    if (!t)
        return res.status(404).json({ error: "not-found" });
    if (t.status !== "in_progress")
        return res.status(400).json({ error: "bad-state" });
    const match = await TournamentMatch_1.default.findOne({ where: { id: matchId, tournamentId: tid } });
    if (!match)
        return res.status(404).json({ error: "match-not-found" });
    if (match.winnerId)
        return res.status(400).json({ error: "already-finished" });
    if (!req.user)
        return res.status(401).json({ error: "unauthorized" });
    const { player1Id, player2Id } = match;
    if (req.user.id !== player1Id && req.user.id !== player2Id) {
        return res.status(403).json({ error: "not-player" });
    }
    if (winnerUserId !== player1Id && winnerUserId !== player2Id) {
        return res.status(400).json({ error: "winner-not-in-match" });
    }
    if (player1Id === null || player2Id === null) {
        return res.status(400).json({ error: "incomplete-match" });
    }
    const n = t.capacity;
    const numRounds = Math.round(Math.log2(n));
    const tx = await database_1.default.transaction();
    try {
        await match.update({ winnerId: winnerUserId }, { transaction: tx });
        if (match.round === numRounds - 1) {
            await t.update({ status: "completed" }, { transaction: tx });
            await tx.commit();
            return res.json({ ok: true, tournamentCompleted: true });
        }
        const parentRound = match.round + 1;
        const parentIndex = Math.floor(match.indexInRound / 2);
        const slotIsFirst = match.indexInRound % 2 === 0;
        const parent = await TournamentMatch_1.default.findOne({
            where: { tournamentId: tid, round: parentRound, indexInRound: parentIndex },
            transaction: tx,
        });
        if (!parent) {
            await tx.rollback();
            return res.status(500).json({ error: "parent-missing" });
        }
        const updateFields = slotIsFirst ? { player1Id: winnerUserId } : { player2Id: winnerUserId };
        await parent.update(updateFields, { transaction: tx });
        await tx.commit();
        res.json({ ok: true });
    }
    catch (e) {
        await tx.rollback();
        console.error(e);
        res.status(500).json({ error: "update-failed" });
    }
});
router.delete("/:id", middleware_1.auth, async (req, res) => {
    const id = Number(req.params.id);
    const t = await Tournament_1.default.findByPk(id);
    if (!t)
        return res.status(404).json({ error: "not-found" });
    if (!req.user || req.user.id !== t.createdByUserId)
        return res.status(403).json({ error: "not-creator" });
    if (t.status !== "registration")
        return res.status(400).json({ error: "bad-state" });
    await TournamentMatch_1.default.destroy({ where: { tournamentId: id } });
    await TournamentParticipant_1.default.destroy({ where: { tournamentId: id } });
    await t.destroy();
    res.status(204).send();
});
exports.default = router;
