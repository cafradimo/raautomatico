require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { MongoClient } = require('mongodb');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

// Serve os arquivos estáticos (template e public)
app.use('/template', express.static('template'));
app.use(express.static('public'));

// -------------------------------------------
// CONEXÃO COM O MONGODB ATLAS
// -------------------------------------------
const uri = process.env.MONGODB_URI;
if (!uri) {
    console.error("❌ ERRO: Variável de ambiente MONGODB_URI não definida no arquivo .env!");
    process.exit(1);
}

const client = new MongoClient(uri);
let db;

async function connectDB() {
    try {
        await client.connect();
        db = client.db('contadorDB');
        console.log('✅ Conectado ao MongoDB Atlas com sucesso!');
    } catch (error) {
        console.error('❌ Falha ao conectar no MongoDB:', error);
        process.exit(1);
    }
}
connectDB();

// -------------------------------------------
// FUNÇÕES AUXILIARES
// -------------------------------------------
function chaveContador(modelo, matricula) {
    return `${modelo}_${matricula}`;
}

// -------------------------------------------
// ROTA PRINCIPAL - GERAR PRÓXIMO RA
// -------------------------------------------
app.get('/api/next-ra/:modelo/:matricula', async (req, res) => {
    const { modelo, matricula } = req.params;
    const ano = new Date().getFullYear();

    if (!db) {
        return res.status(500).json({ error: 'Banco de dados não conectado' });
    }

    const chave = chaveContador(modelo, matricula);
    const collection = db.collection('counters');

    try {
        const result = await collection.findOneAndUpdate(
            { _id: chave },
            { $inc: { valor: 1 } },
            { upsert: true, returnDocument: 'after' }
        );

        const contadorAtual = result.value ? result.value.valor : 1;
        const sequencial = String(contadorAtual).padStart(4, '0');
        const raCompleto = `${modelo}-${ano}${String(matricula).padStart(4, '0')}-${sequencial}`;

        res.json({
            modelo,
            matricula,
            ano,
            sequencial: contadorAtual,
            ra: raCompleto
        });
    } catch (error) {
        console.error('Erro ao gerar RA:', error);
        res.status(500).json({ error: 'Erro interno ao gerar RA' });
    }
});

// -------------------------------------------
// ROTA PARA RESETAR (ZERAR) UM CONTADOR
// -------------------------------------------
app.post('/api/reset-ra/:modelo/:matricula', async (req, res) => {
    const { modelo, matricula } = req.params;
    const chave = chaveContador(modelo, matricula);

    if (!db) {
        return res.status(500).json({ error: 'Banco de dados não conectado' });
    }

    try {
        const collection = db.collection('counters');
        await collection.updateOne(
            { _id: chave },
            { $set: { valor: 0 } },
            { upsert: true }
        );
        res.json({ message: 'Contador resetado com sucesso', chave, valor: 0 });
    } catch (error) {
        console.error('Erro ao resetar:', error);
        res.status(500).json({ error: 'Erro interno ao resetar' });
    }
});

// -------------------------------------------
// ROTA PARA LISTAR TODOS OS CONTADORES
// -------------------------------------------
app.get('/api/contadores', async (req, res) => {
    if (!db) {
        return res.status(500).json({ error: 'Banco de dados não conectado' });
    }
    try {
        const collection = db.collection('counters');
        const documentos = await collection.find({}).toArray();
        const contadores = {};
        documentos.forEach(doc => {
            contadores[doc._id] = doc.valor;
        });
        res.json(contadores);
    } catch (error) {
        console.error('Erro ao listar contadores:', error);
        res.status(500).json({ error: 'Erro interno ao listar' });
    }
});

// -------------------------------------------
// ROTA PARA ATUALIZAR MANUALMENTE
// -------------------------------------------
app.post('/api/update-contador', async (req, res) => {
    const { chave, valor } = req.body;
    if (!chave || valor === undefined || valor < 0) {
        return res.status(400).json({ error: 'Dados inválidos' });
    }

    if (!db) {
        return res.status(500).json({ error: 'Banco de dados não conectado' });
    }

    try {
        const collection = db.collection('counters');
        await collection.updateOne(
            { _id: chave },
            { $set: { valor: valor } },
            { upsert: true }
        );
        res.json({ message: 'Contador atualizado', chave, valor });
    } catch (error) {
        console.error('Erro ao atualizar:', error);
        res.status(500).json({ error: 'Erro interno ao atualizar' });
    }
});

// -------------------------------------------
// INICIA O SERVIDOR
// -------------------------------------------
app.listen(PORT, () => {
    console.log(`🚀 Servidor rodando em http://localhost:${PORT}`);
});