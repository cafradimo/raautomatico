const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = 3000;

app.use(cors());
app.use(express.json());

// 👇 SERVE OS TEMPLATES PDF
app.use('/template', express.static('template'));

// 👇 SERVE O INDEX.HTML E OUTROS ESTÁTICOS
app.use(express.static('public'));

// ... (resto do seu código, contadores, rotas, etc.)

// Caminho do arquivo de contadores
const CONTADOR_FILE = path.join(__dirname, 'contador.json');

// Inicializa o arquivo se não existir
if (!fs.existsSync(CONTADOR_FILE)) {
    fs.writeFileSync(CONTADOR_FILE, JSON.stringify({}, null, 2));
}

// Lê o arquivo e retorna o objeto
function lerContadores() {
    try {
        const data = fs.readFileSync(CONTADOR_FILE, 'utf8');
        return JSON.parse(data);
    } catch {
        return {};
    }
}

// Escreve no arquivo
function salvarContadores(contadores) {
    fs.writeFileSync(CONTADOR_FILE, JSON.stringify(contadores, null, 2));
}

// Gera a chave única: modelo + matrícula
function chaveContador(modelo, matricula) {
    return `${modelo}_${matricula}`;
}

// Rota para obter o próximo número sequencial
app.get('/api/next-ra/:modelo/:matricula', (req, res) => {
    const { modelo, matricula } = req.params;
    const ano = new Date().getFullYear(); // ou fixo 2026 se preferir

    const chave = chaveContador(modelo, matricula);
    const contadores = lerContadores();

    // Se não existir, inicia do 1
    if (!contadores[chave]) {
        contadores[chave] = 0;
    }

    // Incrementa
    contadores[chave] += 1;
    salvarContadores(contadores);

    const sequencial = String(contadores[chave]).padStart(4, '0');
    const raCompleto = `${modelo}-${ano}${String(matricula).padStart(4, '0')}-${sequencial}`;

    res.json({
        modelo,
        matricula,
        ano,
        sequencial: contadores[chave],
        ra: raCompleto
    });
});

// Rota para resetar o contador de um modelo+matrícula (zerar)
app.post('/api/reset-ra/:modelo/:matricula', (req, res) => {
    const { modelo, matricula } = req.params;
    const chave = chaveContador(modelo, matricula);
    const contadores = lerContadores();

    if (contadores[chave] !== undefined) {
        contadores[chave] = 0;
        salvarContadores(contadores);
        res.json({ message: 'Contador resetado com sucesso', chave, valor: 0 });
    } else {
        res.status(404).json({ error: 'Contador não encontrado' });
    }
});

// Rota para listar todos os contadores (útil para edição manual)
app.get('/api/contadores', (req, res) => {
    const contadores = lerContadores();
    res.json(contadores);
});

// Rota para atualizar um contador manualmente (edição)
app.post('/api/update-contador', (req, res) => {
    const { chave, valor } = req.body;
    if (!chave || valor === undefined || valor < 0) {
        return res.status(400).json({ error: 'Dados inválidos' });
    }
    const contadores = lerContadores();
    contadores[chave] = valor;
    salvarContadores(contadores);
    res.json({ message: 'Contador atualizado', chave, valor });
});

app.listen(PORT, () => {
    console.log(`Servidor rodando em http://localhost:${PORT}`);
});