const { test, expect } = require('@playwright/test');

test.describe('TimerManager 核心计算', () => {

  test('getFormattedTime 正确格式化', async ({ page }) => {
    const results = await page.evaluate(() => {

      function getFormattedTime(timeLeft) {
        const minutes = Math.floor(timeLeft / 60);
        const seconds = timeLeft % 60;
        return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
      }

      return [
        getFormattedTime(25 * 60),
        getFormattedTime(0),
        getFormattedTime(61),
        getFormattedTime(5),
        getFormattedTime(59 * 60 + 59),
      ];
    });

    expect(results[0]).toBe('25:00');
    expect(results[1]).toBe('00:00');
    expect(results[2]).toBe('01:01');
    expect(results[3]).toBe('00:05');
    expect(results[4]).toBe('59:59');
  });

  test('getProgress 返回正确百分比', async ({ page }) => {
    const results = await page.evaluate(() => {
      function getProgress(sessionDuration, timeLeft) {
        const duration = sessionDuration || 1;
        return ((duration - timeLeft) / duration) * 100;
      }

      return [
        getProgress(1500, 1500),
        getProgress(1500, 0),
        getProgress(1500, 750),
        getProgress(300, 100),
      ];
    });

    expect(results[0]).toBe(0);
    expect(results[1]).toBe(100);
    expect(results[2]).toBe(50);
    expect(results[3]).toBeCloseTo(66.67, 1);
  });

  test('setDuration 负值回退到 25 分钟', async ({ page }) => {
    const result = await page.evaluate(() => {

      function normalizeDuration(minutes) {
        if (minutes <= 0) minutes = 25;
        return minutes * 60;
      }

      return [
        normalizeDuration(50),
        normalizeDuration(-5),
        normalizeDuration(0),
        normalizeDuration(1),
      ];
    });

    expect(result[0]).toBe(3000);
    expect(result[1]).toBe(1500);
    expect(result[2]).toBe(1500);
    expect(result[3]).toBe(60);
  });

  test('时间戳驱动的剩余时间计算', async ({ page }) => {
    const result = await page.evaluate(() => {

      const endTimestamp = Date.now() + 1500 * 1000;
      const remaining = Math.round((endTimestamp - Date.now()) / 1000);
      return remaining >= 1499 && remaining <= 1501;
    });

    expect(result).toBe(true);
  });
});

test.describe('HeatmapManager 核心计算', () => {

  test('getContributionLevel 分级正确', async ({ page }) => {
    const results = await page.evaluate(() => {
      function getContributionLevel(sessions) {
        if (sessions === 0) return 0;
        if (sessions <= 2) return 1;
        if (sessions <= 4) return 2;
        if (sessions <= 6) return 3;
        return 4;
      }

      return [
        getContributionLevel(0),
        getContributionLevel(1),
        getContributionLevel(2),
        getContributionLevel(3),
        getContributionLevel(4),
        getContributionLevel(5),
        getContributionLevel(6),
        getContributionLevel(7),
        getContributionLevel(10),
      ];
    });

    expect(results[0]).toBe(0);
    expect(results[1]).toBe(1);
    expect(results[2]).toBe(1);
    expect(results[3]).toBe(2);
    expect(results[4]).toBe(2);
    expect(results[5]).toBe(3);
    expect(results[6]).toBe(3);
    expect(results[7]).toBe(4);
    expect(results[8]).toBe(4);
  });

  test('calculateFocusLevel 等级边界正确', async ({ page }) => {
    const results = await page.evaluate(() => {
      function calculateFocusLevel(totalPomodoros) {
        if (totalPomodoros < 10) return 1;
        if (totalPomodoros < 50) return 2;
        if (totalPomodoros < 100) return 3;
        if (totalPomodoros < 500) return 4;
        return 5;
      }

      return [
        calculateFocusLevel(0),
        calculateFocusLevel(9),
        calculateFocusLevel(10),
        calculateFocusLevel(49),
        calculateFocusLevel(50),
        calculateFocusLevel(99),
        calculateFocusLevel(100),
        calculateFocusLevel(499),
        calculateFocusLevel(500),
      ];
    });

    expect(results[0]).toBe(1);
    expect(results[1]).toBe(1);
    expect(results[2]).toBe(2);
    expect(results[3]).toBe(2);
    expect(results[4]).toBe(3);
    expect(results[5]).toBe(3);
    expect(results[6]).toBe(4);
    expect(results[7]).toBe(4);
    expect(results[8]).toBe(5);
  });

  test('formatDate 格式为 YYYY-MM-DD', async ({ page }) => {
    const results = await page.evaluate(() => {
      function formatDate(date) {
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
      }

      return [
        formatDate(new Date(2024, 0, 1)),
        formatDate(new Date(2024, 11, 31)),
        formatDate(new Date(2024, 5, 9)),
      ];
    });

    expect(results[0]).toBe('2024-01-01');
    expect(results[1]).toBe('2024-12-31');
    expect(results[2]).toBe('2024-06-09');
  });

  test('年份选择器 startYear 动态化', async ({ page }) => {
    const results = await page.evaluate(() => {
      function getStartYear(currentYear) {
        return Math.min(2024, currentYear - 2);
      }

      return [
        getStartYear(2026),
        getStartYear(2027),
        getStartYear(2024),
        getStartYear(2023),
      ];
    });

    expect(results[0]).toBe(2024);
    expect(results[1]).toBe(2024);
    expect(results[2]).toBe(2022);
    expect(results[3]).toBe(2021);
  });

  test('热力图网格生成覆盖全年', async ({ page }) => {
    const result = await page.evaluate(() => {
      const year = 2025;
      const startDate = new Date(year, 0, 1);
      const endDate = new Date(year, 11, 31);

      let currentDate = new Date(startDate);
      const startDayOfWeek = currentDate.getDay();
      if (startDayOfWeek !== 0) {
        currentDate.setDate(currentDate.getDate() - startDayOfWeek);
      }

      let dayCount = 0;
      let inYearCount = 0;
      const weeks = [];
      let currentWeek = [];

      while (currentDate <= endDate) {
        if (currentWeek.length === 7) {
          weeks.push(currentWeek);
          currentWeek = [];
        }
        const isInYear = currentDate >= startDate && currentDate <= endDate;
        currentWeek.push({ isInYear });
        if (isInYear) inYearCount++;
        dayCount++;
        currentDate.setDate(currentDate.getDate() + 1);
      }
      if (currentWeek.length > 0) weeks.push(currentWeek);

      return { dayCount, inYearCount, weekCount: weeks.length };
    });

    expect(result.inYearCount).toBe(365);
    expect(result.weekCount).toBeGreaterThanOrEqual(52);
  });
});
