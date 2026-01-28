import express from 'express';
import { connectDatabase } from './config/database';

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(express.json());

// Connect to the database
connectDatabase();

// Import routes
import routes from './routes/index';
app.use('/api', routes);

// Start the server
app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});