import { database } from './db.js';
import { showConfirm, showAlert } from './ui.js';
import { t } from './i18n.js';

export async function exportData() {
  try {

    const data = await database.exportAllData();

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').split('T')[0];
    const filename = `kairos-backup-${timestamp}.json`;

    const blob = new Blob([JSON.stringify(data, null, 2)], {
      type: 'application/json'
    });

    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    await database.logActivity({
      type: 'data_export',
      content: t('data.exportTo', { filename })
    });

    return { success: true, filename };
  } catch (err) {
    throw err;
  }
}

export async function importData(file) {
  try {

    const text = await file.text();
    const data = JSON.parse(text);

    if (!data.version || !data.exported_at) {
      throw new Error(t('data.invalidFormat'));
    }

    // 确认导入（覆盖现有数据）
    const confirmed = await showConfirm(
      t('data.importConfirm', {
        time: new Date(data.exported_at).toLocaleString(),
        tasks: data.tasks?.length || 0,
        boards: data.boards?.length || 0,
        records: data.time_records?.length || 0
      }),
      { title: t('data.importTitle'), confirmText: t('data.importBtn'), cancelText: t('task.cancel') }
    );

    if (!confirmed) {
      return { success: false, cancelled: true };
    }

    await database.clearAllData();

    await database.importAllData(data);

    await database.logActivity({
      type: 'data_import',
      content: t('data.importFrom', { filename: file.name })
    });

    window.location.reload();

    return { success: true };
  } catch (err) {
    showAlert(t('data.importFailed', { error: err.message }), { title: t('data.importErrorTitle') });
    throw err;
  }
}

export function showImportDialog() {
  const input = document.getElementById('import-file-input');
  if (!input) return;

  input.onchange = async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    try {
      await importData(file);
    } catch (e) {
      console.error('[data-export] 导入数据失败:', e);
    }

    // 清空输入，允许重新选择相同文件
    input.value = '';
  };

  input.click();
}

export function initDataManagement() {

  const exportBtn = document.getElementById('btn-export-data');
  if (exportBtn) {
    exportBtn.addEventListener('click', async () => {
      try {
        exportBtn.disabled = true;
        exportBtn.textContent = t('data.exporting');

        const result = await exportData();

        exportBtn.textContent = t('data.exportSuccess');
        setTimeout(() => {
          exportBtn.textContent = t('settings.export');
          exportBtn.disabled = false;
        }, 2000);
      } catch (err) {
        exportBtn.textContent = t('data.exportFailed');
        setTimeout(() => {
          exportBtn.textContent = t('settings.export');
          exportBtn.disabled = false;
        }, 2000);
      }
    });
  }

  const importBtn = document.getElementById('btn-import-data');
  if (importBtn) {
    importBtn.addEventListener('click', () => {
      showImportDialog();
    });
  }

  const menuItems = document.querySelectorAll('.menu-item');
  menuItems.forEach((item) => {
    const action = item.dataset.action;
    if (action === 'export-data') {
      item.addEventListener('click', exportData);
    } else if (action === 'import-data') {
      item.addEventListener('click', showImportDialog);
    }
  });
}
