const supabase = require('../config/supabaseAdmin');

// Get all projects with manager info and tasks count for progress calculation
exports.getAllProjects = async (req, res) => {
  try {
    const { data: projects, error } = await supabase
      .from('projects')
      .select(`
        *,
        manager:employees!projects_manager_id_fkey(full_name)
      `)
      .order('created_at', { ascending: false });

    if (error) throw error;

    const projectIds = projects.map((project) => project.id);
    const { data: phases, error: phasesError } = await supabase
      .from('phases')
      .select('id, project_id')
      .in('project_id', projectIds);

    if (phasesError) throw phasesError;

    const phaseIds = (phases || []).map((phase) => phase.id);
    const { data: tasks, error: tasksError } = phaseIds.length
      ? await supabase.from('tasks').select('id, phase_id, status').in('phase_id', phaseIds)
      : { data: [], error: null };

    if (tasksError) throw tasksError;

    const formattedData = projects.map(p => {
      const projectPhaseIds = (phases || []).filter((phase) => phase.project_id === p.id).map((phase) => phase.id);
      const projectTasks = (tasks || []).filter((task) => projectPhaseIds.includes(task.phase_id));
      const totalTasks = projectTasks.length;
      const doneTasks = projectTasks.filter(t => t.status === 'done').length;
      const progress = totalTasks > 0 ? Math.round((doneTasks / totalTasks) * 100) : 0;

      return {
        id: p.id,
        name: p.name,
        manager: p.manager?.full_name || 'N/A',
        status: p.status,
        startDate: p.start_date,
        endDate: p.end_date,
        progress,
        tasksCount: totalTasks
      };
    });

    res.json(formattedData);
  } catch (error) {
    console.error('Error fetching projects:', error);
    res.status(500).json({ error: error.message });
  }
};

// Get single project details including phases and members
exports.getProjectById = async (req, res) => {
  try {
    const { id } = req.params;

    const [
      { data: project, error: pError },
      { data: phases, error: phError },
      { data: members, error: mError }
    ] = await Promise.all([
      supabase.from('projects').select('*, manager:employees!projects_manager_id_fkey(full_name)').eq('id', id).single(),
      supabase.from('phases').select('*').eq('project_id', id).order('order_index', { ascending: true }),
      supabase.from('project_members').select(`
        role_in_project, joined_at,
        employees ( id, full_name, departments (name) )
      `).eq('project_id', id)
    ]);

    if (pError) throw pError;
    if (phError) throw phError;
    if (mError) throw mError;

    res.json({
      ...project,
      phases: phases || [],
      members: (members || []).map(m => ({
        id: m.employees.id,
        name: m.employees.full_name,
        department: m.employees.departments?.name || 'N/A',
        role: m.role_in_project,
        joinedAt: m.joined_at
      }))
    });
  } catch (error) {
    console.error('Error fetching project details:', error);
    res.status(500).json({ error: error.message });
  }
};

// Get tasks for a specific project (grouped by phase or just all tasks)
exports.getProjectTasks = async (req, res) => {
  try {
    const { id } = req.params;
    // Get all phases for the project, then tasks for those phases
    const { data: phases, error: phError } = await supabase
      .from('phases')
      .select('id')
      .eq('project_id', id);

    if (phError) throw phError;

    if (!phases || phases.length === 0) {
      return res.json([]);
    }

    const phaseIds = phases.map(p => p.id);

    const { data: tasks, error: tError } = await supabase
      .from('tasks')
      .select(`
        *,
        assignee:employees!tasks_assignee_id_fkey(full_name),
        task_comments(id)
      `)
      .in('phase_id', phaseIds);

    if (tError) throw tError;

    const formattedTasks = tasks.map(t => ({
      id: t.id,
      title: t.title,
      priority: t.priority,
      status: t.status,
      deadline: t.deadline ? t.deadline.split('T')[0] : 'No deadline',
      assignee: t.assignee?.full_name || 'Unassigned',
      comments: t.task_comments?.length || 0,
      phase_id: t.phase_id
    }));

    res.json(formattedTasks);
  } catch (error) {
    console.error('Error fetching project tasks:', error);
    res.status(500).json({ error: error.message });
  }
};

// Update task status (for Kanban drag & drop)
exports.updateTaskStatus = async (req, res) => {
  try {
    const { taskId } = req.params;
    const { status } = req.body;

    if (!status) {
      return res.status(400).json({ error: 'Status is required' });
    }

    const { data, error } = await supabase
      .from('tasks')
      .update({ status, updated_at: new Date().toISOString() })
      .eq('id', taskId)
      .select()
      .single();

    if (error) throw error;

    res.json(data);
  } catch (error) {
    console.error('Error updating task status:', error);
    res.status(500).json({ error: error.message });
  }
};
