const supabase = require('../config/supabaseAdmin');

const getManagerEmployee = async (userId) => {
  const { data, error } = await supabase
    .from('employees')
    .select('id')
    .eq('user_id', userId)
    .single();
  if (error) throw error;
  return data;
};

const isDateOnly = (value) => typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value);

const isTime = (value) => typeof value === 'string' && /^\d{2}:\d{2}$/.test(value);

const getReportedStatus = (schedule, record) => {
  if (schedule?.status === 'on_leave') return 'leave';
  if (schedule?.status === 'absent') return 'absent';
  if (schedule?.status === 'scheduled' || schedule?.status === 'cancelled') return 'absent';
  if (schedule?.status === 'present') return 'normal';
  if (schedule?.status === 'late' || schedule?.status === 'early_leave') return schedule.status;
  return record?.status || 'absent';
};

const formatAttendanceTime = (value) => {
  if (!value) return '-';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '-';
  return date.toLocaleTimeString('vi-VN', {
    hour: '2-digit',
    minute: '2-digit'
  });
};

// ============================================================
// ATTENDANCE SUMMARY
// GET /api/attendance/summary?from=YYYY-MM-DD&to=YYYY-MM-DD
// ============================================================

exports.getAttendanceSummary = async (req, res) => {
  try {
    const { date, from = date, to = date } = req.query;

    if (!from || !to) {
      return res.status(400).json({
        error: 'Khoảng ngày chấm công là bắt buộc.'
      });
    }

    const [{ data: summaries, error: summaryError }, { data: employees, error: employeesError }, { data: scheduledShifts, error: scheduleError }] = await Promise.all([
      supabase
        .from('attendance_daily_summary')
        .select('*')
        .gte('work_date', from)
        .lte('work_date', to),
      supabase
        .from('employees')
        .select('id, full_name, status, departments(name)')
        .eq('status', 'active'),
      supabase
        .from('employee_scheduled_shifts')
        .select('id, employee_id, work_date, shift_id, status, confirmed, check_in_time, check_out_time, work_hours, overtime_hours')
        .gte('work_date', from)
        .lte('work_date', to)
    ]);

    if (summaryError) throw summaryError;
    if (employeesError) throw employeesError;
    if (scheduleError) throw scheduleError;

    const employeeById = new Map(
      (employees || []).map((employee) => [employee.id, employee])
    );
    const summaryByEmployeeDate = new Map(
      (summaries || []).map((record) => [
        `${record.employee_id}-${record.work_date}`,
        record
      ])
    );
    const scheduleByEmployeeDate = new Map(
      (scheduledShifts || []).map((schedule) => [
        `${schedule.employee_id}-${schedule.work_date}`,
        schedule
      ])
    );
    const rows = [];
    const currentDate = new Date(`${from}T00:00:00Z`);
    const endDate = new Date(`${to}T00:00:00Z`);

    while (currentDate <= endDate) {
      const workDate = currentDate.toISOString().slice(0, 10);

      (employees || []).forEach((employee) => {
          const schedule = scheduleByEmployeeDate.get(`${employee.id}-${workDate}`);
          if (!schedule) return;
          const record = summaryByEmployeeDate.get(`${employee.id}-${workDate}`);
          if (schedule.status === 'on_leave') {
            rows.push(record || {
              id: `leave-${employee.id}-${workDate}`,
              employee_id: employee.id,
              work_date: workDate,
              status: 'leave',
              late_minutes: 0,
              early_leave_minutes: 0,
              work_hours: 0,
              overtime_hours: 0
            });
            return;
          }
          if (!schedule.shift_id) return;
          rows.push(record || {
            id: `absent-${employee.id}-${workDate}`,
            employee_id: employee.id,
            work_date: workDate,
            status: 'absent',
            late_minutes: 0,
            early_leave_minutes: 0,
            work_hours: 0,
            overtime_hours: 0
          });
      });

      currentDate.setUTCDate(currentDate.getUTCDate() + 1);
    }

    const formattedData = rows.map((record) => ({
      id: record.id,
      date: record.work_date,

      name: employeeById.get(record.employee_id)?.full_name || 'Chưa cập nhật',

      department:
        employeeById.get(record.employee_id)?.departments?.name || 'Chưa cập nhật',

      checkIn: formatAttendanceTime(
        scheduleByEmployeeDate.get(`${record.employee_id}-${record.work_date}`)?.check_in_time || record.check_in_time
      ),

      checkOut: formatAttendanceTime(
        scheduleByEmployeeDate.get(`${record.employee_id}-${record.work_date}`)?.check_out_time || record.check_out_time
      ),

      workHours: scheduleByEmployeeDate.get(`${record.employee_id}-${record.work_date}`)?.work_hours ?? record.work_hours ?? 0,

      late: record.late_minutes ?? 0,

      early: record.early_leave_minutes ?? 0,

      overtime: scheduleByEmployeeDate.get(`${record.employee_id}-${record.work_date}`)?.overtime_hours ?? record.overtime_hours ?? 0,

      status: getReportedStatus(
        scheduleByEmployeeDate.get(`${record.employee_id}-${record.work_date}`),
        record
      )
    }));

    res.json(formattedData.sort((first, second) => second.date.localeCompare(first.date)));
  } catch (error) {
    console.error('Error fetching attendance summary:', error);

    res.status(500).json({
      error:
        error.message ||
        'Không thể tải dữ liệu chấm công.'
    });
  }
};

exports.getAttendanceExceptions = async (req, res) => {
  try {
    const { from, to } = req.query;

    if (!from || !to) {
      return res.status(400).json({ error: 'Khoảng ngày là bắt buộc.' });
    }

    const [{ data: summaries, error: summaryError }, { data: employees, error: employeesError }, { data: scheduledShifts, error: scheduleError }] = await Promise.all([
      supabase
        .from('attendance_daily_summary')
        .select('id, employee_id, work_date, late_minutes, early_leave_minutes, status')
        .gte('work_date', from)
        .lte('work_date', to),
      supabase
        .from('employees')
        .select('id, full_name, status, departments(name)')
        .eq('status', 'active'),
      supabase
        .from('employee_scheduled_shifts')
        .select('id, employee_id, work_date, shift_id, status, confirmed')
        .gte('work_date', from)
        .lte('work_date', to)
        .eq('confirmed', true)
    ]);

    if (summaryError) throw summaryError;
    if (employeesError) throw employeesError;
    if (scheduleError) throw scheduleError;

    const employeeById = new Map(
      (employees || []).map((employee) => [employee.id, employee])
    );
    const summaryByEmployeeDate = new Map(
      (summaries || []).map((record) => [
        `${record.employee_id}-${record.work_date}`,
        record
      ])
    );
    const scheduleByEmployeeDate = new Map(
      (scheduledShifts || []).map((schedule) => [
        `${schedule.employee_id}-${schedule.work_date}`,
        schedule
      ])
    );
    const rows = [];
    const currentDate = new Date(`${from}T00:00:00Z`);
    const endDate = new Date(`${to}T00:00:00Z`);

    while (currentDate <= endDate) {
      const dayOfWeek = currentDate.getUTCDay();
      if (dayOfWeek !== 0 && dayOfWeek !== 6) {
        const workDate = currentDate.toISOString().slice(0, 10);
        (employees || []).forEach((employee) => {
          const schedule = scheduleByEmployeeDate.get(`${employee.id}-${workDate}`);
          if (!schedule) return;
          const record = summaryByEmployeeDate.get(`${employee.id}-${workDate}`);
          if (schedule.status === 'on_leave') {
            rows.push(record || {
              id: `leave-${employee.id}-${workDate}`,
              employee_id: employee.id,
              work_date: workDate,
              status: 'leave',
              late_minutes: 0,
              early_leave_minutes: 0
            });
            return;
          }
          if (!schedule.shift_id) return;
          if (!record || ['late', 'early_leave', 'absent'].includes(record.status)) {
            rows.push(record || {
              id: `absent-${employee.id}-${workDate}`,
              employee_id: employee.id,
              work_date: workDate,
              status: 'absent',
              late_minutes: 0,
              early_leave_minutes: 0
            });
          }
        });
      }
      currentDate.setUTCDate(currentDate.getUTCDate() + 1);
    }

    const attendanceRows = rows.map((record) => ({
      id: `attendance-${record.id}`,
      date: record.work_date,
      name: employeeById.get(record.employee_id)?.full_name || 'Chưa cập nhật',
      department: employeeById.get(record.employee_id)?.departments?.name || 'Chưa cập nhật',
      status: getReportedStatus(
        scheduleByEmployeeDate.get(`${record.employee_id}-${record.work_date}`),
        record
      ),
      late: record.late_minutes || 0,
      early: record.early_leave_minutes || 0
    }));

    res.json(attendanceRows);
  } catch (error) {
    console.error('Error fetching attendance exceptions:', error);
    res.status(500).json({ error: error.message || 'Không thể tải danh sách vắng, trễ.' });
  }
};

// ============================================================
// ATTENDANCE LOGS
// GET /api/attendance/logs
// ============================================================

exports.getAttendanceLogs = async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('attendance_logs')
      .select(`
        id,
        check_time,
        check_type,
        image_url,

        employees (
          id,
          full_name
        ),

        attendance_devices (
          id,
          device_code,
          device_name
        )
      `)
      .order('check_time', {
        ascending: false
      })
      .limit(200);

    if (error) throw error;

    res.json(
      (data || []).map((log) => ({
        id: log.id,

        employee:
          log.employees?.full_name ||
          'Chưa xác định',

        employeeId:
          log.employees?.id || null,

        device:
          log.attendance_devices?.device_name ||
          log.attendance_devices?.device_code ||
          'Chưa xác định',

        checkTime: log.check_time,

        checkType:
          log.check_type || 'unknown',

        imageUrl:
          log.image_url || null
      }))
    );
  } catch (error) {
    console.error(
      'Error fetching attendance logs:',
      error
    );

    res.status(500).json({
      error:
        error.message ||
        'Không thể tải nhật ký chấm công.'
    });
  }
};

// ============================================================
// GET ATTENDANCE RULES
// GET /api/attendance/rules
// ============================================================

exports.getAttendanceRules = async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('attendance_rules')
      .select(`
        id,
        name,
        work_start_time,
        work_end_time,
        late_threshold_minutes,
        early_leave_threshold_minutes,
        break_minutes,
        overtime_after_minutes,
        applicable_department_id,
        created_at,

        departments:applicable_department_id (
          id,
          name
        )
      `)
      .order('created_at', {
        ascending: false
      });

    if (error) throw error;

    const formattedRules = (data || []).map(
      (rule) => ({
        id: rule.id,

        name: rule.name,

        work_start_time:
          rule.work_start_time,

        work_end_time:
          rule.work_end_time,

        late_threshold_minutes:
          rule.late_threshold_minutes,

        early_leave_threshold_minutes:
          rule.early_leave_threshold_minutes,

        break_minutes:
          rule.break_minutes,

        overtime_after_minutes:
          rule.overtime_after_minutes,

        applicable_department_id:
          rule.applicable_department_id,

        applicable_department:
          rule.departments
            ? {
                id: rule.departments.id,
                name: rule.departments.name
              }
            : null,

        created_at:
          rule.created_at
      })
    );

    res.json(formattedRules);
  } catch (error) {
    console.error(
      'Error fetching attendance rules:',
      error
    );

    res.status(500).json({
      error:
        error.message ||
        'Không thể tải quy tắc chấm công.'
    });
  }
};

// ============================================================
// GET DEPARTMENTS FOR ATTENDANCE RULE
// GET /api/attendance/rules/options
// ============================================================

exports.getAttendanceRuleOptions = async (
  req,
  res
) => {
  try {
    const { data, error } = await supabase
      .from('departments')
      .select(`
        id,
        name
      `)
      .order('name', {
        ascending: true
      });

    if (error) throw error;

    res.json({
      departments: data || []
    });
  } catch (error) {
    console.error(
      'Error fetching attendance rule options:',
      error
    );

    res.status(500).json({
      error:
        error.message ||
        'Không thể tải danh sách phòng ban.'
    });
  }
};

// ============================================================
// CREATE ATTENDANCE RULE
// POST /api/attendance/rules
// ============================================================

exports.createAttendanceRule = async (
  req,
  res
) => {
  try {
    const {
      name,
      work_start_time,
      work_end_time,
      late_threshold_minutes,
      early_leave_threshold_minutes,
      break_minutes,
      overtime_after_minutes,
      applicable_department_id
    } = req.body;

    // --------------------------------------------------------
    // Validate required
    // --------------------------------------------------------

    if (!name?.trim()) {
      return res.status(400).json({
        error: 'Tên ca là bắt buộc.'
      });
    }

    if (!work_start_time) {
      return res.status(400).json({
        error: 'Giờ bắt đầu là bắt buộc.'
      });
    }

    if (!work_end_time) {
      return res.status(400).json({
        error: 'Giờ kết thúc là bắt buộc.'
      });
    }

    // --------------------------------------------------------
    // Validate time
    // --------------------------------------------------------

    if (
      work_start_time >= work_end_time
    ) {
      return res.status(400).json({
        error:
          'Giờ bắt đầu phải nhỏ hơn giờ kết thúc.'
      });
    }

    // --------------------------------------------------------
    // Convert number
    // --------------------------------------------------------

    const lateMinutes =
      Number(late_threshold_minutes ?? 0);

    const earlyMinutes =
      Number(
        early_leave_threshold_minutes ?? 0
      );

    const breakMinutes =
      Number(break_minutes ?? 0);

    const overtimeMinutes =
      overtime_after_minutes === '' ||
      overtime_after_minutes === null ||
      overtime_after_minutes === undefined
        ? null
        : Number(overtime_after_minutes);

    // --------------------------------------------------------
    // Validate number
    // --------------------------------------------------------

    if (
      !Number.isInteger(lateMinutes) ||
      lateMinutes < 0
    ) {
      return res.status(400).json({
        error:
          'Số phút cho phép đi trễ không hợp lệ.'
      });
    }

    if (
      !Number.isInteger(earlyMinutes) ||
      earlyMinutes < 0
    ) {
      return res.status(400).json({
        error:
          'Số phút cho phép về sớm không hợp lệ.'
      });
    }

    if (
      !Number.isInteger(breakMinutes) ||
      breakMinutes < 0
    ) {
      return res.status(400).json({
        error:
          'Thời gian nghỉ giữa ca không hợp lệ.'
      });
    }

    if (
      overtimeMinutes !== null &&
      (
        !Number.isInteger(overtimeMinutes) ||
        overtimeMinutes < 0
      )
    ) {
      return res.status(400).json({
        error:
          'Thời gian bắt đầu tính tăng ca không hợp lệ.'
      });
    }

    // --------------------------------------------------------
    // Check department
    // --------------------------------------------------------

    if (applicable_department_id) {
      const {
        data: department,
        error: departmentError
      } = await supabase
        .from('departments')
        .select('id')
        .eq(
          'id',
          applicable_department_id
        )
        .single();

      if (
        departmentError ||
        !department
      ) {
        return res.status(400).json({
          error:
            'Phòng ban áp dụng không tồn tại.'
        });
      }
    }

    // --------------------------------------------------------
    // Insert
    // --------------------------------------------------------

    const { data, error } =
      await supabase
        .from('attendance_rules')
        .insert({
          name: name.trim(),

          work_start_time,

          work_end_time,

          late_threshold_minutes:
            lateMinutes,

          early_leave_threshold_minutes:
            earlyMinutes,

          break_minutes:
            breakMinutes,

          overtime_after_minutes:
            overtimeMinutes,

          applicable_department_id:
            applicable_department_id ||
            null
        })
        .select(`
          *,
          departments:applicable_department_id (
            id,
            name
          )
        `)
        .single();

    if (error) throw error;

    res.status(201).json(data);
  } catch (error) {
    console.error(
      'Error creating attendance rule:',
      error
    );

    res.status(500).json({
      error:
        error.message ||
        'Không thể tạo quy tắc chấm công.'
    });
  }
};

// ============================================================
// UPDATE ATTENDANCE RULE
// PUT /api/attendance/rules/:id
// ============================================================

exports.updateAttendanceRule = async (
  req,
  res
) => {
  try {
    const { id } = req.params;

    const {
      name,
      work_start_time,
      work_end_time,
      late_threshold_minutes,
      early_leave_threshold_minutes,
      break_minutes,
      overtime_after_minutes,
      applicable_department_id
    } = req.body;

    if (!name?.trim()) {
      return res.status(400).json({
        error: 'Tên ca là bắt buộc.'
      });
    }

    if (
      !work_start_time ||
      !work_end_time
    ) {
      return res.status(400).json({
        error:
          'Giờ bắt đầu và giờ kết thúc là bắt buộc.'
      });
    }

    if (
      work_start_time >= work_end_time
    ) {
      return res.status(400).json({
        error:
          'Giờ bắt đầu phải nhỏ hơn giờ kết thúc.'
      });
    }

    const lateMinutes =
      Number(late_threshold_minutes ?? 0);

    const earlyMinutes =
      Number(
        early_leave_threshold_minutes ?? 0
      );

    const breakMinutes =
      Number(break_minutes ?? 0);

    const overtimeMinutes =
      overtime_after_minutes === '' ||
      overtime_after_minutes === null ||
      overtime_after_minutes === undefined
        ? null
        : Number(overtime_after_minutes);

    if (
      !Number.isInteger(lateMinutes) ||
      lateMinutes < 0
    ) {
      return res.status(400).json({
        error:
          'Số phút cho phép đi trễ không hợp lệ.'
      });
    }

    if (
      !Number.isInteger(earlyMinutes) ||
      earlyMinutes < 0
    ) {
      return res.status(400).json({
        error:
          'Số phút cho phép về sớm không hợp lệ.'
      });
    }

    if (
      !Number.isInteger(breakMinutes) ||
      breakMinutes < 0
    ) {
      return res.status(400).json({
        error:
          'Thời gian nghỉ giữa ca không hợp lệ.'
      });
    }

    if (
      overtimeMinutes !== null &&
      (
        !Number.isInteger(overtimeMinutes) ||
        overtimeMinutes < 0
      )
    ) {
      return res.status(400).json({
        error:
          'Thời gian tăng ca không hợp lệ.'
      });
    }

    if (applicable_department_id) {
      const {
        data: department,
        error: departmentError
      } = await supabase
        .from('departments')
        .select('id')
        .eq(
          'id',
          applicable_department_id
        )
        .single();

      if (
        departmentError ||
        !department
      ) {
        return res.status(400).json({
          error:
            'Phòng ban áp dụng không tồn tại.'
        });
      }
    }

    const {
      data,
      error
    } = await supabase
      .from('attendance_rules')
      .update({
        name: name.trim(),

        work_start_time,

        work_end_time,

        late_threshold_minutes:
          lateMinutes,

        early_leave_threshold_minutes:
          earlyMinutes,

        break_minutes:
          breakMinutes,

        overtime_after_minutes:
          overtimeMinutes,

        applicable_department_id:
          applicable_department_id ||
          null
      })
      .eq('id', id)
      .select(`
        *,
        departments:applicable_department_id (
          id,
          name
        )
      `)
      .single();

    if (error) throw error;

    res.json(data);
  } catch (error) {
    console.error(
      'Error updating attendance rule:',
      error
    );

    res.status(500).json({
      error:
        error.message ||
        'Không thể cập nhật quy tắc.'
    });
  }
};

// ============================================================
// DELETE ATTENDANCE RULE
// DELETE /api/attendance/rules/:id
// ============================================================

exports.deleteAttendanceRule = async (
  req,
  res
) => {
  try {
    const { id } = req.params;

    const { error } =
      await supabase
        .from('attendance_rules')
        .delete()
        .eq('id', id);

    if (error) throw error;

    res.json({
      message:
        'Xóa quy tắc chấm công thành công.'
    });
  } catch (error) {
    console.error(
      'Error deleting attendance rule:',
      error
    );

    res.status(500).json({
      error:
        error.message ||
        'Không thể xóa quy tắc.'
    });
  }
};

// ============================================================
// ATTENDANCE DEVICES
// ============================================================

exports.getWorkShifts = async (req, res) => {
  try {
    const { data, error } = await supabase.from('work_shifts').select('*').order('start_time');
    if (error) throw error;
    res.json(data || []);
  } catch (error) {
    res.status(500).json({ error: error.message || 'Không thể tải danh sách ca.' });
  }
};

exports.createWorkShift = async (req, res) => {
  try {
    const { code, name, start_time, end_time, break_minutes = 0 } = req.body || {};
    if (!code?.trim() || !name?.trim() || !isTime(start_time) || !isTime(end_time) || start_time >= end_time) {
      return res.status(400).json({ error: 'Mã, tên và khoảng thời gian ca làm việc không hợp lệ.' });
    }
    const breakMinutes = Number(break_minutes);
    if (!Number.isInteger(breakMinutes) || breakMinutes < 0) {
      return res.status(400).json({ error: 'Thời gian nghỉ giữa ca không hợp lệ.' });
    }
    const { data, error } = await supabase.from('work_shifts').insert({
      code: code.trim(), name: name.trim(), start_time, end_time, break_minutes: breakMinutes
    }).select('*').single();
    if (error) throw error;
    res.status(201).json(data);
  } catch (error) {
    res.status(500).json({ error: error.message || 'Không thể tạo ca làm việc.' });
  }
};

exports.updateWorkShift = async (req, res) => {
  try {
    const { code, name, start_time, end_time, break_minutes = 0, is_active = true } = req.body || {};
    if (!code?.trim() || !name?.trim() || !isTime(start_time) || !isTime(end_time) || start_time >= end_time) {
      return res.status(400).json({ error: 'Thông tin ca làm việc không hợp lệ.' });
    }
    const { data, error } = await supabase.from('work_shifts').update({
      code: code.trim(), name: name.trim(), start_time, end_time,
      break_minutes: Number(break_minutes), is_active: Boolean(is_active)
    }).eq('id', req.params.id).select('*').single();
    if (error) throw error;
    res.json(data);
  } catch (error) {
    res.status(500).json({ error: error.message || 'Không thể cập nhật ca làm việc.' });
  }
};

exports.deleteWorkShift = async (req, res) => {
  try {
    const { error } = await supabase.from('work_shifts').update({ is_active: false }).eq('id', req.params.id);
    if (error) throw error;
    res.json({ message: 'Đã ngừng sử dụng ca làm việc.' });
  } catch (error) {
    res.status(500).json({ error: error.message || 'Không thể ngừng ca làm việc.' });
  }
};

exports.getDepartmentShiftSchedules = async (req, res) => {
  try {
    const [{ data, error }, { data: departments, error: departmentError }] = await Promise.all([
      supabase.from('department_shift_schedules').select(`
        id, department_id, shift_id, weekday, effective_from, effective_to,
        departments (id, name), work_shifts (id, code, name, start_time, end_time)
      `).order('weekday').order('effective_from', { ascending: false }),
      supabase.from('departments').select('id, name').order('name')
    ]);
    if (error) throw error;
    if (departmentError) throw departmentError;
    res.json({ schedules: data || [], departments: departments || [] });
  } catch (error) {
    res.status(500).json({ error: error.message || 'Không thể tải lịch phòng ban.' });
  }
};

exports.createDepartmentShiftSchedule = async (req, res) => {
  try {
    const { department_id, shift_id, weekday, effective_from, effective_to } = req.body || {};
    if (!department_id || !shift_id || !Number.isInteger(Number(weekday)) || Number(weekday) < 1 || Number(weekday) > 7 || !isDateOnly(effective_from)) {
      return res.status(400).json({ error: 'Thông tin lịch phòng ban không hợp lệ.' });
    }
    if (effective_to && (!isDateOnly(effective_to) || effective_to < effective_from)) {
      return res.status(400).json({ error: 'Ngày kết thúc hiệu lực không hợp lệ.' });
    }
    const manager = await getManagerEmployee(req.user.id);
    const { data, error } = await supabase.from('department_shift_schedules').insert({
      department_id, shift_id, weekday: Number(weekday), effective_from,
      effective_to: effective_to || null, created_by: manager.id
    }).select(`*, departments (id, name), work_shifts (id, code, name, start_time, end_time)`).single();
    if (error) throw error;
    res.status(201).json(data);
  } catch (error) {
    res.status(500).json({ error: error.message || 'Không thể tạo lịch phòng ban.' });
  }
};

exports.deleteDepartmentShiftSchedule = async (req, res) => {
  try {
    const { error } = await supabase.from('department_shift_schedules').delete().eq('id', req.params.id);
    if (error) throw error;
    res.json({ message: 'Đã xóa lịch phòng ban.' });
  } catch (error) {
    res.status(500).json({ error: error.message || 'Không thể xóa lịch phòng ban.' });
  }
};

exports.getOvertimeShifts = async (req, res) => {
  try {
    const { data, error } = await supabase.from('overtime_shifts').select(`
      *, departments (id, name), overtime_registrations (id, employee_id, status, attendance_status, employees:overtime_registrations_employee_id_fkey (id, full_name))
    `).order('work_date', { ascending: false }).order('start_time', { ascending: false });
    if (error) throw error;
    res.json(data || []);
  } catch (error) {
    res.status(500).json({ error: error.message || 'Không thể tải danh sách tăng ca.' });
  }
};

exports.createOvertimeShift = async (req, res) => {
  try {
    const { department_id, title, work_date, start_time, end_time, slots_needed, note } = req.body || {};
    const slots = Number(slots_needed);
    if (!isDateOnly(work_date) || !start_time || !end_time || new Date(end_time) <= new Date(start_time) || !Number.isInteger(slots) || slots < 1) {
      return res.status(400).json({ error: 'Thông tin slot tăng ca không hợp lệ.' });
    }
    const manager = await getManagerEmployee(req.user.id);
    const { data, error } = await supabase.from('overtime_shifts').insert({
      department_id: department_id || null, title: title?.trim() || null, work_date,
      start_time, end_time, slots_needed: slots, note: note?.trim() || null, created_by: manager.id
    }).select('*').single();
    if (error) throw error;
    res.status(201).json(data);
  } catch (error) {
    res.status(500).json({ error: error.message || 'Không thể mở slot tăng ca.' });
  }
};

exports.updateOvertimeStatus = async (req, res) => {
  try {
    const allowed = ['open', 'closed', 'cancelled'];
    if (!allowed.includes(req.body?.status)) return res.status(400).json({ error: 'Trạng thái tăng ca không hợp lệ.' });
    const { data, error } = await supabase.from('overtime_shifts').update({ status: req.body.status }).eq('id', req.params.id).select('*').single();
    if (error) throw error;
    res.json(data);
  } catch (error) {
    res.status(500).json({ error: error.message || 'Không thể cập nhật slot tăng ca.' });
  }
};

exports.getOvertimeRegistrations = async (req, res) => {
  try {
    const { data, error } = await supabase.from('overtime_registrations').select(`
      *, employees:overtime_registrations_employee_id_fkey (id, employee_code, full_name, department_id, departments (name))
    `).eq('overtime_shift_id', req.params.id).order('registered_at');
    if (error) throw error;
    res.json(data || []);
  } catch (error) {
    res.status(500).json({ error: error.message || 'Không thể tải danh sách đăng ký tăng ca.' });
  }
};

exports.scanAbsent = async (req, res) => {
  try {
    const targetDate = req.body?.date;
    if (!isDateOnly(targetDate)) return res.status(400).json({ error: 'Ngày quét vắng không hợp lệ.' });
    const { error } = await supabase.rpc('fn_scan_daily_absent', { target_date: targetDate });
    if (error) throw error;
    res.json({ message: `Đã quét vắng cho ngày ${targetDate}.` });
  } catch (error) {
    res.status(500).json({ error: error.message || 'Không thể quét vắng.' });
  }
};

exports.getScheduledShifts = async (req, res) => {
  try {
    const { from, to, department_id: departmentId } = req.query;
    if (!isDateOnly(from) || !isDateOnly(to) || from > to) {
      return res.status(400).json({ error: 'Khoảng ngày xem lịch không hợp lệ.' });
    }

    const employeeQuery = supabase
      .from('employees')
      .select('id, employee_code, full_name, department_id, departments (id, name)')
      .eq('status', 'active');
    if (departmentId) employeeQuery.eq('department_id', departmentId);

    const [{ data: employees, error: employeeError }, { data: defaults, error: defaultError }, { data: overrides, error: overrideError }] = await Promise.all([
      employeeQuery,
      supabase.from('department_shift_schedules').select(`
        id, department_id, shift_id, weekday, effective_from, effective_to,
        work_shifts (id, code, name, start_time, end_time)
      `).lte('effective_from', to),
      supabase.from('employee_scheduled_shifts').select(`
        id, employee_id, work_date, shift_id, status, confirmed, confirmed_at,
        check_in_time, check_out_time, work_hours, overtime_hours,
        work_shifts (id, code, name, start_time, end_time)
      `).gte('work_date', from).lte('work_date', to)
    ]);
    if (employeeError) throw employeeError;
    if (defaultError) throw defaultError;
    if (overrideError) throw overrideError;

    const overrideByEmployeeDate = new Map((overrides || []).map((item) => [`${item.employee_id}-${item.work_date}`, item]));
    const rows = [];
    const currentDate = new Date(`${from}T00:00:00Z`);
    const endDate = new Date(`${to}T00:00:00Z`);
    while (currentDate <= endDate) {
      const workDate = currentDate.toISOString().slice(0, 10);
      const weekday = currentDate.getUTCDay() === 0 ? 7 : currentDate.getUTCDay();
      (employees || []).forEach((employee) => {
        const override = overrideByEmployeeDate.get(`${employee.id}-${workDate}`);
        const defaultSchedule = (defaults || [])
          .filter((item) => item.department_id === employee.department_id && item.weekday === weekday && item.work_shifts && item.effective_from <= workDate && (!item.effective_to || item.effective_to >= workDate))
          .sort((first, second) => second.effective_from.localeCompare(first.effective_from))[0];
        if (!override?.confirmed) return;
        rows.push({
          id: override?.id || `default-${employee.id}-${workDate}`,
          work_date: workDate,
          shift_id: override ? override.shift_id : defaultSchedule.shift_id,
          status: override?.status || 'scheduled',
          confirmed: override?.confirmed || false,
          confirmed_at: override?.confirmed_at || null,
          check_in_time: override?.check_in_time || null,
          check_out_time: override?.check_out_time || null,
          work_hours: override?.work_hours || 0,
          overtime_hours: override?.overtime_hours || 0,
          employees: employee,
          work_shifts: override ? override.work_shifts : defaultSchedule.work_shifts
        });
      });
      currentDate.setUTCDate(currentDate.getUTCDate() + 1);
    }
    res.json(rows);
  } catch (error) {
    res.status(500).json({ error: error.message || 'Không thể tải danh sách nhân viên theo ca.' });
  }
};

exports.getAttendanceDevices = async (
  req,
  res
) => {
  try {
    const { data, error } =
      await supabase
        .from('attendance_devices')
        .select('*')
        .order('device_name');

    if (error) throw error;

    res.json(data || []);
  } catch (error) {
    console.error(
      'Error fetching attendance devices:',
      error
    );

    res.status(500).json({
      error: error.message
    });
  }
};

exports.createAttendanceDevice = async (
  req,
  res
) => {
  try {
    const {
      device_code,
      device_name,
      location,
      ip_address
    } = req.body;

    if (!device_code?.trim()) {
      return res.status(400).json({
        error: 'Mã thiết bị là bắt buộc.'
      });
    }

    const { data, error } =
      await supabase
        .from('attendance_devices')
        .insert({
          device_code: device_code.trim(),
          device_name:
            device_name?.trim() || null,
          location:
            location?.trim() || null,
          ip_address:
            ip_address?.trim() || null
        })
        .select()
        .single();

    if (error) throw error;

    res.status(201).json(data);
  } catch (error) {
    console.error(
      'Error creating attendance device:',
      error
    );

    res.status(400).json({
      error: error.message
    });
  }
  
};

// ============================================================
// MCC DEVICE ATTENDANCE
// MCC gửi employee_code + thời gian quét
// ============================================================

exports.receiveMCCAttendance = async (req, res) => {
    try {
        const {
            device_code,
            employee_code,
            check_time,
            check_type
    } = req.body || {};

        // --------------------------------------------------------
        // 1. Validate
        // --------------------------------------------------------

        if (!device_code) {
            return res.status(400).json({
                error: 'Thiếu device_code'
            });
        }

        if (!employee_code) {
            return res.status(400).json({
                error: 'Thiếu employee_code'
            });
        }

        if (!check_time) {
            return res.status(400).json({
                error: 'Thiếu check_time'
            });
        }

        // --------------------------------------------------------
        // 2. Tìm thiết bị MCC
        // --------------------------------------------------------

        const { data: device, error: deviceError } = await supabase
            .from('attendance_devices')
            .select(`
                id,
                device_code,
                device_name,
                location,
                ip_address
            `)
            .eq('device_code', device_code)
            .maybeSingle();

        if (deviceError) {
            console.error('Device lookup error:', deviceError);

            return res.status(500).json({
                error: 'Không thể kiểm tra thiết bị MCC'
            });
        }

        if (!device) {
            return res.status(404).json({
                error: `Không tìm thấy thiết bị: ${device_code}`
            });
        }

        // --------------------------------------------------------
        // 3. Tìm nhân viên bằng employee_code
        // --------------------------------------------------------

        const { data: employee, error: employeeError } = await supabase
            .from('employees')
            .select(`
                id,
                employee_code,
                full_name,
                email,
            status,
            department_id
            `)
            .eq('employee_code', String(employee_code))
            .maybeSingle();

        if (employeeError) {
            console.error('Employee lookup error:', employeeError);

            return res.status(500).json({
                error: 'Không thể tìm nhân viên'
            });
        }

        if (!employee) {
            return res.status(404).json({
                error: `Không tìm thấy nhân viên có mã ${employee_code}`
            });
        }

        // --------------------------------------------------------
        // 4. Kiểm tra nhân viên có đang hoạt động không
        // --------------------------------------------------------

        if (employee.status && employee.status !== 'active') {
            return res.status(400).json({
                error: 'Nhân viên hiện không ở trạng thái hoạt động'
            });
        }

        // --------------------------------------------------------
        // 5. Kiểm tra thời gian
        // --------------------------------------------------------

        const parsedCheckTime = new Date(check_time);

        if (Number.isNaN(parsedCheckTime.getTime())) {
            return res.status(400).json({
                error: 'check_time không hợp lệ'
            });
        }

        // --------------------------------------------------------
        // 6. Chống gửi trùng
        // Nếu cùng employee + device + thời gian gần nhau
        // trong vòng 30 giây thì không ghi thêm
        // --------------------------------------------------------

        const duplicateFrom = new Date(
            parsedCheckTime.getTime() - 30 * 1000
        ).toISOString();

        const duplicateTo = new Date(
            parsedCheckTime.getTime() + 30 * 1000
        ).toISOString();

        const { data: duplicateLogs, error: duplicateError } =
            await supabase
                .from('attendance_logs')
                .select('id, check_time, check_type')
                .eq('employee_id', employee.id)
                .eq('device_id', device.id)
                .gte('check_time', duplicateFrom)
                .lte('check_time', duplicateTo)
                .limit(1);

        if (duplicateError) {
            console.error('Duplicate check error:', duplicateError);

            return res.status(500).json({
                error: 'Không thể kiểm tra log trùng'
            });
        }

        if (duplicateLogs && duplicateLogs.length > 0) {
            return res.status(200).json({
                success: true,
                duplicate: true,
                message: 'Lần chấm công này đã được ghi nhận trước đó.',
                employee: {
                    id: employee.id,
                    employee_code: employee.employee_code,
                    full_name: employee.full_name
                }
            });
        }

        // --------------------------------------------------------
        // 7. Lấy các log của nhân viên trong ngày
        // --------------------------------------------------------

        const vietnamDate = new Date(
            parsedCheckTime.toLocaleString('en-US', {
                timeZone: 'Asia/Ho_Chi_Minh'
            })
        );

        const year = vietnamDate.getFullYear();
        const month = String(
            vietnamDate.getMonth() + 1
        ).padStart(2, '0');

        const day = String(
            vietnamDate.getDate()
        ).padStart(2, '0');

        const workDate = `${year}-${month}-${day}`;

        const { data: scheduledShift, error: scheduledShiftError } = await supabase
          .from('employee_scheduled_shifts')
          .select(`
            id,
            shift_id,
            status,
            confirmed,
            check_in_time,
            check_out_time,
            work_shifts (id, start_time, end_time, break_minutes)
          `)
          .eq('employee_id', employee.id)
          .eq('work_date', workDate)
          .eq('confirmed', true)
          .maybeSingle();

        if (scheduledShiftError) throw scheduledShiftError;
        if (!scheduledShift) {
          return res.status(400).json({ error: 'Nhân viên chưa có lịch làm việc đã xác nhận trong ngày này.' });
        }
        if (scheduledShift.status === 'on_leave') {
          return res.status(400).json({ error: 'Nhân viên đang nghỉ phép trong ngày này.' });
        }
        if (!scheduledShift.shift_id || !scheduledShift.work_shifts) {
          return res.status(400).json({ error: 'Ngày này không có ca làm việc.' });
        }

        const { data: overtimeRegistrations, error: overtimeRegistrationError } = await supabase
          .from('overtime_registrations')
          .select(`
            id,
            status,
                overtime_shifts!inner (id, work_date, start_time, end_time)
          `)
          .eq('employee_id', employee.id)
          .eq('status', 'registered')
          .eq('overtime_shifts.work_date', workDate);

        if (overtimeRegistrationError) throw overtimeRegistrationError;
        const overtimeRegistration = (overtimeRegistrations || []).find(
          (registration) => registration.overtime_shifts
        ) || null;

        const startOfDay = new Date(
            `${workDate}T00:00:00+07:00`
        );

        const endOfDay = new Date(
            `${workDate}T23:59:59.999+07:00`
        );

        const { data: todayLogs, error: todayLogsError } =
            await supabase
                .from('attendance_logs')
                .select(`
                    id,
                    check_time,
                    check_type
                `)
                .eq('employee_id', employee.id)
                .gte(
                    'check_time',
                    startOfDay.toISOString()
                )
                .lte(
                    'check_time',
                    endOfDay.toISOString()
                )
                .order('check_time', {
                    ascending: true
                });

        if (todayLogsError) {
            console.error(
                'Today logs error:',
                todayLogsError
            );

            return res.status(500).json({
                error: 'Không thể lấy log chấm công trong ngày'
            });
        }

        // --------------------------------------------------------
        // 8. Tự xác định IN / OUT
        //
        // Nếu MCC không gửi check_type:
        //
        // lần 1 -> in
        // lần 2 -> out
        // lần 3 -> in
        // lần 4 -> out
        //
        // --------------------------------------------------------

        let finalCheckType = check_type;

        if (
            finalCheckType !== 'in' &&
            finalCheckType !== 'out'
        ) {
            finalCheckType =
                todayLogs.length % 2 === 0
                    ? 'in'
                    : 'out';
        }

        // --------------------------------------------------------
        // 9. Lưu log thô
        // --------------------------------------------------------

        const { data: log, error: logError } =
            await supabase
                .from('attendance_logs')
                .insert({
                    employee_id: employee.id,
                    device_id: device.id,
                    check_time: parsedCheckTime.toISOString(),
                    check_type: finalCheckType,
                    image_url: null,
                    raw_payload: req.body,
                    synced_at: new Date().toISOString()
                })
                .select()
                .single();

        if (logError) {
            console.error(
                'Insert attendance log error:',
                logError
            );

            return res.status(500).json({
                error: 'Không thể lưu log chấm công'
            });
        }

        // --------------------------------------------------------
        // 10. Lấy attendance rule
        // --------------------------------------------------------

        let ruleQuery = supabase
            .from('attendance_rules')
            .select('*')
            .is('applicable_department_id', null)
            .limit(1);

        const { data: companyRules } =
            await ruleQuery;

        let rule = companyRules?.[0] || null;

        // --------------------------------------------------------
        // 11. Nếu chưa có rule công ty,
        //     tìm rule theo phòng ban
        // --------------------------------------------------------

        if (!rule) {
            const { data: employeeInfo } =
                await supabase
                    .from('employees')
                    .select('department_id')
                    .eq('id', employee.id)
                    .single();

            if (employeeInfo?.department_id) {
                const { data: departmentRules } =
                    await supabase
                        .from('attendance_rules')
                        .select('*')
                        .eq(
                            'applicable_department_id',
                            employeeInfo.department_id
                        )
                        .limit(1);

                rule = departmentRules?.[0] || null;
            }
        }

        // --------------------------------------------------------
        // 12. Lấy toàn bộ log sau khi insert
        // --------------------------------------------------------

        const { data: allLogs, error: allLogsError } =
            await supabase
                .from('attendance_logs')
                .select(`
                    check_time,
                    check_type
                `)
                .eq('employee_id', employee.id)
                .gte(
                    'check_time',
                    startOfDay.toISOString()
                )
                .lte(
                    'check_time',
                    endOfDay.toISOString()
                )
                .order('check_time', {
                    ascending: true
                });

        if (allLogsError) {
            console.error(
                'All logs error:',
                allLogsError
            );
        }

        const logs = allLogs || [];

        // --------------------------------------------------------
        // 13. Xác định check-in / check-out
        // --------------------------------------------------------

        const inLogs = logs.filter(
            item => item.check_type === 'in'
        );

        const outLogs = logs.filter(
            item => item.check_type === 'out'
        );

        const checkIn =
            inLogs.length > 0
                ? inLogs[0].check_time
                : null;

        const checkOut =
            outLogs.length > 0
                ? outLogs[outLogs.length - 1].check_time
                : null;

        // --------------------------------------------------------
        // 14. Tính giờ làm
        // --------------------------------------------------------

        let workHours = 0;
        let scheduledHours = 0;

        const [shiftStartHour, shiftStartMinute] = String(scheduledShift.work_shifts.start_time).substring(0, 5).split(':').map(Number);
        const [shiftEndHour, shiftEndMinute] = String(scheduledShift.work_shifts.end_time).substring(0, 5).split(':').map(Number);
        scheduledHours = ((shiftEndHour * 60 + shiftEndMinute) - (shiftStartHour * 60 + shiftStartMinute)) / 60;
        scheduledHours -= Number(scheduledShift.work_shifts.break_minutes || 0) / 60;

        if (checkIn && checkOut) {
            const start = new Date(checkIn);
            const end = new Date(checkOut);

            const elapsedHours =
                (end.getTime() - start.getTime()) /
                (1000 * 60 * 60);

            workHours = elapsedHours - Number(scheduledShift.work_shifts.break_minutes || 0) / 60;
            workHours = Math.min(Math.max(workHours, 0), Math.max(scheduledHours, 0));

            if (workHours < 0) {
                workHours = 0;
            }
        }

        workHours =
            Math.round(workHours * 100) / 100;

        // --------------------------------------------------------
        // 15. Tính đi trễ
        // --------------------------------------------------------

        let lateMinutes = 0;

        if (checkIn && scheduledShift.work_shifts) {
            const checkInDate = new Date(checkIn);

            const checkInVietnam = new Date(
                checkInDate.toLocaleString('en-US', {
                    timeZone: 'Asia/Ho_Chi_Minh'
                })
            );

            const actualMinutes =
              checkInVietnam.getHours() * 60 +
              checkInVietnam.getMinutes() +
              checkInVietnam.getSeconds() / 60;

            const [startHour, startMinute] =
              String(scheduledShift.work_shifts.start_time)
                    .substring(0, 5)
                    .split(':')
                    .map(Number);

            const shiftStartMinutes =
                startHour * 60 + startMinute;

            const difference =
              actualMinutes - shiftStartMinutes;

            lateMinutes = difference > 0 ? Math.ceil(difference) : 0;
        }

        // --------------------------------------------------------
        // 16. Tính về sớm
        // --------------------------------------------------------

        let earlyLeaveMinutes = 0;

        if (checkOut && scheduledShift.work_shifts) {
            const checkOutDate = new Date(checkOut);

            const checkOutVietnam = new Date(
                checkOutDate.toLocaleString('en-US', {
                    timeZone: 'Asia/Ho_Chi_Minh'
                })
            );

            const actualMinutes =
              checkOutVietnam.getHours() * 60 +
              checkOutVietnam.getMinutes() +
              checkOutVietnam.getSeconds() / 60;

            const [endHour, endMinute] =
              String(scheduledShift.work_shifts.end_time)
                    .substring(0, 5)
                    .split(':')
                    .map(Number);

            const shiftEndMinutes =
                endHour * 60 + endMinute;

            const difference =
              shiftEndMinutes - actualMinutes;

            earlyLeaveMinutes = difference > 0 ? Math.ceil(difference) : 0;
        }

        // --------------------------------------------------------
        // 17. Tính overtime
        // --------------------------------------------------------

        let overtimeHours = 0;

        if (checkOut && scheduledShift.work_shifts && overtimeRegistration) {

            const [endHour, endMinute] =
              String(scheduledShift.work_shifts.end_time)
                    .substring(0, 5)
                    .split(':')
                    .map(Number);

            const ruleEndMinutes =
                endHour * 60 + endMinute;

            const overtimeShiftEnd = new Date(overtimeRegistration.overtime_shifts.end_time);
            const checkoutDate = new Date(checkOut);
            const cappedCheckout = checkoutDate < overtimeShiftEnd ? checkoutDate : overtimeShiftEnd;
            const cappedCheckoutVietnam = new Date(cappedCheckout.toLocaleString('en-US', {
              timeZone: 'Asia/Ho_Chi_Minh'
            }));
            const cappedCheckoutMinutes =
              cappedCheckoutVietnam.getHours() * 60 +
              cappedCheckoutVietnam.getMinutes() +
              cappedCheckoutVietnam.getSeconds() / 60;

            const overtimeMinutes = cappedCheckoutMinutes - ruleEndMinutes;

            if (overtimeMinutes > 0) {
                overtimeHours =
                    Math.round(
                        (overtimeMinutes / 60) * 100
                    ) / 100;
            }
        }

        // --------------------------------------------------------
        // 18. Xác định status
        // --------------------------------------------------------

        let status = 'present';

        if (lateMinutes > 0) {
            status = 'late';
        }

        if (earlyLeaveMinutes > 0) {
            status = 'early_leave';
        }

        if (
            lateMinutes > 0 &&
            earlyLeaveMinutes > 0
        ) {
            status = 'late';
        }

          if (scheduledShift.status === 'absent') {
            status = 'absent';
          }

          const scheduledStatus = status;
          const scheduleUpdate = {
            check_in_time: checkIn,
            check_out_time: checkOut,
            work_hours: workHours,
            overtime_hours: overtimeHours,
            status: scheduledStatus,
            updated_at: new Date().toISOString()
          };
          const { error: scheduleUpdateError } = await supabase
            .from('employee_scheduled_shifts')
            .update(scheduleUpdate)
            .eq('id', scheduledShift.id);
          if (scheduleUpdateError) throw scheduleUpdateError;

        // --------------------------------------------------------
        // 19. Upsert daily summary
        // --------------------------------------------------------

        const summaryData = {
            employee_id: employee.id,
            work_date: workDate,
            rule_id: rule?.id || null,
            scheduled_shift_id: scheduledShift.id,
            check_in_time: checkIn,
            check_out_time: checkOut,
            work_hours: workHours,
            late_minutes: lateMinutes,
            early_leave_minutes: earlyLeaveMinutes,
            overtime_hours: overtimeHours,
            status,
            note: null
        };

        const { data: summary, error: summaryError } =
            await supabase
                .from('attendance_daily_summary')
                .upsert(
                    summaryData,
                    {
                        onConflict:
                            'employee_id,work_date'
                    }
                )
                .select()
                .single();

        if (summaryError) {
            console.error(
                'Summary upsert error:',
                summaryError
            );

            return res.status(500).json({
                error:
                    'Đã lưu log nhưng không thể cập nhật bảng tổng hợp',
                log
            });
        }

        // --------------------------------------------------------
        // 20. Trả kết quả
        // --------------------------------------------------------

        return res.status(200).json({
            success: true,

            message:
                finalCheckType === 'in'
                    ? 'Chấm công vào thành công'
                    : 'Chấm công ra thành công',

            employee: {
                id: employee.id,
                employee_code: employee.employee_code,
                full_name: employee.full_name,
                email: employee.email
            },

            attendance: {
                check_type: finalCheckType,
                check_time: parsedCheckTime,
                work_date: workDate,
                check_in_time: checkIn,
                check_out_time: checkOut,
                work_hours: workHours,
                late_minutes: lateMinutes,
                early_leave_minutes:
                    earlyLeaveMinutes,
                overtime_hours: overtimeHours,
                status
            },

            log_id: log.id,
            summary_id: summary.id
        });

    } catch (error) {
        console.error(
            'MCC attendance error:',
            error
        );

        return res.status(500).json({
            error:
                error.message ||
                'Lỗi xử lý dữ liệu chấm công từ MCC'
        });
    }
};