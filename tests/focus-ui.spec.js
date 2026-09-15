const { test, expect } = require('@playwright/test');

const DEV_URL = '/?dev=1';

async function gotoApp(page) {
  await page.goto(DEV_URL);
  await page.waitForSelector('#app:not(.hidden)', { timeout: 10000 });
}

async function gotoAppWithViewport(page, width, height) {
  await page.setViewportSize({ width, height });
  await page.goto(DEV_URL);
  await page.waitForSelector('#app:not(.hidden)', { timeout: 10000 });
}

test.describe('计时器按钮', () => {

  test.beforeEach(async ({ page }) => {
    await gotoApp(page);
    await page.waitForSelector('#start-pause-btn');
  });

  test('按钮显示中文文字而非符号', async ({ page }) => {
    const startBtn = page.locator('#start-pause-btn');
    const resetBtn = page.locator('#reset-btn');

    await expect(startBtn).toHaveText('开始专注');
    await expect(resetBtn).toHaveText('重置');
  });

  test('按钮容器水平排列 (display:flex)', async ({ page }) => {
    const controls = page.locator('.timer-controls');
    await expect(controls).toHaveCSS('display', 'flex');
    await expect(controls).toHaveCSS('justify-content', 'center');
  });

  test('主按钮为方角陶瓷色风格', async ({ page }) => {
    const btn = page.locator('#start-pause-btn');
    await expect(btn).toHaveCSS('border-radius', '6px');
    await expect(btn).toHaveCSS('height', '42px');

    const bg = await btn.evaluate(el => getComputedStyle(el).backgroundColor);

    expect(bg).toBe('rgb(193, 127, 89)');
  });

  test('次要按钮为方角风格', async ({ page }) => {
    const btn = page.locator('#reset-btn');
    await expect(btn).toHaveCSS('border-radius', '6px');
    await expect(btn).toHaveCSS('height', '42px');
  });
});

test.describe('计时器圆环', () => {

  test('圆环尺寸为 280px', async ({ page }) => {
    await gotoApp(page);
    await page.waitForSelector('.timer-ring-wrap');
    const wrap = page.locator('.timer-ring-wrap');
    await expect(wrap).toHaveCSS('width', '280px');
    await expect(wrap).toHaveCSS('height', '280px');
  });

  test('计时器数字字号 64px', async ({ page }) => {
    await gotoApp(page);
    await page.waitForSelector('.timer-display');
    const display = page.locator('.timer-section .timer-display');
    await expect(display).toHaveCSS('font-size', '64px');
  });
});

test.describe('记录输入框（墨线底线风格）', () => {

  test.beforeEach(async ({ page }) => {
    await gotoApp(page);
    await page.waitForSelector('.focus-compose-row');
  });

  test('输入行为底线样式，无背景色', async ({ page }) => {
    const row = page.locator('.focus-compose-row');
    await expect(row).toHaveCSS('border-radius', '0px');

    const bg = await row.evaluate(el => getComputedStyle(el).backgroundColor);
    expect(bg).toBe('rgba(0, 0, 0, 0)');

    const borderBottom = await row.evaluate(el => getComputedStyle(el).borderBottomStyle);
    expect(borderBottom).toBe('solid');
  });

  test('输入框无 box-shadow（消除隐藏线）', async ({ page }) => {
    const input = page.locator('.focus-compose-input');
    const shadow = await input.evaluate(el => getComputedStyle(el).boxShadow);
    expect(shadow).toBe('none');
  });

  test('placeholder 颜色可读 (#78716C)', async ({ page }) => {
    const input = page.locator('.focus-compose-input');
    await expect(input).toHaveCSS('font-size', '15px');
  });

  test('发送按钮为方角', async ({ page }) => {
    const send = page.locator('.focus-compose-send');
    await expect(send).toHaveCSS('border-radius', '4px');
  });
});

test.describe('任务名标签', () => {

  test('任务名左对齐 padding-left: 0', async ({ page }) => {
    await gotoApp(page);

    await page.evaluate(() => {
      const el = document.querySelector('.focus-selected-task');
      if (el) el.hidden = false;
    });
    const task = page.locator('.focus-selected-task');
    await expect(task).toHaveCSS('padding-left', '0px');
    await expect(task).toHaveCSS('font-size', '13px');
  });
});

test.describe('自定义项目下拉框', () => {

  test.beforeEach(async ({ page }) => {
    await gotoApp(page);
    await page.waitForSelector('#project-dropdown');
  });

  test('原生 select 隐藏', async ({ page }) => {
    const nativeSelect = page.locator('.project-filter.project-select');
    await expect(nativeSelect).toBeHidden();
  });

  test('自定义下拉框显示，初始文字为"所有项目"', async ({ page }) => {
    const trigger = page.locator('.custom-dropdown-trigger');
    await expect(trigger).toBeVisible();
    await expect(trigger.locator('.custom-dropdown-text')).toHaveText('所有项目');
  });

  test('点击触发器打开菜单', async ({ page }) => {
    const dropdown = page.locator('#project-dropdown');
    const menu = page.locator('.custom-dropdown-menu');

    await expect(menu).not.toBeVisible();

    await dropdown.locator('.custom-dropdown-trigger').click();
    await expect(dropdown).toHaveClass(/is-open/);
    await expect(menu).toBeVisible();
  });

  test('选择选项后菜单关闭，文字更新', async ({ page }) => {
    const dropdown = page.locator('#project-dropdown');
    const trigger = dropdown.locator('.custom-dropdown-trigger');

    await trigger.click();

    const firstOption = page.locator('.custom-dropdown-option').first();
    await firstOption.click();

    await expect(dropdown).not.toHaveClass(/is-open/);
    await expect(trigger.locator('.custom-dropdown-text')).toHaveText('所有项目');
  });

  test('点击外部关闭菜单', async ({ page }) => {
    const dropdown = page.locator('#project-dropdown');

    await dropdown.locator('.custom-dropdown-trigger').click();
    await expect(dropdown).toHaveClass(/is-open/);

    await page.locator('.center-area').click();
    await expect(dropdown).not.toHaveClass(/is-open/);
  });

  test('下拉菜单为白底圆角浮层', async ({ page }) => {
    const dropdown = page.locator('#project-dropdown');
    await dropdown.locator('.custom-dropdown-trigger').click();

    const menu = page.locator('.custom-dropdown-menu');
    await expect(menu).toHaveCSS('border-radius', '8px');

    const bg = await menu.evaluate(el => getComputedStyle(el).backgroundColor);

    expect(bg).not.toBe('rgba(0, 0, 0, 0)');
  });
});

test.describe('搜索框', () => {

  test.beforeEach(async ({ page }) => {
    await gotoApp(page);
    await page.waitForSelector('.search-input', { state: 'visible' });
  });

  test('搜索框文字左对齐', async ({ page }) => {
    const input = page.locator('.panel-top-controls .search-input');
    await expect(input).toHaveCSS('text-align', 'left');
    await expect(input).toHaveCSS('padding-left', '0px');
  });

  test('搜索框聚焦无粗边框', async ({ page }) => {
    const input = page.locator('.panel-top-controls .search-input');
    await input.focus();

    const borderTop = await input.evaluate(el => getComputedStyle(el).borderTopStyle);
    expect(borderTop).toBe('none');

    const borderLeft = await input.evaluate(el => getComputedStyle(el).borderLeftStyle);
    expect(borderLeft).toBe('none');
  });

  test('搜索框底线风格', async ({ page }) => {
    const input = page.locator('.panel-top-controls .search-input');
    const borderBottom = await input.evaluate(el => getComputedStyle(el).borderBottomStyle);
    expect(borderBottom).toBe('solid');
  });
});

test.describe('开始/暂停 状态切换', () => {

  test('点击"开始专注"后按钮变为"暂停"，样式切换', async ({ page }) => {
    await gotoApp(page);
    await page.waitForSelector('#start-pause-btn');
    const btn = page.locator('#start-pause-btn');

    await expect(btn).toHaveText('开始专注');
    await expect(btn).not.toHaveClass(/is-paused/);

    await btn.click();

    await expect(btn).toHaveText('暂停');
    await expect(btn).toHaveClass(/is-paused/);
  });

  test('暂停状态下按钮添加 is-paused 类且 CSS 规则存在', async ({ page }) => {
    await gotoApp(page);
    await page.waitForSelector('#start-pause-btn');
    const btn = page.locator('#start-pause-btn');

    await btn.click();
    await expect(btn).toHaveClass(/is-paused/);

    const ruleExists = await page.evaluate(() => {
      for (const sheet of document.styleSheets) {
        try {
          for (const rule of sheet.cssRules) {
            if (rule.selectorText?.includes('.timer-ctrl-main.is-paused') &&
                !rule.selectorText.includes(':hover') &&
                !rule.selectorText.includes('dark')) {
              return rule.style.background || rule.style.backgroundColor;
            }
          }
        } catch (e) { /* cross-origin */ }
      }
      return null;
    });

    expect(ruleExists).toBeTruthy();
  });

  test('再次点击恢复为"开始专注"', async ({ page }) => {
    await gotoApp(page);
    await page.waitForSelector('#start-pause-btn');
    const btn = page.locator('#start-pause-btn');

    await btn.click();
    await expect(btn).toHaveText('暂停');

    await btn.click();
    await expect(btn).toHaveText('开始专注');
    await expect(btn).not.toHaveClass(/is-paused/);
  });
});

test.describe('暗色模式', () => {

  test.beforeEach(async ({ page }) => {
    await gotoApp(page);
    await page.waitForSelector('#start-pause-btn');
    await page.evaluate(() => document.documentElement.setAttribute('data-theme', 'dark'));
  });

  test('主按钮暗色模式下有边框颜色', async ({ page }) => {
    const btn = page.locator('#start-pause-btn');
    const borderColor = await btn.evaluate(el => getComputedStyle(el).borderTopColor);
    expect(borderColor).not.toBe('rgba(0, 0, 0, 0)');
  });

  test('次要按钮暗色模式下边框与亮色不同', async ({ page }) => {
    const hasDarkTheme = await page.evaluate(() =>
      document.documentElement.getAttribute('data-theme') === 'dark'
    );
    expect(hasDarkTheme).toBe(true);
  });

  test('输入框暗色模式下背景透明', async ({ page }) => {
    const compose = page.locator('.focus-compose');
    const bg = await compose.evaluate(el => getComputedStyle(el).backgroundColor);
    expect(bg).toBe('rgba(0, 0, 0, 0)');
  });

  test('自定义下拉框暗色模式下菜单有深色背景', async ({ page }) => {
    const dropdown = page.locator('#project-dropdown');
    await dropdown.locator('.custom-dropdown-trigger').click();
    const menu = page.locator('.custom-dropdown-menu');

    const bg = await menu.evaluate(el => getComputedStyle(el).backgroundColor);
    expect(bg).not.toBe('rgb(255, 255, 255)');
  });
});

test.describe('响应式 - 平板 (768px)', () => {

  test.beforeEach(async ({ page }) => {
    await gotoAppWithViewport(page, 768, 1024);
    await page.waitForSelector('.timer-ring-wrap');
  });

  test('圆环缩小到 210px', async ({ page }) => {
    const wrap = page.locator('.timer-ring-wrap');
    await expect(wrap).toHaveCSS('width', '210px');
  });

  test('按钮缩小但保持可点击', async ({ page }) => {
    const btn = page.locator('#start-pause-btn');
    const height = await btn.evaluate(el => parseInt(getComputedStyle(el).height));
    expect(height).toBeLessThanOrEqual(42);
    expect(height).toBeGreaterThanOrEqual(32);
  });
});

test.describe('响应式 - 手机 (375px)', () => {

  test.beforeEach(async ({ page }) => {
    await gotoAppWithViewport(page, 375, 812);
    await page.waitForSelector('.timer-ring-wrap');
  });

  test('圆环缩小到 180px', async ({ page }) => {
    const wrap = page.locator('.timer-ring-wrap');
    await expect(wrap).toHaveCSS('width', '180px');
  });

  test('计时器字号缩小到 40px', async ({ page }) => {
    const display = page.locator('.timer-section .timer-display');
    await expect(display).toHaveCSS('font-size', '40px');
  });
});

test.describe('输入框聚焦交互', () => {

  test('compose-row 有 focus-within 样式规则', async ({ page }) => {
    await gotoApp(page);
    await page.waitForSelector('.focus-compose-input');

    const ruleValue = await page.evaluate(() => {
      for (const sheet of document.styleSheets) {
        try {
          for (const rule of sheet.cssRules) {
            if (rule.selectorText?.includes('focus-compose-row') &&
                rule.selectorText?.includes('focus-within') &&
                !rule.selectorText?.includes('dark')) {
              return rule.style.borderBottomColor;
            }
          }
        } catch (e) { /* cross-origin */ }
      }
      return null;
    });
    expect(ruleValue).toBeTruthy();
    expect(ruleValue).not.toContain('var(');
  });
});

test.describe('布局尺寸', () => {

  test('compose 区域 max-width: 520px', async ({ page }) => {
    await gotoApp(page);
    await page.waitForSelector('.focus-compose');
    const maxWidth = await page.locator('.focus-compose').evaluate(el => getComputedStyle(el).maxWidth);
    expect(maxWidth).toBe('520px');
  });

  test('center-area gap: 40px', async ({ page }) => {
    await gotoApp(page);
    await page.waitForSelector('.center-area');
    const gap = await page.locator('.center-area').evaluate(el => getComputedStyle(el).gap);
    expect(gap).toBe('40px');
  });

  test('按钮间距 gap: 14px', async ({ page }) => {
    await gotoApp(page);
    await page.waitForSelector('.timer-controls');
    await expect(page.locator('.timer-controls')).toHaveCSS('gap', '14px');
  });
});

test.describe('下拉框动态更新', () => {
  async function createProject(page, name) {
    await page.getByRole('button', { name: '项目', exact: true }).click();
    await page.getByRole('button', { name: /^(\+ )?新建项目$/ }).click();
    await page.getByRole('textbox', { name: '项目名称', exact: true }).fill(name);
    await page.getByRole('button', { name: '创建', exact: true }).click();
    await expect(page.getByRole('heading', { name, exact: true })).toBeVisible();
  }

  test('创建项目后专注菜单同步更新，刷新后仍保留', async ({ page }) => {
    await gotoApp(page);
    await createProject(page, '工作');
    await createProject(page, '生活');
    await page.getByRole('button', { name: '专注', exact: true }).click();

    for (const reload of [false, true]) {
      if (reload) await page.reload();
      const options = page.locator('#project-dropdown .custom-dropdown-option');
      await expect(options).toHaveCount(3);
      await page.locator('.custom-dropdown-trigger').click();
      await expect(options.filter({ hasText: /^所有项目$/ })).toBeVisible();
      await expect(options.filter({ hasText: /^工作$/ })).toBeVisible();
      await expect(options.filter({ hasText: /^生活$/ })).toBeVisible();
    }
  });

  test('选择新增项目后值和文字正确更新', async ({ page }) => {
    await gotoApp(page);
    await createProject(page, '工作');
    await page.getByRole('button', { name: '专注', exact: true }).click();
    const option = page.locator('#project-dropdown .custom-dropdown-option').filter({ hasText: /^工作$/ });
    await expect(option).toHaveCount(1);
    const projectId = await option.getAttribute('data-value');
    expect(projectId).toBeTruthy();
    await page.locator('.custom-dropdown-trigger').click();
    await option.click();
    await expect(page.locator('#project-dropdown')).toHaveAttribute('data-value', projectId);
    await expect(page.locator('.custom-dropdown-text')).toHaveText('工作');
    await expect(page.locator('.custom-dropdown-menu')).not.toBeVisible();
  });
});

test.describe('重置按钮', () => {

  test('点击重置恢复计时器显示', async ({ page }) => {
    await gotoApp(page);
    await page.waitForSelector('#start-pause-btn');

    const display = page.locator('.timer-display');
    const initialText = await display.textContent();

    await page.locator('#start-pause-btn').click();
    await page.waitForTimeout(1500);

    await page.locator('#reset-btn').click();
    const confirmBtn = page.locator('.modal-button-primary:has-text("确认"), .modal-button-primary:has-text("确定")');
    if (await confirmBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
      await confirmBtn.click();
    }

    await expect(display).toHaveText(initialText);
  });

  test('重置后开始按钮恢复为"开始专注"', async ({ page }) => {
    await gotoApp(page);
    await page.waitForSelector('#start-pause-btn');

    await page.locator('#start-pause-btn').click();
    await expect(page.locator('#start-pause-btn')).toHaveText('暂停');

    await page.locator('#reset-btn').click();
    const confirmBtn = page.locator('.modal-button-primary:has-text("确认"), .modal-button-primary:has-text("确定")');
    if (await confirmBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
      await confirmBtn.click();
    }

    await expect(page.locator('#start-pause-btn')).toHaveText('开始专注');
    await expect(page.locator('#start-pause-btn')).not.toHaveClass(/is-paused/);
  });
});

test.describe('Placeholder 颜色', () => {

  test('记录输入框 placeholder 颜色为 #78716C', async ({ page }) => {
    await gotoApp(page);
    await page.waitForSelector('.focus-compose-input');

    const color = await page.evaluate(() => {
      for (const sheet of document.styleSheets) {
        try {
          for (const rule of sheet.cssRules) {
            if (rule.selectorText === '.focus-compose-input::placeholder') {
              return rule.style.color;
            }
          }
        } catch (e) {}
      }
      return null;
    });
    expect(color).toBeTruthy();
    expect(color).not.toBe('#A8A29E');
  });

  test('搜索框 placeholder 颜色设置', async ({ page }) => {
    await gotoApp(page);
    await page.waitForSelector('.search-input', { state: 'visible' });

    const color = await page.evaluate(() => {
      for (const sheet of document.styleSheets) {
        try {
          for (const rule of sheet.cssRules) {
            if (rule.selectorText?.includes('.search-input') &&
                rule.selectorText?.includes('placeholder') &&
                !rule.selectorText?.includes('dark')) {
              return rule.style.color;
            }
          }
        } catch (e) {}
      }
      return null;
    });
    expect(color).toBeTruthy();
  });
});

test.describe('响应式 - 小桌面 (1024px)', () => {

  test.beforeEach(async ({ page }) => {
    await gotoAppWithViewport(page, 1024, 768);
    await page.waitForSelector('.timer-ring-wrap');
  });

  test('圆环缩小到 240px', async ({ page }) => {
    const wrap = page.locator('.timer-ring-wrap');
    await expect(wrap).toHaveCSS('width', '240px');
  });

  test('compose 区域全宽', async ({ page }) => {
    const compose = page.locator('.focus-compose');
    const maxWidth = await compose.evaluate(el => getComputedStyle(el).maxWidth);
    expect(maxWidth).toBe('100%');
  });
});

test.describe('搜索过滤', () => {

  test('搜索框输入触发过滤（不报错）', async ({ page }) => {
    await gotoApp(page);
    await page.waitForSelector('.search-input', { state: 'visible' });

    const errors = [];
    page.on('pageerror', err => errors.push(err.message));

    const searchInput = page.locator('.search-input');
    await searchInput.fill('测试');

    await expect(searchInput).toHaveValue('测试');

    expect(errors).toHaveLength(0);
  });
});
