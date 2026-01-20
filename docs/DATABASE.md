# Database Client Guide

Marix includes a built-in database client for connecting to and managing database servers directly from the application.

---

## Supported Databases

| Database | Protocol | Features |
|----------|----------|----------|
| **MySQL / MariaDB** | `mysql` | Query editor, table browser, data viewer, structure inspector |
| **PostgreSQL** | `postgresql` | Query editor, table browser, data viewer, structure inspector |
| **MongoDB** | `mongodb` | Collection browser, document viewer, query interface |
| **Redis** | `redis` | Key-value browser, command interface |
| **SQLite** | `sqlite` | Local file support, full SQL editor |

---

## Adding a Database Server

1. Click the **+ Add** button in the sidebar
2. Select **Database** tab (or the database icon)
3. Choose your database type:
   - MySQL / MariaDB
   - PostgreSQL
   - MongoDB
   - Redis
   - SQLite

4. Fill in connection details:

### MySQL / MariaDB / PostgreSQL

| Field | Description | Example |
|-------|-------------|---------|
| Name | Display name | `Production MySQL` |
| Host | Server hostname or IP | `db.example.com` |
| Port | Database port | `3306` (MySQL) / `5432` (PostgreSQL) |
| Username | Database user | `root` |
| Password | User password | `••••••••` |
| Database | Default database (optional) | `myapp_production` |
| SSL | Enable SSL/TLS | ☑️ Enabled |

### MongoDB

| Field | Description | Example |
|-------|-------------|---------|
| Name | Display name | `MongoDB Atlas` |
| Connection String | Full MongoDB URI | `mongodb+srv://user:pass@cluster.mongodb.net/` |
| — OR — | | |
| Host | Server hostname | `localhost` |
| Port | MongoDB port | `27017` |
| Username | MongoDB user | `admin` |
| Password | User password | `••••••••` |
| Database | Default database | `myapp` |

### Redis

| Field | Description | Example |
|-------|-------------|---------|
| Name | Display name | `Redis Cache` |
| Host | Server hostname | `redis.example.com` |
| Port | Redis port | `6379` |
| Password | Auth password (optional) | `••••••••` |
| Database | Database number | `0` |

### SQLite

| Field | Description | Example |
|-------|-------------|---------|
| Name | Display name | `Local SQLite` |
| File Path | Path to .db file | `/home/user/app.db` |

5. Click **Test Connection** to verify
6. Click **Save**

---

## Database Client Interface

When you connect to a database server, the Database Client opens with several tabs:

### 📊 Data Tab

Browse and view table data:

1. **Select database** from dropdown (if multiple)
2. **Click a table** in the sidebar to view its data
3. **Pagination** - Navigate through rows (100 per page default)
4. **Column sorting** - Click column headers to sort
5. **Quick filter** - Search within displayed data

### ⚡ Query Tab

Write and execute SQL queries:

```sql
SELECT * FROM users 
WHERE created_at > '2024-01-01' 
ORDER BY id DESC 
LIMIT 100;
```

**Features:**
- **Syntax highlighting** - SQL keywords, strings, numbers
- **Execute** - Run query with `Ctrl+Enter` or Execute button
- **Results grid** - View query results in a table
- **Export** - Download results as CSV or JSON
- **Execution time** - See how long queries take
- **Error messages** - Clear error display with line numbers

### 🏗️ Structure Tab

Inspect table schemas:

| Column | Type | Nullable | Key | Default | Extra |
|--------|------|----------|-----|---------|-------|
| id | int(11) | NO | PRI | null | auto_increment |
| name | varchar(255) | NO | | null | |
| email | varchar(255) | NO | UNI | null | |
| created_at | timestamp | YES | | CURRENT_TIMESTAMP | |

**Information shown:**
- Column names and data types
- Primary keys, foreign keys, unique constraints
- Nullable columns
- Default values
- Auto-increment settings

### 🔗 ERD Tab

View Entity-Relationship Diagram:

- **Visual representation** of tables and relationships
- **Foreign key connections** shown as lines
- **Drag and zoom** to navigate large schemas
- **Export as image** (PNG)

### 📦 Import/Export Tab

Data import and export operations:

**Export:**
- Export table data to CSV
- Export table data to JSON
- Export entire database schema (SQL dump)

**Import:**
- Import CSV files into tables
- Execute SQL scripts

---

## Query Examples

### MySQL / MariaDB

```sql
-- Show all databases
SHOW DATABASES;

-- Show tables in current database
SHOW TABLES;

-- Describe table structure
DESCRIBE users;

-- Select with join
SELECT u.name, o.total 
FROM users u 
JOIN orders o ON u.id = o.user_id 
WHERE o.created_at > '2024-01-01';
```

### PostgreSQL

```sql
-- List all schemas
SELECT schema_name FROM information_schema.schemata;

-- List tables in public schema
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public';

-- JSONB query
SELECT * FROM products 
WHERE metadata->>'category' = 'electronics';
```

### MongoDB

```javascript
// Find documents
db.users.find({ status: "active" })

// Aggregation
db.orders.aggregate([
  { $match: { status: "completed" } },
  { $group: { _id: "$customerId", total: { $sum: "$amount" } } }
])
```

### Redis

```
# Get key
GET mykey

# Set key
SET mykey "value"

# List all keys
KEYS *

# Hash operations
HGETALL user:1000
```

---

## Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| `Ctrl/Cmd + Enter` | Execute query |
| `Ctrl/Cmd + S` | Save query to file |
| `Ctrl/Cmd + O` | Open query from file |
| `Ctrl/Cmd + Shift + F` | Format SQL |
| `Escape` | Cancel running query |

---

## Connection Security

### SSL/TLS Encryption

For MySQL, PostgreSQL, and MongoDB:

1. Enable **SSL** checkbox when adding server
2. For custom certificates, provide:
   - CA Certificate path
   - Client Certificate path (optional)
   - Client Key path (optional)

### SSH Tunnel

Connect to databases through an SSH tunnel:

1. First add an SSH server in Marix
2. When adding database, enable **SSH Tunnel**
3. Select the SSH server to tunnel through
4. The database connection will be forwarded securely

---

## Best Practices

### 1. Use Read-Only Accounts

For safety, create database users with limited permissions:

```sql
-- MySQL: Create read-only user
CREATE USER 'viewer'@'%' IDENTIFIED BY 'password';
GRANT SELECT ON mydb.* TO 'viewer'@'%';
```

### 2. Limit Result Sets

Always use `LIMIT` to avoid loading too much data:

```sql
SELECT * FROM large_table LIMIT 100;
```

### 3. Test Before Executing

For `UPDATE` or `DELETE` statements, first run a `SELECT`:

```sql
-- First, check what will be affected
SELECT * FROM users WHERE status = 'inactive';

-- Then, if correct, run the delete
DELETE FROM users WHERE status = 'inactive';
```

### 4. Use Transactions

For critical operations, wrap in transactions:

```sql
BEGIN;
UPDATE accounts SET balance = balance - 100 WHERE id = 1;
UPDATE accounts SET balance = balance + 100 WHERE id = 2;
COMMIT;
```

---

## Troubleshooting

### Connection Failed

1. **Check host/port** - Verify the server is accessible
2. **Check credentials** - Verify username and password
3. **Check firewall** - Ensure the port is open
4. **Check SSL** - Try toggling SSL on/off
5. **Check database name** - Some servers require specifying a database

### Query Timeout

1. **Add LIMIT** - Reduce result set size
2. **Check indexes** - Query might need optimization
3. **Check server load** - Server might be overloaded

### Permission Denied

1. **Check grants** - User might lack required permissions
2. **Check database** - User might not have access to that database
3. **Contact admin** - Request necessary permissions

### SSL Certificate Error

1. **Disable SSL** - Try without SSL first
2. **Check certificate** - Certificate might be expired or invalid
3. **Add CA certificate** - Provide the server's CA certificate

---

## Data Storage & Security

- **Credentials encrypted** - Database passwords are encrypted with AES-256
- **Included in backups** - Database server configurations are included in encrypted .marix backups
- **No query history stored** - Queries are not logged (for security)
- **Connection pooling** - Efficient connection management

---

## Tips

### Quick Database Switch

Use the database dropdown at the top to quickly switch between databases without reconnecting.

### Export Query Results

After running a query:
1. Click **Export** button above results
2. Choose format (CSV or JSON)
3. Save the file

### Copy Cell Value

Right-click any cell in the results grid to copy its value.

### Multi-Statement Execution

Separate multiple statements with semicolons:

```sql
SELECT * FROM users;
SELECT * FROM orders;
SELECT COUNT(*) FROM products;
```

Each statement runs sequentially and shows separate result sets.
