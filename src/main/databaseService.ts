import { ipcMain, app } from 'electron';
import * as mysql from 'mysql2/promise';
import { Client as PgClient } from 'pg';
import { MongoClient } from 'mongodb';
import { createClient as createRedisClient } from 'redis';
import * as sqlite3 from 'sqlite3';
import * as fs from 'fs';
import * as path from 'path';
import { Client as SSHClient } from 'ssh2';

// Store active connections
const connections: Map<string, any> = new Map();

// Store downloaded SQLite files for cleanup and sync back
const downloadedSqliteFiles: Map<string, { 
  localPath: string; 
  remotePath: string;
  config: ConnectionConfig;
}> = new Map();

// Helper function to upload SQLite file back to remote server
async function uploadSqliteToRemote(
  localPath: string, 
  remotePath: string, 
  config: ConnectionConfig
): Promise<void> {
  return new Promise<void>((resolve, reject) => {
    const ssh = new SSHClient();
    
    ssh.on('ready', () => {
      ssh.sftp((err, sftp) => {
        if (err) {
          ssh.end();
          return reject(new Error(`SFTP session failed: ${err.message}`));
        }
        
        // Upload the file
        const readStream = fs.createReadStream(localPath);
        const writeStream = sftp.createWriteStream(remotePath);
        
        readStream.on('error', (e: Error) => {
          ssh.end();
          reject(new Error(`Failed to read local file: ${e.message}`));
        });
        
        writeStream.on('error', (e: Error) => {
          ssh.end();
          reject(new Error(`Failed to write remote file: ${e.message}`));
        });
        
        writeStream.on('close', () => {
          console.log(`[SQLite] Uploaded back to remote: ${remotePath}`);
          ssh.end();
          resolve();
        });
        
        readStream.pipe(writeStream);
      });
    });
    
    ssh.on('error', (err) => {
      reject(new Error(`SSH connection failed: ${err.message}`));
    });
    
    ssh.connect({
      host: config.host,
      port: config.sshPort || 22,
      username: config.sshUsername || config.username,
      password: config.sshPassword || config.password,
      privateKey: config.sshPrivateKey ? Buffer.from(config.sshPrivateKey) : undefined,
    });
  });
}

interface ConnectionConfig {
  connectionId: string;
  protocol: 'mysql' | 'postgresql' | 'mongodb' | 'redis' | 'sqlite';
  host: string;
  port: number;
  username: string;
  password?: string;
  database?: string;
  sslEnabled?: boolean;
  mongoUri?: string;
  sqliteFile?: string;
  // SSH tunnel info for remote SQLite
  sshHost?: string;
  sshPort?: number;
  sshUsername?: string;
  sshPassword?: string;
  sshPrivateKey?: string;
}

interface QueryParams {
  connectionId: string;
  database?: string;
  query: string;
}

// Initialize database IPC handlers
export function initDatabaseHandlers() {
  // Connect to database
  ipcMain.handle('db:connect', async (_, config: ConnectionConfig) => {
    try {
      let connection: any;
      let databases: string[] = [];
      
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
          databases = (dbRows as any[]).map(row => row.Database);
          break;
          
        case 'postgresql':
          connection = new PgClient({
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
          databases = pgResult.rows.map((row: any) => row.datname);
          break;
          
        case 'mongodb':
          const mongoUri = config.mongoUri || `mongodb://${config.username}:${config.password}@${config.host}:${config.port}`;
          connection = new MongoClient(mongoUri);
          await connection.connect();
          
          // Get list of databases
          const adminDb = connection.db('admin');
          const dbList = await adminDb.admin().listDatabases();
          databases = dbList.databases.map((db: any) => db.name);
          break;
          
        case 'redis':
          connection = createRedisClient({
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
          const sqliteFilePath = config.sqliteFile || ':memory:';
          let localSqlitePath = sqliteFilePath;
          
          // Check if this is a remote SQLite file (host is not local)
          const isLocalHost = !config.host || config.host === 'localhost' || config.host === '127.0.0.1' || config.host === '::1';
          
          if (sqliteFilePath !== ':memory:' && !isLocalHost && config.sshUsername) {
            // Remote SQLite - need to download via SFTP first
            console.log(`[SQLite] Remote file detected: ${sqliteFilePath} on ${config.host}`);
            
            try {
              // Create temp directory for SQLite files
              const tempDir = path.join(app.getPath('temp'), 'marix-sqlite');
              if (!fs.existsSync(tempDir)) {
                fs.mkdirSync(tempDir, { recursive: true });
              }
              
              // Generate unique local filename
              const timestamp = Date.now();
              const fileName = path.basename(sqliteFilePath);
              localSqlitePath = path.join(tempDir, `${config.connectionId}_${timestamp}_${fileName}`);
              
              // Download file via SFTP
              await new Promise<void>((resolve, reject) => {
                const ssh = new SSHClient();
                
                ssh.on('ready', () => {
                  ssh.sftp((err, sftp) => {
                    if (err) {
                      ssh.end();
                      return reject(new Error(`SFTP session failed: ${err.message}`));
                    }
                    
                    // Download the file
                    const readStream = sftp.createReadStream(sqliteFilePath);
                    const writeStream = fs.createWriteStream(localSqlitePath);
                    
                    readStream.on('error', (e: Error) => {
                      ssh.end();
                      reject(new Error(`Failed to read remote file: ${e.message}`));
                    });
                    
                    writeStream.on('error', (e: Error) => {
                      ssh.end();
                      reject(new Error(`Failed to write local file: ${e.message}`));
                    });
                    
                    writeStream.on('finish', () => {
                      console.log(`[SQLite] Downloaded to: ${localSqlitePath}`);
                      ssh.end();
                      resolve();
                    });
                    
                    readStream.pipe(writeStream);
                  });
                });
                
                ssh.on('error', (err) => {
                  reject(new Error(`SSH connection failed: ${err.message}`));
                });
                
                // Connect to SSH
                ssh.connect({
                  host: config.host,
                  port: config.sshPort || 22,
                  username: config.sshUsername || config.username,
                  password: config.sshPassword || config.password,
                  privateKey: config.sshPrivateKey ? Buffer.from(config.sshPrivateKey) : undefined,
                });
              });
              
              // Store for sync back and cleanup later
              downloadedSqliteFiles.set(config.connectionId, {
                localPath: localSqlitePath,
                remotePath: sqliteFilePath,
                config: config,
              });
              
            } catch (downloadError: any) {
              return {
                success: false,
                error: `Failed to download SQLite file from remote server:\n\n${downloadError.message}\n\nMake sure the file exists on the remote server and you have read permissions.`
              };
            }
          }
          
          // Check if file exists and is accessible (skip for :memory:)
          if (localSqlitePath !== ':memory:') {
            const absolutePath = path.resolve(localSqlitePath);
            
            // Check if file exists
            if (!fs.existsSync(absolutePath)) {
              return { 
                success: false, 
                error: `SQLite file not found: ${absolutePath}\n\nMake sure the file exists and the path is correct.` 
              };
            }
            
            // Check if we have read access
            try {
              fs.accessSync(absolutePath, fs.constants.R_OK | fs.constants.W_OK);
            } catch {
              return { 
                success: false, 
                error: `Permission denied: Cannot read/write SQLite file: ${absolutePath}\n\nCheck file permissions.` 
              };
            }
            
            localSqlitePath = absolutePath;
          }
          
          // Open database with promise wrapper
          connection = await new Promise((resolve, reject) => {
            const db = new sqlite3.Database(localSqlitePath, sqlite3.OPEN_READWRITE, (err) => {
              if (err) {
                reject(err);
              } else {
                resolve(db);
              }
            });
          });
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
    } catch (error: any) {
      console.error('Database connection error:', error);
      return { success: false, error: error.message };
    }
  });
  
  // Disconnect from database
  ipcMain.handle('db:disconnect', async (_, { connectionId }: { connectionId: string }) => {
    try {
      const conn = connections.get(connectionId);
      if (!conn) return { success: true };
      
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
          // Upload back and cleanup downloaded SQLite file if any
          const downloadedFileInfo = downloadedSqliteFiles.get(connectionId);
          if (downloadedFileInfo && fs.existsSync(downloadedFileInfo.localPath)) {
            try {
              // Upload back to remote server
              console.log(`[SQLite] Uploading changes back to remote: ${downloadedFileInfo.remotePath}`);
              await uploadSqliteToRemote(
                downloadedFileInfo.localPath,
                downloadedFileInfo.remotePath,
                downloadedFileInfo.config
              );
              console.log(`[SQLite] Successfully synced back to remote server`);
              
              // Now cleanup local temp file
              fs.unlinkSync(downloadedFileInfo.localPath);
              console.log(`[SQLite] Cleaned up temp file: ${downloadedFileInfo.localPath}`);
            } catch (e: any) {
              console.error(`[SQLite] Failed to sync back to remote: ${e.message}`);
              // Still try to cleanup local file
              try {
                fs.unlinkSync(downloadedFileInfo.localPath);
              } catch {}
            }
            downloadedSqliteFiles.delete(connectionId);
          }
          break;
      }
      
      connections.delete(connectionId);
      return { success: true };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  });

  // Sync SQLite file back to remote server (manual sync)
  ipcMain.handle('db:syncSqlite', async (_, { connectionId }: { connectionId: string }) => {
    try {
      const downloadedFileInfo = downloadedSqliteFiles.get(connectionId);
      if (!downloadedFileInfo) {
        return { success: false, error: 'No remote SQLite file to sync. This feature only works for remote SQLite databases.' };
      }
      
      if (!fs.existsSync(downloadedFileInfo.localPath)) {
        return { success: false, error: 'Local SQLite file not found.' };
      }
      
      console.log(`[SQLite] Manual sync: Uploading to ${downloadedFileInfo.remotePath}`);
      await uploadSqliteToRemote(
        downloadedFileInfo.localPath,
        downloadedFileInfo.remotePath,
        downloadedFileInfo.config
      );
      
      return { success: true, message: 'SQLite file synced to remote server successfully.' };
    } catch (error: any) {
      console.error('[SQLite] Sync failed:', error);
      return { success: false, error: `Failed to sync: ${error.message}` };
    }
  });

  // Get database version
  ipcMain.handle('db:getVersion', async (_, { connectionId }: { connectionId: string }) => {
    try {
      const conn = connections.get(connectionId);
      if (!conn) return { success: false, error: 'Not connected' };

      let version = '';

      switch (conn.protocol) {
        case 'mysql':
          const [mysqlRows] = await conn.connection.query('SELECT VERSION() as version');
          version = `MySQL ${(mysqlRows as any[])[0]?.version || 'unknown'}`;
          // Check if MariaDB
          if (version.toLowerCase().includes('mariadb')) {
            version = version.replace(/mysql/i, 'MariaDB');
          }
          break;

        case 'postgresql':
          const pgResult = await conn.connection.query('SELECT version()');
          const pgVersion = pgResult.rows[0]?.version || '';
          // Extract PostgreSQL version like "PostgreSQL 15.4"
          const pgMatch = pgVersion.match(/PostgreSQL\s+[\d.]+/i);
          version = pgMatch ? pgMatch[0] : `PostgreSQL ${pgVersion.split(' ')[0]}`;
          break;

        case 'mongodb':
          const adminDb = conn.connection.db('admin');
          const buildInfo = await adminDb.command({ buildInfo: 1 });
          version = `MongoDB ${buildInfo.version || 'unknown'}`;
          break;

        case 'redis':
          const info = await conn.connection.info('server');
          const redisMatch = info.match(/redis_version:([\d.]+)/);
          version = `Redis ${redisMatch ? redisMatch[1] : 'unknown'}`;
          break;

        case 'sqlite':
          version = 'SQLite 3.x (local)';
          break;

        default:
          version = conn.protocol;
      }

      return { success: true, version };
    } catch (error: any) {
      console.error('Get version error:', error);
      return { success: false, error: error.message };
    }
  });
  
  // Get tables/collections
  ipcMain.handle('db:getTables', async (_, { connectionId, database }: { connectionId: string; database: string }) => {
    try {
      const conn = connections.get(connectionId);
      if (!conn) return { success: false, error: 'Not connected' };
      
      let tables: { name: string; type: string }[] = [];
      
      switch (conn.protocol) {
        case 'mysql':
          // Switch database if needed
          await conn.connection.changeUser({ database });
          const [mysqlTables] = await conn.connection.query(`
            SELECT TABLE_NAME as name, TABLE_TYPE as type 
            FROM information_schema.TABLES 
            WHERE TABLE_SCHEMA = ?
          `, [database]);
          tables = (mysqlTables as any[]).map(t => ({
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
          tables = pgTables.rows.map((t: any) => ({
            name: t.name,
            type: t.type === 'VIEW' ? 'view' : 'table',
          }));
          break;
          
        case 'mongodb':
          const db = conn.connection.db(database);
          const collections = await db.listCollections().toArray();
          tables = collections.map((c: any) => ({
            name: c.name,
            type: 'collection',
          }));
          break;
          
        case 'redis':
          // Redis doesn't have tables, but we can show keys patterns
          const keys = await conn.connection.keys('*');
          const uniquePrefixes = new Set(keys.map((k: string) => k.split(':')[0]));
          tables = Array.from(uniquePrefixes).map(prefix => ({
            name: prefix as string,
            type: 'keyspace',
          }));
          break;
          
        case 'sqlite':
          return new Promise((resolve) => {
            conn.connection.all(
              "SELECT name, type FROM sqlite_master WHERE type IN ('table', 'view')",
              (err: any, rows: any[]) => {
                if (err) {
                  resolve({ success: false, error: err.message });
                } else {
                  resolve({
                    success: true,
                    tables: rows.map(r => ({ name: r.name, type: r.type })),
                  });
                }
              }
            );
          });
      }
      
      return { success: true, tables };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  });
  
  // Execute query
  ipcMain.handle('db:query', async (_, params: QueryParams) => {
    try {
      const conn = connections.get(params.connectionId);
      if (!conn) return { success: false, error: 'Not connected' };
      
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
              columns: mysqlFields ? (mysqlFields as any[]).map((f: any) => f.name) : Object.keys(mysqlRows[0] || {}),
              rows: mysqlRows,
            };
          } else {
            return {
              success: true,
              columns: [],
              rows: [],
              affectedRows: (mysqlRows as any).affectedRows,
              insertId: (mysqlRows as any).insertId,
            };
          }
          
        case 'postgresql':
          const pgResult = await conn.connection.query(params.query);
          return {
            success: true,
            columns: pgResult.fields?.map((f: any) => f.name) || [],
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
          } else if (mongoQuery.insertOne) {
            const result = await collection.insertOne(mongoQuery.insertOne);
            return { success: true, columns: [], rows: [], insertId: result.insertedId };
          } else if (mongoQuery.aggregate) {
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
          
          const redisResult = await (conn.connection as any)[command.toLowerCase()](...args);
          
          if (typeof redisResult === 'object' && !Array.isArray(redisResult)) {
            const columns = Object.keys(redisResult);
            return { success: true, columns, rows: [redisResult] };
          } else if (Array.isArray(redisResult)) {
            return { success: true, columns: ['value'], rows: redisResult.map(v => ({ value: v })) };
          } else {
            return { success: true, columns: ['result'], rows: [{ result: redisResult }] };
          }
          
        case 'sqlite':
          return new Promise((resolve) => {
            const isSelect = params.query.trim().toUpperCase().startsWith('SELECT');
            if (isSelect) {
              conn.connection.all(params.query, (err: any, rows: any[]) => {
                if (err) {
                  resolve({ success: false, error: err.message });
                } else {
                  const columns = rows.length > 0 ? Object.keys(rows[0]) : [];
                  resolve({ success: true, columns, rows });
                }
              });
            } else {
              conn.connection.run(params.query, function(this: any, err: any) {
                if (err) {
                  resolve({ success: false, error: err.message });
                } else {
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
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  });

  // Get table structure (columns info)
  ipcMain.handle('db:getTableStructure', async (_, { connectionId, database, table }: { connectionId: string; database: string; table: string }) => {
    try {
      const conn = connections.get(connectionId);
      if (!conn) return { success: false, error: 'Not connected' };

      let columns: { name: string; type: string; nullable: boolean; key: string; default: string | null; extra: string }[] = [];

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
          columns = (mysqlCols as any[]).map(c => ({
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
          const primaryKeys = new Set(pgKeys.rows.map((r: any) => r.column_name));
          
          columns = pgCols.rows.map((c: any) => ({
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
            conn.connection.all(`PRAGMA table_info("${table}")`, (err: any, rows: any[]) => {
              if (err) {
                resolve({ success: false, error: err.message });
              } else {
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
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  });

  // Update row in table
  ipcMain.handle('db:updateRow', async (_, { connectionId, database, table, primaryKey, primaryKeyValue, column, newValue }: {
    connectionId: string;
    database: string;
    table: string;
    primaryKey: string;
    primaryKeyValue: any;
    column: string;
    newValue: any;
  }) => {
    try {
      const conn = connections.get(connectionId);
      if (!conn) return { success: false, error: 'Not connected' };

      switch (conn.protocol) {
        case 'mysql':
          if (database) {
            await conn.connection.changeUser({ database });
          }
          await conn.connection.query(
            `UPDATE \`${table}\` SET \`${column}\` = ? WHERE \`${primaryKey}\` = ?`,
            [newValue, primaryKeyValue]
          );
          return { success: true };

        case 'postgresql':
          await conn.connection.query(
            `UPDATE "${table}" SET "${column}" = $1 WHERE "${primaryKey}" = $2`,
            [newValue, primaryKeyValue]
          );
          return { success: true };

        case 'mongodb':
          const db = conn.connection.db(database);
          await db.collection(table).updateOne(
            { [primaryKey]: primaryKeyValue },
            { $set: { [column]: newValue } }
          );
          return { success: true };

        case 'sqlite':
          return new Promise((resolve) => {
            conn.connection.run(
              `UPDATE "${table}" SET "${column}" = ? WHERE "${primaryKey}" = ?`,
              [newValue, primaryKeyValue],
              function(this: any, err: any) {
                if (err) {
                  resolve({ success: false, error: err.message });
                } else {
                  resolve({ success: true, affectedRows: this.changes });
                }
              }
            );
          });

        default:
          return { success: false, error: 'Update not supported for this database type' };
      }
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  });
  
  console.log('Database handlers initialized');
}

// Export helper to get active connection count
export function getDatabaseConnectionCount(): number {
  return connections.size;
}

// Export helper to close all connections
export async function closeAllDatabaseConnections(): Promise<void> {
  console.log(`[Database] Closing all ${connections.size} connections...`);
  for (const [connectionId, conn] of connections) {
    try {
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
    } catch (e) {
      console.log(`[Database] Error closing ${connectionId}:`, e);
    }
  }
  connections.clear();
  console.log('[Database] All connections closed');
}
