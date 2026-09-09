const supabase = require('../config/supabaseAdmin');


// ============================================================
// HELPER
// Lấy employee record dựa trên auth.users.id
// ============================================================

const getCurrentEmployee = async (userId) => {

    const { data, error } = await supabase
        .from('employees')
        .select(`
            *,
            departments (
                id,
                name
            ),
            positions (
                id,
                name
            )
        `)
        .eq('user_id', userId)
        .single();

    if (error) {
        throw new Error('Không tìm thấy thông tin nhân viên.');
    }

    return data;
};


// ============================================================
// DASHBOARD
// GET /api/employee/dashboard
// ============================================================

exports.getDashboard = async (req, res) => {

    try {

        const employee = await getCurrentEmployee(req.user.id);

        const today = new Date()
            .toISOString()
            .split('T')[0];

        // ----------------------------------------------------
        // Attendance hôm nay
        // ----------------------------------------------------

        const {
            data: attendance
        } = await supabase
            .from('attendance_daily_summary')
            .select('*')
            .eq('employee_id', employee.id)
            .eq('work_date', today)
            .maybeSingle();


        // ----------------------------------------------------
        // Tasks của Employee
        // ----------------------------------------------------

        const {
            data: tasks,
            error: tasksError
        } = await supabase
            .from('tasks')
            .select(`
                id,
                title,
                description,
                deadline,
                priority,
                status,
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
            .eq('assignee_id', employee.id)
            .order('deadline', {
                ascending: true,
                nullsFirst: false
            });

        if (tasksError) {
            throw tasksError;
        }


        // ----------------------------------------------------
        // Projects Employee tham gia
        // ----------------------------------------------------

        const {
            data: projectMembers,
            error: projectError
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

        if (projectError) {
            throw projectError;
        }


        // ----------------------------------------------------
        // Task statistics
        // ----------------------------------------------------

        const allTasks = tasks || [];

        const taskStats = {
            total: allTasks.length,

            todo: allTasks.filter(
                task => task.status === 'todo'
            ).length,

            in_progress: allTasks.filter(
                task => task.status === 'in_progress'
            ).length,

            review: allTasks.filter(
                task => task.status === 'review'
            ).length,

            done: allTasks.filter(
                task => task.status === 'done'
            ).length
        };


        // ----------------------------------------------------
        // Upcoming tasks
        // ----------------------------------------------------

        const now = new Date();

        const upcomingTasks = allTasks
            .filter(task =>
                task.deadline &&
                task.status !== 'done' &&
                new Date(task.deadline) >= now
            )
            .slice(0, 5);


        // ----------------------------------------------------
        // Response
        // ----------------------------------------------------

        res.json({

            employee: {
                id: employee.id,
                user_id: employee.user_id,
                employee_code: employee.employee_code,
                full_name: employee.full_name,
                email: employee.email,
                phone: employee.phone,
                avatar_url: employee.avatar_url,

                department:
                    employee.departments?.name || null,

                position:
                    employee.positions?.name || null
            },

            attendance: attendance || null,

            taskStats,

            upcomingTasks,

            projects: (projectMembers || []).map(item => ({
                ...item.projects,
                role_in_project: item.role_in_project,
                joined_at: item.joined_at
            }))
        });

    } catch (error) {

        console.error(
            'Employee dashboard error:',
            error
        );

        res.status(500).json({
            error: error.message
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
                    employee_id
                )
            `)
            .eq('id', taskId)
            .eq('assignee_id', employee.id)
            .single();


        if (error) {
            return res.status(404).json({
                error: 'Không tìm thấy công việc.'
            });
        }


        res.json(data);

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

        const { status } = req.body;


        const allowedStatuses = [
            'todo',
            'in_progress',
            'review',
            'done'
        ];


        if (!allowedStatuses.includes(status)) {

            return res.status(400).json({
                error: 'Trạng thái task không hợp lệ.'
            });
        }


        const {
            data,
            error
        } = await supabase
            .from('tasks')
            .update({
                status,
                updated_at: new Date().toISOString()
            })
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


        // Kiểm tra task thuộc Employee
        const {
            data: task
        } = await supabase
            .from('tasks')
            .select('id')
            .eq('id', taskId)
            .eq('assignee_id', employee.id)
            .maybeSingle();


        if (!task) {

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
            .select('*')
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
            .eq('status', 'pending')
            .select()
            .single();


        if (error) {

            return res.status(404).json({
                error: 'Không thể hủy yêu cầu nghỉ phép.'
            });
        }


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