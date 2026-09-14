const supabase = require('../config/supabaseAdmin');


// // ============================================================
// // HELPER
// // Lấy employee record dựa trên auth.users.id
// // ============================================================

// const getCurrentEmployee = async (userId) => {

//     const { data, error } = await supabase
//         .from('employees')
//         .select(`
//             *,
//             departments (
//                 id,
//                 name
//             ),
//             positions (
//                 id,
//                 name
//             )
//         `)
//         .eq('user_id', userId)
//         .single();

//     if (error) {
//         throw new Error('Không tìm thấy thông tin nhân viên.');
//     }

//     return data;
// };


// ============================================================
// DASHBOARD
// GET /api/employee/dashboard
// ============================================================
// ============================================================
// GET EMPLOYEE DASHBOARD
// GET /api/employee/dashboard
// ============================================================

exports.getDashboard = async (req, res) => {
    try {
        // ========================================================
        // 1. LẤY THÔNG TIN NHÂN VIÊN ĐANG ĐĂNG NHẬP
        // ========================================================

        const { data: employee, error: employeeError } = await supabase
            .from('employees')
            .select(`
                id,
                user_id,
                employee_code,
                full_name,
                email,
                phone,
                avatar_url,
                departments (
                    id,
                    name
                ),
                positions (
                    id,
                    name
                )
            `)
            .eq('user_id', req.user.id)
            .single();

        if (employeeError || !employee) {
            console.error(
                'Employee not found:',
                employeeError?.message
            );

            return res.status(404).json({
                error: 'Không tìm thấy thông tin nhân viên.'
            });
        }

        const employeeId = employee.id;


        // ========================================================
        // 2. LẤY NGÀY HIỆN TẠI THEO GIỜ VIỆT NAM
        // ========================================================

        const now = new Date();

        const vietnamDate = new Date(
            now.toLocaleString('en-US', {
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

        const today = `${year}-${month}-${day}`;


        // ========================================================
        // 3. LẤY CHẤM CÔNG HÔM NAY
        // ========================================================

        const {
            data: attendance,
            error: attendanceError
        } = await supabase
            .from('attendance_daily_summary')
            .select(`
                id,
                employee_id,
                work_date,
                check_in_time,
                check_out_time,
                work_hours,
                overtime_hours,
                late_minutes,
                early_leave_minutes,
                status,
                note
            `)
            .eq('employee_id', employeeId)
            .eq('work_date', today)
            .maybeSingle();

        if (attendanceError) {
            console.error(
                'Attendance error:',
                attendanceError.message
            );
        }

        const { data: leaveRequests, error: leaveError } = await supabase
            .from('leave_requests')
            .select('status')
            .eq('employee_id', employeeId);

        const leaveStats = leaveError
            ? { pending: 0, total: 0 }
            : {
                pending: (leaveRequests || []).filter(
                    request => request.status === 'pending'
                ).length,
                total: (leaveRequests || []).length
            };


        // ========================================================
        // 4. LẤY TẤT CẢ TASK CỦA NHÂN VIÊN
        // ========================================================

        const {
            data: taskData,
            error: taskError
        } = await supabase
            .from('tasks')
            .select(`
                id,
                title,
                description,
                status,
                priority,
                deadline,
                phase_id,
                phases (
                    id,
                    name,
                    project_id,
                    projects (
                    id,
                    name
                    )
                )
            `)
            .eq('assignee_id', employeeId)
            .order('deadline', {
                ascending: true,
                nullsFirst: false
            });

        if (taskError) {
            throw taskError;
        }

        const tasks = taskData || [];


        // ========================================================
        // 5. TÍNH THỐNG KÊ TASK
        // ========================================================

        const taskStats = {
            total: tasks.length,

            todo: tasks.filter(
                task => task.status === 'todo'
            ).length,

            in_progress: tasks.filter(
                task => task.status === 'in_progress'
            ).length,

            review: tasks.filter(
                task => task.status === 'review'
            ).length,

            done: tasks.filter(
                task =>
                    task.status === 'done' ||
                    task.status === 'completed'
            ).length
        };


        // ========================================================
        // 6. LẤY CÁC TASK CHƯA HOÀN THÀNH
        // ========================================================

        const upcomingTasks = tasks
            .filter(task =>
                task.status !== 'done' &&
                task.status !== 'completed' &&
                task.status !== 'cancelled'
            )
            .map(task => ({
                id: task.id,
                title: task.title,
                description: task.description,
                status: task.status,
                priority: task.priority,
                due_date: task.deadline,
                project_id: task.phases?.project_id || null,

                project_name:
                    task.phases?.projects?.name ||
                    'Không thuộc dự án'
            }))
            .slice(0, 5);


        // ========================================================
        // 7. LẤY CÁC PROJECT MÀ NHÂN VIÊN THAM GIA
        // ========================================================

        const {
            data: projectMembers,
            error: projectMembersError
        } = await supabase
            .from('project_members')
            .select(`
                role_in_project,
                joined_at,
                projects (
                    id,
                    name,
                    description,
                    start_date,
                    end_date,
                    status
                )
            `)
            .eq('employee_id', employeeId);

        if (projectMembersError) {
            throw projectMembersError;
        }


        // ========================================================
        // 8. TÍNH PROGRESS CHO TỪNG PROJECT
        // ========================================================

        const projects = await Promise.all(
            (projectMembers || [])
                .filter(member => member.projects)
                .map(async member => {

                    const project = member.projects;


                    // ------------------------------------------------
                    // Lấy tất cả task của project
                    // ------------------------------------------------

                    const {
                        data: projectPhases,
                        error: projectPhasesError
                    } = await supabase
                        .from('phases')
                        .select('id')
                        .eq('project_id', project.id);

                    if (projectPhasesError) {
                        throw projectPhasesError;
                    }

                    const phaseIds = (projectPhases || [])
                        .map(phase => phase.id);

                    const {
                        data: projectTasks,
                        error: projectTasksError
                    } = phaseIds.length
                        ? await supabase
                            .from('tasks')
                            .select('id, status')
                            .in('phase_id', phaseIds)
                        : { data: [], error: null };

                    if (projectTasksError) {
                        console.error(
                            'Project task error:',
                            projectTasksError.message
                        );
                    }

                    const projectTaskList =
                        projectTasks || [];


                    // ------------------------------------------------
                    // Tổng task
                    // ------------------------------------------------

                    const totalTasks =
                        projectTaskList.length;


                    // ------------------------------------------------
                    // Task đã hoàn thành
                    // ------------------------------------------------

                    const completedTasks =
                        projectTaskList.filter(
                            task =>
                                task.status === 'done' ||
                                task.status === 'completed'
                        ).length;


                    // ------------------------------------------------
                    // Progress %
                    // ------------------------------------------------

                    const progress =
                        totalTasks > 0
                            ? Math.round(
                                (
                                    completedTasks /
                                    totalTasks
                                ) * 100
                            )
                            : 0;


                    return {
                        id: project.id,

                        name:
                            project.name,

                        description:
                            project.description,

                        start_date:
                            project.start_date,

                        end_date:
                            project.end_date,

                        status:
                            project.status,

                        role_in_project:
                            member.role_in_project,

                        joined_at:
                            member.joined_at,

                        total_tasks:
                            totalTasks,

                        completed_tasks:
                            completedTasks,

                        progress,

                        deadline:
                            project.end_date
                    };
                })
        );


        // ========================================================
        // 9. FORMAT THÔNG TIN EMPLOYEE
        // ========================================================

        const employeeInfo = {
            id: employee.id,

            user_id:
                employee.user_id,

            employee_code:
                employee.employee_code,

            full_name:
                employee.full_name,

            email:
                employee.email,

            phone:
                employee.phone,

            avatar_url:
                employee.avatar_url,

            department:
                employee.departments?.name ||
                'N/A',

            position:
                employee.positions?.name ||
                'N/A'
        };


        // ========================================================
        // 10. RESPONSE CHO FRONTEND
        // ========================================================

        res.json({
            employee: employeeInfo,

            attendance:
                attendance || null,

            taskStats,

            leaveStats,

            upcomingTasks,

            projects,

            // Hiện tại hệ thống chưa có bảng notifications
            notifications: []
        });

    } catch (error) {

        console.error(
            'Error fetching employee dashboard:',
            error
        );

        res.status(500).json({
            error:
                error.message ||
                'Không thể tải dashboard nhân viên.'
        });
    }
};

// ============================================================
// PROFILE
// GET /api/employee/profile
// ============================================================

exports.getMyProfile = async (req, res) => {

    try {

        const employee =
            await getCurrentEmployee(req.user.id);


        const [
            qualificationsResult,
            certificatesResult,
            experienceResult,
            skillsResult,
            awardsResult
        ] = await Promise.all([

            supabase
                .from('qualifications')
                .select('*')
                .eq('employee_id', employee.id),

            supabase
                .from('certificates')
                .select('*')
                .eq('employee_id', employee.id),

            supabase
                .from('work_experiences')
                .select('*')
                .eq('employee_id', employee.id),

            supabase
                .from('employee_skills')
                .select(`
                    proficiency,
                    years_experience,
                    skills (
                        id,
                        name,
                        category
                    )
                `)
                .eq('employee_id', employee.id),

            supabase
                .from('awards')
                .select('*')
                .eq('employee_id', employee.id)
        ]);


        res.json({

            ...employee,

            department:
                employee.departments || null,

            position:
                employee.positions || null,

            qualifications:
                qualificationsResult.data || [],

            certificates:
                certificatesResult.data || [],

            experience:
                experienceResult.data || [],

            skills:
                (skillsResult.data || []).map(item => ({
                    ...item.skills,
                    proficiency: item.proficiency,
                    years_experience:
                        item.years_experience
                })),

            awards:
                awardsResult.data || []
        });

    } catch (error) {

        console.error(
            'Get employee profile error:',
            error
        );

        res.status(500).json({
            error: error.message
        });
    }
};


// ============================================================
// PROFILE UPDATE
// PUT /api/employee/profile
// ============================================================

exports.updateMyProfile = async (req, res) => {

    try {

        const employee =
            await getCurrentEmployee(req.user.id);


        // Employee chỉ được sửa các field này
        const {
            phone,
            address,
            avatar_url
        } = req.body;


        const { data, error } = await supabase
            .from('employees')
            .update({
                phone:
                    phone !== undefined
                        ? phone
                        : employee.phone,

                address:
                    address !== undefined
                        ? address
                        : employee.address,

                avatar_url:
                    avatar_url !== undefined
                        ? avatar_url
                        : employee.avatar_url,

                updated_at: new Date().toISOString()
            })
            .eq('id', employee.id)
            .select(`
                id,
                employee_code,
                full_name,
                email,
                phone,
                address,
                avatar_url
            `)
            .single();


        if (error) {
            throw error;
        }


        res.json({
            message: 'Cập nhật hồ sơ thành công.',
            employee: data
        });

    } catch (error) {

        console.error(
            'Update employee profile error:',
            error
        );

        res.status(500).json({
            error: error.message
        });
    }
};


// ============================================================
// ATTENDANCE
// GET /api/employee/attendance
// ============================================================

exports.getMyAttendance = async (req, res) => {

    try {

        const employee =
            await getCurrentEmployee(req.user.id);


        const {
            month,
            year
        } = req.query;


        const currentDate = new Date();

        const selectedMonth =
            Number(month) || currentDate.getMonth() + 1;

        const selectedYear =
            Number(year) || currentDate.getFullYear();


        const startDate =
            `${selectedYear}-${String(selectedMonth).padStart(2, '0')}-01`;


        const lastDay =
            new Date(
                selectedYear,
                selectedMonth,
                0
            ).getDate();


        const endDate =
            `${selectedYear}-${String(selectedMonth).padStart(2, '0')}-${lastDay}`;


        const {
            data,
            error
        } = await supabase
            .from('attendance_daily_summary')
            .select('*')
            .eq('employee_id', employee.id)
            .gte('work_date', startDate)
            .lte('work_date', endDate)
            .order('work_date', {
                ascending: true
            });


        if (error) {
            throw error;
        }


        const records = data || [];


        const statistics = {

            totalDays: records.length,

            presentDays: records.filter(
                item =>
                    item.status === 'normal' ||
                    item.status === 'late' ||
                    item.status === 'early_leave'
            ).length,

            lateDays: records.filter(
                item =>
                    Number(item.late_minutes || 0) > 0
            ).length,

            earlyLeaveDays: records.filter(
                item =>
                    Number(item.early_leave_minutes || 0) > 0
            ).length,

            absentDays: records.filter(
                item =>
                    item.status === 'absent'
            ).length,

            leaveDays: records.filter(
                item =>
                    item.status === 'leave'
            ).length,

            totalWorkHours: records.reduce(
                (sum, item) =>
                    sum + Number(item.work_hours || 0),
                0
            ),

            totalOvertimeHours: records.reduce(
                (sum, item) =>
                    sum + Number(item.overtime_hours || 0),
                0
            )
        };


        res.json({
            month: selectedMonth,
            year: selectedYear,
            statistics,
            records
        });

    } catch (error) {

        console.error(
            'Get employee attendance error:',
            error
        );

        res.status(500).json({
            error: error.message
        });
    }
};

// ============================================================
// EMPLOYEE SCHEDULE
// ============================================================

const toDateOnly = (date) => date.toISOString().slice(0, 10);

const isDateOnly = (value) => (
    typeof value === 'string' &&
    /^\d{4}-\d{2}-\d{2}$/.test(value) &&
    !Number.isNaN(new Date(`${value}T00:00:00Z`).getTime())
);

const getMonday = (date) => {
    const result = new Date(`${date}T00:00:00Z`);
    const day = result.getUTCDay();
    const offset = day === 0 ? -6 : 1 - day;
    result.setUTCDate(result.getUTCDate() + offset);
    return toDateOnly(result);
};

const addDays = (date, days) => {
    const result = new Date(`${date}T00:00:00Z`);
    result.setUTCDate(result.getUTCDate() + days);
    return toDateOnly(result);
};

const getNextWeekStart = () => addDays(getMonday(toDateOnly(new Date())), 7);

const toShiftDateTime = (workDate, time) => new Date(`${workDate}T${String(time).slice(0, 8)}+07:00`);

const intervalsOverlap = (firstStart, firstEnd, secondStart, secondEnd) => (
    firstStart < secondEnd && secondStart < firstEnd
);

const findOverlappingOvertime = async (employeeId, workDate, shift) => {
    const { data, error } = await supabase
        .from('overtime_registrations')
        .select(`
            id,
            overtime_shifts!inner (id, title, work_date, start_time, end_time)
        `)
        .eq('employee_id', employeeId)
        .eq('status', 'registered')
        .eq('overtime_shifts.work_date', workDate);
    if (error) throw error;

    const shiftStart = toShiftDateTime(workDate, shift.start_time);
    const shiftEnd = toShiftDateTime(workDate, shift.end_time);
    return (data || []).find((registration) => {
        const overtime = registration.overtime_shifts;
        return intervalsOverlap(
            shiftStart,
            shiftEnd,
            new Date(overtime.start_time),
            new Date(overtime.end_time)
        );
    }) || null;
};

const getScheduleData = async (employee, weekStart) => {
    const weekEnd = addDays(weekStart, 6);
    const [shiftsResult, schedulesResult, overridesResult] = await Promise.all([
        supabase
            .from('work_shifts')
            .select('id, code, name, start_time, end_time, break_minutes, is_active')
            .eq('is_active', true)
            .order('start_time'),
        supabase
            .from('department_shift_schedules')
            .select(`
                id,
                shift_id,
                weekday,
                effective_from,
                effective_to,
                work_shifts (id, code, name, start_time, end_time, break_minutes)
            `)
            .eq('department_id', employee.department_id)
            .lte('effective_from', weekEnd),
        supabase
            .from('employee_scheduled_shifts')
            .select(`
                id,
                work_date,
                shift_id,
                note,
                status,
                confirmed,
                confirmed_at,
                check_in_time,
                check_out_time,
                work_hours,
                overtime_hours,
                work_shifts (id, code, name, start_time, end_time, break_minutes)
            `)
            .eq('employee_id', employee.id)
            .gte('work_date', weekStart)
            .lte('work_date', weekEnd)
    ]);

    if (shiftsResult.error) throw shiftsResult.error;
    if (schedulesResult.error) throw schedulesResult.error;
    if (overridesResult.error) throw overridesResult.error;

    const schedules = (schedulesResult.data || []).filter((schedule) => (
        (!schedule.effective_to || schedule.effective_to >= weekStart) &&
        schedule.work_shifts
    ));
    const overrides = new Map((overridesResult.data || []).map((item) => [item.work_date, item]));
    const days = Array.from({ length: 7 }, (_, index) => {
        const workDate = addDays(weekStart, index);
        const defaultSchedule = schedules
            .filter((schedule) => schedule.weekday === index + 1)
            .sort((first, second) => second.effective_from.localeCompare(first.effective_from))[0];
        const override = overrides.get(workDate);

        return {
            work_date: workDate,
            weekday: index + 1,
            shift: override ? override.work_shifts : (defaultSchedule?.work_shifts || null),
            default_shift: defaultSchedule?.work_shifts || null,
            note: override?.note || '',
            status: override?.status || 'scheduled',
            confirmed: override?.confirmed || false,
            confirmed_at: override?.confirmed_at || null,
            check_in_time: override?.check_in_time || null,
            check_out_time: override?.check_out_time || null,
            work_hours: override?.work_hours || 0,
            overtime_hours: override?.overtime_hours || 0,
            is_customized: Boolean(override),
            is_day_off: Boolean(override && !override.shift_id)
        };
    });

    const hasConfirmedDay = days.some((day) => day.confirmed);

    return {
        week_start: weekStart,
        week_end: weekEnd,
        can_edit: weekStart === getNextWeekStart() && !hasConfirmedDay,
        is_confirmed: hasConfirmedDay,
        shifts: shiftsResult.data || [],
        days
    };
};

exports.getMySchedule = async (req, res) => {
    try {
        const employee = await getCurrentEmployee(req.user.id);
        const requestedWeek = req.query.week_start || getNextWeekStart();
        if (!isDateOnly(requestedWeek)) {
            return res.status(400).json({ error: 'Ngày bắt đầu tuần không hợp lệ.' });
        }
        const weekStart = getMonday(requestedWeek);
        res.json(await getScheduleData(employee, weekStart));
    } catch (error) {
        console.error('Get employee schedule error:', error);
        res.status(500).json({ error: error.message || 'Không thể tải lịch làm việc.' });
    }
};

exports.updateMySchedule = async (req, res) => {
    try {
        const employee = await getCurrentEmployee(req.user.id);
        if (!isDateOnly(req.body?.week_start)) {
            return res.status(400).json({ error: 'Ngày bắt đầu tuần không hợp lệ.' });
        }
        const weekStart = getMonday(req.body.week_start);
        const entries = req.body?.entries;

        if (weekStart !== getNextWeekStart()) {
            return res.status(400).json({ error: 'Chỉ được đăng ký lịch cho tuần kế tiếp.' });
        }
        if (!Array.isArray(entries) || !entries.length) {
            return res.status(400).json({ error: 'Danh sách lịch cần cập nhật không hợp lệ.' });
        }

        const { data: confirmedRows, error: confirmedError } = await supabase
            .from('employee_scheduled_shifts')
            .select('id')
            .eq('employee_id', employee.id)
            .gte('work_date', weekStart)
            .lte('work_date', addDays(weekStart, 6))
            .eq('confirmed', true)
            .limit(1);
        if (confirmedError) throw confirmedError;
        if (confirmedRows?.length) {
            return res.status(409).json({ error: 'Lịch đã xác nhận và không thể chỉnh sửa. Bạn có thể gửi yêu cầu nghỉ phép.' });
        }

        const { data: activeShifts, error: shiftsError } = await supabase
            .from('work_shifts')
            .select('id')
            .eq('is_active', true);
        if (shiftsError) throw shiftsError;
        const validShiftIds = new Set((activeShifts || []).map((shift) => shift.id));
        const selectedShiftIds = [...new Set(entries.map((entry) => entry.shift_id).filter(Boolean))];
        const { data: selectedShifts, error: selectedShiftsError } = await supabase
            .from('work_shifts')
            .select('id, start_time, end_time')
            .in('id', selectedShiftIds.length ? selectedShiftIds : ['00000000-0000-0000-0000-000000000000']);
        if (selectedShiftsError) throw selectedShiftsError;
        const selectedShiftById = new Map((selectedShifts || []).map((shift) => [shift.id, shift]));

        const rows = entries.map((entry) => ({
            employee_id: employee.id,
            work_date: entry.work_date,
            shift_id: entry.shift_id || null,
            note: typeof entry.note === 'string' ? entry.note.trim() || null : null,
            status: entry.shift_id ? 'scheduled' : 'on_leave',
            confirmed: false
        }));

        if (rows.some((row) => (
            !/^\d{4}-\d{2}-\d{2}$/.test(row.work_date) ||
            row.work_date < weekStart ||
            row.work_date > addDays(weekStart, 6) ||
            (row.shift_id && !validShiftIds.has(row.shift_id))
        ))) {
            return res.status(400).json({ error: 'Ngày hoặc ca làm việc không hợp lệ.' });
        }

        for (const row of rows) {
            if (!row.shift_id) continue;
            const conflict = await findOverlappingOvertime(employee.id, row.work_date, selectedShiftById.get(row.shift_id));
            if (conflict) {
                return res.status(409).json({
                    error: `Ca ngày ${row.work_date} bị trùng với slot tăng ca "${conflict.overtime_shifts.title || 'Tăng ca'}".`
                });
            }
        }

        const { error } = await supabase
            .from('employee_scheduled_shifts')
            .upsert(rows, { onConflict: 'employee_id,work_date' });

        if (error) throw error;
        res.json(await getScheduleData(employee, weekStart));
    } catch (error) {
        console.error('Update employee schedule error:', error);
        res.status(500).json({ error: error.message || 'Không thể lưu lịch làm việc.' });
    }
};

// ============================================================
// EMPLOYEE OVERTIME REGISTRATION
// ============================================================

exports.getMyOvertimeShifts = async (req, res) => {
    try {
        const employee = await getCurrentEmployee(req.user.id);
        const { data, error } = await supabase
            .from('overtime_shifts')
            .select(`
                id,
                department_id,
                title,
                work_date,
                start_time,
                end_time,
                slots_needed,
                slots_filled,
                status,
                note,
                departments (id, name),
                overtime_registrations!left (
                    id,
                    employee_id,
                    status,
                    registered_at,
                    attendance_status
                )
            `)
            .eq('status', 'open')
            .gte('work_date', toDateOnly(new Date()))
            .or(`department_id.is.null,department_id.eq.${employee.department_id}`)
            .order('work_date')
            .order('start_time');

        if (error) throw error;

        res.json((data || []).map((shift) => ({
            ...shift,
            registrations: undefined,
            my_registration: (shift.overtime_registrations || []).find(
                (registration) => registration.employee_id === employee.id
            ) || null
        })));
    } catch (error) {
        console.error('Get employee overtime shifts error:', error);
        res.status(500).json({ error: error.message || 'Không thể tải danh sách tăng ca.' });
    }
};

exports.registerMyOvertime = async (req, res) => {
    try {
        const employee = await getCurrentEmployee(req.user.id);
        const { data: overtimeShift, error: overtimeShiftError } = await supabase
            .from('overtime_shifts')
            .select('id, title, work_date, start_time, end_time, status')
            .eq('id', req.params.id)
            .single();
        if (overtimeShiftError || !overtimeShift) {
            return res.status(404).json({ error: 'Không tìm thấy slot tăng ca.' });
        }

        const { data: scheduledShifts, error: scheduleError } = await supabase
            .from('employee_scheduled_shifts')
            .select(`
                work_date,
                shift_id,
                status,
                work_shifts (start_time, end_time)
            `)
            .eq('employee_id', employee.id)
            .eq('work_date', overtimeShift.work_date)
            .not('shift_id', 'is', null);
        if (scheduleError) throw scheduleError;

        const overtimeStart = new Date(overtimeShift.start_time);
        const overtimeEnd = new Date(overtimeShift.end_time);
        const conflict = (scheduledShifts || []).find((scheduled) => scheduled.work_shifts && intervalsOverlap(
            toShiftDateTime(scheduled.work_date, scheduled.work_shifts.start_time),
            toShiftDateTime(scheduled.work_date, scheduled.work_shifts.end_time),
            overtimeStart,
            overtimeEnd
        ));
        if (conflict) {
            return res.status(409).json({ error: `Slot tăng ca bị trùng với ca làm ngày ${overtimeShift.work_date}.` });
        }

        const { data, error } = await supabase.rpc('fn_register_overtime', {
            p_shift_id: req.params.id,
            p_employee_id: employee.id
        });
        if (error) throw error;
        res.status(201).json(data);
    } catch (error) {
        console.error('Register employee overtime error:', error);
        const message = error.message?.includes('duplicate key')
            ? 'Bạn đã đăng ký slot tăng ca này.'
            : error.message || 'Không thể đăng ký tăng ca.';
        res.status(400).json({ error: message });
    }
};

exports.cancelMyOvertime = async (req, res) => {
    try {
        const employee = await getCurrentEmployee(req.user.id);
        const { data: registration, error: lookupError } = await supabase
            .from('overtime_registrations')
            .select('id, status, overtime_shift_id')
            .eq('id', req.params.id)
            .eq('employee_id', employee.id)
            .single();
        if (lookupError || !registration) return res.status(404).json({ error: 'Không tìm thấy đăng ký tăng ca.' });
        if (registration.status !== 'registered') return res.status(400).json({ error: 'Đăng ký này không còn hiệu lực.' });

        const { error } = await supabase
            .from('overtime_registrations')
            .update({ status: 'cancelled', cancelled_at: new Date().toISOString() })
            .eq('id', registration.id);
        if (error) throw error;

        const { data: shift } = await supabase
            .from('overtime_shifts')
            .select('slots_filled, status')
            .eq('id', registration.overtime_shift_id)
            .single();
        if (shift && shift.status === 'full') {
            await supabase
                .from('overtime_shifts')
                .update({ slots_filled: Math.max(0, shift.slots_filled - 1), status: 'open' })
                .eq('id', registration.overtime_shift_id);
        } else if (shift) {
            await supabase
                .from('overtime_shifts')
                .update({ slots_filled: Math.max(0, shift.slots_filled - 1) })
                .eq('id', registration.overtime_shift_id);
        }

        res.json({ message: 'Đã hủy đăng ký tăng ca.' });
    } catch (error) {
        console.error('Cancel employee overtime error:', error);
        res.status(500).json({ error: error.message || 'Không thể hủy đăng ký tăng ca.' });
    }
};


// ============================================================
// TASKS
// ============================================================

exports.getMyTasks = async (req, res) => {

    try {

        const employee =
            await getCurrentEmployee(req.user.id);


        const {
            data,
            error
        } = await supabase
            .from('tasks')
            .select(`
                *,
                assignee:employees!tasks_assignee_id_fkey (
                    id,
                    full_name,
                    email
                ),
                phases (
                    id,
                    name,
                    project_id,
                    projects (
                        id,
                        name,
                        status
                    )
                )
            `)
            .eq('assignee_id', employee.id)
            .order('deadline', {
                ascending: true,
                nullsFirst: false
            });


        if (error) {
            throw error;
        }


        res.json(data || []);

    } catch (error) {

        console.error(
            'Get employee tasks error:',
            error
        );

        res.status(500).json({
            error: error.message
        });
    }
};


// ============================================================
// TASK DETAIL
// ============================================================

exports.getMyTaskById = async (req, res) => {

    try {

        const employee =
            await getCurrentEmployee(req.user.id);

        const { taskId } = req.params;


        const {
            data,
            error
        } = await supabase
            .from('tasks')
            .select(`
                *,
                    assignee:employees!tasks_assignee_id_fkey (
                        id,
                        full_name,
                        email
                    ),
                phases (
                    id,
                    name,
                    project_id,
                    projects (
                        id,
                        name,
                        status
                    )
                ),
                task_comments (
                    id,
                    content,
                    created_at,
                    employee_id,
                    employees (full_name)
                ),
                task_links (
                    id,
                    title,
                    url,
                    created_at,
                    employee_id
                )
            `)
            .eq('id', taskId)
            .maybeSingle();


        if (error || !data) {
            return res.status(404).json({
                error: 'Không tìm thấy công việc.'
            });
        }


        const { data: membership } = await supabase
            .from('project_members')
            .select('project_id')
            .eq('project_id', data.phases?.project_id)
            .eq('employee_id', employee.id)
            .maybeSingle();

        if (!membership) {
            return res.status(403).json({
                error: 'Bạn không thuộc dự án của công việc này.'
            });
        }

        res.json({
            ...data,
            is_assignee: data.assignee_id === employee.id,
            task_links: data.task_links || [],
            result_url: data.result_url || null
        });

    } catch (error) {

        console.error(
            'Get task detail error:',
            error
        );

        res.status(500).json({
            error: error.message
        });
    }
};


// ============================================================
// UPDATE TASK STATUS
// ============================================================

exports.updateMyTaskStatus = async (req, res) => {

    try {

        const employee =
            await getCurrentEmployee(req.user.id);

        const { taskId } = req.params;

        const {
            status,
            description,
            result_url
        } = req.body;


        const allowedStatuses = [
            'in_progress',
            'review'
        ];

        if (!allowedStatuses.includes(status)) {

            return res.status(400).json({
                error: 'Trạng thái task không hợp lệ.'
            });
        }


        const updateData = {
            status,
            updated_at: new Date().toISOString()
        };

        if (description !== undefined) {
            updateData.description = description?.trim() || null;
        }

        if (result_url !== undefined) {
            updateData.result_url = result_url?.trim() || null;
        }

        const {
            data,
            error
        } = await supabase
            .from('tasks')
            .update(updateData)
            .eq('id', taskId)
            .eq('assignee_id', employee.id)
            .select()
            .single();


        if (error) {

            return res.status(404).json({
                error: 'Không thể cập nhật task.'
            });
        }


        res.json({
            message: 'Cập nhật trạng thái thành công.',
            task: data
        });

    } catch (error) {

        console.error(
            'Update task status error:',
            error
        );

        res.status(500).json({
            error: error.message
        });
    }
};


// ============================================================
// ADD COMMENT
// ============================================================

exports.addTaskComment = async (req, res) => {

    try {

        const employee =
            await getCurrentEmployee(req.user.id);

        const { taskId } = req.params;

        const { content } = req.body;


        if (!content?.trim()) {

            return res.status(400).json({
                error: 'Nội dung bình luận không được để trống.'
            });
        }


        // Employee trong cùng project được xem và bình luận task.
        const {
            data: task
        } = await supabase
            .from('tasks')
            .select('id, phases(project_id)')
            .eq('id', taskId)
            .maybeSingle();


        if (!task || !task.phases?.project_id) {

            return res.status(403).json({
                error: 'Bạn không có quyền bình luận task này.'
            });
        }

        const { data: membership } = await supabase
            .from('project_members')
            .select('project_id')
            .eq('project_id', task.phases.project_id)
            .eq('employee_id', employee.id)
            .maybeSingle();

        if (!membership) {
            return res.status(403).json({
                error: 'Bạn không có quyền bình luận task này.'
            });
        }


        const {
            data,
            error
        } = await supabase
            .from('task_comments')
            .insert({
                task_id: taskId,
                employee_id: employee.id,
                content: content.trim()
            })
            .select()
            .single();


        if (error) {
            throw error;
        }


        res.status(201).json(data);

    } catch (error) {

        console.error(
            'Add task comment error:',
            error
        );

        res.status(500).json({
            error: error.message
        });
    }
};


// ============================================================
// PROJECTS
// ============================================================

exports.getMyProjects = async (req, res) => {

    try {

        const employee =
            await getCurrentEmployee(req.user.id);


        const {
            data,
            error
        } = await supabase
            .from('project_members')
            .select(`
                role_in_project,
                joined_at,
                projects (
                    id,
                    name,
                    description,
                    start_date,
                    end_date,
                    status
                )
            `)
            .eq('employee_id', employee.id);


        if (error) {
            throw error;
        }


        res.json(
            (data || []).map(item => ({
                ...item.projects,
                role_in_project: item.role_in_project,
                joined_at: item.joined_at
            }))
        );

    } catch (error) {

        console.error(
            'Get employee projects error:',
            error
        );

        res.status(500).json({
            error: error.message
        });
    }
};


// ============================================================
// PROJECT DETAIL
// ============================================================

exports.getMyProjectById = async (req, res) => {

    try {

        const employee =
            await getCurrentEmployee(req.user.id);

        const { projectId } = req.params;


        // Kiểm tra Employee có thuộc project không
        const {
            data: membership,
            error: membershipError
        } = await supabase
            .from('project_members')
            .select(`
                role_in_project,
                joined_at,
                projects (
                    *
                )
            `)
            .eq('project_id', projectId)
            .eq('employee_id', employee.id)
            .single();


        if (membershipError || !membership) {

            return res.status(403).json({
                error: 'Bạn không thuộc dự án này.'
            });
        }


        // Lấy phases
        const {
            data: phases,
            error: phaseError
        } = await supabase
            .from('phases')
            .select(`
                *,
                tasks (
                    *,
                    assignee:employees!tasks_assignee_id_fkey (
                        id,
                        full_name,
                        email
                    )
                )
            `)
            .eq('project_id', projectId)
            .order('order_index');


        if (phaseError) {
            throw phaseError;
        }


        // Lấy task của chính Employee
        const {
            data: tasks,
            error: taskError
        } = await supabase
            .from('tasks')
            .select(`
                *,
                phases (
                    id,
                    name
                )
            `)
            .eq('assignee_id', employee.id)
            .in(
                'phase_id',
                (phases || []).map(
                    phase => phase.id
                )
            );


        if (taskError) {
            throw taskError;
        }


        res.json({

            project: membership.projects,

            role_in_project:
                membership.role_in_project,

            joined_at:
                membership.joined_at,

            phases:
                phases || [],

            myTasks:
                tasks || []
        });

    } catch (error) {

        console.error(
            'Get employee project detail error:',
            error
        );

        res.status(500).json({
            error: error.message
        });
    }
};


// ============================================================
// LEAVE REQUESTS
// ============================================================

exports.getMyLeaveRequests = async (req, res) => {

    try {

        const employee =
            await getCurrentEmployee(req.user.id);


        const {
            data,
            error
        } = await supabase
            .from('leave_requests')
            .select('*')
            .eq('employee_id', employee.id)
            .order('created_at', {
                ascending: false
            });


        if (error) {
            throw error;
        }


        res.json(data || []);

    } catch (error) {

        console.error(
            'Get leave requests error:',
            error
        );

        res.status(500).json({
            error: error.message
        });
    }
};


// ============================================================
// CREATE LEAVE REQUEST
// ============================================================

const syncScheduledShiftLeaveStatus = async (employeeId, startDate, endDate, status) => {
    const { error } = await supabase
        .from('employee_scheduled_shifts')
        .update({ status, updated_at: new Date().toISOString() })
        .eq('employee_id', employeeId)
        .gte('work_date', startDate)
        .lte('work_date', endDate);

    if (error) throw error;
};

const restoreScheduledShiftStatus = async (employeeId, startDate, endDate) => {
    const { error: scheduledError } = await supabase
        .from('employee_scheduled_shifts')
        .update({ status: 'scheduled', updated_at: new Date().toISOString() })
        .eq('employee_id', employeeId)
        .gte('work_date', startDate)
        .lte('work_date', endDate)
        .not('shift_id', 'is', null);

    if (scheduledError) throw scheduledError;

    const { error: leaveError } = await supabase
        .from('employee_scheduled_shifts')
        .update({ status: 'on_leave', updated_at: new Date().toISOString() })
        .eq('employee_id', employeeId)
        .gte('work_date', startDate)
        .lte('work_date', endDate)
        .is('shift_id', null);

    if (leaveError) throw leaveError;
};

exports.createLeaveRequest = async (req, res) => {

    try {

        const employee =
            await getCurrentEmployee(req.user.id);


        const {
            leave_type,
            start_date,
            end_date,
            reason
        } = req.body;


        if (
            !leave_type ||
            !start_date ||
            !end_date
        ) {

            return res.status(400).json({
                error: 'Vui lòng nhập đầy đủ thông tin nghỉ phép.'
            });
        }


        if (start_date > end_date) {

            return res.status(400).json({
                error: 'Ngày bắt đầu không được lớn hơn ngày kết thúc.'
            });
        }


        const {
            data,
            error
        } = await supabase
            .from('leave_requests')
            .insert({
                employee_id: employee.id,
                leave_type,
                start_date,
                end_date,
                reason: reason || null,
                status: 'pending'
            })
            .select()
            .single();


        if (error) {
            throw error;
        }


        await syncScheduledShiftLeaveStatus(
            employee.id,
            start_date,
            end_date,
            'on_leave'
        );

        res.status(201).json({
            message: 'Đã gửi yêu cầu nghỉ phép.',
            request: data
        });

    } catch (error) {

        console.error(
            'Create leave request error:',
            error
        );

        res.status(500).json({
            error: error.message
        });
    }
};


// ============================================================
// CANCEL LEAVE REQUEST
// ============================================================

exports.cancelLeaveRequest = async (req, res) => {

    try {

        const employee =
            await getCurrentEmployee(req.user.id);

        const { id } = req.params;

        const { data: leaveRequest, error: requestError } = await supabase
            .from('leave_requests')
            .select('id, start_date, end_date')
            .eq('id', id)
            .eq('employee_id', employee.id)
            .single();

        if (requestError || !leaveRequest) {
            return res.status(404).json({
                error: 'Không thể hủy yêu cầu nghỉ phép.'
            });
        }

        const vietnamToday = new Date().toLocaleDateString('en-CA', {
            timeZone: 'Asia/Ho_Chi_Minh'
        });

        if (leaveRequest.end_date < vietnamToday) {
            return res.status(400).json({
                error: 'Không thể hủy yêu cầu vì thời gian nghỉ đã qua.'
            });
        }


        const {
            data,
            error
        } = await supabase
            .from('leave_requests')
            .update({
                status: 'cancelled',
                updated_at: new Date().toISOString()
            })
            .eq('id', id)
            .eq('employee_id', employee.id)
            .select()
            .single();


        if (error) {

            return res.status(404).json({
                error: 'Không thể hủy yêu cầu nghỉ phép.'
            });
        }


        await restoreScheduledShiftStatus(
            employee.id,
            data.start_date,
            data.end_date
        );

        res.json({
            message: 'Đã hủy yêu cầu nghỉ phép.',
            request: data
        });

    } catch (error) {

        console.error(
            'Cancel leave request error:',
            error
        );

        res.status(500).json({
            error: error.message
        });
    }
};
// ============================================================
// HELPER
// Lấy employee tương ứng với tài khoản đang đăng nhập
// ============================================================

const getCurrentEmployee = async (userId) => {

    const { data, error } = await supabase
        .from('employees')
        .select(`
            id,
            user_id,
            employee_code,
            full_name,
            email,
            phone,
            address,
            avatar_url,
            date_of_birth,
            gender,
            national_id,
            national_id_issue_date,
            national_id_issue_place,
            hire_date,
            status,
            department_id,
            position_id,
            departments (id, name),
            positions (id, name)
        `)
        .eq('user_id', userId)
        .single();

    if (error) {
        throw error;
    }

    return data;
};


// ============================================================
// UPDATE BASIC PROFILE
// PUT /employee/profile
// ============================================================

exports.updateProfile = async (req, res) => {

    try {

        const userId = req.user.id;

        const {
            phone,
            address,
            avatar_url
        } = req.body;

        const employee = await getCurrentEmployee(userId);

        const { data, error } = await supabase
            .from('employees')
            .update({
                phone: phone?.trim() || null,
                address: address?.trim() || null,
                avatar_url: avatar_url?.trim() || null,
                updated_at: new Date().toISOString()
            })
            .eq('id', employee.id)
            .select(`
                id,
                employee_code,
                full_name,
                email,
                phone,
                address,
                avatar_url,
                hire_date,
                departments ( id, name ),
                positions ( id, name )
            `)
            .single();

        if (error) {
            throw error;
        }

        res.json({
            message: 'Cập nhật hồ sơ thành công.',
            employee: data
        });

    } catch (error) {

        console.error(
            'updateProfile error:',
            error
        );

        res.status(500).json({
            error: error.message
        });

    }
};


// ============================================================
// ADD QUALIFICATION
// POST /employee/profile/qualifications
// ============================================================

exports.createQualification = async (req, res) => {

    try {

        const employee = await getCurrentEmployee(
            req.user.id
        );

        const {
            degree_name,
            school,
            major,
            graduation_year,
            degree_type
        } = req.body;

        if (!degree_name?.trim()) {

            return res.status(400).json({
                error: 'Tên bằng cấp là bắt buộc.'
            });

        }

        const { data, error } = await supabase
            .from('qualifications')
            .insert({
                employee_id: employee.id,
                degree_name: degree_name.trim(),
                school: school?.trim() || null,
                major: major?.trim() || null,
                graduation_year:
                    graduation_year
                        ? Number(graduation_year)
                        : null,
                degree_type:
                    degree_type?.trim() || null
            })
            .select()
            .single();

        if (error) {
            throw error;
        }

        res.status(201).json({
            message: 'Đã thêm bằng cấp.',
            qualification: data
        });

    } catch (error) {

        console.error(
            'createQualification error:',
            error
        );

        res.status(500).json({
            error: error.message
        });

    }
};


// ============================================================
// UPDATE QUALIFICATION
// PUT /employee/profile/qualifications/:id
// ============================================================

exports.updateQualification = async (req, res) => {

    try {

        const employee = await getCurrentEmployee(
            req.user.id
        );

        const { id } = req.params;

        const {
            degree_name,
            school,
            major,
            graduation_year,
            degree_type
        } = req.body;

        const { data, error } = await supabase
            .from('qualifications')
            .update({
                degree_name: degree_name?.trim(),
                school: school?.trim() || null,
                major: major?.trim() || null,
                graduation_year:
                    graduation_year
                        ? Number(graduation_year)
                        : null,
                degree_type:
                    degree_type?.trim() || null
            })
            .eq('id', id)
            .eq('employee_id', employee.id)
            .select()
            .single();

        if (error) {
            throw error;
        }

        res.json({
            message: 'Đã cập nhật bằng cấp.',
            qualification: data
        });

    } catch (error) {

        console.error(
            'updateQualification error:',
            error
        );

        res.status(500).json({
            error: error.message
        });

    }
};


// ============================================================
// DELETE QUALIFICATION
// DELETE /employee/profile/qualifications/:id
// ============================================================

exports.deleteQualification = async (req, res) => {

    try {

        const employee = await getCurrentEmployee(
            req.user.id
        );

        const { id } = req.params;

        const { error } = await supabase
            .from('qualifications')
            .delete()
            .eq('id', id)
            .eq('employee_id', employee.id);

        if (error) {
            throw error;
        }

        res.json({
            message: 'Đã xóa bằng cấp.'
        });

    } catch (error) {

        console.error(
            'deleteQualification error:',
            error
        );

        res.status(500).json({
            error: error.message
        });

    }
};


// ============================================================
// ADD CERTIFICATE
// POST /employee/profile/certificates
// ============================================================

exports.createCertificate = async (req, res) => {

    try {

        const employee = await getCurrentEmployee(
            req.user.id
        );

        const {
            name,
            issuer,
            issue_date,
            expiry_date,
            credential_url
        } = req.body;

        if (!name?.trim()) {

            return res.status(400).json({
                error: 'Tên chứng chỉ là bắt buộc.'
            });

        }

        const { data, error } = await supabase
            .from('certificates')
            .insert({
                employee_id: employee.id,
                name: name.trim(),
                issuer: issuer?.trim() || null,
                issue_date: issue_date || null,
                expiry_date: expiry_date || null,
                credential_url:
                    credential_url?.trim() || null
            })
            .select()
            .single();

        if (error) {
            throw error;
        }

        res.status(201).json({
            message: 'Đã thêm chứng chỉ.',
            certificate: data
        });

    } catch (error) {

        console.error(
            'createCertificate error:',
            error
        );

        res.status(500).json({
            error: error.message
        });

    }
};


// ============================================================
// UPDATE CERTIFICATE
// PUT /employee/profile/certificates/:id
// ============================================================

exports.updateCertificate = async (req, res) => {

    try {

        const employee = await getCurrentEmployee(
            req.user.id
        );

        const { id } = req.params;

        const {
            name,
            issuer,
            issue_date,
            expiry_date,
            credential_url
        } = req.body;

        const { data, error } = await supabase
            .from('certificates')
            .update({
                name: name?.trim(),
                issuer: issuer?.trim() || null,
                issue_date: issue_date || null,
                expiry_date: expiry_date || null,
                credential_url:
                    credential_url?.trim() || null
            })
            .eq('id', id)
            .eq('employee_id', employee.id)
            .select()
            .single();

        if (error) {
            throw error;
        }

        res.json({
            message: 'Đã cập nhật chứng chỉ.',
            certificate: data
        });

    } catch (error) {

        console.error(
            'updateCertificate error:',
            error
        );

        res.status(500).json({
            error: error.message
        });

    }
};


// ============================================================
// DELETE CERTIFICATE
// DELETE /employee/profile/certificates/:id
// ============================================================

exports.deleteCertificate = async (req, res) => {

    try {

        const employee = await getCurrentEmployee(
            req.user.id
        );

        const { id } = req.params;

        const { error } = await supabase
            .from('certificates')
            .delete()
            .eq('id', id)
            .eq('employee_id', employee.id);

        if (error) {
            throw error;
        }

        res.json({
            message: 'Đã xóa chứng chỉ.'
        });

    } catch (error) {

        console.error(
            'deleteCertificate error:',
            error
        );

        res.status(500).json({
            error: error.message
        });

    }
};


// ============================================================
// ADD EXPERIENCE
// POST /employee/profile/experiences
// ============================================================

exports.createExperience = async (req, res) => {

    try {

        const employee = await getCurrentEmployee(
            req.user.id
        );

        const {
            company_name,
            position,
            start_date,
            end_date,
            description
        } = req.body;

        if (!company_name?.trim()) {

            return res.status(400).json({
                error: 'Tên công ty là bắt buộc.'
            });

        }

        const { data, error } = await supabase
            .from('work_experiences')
            .insert({
                employee_id: employee.id,
                company_name: company_name.trim(),
                position: position?.trim() || null,
                start_date: start_date || null,
                end_date: end_date || null,
                description:
                    description?.trim() || null
            })
            .select()
            .single();

        if (error) {
            throw error;
        }

        res.status(201).json({
            message: 'Đã thêm kinh nghiệm.',
            experience: data
        });

    } catch (error) {

        console.error(
            'createExperience error:',
            error
        );

        res.status(500).json({
            error: error.message
        });

    }
};


// ============================================================
// UPDATE EXPERIENCE
// PUT /employee/profile/experiences/:id
// ============================================================

exports.updateExperience = async (req, res) => {

    try {

        const employee = await getCurrentEmployee(
            req.user.id
        );

        const { id } = req.params;

        const {
            company_name,
            position,
            start_date,
            end_date,
            description
        } = req.body;

        const { data, error } = await supabase
            .from('work_experiences')
            .update({
                company_name: company_name?.trim(),
                position: position?.trim() || null,
                start_date: start_date || null,
                end_date: end_date || null,
                description:
                    description?.trim() || null
            })
            .eq('id', id)
            .eq('employee_id', employee.id)
            .select()
            .single();

        if (error) {
            throw error;
        }

        res.json({
            message: 'Đã cập nhật kinh nghiệm.',
            experience: data
        });

    } catch (error) {

        console.error(
            'updateExperience error:',
            error
        );

        res.status(500).json({
            error: error.message
        });

    }
};


// ============================================================
// DELETE EXPERIENCE
// DELETE /employee/profile/experiences/:id
// ============================================================

exports.deleteExperience = async (req, res) => {

    try {

        const employee = await getCurrentEmployee(
            req.user.id
        );

        const { id } = req.params;

        const { error } = await supabase
            .from('work_experiences')
            .delete()
            .eq('id', id)
            .eq('employee_id', employee.id);

        if (error) {
            throw error;
        }

        res.json({
            message: 'Đã xóa kinh nghiệm.'
        });

    } catch (error) {

        console.error(
            'deleteExperience error:',
            error
        );

        res.status(500).json({
            error: error.message
        });

    }
};

exports.addTaskLink = async (req, res) => {
    try {
        const employee = await getCurrentEmployee(req.user.id);
        const { taskId } = req.params;
        const { title, url } = req.body || {};

        if (!url?.trim()) {
            return res.status(400).json({ error: 'Link kết quả là bắt buộc.' });
        }

        try {
            new URL(url.trim());
        } catch {
            return res.status(400).json({ error: 'Link kết quả không hợp lệ.' });
        }

        const { data: task } = await supabase
            .from('tasks')
            .select('id')
            .eq('id', taskId)
            .eq('assignee_id', employee.id)
            .maybeSingle();

        if (!task) return res.status(403).json({ error: 'Bạn không có quyền cập nhật task này.' });

        const { data, error } = await supabase
            .from('task_links')
            .insert({
                task_id: taskId,
                employee_id: employee.id,
                title: title?.trim() || 'Link kết quả',
                url: url.trim()
            })
            .select()
            .single();

        if (error) throw error;
        res.status(201).json(data);
    } catch (error) {
        console.error('Add task link error:', error);
        res.status(500).json({ error: error.message });
    }
};

exports.deleteTaskLink = async (req, res) => {
    try {
        const employee = await getCurrentEmployee(req.user.id);
        const { taskId, linkId } = req.params;
        const { error } = await supabase
            .from('task_links')
            .delete()
            .eq('id', linkId)
            .eq('task_id', taskId)
            .eq('employee_id', employee.id);

        if (error) throw error;
        res.json({ message: 'Đã xóa link.' });
    } catch (error) {
        console.error('Delete task link error:', error);
        res.status(500).json({ error: error.message });
    }
};

exports.confirmMySchedule = async (req, res) => {
    try {
        const employee = await getCurrentEmployee(req.user.id);
        if (!isDateOnly(req.body?.week_start)) {
            return res.status(400).json({ error: 'Ngày bắt đầu tuần không hợp lệ.' });
        }

        const weekStart = getMonday(req.body.week_start);
        if (weekStart !== getNextWeekStart()) {
            return res.status(400).json({ error: 'Chỉ được xác nhận lịch cho tuần kế tiếp.' });
        }

        const schedule = await getScheduleData(employee, weekStart);
        if (schedule.is_confirmed) {
            return res.status(409).json({ error: 'Lịch đã được xác nhận trước đó.' });
        }

        const confirmedAt = new Date().toISOString();
        const rows = schedule.days.map((day) => ({
            employee_id: employee.id,
            work_date: day.work_date,
            shift_id: day.shift?.id || null,
            note: day.note || null,
            status: day.shift?.id ? 'scheduled' : 'on_leave',
            confirmed: true,
            confirmed_at: confirmedAt
        }));
        const { error } = await supabase
            .from('employee_scheduled_shifts')
            .upsert(rows, { onConflict: 'employee_id,work_date' });
        if (error) throw error;

        res.json(await getScheduleData(employee, weekStart));
    } catch (error) {
        console.error('Confirm employee schedule error:', error);
        res.status(500).json({ error: error.message || 'Không thể xác nhận lịch làm việc.' });
    }
};