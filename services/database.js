const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const bcrypt = require('bcryptjs');
const logger = require('./logger');

class DatabaseService {
  constructor() {
    this.db = null;
  }

  async initialize() {
    const dbPath = process.env.DATABASE_PATH || './vpn_database.sqlite';
    
    return new Promise((resolve, reject) => {
      this.db = new sqlite3.Database(dbPath, (err) => {
        if (err) {
          logger.error('Error opening database:', err);
          reject(err);
        } else {
          logger.info('Database connected successfully');
          this.createTables()
            .then(resolve)
            .catch(reject);
        }
      });
    });
  }

  async createTables() {
    const queries = [
      // Users table
      `CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        username TEXT UNIQUE NOT NULL,
        email TEXT UNIQUE NOT NULL,
        password_hash TEXT NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        is_active BOOLEAN DEFAULT 1
      )`,

      // IP addresses table
      `CREATE TABLE IF NOT EXISTS ip_addresses (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        ip_address TEXT UNIQUE NOT NULL,
        location TEXT NOT NULL,
        is_allocated BOOLEAN DEFAULT 0,
        allocated_to_user_id INTEGER,
        allocated_at DATETIME,
        expires_at DATETIME,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (allocated_to_user_id) REFERENCES users (id)
      )`,

      // Payments table
      `CREATE TABLE IF NOT EXISTS payments (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        ip_address_id INTEGER NOT NULL,
        bitcoin_address TEXT NOT NULL,
        amount_btc REAL NOT NULL,
        transaction_hash TEXT,
        status TEXT DEFAULT 'pending',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        confirmed_at DATETIME,
        FOREIGN KEY (user_id) REFERENCES users (id),
        FOREIGN KEY (ip_address_id) REFERENCES ip_addresses (id)
      )`,

      // Sessions table
      `CREATE TABLE IF NOT EXISTS sessions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        token TEXT UNIQUE NOT NULL,
        expires_at DATETIME NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users (id)
      )`,

      // Admin logs table
      `CREATE TABLE IF NOT EXISTS admin_logs (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        action TEXT NOT NULL,
        details TEXT,
        admin_user_id INTEGER,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (admin_user_id) REFERENCES users (id)
      )`
    ];

    for (const query of queries) {
      await this.run(query);
    }

    // Initialize IP address pool if empty
    await this.initializeIPPool();
    
    logger.info('Database tables created successfully');
  }

  async initializeIPPool() {
    const count = await this.get('SELECT COUNT(*) as count FROM ip_addresses');
    
    if (count.count === 0) {
      const startIP = process.env.IP_POOL_START || '192.168.1.100';
      const endIP = process.env.IP_POOL_END || '192.168.1.149';
      
      const locations = [
        'New York, USA', 'London, UK', 'Tokyo, Japan', 'Sydney, Australia',
        'Frankfurt, Germany', 'Singapore', 'Toronto, Canada', 'Amsterdam, Netherlands',
        'Paris, France', 'Mumbai, India', 'São Paulo, Brazil', 'Seoul, South Korea',
        'Moscow, Russia', 'Mexico City, Mexico', 'Cairo, Egypt', 'Bangkok, Thailand',
        'Istanbul, Turkey', 'Jakarta, Indonesia', 'Lagos, Nigeria', 'Buenos Aires, Argentina',
        'Vienna, Austria', 'Brussels, Belgium', 'Copenhagen, Denmark', 'Helsinki, Finland',
        'Dublin, Ireland', 'Oslo, Norway', 'Stockholm, Sweden', 'Zurich, Switzerland',
        'Warsaw, Poland', 'Prague, Czech Republic', 'Budapest, Hungary', 'Bratislava, Slovakia',
        'Ljubljana, Slovenia', 'Zagreb, Croatia', 'Belgrade, Serbia', 'Sofia, Bulgaria',
        'Bucharest, Romania', 'Athens, Greece', 'Lisbon, Portugal', 'Madrid, Spain',
        'Rome, Italy', 'Milan, Italy', 'Barcelona, Spain', 'Valencia, Spain',
        'Marseille, France', 'Lyon, France', 'Hamburg, Germany', 'Munich, Germany',
        'Berlin, Germany', 'Cologne, Germany', 'Düsseldorf, Germany', 'Stuttgart, Germany'
      ];

      const ipRange = this.generateIPRange(startIP, endIP);
      
      for (let i = 0; i < ipRange.length; i++) {
        const location = locations[i % locations.length];
        await this.run(
          'INSERT INTO ip_addresses (ip_address, location) VALUES (?, ?)',
          [ipRange[i], location]
        );
      }
      
      logger.info(`Initialized IP pool with ${ipRange.length} addresses`);
    }
  }

  generateIPRange(start, end) {
    const startParts = start.split('.').map(Number);
    const endParts = end.split('.').map(Number);
    const ips = [];
    
    for (let i = startParts[3]; i <= endParts[3]; i++) {
      ips.push(`${startParts[0]}.${startParts[1]}.${startParts[2]}.${i}`);
    }
    
    return ips;
  }

  // Generic database methods
  async run(sql, params = []) {
    return new Promise((resolve, reject) => {
      this.db.run(sql, params, function(err) {
        if (err) {
          logger.error('Database run error:', err);
          reject(err);
        } else {
          resolve({ id: this.lastID, changes: this.changes });
        }
      });
    });
  }

  async get(sql, params = []) {
    return new Promise((resolve, reject) => {
      this.db.get(sql, params, (err, row) => {
        if (err) {
          logger.error('Database get error:', err);
          reject(err);
        } else {
          resolve(row);
        }
      });
    });
  }

  async all(sql, params = []) {
    return new Promise((resolve, reject) => {
      this.db.all(sql, params, (err, rows) => {
        if (err) {
          logger.error('Database all error:', err);
          reject(err);
        } else {
          resolve(rows);
        }
      });
    });
  }

  // User methods
  async createUser(username, email, password) {
    const passwordHash = await bcrypt.hash(password, 12);
    const result = await this.run(
      'INSERT INTO users (username, email, password_hash) VALUES (?, ?, ?)',
      [username, email, passwordHash]
    );
    return result.id;
  }

  async getUserByUsername(username) {
    return await this.get('SELECT * FROM users WHERE username = ?', [username]);
  }

  async getUserById(id) {
    return await this.get('SELECT * FROM users WHERE id = ?', [id]);
  }

  async updateUserEmail(id, email) {
    await this.run(
      'UPDATE users SET email = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
      [email, id]
    );
  }

  async changeUserPassword(id, newPassword) {
    const passwordHash = await bcrypt.hash(newPassword, 12);
    await this.run(
      'UPDATE users SET password_hash = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
      [passwordHash, id]
    );
  }

  // IP address methods
  async getAvailableIPs() {
    return await this.all(
      'SELECT * FROM ip_addresses WHERE is_allocated = 0 ORDER BY location'
    );
  }

  async getAllocatedIPs() {
    return await this.all(`
      SELECT ip.*, u.username, u.email 
      FROM ip_addresses ip 
      LEFT JOIN users u ON ip.allocated_to_user_id = u.id 
      WHERE ip.is_allocated = 1
    `);
  }

  async allocateIP(ipId, userId, durationMonths = 1) {
    const expiresAt = new Date();
    expiresAt.setMonth(expiresAt.getMonth() + durationMonths);
    
    await this.run(
      `UPDATE ip_addresses 
       SET is_allocated = 1, allocated_to_user_id = ?, allocated_at = CURRENT_TIMESTAMP, expires_at = ? 
       WHERE id = ?`,
      [userId, expiresAt.toISOString(), ipId]
    );
  }

  async deallocateIP(ipId) {
    await this.run(
      'UPDATE ip_addresses SET is_allocated = 0, allocated_to_user_id = NULL, allocated_at = NULL, expires_at = NULL WHERE id = ?',
      [ipId]
    );
  }

  async getUserIPs(userId) {
    return await this.all(
      'SELECT * FROM ip_addresses WHERE allocated_to_user_id = ? AND is_allocated = 1',
      [userId]
    );
  }

  // Payment methods
  async createPayment(userId, ipAddressId, bitcoinAddress, amountBtc) {
    const result = await this.run(
      'INSERT INTO payments (user_id, ip_address_id, bitcoin_address, amount_btc) VALUES (?, ?, ?, ?)',
      [userId, ipAddressId, bitcoinAddress, amountBtc]
    );
    return result.id;
  }

  async updatePaymentStatus(paymentId, status, transactionHash = null) {
    const updates = { status };
    if (transactionHash) updates.transaction_hash = transactionHash;
    if (status === 'confirmed') updates.confirmed_at = new Date().toISOString();
    
    const fields = Object.keys(updates).map(key => `${key} = ?`).join(', ');
    const values = Object.values(updates);
    values.push(paymentId);
    
    await this.run(`UPDATE payments SET ${fields} WHERE id = ?`, values);
  }

  async getPayment(paymentId) {
    return await this.get(
      'SELECT p.*, u.username, ip.ip_address FROM payments p JOIN users u ON p.user_id = u.id JOIN ip_addresses ip ON p.ip_address_id = ip.id WHERE p.id = ?',
      [paymentId]
    );
  }

  async getPendingPayments() {
    return await this.all(
      'SELECT p.*, u.username, ip.ip_address FROM payments p JOIN users u ON p.user_id = u.id JOIN ip_addresses ip ON p.ip_address_id = ip.id WHERE p.status = "pending"'
    );
  }

  // Session methods
  async createSession(userId, token, expiresAt) {
    await this.run(
      'INSERT INTO sessions (user_id, token, expires_at) VALUES (?, ?, ?)',
      [userId, token, expiresAt.toISOString()]
    );
  }

  async getSession(token) {
    return await this.get(
      'SELECT s.*, u.username FROM sessions s JOIN users u ON s.user_id = u.id WHERE s.token = ? AND s.expires_at > CURRENT_TIMESTAMP',
      [token]
    );
  }

  async deleteSession(token) {
    await this.run('DELETE FROM sessions WHERE token = ?', [token]);
  }

  // Admin methods
  async logAdminAction(action, details, adminUserId = null) {
    await this.run(
      'INSERT INTO admin_logs (action, details, admin_user_id) VALUES (?, ?, ?)',
      [action, details, adminUserId]
    );
  }
}

module.exports = new DatabaseService(); 