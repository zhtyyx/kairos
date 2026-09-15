import { database } from './db.js';
import { showAlert } from './ui.js';
import { t, getLang } from './i18n.js';

class HeatmapManager {
  constructor(app) {
    this.app = app;
    this.currentYear = new Date().getFullYear();
  }

  async init() {
    await this.renderHeatmap(this.currentYear);
    this.setupYearSelector();
  }

  setupYearSelector() {
    const selector = document.getElementById('year-selector');
    if (!selector) return;

    const currentYear = new Date().getFullYear();
    const startYear = Math.min(2024, currentYear - 2);

    selector.innerHTML = '';
    for (let year = currentYear; year >= startYear; year--) {
      const option = document.createElement('option');
      option.value = year;
      option.textContent = year;
      if (year === this.currentYear) {
        option.selected = true;
      }
      selector.appendChild(option);
    }

    if (!this._yearSelectorBound) {
      selector.addEventListener('change', async (e) => {
        this.currentYear = parseInt(e.target.value);
        await this.renderHeatmap(this.currentYear);
      });
      this._yearSelectorBound = true;
    }
  }

  async renderHeatmap(year) {
    try {
      const heatmapData = await database.getHeatmapData(year);
      const grid = document.getElementById('heatmap-grid');
      if (!grid) return;

      grid.innerHTML = '';

      let totalContributions = 0;
      Object.values(heatmapData).forEach((data) => {
        totalContributions += data.sessions;
      });

      const title = document.getElementById('heatmap-title');
      if (title) {
        title.textContent = t('heatmap.contributions', { count: totalContributions, year });
      }

      const startDate = new Date(year, 0, 1);
      const endDate = new Date(year, 11, 31);

      let currentDate = new Date(startDate);
      const startDayOfWeek = currentDate.getDay();
      if (startDayOfWeek !== 0) {
        currentDate.setDate(currentDate.getDate() - startDayOfWeek);
      }

      const weeks = [];
      let currentWeek = [];

      while (currentDate <= endDate) {
        if (currentWeek.length === 7) {
          weeks.push(currentWeek);
          currentWeek = [];
        }

        const dateStr = this.formatDate(currentDate);
        const isInYear = currentDate >= startDate && currentDate <= endDate;
        const data = heatmapData[dateStr] || { sessions: 0, minutes: 0 };

        currentWeek.push({
          date: dateStr,
          sessions: isInYear ? data.sessions : 0,
          minutes: isInYear ? data.minutes : 0,
          isInYear
        });

        currentDate.setDate(currentDate.getDate() + 1);
      }

      if (currentWeek.length > 0) {
        while (currentWeek.length < 7) {
          currentWeek.push({ date: '', sessions: 0, minutes: 0, isInYear: false });
        }
        weeks.push(currentWeek);
      }

      weeks.forEach((week) => {
        const weekColumn = document.createElement('div');
        weekColumn.className = 'heatmap-week';

        week.forEach((day) => {
          const cell = document.createElement('div');
          cell.className = 'heatmap-day';

          if (day.isInYear) {
            const level = this.getContributionLevel(day.sessions);
            cell.setAttribute('data-level', level);
            cell.setAttribute('data-date', day.date);
            cell.setAttribute('data-sessions', day.sessions);
            cell.setAttribute('data-minutes', day.minutes);

            cell.title = this.getTooltipText(day);

            cell.addEventListener('click', () => {
              this.showDayDetails(day);
            });
          } else {
            cell.classList.add('empty');
          }

          weekColumn.appendChild(cell);
        });

        grid.appendChild(weekColumn);
      });

    } catch {
    }
  }

  getContributionLevel(sessions) {
    if (sessions === 0) return 0;
    if (sessions <= 2) return 1;
    if (sessions <= 4) return 2;
    if (sessions <= 6) return 3;
    return 4;
  }

  getTooltipText(day) {
    const date = new Date(day.date);
    const locale = getLang() === 'zh' ? 'zh-CN' : 'en-US';
    const formattedDate = date.toLocaleDateString(locale, {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });

    if (day.sessions === 0) {
      return `${formattedDate}\n${t('heatmap.noActivity')}`;
    }

    const hours = Math.floor(day.minutes / 60);
    const mins = day.minutes % 60;
    const timeStr = hours > 0 ? t('heatmap.hours', { h: hours, m: mins }) : t('heatmap.minutesOnly', { m: mins });

    return `${formattedDate}\n${t('heatmap.pomodoros', { count: day.sessions, time: timeStr })}`;
  }

  async showDayDetails(day) {
    if (day.sessions === 0) return;

    try {
      const records = await database.getTimeRecordsByDate(day.date);
      const locale = getLang() === 'zh' ? 'zh-CN' : 'en-US';

      const hours = Math.floor(day.minutes / 60);
      const mins = day.minutes % 60;
      const timeStr = hours > 0 ? t('heatmap.hours', { h: hours, m: mins }) : t('heatmap.minutesOnly', { m: mins });

      let details = `${day.date}\n\n`;
      details += `${t('heatmap.dayDetail.pomodoros', { count: day.sessions })}\n`;
      details += `${t('heatmap.dayDetail.duration', { time: timeStr })}\n\n`;
      details += `${t('heatmap.dayDetail.records')}\n`;

      records.forEach((record, index) => {
        const startTime = new Date(record.started_at).toLocaleTimeString(locale, {
          hour: '2-digit',
          minute: '2-digit'
        });
        details += `${index + 1}. ${startTime} - ${t('heatmap.minutesOnly', { m: record.duration_minutes })}\n`;
      });

      showAlert(details, { title: t('heatmap.dayDetail.title', { date: day.date }) });
    } catch (e) {
      console.error('[heatmap] 获取日期详情失败:', e);
    }
  }

  formatDate(date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  async updateStats() {
    try {
      const stats = await database.getTotalStats();

      const pomodorosEl = document.getElementById('total-pomodoros');
      const focusTimeEl = document.getElementById('total-focus-time');
      const focusLevelEl = document.getElementById('focus-level');

      if (pomodorosEl) {
        pomodorosEl.textContent = stats.totalPomodoros;
      }

      if (focusTimeEl) {
        focusTimeEl.textContent = stats.totalHours;
      }

      if (focusLevelEl) {
        const level = this.calculateFocusLevel(stats.totalPomodoros);
        focusLevelEl.textContent = level.number;
        const levelText = focusLevelEl.nextElementSibling;
        if (levelText) {
          levelText.textContent = level.name;
        }
      }
    } catch (e) {
      console.error('[heatmap] 更新统计数据失败:', e);
    }
  }

  calculateFocusLevel(totalPomodoros) {
    if (totalPomodoros < 10) {
      return { number: 1, name: t('stats.level1') };
    } else if (totalPomodoros < 50) {
      return { number: 2, name: t('stats.level2') };
    } else if (totalPomodoros < 100) {
      return { number: 3, name: t('stats.level3') };
    } else if (totalPomodoros < 500) {
      return { number: 4, name: t('stats.level4') };
    } else {
      return { number: 5, name: t('stats.level5') };
    }
  }
}

export default HeatmapManager;
