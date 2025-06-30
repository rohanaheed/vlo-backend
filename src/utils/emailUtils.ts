import nodemailer from 'nodemailer';

// Email configuration
const transporter = nodemailer.createTransport({
  service: 'gmail', // or your email service
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASSWORD
  }
});

// Generate a random 6-digit OTP
export const generateOTP = (): string => {
  return Math.floor(100000 + Math.random() * 900000).toString();
};

// Send OTP email
export const sendOTPEmail = async (email: string, otp: string, userName: string): Promise<boolean> => {
  try {
    const mailOptions = {
      from: process.env.EMAIL_USER,
      to: email,
      subject: 'Password Reset OTP - VHR System',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <div style="background-color: #f8f9fa; padding: 20px; text-align: center;">
            <h2 style="color: #333; margin: 0;">Password Reset Request</h2>
          </div>
          <div style="padding: 20px; background-color: #ffffff;">
            <p>Hello ${userName},</p>
            <p>You have requested to reset your password for your VHR account.</p>
            <p>Your OTP (One-Time Password) is:</p>
            <div style="background-color: #f8f9fa; padding: 15px; text-align: center; margin: 20px 0;">
              <h1 style="color: #007bff; font-size: 32px; margin: 0; letter-spacing: 5px;">${otp}</h1>
            </div>
            <p><strong>Important:</strong></p>
            <ul>
              <li>This OTP is valid for 10 minutes only</li>
              <li>Do not share this OTP with anyone</li>
              <li>If you didn't request this password reset, please ignore this email</li>
            </ul>
            <p>If you have any questions, please contact our support team.</p>
            <p>Best regards,<br>VHR Team</p>
          </div>
          <div style="background-color: #f8f9fa; padding: 15px; text-align: center; font-size: 12px; color: #666;">
            <p>This is an automated email. Please do not reply to this message.</p>
          </div>
        </div>
      `
    };

    await transporter.sendMail(mailOptions);
    return true;
  } catch (error) {
    console.error('Error sending email:', error);
    return false;
  }
};

// Send password reset success email
export const sendPasswordResetSuccessEmail = async (email: string, userName: string): Promise<boolean> => {
  try {
    const mailOptions = {
      from: process.env.EMAIL_USER,
      to: email,
      subject: 'Password Reset Successful - VHR System',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <div style="background-color: #28a745; padding: 20px; text-align: center;">
            <h2 style="color: #ffffff; margin: 0;">Password Reset Successful</h2>
          </div>
          <div style="padding: 20px; background-color: #ffffff;">
            <p>Hello ${userName},</p>
            <p>Your password has been successfully reset for your VHR account.</p>
            <p>If you did not perform this action, please contact our support team immediately.</p>
            <p>For security reasons, we recommend:</p>
            <ul>
              <li>Using a strong, unique password</li>
              <li>Enabling two-factor authentication if available</li>
              <li>Regularly updating your password</li>
            </ul>
            <p>Best regards,<br>VHR Team</p>
          </div>
          <div style="background-color: #f8f9fa; padding: 15px; text-align: center; font-size: 12px; color: #666;">
            <p>This is an automated email. Please do not reply to this message.</p>
          </div>
        </div>
      `
    };

    await transporter.sendMail(mailOptions);
    return true;
  } catch (error) {
    console.error('Error sending email:', error);
    return false;
  }
};

// Send company registration success email
export const sendCompanyRegistrationEmail = async (
  email: string, 
  customerName: string, 
  businessName: string, 
  subscription: string,
  loginUrl: string = 'https://vhr-system.com/login'
): Promise<boolean> => {
  try {
    const mailOptions = {
      from: process.env.EMAIL_USER,
      to: email,
      subject: `Welcome to VHR System - ${businessName} Registration Successful`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; text-align: center;">
            <h1 style="color: #ffffff; margin: 0; font-size: 28px;">🎉 Welcome to VHR System!</h1>
            <p style="color: #ffffff; margin: 10px 0 0 0; font-size: 16px;">Your company registration is complete</p>
          </div>
          
          <div style="padding: 30px; background-color: #ffffff;">
            <p style="font-size: 18px; color: #333; margin-bottom: 20px;">Dear ${customerName},</p>
            
            <p style="font-size: 16px; color: #555; line-height: 1.6; margin-bottom: 20px;">
              Congratulations! Your company <strong>${businessName}</strong> has been successfully registered with the VHR (Virtual Human Resources) System.
            </p>
            
            <div style="background-color: #f8f9fa; padding: 20px; border-radius: 8px; margin: 25px 0;">
              <h3 style="color: #333; margin: 0 0 15px 0;">Registration Details:</h3>
              <ul style="margin: 0; padding-left: 20px; color: #555;">
                <li><strong>Company Name:</strong> ${businessName}</li>
                <li><strong>Subscription Plan:</strong> ${subscription}</li>
                <li><strong>Registration Date:</strong> ${new Date().toLocaleDateString()}</li>
                <li><strong>Account Status:</strong> Active</li>
              </ul>
            </div>
            
            <p style="font-size: 16px; color: #555; line-height: 1.6; margin-bottom: 25px;">
              You can now access your VHR dashboard and start managing your human resources efficiently. Our platform provides comprehensive tools for employee management, payroll, attendance tracking, and much more.
            </p>
            
            <div style="text-align: center; margin: 30px 0;">
              <a href="${loginUrl}" style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: #ffffff; padding: 15px 30px; text-decoration: none; border-radius: 25px; font-weight: bold; display: inline-block; font-size: 16px;">
                🚀 Access Your Dashboard
              </a>
            </div>
            
            <div style="background-color: #e8f4fd; padding: 20px; border-radius: 8px; margin: 25px 0;">
              <h4 style="color: #2c5aa0; margin: 0 0 15px 0;">What's Next?</h4>
              <ul style="margin: 0; padding-left: 20px; color: #555;">
                <li>Complete your company profile setup</li>
                <li>Add your first employees to the system</li>
                <li>Configure your HR policies and workflows</li>
                <li>Explore our comprehensive feature set</li>
                <li>Schedule a demo with our support team</li>
              </ul>
            </div>
            
            <p style="font-size: 16px; color: #555; line-height: 1.6; margin-bottom: 20px;">
              If you have any questions or need assistance getting started, our support team is here to help. You can reach us at <a href="mailto:support@vhr-system.com" style="color: #667eea;">support@vhr-system.com</a> or call us at <strong>+1-800-VHR-HELP</strong>.
            </p>
            
            <p style="font-size: 16px; color: #555; line-height: 1.6; margin-bottom: 20px;">
              Thank you for choosing VHR System. We're excited to help you streamline your HR processes!
            </p>
            
            <p style="font-size: 16px; color: #333; margin-bottom: 5px;">Best regards,</p>
            <p style="font-size: 16px; color: #333; margin: 0;">The VHR Team</p>
          </div>
          
          <div style="background-color: #f8f9fa; padding: 20px; text-align: center;">
            <p style="margin: 0; color: #666; font-size: 14px;">
              This is an automated email. Please do not reply to this message.
            </p>
            <p style="margin: 10px 0 0 0; color: #666; font-size: 12px;">
              © 2024 VHR System. All rights reserved.
            </p>
          </div>
        </div>
      `
    };

    await transporter.sendMail(mailOptions);
    return true;
  } catch (error) {
    console.error('Error sending company registration email:', error);
    return false;
  }
}; 