import { database } from './db.js';
import { showConfirm, showToast as uiShowToast } from './ui.js';
import { t } from './i18n.js';

class BoardManager {
  constructor(app) {
    this.app = app;
    this.boardCache = new Map();
    this.currentBoard = null;
    this.allBoardsLoaded = false;

    this.createBoard = this.createBoard.bind(this);
    this.updateBoard = this.updateBoard.bind(this);
    this.deleteBoard = this.deleteBoard.bind(this);
    this.selectBoard = this.selectBoard.bind(this);
  }

  async createBoard(boardData) {
    try {
      const validatedData = this.validateBoardData(boardData);

      const boardWithDefaults = {
        is_starred: 0,
        ...validatedData
      };

      const boardId = await database.createBoard(boardWithDefaults);
      const createdBoard = await database.getBoard(boardId);

      this.boardCache.set(boardId, createdBoard);

      await database.logActivity({
        type: 'create_board',
        content: t('board.log.create', { name: createdBoard.name })
      });

      return createdBoard;
    } catch (error) {
      uiShowToast(t('board.createFail'), 'error');
      throw error;
    }
  }

  async updateBoard(boardId, updates) {
    try {
      const updatedBoard = await database.updateBoard(boardId, updates);
      this.boardCache.set(boardId, updatedBoard);

      await database.logActivity({
        type: 'update_board',
        content: t('board.log.update', { name: updatedBoard.name })
      });

      return updatedBoard;
    } catch (error) {
      uiShowToast(t('board.updateFail'), 'error');
      throw error;
    }
  }

  async deleteBoard(boardId) {
    try {
      const board = await database.getBoard(boardId);
      if (!board) {
        throw new Error(t('board.log.notExist'));
      }

      const tasks = await database.getTasksByBoard(boardId);
      if (tasks.length > 0) {
        const confirmed = await showConfirm(
          t('board.deleteBoardConfirm', { name: board.name, count: tasks.length }),
          { title: t('board.deleteBoardTitle'), confirmText: t('task.confirmDelete'), cancelText: t('task.cancel') }
        );
        if (!confirmed) {
          return;
        }

        for (const task of tasks) {
          await database.deleteTask(task.id);
        }
        // 任务是直接走 database 删除，清掉缓存避免视图使用脏数据
        this.app.taskManager?.clearCache?.();
      }

      await database.deleteBoard(boardId);
      this.boardCache.delete(boardId);

      if (this.currentBoard?.id === boardId) {
        this.currentBoard = null;
      }

      await database.logActivity({
        type: 'delete_board',
        content: t('board.log.delete', { name: board.name })
      });

    } catch (error) {
      uiShowToast(t('board.deleteFail'), 'error');
      throw error;
    }
  }

  async getBoards(options = {}) {
    const { forceRefresh = false } = options;

    try {
      if (!forceRefresh && this.allBoardsLoaded) {
        return this.sortBoards(Array.from(this.boardCache.values()));
      }

      const boards = await database.getBoards();
      this.boardCache.clear();
      boards.forEach((board) => {
        this.boardCache.set(board.id, board);
      });
      this.allBoardsLoaded = true;
      return boards;
    } catch {
      if (this.allBoardsLoaded) {
        return this.sortBoards(Array.from(this.boardCache.values()));
      }
      return [];
    }
  }

  async getBoard(boardId) {
    if (this.boardCache.has(boardId)) {
      return this.boardCache.get(boardId);
    }

    try {
      const board = await database.getBoard(boardId);
      if (board) {
        this.boardCache.set(boardId, board);
      }
      return board;
    } catch {
      return null;
    }
  }

  async toggleStar(boardId) {
    try {
      const board = await this.getBoard(boardId);
      if (!board) {
        throw new Error(t('board.log.notExist'));
      }

      const newStarred = board.is_starred ? 0 : 1;
      await this.updateBoard(boardId, { is_starred: newStarred });

      return newStarred;
    } catch (error) {
      throw error;
    }
  }

  selectBoard(board) {
    this.currentBoard = board;
  }

  clearSelection() {
    this.currentBoard = null;
  }

  validateBoardData(data) {
    if (!data.name || data.name.trim() === '') {
      throw new Error('看板名称不能为空');
    }

    return {
      name: data.name.trim(),
      description: data.description || '',
      is_starred: data.is_starred || 0
    };
  }

  sortBoards(boards) {
    return [...boards].sort((a, b) => {
      if ((a.is_starred || 0) !== (b.is_starred || 0)) {
        return (b.is_starred || 0) - (a.is_starred || 0);
      }
      return new Date(b.updated_at || 0) - new Date(a.updated_at || 0);
    });
  }

  clearCache() {
    this.boardCache.clear();
    this.allBoardsLoaded = false;
  }
}

export default BoardManager;
