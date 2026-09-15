/**
 * KAIROS i18n Module
 * 中英文翻译切换
 */

const zh = {
  // Auth
  'app.startFailed': '应用启动失败，请刷新页面重试',

  // Nav
  'nav.focus': '专注',
  'nav.project': '项目',
  'nav.task': '任务',
  'nav.taskView': '任务视图',
  'nav.projectView': '项目视图',
  'nav.kanbanView': '进度视图',
  'nav.matrixView': '四象限视图',

  // Header
  'header.summary': '总结',
  'header.userSettings': '用户设置',
  'header.user': '用户',
  'header.exportData': '导出数据',
  'header.importData': '导入数据',

  // Timer
  'timer.focusSession': '专注时段',
  'timer.shortBreak': '短休息',
  'timer.longBreak': '长休息',
  'timer.startFocus': '开始专注',
  'timer.pause': '暂停',
  'timer.reset': '重置',
  'timer.switchMini': '切换迷你模式',
  'timer.readyToFocus': '准备开始专注',
  'timer.readyForFocus': '准备开始专注时段',
  'timer.startLongBreak': '开始长休息时段',
  'timer.startShortBreak': '开始短休息时段',
  'timer.pauseFocus': '暂停专注',
  'timer.startSessionTask': '开始{session} · {task}',
  'timer.personalFocus': '个人专注',
  'timer.completeSession': '完成{session} · {minutes}分钟',
  'timer.completeTask': '完成任务：{title}',
  'timer.pomodoroComplete': '番茄钟完成',
  'timer.markDone': '标记完成',
  'timer.continue': '继续',
  'timer.taskPrompt': '任务："{title}"\n\n是否标记为已完成？',
  'timer.taskCompleted': '任务已完成！继续保持！',
  'timer.taskCompleteFailed': '标记任务完成失败，请稍后重试',
  'timer.pomodoroCompletToast': '番茄钟完成！休息一下吧',
  'timer.breakOverToast': '休息结束！开始新的专注时段',

  // Focus view
  'focus.allProjects': '所有项目',
  'focus.searchTask': '搜索任务，开始专注',
  'focus.noteHistory': '活动记录',
  'focus.showNotes': '活动记录',
  'focus.hideNotes': '收起记录',
  'focus.personalActivity': '个人活动',
  'focus.recordThoughts': '记录想法...',
  'focus.aiBreakdown': 'AI 拆解任务',
  'focus.aiLoading': '正在拆解...',
  'focus.aiAddTask': '添加',
  'focus.aiAddAll': '全部添加',
  'focus.aiResult': 'AI 拆解结果',
  'focus.aiNoKey': '请先在设置中配置 AI API Key',
  'focus.aiKeyRequired': '请在设置中配置自己的 AI API Key',
  'focus.aiDailyRemaining': '今日剩余 {count} 次添加',
  'focus.aiLimitReached': '今日免费次数已用完（{limit}次/天），配置自己的 API Key 可无限使用',
  'focus.aiAddLimit': '今日免费添加次数已用完（{limit}次/天），配置 API Key 可无限使用',
  'focus.aiEmpty': '请输入任务描述或选择一个任务',
  'focus.aiAddedOne': '子任务已添加',
  'focus.aiAddedAll': '已添加 {count} 个子任务',
  'focus.aiError': 'AI 请求失败: {msg}',
  'focus.aiRateLimited': 'AI 服务繁忙，请稍后再试',
  'focus.aiUnavailable': 'AI 暂时不可用，请稍后再试',
  'focus.aiBack': '返回笔记历史',
  'focus.aiAnswerHint': '回答问题...',
  'focus.aiSend': '发送',
  'focus.noteRecorded': '笔记已记录',
  'focus.noRecords': '暂无记录',
  'focus.loadFailed': '加载失败',
  'focus.today': '今天',

  // Tasks
  'task.noTasks': '暂无任务',
  'task.noTasksHint': '在「项目」中创建看板和任务',
  'task.addTask': '添加任务',
  'task.taskTitle': '任务标题',
  'task.addDescription': '添加描述…',
  'task.create': '创建',
  'task.creating': '…',
  'task.cancel': '取消',
  'task.save': '保存',
  'task.close': '关闭',
  'task.delete': '删除',
  'task.enterCreate': 'Enter 创建 · Esc 关闭',
  'task.createSuccess': '任务创建成功',
  'task.createFailed': '创建任务失败',
  'task.updateSuccess': '任务已更新',
  'task.deleteSuccess': '任务已删除',
  'task.moved': '任务已移动',
  'task.moveFailed': '移动失败',
  'task.completed': '任务已完成',
  'task.startFocus': '开始专注: {title}',
  'task.deleteConfirm': '确定删除「{title}」吗？',
  'task.deleteTitle': '删除任务',
  'task.confirmDelete': '删除',
  'task.unassigned': '未分配',
  'task.dragHere': '拖放任务到此处',

  // Task activity logs
  'task.log.create': '创建任务：{title}',
  'task.log.update': '更新任务：{title}',
  'task.log.delete': '删除任务：{title}',
  'task.log.titleEmpty': '任务标题不能为空',
  'task.log.notExist': '任务不存在',
  'task.createFail': '创建任务失败',
  'task.updateFail': '更新任务失败',
  'task.deleteFail': '删除任务失败',

  // Priority
  'priority.urgentImportant': '紧急重要',
  'priority.notUrgentImportant': '重要不紧急',
  'priority.urgentNotImportant': '紧急不重要',
  'priority.notUrgentNotImportant': '不紧急不重要',
  'priority.label': '优先级',
  'priority.short.urgentImportant': '紧急重要',
  'priority.short.notUrgentImportant': '重要',
  'priority.short.urgentNotImportant': '紧急',
  'priority.short.notUrgentNotImportant': '一般',
  'priority.unset': '未设置',

  // Status
  'status.todo': '待办',
  'status.doing': '进行中',
  'status.review': '待确认',
  'status.done': '已完成',

  // Matrix quadrants
  'matrix.title': '四象限任务视图',
  'matrix.q1.title': '紧急重要',
  'matrix.q1.subtitle': '立即处理',
  'matrix.q2.title': '重要不紧急',
  'matrix.q2.subtitle': '计划安排',
  'matrix.q3.title': '紧急不重要',
  'matrix.q3.subtitle': '委托他人',
  'matrix.q4.title': '不紧急不重要',
  'matrix.q4.subtitle': '适度放松',
  'matrix.noTasks': '暂无任务',
  'matrix.addTaskIn': '在{title}添加任务',

  // Kanban
  'kanban.title': '任务看板',
  'kanban.addTaskIn': '在{label}添加任务',

  // Project view
  'project.starred': '星标项目',
  'project.all': '所有项目',
  'project.createNew': '新建项目',
  'project.noProjects': '还没有项目',
  'project.noProjectsHint': '创建第一个项目来组织你的任务',
  'project.projectName': '项目名称',
  'project.toggleStar': '切换星标',
  'project.deleteProject': '删除项目',
  'project.taskCount': '{count} 个任务',
  'project.taskCountDone': '{count} 个任务，{done} 已完成',
  'project.createSuccess': '项目创建成功',
  'project.createFailed': '创建项目失败',
  'project.deleteSuccess': '项目已删除',
  'project.select': '项目',

  // Delete board confirm
  'board.deleteTitle': '删除项目',
  'board.deleteHint': '此操作将永久删除项目 <strong style="color:#1C1917">{name}</strong> 及其所有任务，且不可恢复。',
  'board.deleteLabel': '请输入「{name}」确认删除：',
  'board.confirmDelete': '确认删除',

  // Board activity logs
  'board.log.create': '创建看板：{name}',
  'board.log.update': '更新看板：{name}',
  'board.log.delete': '删除看板：{name}',
  'board.log.notExist': '看板不存在',
  'board.deleteBoardConfirm': '看板 "{name}" 中还有 {count} 个任务。删除看板将同时删除所有任务，此操作无法撤销。',
  'board.deleteBoardTitle': '删除看板',
  'board.createFail': '创建看板失败',
  'board.updateFail': '更新看板失败',
  'board.deleteFail': '删除看板失败',

  // Settings
  'settings.title': '设置',
  'settings.pomodoro': '番茄钟',
  'settings.focusDuration': '专注时长',
  'settings.shortBreak': '短休息',
  'settings.longBreak': '长休息',
  'settings.minutes': '分钟',
  'settings.notification': '通知',
  'settings.desktopNotification': '桌面通知',
  'settings.soundEffect': '提示音效',
  'settings.appearance': '外观',
  'settings.theme': '主题',
  'settings.themeLight': '浅色',
  'settings.themeDark': '深色',
  'settings.ai': 'AI 助手',

  'settings.aiBaseUrl': '接口地址',
  'settings.aiModel': '模型',
  'settings.aiHint': 'API Key 仅存储在你的浏览器本地（localStorage），我们不会上传或存储。AI 请求由浏览器直接发送到大模型接口，不经过我们的服务器。',
  'settings.aiSaveKey': '保存',
  'settings.aiUrlEmpty': '请输入接口地址',
  'settings.aiConfigSaved': '配置已保存',
  'settings.aiConfigSavedNoKey': '配置已保存（Key 未更新）',
  'settings.aiConfigCleared': 'API Key 已清除，AI 助手已停用',
  'settings.aiKeySaveFailed': '保存失败，请重试',
  'settings.aiKeyConfigured': 'API Key 已配置',
  'settings.data': '数据',
  'settings.export': '导出数据',
  'settings.import': '导入数据',
  'settings.backToMain': '← 返回主页',

  // Profile
  'profile.bio': '专注时光，提升效率的时间管理专家',

  // Heatmap
  'heatmap.contributions': '{count} contributions in {year}',
  'heatmap.noActivity': '无活动',
  'heatmap.pomodoros': '{count} 个番茄钟 · {time}',
  'heatmap.hours': '{h}小时{m}分钟',
  'heatmap.minutesOnly': '{m}分钟',
  'heatmap.dayDetail.title': '{date} 专注记录',
  'heatmap.dayDetail.date': '{date}',
  'heatmap.dayDetail.pomodoros': '共 {count} 个番茄钟',
  'heatmap.dayDetail.duration': '专注时长：{time}',
  'heatmap.dayDetail.records': '详细记录：',
  'heatmap.less': 'Less',
  'heatmap.more': 'More',

  // Stats
  'stats.title': '活动统计',
  'stats.pomodoros': '番茄钟',
  'stats.pomodoroUnit': '个',
  'stats.focusTime': '专注时长',
  'stats.focusTimeUnit': '小时',
  'stats.focusLevel': '专注等级',
  'stats.level1': '专注新手',
  'stats.level2': '专注学徒',
  'stats.level3': '专注达人',
  'stats.level4': '专注专家',
  'stats.level5': '专注大师',

  // Summary
  'summary.heading': '总结',
  'summary.tabToday': '今日',
  'summary.tabWeek': '本周',
  'summary.title': '今日总结 · {date}',
  'summary.pomodoros': '番茄钟: {count} 个',
  'summary.focusTime': '专注时长: {time}',
  'summary.totalRecords': '总记录: {count} 条',
  'summary.hours': '{h} 小时 ',
  'summary.minutes': '{m} 分钟',
  'summary.tasksCompleted': '完成任务',
  'summary.tasksCreated': '新建任务',
  'summary.focusBreakdown': '专注分布',
  'summary.completedList': '今日完成',
  'summary.noActivity': '今天还没有活动，开始专注吧！',
  'summary.weekPomodoros': '本周番茄',
  'summary.weekFocusTime': '本周专注',
  'summary.weekCompleted': '本周完成',
  'summary.weekNoActivity': '本周还没有活动记录',
  'summary.weekdays': '日,一,二,三,四,五,六',

  // Due dates
  'due.expired': '已过期',
  'due.today': '今天',
  'due.tomorrow': '明天',
  'due.daysLater': '{days}天后',

  // Data export/import
  'data.exportTo': '导出数据到 {filename}',
  'data.exporting': '导出中...',
  'data.exportSuccess': '✓ 导出成功',
  'data.exportFailed': '✗ 导出失败',
  'data.invalidFormat': '无效的备份文件格式',
  'data.importConfirm': '备份时间: {time}\n任务: {tasks} 个 / 看板: {boards} 个 / 时间记录: {records} 条\n\n这将覆盖当前所有数据！',
  'data.importTitle': '导入备份数据',
  'data.importBtn': '导入',
  'data.importFailed': '导入失败: {error}',
  'data.importErrorTitle': '导入错误',
  'data.importFrom': '从 {filename} 导入数据',

  // Notifications
  'notify.pomodoroComplete': '番茄钟完成！休息一下吧',
  'notify.shortBreakComplete': '短休息结束，准备继续专注',
  'notify.longBreakComplete': '长休息结束，精力充沛！',
  'notify.taskReminder': '任务提醒：{title}',

  // Alternative notifications
  'altNotify.pomodoroTitle': '番茄钟完成！',
  'altNotify.pomodoroMsg': '太棒了！你已经完成了一个专注时段。是时候休息一下了。',
  'altNotify.pomodoroBtn': '开始休息',
  'altNotify.breakTitle': '休息结束！',
  'altNotify.breakMsg': '精力充沛！准备好开始下一个番茄钟了吗？',
  'altNotify.breakBtn': '继续专注',

  // UI
  'ui.confirm': '确认操作',
  'ui.confirmBtn': '确认',
  'ui.cancelBtn': '取消',
  'ui.alert': '提示',
  'ui.okBtn': '确定',
  'ui.justNow': '刚刚',
  'ui.minutesAgo': '{n} 分钟前',
  'ui.hoursAgo': '{n} 小时前',
  'ui.daysAgo': '{n} 天前',
  'ui.undo': '撤销',
  'task.undoComplete': '任务已完成',
  'timer.resetConfirm': '计时器正在运行，确定要重置吗？',

  // Activity types
  'activity.start': '开始专注',
  'activity.pause': '暂停专注',
  'activity.complete': '完成任务',
  'activity.update': '状态更新',
  'activity.comment': '添加备注',
  'activity.create': '创建任务',
  'activity.delete': '删除任务',
  'activity.create_board': '创建看板',
  'activity.update_board': '更新看板',
  'activity.delete_board': '删除看板',
  'activity.data_export': '导出数据',
  'activity.data_import': '导入数据',

  // Landing

  // Mini timer
  'mini.start': '开始',
  'mini.pause': '暂停',
  'mini.reset': '重置',
  'mini.close': '关闭',
};

const en = {
  // Auth
  'app.startFailed': 'App failed to start. Please refresh the page.',

  // Nav
  'nav.focus': 'Focus',
  'nav.project': 'Projects',
  'nav.task': 'Tasks',
  'nav.taskView': 'Task view',
  'nav.projectView': 'By Project',
  'nav.kanbanView': 'Kanban',
  'nav.matrixView': 'Matrix',

  // Header
  'header.summary': 'Summary',
  'header.userSettings': 'Settings',
  'header.user': 'User',
  'header.exportData': 'Export Data',
  'header.importData': 'Import Data',

  // Timer
  'timer.focusSession': 'Focus',
  'timer.shortBreak': 'Short Break',
  'timer.longBreak': 'Long Break',
  'timer.startFocus': 'Start Focus',
  'timer.pause': 'Pause',
  'timer.reset': 'Reset',
  'timer.switchMini': 'Toggle mini mode',
  'timer.readyToFocus': 'Ready to focus',
  'timer.readyForFocus': 'Ready for focus session',
  'timer.startLongBreak': 'Starting long break',
  'timer.startShortBreak': 'Starting short break',
  'timer.pauseFocus': 'Focus paused',
  'timer.startSessionTask': 'Start {session} · {task}',
  'timer.personalFocus': 'Personal focus',
  'timer.completeSession': 'Completed {session} · {minutes}min',
  'timer.completeTask': 'Completed task: {title}',
  'timer.pomodoroComplete': 'Pomodoro Complete',
  'timer.markDone': 'Mark Done',
  'timer.continue': 'Continue',
  'timer.taskPrompt': 'Task: "{title}"\n\nMark as completed?',
  'timer.taskCompleted': 'Task completed! Keep it up!',
  'timer.taskCompleteFailed': 'Failed to mark task as complete',
  'timer.pomodoroCompletToast': 'Pomodoro done! Take a break',
  'timer.breakOverToast': 'Break over! Time for a new focus session',

  // Focus view
  'focus.allProjects': 'All Projects',
  'focus.searchTask': 'Search tasks, start focus',
  'focus.noteHistory': 'Activity Log',
  'focus.showNotes': 'Activity Log',
  'focus.hideNotes': 'Hide Log',
  'focus.personalActivity': 'Personal Activity',
  'focus.recordThoughts': 'Record thoughts...',
  'focus.aiBreakdown': 'AI Breakdown',
  'focus.aiLoading': 'Breaking down...',
  'focus.aiAddTask': 'Add',
  'focus.aiAddAll': 'Add All',
  'focus.aiResult': 'AI Breakdown',
  'focus.aiNoKey': 'Please configure AI API Key in settings first',
  'focus.aiKeyRequired': 'Configure your own AI API Key in settings',
  'focus.aiDailyRemaining': '{count} free adds remaining today',
  'focus.aiLimitReached': 'Free quota used up ({limit}/day). Configure your own API Key for unlimited use',
  'focus.aiAddLimit': 'Free add quota used up ({limit}/day). Configure API Key for unlimited use',
  'focus.aiEmpty': 'Enter a task description or select a task',
  'focus.aiAddedOne': 'Subtask added',
  'focus.aiAddedAll': 'Added {count} subtasks',
  'focus.aiError': 'AI request failed: {msg}',
  'focus.aiRateLimited': 'AI service is busy, please try again later',
  'focus.aiUnavailable': 'AI temporarily unavailable, please try again later',
  'focus.aiBack': 'Back to notes',
  'focus.aiAnswerHint': 'Answer...',
  'focus.aiSend': 'Send',
  'focus.noteRecorded': 'Note recorded',
  'focus.noRecords': 'No records yet',
  'focus.loadFailed': 'Failed to load',
  'focus.today': 'Today',

  // Tasks
  'task.noTasks': 'No tasks',
  'task.noTasksHint': 'Create boards and tasks in "Projects"',
  'task.addTask': 'Add Task',
  'task.taskTitle': 'Task title',
  'task.addDescription': 'Add description...',
  'task.create': 'Create',
  'task.creating': '...',
  'task.cancel': 'Cancel',
  'task.save': 'Save',
  'task.close': 'Close',
  'task.delete': 'Delete',
  'task.enterCreate': 'Enter to create · Esc to close',
  'task.createSuccess': 'Task created',
  'task.createFailed': 'Failed to create task',
  'task.updateSuccess': 'Task updated',
  'task.deleteSuccess': 'Task deleted',
  'task.moved': 'Task moved',
  'task.moveFailed': 'Move failed',
  'task.completed': 'Task completed',
  'task.startFocus': 'Focus: {title}',
  'task.deleteConfirm': 'Delete "{title}"?',
  'task.deleteTitle': 'Delete Task',
  'task.confirmDelete': 'Delete',
  'task.unassigned': 'Unassigned',
  'task.dragHere': 'Drag tasks here',

  // Task activity logs
  'task.log.create': 'Created task: {title}',
  'task.log.update': 'Updated task: {title}',
  'task.log.delete': 'Deleted task: {title}',
  'task.log.titleEmpty': 'Task title cannot be empty',
  'task.log.notExist': 'Task not found',
  'task.createFail': 'Failed to create task',
  'task.updateFail': 'Failed to update task',
  'task.deleteFail': 'Failed to delete task',

  // Priority
  'priority.urgentImportant': 'Urgent & Important',
  'priority.notUrgentImportant': 'Important, Not Urgent',
  'priority.urgentNotImportant': 'Urgent, Not Important',
  'priority.notUrgentNotImportant': 'Not Urgent, Not Important',
  'priority.label': 'Priority',
  'priority.short.urgentImportant': 'Urgent & Important',
  'priority.short.notUrgentImportant': 'Important',
  'priority.short.urgentNotImportant': 'Urgent',
  'priority.short.notUrgentNotImportant': 'Normal',
  'priority.unset': 'Not set',

  // Status
  'status.todo': 'To Do',
  'status.doing': 'In Progress',
  'status.review': 'In Review',
  'status.done': 'Done',

  // Matrix quadrants
  'matrix.title': 'Eisenhower Matrix',
  'matrix.q1.title': 'Urgent & Important',
  'matrix.q1.subtitle': 'Do First',
  'matrix.q2.title': 'Important, Not Urgent',
  'matrix.q2.subtitle': 'Schedule',
  'matrix.q3.title': 'Urgent, Not Important',
  'matrix.q3.subtitle': 'Delegate',
  'matrix.q4.title': 'Not Urgent, Not Important',
  'matrix.q4.subtitle': 'Eliminate',
  'matrix.noTasks': 'No tasks',
  'matrix.addTaskIn': 'Add task to {title}',

  // Kanban
  'kanban.title': 'Task Board',
  'kanban.addTaskIn': 'Add task to {label}',

  // Project view
  'project.starred': 'Starred Projects',
  'project.all': 'All Projects',
  'project.createNew': 'New Project',
  'project.noProjects': 'No projects yet',
  'project.noProjectsHint': 'Create your first project to organize tasks',
  'project.projectName': 'Project name',
  'project.toggleStar': 'Toggle star',
  'project.deleteProject': 'Delete project',
  'project.taskCount': '{count} tasks',
  'project.taskCountDone': '{count} tasks, {done} done',
  'project.createSuccess': 'Project created',
  'project.createFailed': 'Failed to create project',
  'project.deleteSuccess': 'Project deleted',
  'project.select': 'Project',

  // Delete board confirm
  'board.deleteTitle': 'Delete Project',
  'board.deleteHint': 'This will permanently delete project <strong style="color:#1C1917">{name}</strong> and all its tasks. This cannot be undone.',
  'board.deleteLabel': 'Type "{name}" to confirm:',
  'board.confirmDelete': 'Confirm Delete',

  // Board activity logs
  'board.log.create': 'Created board: {name}',
  'board.log.update': 'Updated board: {name}',
  'board.log.delete': 'Deleted board: {name}',
  'board.log.notExist': 'Board not found',
  'board.deleteBoardConfirm': 'Board "{name}" has {count} tasks. Deleting will remove all tasks. This cannot be undone.',
  'board.deleteBoardTitle': 'Delete Board',
  'board.createFail': 'Failed to create board',
  'board.updateFail': 'Failed to update board',
  'board.deleteFail': 'Failed to delete board',

  // Settings
  'settings.title': 'Settings',
  'settings.pomodoro': 'Pomodoro',
  'settings.focusDuration': 'Focus Duration',
  'settings.shortBreak': 'Short Break',
  'settings.longBreak': 'Long Break',
  'settings.minutes': 'min',
  'settings.notification': 'Notifications',
  'settings.desktopNotification': 'Desktop Notifications',
  'settings.soundEffect': 'Sound Effects',
  'settings.appearance': 'Appearance',
  'settings.theme': 'Theme',
  'settings.themeLight': 'Light',
  'settings.themeDark': 'Dark',
  'settings.ai': 'AI Assistant',

  'settings.aiBaseUrl': 'Base URL',
  'settings.aiModel': 'Model',
  'settings.aiHint': 'Your API Key is stored only in your browser (localStorage) — we never upload or store it. AI requests are sent directly from your browser to the model provider, not through our servers.',
  'settings.aiSaveKey': 'Save',
  'settings.aiUrlEmpty': 'Please enter a base URL',
  'settings.aiConfigSaved': 'Config saved',
  'settings.aiConfigSavedNoKey': 'Config saved (Key unchanged)',
  'settings.aiConfigCleared': 'API Key cleared; AI assistant disabled',
  'settings.aiKeySaveFailed': 'Save failed, please retry',
  'settings.aiKeyConfigured': 'API Key configured',
  'settings.data': 'Data',
  'settings.export': 'Export Data',
  'settings.import': 'Import Data',
  'settings.backToMain': '← Back',

  // Profile
  'profile.bio': 'Time management expert focused on productivity',

  // Heatmap
  'heatmap.contributions': '{count} contributions in {year}',
  'heatmap.noActivity': 'No activity',
  'heatmap.pomodoros': '{count} pomodoros · {time}',
  'heatmap.hours': '{h}h {m}min',
  'heatmap.minutesOnly': '{m}min',
  'heatmap.dayDetail.title': 'Focus records for {date}',
  'heatmap.dayDetail.date': '{date}',
  'heatmap.dayDetail.pomodoros': '{count} pomodoros total',
  'heatmap.dayDetail.duration': 'Focus time: {time}',
  'heatmap.dayDetail.records': 'Details:',
  'heatmap.less': 'Less',
  'heatmap.more': 'More',

  // Stats
  'stats.title': 'Activity Stats',
  'stats.pomodoros': 'Pomodoros',
  'stats.pomodoroUnit': 'total',
  'stats.focusTime': 'Focus Time',
  'stats.focusTimeUnit': 'hours',
  'stats.focusLevel': 'Focus Level',
  'stats.level1': 'Beginner',
  'stats.level2': 'Apprentice',
  'stats.level3': 'Adept',
  'stats.level4': 'Expert',
  'stats.level5': 'Master',

  // Summary
  'summary.heading': 'Summary',
  'summary.tabToday': 'Today',
  'summary.tabWeek': 'This Week',
  'summary.title': 'Daily Summary · {date}',
  'summary.pomodoros': 'Pomodoros: {count}',
  'summary.focusTime': 'Focus time: {time}',
  'summary.totalRecords': 'Total records: {count}',
  'summary.hours': '{h}h ',
  'summary.minutes': '{m}min',
  'summary.tasksCompleted': 'Completed',
  'summary.tasksCreated': 'Created',
  'summary.focusBreakdown': 'Focus Breakdown',
  'summary.completedList': 'Completed Today',
  'summary.noActivity': 'No activity yet. Start focusing!',
  'summary.weekPomodoros': 'Week Pomodoros',
  'summary.weekFocusTime': 'Week Focus',
  'summary.weekCompleted': 'Week Completed',
  'summary.weekNoActivity': 'No activity this week yet',
  'summary.weekdays': 'Sun,Mon,Tue,Wed,Thu,Fri,Sat',

  // Due dates
  'due.expired': 'Overdue',
  'due.today': 'Today',
  'due.tomorrow': 'Tomorrow',
  'due.daysLater': 'In {days} days',

  // Data export/import
  'data.exportTo': 'Exported data to {filename}',
  'data.exporting': 'Exporting...',
  'data.exportSuccess': '✓ Exported',
  'data.exportFailed': '✗ Export failed',
  'data.invalidFormat': 'Invalid backup file format',
  'data.importConfirm': 'Backup time: {time}\nTasks: {tasks} / Boards: {boards} / Time records: {records}\n\nThis will overwrite all current data!',
  'data.importTitle': 'Import Backup',
  'data.importBtn': 'Import',
  'data.importFailed': 'Import failed: {error}',
  'data.importErrorTitle': 'Import Error',
  'data.importFrom': 'Imported data from {filename}',

  // Notifications
  'notify.pomodoroComplete': 'Pomodoro complete! Take a break',
  'notify.shortBreakComplete': 'Short break over, ready to focus',
  'notify.longBreakComplete': 'Long break over, feeling refreshed!',
  'notify.taskReminder': 'Task reminder: {title}',

  // Alternative notifications
  'altNotify.pomodoroTitle': 'Pomodoro Complete!',
  'altNotify.pomodoroMsg': "Great job! You've finished a focus session. Time for a break.",
  'altNotify.pomodoroBtn': 'Start Break',
  'altNotify.breakTitle': 'Break Over!',
  'altNotify.breakMsg': 'Feeling refreshed! Ready for another pomodoro?',
  'altNotify.breakBtn': 'Continue Focus',

  // UI
  'ui.confirm': 'Confirm',
  'ui.confirmBtn': 'Confirm',
  'ui.cancelBtn': 'Cancel',
  'ui.alert': 'Notice',
  'ui.okBtn': 'OK',
  'ui.justNow': 'Just now',
  'ui.minutesAgo': '{n}m ago',
  'ui.hoursAgo': '{n}h ago',
  'ui.daysAgo': '{n}d ago',
  'ui.undo': 'Undo',
  'task.undoComplete': 'Task completed',
  'timer.resetConfirm': 'Timer is running. Reset anyway?',

  // Activity types
  'activity.start': 'Started focus',
  'activity.pause': 'Paused focus',
  'activity.complete': 'Completed task',
  'activity.update': 'Status update',
  'activity.comment': 'Added note',
  'activity.create': 'Created task',
  'activity.delete': 'Deleted task',
  'activity.create_board': 'Created board',
  'activity.update_board': 'Updated board',
  'activity.delete_board': 'Deleted board',
  'activity.data_export': 'Exported data',
  'activity.data_import': 'Imported data',

  // Landing

  // Mini timer
  'mini.start': 'Start',
  'mini.pause': 'Pause',
  'mini.reset': 'Reset',
  'mini.close': 'Close',
};

const langs = { zh, en };

let currentLang = localStorage.getItem('kairos-lang') || 'zh';

/**
 * Translate a key, with optional parameter substitution
 */
export function t(key, params) {
  let text = langs[currentLang]?.[key] || langs.zh[key] || key;
  if (params) {
    Object.entries(params).forEach(([k, v]) => {
      text = text.replaceAll(`{${k}}`, v);
    });
  }
  return text;
}

export function getLang() { return currentLang; }

export function setLang(lang) {
  currentLang = lang;
  localStorage.setItem('kairos-lang', lang);
  updateDOM();
}

export function toggleLang() {
  setLang(currentLang === 'zh' ? 'en' : 'zh');
}

function updateDOM() {
  document.querySelectorAll('[data-i18n]').forEach(el => {
    el.textContent = t(el.dataset.i18n);
  });
  document.querySelectorAll('[data-i18n-placeholder]').forEach(el => {
    el.placeholder = t(el.dataset.i18nPlaceholder);
  });
  document.querySelectorAll('[data-i18n-title]').forEach(el => {
    el.title = t(el.dataset.i18nTitle);
  });
  // Update lang toggle buttons
  const langText = currentLang === 'zh' ? 'EN' : '中';
  document.querySelectorAll('#lang-toggle, #landing-lang-toggle').forEach(btn => {
    btn.textContent = langText;
  });
  // Notify app to refresh dynamic content
  window.dispatchEvent(new Event('langchange'));
}

// Apply initial language on load
if (currentLang !== 'zh') {
  document.addEventListener('DOMContentLoaded', () => updateDOM());
}
