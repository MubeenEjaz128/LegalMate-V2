const express = require('express')
const { body, validationResult } = require('express-validator')
const User = require('../models/User')
const { auth } = require('../middleware/auth')
const { generateToken } = require('../config/jwt')

const uploadProfilePic = require('../middleware/uploadProfilePic')
const crypto = require('crypto');
const sendEmail = require('../utils/sendEmail');

// Helper: hash a token for single-session tracking (fast, non-reversible)
const hashToken = (token) => crypto.createHash('sha256').update(token).digest('hex');
const router = express.Router()

// ---------- helpers ----------
const toBool = (v) => {
  if (typeof v === 'boolean') return v
  if (typeof v === 'string') return ['true', '1', 'yes', 'on'].includes(v.toLowerCase())
  return false
}
const toNumber = (v) => {
  const n = typeof v === 'number' ? v : parseFloat(v)
  return Number.isFinite(n) ? n : undefined
}
const parseJSON = (v, fallback = undefined) => {
  if (v == null) return fallback
  if (typeof v === 'object') return v
  try { return JSON.parse(v) } catch { return fallback }
}
const parseLanguages = (body) => {
  // Accept languages[], languages (json), or comma-separated string
  if (Array.isArray(body['languages[]'])) return body['languages[]'].filter(Boolean)
  if (body['languages[]']) return [body['languages[]']].filter(Boolean)
  if (typeof body.languages === 'string') {
    const parsed = parseJSON(body.languages)
    if (Array.isArray(parsed)) return parsed
    // comma separated
    return body.languages.split(',').map(s => s.trim()).filter(Boolean)
  }
  if (Array.isArray(body.languages)) return body.languages.filter(Boolean)
  return undefined
}
const normPath = (p) => p?.replace(/\\/g, '/').replace(/^.*uploads\//, 'uploads/')

// ---------- Register ----------
router.post('/register', [
  body('name').trim().isLength({ min: 2 }).withMessage('Name must be at least 2 characters long'),
  body('email').isEmail().withMessage('Please provide a valid email'),
  body('password')
    .isLength({ min: 8 }).withMessage('Password must be at least 8 characters long')
    .matches(/[a-z]/).withMessage('Password must include at least one lowercase letter')
    .matches(/[A-Z]/).withMessage('Password must include at least one uppercase letter')
    .matches(/[^A-Za-z0-9]/).withMessage('Password must include at least one special character'),
  body('phone').trim().notEmpty().withMessage('Phone number is required'),
  body('address').trim().notEmpty().withMessage('Address is required'),
  body('role').isIn(['client', 'lawyer', 'admin']).withMessage('Invalid role - Only client, lawyer, and admin roles are allowed'),
  body('specialization').if(body('role').equals('lawyer')).notEmpty().withMessage('Specialization is required for lawyers'),
  body('barNumber').if(body('role').equals('lawyer')).notEmpty().withMessage('Bar number is required for lawyers'),
  body('hourlyRate').if(body('role').equals('lawyer')).isFloat({ min: 0 }).withMessage('Hourly rate must be a non-negative number'),
], async (req, res) => {
  try {
    const errors = validationResult(req)
    if (!errors.isEmpty()) {
      return res.status(400).json({ message: 'Validation failed', errors: errors.array() })
    }

    const {
      name, email, password, phone, address, role,
      specialization, barNumber, hourlyRate, bio, languages
    } = req.body

    const normalizedEmail = String(email).trim().toLowerCase()
    const existingUser = await User.findOne({ email: normalizedEmail })
    if (existingUser) {
      return res.status(400).json({ message: 'User with this email already exists' })
    }

    const userData = {
      name,
      email: normalizedEmail,
      password,
      phone,
      address,
      role
    }

    if (role === 'lawyer') {
      userData.specialization = specialization
      userData.barNumber = barNumber
      userData.hourlyRate = toNumber(hourlyRate) ?? 0
      userData.bio = bio
      const langs = Array.isArray(languages) ? languages : parseLanguages(req.body)
      userData.languages = langs?.length ? langs : ['English']
      userData.isVerified = false
    } else if (role === 'admin') {
      userData.isVerified = true
    } else {
      userData.isVerified = true
      const langs = parseLanguages(req.body)
      if (langs) userData.languages = langs
    }

    const user = new User(userData)
    await user.save()


    const token = generateToken({ userId: user._id, role: user.role })

    // Single-device enforcement: store session token hash
    user.activeSessionToken = hashToken(token);
    user.lastHeartbeat = new Date();
    await user.save({ validateBeforeSave: false });

    // Notify admin of new registration
    try {
      const { createNotification } = require('../utils/notificationHelper');
      const isLawyer = user.role === 'lawyer';
      await createNotification(req.app.get('io'), {
        type: isLawyer ? 'new_lawyer' : 'new_user',
        title: isLawyer ? 'New Lawyer Registered' : 'New User Registered',
        message: `${user.name} registered as ${user.role}`,
        referenceId: user._id,
        referenceModel: 'User',
        metadata: { userName: user.name, userEmail: user.email, extra: user.role }
      });
    } catch (notifErr) { console.error('Notification error:', notifErr.message); }

    res.status(201).json({
      message: 'User registered successfully',
      user: user.toJSON(),
      token
    })
  } catch (error) {
    console.error('Registration error:', error)
    res.status(500).json({ message: 'Server error during registration' })
  }
})

// ---------- Login ----------
router.post('/login', [
  body('email').isEmail().withMessage('Please provide a valid email'),
  body('password').notEmpty().withMessage('Password is required')
], async (req, res) => {
  try {
    const errors = validationResult(req)
    if (!errors.isEmpty()) {
      return res.status(400).json({ message: 'Validation failed', errors: errors.array() })
    }

    const email = String(req.body.email).trim().toLowerCase()
    const { password } = req.body

    console.log('🔍 Login attempt:', { email, passwordLength: password.length })

    const user = await User.findOne({ email })
    if (!user) {
      console.log('❌ User not found:', email)
      return res.status(401).json({ message: 'Invalid email or password' })
    }

    console.log('✅ User found:', { name: user.name, role: user.role, isActive: user.isActive })

    if (!user.isActive) {
      console.log('⛔ User account deactivated:', email)
      return res.status(401).json({ message: 'Account is deactivated' })
    }

    console.log('🔐 Comparing password...')
    const isPasswordValid = await user.comparePassword(password)
    console.log('🔐 Password valid:', isPasswordValid)

    if (!isPasswordValid) {
      console.log('❌ Invalid password for:', email)
      return res.status(401).json({ message: 'Invalid email or password' })
    }

    // Single-device session replacement:
    // Generate new token and replace active session hash (old device will receive SESSION_REPLACED)
    if (user.activeSessionToken) {
      console.log('🔄 Replacing active session with new login for:', email);
    }

    const token = generateToken({ userId: user._id, role: user.role })

    // Store session hash and initial heartbeat
    user.activeSessionToken = hashToken(token);
    user.lastHeartbeat = new Date();
    await user.save({ validateBeforeSave: false });

    const broadcastRealtimeStats = req.app.get('broadcastRealtimeStats');
    if (typeof broadcastRealtimeStats === 'function') {
      broadcastRealtimeStats().catch(() => {});
    }

    console.log('✅ Login successful for:', user.name)

    res.json({
      message: 'Login successful',
      user: user.toJSON(),
      token
    })
  } catch (error) {
    console.error('❌ Login error:', error)
    res.status(500).json({ message: 'Server error during login' })
  }
})

// ---------- Profile (me) ----------
router.get('/me', auth, async (req, res) => {
  try {
    const user = await User.findById(req.user.userId)
    if (!user) return res.status(404).json({ message: 'User not found' })
    res.json({ user: user.toJSON() })
  } catch (error) {
    console.error('Get profile error:', error)
    res.status(500).json({ message: 'Server error' })
  }
})

// Public profile by ID (limited)
router.get('/profile/:userId', async (req, res) => {
  try {
    const { userId } = req.params
    const user = await User.findById(userId)
      .select('name email role specialization bio hourlyRate languages isAvailable profilePicture createdAt')

    if (!user) return res.status(404).json({ message: 'User not found' })
    res.json({ user: user.toObject() })
  } catch (error) {
    console.error('Get profile by ID error:', error)
    res.status(500).json({ message: 'Server error fetching profile' })
  }
})

// Authenticated profile
router.get('/profile', auth, async (req, res) => {
  try {
    const user = await User.findById(req.user.userId)
    if (!user) return res.status(404).json({ message: 'User not found' })
    res.json({ user: user.toJSON() })
  } catch (error) {
    console.error('Get authenticated profile error:', error)
    res.status(500).json({ message: 'Server error fetching profile' })
  }
})


// ---------- Public user (limited) ----------
router.get('/user/:id', async (req, res) => {
  try {
    const user = await User.findOne({
      _id: req.params.id,
      isActive: true
    }).select('-password')

    if (!user) return res.status(404).json({ message: 'User not found' })

    const userData = user.toJSON()
    if (user.role === 'lawyer') {
      userData.rating = 4.5 // placeholder
      userData.reviewCount = 12 // placeholder
    }

    res.json(userData)
  } catch (error) {
    console.error('Get user profile error:', error)
    res.status(500).json({ message: 'Error fetching user profile' })
  }
})

// ---------- Update profile ----------
router.put('/profile', auth, uploadProfilePic.fields([
  { name: 'profilePictureFile', maxCount: 1 },
  { name: 'documentFile', maxCount: 1 }
]), async (req, res) => {
  try {
    const user = await User.findById(req.user.userId)
    if (!user) return res.status(404).json({ message: 'User not found' })

    const allowedUpdates = [
      'name', 'phone', 'address', 'bio', 'isAvailable', 'languages', 'hourlyRate',
      'specialization', 'barNumber', 'social', 'profileVisibility', 'status'
    ]

    const updates = {}

    // languages
    const langs = parseLanguages(req.body)
    if (langs) updates.languages = langs

    for (const field of allowedUpdates) {
      if (field === 'languages') continue // already handled
      if (req.body[field] === undefined) continue

      if (field === 'isAvailable') {
        updates.isAvailable = toBool(req.body.isAvailable)
      } else if (field === 'hourlyRate') {
        const rate = toNumber(req.body.hourlyRate)
        if (rate !== undefined && rate >= 0) updates.hourlyRate = rate
      } else if (field === 'social') {
        const social = parseJSON(req.body.social)
        if (social) updates.social = social
      } else {
        updates[field] = req.body[field]
      }
    }

    // File uploads
    if (req.files?.profilePictureFile?.[0]) {
      updates.profilePicture = normPath(req.files.profilePictureFile[0].path)
    }
    if (req.files?.documentFile?.[0]) {
      // placeholder for future doc handling
      // const docPath = normPath(req.files.documentFile[0].path)
    }

    Object.assign(user, updates)
    await user.save()

    res.json({ message: 'Profile updated successfully', user: user.toJSON() })
  } catch (error) {
    console.error('Update profile error:', error)
    res.status(500).json({
      message: 'Server error during profile update',
      error: error.message
    })
  }
})

// ---------- Change password ----------
router.put('/change-password', auth, [
  body('currentPassword').notEmpty().withMessage('Current password is required'),
  body('newPassword')
    .isLength({ min: 8 }).withMessage('New password must be at least 8 characters long')
    .matches(/[a-z]/).withMessage('New password must include at least one lowercase letter')
    .matches(/[A-Z]/).withMessage('New password must include at least one uppercase letter')
    .matches(/[^A-Za-z0-9]/).withMessage('New password must include at least one special character')
], async (req, res) => {
  try {
    const errors = validationResult(req)
    if (!errors.isEmpty()) {
      return res.status(400).json({ message: 'Validation failed', errors: errors.array() })
    }

    const { currentPassword, newPassword } = req.body
    const user = await User.findById(req.user.userId)
    if (!user) return res.status(404).json({ message: 'User not found' })

    const isCurrentPasswordValid = await user.comparePassword(currentPassword)
    if (!isCurrentPasswordValid) {
      return res.status(400).json({ message: 'Current password is incorrect' })
    }

    user.password = newPassword
    await user.save()

    res.json({ message: 'Password changed successfully' })
  } catch (error) {
    console.error('Change password error:', error)
    res.status(500).json({ message: 'Server error during password change' })
  }
})

// ---------- Toggle availability (lawyer) ----------
router.patch('/toggle-availability', auth, async (req, res) => {
  try {
    const user = await User.findById(req.user.userId)
    if (!user) return res.status(404).json({ message: 'User not found' })
    if (user.role !== 'lawyer') {
      return res.status(403).json({ message: 'Only lawyers can toggle availability' })
    }

    user.isAvailable = !user.isAvailable
    await user.save()

    res.json({
      message: `Availability ${user.isAvailable ? 'enabled' : 'disabled'} successfully`,
      user: user.toJSON()
    })
  } catch (error) {
    console.error('Toggle availability error:', error)
    res.status(500).json({ message: 'Server error during availability toggle' })
  }
})

// ---------- Logout ----------
router.post('/logout', auth, async (req, res) => {
  try {
    // Clear active session so token can't be reused
    await User.findByIdAndUpdate(req.user.userId, { activeSessionToken: null, lastHeartbeat: null });
    const broadcastRealtimeStats = req.app.get('broadcastRealtimeStats');
    if (typeof broadcastRealtimeStats === 'function') {
      broadcastRealtimeStats().catch(() => {});
    }
    res.json({ message: 'Logged out successfully' });
  } catch (error) {
    console.error('Logout error:', error);
    res.json({ message: 'Logged out successfully' });
  }
})

// ---------- Heartbeat (keeps session alive) ----------
router.post('/heartbeat', auth, async (req, res) => {
  try {
    await User.findByIdAndUpdate(req.user.userId, { lastHeartbeat: new Date() });
    const broadcastRealtimeStats = req.app.get('broadcastRealtimeStats');
    if (typeof broadcastRealtimeStats === 'function') {
      broadcastRealtimeStats().catch(() => {});
    }
    res.json({ ok: true });
  } catch (error) {
    res.json({ ok: true });
  }
})

// ---------- Forgot Password ----------
router.post('/forgot-password', async (req, res) => {
  try {
    console.log('🔄 Forgot password request received for:', req.body.email);
    const user = await User.findOne({ email: req.body.email });
    if (!user) {
      console.log('❌ User not found for forgot password:', req.body.email);
      return res.status(404).json({ message: 'User not found' });
    }

    // Get reset token
    const resetToken = crypto.randomBytes(20).toString('hex');

    // Hash token and set to resetPasswordToken field
    user.resetPasswordToken = crypto
      .createHash('sha256')
      .update(resetToken)
      .digest('hex');

    // Set expire
    user.resetPasswordExpire = Date.now() + 15 * 60 * 1000; // 15 minutes

    await user.save();

    // Create reset url
    const resetUrl = `${req.protocol}://${req.get('host')}/reset-password/${resetToken}`;

    console.log('\n=================================================================');
    console.log('🔑 PASSWORD RESET LINK (Copy this if email fails):');
    console.log(resetUrl);
    console.log('=================================================================\n');

    const message = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Password Reset - LegalMate</title>
</head>
<body style="margin: 0; padding: 0; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f4f4f4;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f4f4f4; padding: 20px 0;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); overflow: hidden;">
          
          <!-- Header -->
          <tr>
            <td style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; text-align: center;">
              <h1 style="color: #ffffff; margin: 0; font-size: 28px; font-weight: 600;">LegalMate</h1>
              <p style="color: #ffffff; margin: 5px 0 0 0; font-size: 14px; opacity: 0.9;">Your Legal Consultation Platform</p>
            </td>
          </tr>
          
          <!-- Content -->
          <tr>
            <td style="padding: 40px 30px;">
              <h2 style="color: #333333; margin: 0 0 20px 0; font-size: 24px;">Password Reset Request</h2>
              
              <p style="color: #666666; font-size: 16px; line-height: 1.6; margin: 0 0 20px 0;">
                Hello <strong>${user.name}</strong>,
              </p>
              
              <p style="color: #666666; font-size: 16px; line-height: 1.6; margin: 0 0 20px 0;">
                We received a request to reset your password for your LegalMate account. Click the button below to create a new password:
              </p>
              
              <!-- Reset Button -->
              <table width="100%" cellpadding="0" cellspacing="0" style="margin: 30px 0;">
                <tr>
                  <td align="center">
                    <a href="${resetUrl}" style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: #ffffff; padding: 14px 40px; text-decoration: none; border-radius: 6px; font-weight: 600; font-size: 16px; display: inline-block; box-shadow: 0 4px 6px rgba(102, 126, 234, 0.3);">
                      Reset Your Password
                    </a>
                  </td>
                </tr>
              </table>
              
              <p style="color: #666666; font-size: 14px; line-height: 1.6; margin: 20px 0;">
                Or copy and paste this link into your browser:
              </p>
              
              <div style="background-color: #f8f9fa; padding: 15px; border-radius: 6px; border-left: 4px solid #667eea; margin: 15px 0;">
                <a href="${resetUrl}" style="color: #667eea; text-decoration: none; word-break: break-all; font-size: 13px;">${resetUrl}</a>
              </div>
              
              <div style="background-color: #fff3cd; border: 1px solid #ffc107; border-radius: 6px; padding: 15px; margin: 25px 0;">
                <p style="color: #856404; margin: 0; font-size: 14px; line-height: 1.6;">
                  ⏱️ <strong>Important:</strong> This link will expire in 15 minutes for security reasons.
                </p>
              </div>
              
              <p style="color: #666666; font-size: 14px; line-height: 1.6; margin: 20px 0 0 0;">
                If you didn't request this password reset, please ignore this email or contact our support team if you have concerns.
              </p>
            </td>
          </tr>
          
          <!-- Footer -->
          <tr>
            <td style="background-color: #f8f9fa; padding: 25px 30px; border-top: 1px solid #e9ecef;">
              <p style="color: #999999; font-size: 12px; line-height: 1.6; margin: 0 0 10px 0; text-align: center;">
                This is an automated message from LegalMate. Please do not reply to this email.
              </p>
              <p style="color: #999999; font-size: 12px; line-height: 1.6; margin: 0; text-align: center;">
                © ${new Date().getFullYear()} LegalMate. All rights reserved.<br>
                <a href="https://legalmate.me" style="color: #667eea; text-decoration: none;">legalmate.me</a>
              </p>
            </td>
          </tr>
          
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
    `;

    try {
      await sendEmail({
        email: user.email,
        subject: 'Password Reset Request - LegalMate',
        html: message,
        message: `Hello ${user.name}, You requested a password reset for your LegalMate account. Click this link to reset: ${resetUrl} This link expires in 15 minutes.`
      });

      res.status(200).json({ success: true, data: 'Email sent' });
    } catch (err) {
      console.error(err);

      // PRINT LINK EVEN ON ERROR
      console.log('\n=================================================================');
      console.log('❌ EMAIL FAILED, BUT HERE IS YOUR RESET LINK:');
      console.log(resetUrl);
      console.log('=================================================================\n');

      user.resetPasswordToken = undefined;
      user.resetPasswordExpire = undefined;
      await user.save();

      return res.status(500).json({ message: 'Email could not be sent' });
    }
  } catch (error) {
    console.error('Forgot password error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// ---------- Reset Password ----------
router.post('/reset-password/:resetToken', async (req, res) => {
  try {
    const resetPasswordToken = crypto
      .createHash('sha256')
      .update(req.params.resetToken)
      .digest('hex');

    // First check if user exists with this token (regardless of expiry)
    const userWithToken = await User.findOne({
      resetPasswordToken,
    });

    if (!userWithToken) {
      console.log('❌ Invalid reset token:', req.params.resetToken);
      return res.status(400).json({ message: 'Invalid or expired token.' });
    }

    // Now check if token is expired
    if (userWithToken.resetPasswordExpire < Date.now()) {
      console.log('⏱️ Token expired for user:', userWithToken.email);
      console.log('Token expiry time:', new Date(userWithToken.resetPasswordExpire));
      console.log('Current time:', new Date(Date.now()));
      return res.status(400).json({ message: 'Invalid or expired token.' });
    }

    // Token is valid and not expired
    const user = userWithToken;
    user.password = req.body.password;
    user.resetPasswordToken = undefined;
    user.resetPasswordExpire = undefined;
    user.activeSessionToken = null; // Force logout all existing sessions
    user.lastHeartbeat = null;

    await user.save();

    console.log('✅ Password reset successful for user:', user.email);

    res.status(200).json({
      success: true,
      data: 'Password reset success',
    });
  } catch (error) {
    console.error('Reset password error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router
