import express from 'express';
import { json } from 'body-parser';
import { connectDatabase } from './config/database';
import routes from './routes/index';
import { errorHandler } from './middleware/index';

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(json());

// Database connection
connectDatabase();

// Routes
app.use('/api', routes);

// Error handling middleware
app.use(errorHandler);

app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});

export default app;