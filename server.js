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
  console.error('❌ ERRO: Variável MONGODB_URI não definida no ambiente.');
  process.exit(1);
}

mongoose.connect(MONGODB_URI, { dbName: DB_NAME })
  .then(() => console.log('✅ Conectado ao MongoDB Atlas com sucesso!'))
  .catch(err => {
    console.error('❌ Falha ao conectar ao MongoDB:', err.message);
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

// ========== FUNÇÕES DE NEGÓCIO ==========
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

// ========== MIDDLEWARE E ARQUIVOS ESTÁTICOS ==========
app.use(express.static('public'));           // Para index.html e assets
app.use('/template', express.static('template'));     // Para os PDFs
app.use('/templates2', express.static('templates2')); // Para os ODTs

// ========== ROTAS ==========
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.get('/health', (req, res) => {
  res.status(200).json({ status: 'ok', timestamp: new Date().toISOString() });
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
    res.status(500).json({ error: 'Erro interno do servidor' });
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
    res.json({ success: true, message: 'Contador resetado com sucesso' });
  } catch (error) {
    console.error('Erro ao resetar contador:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// ========== INICIA SERVIDOR ==========
app.listen(PORT, () => {
  console.log(`🚀 Servidor rodando na porta ${PORT}`);
});
