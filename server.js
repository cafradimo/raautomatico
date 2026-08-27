const express = require('express');
const path = require('path');
const mongoose = require('mongoose');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

// ========== CONEXÃO COM MONGODB ==========
const MONGODB_URI = process.env.MONGODB_URI;
const DB_NAME = process.env.DB_NAME || 'contadorDB';

if (!MONGODB_URI) {
  console.error('❌ ERRO: Variável MONGODB_URI não definida no ambiente');
  process.exit(1);
}

mongoose.connect(MONGODB_URI, { dbName: DB_NAME })
  .then(() => console.log('✅ Conectado ao MongoDB Atlas'))
  .catch(err => {
    console.error('❌ Erro ao conectar ao MongoDB:', err.message);
    process.exit(1);
  });

// ========== SCHEMA E MODEL ==========
const contadorSchema = new mongoose.Schema({
  prefix: { type: String, required: true },
  matricula: { type: Number, required: true },
  ano: { type: Number, required: true },
  sequencial: { type: Number, default: 0 }
});

contadorSchema.index({ prefix: 1, matricula: 1, ano: 1 }, { unique: true });

const Contador = mongoose.model('Contador', contadorSchema);

// ========== FUNÇÕES ==========
async function getNextRA(prefix, matricula) {
  const ano = new Date().getFullYear();
  const filter = { prefix, matricula, ano };
  const update = { $inc: { sequencial: 1 } };
  const options = { upsert: true, new: true };

  const doc = await Contador.findOneAndUpdate(filter, update, options);
  const seq = String(doc.sequencial).padStart(4, '0');
  const matriculaStr = String(matricula).padStart(4, '0');
  return `${prefix}-${ano}${matriculaStr}-${seq}`;
}

async function resetContador(prefix, matricula) {
  const ano = new Date().getFullYear();
  await Contador.findOneAndDelete({ prefix, matricula, ano });
}

// ========== ROTAS ==========
app.use(express.static('public'));

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.get('/api/next-ra/:prefix/:matricula', async (req, res) => {
  try {
    const { prefix, matricula } = req.params;
    const matriculaNum = parseInt(matricula, 10);
    if (isNaN(matriculaNum)) {
      return res.status(400).json({ error: 'Matrícula inválida' });
    }
    const ra = await getNextRA(prefix, matriculaNum);
    const ano = new Date().getFullYear();
    res.json({ ra, ano });
  } catch (error) {
    console.error('Erro ao buscar próximo RA:', error);
    res.status(500).json({ error: 'Erro interno' });
  }
});

app.post('/api/reset-ra/:prefix/:matricula', async (req, res) => {
  try {
    const { prefix, matricula } = req.params;
    const matriculaNum = parseInt(matricula, 10);
    if (isNaN(matriculaNum)) {
      return res.status(400).json({ error: 'Matrícula inválida' });
    }
    await resetContador(prefix, matriculaNum);
    res.json({ success: true, message: 'Contador resetado' });
  } catch (error) {
    console.error('Erro ao resetar:', error);
    res.status(500).json({ error: 'Erro interno' });
  }
});

// ========== INICIAR ==========
app.listen(PORT, () => {
  console.log(`🚀 Servidor rodando na porta ${PORT}`);
});