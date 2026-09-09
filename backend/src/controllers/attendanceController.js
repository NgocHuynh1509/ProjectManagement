const supabase = require('../config/supabaseAdmin');

// ============================================================
// ATTENDANCE SUMMARY
// GET /api/attendance/summary?date=YYYY-MM-DD
// ============================================================

exports.getAttendanceSummary = async (req, res) => {
  try {
    const { date } = req.query;

    if (!date) {
      return res.status(400).json({
        error: 'Ngày chấm công là bắt buộc.'
      });
    }

    const { data, error } = await supabase
      .from('attendance_daily_summary')
      .select(`
        *,
        employees (
          id,
          full_name,
          departments (name)
        )
      `)
      .eq('work_date', date)
      .order('created_at', { ascending: false });

    if (error) throw error;

    const formattedData = (data || []).map((record) => ({
      id: record.id,
      date: record.work_date,

      name: record.employees?.full_name || 'Chưa cập nhật',

      department:
        record.employees?.departments?.name || 'Chưa cập nhật',

      checkIn: record.check_in_time
        ? new Date(record.check_in_time).toLocaleTimeString(
            'vi-VN',
            {
              hour: '2-digit',
              minute: '2-digit'
            }
          )
        : '-',

      checkOut: record.check_out_time
        ? new Date(record.check_out_time).toLocaleTimeString(
            'vi-VN',
            {
              hour: '2-digit',
              minute: '2-digit'
            }
          )
        : '-',

      workHours: record.work_hours ?? 0,

      late: record.late_minutes ?? 0,

      early: record.early_leave_minutes ?? 0,

      overtime: record.overtime_hours ?? 0,

      status: record.status || 'absent'
    }));

    res.json(formattedData);
  } catch (error) {
    console.error('Error fetching attendance summary:', error);

    res.status(500).json({
      error:
        error.message ||
        'Không thể tải dữ liệu chấm công.'
    });
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