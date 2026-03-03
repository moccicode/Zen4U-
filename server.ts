import express from "express";
import { createServer as createViteServer } from "vite";
import Database from "better-sqlite3";
import path from "path";
import * as cheerio from "cheerio";
import { Server } from "socket.io";
import { createServer } from "http";
import multer from "multer";
import fs from "fs";

const db = new Database("zen4u.db");

// Ensure uploads directory exists
const uploadsDir = path.join(process.cwd(), "uploads");
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir);
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/');
  },
  filename: (req, file, cb) => {
    cb(null, Date.now() + '-' + file.originalname);
  }
});
const upload = multer({ storage });

// Initialize database
db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    company TEXT,
    department TEXT,
    name TEXT,
    email TEXT UNIQUE,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS memos (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    article_url TEXT,
    content TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    is_favorite INTEGER DEFAULT 0
  );

  CREATE TABLE IF NOT EXISTS posts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER,
    category TEXT,
    title TEXT,
    content TEXT,
    link_url TEXT,
    link_title TEXT,
    link_description TEXT,
    link_image TEXT,
    file_url TEXT,
    file_name TEXT,
    view_count INTEGER DEFAULT 0,
    like_count INTEGER DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(user_id) REFERENCES users(id)
  );

  CREATE TABLE IF NOT EXISTS comments (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    post_id INTEGER,
    user_id INTEGER,
    content TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(post_id) REFERENCES posts(id),
    FOREIGN KEY(user_id) REFERENCES users(id)
  );

  CREATE TABLE IF NOT EXISTS notifications (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER,
    type TEXT,
    message TEXT,
    is_read INTEGER DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(user_id) REFERENCES users(id)
  );
`);

async function startServer() {
  const app = express();
  const httpServer = createServer(app);
  const io = new Server(httpServer);
  const PORT = 3000;

  app.use(express.json());
  app.use("/uploads", express.static("uploads"));
  app.get("/앵커 나현.png", (req, res) => {
    res.sendFile(path.join(process.cwd(), "앵커 나현.png"));
  });

  // Socket.io connection
  io.on("connection", (socket) => {
    socket.on("join", (userId) => {
      socket.join(`user_${userId}`);
    });
  });

  // Helper to send notification
  const sendNotification = (userId: number, type: string, message: string) => {
    const info = db.prepare("INSERT INTO notifications (user_id, type, message) VALUES (?, ?, ?)").run(userId, type, message);
    io.to(`user_${userId}`).emit("notification", {
      id: info.lastInsertRowid,
      type,
      message,
      created_at: new Date().toISOString()
    });
  };

  // Auth Routes
  app.post("/api/auth/signup", (req, res) => {
    const { company, department, name, email } = req.body;
    try {
      const info = db.prepare("INSERT INTO users (company, department, name, email) VALUES (?, ?, ?, ?)").run(company, department, name, email);
      const user = db.prepare("SELECT * FROM users WHERE id = ?").get(info.lastInsertRowid);
      res.json(user);
    } catch (error) {
      res.status(400).json({ error: "Email already exists" });
    }
  });

  app.post("/api/auth/login", (req, res) => {
    const { email } = req.body;
    const user = db.prepare("SELECT * FROM users WHERE email = ?").get(email);
    if (user) {
      res.json(user);
    } else {
      res.status(404).json({ error: "User not found" });
    }
  });

  // API Routes
  app.get("/api/memos", (req, res) => {
    const memos = db.prepare("SELECT * FROM memos ORDER BY created_at DESC").all();
    res.json(memos);
  });

  app.post("/api/memos", (req, res) => {
    const { article_url, content } = req.body;
    const info = db.prepare("INSERT INTO memos (article_url, content) VALUES (?, ?)").run(article_url, content);
    res.json({ id: info.lastInsertRowid });
  });

  app.put("/api/memos/:id", (req, res) => {
    const { id } = req.params;
    const { content, is_favorite } = req.body;
    
    try {
      if (content !== undefined) {
        db.prepare("UPDATE memos SET content = ? WHERE id = ?").run(content, id);
      }
      if (is_favorite !== undefined) {
        db.prepare("UPDATE memos SET is_favorite = ? WHERE id = ?").run(is_favorite ? 1 : 0, id);
      }
      res.json({ success: true });
    } catch (error: any) {
      console.error("[Server] Update error:", error);
      res.status(500).json({ error: error.message });
    }
  });

  app.delete("/api/memos/:id", (req, res) => {
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      return res.status(400).json({ error: "Invalid ID" });
    }
    try {
      const info = db.prepare("DELETE FROM memos WHERE id = ?").run(id);
      if (info.changes > 0) {
        res.json({ success: true });
      } else {
        res.status(404).json({ error: "Memo not found" });
      }
    } catch (error: any) {
      console.error("[Server] Delete error:", error);
      res.status(500).json({ error: error.message });
    }
  });

  // New endpoint to fetch article content
  app.post("/api/fetch-article", async (req, res) => {
    const { url } = req.body;
    if (!url) return res.status(400).json({ error: "URL is required" });

    try {
      const response = await fetch(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
        }
      });
      const html = await response.text();
      const $ = cheerio.load(html);

      // Remove scripts, styles, and other noise
      $('script, style, nav, footer, header, aside, .ads, #ads').remove();

      // Try to find the main content
      let content = $('article').text() || $('main').text() || $('body').text();
      
      // Clean up whitespace
      content = content.replace(/\s+/g, ' ').trim().substring(0, 15000); // Limit to 15k chars for Gemini

      res.json({ content });
    } catch (error) {
      console.error("Error fetching article:", error);
      res.status(500).json({ error: "Failed to fetch article content" });
    }
  });

  // Community Routes
  app.get("/api/posts", (req, res) => {
    const { category, search, sort } = req.query;
    let query = `
      SELECT p.*, u.name as user_name, u.company as user_company,
      (SELECT COUNT(*) FROM comments WHERE post_id = p.id) as comment_count
      FROM posts p
      JOIN users u ON p.user_id = u.id
      WHERE 1=1
    `;
    const params: any[] = [];

    if (category) {
      query += " AND p.category = ?";
      params.push(category);
    }
    if (search) {
      query += " AND (p.title LIKE ? OR p.content LIKE ?)";
      params.push(`%${search}%`, `%${search}%`);
    }

    if (sort === 'popular') {
      query += " ORDER BY p.like_count DESC, p.created_at DESC";
    } else {
      query += " ORDER BY p.created_at DESC";
    }

    const posts = db.prepare(query).all(...params);
    res.json(posts);
  });

  app.post("/api/posts", upload.single('file'), async (req: any, res) => {
    const { user_id, category, title, content, link_url } = req.body;
    const file = req.file;

    let link_title = null;
    let link_description = null;
    let link_image = null;

    if (link_url) {
      try {
        const response = await fetch(link_url);
        const html = await response.text();
        const $ = cheerio.load(html);
        link_title = $('meta[property="og:title"]').attr('content') || $('title').text();
        link_description = $('meta[property="og:description"]').attr('content') || $('meta[name="description"]').attr('content');
        link_image = $('meta[property="og:image"]').attr('content');
      } catch (err) {
        console.error('Error fetching link preview:', err);
      }
    }
    
    const info = db.prepare(`
      INSERT INTO posts (user_id, category, title, content, link_url, link_title, link_description, link_image, file_url, file_name)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(user_id, category, title, content, link_url, link_title, link_description, link_image, file ? `/uploads/${file.filename}` : null, file ? file.originalname : null);
    
    res.json({ id: info.lastInsertRowid });
  });

  app.get("/api/posts/:id", (req, res) => {
    const { id } = req.params;
    db.prepare("UPDATE posts SET view_count = view_count + 1 WHERE id = ?").run(id);
    const post = db.prepare(`
      SELECT p.*, u.name as user_name, u.company as user_company,
      (SELECT COUNT(*) FROM comments WHERE post_id = p.id) as comment_count
      FROM posts p
      JOIN users u ON p.user_id = u.id
      WHERE p.id = ?
    `).get(id);
    res.json(post);
  });

  app.put("/api/posts/:id", upload.single('file'), async (req: any, res) => {
    const { id } = req.params;
    const { category, title, content, link_url } = req.body;
    const file = req.file;

    let link_title = null;
    let link_description = null;
    let link_image = null;

    if (link_url) {
      try {
        const response = await fetch(link_url);
        const html = await response.text();
        const $ = cheerio.load(html);
        link_title = $('meta[property="og:title"]').attr('content') || $('title').text();
        link_description = $('meta[property="og:description"]').attr('content') || $('meta[name="description"]').attr('content');
        link_image = $('meta[property="og:image"]').attr('content');
      } catch (err) {
        console.error('Error fetching link preview:', err);
      }
    }

    try {
      let query = "UPDATE posts SET category = ?, title = ?, content = ?, link_url = ?, link_title = ?, link_description = ?, link_image = ?";
      const params = [category, title, content, link_url, link_title, link_description, link_image];

      if (file) {
        query += ", file_url = ?, file_name = ?";
        params.push(`/uploads/${file.filename}`, file.originalname);
      }

      query += " WHERE id = ?";
      params.push(id);

      db.prepare(query).run(...params);
      res.json({ success: true });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.delete("/api/posts/:id", (req, res) => {
    const { id } = req.params;
    db.prepare("DELETE FROM comments WHERE post_id = ?").run(id);
    db.prepare("DELETE FROM posts WHERE id = ?").run(id);
    res.json({ success: true });
  });

  app.post("/api/posts/:id/like", (req, res) => {
    const { id } = req.params;
    db.prepare("UPDATE posts SET like_count = like_count + 1 WHERE id = ?").run(id);
    res.json({ success: true });
  });

  app.get("/api/posts/:id/comments", (req, res) => {
    const { id } = req.params;
    const comments = db.prepare(`
      SELECT c.*, u.name as user_name
      FROM comments c
      JOIN users u ON c.user_id = u.id
      WHERE c.post_id = ?
      ORDER BY c.created_at ASC
    `).all(id);
    res.json(comments);
  });

  app.post("/api/comments", (req, res) => {
    const { post_id, user_id, content } = req.body;
    const info = db.prepare("INSERT INTO comments (post_id, user_id, content) VALUES (?, ?, ?)").run(post_id, user_id, content);
    
    // Notify post owner
    const post = db.prepare("SELECT user_id, title FROM posts WHERE id = ?").get(post_id);
    if (post && post.user_id !== user_id) {
      sendNotification(post.user_id, 'comment', `내 게시글 "${post.title}"에 새로운 댓글이 달렸습니다.`);
    }

    // Handle mentions
    const mentions = content.match(/@(\S+)/g);
    if (mentions) {
      mentions.forEach((mention: string) => {
        const name = mention.substring(1);
        const mentionedUser = db.prepare("SELECT id FROM users WHERE name = ?").get(name);
        if (mentionedUser && mentionedUser.id !== user_id) {
          sendNotification(mentionedUser.id, 'mention', `게시글 댓글에서 당신을 언급했습니다.`);
        }
      });
    }

    res.json({ id: info.lastInsertRowid });
  });

  app.get("/api/notifications/:userId", (req, res) => {
    const { userId } = req.params;
    const notifications = db.prepare("SELECT * FROM notifications WHERE user_id = ? ORDER BY created_at DESC LIMIT 20").all(userId);
    res.json(notifications);
  });

  app.post("/api/notifications/:id/read", (req, res) => {
    const { id } = req.params;
    db.prepare("UPDATE notifications SET is_read = 1 WHERE id = ?").run(id);
    res.json({ success: true });
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.join(process.cwd(), "dist")));
    app.get("*", (req, res) => {
      res.sendFile(path.join(process.cwd(), "dist", "index.html"));
    });
  }

  httpServer.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
