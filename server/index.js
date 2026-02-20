console.log('Server Starting...');
require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');

const authRoute = require('./routes/auth');
const loanRoute = require('./routes/loan');
const messageRoute = require('./routes/messages');

const app = express();
const PORT = process.env.PORT || 5000;

app.use(express.json());
app.use(cors());

mongoose.connect(process.env.MONGO_URI)
    .then(() => console.log('MongoDB Connected'))
    .catch(err => console.log('MongoDB Connection Error:', err));

app.use('/api/auth', authRoute);
app.use('/api/loans', loanRoute);
app.use('/api/messages', messageRoute);

app.get('/', (req, res) => res.send('BharatLoanMS API Running'));

app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
