const express = require("express");
const helmet = require("helmet");
const session = require("express-session");
const pgSession = require("connect-pg-simple")(session);
const { Pool } = require("pg");
const rateLimit = require("express-rate-limit");
const nodemailer = require("nodemailer");
const crypto = require("crypto");
const path = require("path");

const app = express();
const PORT = Number(process.env.PORT || 3000);
const DATABASE_URL = process.env.DATABASE_URL;
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD;
const SESSION_SECRET = process.env.SESSION_SECRET;

if (!DATABASE_URL || !ADMIN_PASSWORD || !SESSION_SECRET) {
  console.error("Missing required environment variables: DATABASE_URL, ADMIN_PASSWORD, SESSION_SECRET");
  process.exit(1);
}

const pool = new Pool({
  connectionString: DATABASE_URL,
  ssl: process.env.PGSSLMODE === "disable" ? false : { rejectUnauthorized: false },
  max: 10,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 10000
});

const PRODUCTS = {
  "br-01": { name: "Brazilian Coffee", price: 450 },
  "br-02": { name: "Turkish Coffee", price: 400 },
  "br-03": { name: "Colombian Coffee", price: 450 },
  "br-04": { name: "Espresso Blend", price: 500 }
};
const STATUSES = ["New", "Confirmed", "Preparing", "Out for delivery", "Delivered", "Cancelled"];

app.set("trust proxy", 1);
app.use(helmet({ contentSecurityPolicy: false }));
app.use(express.json({ limit: "30kb" }));
app.use(express.urlencoded({ extended: false, limit: "10kb" }));

app.use(session({
  store: new pgSession({ pool, tableName: "user_sessions", createTableIfMissing: true }),
  name: "brue_admin",
  secret: SESSION_SECRET,
  resave: false,
  saveUninitialized: false,
  cookie: {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    maxAge: 8 * 60 * 60 * 1000
  }
}));

const orderLimiter = rateLimit({ windowMs: 15 * 60 * 1000, limit: 8, standardHeaders: "draft-7", legacyHeaders: false });
const loginLimiter = rateLimit({ windowMs: 15 * 60 * 1000, limit: 8, standardHeaders: "draft-7", legacyHeaders: false });

function requireAdmin(req, res, next) {
  if (req.session && req.session.isAdmin === true) return next();
  return res.status(401).json({ error: "Admin login required." });
}
function validText(value, max) {
  return typeof value === "string" && value.trim().length > 0 && value.trim().length <= max;
}
function safeEqual(a, b) {
  const aa = Buffer.from(String(a));
  const bb = Buffer.from(String(b));
  return aa.length === bb.length && crypto.timingSafeEqual(aa, bb);
}

app.get("/api/health", async (_req, res) => {
  try { await pool.query("SELECT 1"); res.json({ ok: true }); }
  catch { res.status(503).json({ ok: false }); }
});

app.post("/api/orders", orderLimiter, async (req, res) => {
  try {
    const { customer, items } = req.body || {};
    if (!customer || !validText(customer.name, 100) ||
        !validText(customer.phone, 30) ||
        !validText(customer.governorate, 60) ||
        !validText(customer.address, 500) ||
        (customer.notes != null && String(customer.notes).length > 1000)) {
      return res.status(400).json({ error: "Please check your name, phone, governorate and address." });
    }
    if (!Array.isArray(items) || items.length < 1 || items.length > 20) {
      return res.status(400).json({ error: "Your cart is empty or invalid." });
    }

    let total = 0;
    const cleanItems = [];
    for (const item of items) {
      const product = PRODUCTS[item && item.id];
      const qty = Number(item && item.qty);
      if (!product || !Number.isInteger(qty) || qty < 1 || qty > 30) {
        return res.status(400).json({ error: "One or more cart items are invalid." });
      }
      total += product.price * qty;
      cleanItems.push({ id: item.id, name: product.name, qty, price: product.price });
    }

    const result = await pool.query(
      `INSERT INTO orders (customer_name, phone, governorate, address, notes, items, total_egp)
       VALUES ($1,$2,$3,$4,$5,$6,$7)
       RETURNING id, created_at`,
      [customer.name.trim(), customer.phone.trim(), customer.governorate.trim(),
       customer.address.trim(), String(customer.notes || "").trim(),
       JSON.stringify(cleanItems), total]
    );
    const order = result.rows[0];

    if (process.env.SMTP_HOST && process.env.ORDER_ALERT_EMAIL) {
      try {
        const transporter = nodemailer.createTransport({
          host: process.env.SMTP_HOST,
          port: Number(process.env.SMTP_PORT || 587),
          secure: process.env.SMTP_SECURE === "true",
          auth: process.env.SMTP_USER ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASSWORD } : undefined
        });
        await transporter.sendMail({
          from: process.env.ORDER_FROM_EMAIL || process.env.SMTP_USER,
          to: process.env.ORDER_ALERT_EMAIL,
          subject: `New brüe order #${String(order.id).slice(0, 8)}`,
          text: `New order received\nCustomer: ${customer.name}\nPhone: ${customer.phone}\nGovernorate: ${customer.governorate}\nAddress: ${customer.address}\nItems: ${cleanItems.map(i => i.name + " x" + i.qty).join(", ")}\nTotal: EGP ${total}`
        });
      } catch (mailError) {
        console.error("Order email failed:", mailError.message);
      }
    }

    return res.status(201).json({ ok: true, orderId: order.id, message: "Order received." });
  } catch (error) {
    console.error("Order creation failed:", error);
    return res.status(500).json({ error: "Could not place your order. Please try again." });
  }
});

app.post("/api/admin/login", loginLimiter, (req, res) => {
  const password = req.body && req.body.password;
  if (!validText(password, 300) || !safeEqual(password, ADMIN_PASSWORD)) {
    return res.status(401).json({ error: "Incorrect password." });
  }
  req.session.regenerate(err => {
    if (err) return res.status(500).json({ error: "Could not start admin session." });
    req.session.isAdmin = true;
    return req.session.save(saveErr => {
      if (saveErr) return res.status(500).json({ error: "Could not save admin session." });
      res.json({ ok: true });
    });
  });
});
app.get("/api/admin/me", (req, res) => res.json({ authenticated: !!(req.session && req.session.isAdmin) }));
app.post("/api/admin/logout", requireAdmin, (req, res) => {
  req.session.destroy(() => {
    res.clearCookie("brue_admin", { httpOnly: true, sameSite: "strict", secure: process.env.NODE_ENV === "production" });
    res.json({ ok: true });
  });
});
app.get("/api/admin/orders", requireAdmin, async (_req, res) => {
  try {
    const result = await pool.query("SELECT id, customer_name, phone, governorate, address, notes, items, total_egp, status, created_at FROM orders ORDER BY created_at DESC LIMIT 500");
    res.json({ orders: result.rows });
  } catch (error) {
    console.error("Admin order read failed:", error);
    res.status(500).json({ error: "Could not load orders." });
  }
});
app.patch("/api/admin/orders/:id/status", requireAdmin, async (req, res) => {
  const { status } = req.body || {};
  if (!STATUSES.includes(status)) return res.status(400).json({ error: "Invalid order status." });
  try {
    const result = await pool.query("UPDATE orders SET status=$1 WHERE id=$2 RETURNING id", [status, req.params.id]);
    if (!result.rowCount) return res.status(404).json({ error: "Order not found." });
    res.json({ ok: true });
  } catch (error) {
    console.error("Order status update failed:", error);
    res.status(500).json({ error: "Could not update order." });
  }
});

app.use(express.static(path.join(__dirname), { index: "index.html", extensions: ["html"] }));
app.use((req, res) => res.status(404).send("Not found"));

pool.query(`
  CREATE TABLE IF NOT EXISTS orders (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    customer_name text NOT NULL,
    phone text NOT NULL,
    governorate text NOT NULL,
    address text NOT NULL,
    notes text,
    items jsonb NOT NULL,
    total_egp integer NOT NULL CHECK (total_egp >= 0),
    status text NOT NULL DEFAULT 'New',
    created_at timestamptz NOT NULL DEFAULT now()
  )
`).then(() => {
  app.listen(PORT, "0.0.0.0", () => console.log(`brüe server listening on ${PORT}`));
}).catch(error => {
  console.error("Database initialization failed:", error);
  process.exit(1);
});
