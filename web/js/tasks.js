import { database } from './db.js';
import { showToast as uiShowToast } from './ui.js';
import { t } from './i18n.js';

class TaskManager {
  constructor(app) {
    this.app = app;
    this.currentTask = null;
    this.taskCache = new Map();
    this.allTasksLoaded = false;

    this.TASK_STATUS = {
      TODO: 'todo',
      DOING: 'doing',
      REVIEW: 'review',
      DONE: 'done'
    };

    this.PRIORITY_LEVELS = {
      URGENT_IMPORTANT: 'urgent-important',
      NOT_URGENT_IMPORTANT: 'not-urgent-important',
      URGENT_NOT_IMPORTANT: 'urgent-not-important',
      NOT_URGENT_NOT_IMPORTANT: 'not-urgent-not-important'
    };

    this.createTask = this.createTask.bind(this);
    this.updateTask = this.updateTask.bind(this);
    this.deleteTask = this.deleteTask.bind(this);
    this.selectTask = this.selectTask.bind(this);
  }

  async createTask(taskData) {
    try {
      const validatedData = this.validateTaskData(taskData);

      const taskWithDefaults = {
        status: this.TASK_STATUS.TODO,
        priority: this.PRIORITY_LEVELS.NOT_URGENT_NOT_IMPORTANT,
        ...validatedData
      };

      const taskId = await database.createTask(taskWithDefaults);

      const createdTask = await database.getTask(taskId);
      this.taskCache.set(taskId, createdTask);

      await database.logActivity({
        type: 'create',
        content: t('task.log.create', { title: createdTask.title }),
        task_id: taskId
      });

      return createdTask;
    } catch (error) {
      uiShowToast(t('task.createFail'), 'error');
      throw error;
    }
  }

  async updateTask(taskId, updates) {
    try {
      const updatedTask = await database.updateTask(taskId, updates);
      this.taskCache.set(taskId, updatedTask);

      await database.logActivity({
        type: 'update',
        content: t('task.log.update', { title: updatedTask.title }),
        task_id: taskId
      });

      return updatedTask;
    } catch (error) {
      uiShowToast(t('task.updateFail'), 'error');
      throw error;
    }
  }

  async deleteTask(taskId) {
    try {
      const task = await database.getTask(taskId);
      if (!task) {
        throw new Error(t('task.log.notExist'));
      }

      await database.deleteTask(taskId);
      this.taskCache.delete(taskId);

      if (this.currentTask?.id === taskId) {
        this.currentTask = null;
      }

      await database.logActivity({
        type: 'delete',
        content: t('task.log.delete', { title: task.title }),
        task_id: taskId
      });

    } catch (error) {
      uiShowToast(t('task.deleteFail'), 'error');
      throw error;
    }
  }

  async getTasks(boardId = null, options = {}) {
    const { forceRefresh = false } = options;

    try {
      if (!forceRefresh && this.allTasksLoaded) {
        const allTasks = Array.from(this.taskCache.values());
        return boardId ? allTasks.filter((task) => task.board_id === boardId) : allTasks;
      }

      let tasks;
      if (boardId) {
        tasks = await database.getTasksByBoard(boardId);
      } else {
        tasks = await database.getTasks();
      }

      if (boardId) {
        tasks.forEach((task) => {
          this.taskCache.set(task.id, task);
        });
      } else {
        this.taskCache.clear();
        tasks.forEach((task) => {
          this.taskCache.set(task.id, task);
        });
        this.allTasksLoaded = true;
      }

      return tasks;
    } catch {
      if (this.allTasksLoaded) {
        const allTasks = Array.from(this.taskCache.values());
        return boardId ? allTasks.filter((task) => task.board_id === boardId) : allTasks;
      }
      return [];
    }
  }

  async getTask(taskId) {
    if (this.taskCache.has(taskId)) {
      return this.taskCache.get(taskId);
    }

    try {
      const task = await database.getTask(taskId);
      if (task) {
        this.taskCache.set(taskId, task);
      }
      return task;
    } catch {
      return null;
    }
  }

  selectTask(task) {
    this.currentTask = task;
    this.app.currentTask = task;
    this.app.renderSelectedTask?.();
  }

  clearSelection() {
    this.currentTask = null;
    this.app.currentTask = null;
    this.app.renderSelectedTask?.();
  }

  validateTaskData(data) {
    if (!data.title || data.title.trim() === '') {
      throw new Error(t('task.log.titleEmpty'));
    }

    return {
      title: data.title.trim(),
      description: data.description || '',
      board_id: data.board_id || null,
      status: data.status || this.TASK_STATUS.TODO,
      priority: data.priority || this.PRIORITY_LEVELS.NOT_URGENT_NOT_IMPORTANT,
      due_date: data.due_date || null,
      tags: data.tags || []
    };
  }

  filterTasks(tasks, filters = {}) {
    return tasks.filter((task) => {
      if (filters.status && task.status !== filters.status) {
        return false;
      }
      if (filters.priority && task.priority !== filters.priority) {
        return false;
      }
      if (filters.board_id && task.board_id !== filters.board_id) {
        return false;
      }
      if (filters.search) {
        const searchLower = filters.search.toLowerCase();
        const titleMatch = task.title.toLowerCase().includes(searchLower);
        const descMatch = task.description?.toLowerCase().includes(searchLower);
        if (!titleMatch && !descMatch) {
          return false;
        }
      }
      return true;
    });
  }

  sortTasks(tasks, sortBy = 'created_at', order = 'desc') {
    return [...tasks].sort((a, b) => {
      let aVal = a[sortBy];
      let bVal = b[sortBy];

      if (sortBy.includes('_at')) {
        aVal = new Date(aVal || 0).getTime();
        bVal = new Date(bVal || 0).getTime();
      }

      if (order === 'asc') {
        return aVal > bVal ? 1 : -1;
      } else {
        return aVal < bVal ? 1 : -1;
      }
    });
  }

  clearCache() {
    this.taskCache.clear();
    this.allTasksLoaded = false;
  }
}

export default TaskManager;
