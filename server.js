const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = process.env.PORT || 3000;
const PUBLIC_DIR = path.resolve(__dirname);
const USERS_FILE = path.join(PUBLIC_DIR, 'users.json');

const mimeTypes = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.ico': 'image/x-icon',
};

const ensureUsersFile = () => {
  try {
    if (!fs.existsSync(USERS_FILE)) {
      fs.writeFileSync(USERS_FILE, JSON.stringify({}), 'utf8');
    }
  } catch (error) {
    console.error('Unable to create users file:', error);
  }
};

const readUsers = () => {
  try {
    const raw = fs.readFileSync(USERS_FILE, 'utf8');
    return raw ? JSON.parse(raw) : {};
  } catch (error) {
    console.error('Unable to read users file:', error);
    return {};
  }
};

const saveUsers = (users) => {
  try {
    fs.writeFileSync(USERS_FILE, JSON.stringify(users, null, 2), 'utf8');
  } catch (error) {
    console.error('Unable to save users file:', error);
  }
};

const parseBody = (req) => new Promise((resolve) => {
  const contentType = req.headers['content-type'] || '';
  let body = '';
  req.on('data', (chunk) => { body += chunk.toString(); });
  req.on('end', () => {
    if (contentType.includes('application/json')) {
      try { resolve(JSON.parse(body || '{}')); } catch { resolve({}); }
      return;
    }
    if (contentType.includes('application/x-www-form-urlencoded')) {
      const params = new URLSearchParams(body);
      const obj = {};
      for (const [key, value] of params.entries()) obj[key] = value;
      resolve(obj);
      return;
    }
    resolve({});
  });
});

const sendJson = (res, status, data) => {
  res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8' });
  res.end(JSON.stringify(data));
};

const serveStatic = (req, res) => {
  let filePath = path.join(PUBLIC_DIR, req.url === '/' ? '/index.html' : req.url);
  const ext = path.extname(filePath).toLowerCase();
  if (!ext) filePath += '.html';
  if (!filePath.startsWith(PUBLIC_DIR)) {
    res.writeHead(403);
    return res.end('Forbidden');
  }

  fs.readFile(filePath, (err, data) => {
    if (err) {
      res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
      return res.end('Not found');
    }
    res.writeHead(200, { 'Content-Type': mimeTypes[ext] || 'application/octet-stream' });
    res.end(data);
  });
};

const handleApi = async (req, res) => {
  if (req.method !== 'POST') {
    return sendJson(res, 405, { success: false, message: 'Method not allowed' });
  }

  const body = await parseBody(req);
  const users = readUsers();

  if (req.url === '/register') {
    const { fullName, email, username, password, confirmPassword } = body;
    if (!fullName || !email || !username || !password || !confirmPassword) {
      return sendJson(res, 400, { success: false, message: 'يرجى ملء جميع الحقول.' });
    }
    if (password !== confirmPassword) {
      return sendJson(res, 400, { success: false, message: 'كلمتا المرور غير متطابقتين.' });
    }
    if (users[username]) {
      return sendJson(res, 409, { success: false, message: 'اسم المستخدم موجود بالفعل.' });
    }
    users[username] = { fullName, email, password };
    saveUsers(users);
    return sendJson(res, 201, { success: true, message: 'تم إنشاء الحساب بنجاح.' });
  }

  if (req.url === '/login') {
    const { username, password } = body;
    if (!username || !password) {
      return sendJson(res, 400, { success: false, message: 'يرجى إدخال اسم المستخدم وكلمة المرور.' });
    }
    const user = users[username];
    if (!user) {
      return sendJson(res, 401, { success: false, message: 'اسم المستخدم غير موجود.' });
    }
    if (user.password !== password) {
      return sendJson(res, 401, { success: false, message: 'كلمة المرور غير صحيحة.' });
    }
    return sendJson(res, 200, { success: true, message: 'تم تسجيل الدخول بنجاح.', user: { fullName: user.fullName, email: user.email, username } });
  }

  sendJson(res, 404, { success: false, message: 'API endpoint غير موجود.' });
};

ensureUsersFile();

const server = http.createServer((req, res) => {
  if (req.url === '/login' || req.url === '/register') {
    return handleApi(req, res);
  }
  return serveStatic(req, res);
});

server.listen(PORT, () => {
  console.log(`Server listening on http://localhost:${PORT}`);
});
