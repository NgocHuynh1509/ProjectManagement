const supabase = require('../config/supabaseAdmin');

exports.getEmployeeOptions = async (req, res) => {
  try {
    const [{ data: departments, error: departmentsError }, { data: positions, error: positionsError }] = await Promise.all([
      supabase.from('departments').select('id, name').order('name'),
      supabase.from('positions').select('id, name').order('name')
    ]);

    if (departmentsError) throw departmentsError;
    if (positionsError) throw positionsError;
    res.json({ departments: departments || [], positions: positions || [] });
  } catch (error) {
    console.error('Error fetching employee options:', error);
    res.status(500).json({ error: error.message });
  }
};

exports.createEmployee = async (req, res) => {
  try {
    const {
      employee_code: employeeCode,
      full_name: fullName,
      email,
      phone,
      department_id: departmentId,
      position_id: positionId,
      hire_date: hireDate,
      status = 'active',
      password,
      role = 'employee'
    } = req.body;

    if (!fullName?.trim() || !email?.trim()) {
      return res.status(400).json({ error: 'Họ tên và email là bắt buộc.' });
    }
    if (!password || password.length < 6) {
      return res.status(400).json({ error: 'Mật khẩu tài khoản phải có ít nhất 6 ký tự.' });
    }
    if (!['manager', 'employee'].includes(role)) {
      return res.status(400).json({ error: 'Vai trò chỉ có thể là manager hoặc employee.' });
    }

    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
      email: email.trim(),
      password,
      email_confirm: true,
      user_metadata: { role, full_name: fullName.trim() }
    });

    if (authError) throw authError;
    const userId = authData.user.id;

    try {
      const { error: profileError } = await supabase
        .from('profiles')
        .upsert({ id: userId, role });
      if (profileError) throw profileError;

      const { data, error } = await supabase
        .from('employees')
        .insert({
          user_id: userId,
          employee_code: employeeCode?.trim() || null,
          full_name: fullName.trim(),
          email: email.trim(),
          phone: phone?.trim() || null,
          department_id: departmentId || null,
          position_id: positionId || null,
          hire_date: hireDate || null,
          status
        })
        .select(`
        id, employee_code, full_name, email, phone, status,
        departments ( id, name ), positions ( id, name )
        `)
        .single();

      if (error) throw error;
      res.status(201).json({
        id: data.id,
        userId,
        code: data.employee_code,
        name: data.full_name,
        department: data.departments?.name || 'N/A',
        position: data.positions?.name || 'N/A',
        email: data.email,
        phone: data.phone,
        status: data.status,
        role
      });
    } catch (error) {
      await supabase.auth.admin.deleteUser(userId);
      throw error;
    }
  } catch (error) {
    console.error('Error creating employee:', error);
    res.status(400).json({ error: error.message });
  }
};

// Get all employees (joined with departments and positions)
exports.getAllEmployees = async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('employees')
      .select(`
        id,
        employee_code,
        full_name,
        email,
        phone,
        status,
        departments ( id, name ),
        positions ( id, name )
      `)
      .order('employee_code', { ascending: true });

    if (error) throw error;

    // Transform data for frontend mapping
    const formattedData = data.map(emp => ({
      id: emp.id,
      code: emp.employee_code,
      name: emp.full_name,
      department: emp.departments?.name || 'N/A',
      position: emp.positions?.name || 'N/A',
      email: emp.email,
      phone: emp.phone,
      status: emp.status
    }));

    res.json(formattedData);
  } catch (error) {
    console.error('Error fetching employees:', error);
    res.status(500).json({ error: error.message });
  }
};

// Get single employee details with relations
exports.getEmployeeById = async (req, res) => {
  try {
    const { id } = req.params;

    const { data: emp, error: empError } = await supabase
      .from('employees')
      .select(`
        *,
        departments ( id, name ),
        positions ( id, name )
      `)
      .eq('id', id)
      .single();

    if (empError) throw empError;

    // Fetch related profile data concurrently
    const [
      { data: qualifications },
      { data: certificates },
      { data: experience },
      { data: skillsData },
      { data: awards },
      { data: projects }
    ] = await Promise.all([
      supabase.from('qualifications').select('*').eq('employee_id', id),
      supabase.from('certificates').select('*').eq('employee_id', id),
      supabase.from('work_experiences').select('*').eq('employee_id', id),
      supabase.from('employee_skills').select(`
        proficiency, years_experience,
        skills ( name, category )
      `).eq('employee_id', id),
      supabase.from('awards').select('*').eq('employee_id', id),
      supabase.from('project_members').select(`
        role_in_project, joined_at,
        projects ( id, name, status )
      `).eq('employee_id', id)
    ]);

    // Format skills
    const skills = (skillsData || []).map(s => ({
      name: s.skills?.name,
      category: s.skills?.category,
      proficiency: s.proficiency,
      yearsExperience: s.years_experience
    }));

    res.json({
      ...emp,
      qualifications: qualifications || [],
      certificates: certificates || [],
      experience: experience || [],
      skills: skills,
      awards: awards || [],
      projects: projects || []
    });

  } catch (error) {
    console.error('Error fetching employee details:', error);
    res.status(500).json({ error: error.message });
  }
};
