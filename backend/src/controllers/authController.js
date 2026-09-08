const supabase = require('../config/supabase');
const supabaseAdmin = require('../config/supabaseAdmin');

exports.register = async (req, res) => {
    try {
        const { email, password, role } = req.body;

        const { data, error } = await supabaseAdmin.auth.admin.createUser({
            email,
            password,
            email_confirm: true,
            user_metadata: {
                role: role || 'employee'
            }
        });

        if (error) {
            return res.status(400).json({ error: error.message });
        }

        res.status(201).json({
            message: 'User created successfully!',
            user: data.user
        });
    } catch (err) {
        res.status(500).json({ error: 'Server error during user creation' });
    }
};

exports.login = async (req, res) => {
    try {
        const { email, password } = req.body;

        const { data, error } = await supabase.auth.signInWithPassword({
            email,
            password
        });

        if (error) {
            return res.status(400).json({ error: error.message });
        }

        // Fetch user's profile to get their role
        const { data: profile, error: profileError } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', data.user.id)
            .single();

        if (profileError) {
            console.error("Profile fetch error:", profileError.message);
        }

        const appRole = profile ? profile.role : (data.user.user_metadata?.role || 'employee');

        res.status(200).json({
            message: 'Logged in successfully!',
            session: data.session,
            user: {
                ...data.user,
                role: appRole,
                profile: profile || null
            }
        });
    } catch (err) {
        res.status(500).json({ error: 'Server error during login' });
    }
};
