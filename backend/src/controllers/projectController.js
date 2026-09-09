const supabase = require('../config/supabaseAdmin');

const PROJECT_STATUSES = [
  'planning',
  'in_progress',
  'completed',
  'cancelled'
];

const TASK_STATUSES = [
  'todo',
  'in_progress',
  'review',
  'done'
];

const TASK_PRIORITIES = [
  'low',
  'medium',
  'high',
  'urgent'
];

const PHASE_STATUSES = [
  'not_started',
  'in_progress',
  'completed'
];

const isValidDateRange = (startDate, endDate) => (
  !startDate ||
  !endDate ||
  new Date(startDate) <= new Date(endDate)
);

// ============================================================
// GET ALL PROJECTS
// GET /api/projects
// ============================================================

exports.getAllProjects = async (req, res) => {
  try {
    const { data: projects, error } = await supabase
      .from('projects')
      .select(`
        id,
        name,
        description,
        start_date,
        end_date,
        status,
        manager_id,
        created_at,
        updated_at,
        manager:employees!projects_manager_id_fkey (
          id,
          full_name
        )
      `)
      .order('created_at', { ascending: false });

    if (error) throw error;

    if (!projects || projects.length === 0) {
      return res.json([]);
    }

    const projectIds = projects.map((project) => project.id);

    const { data: phases, error: phasesError } = await supabase
      .from('phases')
      .select('id, project_id')
      .in('project_id', projectIds);

    if (phasesError) throw phasesError;

    const phaseIds = (phases || []).map((phase) => phase.id);

    let tasks = [];

    if (phaseIds.length > 0) {
      const { data, error: tasksError } = await supabase
        .from('tasks')
        .select('id, phase_id, status')
        .in('phase_id', phaseIds);

      if (tasksError) throw tasksError;

      tasks = data || [];
    }

    const formattedProjects = projects.map((project) => {
      const projectPhaseIds = (phases || [])
        .filter((phase) => phase.project_id === project.id)
        .map((phase) => phase.id);

      const projectTasks = tasks.filter((task) =>
        projectPhaseIds.includes(task.phase_id)
      );

      const totalTasks = projectTasks.length;

      const completedTasks = projectTasks.filter(
        (task) => task.status === 'done'
      ).length;

      const progress =
        totalTasks > 0
          ? Math.round((completedTasks / totalTasks) * 100)
          : 0;

      return {
        id: project.id,
        name: project.name,
        description: project.description,
        managerId: project.manager_id,
        manager: project.manager?.full_name || 'Chưa phân công',
        startDate: project.start_date,
        endDate: project.end_date,
        status: project.status,
        progress,
        tasksCount: totalTasks,
        createdAt: project.created_at,
        updatedAt: project.updated_at
      };
    });

    res.json(formattedProjects);
  } catch (error) {
    console.error('Error fetching projects:', error);

    res.status(500).json({
      error: error.message || 'Không thể tải danh sách dự án.'
    });
  }
};

// ============================================================
// GET PROJECT OPTIONS
// GET /api/projects/options
//
// Dùng cho:
// - Chọn manager
// - Chọn employee
// ============================================================

exports.getProjectOptions = async (req, res) => {
  try {
    const { data: employees, error } = await supabase
      .from('employees')
      .select(`
        id,
        employee_code,
        full_name,
        email,
        status,
        departments(name),
        positions(name)
      `)
      .order('full_name', { ascending: true });

    if (error) throw error;

    res.json({
      employees: employees || []
    });
  } catch (error) {
    console.error('Error fetching project options:', error);

    res.status(500).json({
      error: error.message || 'Không thể tải dữ liệu lựa chọn.'
    });
  }
};

// ============================================================
// GET PROJECT BY ID
// GET /api/projects/:id
// ============================================================

exports.getProjectById = async (req, res) => {
  try {
    const { id } = req.params;

    const [
      projectResult,
      phasesResult,
      membersResult
    ] = await Promise.all([
      supabase
        .from('projects')
        .select(`
          *,
          manager:employees!projects_manager_id_fkey (
            id,
            full_name,
            email
          )
        `)
        .eq('id', id)
        .single(),

      supabase
        .from('phases')
        .select('*')
        .eq('project_id', id)
        .order('order_index', { ascending: true }),

      supabase
        .from('project_members')
        .select(`
          project_id,
          employee_id,
          role_in_project,
          joined_at,
          employees (
            id,
            employee_code,
            full_name,
            email,
            department_id,
            departments(name),
            positions(name)
          )
        `)
        .eq('project_id', id)
    ]);

    const {
      data: project,
      error: projectError
    } = projectResult;

    const {
      data: phases,
      error: phasesError
    } = phasesResult;

    const {
      data: members,
      error: membersError
    } = membersResult;

    if (projectError) {
      if (projectError.code === 'PGRST116') {
        return res.status(404).json({
          error: 'Không tìm thấy dự án.'
        });
      }

      throw projectError;
    }
    if (phasesError) throw phasesError;
    if (membersError) throw membersError;

    res.json({
      id: project.id,
      name: project.name,
      description: project.description,
      start_date: project.start_date,
      end_date: project.end_date,
      status: project.status,
      manager_id: project.manager_id,
      manager: project.manager
        ? {
            id: project.manager.id,
            full_name: project.manager.full_name,
            email: project.manager.email
          }
        : null,
      created_at: project.created_at,
      updated_at: project.updated_at,

      phases: phases || [],

      members: (members || [])
        .filter((member) => member.employees)
        .map((member) => ({
          id: member.employee_id,
          name: member.employees.full_name,
          employeeCode: member.employees.employee_code,
          email: member.employees.email,
          department:
            member.employees.departments?.name || 'Chưa cập nhật',
          position:
            member.employees.positions?.name || 'Chưa cập nhật',
          role: member.role_in_project || '',
          joinedAt: member.joined_at
        }))
    });
  } catch (error) {
    console.error('Error fetching project details:', error);

    res.status(500).json({
      error: error.message || 'Không thể tải chi tiết dự án.'
    });
  }
};

// ============================================================
// CREATE PROJECT
// POST /api/projects
// ============================================================

exports.createProject = async (req, res) => {
  try {
    const {
      name,
      description,
      start_date,
      end_date,
      manager_id,
      status
    } = req.body;

    if (!name || !name.trim()) {
      return res.status(400).json({
        error: 'Tên dự án là bắt buộc.'
      });
    }

    const projectStatus = status || 'planning';

    if (!PROJECT_STATUSES.includes(projectStatus)) {
      return res.status(400).json({
        error: 'Trạng thái dự án không hợp lệ.'
      });
    }

    if (!isValidDateRange(start_date, end_date)) {
      return res.status(400).json({
        error: 'Ngày bắt đầu không được lớn hơn ngày kết thúc.'
      });
    }

    const { data, error } = await supabase
      .from('projects')
      .insert({
        name: name.trim(),
        description: description?.trim() || null,
        start_date: start_date || null,
        end_date: end_date || null,
        manager_id: manager_id || null,
        status: projectStatus
      })
      .select(`
        *,
        manager:employees!projects_manager_id_fkey (
          id,
          full_name
        )
      `)
      .single();

    if (error) throw error;

    res.status(201).json({
      id: data.id,
      name: data.name,
      description: data.description,
      start_date: data.start_date,
      end_date: data.end_date,
      status: data.status,
      manager_id: data.manager_id,
      manager: data.manager,
      progress: 0,
      tasksCount: 0
    });
  } catch (error) {
    console.error('Error creating project:', error);

    res.status(500).json({
      error: error.message || 'Không thể tạo dự án.'
    });
  }
};

// ============================================================
// UPDATE PROJECT
// PUT /api/projects/:id
// ============================================================

exports.updateProject = async (req, res) => {
  try {
    const { id } = req.params;

    const {
      name,
      description,
      start_date,
      end_date,
      manager_id,
      status
    } = req.body;

    if (!name || !name.trim()) {
      return res.status(400).json({
        error: 'Tên dự án là bắt buộc.'
      });
    }

    if (status && !PROJECT_STATUSES.includes(status)) {
      return res.status(400).json({
        error: 'Trạng thái dự án không hợp lệ.'
      });
    }

    if (!isValidDateRange(start_date, end_date)) {
      return res.status(400).json({
        error: 'Ngày bắt đầu không được lớn hơn ngày kết thúc.'
      });
    }

    const { data, error } = await supabase
      .from('projects')
      .update({
        name: name.trim(),
        description: description?.trim() || null,
        start_date: start_date || null,
        end_date: end_date || null,
        manager_id: manager_id || null,
        ...(status ? { status } : {}),
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .select(`
        *,
        manager:employees!projects_manager_id_fkey (
          id,
          full_name,
          email
        )
      `)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return res.status(404).json({
          error: 'Không tìm thấy dự án.'
        });
      }

      throw error;
    }

    res.json(data);
  } catch (error) {
    console.error('Error updating project:', error);

    res.status(500).json({
      error: error.message || 'Không thể cập nhật dự án.'
    });
  }
};

// ============================================================
// DELETE PROJECT
// DELETE /api/projects/:id
// ============================================================

exports.deleteProject = async (req, res) => {
  try {
    const { id } = req.params;

    const { error } = await supabase
      .from('projects')
      .delete()
      .eq('id', id);

    if (error) throw error;

    res.json({
      message: 'Xóa dự án thành công.'
    });
  } catch (error) {
    console.error('Error deleting project:', error);

    res.status(500).json({
      error: error.message || 'Không thể xóa dự án.'
    });
  }
};

// ============================================================
// CREATE PHASE
// POST /api/projects/:id/phases
// ============================================================

exports.createPhase = async (req, res) => {
  try {
    const { id: projectId } = req.params;

    const {
      name,
      description,
      start_date,
      end_date,
      status
    } = req.body;

    if (!name || !name.trim()) {
      return res.status(400).json({
        error: 'Tên giai đoạn là bắt buộc.'
      });
    }

    const phaseStatus = status || 'not_started';

    if (!PHASE_STATUSES.includes(phaseStatus)) {
      return res.status(400).json({
        error: 'Trạng thái giai đoạn không hợp lệ.'
      });
    }

    if (!isValidDateRange(start_date, end_date)) {
      return res.status(400).json({
        error: 'Ngày bắt đầu không được lớn hơn ngày kết thúc.'
      });
    }

    const { data: lastPhase, error: lastPhaseError } = await supabase
      .from('phases')
      .select('order_index')
      .eq('project_id', projectId)
      .order('order_index', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (lastPhaseError) throw lastPhaseError;

    const orderIndex = lastPhase
      ? lastPhase.order_index + 1
      : 0;

    const { data, error } = await supabase
      .from('phases')
      .insert({
        project_id: projectId,
        name: name.trim(),
        description: description?.trim() || null,
        start_date: start_date || null,
        end_date: end_date || null,
        order_index: orderIndex,
        status: phaseStatus
      })
      .select('*')
      .single();

    if (error) throw error;

    res.status(201).json(data);
  } catch (error) {
    console.error('Error creating phase:', error);

    res.status(500).json({
      error: error.message || 'Không thể tạo giai đoạn.'
    });
  }
};

// ============================================================
// UPDATE PHASE
// PUT /api/projects/:id/phases/:phaseId
// ============================================================

exports.updatePhase = async (req, res) => {
  try {
    const { id: projectId, phaseId } = req.params;

    const {
      name,
      description,
      start_date,
      end_date,
      order_index,
      status
    } = req.body;

    if (!name || !name.trim()) {
      return res.status(400).json({
        error: 'Tên giai đoạn là bắt buộc.'
      });
    }

    if (status && !PHASE_STATUSES.includes(status)) {
      return res.status(400).json({
        error: 'Trạng thái giai đoạn không hợp lệ.'
      });
    }

    if (!isValidDateRange(start_date, end_date)) {
      return res.status(400).json({
        error: 'Ngày bắt đầu không được lớn hơn ngày kết thúc.'
      });
    }

    const { data, error } = await supabase
      .from('phases')
      .update({
        name: name.trim(),
        description: description?.trim() || null,
        start_date: start_date || null,
        end_date: end_date || null,
        ...(order_index !== undefined ? { order_index } : {}),
        ...(status ? { status } : {})
      })
      .eq('id', phaseId)
      .eq('project_id', projectId)
      .select('*')
      .single();

    if (error) throw error;

    res.json(data);
  } catch (error) {
    console.error('Error updating phase:', error);

    res.status(500).json({
      error: error.message || 'Không thể cập nhật giai đoạn.'
    });
  }
};

// ============================================================
// DELETE PHASE
// DELETE /api/projects/:id/phases/:phaseId
// ============================================================

exports.deletePhase = async (req, res) => {
  try {
    const { id: projectId, phaseId } = req.params;

    const { error } = await supabase
      .from('phases')
      .delete()
      .eq('id', phaseId)
      .eq('project_id', projectId);

    if (error) throw error;

    res.json({
      message: 'Xóa giai đoạn thành công.'
    });
  } catch (error) {
    console.error('Error deleting phase:', error);

    res.status(500).json({
      error: error.message || 'Không thể xóa giai đoạn.'
    });
  }
};

// ============================================================
// ADD MEMBER
// POST /api/projects/:id/members
// ============================================================

exports.addProjectMember = async (req, res) => {
  try {
    const { id: projectId } = req.params;

    const {
      employee_id,
      role_in_project,
      joined_at
    } = req.body;

    if (!employee_id) {
      return res.status(400).json({
        error: 'Vui lòng chọn nhân viên.'
      });
    }

    const { data: existingMember, error: existingError } = await supabase
      .from('project_members')
      .select('employee_id')
      .eq('project_id', projectId)
      .eq('employee_id', employee_id)
      .maybeSingle();

    if (existingError) throw existingError;

    if (existingMember) {
      return res.status(409).json({
        error: 'Nhân viên này đã tham gia dự án.'
      });
    }

    const { data, error } = await supabase
      .from('project_members')
      .insert({
        project_id: projectId,
        employee_id,
        role_in_project: role_in_project?.trim() || null,
        joined_at: joined_at || new Date().toISOString().split('T')[0]
      })
      .select(`
        project_id,
        employee_id,
        role_in_project,
        joined_at,
        employees (
          id,
          employee_code,
          full_name,
          email,
          departments(name),
          positions(name)
        )
      `)
      .single();

    if (error) throw error;

    res.status(201).json({
      id: data.employee_id,
      name: data.employees?.full_name,
      employeeCode: data.employees?.employee_code,
      email: data.employees?.email,
      department: data.employees?.departments?.name || 'Chưa cập nhật',
      position: data.employees?.positions?.name || 'Chưa cập nhật',
      role: data.role_in_project || '',
      joinedAt: data.joined_at
    });
  } catch (error) {
    console.error('Error adding project member:', error);

    res.status(500).json({
      error: error.message || 'Không thể thêm thành viên.'
    });
  }
};

// ============================================================
// DELETE MEMBER
// DELETE /api/projects/:id/members/:employeeId
// ============================================================

exports.removeProjectMember = async (req, res) => {
  try {
    const { id: projectId, employeeId } = req.params;

    const { error } = await supabase
      .from('project_members')
      .delete()
      .eq('project_id', projectId)
      .eq('employee_id', employeeId);

    if (error) throw error;

    res.json({
      message: 'Xóa thành viên khỏi dự án thành công.'
    });
  } catch (error) {
    console.error('Error removing project member:', error);

    res.status(500).json({
      error: error.message || 'Không thể xóa thành viên.'
    });
  }
};

// ============================================================
// GET PROJECT TASKS
// GET /api/projects/:id/tasks
// ============================================================

exports.getProjectTasks = async (req, res) => {
  try {
    const { id: projectId } = req.params;

    const { data: phases, error: phasesError } = await supabase
      .from('phases')
      .select('id, name')
      .eq('project_id', projectId);

    if (phasesError) throw phasesError;

    if (!phases || phases.length === 0) {
      return res.json([]);
    }

    const phaseIds = phases.map((phase) => phase.id);

    const { data: tasks, error } = await supabase
      .from('tasks')
      .select(`
        *,
        assignee:employees!tasks_assignee_id_fkey (
          id,
          full_name
        ),
        creator:employees!tasks_created_by_fkey (
          id,
          full_name
        ),
        task_comments(id)
      `)
      .in('phase_id', phaseIds)
      .order('created_at', { ascending: true });

    if (error) throw error;

    const formattedTasks = (tasks || []).map((task) => ({
      id: task.id,
      title: task.title,
      description: task.description,
      priority: task.priority,
      status: task.status,
      deadline: task.deadline
        ? task.deadline.split('T')[0]
        : '',
      assigneeId: task.assignee_id,
      assignee: task.assignee?.full_name || 'Chưa phân công',
      createdBy: task.creator?.full_name || '',
      comments: task.task_comments?.length || 0,
      phase_id: task.phase_id,
      created_at: task.created_at,
      updated_at: task.updated_at
    }));

    res.json(formattedTasks);
  } catch (error) {
    console.error('Error fetching project tasks:', error);

    res.status(500).json({
      error: error.message || 'Không thể tải danh sách công việc.'
    });
  }
};

// ============================================================
// CREATE TASK
// POST /api/projects/:id/tasks
// ============================================================

exports.createTask = async (req, res) => {
  try {
    const { id: projectId } = req.params;

    const {
      phase_id,
      title,
      description,
      deadline,
      assignee_id,
      created_by,
      priority,
      status
    } = req.body;

    if (!phase_id) {
      return res.status(400).json({
        error: 'Vui lòng chọn giai đoạn.'
      });
    }

    if (!title || !title.trim()) {
      return res.status(400).json({
        error: 'Tên công việc là bắt buộc.'
      });
    }

    const { data: phase, error: phaseError } = await supabase
      .from('phases')
      .select('id')
      .eq('id', phase_id)
      .eq('project_id', projectId)
      .single();

    if (phaseError || !phase) {
      return res.status(400).json({
        error: 'Giai đoạn không thuộc dự án này.'
      });
    }

    const taskPriority = priority || 'medium';
    const taskStatus = status || 'todo';

    if (!TASK_PRIORITIES.includes(taskPriority)) {
      return res.status(400).json({
        error: 'Mức độ ưu tiên không hợp lệ.'
      });
    }

    if (!TASK_STATUSES.includes(taskStatus)) {
      return res.status(400).json({
        error: 'Trạng thái công việc không hợp lệ.'
      });
    }

    const { data, error } = await supabase
      .from('tasks')
      .insert({
        phase_id,
        title: title.trim(),
        description: description?.trim() || null,
        deadline: deadline || null,
        assignee_id: assignee_id || null,
        created_by: created_by || null,
        priority: taskPriority,
        status: taskStatus
      })
      .select(`
        *,
        assignee:employees!tasks_assignee_id_fkey (
          id,
          full_name
        )
      `)
      .single();

    if (error) throw error;

    res.status(201).json({
      ...data,
      assignee: data.assignee?.full_name || 'Chưa phân công',
      comments: 0
    });
  } catch (error) {
    console.error('Error creating task:', error);

    res.status(500).json({
      error: error.message || 'Không thể tạo công việc.'
    });
  }
};

// ============================================================
// UPDATE TASK
// PUT /api/projects/tasks/:taskId
// ============================================================

exports.updateTask = async (req, res) => {
  try {
    const { taskId } = req.params;

    const {
      phase_id,
      title,
      description,
      deadline,
      assignee_id,
      priority,
      status
    } = req.body;

    if (!title || !title.trim()) {
      return res.status(400).json({
        error: 'Tên công việc là bắt buộc.'
      });
    }

    if (priority && !TASK_PRIORITIES.includes(priority)) {
      return res.status(400).json({
        error: 'Mức độ ưu tiên không hợp lệ.'
      });
    }

    if (status && !TASK_STATUSES.includes(status)) {
      return res.status(400).json({
        error: 'Trạng thái công việc không hợp lệ.'
      });
    }

    const { data: currentTask, error: currentTaskError } = await supabase
      .from('tasks')
      .select('id, phase_id, phases(project_id)')
      .eq('id', taskId)
      .maybeSingle();

    if (currentTaskError) throw currentTaskError;

    if (!currentTask) {
      return res.status(404).json({
        error: 'Không tìm thấy công việc.'
      });
    }

    if (phase_id && phase_id !== currentTask.phase_id) {
      const { data: targetPhase, error: targetPhaseError } = await supabase
        .from('phases')
        .select('id, project_id')
        .eq('id', phase_id)
        .maybeSingle();

      if (targetPhaseError) throw targetPhaseError;

      if (
        !targetPhase ||
        targetPhase.project_id !== currentTask.phases?.project_id
      ) {
        return res.status(400).json({
          error: 'Giai đoạn không thuộc cùng dự án với công việc.'
        });
      }
    }

    const updateData = {
      title: title.trim(),
      description: description?.trim() || null,
      deadline: deadline || null,
      assignee_id: assignee_id || null,
      updated_at: new Date().toISOString()
    };

    if (phase_id) updateData.phase_id = phase_id;
    if (priority) updateData.priority = priority;
    if (status) updateData.status = status;

    const { data, error } = await supabase
      .from('tasks')
      .update(updateData)
      .eq('id', taskId)
      .select(`
        *,
        assignee:employees!tasks_assignee_id_fkey (
          id,
          full_name
        ),
        task_comments(id)
      `)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return res.status(404).json({
          error: 'Không tìm thấy công việc.'
        });
      }

      throw error;
    }

    res.json({
      ...data,
      assignee: data.assignee?.full_name || 'Chưa phân công',
      comments: data.task_comments?.length || 0
    });
  } catch (error) {
    console.error('Error updating task:', error);

    res.status(500).json({
      error: error.message || 'Không thể cập nhật công việc.'
    });
  }
};

// ============================================================
// UPDATE TASK STATUS
// PUT /api/projects/tasks/:taskId/status
// ============================================================

exports.updateTaskStatus = async (req, res) => {
  try {
    const { taskId } = req.params;
    const { status } = req.body;

    if (!status) {
      return res.status(400).json({
        error: 'Status is required.'
      });
    }

    if (!TASK_STATUSES.includes(status)) {
      return res.status(400).json({
        error: 'Trạng thái công việc không hợp lệ.'
      });
    }

    const { data, error } = await supabase
      .from('tasks')
      .update({
        status,
        updated_at: new Date().toISOString()
      })
      .eq('id', taskId)
      .select('*')
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return res.status(404).json({
          error: 'Không tìm thấy công việc.'
        });
      }

      throw error;
    }

    res.json(data);
  } catch (error) {
    console.error('Error updating task status:', error);

    res.status(500).json({
      error: error.message || 'Không thể cập nhật trạng thái.'
    });
  }
};

// ============================================================
// DELETE TASK
// DELETE /api/projects/tasks/:taskId
// ============================================================

exports.deleteTask = async (req, res) => {
  try {
    const { taskId } = req.params;

    const { error } = await supabase
      .from('tasks')
      .delete()
      .eq('id', taskId);

    if (error) throw error;

    res.json({
      message: 'Xóa công việc thành công.'
    });
  } catch (error) {
    console.error('Error deleting task:', error);

    res.status(500).json({
      error: error.message || 'Không thể xóa công việc.'
    });
  }
};
