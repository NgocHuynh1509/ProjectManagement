const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabaseUrl = (process.env.SUPABASE_URL || '').replace(/\/rest\/v1\/?$/, '');
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabaseAdmin = createClient(
    supabaseUrl,
    supabaseServiceRoleKey
);

module.exports = supabaseAdmin;
