const supabase = require('../config/supabaseAdmin');

exports.getDashboardStats = async (req, res) => {
  try {
    const today = new Date();
    const todayDate = today.toISOString().split('T')[0];
    const weekStart = new Date(today);
    weekStart.setUTCDate(weekStart.getUTCDate() - 6);
    const weekStartDate = weekStart.toISOString().split('T')[0];

    const [
      { count: activeEmployees, error: employeeError },
      { count: activeProjects, error: projectError },
      { count: overdueTasks, error: taskError },
      { count: attendanceIssues, error: attendanceError },
      { data: overtimeRows, error: overtimeError },
      { data: recentEmployees, error: recentEmployeesError },
      { data: recentProjects, error: recentProjectsError },
      { data: recentTasks, error: recentTasksError }
    ] = await Promise.all([
      supabase.from('employees').select('*', { count: 'exact', head: true }).eq('status', 'active'),
      supabase.from('projects').select('*', { count: 'exact', head: true }).eq('status', 'in_progress'),
      supabase.from('tasks').select('*', { count: 'exact', head: true }).lt('deadline', today.toISOString()).neq('status', 'done'),
      supabase.from('attendance_daily_summary').select('*', { count: 'exact', head: true }).eq('work_date', todayDate).in('status', ['late', 'absent', 'early_leave']),
      supabase.from('attendance_daily_summary').select('work_date, overtime_hours').gte('work_date', weekStartDate).lte('work_date', todayDate),
      supabase.from('employees').select('id, full_name, created_at').order('created_at', { ascending: false }).limit(3),
      supabase.from('projects').select('id, name, created_at').order('created_at', { ascending: false }).limit(3),
      supabase.from('tasks').select('id, title, created_at').order('created_at', { ascending: false }).limit(3)
    ]);

    const firstError = employeeError || projectError || taskError || attendanceError || overtimeError || recentEmployeesError || recentProjectsError || recentTasksError;
    if (firstError) throw firstError;

    const overtimeByDate = (overtimeRows || []).reduce((result, row) => {
      result[row.work_date] = (result[row.work_date] || 0) + Number(row.overtime_hours || 0);
      return result;
    }, {});

    const overtimeData = Array.from({ length: 7 }, (_, index) => {
      const date = new Date(weekStart);
      date.setUTCDate(weekStart.getUTCDate() + index);
      const dateKey = date.toISOString().split('T')[0];
      return {
        name: date.toLocaleDateString('vi-VN', { weekday: 'short', timeZone: 'UTC' }),
        date: dateKey,
        hours: Number((overtimeByDate[dateKey] || 0).toFixed(2))
      };
    });

    const recentActivities = [
      ...(recentTasks || []).map((task) => ({ id: `task-${task.id}`, type: 'task', text: `Task mới "${task.title}" được tạo`, createdAt: task.created_at })),
      ...(recentEmployees || []).map((employee) => ({ id: `employee-${employee.id}`, type: 'employee', text: `Nhân viên mới ${employee.full_name} được thêm`, createdAt: employee.created_at })),
      ...(recentProjects || []).map((project) => ({ id: `project-${project.id}`, type: 'project', text: `Dự án mới "${project.name}" được tạo`, createdAt: project.created_at }))
    ].sort((first, second) => new Date(second.createdAt) - new Date(first.createdAt)).slice(0, 6);

    res.json({
      activeEmployees: activeEmployees || 0,
      activeProjects: activeProjects || 0,
      overdueTasks: overdueTasks || 0,
      attendanceIssues: attendanceIssues || 0,
      overtimeData,
      recentActivities
    });
  } catch (error) {
    console.error('DASHBOARD ERROR:', error);
    res.status(500).json({ error: error.message || 'Không thể tải dữ liệu dashboard.' });
  }
};
