const express = require('express');
const cors = require('cors');
const path = require('path');
const config = require('./config');
const apiRoutes = require('./routes/api.routes');

const app = express();

app.use(cors());
app.use(express.json());
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

app.use('/api', apiRoutes);

app.get('/health', (req, res) => {
    res.json({ status: 'ok' });
});

app.use((error, req, res, next) => {
    console.error('Unhandled backend error:', error);
    res.status(500).json({ error: 'Внутренняя ошибка сервера' });
});

app.listen(config.port, () => {
    console.log(`Server is running on port ${config.port}`);
});
