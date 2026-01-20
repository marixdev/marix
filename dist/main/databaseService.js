"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.initDatabaseHandlers = initDatabaseHandlers;
const electron_1 = require("electron");
const mysql = __importStar(require("mysql2/promise"));
const pg_1 = require("pg");
const mongodb_1 = require("mongodb");
const redis_1 = require("redis");
const sqlite3 = __importStar(require("sqlite3"));
// Store active connections
const connections = new Map();
// Initialize database IPC handlers
function initDatabaseHandlers() {
    // Connect to database
    electron_1.ipcMain.handle('db:connect', async (_, config) => {
        try {
            let connection;
            let databases = [];
            switch (config.protocol) {
                case 'mysql':
                    connection = await mysql.createConnection({
                        host: config.host,
                        port: config.port,
                        user: config.username,
                        password: config.password,
                        database: config.database,
                        ssl: config.sslEnabled ? {} : undefined,
                    });
                    // Get list of databases
                    const [dbRows] = await connection.query('SHOW DATABASES');
                    databases = dbRows.map(row => row.Database);
                    break;
                case 'postgresql':
                    connection = new pg_1.Client({
                        host: config.host,
                        port: config.port,
                        user: config.username,
                        password: config.password,
                        database: config.database || 'postgres',
                        ssl: config.sslEnabled ? { rejectUnauthorized: false } : undefined,
                    });
                    await connection.connect();
                    // Get list of databases
                    const pgResult = await connection.query('SELECT datname FROM pg_database WHERE datistemplate = false');
                    databases = pgResult.rows.map((row) => row.datname);
                    break;
                case 'mongodb':
                    const mongoUri = config.mongoUri || `mongodb://${config.username}:${config.password}@${config.host}:${config.port}`;
                    connection = new mongodb_1.MongoClient(mongoUri);
                    await connection.connect();
                    // Get list of databases
                    const adminDb = connection.db('admin');
                    const dbList = await adminDb.admin().listDatabases();
                    databases = dbList.databases.map((db) => db.name);
                    break;
                case 'redis':
                    connection = (0, redis_1.createClient)({
                        socket: {
                            host: config.host,
                            port: config.port,
                        },
                        password: config.password,
                    });
                    await connection.connect();
                    // Redis uses database indexes (0-15)
                    databases = Array.from({ length: 16 }, (_, i) => `db${i}`);
                    break;
                case 'sqlite':
                    // SQLite is local file-based
                    connection = new sqlite3.Database(config.sqliteFile || ':memory:');
                    databases = ['main'];
                    break;
                default:
                    return { success: false, error: `Unsupported protocol: ${config.protocol}` };
            }
            // Store connection
            connections.set(config.connectionId, {
                protocol: config.protocol,
                connection,
                config,
            });
            return { success: true, databases };
        }
        catch (error) {
            console.error('Database connection error:', error);
            return { success: false, error: error.message };
        }
    });
    // Disconnect from database
    electron_1.ipcMain.handle('db:disconnect', async (_, { connectionId }) => {
        try {
            const conn = connections.get(connectionId);
            if (!conn)
                return { success: true };
            switch (conn.protocol) {
                case 'mysql':
                    await conn.connection.end();
                    break;
                case 'postgresql':
                    await conn.connection.end();
                    break;
                case 'mongodb':
                    await conn.connection.close();
                    break;
                case 'redis':
                    await conn.connection.quit();
                    break;
                case 'sqlite':
                    conn.connection.close();
                    break;
            }
            connections.delete(connectionId);
            return { success: true };
        }
        catch (error) {
            return { success: false, error: error.message };
        }
    });
    // Get tables/collections
    electron_1.ipcMain.handle('db:getTables', async (_, { connectionId, database }) => {
        try {
            const conn = connections.get(connectionId);
            if (!conn)
                return { success: false, error: 'Not connected' };
            let tables = [];
            switch (conn.protocol) {
                case 'mysql':
                    // Switch database if needed
                    await conn.connection.changeUser({ database });
                    const [mysqlTables] = await conn.connection.query(`
            SELECT TABLE_NAME as name, TABLE_TYPE as type 
            FROM information_schema.TABLES 
            WHERE TABLE_SCHEMA = ?
          `, [database]);
                    tables = mysqlTables.map(t => ({
                        name: t.name,
                        type: t.type === 'VIEW' ? 'view' : 'table',
                    }));
                    break;
                case 'postgresql':
                    const pgTables = await conn.connection.query(`
            SELECT table_name as name, table_type as type
            FROM information_schema.tables
            WHERE table_schema = 'public'
          `);
                    tables = pgTables.rows.map((t) => ({
                        name: t.name,
                        type: t.type === 'VIEW' ? 'view' : 'table',
                    }));
                    break;
                case 'mongodb':
                    const db = conn.connection.db(database);
                    const collections = await db.listCollections().toArray();
                    tables = collections.map((c) => ({
                        name: c.name,
                        type: 'collection',
                    }));
                    break;
                case 'redis':
                    // Redis doesn't have tables, but we can show keys patterns
                    const keys = await conn.connection.keys('*');
                    const uniquePrefixes = new Set(keys.map((k) => k.split(':')[0]));
                    tables = Array.from(uniquePrefixes).map(prefix => ({
                        name: prefix,
                        type: 'keyspace',
                    }));
                    break;
                case 'sqlite':
                    return new Promise((resolve) => {
                        conn.connection.all("SELECT name, type FROM sqlite_master WHERE type IN ('table', 'view')", (err, rows) => {
                            if (err) {
                                resolve({ success: false, error: err.message });
                            }
                            else {
                                resolve({
                                    success: true,
                                    tables: rows.map(r => ({ name: r.name, type: r.type })),
                                });
                            }
                        });
                    });
            }
            return { success: true, tables };
        }
        catch (error) {
            return { success: false, error: error.message };
        }
    });
    // Execute query
    electron_1.ipcMain.handle('db:query', async (_, params) => {
        try {
            const conn = connections.get(params.connectionId);
            if (!conn)
                return { success: false, error: 'Not connected' };
            switch (conn.protocol) {
                case 'mysql':
                    if (params.database) {
                        await conn.connection.changeUser({ database: params.database });
                    }
                    const [mysqlRows, mysqlFields] = await conn.connection.query(params.query);
                    // Check if it's a SELECT query
                    if (Array.isArray(mysqlRows)) {
                        return {
                            success: true,
                            columns: mysqlFields ? mysqlFields.map((f) => f.name) : Object.keys(mysqlRows[0] || {}),
                            rows: mysqlRows,
                        };
                    }
                    else {
                        return {
                            success: true,
                            columns: [],
                            rows: [],
                            affectedRows: mysqlRows.affectedRows,
                            insertId: mysqlRows.insertId,
                        };
                    }
                case 'postgresql':
                    const pgResult = await conn.connection.query(params.query);
                    return {
                        success: true,
                        columns: pgResult.fields?.map((f) => f.name) || [],
                        rows: pgResult.rows || [],
                        affectedRows: pgResult.rowCount,
                    };
                case 'mongodb':
                    // Parse MongoDB query JSON
                    const mongoQuery = JSON.parse(params.query);
                    const db = conn.connection.db(params.database);
                    const collection = db.collection(mongoQuery.collection);
                    if (mongoQuery.find !== undefined) {
                        const docs = await collection.find(mongoQuery.find).limit(mongoQuery.limit || 100).toArray();
                        const columns = docs.length > 0 ? Object.keys(docs[0]) : [];
                        return { success: true, columns, rows: docs };
                    }
                    else if (mongoQuery.insertOne) {
                        const result = await collection.insertOne(mongoQuery.insertOne);
                        return { success: true, columns: [], rows: [], insertId: result.insertedId };
                    }
                    else if (mongoQuery.aggregate) {
                        const docs = await collection.aggregate(mongoQuery.aggregate).toArray();
                        const columns = docs.length > 0 ? Object.keys(docs[0]) : [];
                        return { success: true, columns, rows: docs };
                    }
                    return { success: false, error: 'Unknown MongoDB operation' };
                case 'redis':
                    // Parse Redis command
                    const parts = params.query.trim().split(/\s+/);
                    const command = parts[0].toUpperCase();
                    const args = parts.slice(1);
                    const redisResult = await conn.connection[command.toLowerCase()](...args);
                    if (typeof redisResult === 'object' && !Array.isArray(redisResult)) {
                        const columns = Object.keys(redisResult);
                        return { success: true, columns, rows: [redisResult] };
                    }
                    else if (Array.isArray(redisResult)) {
                        return { success: true, columns: ['value'], rows: redisResult.map(v => ({ value: v })) };
                    }
                    else {
                        return { success: true, columns: ['result'], rows: [{ result: redisResult }] };
                    }
                case 'sqlite':
                    return new Promise((resolve) => {
                        const isSelect = params.query.trim().toUpperCase().startsWith('SELECT');
                        if (isSelect) {
                            conn.connection.all(params.query, (err, rows) => {
                                if (err) {
                                    resolve({ success: false, error: err.message });
                                }
                                else {
                                    const columns = rows.length > 0 ? Object.keys(rows[0]) : [];
                                    resolve({ success: true, columns, rows });
                                }
                            });
                        }
                        else {
                            conn.connection.run(params.query, function (err) {
                                if (err) {
                                    resolve({ success: false, error: err.message });
                                }
                                else {
                                    resolve({
                                        success: true,
                                        columns: [],
                                        rows: [],
                                        affectedRows: this.changes,
                                        insertId: this.lastID,
                                    });
                                }
                            });
                        }
                    });
                default:
                    return { success: false, error: 'Unsupported protocol' };
            }
        }
        catch (error) {
            return { success: false, error: error.message };
        }
    });
    // Get table structure (columns info)
    electron_1.ipcMain.handle('db:getTableStructure', async (_, { connectionId, database, table }) => {
        try {
            const conn = connections.get(connectionId);
            if (!conn)
                return { success: false, error: 'Not connected' };
            let columns = [];
            switch (conn.protocol) {
                case 'mysql':
                    if (database) {
                        await conn.connection.changeUser({ database });
                    }
                    const [mysqlCols] = await conn.connection.query(`
            SELECT 
              COLUMN_NAME as name,
              COLUMN_TYPE as type,
              IS_NULLABLE as nullable,
              COLUMN_KEY as \`key\`,
              COLUMN_DEFAULT as \`default\`,
              EXTRA as extra
            FROM information_schema.COLUMNS
            WHERE TABLE_SCHEMA = ? AND TABLE_NAME = ?
            ORDER BY ORDINAL_POSITION
          `, [database, table]);
                    columns = mysqlCols.map(c => ({
                        name: c.name,
                        type: c.type,
                        nullable: c.nullable === 'YES',
                        key: c.key || '',
                        default: c.default,
                        extra: c.extra || '',
                    }));
                    break;
                case 'postgresql':
                    const pgCols = await conn.connection.query(`
            SELECT 
              column_name as name,
              data_type as type,
              is_nullable as nullable,
              column_default as default_value
            FROM information_schema.columns
            WHERE table_schema = 'public' AND table_name = $1
            ORDER BY ordinal_position
          `, [table]);
                    // Get primary key info
                    const pgKeys = await conn.connection.query(`
            SELECT a.attname as column_name
            FROM pg_index i
            JOIN pg_attribute a ON a.attrelid = i.indrelid AND a.attnum = ANY(i.indkey)
            WHERE i.indrelid = $1::regclass AND i.indisprimary
          `, [table]);
                    const primaryKeys = new Set(pgKeys.rows.map((r) => r.column_name));
                    columns = pgCols.rows.map((c) => ({
                        name: c.name,
                        type: c.type,
                        nullable: c.nullable === 'YES',
                        key: primaryKeys.has(c.name) ? 'PRI' : '',
                        default: c.default_value,
                        extra: '',
                    }));
                    break;
                case 'mongodb':
                    // MongoDB is schema-less, sample a document to infer structure
                    const db = conn.connection.db(database);
                    const sampleDoc = await db.collection(table).findOne();
                    if (sampleDoc) {
                        columns = Object.entries(sampleDoc).map(([key, value]) => ({
                            name: key,
                            type: typeof value === 'object' ? (Array.isArray(value) ? 'array' : 'object') : typeof value,
                            nullable: true,
                            key: key === '_id' ? 'PRI' : '',
                            default: null,
                            extra: '',
                        }));
                    }
                    break;
                case 'sqlite':
                    return new Promise((resolve) => {
                        conn.connection.all(`PRAGMA table_info("${table}")`, (err, rows) => {
                            if (err) {
                                resolve({ success: false, error: err.message });
                            }
                            else {
                                resolve({
                                    success: true,
                                    columns: rows.map(r => ({
                                        name: r.name,
                                        type: r.type,
                                        nullable: r.notnull === 0,
                                        key: r.pk === 1 ? 'PRI' : '',
                                        default: r.dflt_value,
                                        extra: '',
                                    })),
                                });
                            }
                        });
                    });
                case 'redis':
                    // Redis doesn't have table structure
                    return { success: true, columns: [] };
            }
            return { success: true, columns };
        }
        catch (error) {
            return { success: false, error: error.message };
        }
    });
    // Update row in table
    electron_1.ipcMain.handle('db:updateRow', async (_, { connectionId, database, table, primaryKey, primaryKeyValue, column, newValue }) => {
        try {
            const conn = connections.get(connectionId);
            if (!conn)
                return { success: false, error: 'Not connected' };
            switch (conn.protocol) {
                case 'mysql':
                    if (database) {
                        await conn.connection.changeUser({ database });
                    }
                    await conn.connection.query(`UPDATE \`${table}\` SET \`${column}\` = ? WHERE \`${primaryKey}\` = ?`, [newValue, primaryKeyValue]);
                    return { success: true };
                case 'postgresql':
                    await conn.connection.query(`UPDATE "${table}" SET "${column}" = $1 WHERE "${primaryKey}" = $2`, [newValue, primaryKeyValue]);
                    return { success: true };
                case 'mongodb':
                    const db = conn.connection.db(database);
                    await db.collection(table).updateOne({ [primaryKey]: primaryKeyValue }, { $set: { [column]: newValue } });
                    return { success: true };
                case 'sqlite':
                    return new Promise((resolve) => {
                        conn.connection.run(`UPDATE "${table}" SET "${column}" = ? WHERE "${primaryKey}" = ?`, [newValue, primaryKeyValue], function (err) {
                            if (err) {
                                resolve({ success: false, error: err.message });
                            }
                            else {
                                resolve({ success: true, affectedRows: this.changes });
                            }
                        });
                    });
                default:
                    return { success: false, error: 'Update not supported for this database type' };
            }
        }
        catch (error) {
            return { success: false, error: error.message };
        }
    });
    console.log('Database handlers initialized');
}
//# sourceMappingURL=databaseService.js.map