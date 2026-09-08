const supabase = require('../config/supabase');
const supabaseAdmin = require('../config/supabaseAdmin');

exports.verifyToken = async (req, res, next) => {
    try {
        const authHeader = req.headers.authorization;
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return res.status(401).json({ error: 'No token provided' });
        }

        const token = authHeader.split(' ')[1];

        const { data: { user }, error } = await supabase.auth.getUser(token);

        if (error || !user) {
            return res.status(401).json({ error: 'Invalid or expired token' });
        }

        const { data: profile } = await supabaseAdmin
            .from('profiles')
            .select('role')
            .eq('id', user.id)
            .single();

        req.user = {
            id: user.id,
            email: user.email,
            role: profile ? profile.role : 'employee'
        };

        next();
    } catch (err) {
        res.status(500).json({ error: 'Failed to authenticate token' });
    }
};

exports.authorizeRole = (roles) => {
    return (req, res, next) => {
        if (!req.user || !roles.includes(req.user.role)) {
            return res.status(403).json({ error: 'Access forbidden: Insufficient permissions' });
        }
        next();
    };
};
