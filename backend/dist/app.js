"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const vault_1 = require("./config/vault");
const index_1 = require("./middleware/index");
const app = (0, express_1.default)();
const PORT = Number(process.env.PORT) || 3000;
app.use(express_1.default.json());
async function bootstrap() {
    await (0, vault_1.loadSecrets)();
    const { connectDatabase } = await Promise.resolve().then(() => __importStar(require("./config/database")));
    const { default: userRoutes } = await Promise.resolve().then(() => __importStar(require("./routes/index")));
    app.use("/users", userRoutes);
    app.use(index_1.errorHandler);
    await connectDatabase();
    app.listen(PORT, "0.0.0.0", () => {
        console.log(`Server is running on http://0.0.0.0:${PORT}`);
    });
}
bootstrap().catch((err) => {
    console.error(err);
    process.exit(1);
});
