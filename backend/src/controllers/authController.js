const supabase = require('../config/supabase');
const supabaseAdmin = require('../config/supabaseAdmin');
const crypto = require('crypto');
const nodemailer = require('nodemailer');

const OTP_EXPIRES_MINUTES = 10;
const OTP_MAX_ATTEMPTS = 5;
const passwordResetOtps = new Map();
const hashValue = (value) => crypto.createHash('sha256').update(value).digest('hex');

const getMailer = () => {
    const { SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASSWORD } = process.env;
    if (!SMTP_HOST || !SMTP_USER || !SMTP_PASSWORD) return null;

    return nodemailer.createTransport({
        host: SMTP_HOST,
        port: Number(SMTP_PORT || 587),
        secure: String(SMTP_PORT || 587) === '465',
        auth: { user: SMTP_USER, pass: SMTP_PASSWORD }
    });
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

exports.requestPasswordReset = async (req, res) => {
    try {
        const email = req.body.email?.trim().toLowerCase();
        if (!email) return res.status(400).json({ error: 'Vui lòng nhập email.' });

        const mailer = getMailer();
        if (!mailer) {
            return res.status(503).json({
                error: 'Chưa cấu hình mail service. Vui lòng bổ sung SMTP_HOST, SMTP_USER và SMTP_PASSWORD.'
            });
        }

        const { data: user } = await supabaseAdmin
            .from('employees')
            .select('user_id, full_name, email')
            .eq('email', email)
            .maybeSingle();

        if (user) {
            const otp = String(crypto.randomInt(100000, 1000000));
            const expiresAt = new Date(Date.now() + OTP_EXPIRES_MINUTES * 60 * 1000);

            passwordResetOtps.set(email, {
                otpHash: hashValue(otp),
                expiresAt: expiresAt.getTime(),
                attempts: 0
            });

            await mailer.sendMail({
                from: process.env.SMTP_FROM || process.env.SMTP_USER,
                to: email,
                subject: 'Mã OTP đặt lại mật khẩu QLNS',
                text: `Xin chào ${user.full_name || ''}, mã OTP của bạn là ${otp}. Mã có hiệu lực trong ${OTP_EXPIRES_MINUTES} phút.`
            });
        }

        res.json({ message: 'Nếu email tồn tại, mã OTP đã được gửi.' });
    } catch (error) {
        console.error('Password reset request error:', error);
        res.status(500).json({ error: 'Không thể gửi mã OTP lúc này.' });
    }
};

exports.resetPassword = async (req, res) => {
    try {
        const email = req.body.email?.trim().toLowerCase();
        const otp = String(req.body.otp || '').trim();
        const password = req.body.password || '';

        if (!email || !/^\d{6}$/.test(otp) || password.length < 6) {
            return res.status(400).json({ error: 'Email, OTP 6 số và mật khẩu mới tối thiểu 6 ký tự là bắt buộc.' });
        }

        const resetRequest = passwordResetOtps.get(email);

        if (!resetRequest || resetRequest.expiresAt < Date.now()) {
            passwordResetOtps.delete(email);
            return res.status(400).json({ error: 'OTP không tồn tại hoặc đã hết hạn.' });
        }
        if (resetRequest.attempts >= OTP_MAX_ATTEMPTS) {
            return res.status(429).json({ error: 'OTP đã bị khóa do nhập sai quá nhiều lần.' });
        }
        if (hashValue(otp) !== resetRequest.otpHash) {
            resetRequest.attempts += 1;
            return res.status(400).json({ error: 'OTP không chính xác.' });
        }

        const { data: user, error: userError } = await supabaseAdmin
            .from('employees').select('user_id').eq('email', email).single();
        if (userError || !user?.user_id) return res.status(400).json({ error: 'Không tìm thấy tài khoản.' });

        const { error: updateError } = await supabaseAdmin.auth.admin.updateUserById(user.user_id, { password });
        if (updateError) throw updateError;
        passwordResetOtps.delete(email);
        res.json({ message: 'Đặt lại mật khẩu thành công.' });
    } catch (error) {
        console.error('Password reset error:', error);
        res.status(500).json({ error: 'Không thể đặt lại mật khẩu lúc này.' });
    }
};
