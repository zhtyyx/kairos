const DB_NAME = 'kairos-db';
const DB_VERSION = 1;

let dbInstance = null;

async function initDB() {
  if (dbInstance) {
    return dbInstance;
  }

  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = () => {
      reject(request.error);
    };

    request.onsuccess = () => {
      dbInstance = request.result;
      resolve(dbInstance);
    };

    request.onupgradeneeded = (event) => {
      const db = event.target.result;

      if (!db.objectStoreNames.contains('tasks')) {
        const taskStore = db.createObjectStore('tasks', { keyPath: 'id' });
        taskStore.createIndex('board_id', 'board_id', { unique: false });
        taskStore.createIndex('status', 'status', { unique: false });
        taskStore.createIndex('priority', 'priority', { unique: false });
        taskStore.createIndex('due_date', 'due_date', { unique: false });
        taskStore.createIndex('created_at', 'created_at', { unique: false });
      }

      if (!db.objectStoreNames.contains('boards')) {
        const boardStore = db.createObjectStore('boards', { keyPath: 'id' });
        boardStore.createIndex('is_starred', 'is_starred', { unique: false });
        boardStore.createIndex('updated_at', 'updated_at', { unique: false });
      }

      if (!db.objectStoreNames.contains('time_records')) {
        const timeStore = db.createObjectStore('time_records', {
          keyPath: 'id',
          autoIncrement: true
        });
        timeStore.createIndex('date', 'date', { unique: false });
        timeStore.createIndex('started_at', 'started_at', { unique: false });
        timeStore.createIndex('task_id', 'task_id', { unique: false });
        timeStore.createIndex('session_type', 'session_type', { unique: false });
      }

      if (!db.objectStoreNames.contains('activity_log')) {
        const logStore = db.createObjectStore('activity_log', {
          keyPath: 'id',
          autoIncrement: true
        });
        logStore.createIndex('timestamp', 'timestamp', { unique: false });
        logStore.createIndex('type', 'type', { unique: false });
        logStore.createIndex('task_id', 'task_id', { unique: false });
      }

      if (!db.objectStoreNames.contains('settings')) {
        db.createObjectStore('settings', { keyPath: 'key' });
      }
    };
  });
}

function execTransaction(storeName, mode, callback) {
  return initDB().then((db) => {
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(storeName, mode);
      const store = transaction.objectStore(storeName);

      transaction.onerror = () => reject(transaction.error);
      transaction.oncomplete = () => resolve();

      try {
        const result = callback(store);
        if (result && result.onsuccess) {
          result.onsuccess = (event) => resolve(event.target.result);
          result.onerror = () => reject(result.error);
        } else {
          resolve(result);
        }
      } catch (err) {
        reject(err);
      }
    });
  });
}

export const database = {

  async getTasks() {

    return execTransaction('tasks', 'readonly', (store) => {
      return new Promise((resolve, reject) => {
        const request = store.getAll();
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
      });
    });
  },

  async getTasksByBoard(boardId) {

    return execTransaction('tasks', 'readonly', (store) => {
      return new Promise((resolve, reject) => {
        const index = store.index('board_id');
        const request = index.getAll(boardId);
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
      });
    });
  },

  async getTask(id) {

    return execTransaction('tasks', 'readonly', (store) => {
      return new Promise((resolve, reject) => {
        const request = store.get(id);
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
      });
    });
  },

  async createTask(task) {
    const id = crypto.randomUUID();
    const now = new Date().toISOString();

    const newTask = {
      id,
      title: task.title || '',
      description: task.description || '',
      board_id: task.board_id || null,
      status: task.status || 'todo',
      priority: task.priority || 'not-urgent-not-important',
      due_date: task.due_date || null,
      tags: task.tags || [],
      created_at: now,
      updated_at: now
    };


    return execTransaction('tasks', 'readwrite', (store) => {
      return new Promise((resolve, reject) => {
        const request = store.add(newTask);
        request.onsuccess = () => resolve(id);
        request.onerror = () => reject(request.error);
      });
    });
  },

  async updateTask(id, updates) {

    const db = await initDB();
    const transaction = db.transaction('tasks', 'readwrite');
    const store = transaction.objectStore('tasks');

    return new Promise((resolve, reject) => {
      const getRequest = store.get(id);

      getRequest.onsuccess = () => {
        const task = getRequest.result;
        if (!task) {
          reject(new Error(`Task ${id} not found`));
          return;
        }

        const updatedTask = {
          ...task,
          ...updates,
          updated_at: new Date().toISOString()
        };

        const putRequest = store.put(updatedTask);
        putRequest.onsuccess = () => resolve(updatedTask);
        putRequest.onerror = () => reject(putRequest.error);
      };

      getRequest.onerror = () => reject(getRequest.error);
    });
  },

  async deleteTask(id) {

    return execTransaction('tasks', 'readwrite', (store) => {
      return new Promise((resolve, reject) => {
        const request = store.delete(id);
        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error);
      });
    });
  },

  async getBoards() {
    let boards;

    if (!boards) {
      boards = await execTransaction('boards', 'readonly', (store) => {
        return new Promise((resolve, reject) => {
          const request = store.getAll();
          request.onsuccess = () => resolve(request.result);
          request.onerror = () => reject(request.error);
        });
      });
    }

    return boards.sort((a, b) => {
      if (a.is_starred !== b.is_starred) {
        return b.is_starred - a.is_starred;
      }
      return new Date(b.updated_at) - new Date(a.updated_at);
    });
  },

  async getBoard(id) {

    return execTransaction('boards', 'readonly', (store) => {
      return new Promise((resolve, reject) => {
        const request = store.get(id);
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
      });
    });
  },

  async createBoard(board) {
    const id = crypto.randomUUID();
    const now = new Date().toISOString();

    const newBoard = {
      id,
      name: board.name || '新看板',
      description: board.description || '',
      is_starred: board.is_starred || 0,
      created_at: now,
      updated_at: now
    };


    return execTransaction('boards', 'readwrite', (store) => {
      return new Promise((resolve, reject) => {
        const request = store.add(newBoard);
        request.onsuccess = () => resolve(id);
        request.onerror = () => reject(request.error);
      });
    });
  },

  async updateBoard(id, updates) {

    const db = await initDB();
    const transaction = db.transaction('boards', 'readwrite');
    const store = transaction.objectStore('boards');

    return new Promise((resolve, reject) => {
      const getRequest = store.get(id);

      getRequest.onsuccess = () => {
        const board = getRequest.result;
        if (!board) {
          reject(new Error(`Board ${id} not found`));
          return;
        }

        const updatedBoard = {
          ...board,
          ...updates,
          updated_at: new Date().toISOString()
        };

        const putRequest = store.put(updatedBoard);
        putRequest.onsuccess = () => resolve(updatedBoard);
        putRequest.onerror = () => reject(putRequest.error);
      };

      getRequest.onerror = () => reject(getRequest.error);
    });
  },

  async deleteBoard(id) {

    return execTransaction('boards', 'readwrite', (store) => {
      return new Promise((resolve, reject) => {
        const request = store.delete(id);
        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error);
      });
    });
  },

  async recordTime(record) {
    const now = new Date().toISOString();
    const timeRecord = {
      started_at: record.started_at || now,
      ended_at: record.ended_at || now,
      duration_minutes: record.duration_minutes || 0,
      session_type: record.session_type || 'focus',
      task_id: record.task_id || null,
      date: (record.started_at || now).split('T')[0],
      created_at: now
    };


    return execTransaction('time_records', 'readwrite', (store) => {
      return new Promise((resolve, reject) => {
        const request = store.add(timeRecord);
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
      });
    });
  },

  async getTimeRecords(startDate, endDate) {

    const allRecords = await execTransaction('time_records', 'readonly', (store) => {
      return new Promise((resolve, reject) => {
        const request = store.getAll();
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
      });
    });

    if (startDate && endDate) {
      return allRecords.filter((r) => {
        const recordDate = new Date(r.started_at);
        return recordDate >= startDate && recordDate <= endDate;
      });
    }

    return allRecords;
  },

  async getTimeRecordsByDate(date) {

    return execTransaction('time_records', 'readonly', (store) => {
      return new Promise((resolve, reject) => {
        const index = store.index('date');
        const request = index.getAll(date);
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
      });
    });
  },

  async logActivity(activity) {
    const logEntry = {
      type: activity.type || 'info',
      content: activity.content || '',
      task_id: activity.task_id || null,
      metadata: activity.metadata || {},
      timestamp: new Date().toISOString()
    };


    return execTransaction('activity_log', 'readwrite', (store) => {
      return new Promise((resolve, reject) => {
        const request = store.add(logEntry);
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
      });
    });
  },

  async getActivityLog(limit = 100) {

    const logs = await execTransaction('activity_log', 'readonly', (store) => {
      return new Promise((resolve, reject) => {
        const request = store.getAll();
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
      });
    });

    return logs
      .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
      .slice(0, limit);
  },

  async getActivityLogByTask(taskId, limit = 50) {

    const allLogs = await execTransaction('activity_log', 'readonly', (store) => {
      return new Promise((resolve, reject) => {
        const index = store.index('task_id');
        const request = index.getAll(taskId);
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
      });
    });

    return allLogs
      .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
      .slice(0, limit);
  },

  async getSetting(key) {
    return execTransaction('settings', 'readonly', (store) => {
      return new Promise((resolve, reject) => {
        const request = store.get(key);
        request.onsuccess = () => resolve(request.result?.value);
        request.onerror = () => reject(request.error);
      });
    });
  },

  async setSetting(key, value) {
    return execTransaction('settings', 'readwrite', (store) => {
      return new Promise((resolve, reject) => {
        const request = store.put({ key, value });
        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error);
      });
    });
  },

  async getAllSettings() {
    return execTransaction('settings', 'readonly', (store) => {
      return new Promise((resolve, reject) => {
        const request = store.getAll();
        request.onsuccess = () => {
          const settings = {};
          request.result.forEach((item) => {
            settings[item.key] = item.value;
          });
          resolve(settings);
        };
        request.onerror = () => reject(request.error);
      });
    });
  },

  async getHeatmapData(year) {
    const startDate = new Date(year, 0, 1);
    const endDate = new Date(year, 11, 31, 23, 59, 59);

    const records = await this.getTimeRecords(startDate, endDate);

    const heatmapData = {};
    records.forEach((record) => {
      const date = record.date;
      if (!heatmapData[date]) {
        heatmapData[date] = { sessions: 0, minutes: 0 };
      }
      heatmapData[date].sessions++;
      heatmapData[date].minutes += record.duration_minutes || 0;
    });

    return heatmapData;
  },

  async getTotalStats() {
    const records = await this.getTimeRecords();

    let totalPomodoros = 0;
    let totalMinutes = 0;

    records.forEach((record) => {
      if (record.session_type === 'focus') {
        totalPomodoros++;
        totalMinutes += record.duration_minutes || 0;
      }
    });

    return {
      totalPomodoros,
      totalHours: Math.floor(totalMinutes / 60),
      totalMinutes
    };
  },

  async exportAllData() {
    const data = {
      version: DB_VERSION,
      exported_at: new Date().toISOString(),
      tasks: await this.getTasks(),
      boards: await this.getBoards(),
      time_records: await this.getTimeRecords(),
      activity_log: await this.getActivityLog(1000),
      settings: await this.getAllSettings()
    };

    return data;
  },

  async importAllData(data) {

    const db = await initDB();
    const storeNames = ['tasks', 'boards', 'time_records', 'activity_log', 'settings'];
    const transaction = db.transaction(storeNames, 'readwrite');

    const promises = [];

    if (data.tasks && data.tasks.length > 0) {
      const taskStore = transaction.objectStore('tasks');
      data.tasks.forEach((task) => {
        promises.push(
          new Promise((resolve, reject) => {
            const request = taskStore.put(task);
            request.onsuccess = () => resolve();
            request.onerror = () => reject(request.error);
          })
        );
      });
    }

    if (data.boards && data.boards.length > 0) {
      const boardStore = transaction.objectStore('boards');
      data.boards.forEach((board) => {
        promises.push(
          new Promise((resolve, reject) => {
            const request = boardStore.put(board);
            request.onsuccess = () => resolve();
            request.onerror = () => reject(request.error);
          })
        );
      });
    }

    if (data.time_records && data.time_records.length > 0) {
      const timeStore = transaction.objectStore('time_records');
      data.time_records.forEach((record) => {
        promises.push(
          new Promise((resolve, reject) => {
            const request = timeStore.put(record);
            request.onsuccess = () => resolve();
            request.onerror = () => reject(request.error);
          })
        );
      });
    }

    if (data.activity_log && data.activity_log.length > 0) {
      const logStore = transaction.objectStore('activity_log');
      data.activity_log.forEach((log) => {
        promises.push(
          new Promise((resolve, reject) => {
            const request = logStore.put(log);
            request.onsuccess = () => resolve();
            request.onerror = () => reject(request.error);
          })
        );
      });
    }

    if (data.settings && typeof data.settings === 'object') {
      const settingsStore = transaction.objectStore('settings');
      Object.entries(data.settings).forEach(([key, value]) => {
        promises.push(
          new Promise((resolve, reject) => {
            const request = settingsStore.put({ key, value });
            request.onsuccess = () => resolve();
            request.onerror = () => reject(request.error);
          })
        );
      });
    }

    await Promise.all(promises);

    return new Promise((resolve, reject) => {
      transaction.oncomplete = () => {
        resolve();
      };
      transaction.onerror = () => reject(transaction.error);
    });
  },

  async clearAllData() {

    const db = await initDB();
    const storeNames = ['tasks', 'boards', 'time_records', 'activity_log', 'settings'];
    const transaction = db.transaction(storeNames, 'readwrite');

    storeNames.forEach((storeName) => {
      transaction.objectStore(storeName).clear();
    });

    return new Promise((resolve, reject) => {
      transaction.oncomplete = () => {
        resolve();
      };
      transaction.onerror = () => reject(transaction.error);
    });
  },

};

initDB().catch(e => console.error('[db] IndexedDB init failed:', e));

export default database;
