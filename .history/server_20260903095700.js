const express = require('express');
const fs = require('fs/promises');
const path = require('path');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const cookieParser = require('cookie-parser');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');

const app = express();
const PORT = process.env.PORT || 3000;
const JWT_SECRET = process.env.JWT_SECRET || 'chave_secreta_super_segura_restaurante_irmao';
const DB_PATH = path.join(__dirname, 'database.json');

// Middlewares de Segurança
app.use(helmet({ contentSecurityPolicy: false }));
app.use(express.json());
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));

// Rate Limiting para evitar força bruta na autenticação
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: { error: 'Muitas tentativas de login. Tente novamente mais tarde.' }
});

// Funções Utilitárias I/O Assíncronas
async function readDB() {
  const data = await fs.readFile(DB_PATH, 'utf-8');
  return JSON.parse(data);
}

async function writeDB(data) {
  await fs.writeFile(DB_PATH, JSON.stringify(data, null, 2), 'utf-8');
}

// Middleware de Autenticação JWT
function authenticateToken(req, res, next) {
  const token = req.cookies.token || req.headers['authorization']?.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'Acesso não autorizado.' });

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) return res.status(403).json({ error: 'Sessão inválida ou expirada.' });
    req.user = user;
    next();
  });
}

// Middleware de Autorização RBAC
function authorizeRoles(...roles) {
  return (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ error: 'Permissão insuficiente para esta ação.' });
    }
    next();
  };
}

// ROTAS PÚBLICAS

// Obter Dados Públicos do Cardápio e Configurações
app.get('/api/public/data', async (req, res) => {
  try {
    const db = await readDB();
    res.json({
      config: db.config,
      menu: db.menu
    });
  } catch (err) {
    res.status(500).json({ error: 'Erro ao carregar dados.' });
  }
});

// Login
app.post('/api/auth/login', authLimiter, async (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) return res.status(400).json({ error: 'Dados incompletos.' });

  try {
    const db = await readDB();
    const user = db.users.find(u => u.username === username);
    if (!user) return res.status(401).json({ error: 'Usuário ou senha incorretos.' });

    const validPassword = await bcrypt.compare(password, user.passwordHash);
    if (!validPassword) return res.status(401).json({ error: 'Usuário ou senha incorretos.' });

    const token = jwt.sign(
      { id: user.id, username: user.username, role: user.role },
      JWT_SECRET,
      { expiresIn: '8h' }
    );

    res.cookie('token', token, {
      httpOnly: true,
      secure: false, // Alterar para true em produção com HTTPS
      sameSite: 'strict',
      maxAge: 8 * 3600 * 1000
    });

    res.json({ message: 'Autenticado com sucesso', role: user.role, token });
  } catch (err) {
    res.status(500).json({ error: 'Erro no servidor.' });
  }
});

// Logout
app.post('/api/auth/logout', (req, res) => {
  res.clearCookie('token');
  res.json({ message: 'Logout realizado.' });
});

// ROTAS PRIVADAS (GERENTE & ADMIN)

// Atualizar Disponibilidade de Item (Gerente & Admin)
app.patch('/api/admin/menu/availability', authenticateToken, authorizeRoles('admin', 'gerente'), async (req, res) => {
  const { category, id, available } = req.body;
  if (!category || !id || typeof available !== 'boolean') {
    return res.status(400).json({ error: 'Parâmetros inválidos.' });
  }

  try {
    const db = await readDB();
    const item = db.menu[category]?.find(i => i.id === id);
    if (!item) return res.status(404).json({ error: 'Item não encontrado.' });

    item.available = available;
    await writeDB(db);
    res.json({ message: 'Status atualizado com sucesso.' });
  } catch (err) {
    res.status(500).json({ error: 'Erro ao atualizar item.' });
  }
});

// ROTAS EXCLUSIVAS (ADMIN)

// Atualizar Configurações Gerais
app.put('/api/admin/config', authenticateToken, authorizeRoles('admin'), async (req, res) => {
  const { marmitaPrice, deliveryFee, pixKey, whatsappNumber } = req.body;

  try {
    const db = await readDB();
    if (marmitaPrice !== undefined) db.config.marmitaPrice = Number(marmitaPrice);
    if (deliveryFee !== undefined) db.config.deliveryFee = Number(deliveryFee);
    if (pixKey) db.config.pixKey = String(pixKey).trim();
    if (whatsappNumber) db.config.whatsappNumber = String(whatsappNumber).replace(/\D/g, '');

    await writeDB(db);
    res.json({ message: 'Configurações atualizadas com sucesso.', config: db.config });
  } catch (err) {
    res.status(500).json({ error: 'Erro ao salvar configurações.' });
  }
});

// Atualizar Preço de Item Individual (Bebidas/Sobremesas)
app.patch('/api/admin/menu/price', authenticateToken, authorizeRoles('admin'), async (req, res) => {
  const { category, id, price } = req.body;
  if (!['drinks', 'desserts'].includes(category) || !id || price === undefined) {
    return res.status(400).json({ error: 'Dados inválidos.' });
  }

  try {
    const db = await readDB();
    const item = db.menu[category]?.find(i => i.id === id);
    if (!item) return res.status(404).json({ error: 'Item não encontrado.' });

    item.price = Number(price);
    await writeDB(db);
    res.json({ message: 'Preço atualizado com sucesso.' });
  } catch (err) {
    res.status(500).json({ error: 'Erro ao atualizar preço.' });
  }
});

// Alterar Senha de Usuário (Gerente ou Admin)
app.put('/api/admin/users/password', authenticateToken, authorizeRoles('admin'), async (req, res) => {
  const { username, newPassword } = req.body;
  if (!username || !newPassword || newPassword.length < 6) {
    return res.status(400).json({ error: 'Senha deve ter no mínimo 6 caracteres.' });
  }

  try {
    const db = await readDB();
    const user = db.users.find(u => u.username === username);
    if (!user) return res.status(404).json({ error: 'Usuário não encontrado.' });

    user.passwordHash = await bcrypt.hash(newPassword, 10);
    await writeDB(db);
    res.json({ message: `Senha do usuário ${username} alterada com sucesso.` });
  } catch (err) {
    res.status(500).json({ error: 'Erro ao alterar senha.' });
  }
});

app.listen(PORT, () => {
  console.log(`[RESTAURANTE DO IRMÃO] Servidor rodando em http://localhost:${PORT}`);
});