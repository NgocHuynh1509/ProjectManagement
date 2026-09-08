const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabaseUrl = process.env.SUPABASE_URL?.trim();
const supabaseKey = process.env.SUPABASE_KEY?.trim();

if (!supabaseUrl) {
    throw new Error('SUPABASE_URL is missing in .env');
}

if (!supabaseKey) {
    throw new Error('SUPABASE_KEY is missing in .env');
}

console.log('Supabase URL:', supabaseUrl);

const supabase = createClient(
    supabaseUrl,
    supabaseKey
);

module.exports = supabase;