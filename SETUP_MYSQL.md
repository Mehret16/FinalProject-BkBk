# MySQL Database Setup Guide

This guide will help you set up MySQL locally for the Mental Health Chatbot backend.

---

## Step 1: Install MySQL

### Windows
1. Download MySQL installer from https://dev.mysql.com/downloads/mysql/
2. Run the installer
3. Choose "Developer Default" setup type
4. Follow installation steps
5. Configure MySQL Server:
   - Port: 3306
   - Root password: **Remember this!**
   - Service name: MySQL80 (or your version)

### macOS
```bash
# Using Homebrew
brew install mysql

# Start MySQL service
brew services start mysql

# Initial setup
mysql_secure_installation
```

### Linux (Ubuntu/Debian)
```bash
# Install MySQL
sudo apt-get update
sudo apt-get install mysql-server

# Start MySQL
sudo systemctl start mysql

# Secure installation
sudo mysql_secure_installation
```

---

## Step 2: Verify MySQL Installation

```bash
# Check MySQL version
mysql --version

# Connect to MySQL (uses root user)
mysql -u root -p

# You'll be prompted to enter password you created during setup
```

---

## Step 3: Create Database and User

Run these commands in MySQL terminal:

```sql
-- Create the database
CREATE DATABASE mental_health_chatbot;

-- Create a dedicated user for the application (optional but recommended)
CREATE USER 'chatbot_user'@'localhost' IDENTIFIED BY 'strong_password_here';

-- Grant all privileges
GRANT ALL PRIVILEGES ON mental_health_chatbot.* TO 'chatbot_user'@'localhost';

-- Refresh privileges
FLUSH PRIVILEGES;

-- Verify
SHOW DATABASES;
SHOW GRANTS FOR 'chatbot_user'@'localhost';

-- Exit
EXIT;
```

---

## Step 4: Create Tables

### Option A: Using Command Line

```bash
# Navigate to backend folder
cd /backend

# Import the schema (replace root and password)
mysql -u root -p < database/schema.sql

# Enter your MySQL root password when prompted
```

### Option B: Using MySQL Workbench

1. Open MySQL Workbench
2. Create a new connection to localhost:3306
3. Open `database/schema.sql` in Workbench
4. Click "Execute All" (or press Ctrl+Shift+Enter)

### Option C: Manual Import

```bash
# Login to MySQL
mysql -u root -p

# Select your database
USE mental_health_chatbot;

# Copy-paste contents of database/schema.sql
```

---

## Step 5: Verify Tables Were Created

```bash
# Connect to database
mysql -u root -p mental_health_chatbot

# List tables
SHOW TABLES;

# You should see these 12 tables:
# - users
# - user_profiles
# - chat_sessions
# - messages
# - referrals
# - therapist_notes
# - mental_health_resources
# - sentiment_log
# - audit_log
# - system_config
# - notifications
# - refresh_tokens
```

---

## Step 6: Update .env File

Create a `.env` file in the `/backend` folder (copy from `.env.example`):

```bash
# DATABASE CONFIGURATION
DB_HOST=localhost
DB_PORT=3306
DB_USER=root                    # or chatbot_user if you created it
DB_PASSWORD=your_password       # Your MySQL root/user password
DB_NAME=mental_health_chatbot

# Keep other configs as needed...
```

---

## Step 7: Test Database Connection

Run this test command in the backend folder:

```bash
# First install dependencies
npm install

# Test connection with Node
node -e "
const mysql = require('mysql2/promise');
const pool = mysql.createPool({
  host: 'localhost',
  user: 'root',
  password: 'your_password',
  database: 'mental_health_chatbot'
});

pool.getConnection().then(conn => {
  console.log('✅ Database connection successful!');
  conn.release();
  process.exit(0);
}).catch(err => {
  console.log('❌ Connection failed:', err.message);
  process.exit(1);
});
"
```

---

## Common Issues & Solutions

### Issue: "Access denied for user 'root'@'localhost'"
**Solution:** Check your password in .env file, or reset MySQL root password

### Issue: "Unknown database 'mental_health_chatbot'"
**Solution:** Run the schema import command again:
```bash
mysql -u root -p < database/schema.sql
```

### Issue: "Can't connect to MySQL server on 'localhost' (10061)"
**Solution:** MySQL service is not running
- Windows: Start MySQL80 service from Services
- macOS: `brew services start mysql`
- Linux: `sudo systemctl start mysql`

### Issue: "Table already exists"
**Solution:** Database was already created, skip Step 3 or drop database first:
```sql
DROP DATABASE mental_health_chatbot;
CREATE DATABASE mental_health_chatbot;
```

---

## Advanced: MySQL GUI Tools

### MySQL Workbench (Recommended)
- Download: https://dev.mysql.com/downloads/workbench/
- Free, official tool
- Visual schema editor
- Query builder

### DBeaver (Alternative)
- Download: https://dbeaver.io/
- Open-source
- Supports multiple databases
- Built-in SSH support

### phpMyAdmin (Web-based)
```bash
# If you have PHP installed
docker run --name myphpadmin -d -p 8080:80 phpmyadmin
# Access: http://localhost:8080
```

---

## Production Checklist

- [ ] Use strong password (min 16 chars, mix of upper/lower/numbers/symbols)
- [ ] Create dedicated database user (not root)
- [ ] Enable MySQL user password authentication
- [ ] Set up MySQL backups
- [ ] Enable SSL for MySQL connections
- [ ] Restrict user privileges (grant only needed permissions)
- [ ] Keep MySQL version updated
- [ ] Monitor database performance
- [ ] Set up automated backups

---

## Backup & Restore

### Backup Database
```bash
mysqldump -u root -p mental_health_chatbot > backup.sql
```

### Restore Database
```bash
mysql -u root -p mental_health_chatbot < backup.sql
```

---

## Next Steps

1. Verify all tables are created ✓
2. Update `.env` file with correct credentials ✓
3. Move to email setup: See `SETUP_EMAIL.md`
4. Start the backend: `npm run dev`

---

For more help: https://dev.mysql.com/doc/
