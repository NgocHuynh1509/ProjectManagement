const supabase = require('../config/supabaseAdmin');

// Get attendance summary for a specific date
exports.getAttendanceSummary = async (req, res) => {
  try {
    const { date } = req.query; // format: YYYY-MM-DD
    if (!date) {
      return res.status(400).json({ error: 'Date is required' });
    }

    const { data, error } = await supabase
      .from('attendance_daily_summary')
      .select(`
        *,
        employees ( id, full_name, departments (name) )
      `)
      .eq('work_date', date)
      .order('created_at', { ascending: false });

    if (error) throw error;

    const formattedData = data.map(record => ({
      id: record.id,
      date: record.work_date,
      name: record.employees?.full_name || 'N/A',
      department: record.employees?.departments?.name || 'N/A',
      checkIn: record.check_in_time ? new Date(record.check_in_time).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }) : '-',
      checkOut: record.check_out_time ? new Date(record.check_out_time).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }) : '-',
      workHours: record.work_hours,
      late: record.late_minutes,
      early: record.early_leave_minutes,
      overtime: record.overtime_hours,
      status: record.status
    }));

    res.json(formattedData);
  } catch (error) {
    console.error('Error fetching attendance summary:', error);
    res.status(500).json({ error: error.message });
  }
};

exports.getAttendanceLogs = async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('attendance_logs')
      .select('id, check_time, check_type, image_url, employees(id, full_name), attendance_devices(id, device_code, device_name)')
      .order('check_time', { ascending: false })
      .limit(200);
    if (error) throw error;
    res.json((data || []).map((log) => ({
      id: log.id,
      employee: log.employees?.full_name || 'N/A',
      employeeId: log.employees?.id,
      device: log.attendance_devices?.device_name || log.attendance_devices?.device_code || 'N/A',
      checkTime: log.check_time,
      checkType: log.check_type || 'unknown',
      imageUrl: log.image_url
    })));
  } catch (error) {
    console.error('Error fetching attendance logs:', error);
    res.status(500).json({ error: error.message });
  }
};

exports.getAttendanceRules = async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('attendance_rules')
      .select('*, departments:applicable_department_id(id, name)')
      .order('created_at', { ascending: false });
    if (error) throw error;
    res.json(data || []);
  } catch (error) {
    console.error('Error fetching attendance rules:', error);
    res.status(500).json({ error: error.message });
  }
};

exports.createAttendanceRule = async (req, res) => {
  try {
    const { name, work_start_time, work_end_time, late_threshold_minutes = 0, early_leave_threshold_minutes = 0, break_minutes = 0, overtime_after_minutes, applicable_department_id } = req.body;
    if (!name || !work_start_time || !work_end_time) return res.status(400).json({ error: 'Tên ca, giờ vào và giờ ra là bắt buộc.' });
    const { data, error } = await supabase.from('attendance_rules').insert({ name, work_start_time, work_end_time, late_threshold_minutes, early_leave_threshold_minutes, break_minutes, overtime_after_minutes: overtime_after_minutes || null, applicable_department_id: applicable_department_id || null }).select().single();
    if (error) throw error;
    res.status(201).json(data);
  } catch (error) {
    console.error('Error creating attendance rule:', error);
    res.status(400).json({ error: error.message });
  }
};

exports.getAttendanceDevices = async (req, res) => {
  try {
    const { data, error } = await supabase.from('attendance_devices').select('*').order('device_name');
    if (error) throw error;
    res.json(data || []);
  } catch (error) {
    console.error('Error fetching attendance devices:', error);
    res.status(500).json({ error: error.message });
  }
};

exports.createAttendanceDevice = async (req, res) => {
  try {
    const { device_code, device_name, location, ip_address } = req.body;
    if (!device_code) return res.status(400).json({ error: 'Mã thiết bị là bắt buộc.' });
    const { data, error } = await supabase.from('attendance_devices').insert({ device_code, device_name, location, ip_address }).select().single();
    if (error) throw error;
    res.status(201).json(data);
  } catch (error) {
    console.error('Error creating attendance device:', error);
    res.status(400).json({ error: error.message });
  }
};
