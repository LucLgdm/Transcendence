"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const body_parser_1 = require("body-parser");
const database_1 = require("./config/database");
const vault_1 = require("./config/vault");
const index_1 = __importDefault(require("./routes/index"));
const index_2 = require("./middleware/index");
const app = (0, express_1.default)();
const PORT = process.env.PORT || 3000;
// Middleware
app.use((0, body_parser_1.json)());
// Database connection
(0, vault_1.loadSecrets)();
(0, database_1.connectDatabase)();
// Routes
app.use('/api', index_1.default);
// Error handling middleware
app.use(index_2.errorHandler);
app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});
// export default app;
