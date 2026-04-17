import express from 'express';
import cors from 'cors';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import path from 'path';
import fs from 'fs';
import { createServer as createViteServer } from 'vite';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const JWT_SECRET = process.env.JWT_SECRET || 'crescent-university-secret-key';
const DB_FILE = path.join(__dirname, 'db.json');

// Initial Data
const initialData = {
  users: [
    {
      id: '1',
      name: 'Admin User',
      email: 'admin@crescent.edu.ng',
      password: bcrypt.hashSync('admin123', 10),
      role: 'Admin',
      departmentId: '1',
      status: 'Active',
      createdAt: new Date().toISOString()
    },
    {
      id: '2',
      name: 'Store Officer',
      email: 'store@crescent.edu.ng',
      password: bcrypt.hashSync('store123', 10),
      role: 'Store Officer',
      departmentId: '1',
      status: 'Active',
      createdAt: new Date().toISOString()
    }
  ],
  departments: [
    { id: '1', name: 'ICT' },
    { id: '2', name: 'Engineering' },
    { id: '3', name: 'Social Sciences' },
    { id: '4', name: 'Management Sciences' }
  ],
  categories: [
    { id: '1', name: 'Laptops' },
    { id: '2', name: 'Printers' },
    { id: '3', name: 'Furniture' },
    { id: '4', name: 'Networking Gear' }
  ],
  assets: [],
  allocations: [],
  auditLogs: []
};

// Database Layer
const getDb = () => {
  if (!fs.existsSync(DB_FILE)) {
    fs.writeFileSync(DB_FILE, JSON.stringify(initialData, null, 2));
    return initialData;
  }
  return JSON.parse(fs.readFileSync(DB_FILE, 'utf-8'));
};

const saveDb = (data: any) => {
  fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2));
};

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(cors());
  app.use(express.json());

  // --- Authentication Middleware ---
  const authenticateToken = (req: any, res: any, next: any) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) return res.sendStatus(401);

    jwt.verify(token, JWT_SECRET, (err: any, user: any) => {
      if (err) return res.sendStatus(403);
      req.user = user;
      next();
    });
  };

  // --- Auth Routes ---
  app.post('/api/auth/login', (req, res) => {
    const { email, password } = req.body;
    const db = getDb();
    const user = db.users.find((u: any) => u.email === email);

    if (user && bcrypt.compareSync(password, user.password)) {
      const token = jwt.sign({ id: user.id, email: user.email, role: user.role }, JWT_SECRET);
      const { password: _, ...userWithoutPassword } = user;
      res.json({ token, user: userWithoutPassword });
    } else {
      res.status(401).json({ message: 'Invalid credentials' });
    }
  });

  // --- Asset Routes ---
  app.get('/api/assets', authenticateToken, (req, res) => {
    const db = getDb();
    res.json(db.assets);
  });

  app.get('/api/allocations', authenticateToken, (req, res) => {
    const db = getDb();
    res.json(db.allocations);
  });

  app.post('/api/assets', authenticateToken, (req, res) => {
    const db = getDb();
    const newAsset = {
      ...req.body,
      id: Date.now().toString(),
      createdAt: new Date().toISOString()
    };
    db.assets.push(newAsset);
    
    // Audit Log
    db.auditLogs.push({
      id: Date.now().toString(),
      userId: (req as any).user.id,
      userName: (req as any).user.email,
      action: 'Asset Registration',
      details: `Registered asset: ${newAsset.name} (${newAsset.assetId})`,
      timestamp: new Date().toISOString()
    });

    saveDb(db);
    res.status(201).json(newAsset);
  });

  app.put('/api/assets/:id', authenticateToken, (req, res) => {
    const db = getDb();
    const index = db.assets.findIndex((a: any) => a.id === req.params.id);
    if (index !== -1) {
      db.assets[index] = { ...db.assets[index], ...req.body };
      
      // Audit Log
      db.auditLogs.push({
        id: Date.now().toString(),
        userId: (req as any).user.id,
        userName: (req as any).user.email,
        action: 'Asset Update',
        details: `Updated asset: ${db.assets[index].name}`,
        timestamp: new Date().toISOString()
      });

      saveDb(db);
      res.json(db.assets[index]);
    } else {
      res.status(404).json({ message: 'Asset not found' });
    }
  });

  app.delete('/api/assets/:id', authenticateToken, (req, res) => {
    const db = getDb();
    const asset = db.assets.find((a: any) => a.id === req.params.id);
    if (!asset) return res.status(404).json({ message: 'Asset not found' });

    db.assets = db.assets.filter((a: any) => a.id !== req.params.id);
    
    // Audit Log
    db.auditLogs.push({
      id: Date.now().toString(),
      userId: (req as any).user.id,
      userName: (req as any).user.email,
      action: 'Asset Deletion',
      details: `Deleted asset: ${asset.name} (${asset.assetId})`,
      timestamp: new Date().toISOString()
    });

    saveDb(db);
    res.sendStatus(204);
  });

  // --- Allocation Routes ---
  app.post('/api/allocations', authenticateToken, (req, res) => {
    const db = getDb();
    const { assetId, userId, notes } = req.body;
    
    const assetIndex = db.assets.findIndex((a: any) => a.id === assetId);
    if (assetIndex === -1) return res.status(404).json({ message: 'Asset not found' });
    if (db.assets[assetIndex].status === 'Allocated') return res.status(400).json({ message: 'Asset already allocated' });

    const newAllocation = {
      id: Date.now().toString(),
      assetId,
      userId,
      notes,
      allocationDate: new Date().toISOString(),
      status: 'Active'
    };

    db.allocations.push(newAllocation);
    db.assets[assetIndex].status = 'Allocated';
    
    // Audit Log
    db.auditLogs.push({
      id: Date.now().toString(),
      userId: (req as any).user.id,
      userName: (req as any).user.email,
      action: 'Asset Allocation',
      details: `Allocated asset ${db.assets[assetIndex].name} to user ${userId}`,
      timestamp: new Date().toISOString()
    });

    saveDb(db);
    res.status(201).json(newAllocation);
  });

  app.post('/api/allocations/:id/return', authenticateToken, (req, res) => {
    const db = getDb();
    const allocationIndex = db.allocations.findIndex((a: any) => a.id === req.params.id);
    if (allocationIndex === -1) return res.status(404).json({ message: 'Allocation not found' });

    const allocation = db.allocations[allocationIndex];
    allocation.status = 'Returned';
    allocation.returnDate = new Date().toISOString();

    const assetIndex = db.assets.findIndex((a: any) => a.id === allocation.assetId);
    if (assetIndex !== -1) {
      db.assets[assetIndex].status = 'Available';
    }

    // Audit Log
    db.auditLogs.push({
      id: Date.now().toString(),
      userId: (req as any).user.id,
      userName: (req as any).user.email,
      action: 'Asset Return',
      details: `Returned asset ${db.assets[assetIndex]?.name || allocation.assetId}`,
      timestamp: new Date().toISOString()
    });

    saveDb(db);
    res.json(allocation);
  });

  // --- Metadata Routes ---
  app.get('/api/departments', authenticateToken, (req, res) => res.json(getDb().departments));
  app.get('/api/categories', authenticateToken, (req, res) => res.json(getDb().categories));
  app.get('/api/users', authenticateToken, (req, res) => {
    const users = getDb().users.map(({ password, ...u }: any) => u);
    res.json(users);
  });

  app.post('/api/users', authenticateToken, (req, res) => {
    const db = getDb();
    const newUser = {
      ...req.body,
      id: Date.now().toString(),
      password: bcrypt.hashSync(req.body.password || 'crescent123', 10),
      status: 'Active',
      createdAt: new Date().toISOString()
    };
    db.users.push(newUser);
    
    // Audit Log
    db.auditLogs.push({
      id: Date.now().toString(),
      userId: (req as any).user.id,
      userName: (req as any).user.email,
      action: 'User Creation',
      details: `Created new user: ${newUser.name} (${newUser.role})`,
      timestamp: new Date().toISOString()
    });

    saveDb(db);
    const { password: _, ...userWithoutPassword } = newUser;
    res.status(201).json(userWithoutPassword);
  });

  app.put('/api/users/:id', authenticateToken, (req, res) => {
    const db = getDb();
    const index = db.users.findIndex((u: any) => u.id === req.params.id);
    if (index !== -1) {
      const { password, ...updateData } = req.body;
      db.users[index] = { ...db.users[index], ...updateData };
      
      if (password) {
        db.users[index].password = bcrypt.hashSync(password, 10);
      }

      // Audit Log
      db.auditLogs.push({
        id: Date.now().toString(),
        userId: (req as any).user.id,
        userName: (req as any).user.email,
        action: 'User Update',
        details: `Updated user: ${db.users[index].name}`,
        timestamp: new Date().toISOString()
      });

      saveDb(db);
      const { password: _, ...userWithoutPassword } = db.users[index];
      res.json(userWithoutPassword);
    } else {
      res.status(404).json({ message: 'User not found' });
    }
  });

  app.delete('/api/users/:id', authenticateToken, (req, res) => {
    const db = getDb();
    const user = db.users.find((u: any) => u.id === req.params.id);
    if (!user) return res.status(404).json({ message: 'User not found' });

    db.users = db.users.filter((u: any) => u.id !== req.params.id);
    
    // Audit Log
    db.auditLogs.push({
      id: Date.now().toString(),
      userId: (req as any).user.id,
      userName: (req as any).user.email,
      action: 'User Deletion',
      details: `Deleted user: ${user.name} (${user.email})`,
      timestamp: new Date().toISOString()
    });

    saveDb(db);
    res.sendStatus(204);
  });

  app.get('/api/audit-logs', authenticateToken, (req, res) => res.json(getDb().auditLogs));

  // --- Vite Integration ---
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
