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

// Send email verification to newly created user
export const sendVerificationEmail = async (
  email: string, 
  userName: string, 
  verificationToken: string,
  verificationUrl: string = 'https://vhr-system.com/verify-email'
): Promise<boolean> => {
  try {
    const mailOptions = {
      from: process.env.EMAIL_USER,
      to: email,
      subject: 'Verify Your Email - VHR System',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; text-align: center;">
            <h1 style="color: #ffffff; margin: 0; font-size: 28px;">📧 Verify Your Email</h1>
            <p style="color: #ffffff; margin: 10px 0 0 0; font-size: 16px;">Welcome to VHR System</p>
          </div>
          
          <div style="padding: 30px; background-color: #ffffff;">
            <p style="font-size: 18px; color: #333; margin-bottom: 20px;">Hello ${userName},</p>
            
            <p style="font-size: 16px; color: #555; line-height: 1.6; margin-bottom: 20px;">
              Thank you for creating an account with VHR System! To complete your registration and access your account, please verify your email address by clicking the button below.
            </p>
            
            <div style="text-align: center; margin: 30px 0;">
              <a href="${verificationUrl}?token=${verificationToken}" style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: #ffffff; padding: 15px 30px; text-decoration: none; border-radius: 25px; font-weight: bold; display: inline-block; font-size: 16px;">
                ✅ Verify Email Address
              </a>
            </div>
            
            <div style="background-color: #f8f9fa; padding: 20px; border-radius: 8px; margin: 25px 0;">
              <h4 style="color: #333; margin: 0 0 15px 0;">Important Information:</h4>
              <ul style="margin: 0; padding-left: 20px; color: #555;">
                <li>This verification link is valid for 24 hours</li>
                <li>If the button doesn't work, copy and paste this link: <br>
                  <a href="${verificationUrl}?token=${verificationToken}" style="color: #667eea; word-break: break-all;">${verificationUrl}?token=${verificationToken}</a>
                </li>
                <li>If you didn't create this account, please ignore this email</li>
              </ul>
            </div>
            
            <p style="font-size: 16px; color: #555; line-height: 1.6; margin-bottom: 20px;">
              After verifying your email, you'll be able to:
            </p>
            
            <ul style="margin: 0 0 25px 0; padding-left: 20px; color: #555;">
              <li>Access your VHR dashboard</li>
              <li>Manage your company's HR processes</li>
              <li>Set up employee records and policies</li>
              <li>Use all available features and tools</li>
            </ul>
            
            <p style="font-size: 16px; color: #555; line-height: 1.6; margin-bottom: 20px;">
              If you have any questions or need assistance, our support team is here to help. You can reach us at <a href="mailto:support@vhr-system.com" style="color: #667eea;">support@vhr-system.com</a>.
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
    console.error('Error sending verification email:', error);
    return false;
  }
}; 

export const sendCustomerEmailVerificationCode = async (
  email: string,
  verificationCode: string
): Promise<boolean> => {
  try {
    const mailOptions = {
      from: process.env.EMAIL_USER,
      to: email,
      subject: 'Verify Customer Email',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; text-align: center;">
            <h1 style="color: #ffffff; margin: 0; font-size: 28px;">📧 Email Verification Code</h1>
            <p style="color: #ffffff; margin: 10px 0 0 0; font-size: 16px;">Welcome to VHR System</p>
          </div>
          <div style="padding: 20px; background-color: #ffffff;">
            <p>Your email verification code is:</p>
            <h2 style="background-color: #f8f9fa; padding: 15px; text-align: center; font-size: 24px; color: #333;">
              ${verificationCode}
            </h2>
            <p>Please use this code to complete your email verification process.</p>
            <p>This code will expire in 5 minutes.</p>
            <p>If you didn't request this code, please ignore this email.</p>
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
    console.error('Error sending customer verification email:', error);
    return false;
  }
};

export const sendCustomerLoginCredentials = async (
  email: string,
  userName: string,
  password: string
): Promise<boolean> => {
  try {
    const mailOptions = {
      from: process.env.EMAIL_USER,
      to: email,
      subject: 'Your VHR System Login Credentials',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; text-align: center;">
            <h1 style="color: #ffffff; margin: 0; font-size: 28px;">🔑 Login Credentials</h1>
            <p style="color: #ffffff; margin: 10px 0 0 0; font-size: 16px;">Welcome to VHR System</p>
          </div>

          <div style="padding: 30px; background-color: #ffffff;">
            <p style="font-size: 18px; color: #333; margin-bottom: 20px;">Hello ${userName},</p>
            
            <p style="font-size: 16px; color: #555; line-height: 1.6; margin-bottom: 20px;">
              Your account has been created successfully. You can use the following credentials to log in:
            </p>

            <div style="background-color: #f8f9fa; padding: 20px; border-radius: 8px; margin-bottom: 20px;">
              <p><strong>Username:</strong> ${userName}</p>
              <p><strong>Email:</strong> ${email}</p>
              <p><strong>Password:</strong> ${password}</p>
            </div>

            <p style="font-size: 16px; color: #555; line-height: 1.6;">
              You can now <a href="https://vhr-system.com/login" style="color: #667eea;">log in to your account</a>.
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
      `,
    };

    await transporter.sendMail(mailOptions);
    return true;
  } catch (error) {
    console.error('Error sending login credentials email:', error);
    return false;
  }
};
// Send invoice reminder email
export const sendInvoiceReminderEmail = async (
  customer: {
    name: string;
    email: string;
  },
  invoice: {
    invoiceNumber: string;
    outstandingBalance: number;
    dueDate: Date;
  },
  currency?: {
    currencySymbol: string;
    currencyCode: string;
    exchangeRate: number;
  }
): Promise<boolean> => {
  try {
    const symbol = currency?.currencySymbol || '£';
    const code = currency?.currencyCode || 'GBP';
    const exchangeRate = currency?.exchangeRate || 1;
    const outstandingBalance = (invoice.outstandingBalance * exchangeRate).toFixed(2)
    const daysOverdue = Math.floor((new Date().getTime() - new Date(invoice.dueDate).getTime()) / (1000 * 3600 * 24));

    const mailOptions = {
      from: process.env.SMTP_FROM || "noreply@yourcompany.com",
      to: customer.email,
      subject: `Payment Reminder: Invoice ${invoice.invoiceNumber} ${daysOverdue > 0 ? 'Overdue' : 'Due Soon'}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">

          <div style="background-color: ${daysOverdue > 0 ? '#dc3545' : '#ffc107'}; padding: 20px; color: #fff;">
            <h2 style="margin: 0;">Payment Reminder</h2>
          </div>

          <div style="padding: 20px; background-color: #ffffff;">
            <p>Dear ${customer.name},</p>

            <p>
              This is a friendly reminder regarding invoice <strong>${invoice.invoiceNumber}</strong>
              ${daysOverdue > 0 ? `which is now <strong>${daysOverdue} days overdue</strong>` : 'which is due soon'}.
            </p>

            <p><strong>Invoice Details:</strong></p>

            <ul>
              <li><strong>Invoice Number:</strong> ${invoice.invoiceNumber}</li>
              <li><strong>Due Date:</strong> ${new Date(invoice.dueDate).toLocaleDateString()}</li>
              <li><strong>Amount Due:</strong> ${symbol}${outstandingBalance} ${code}</li>
            </ul>

            ${daysOverdue > 0
              ? `
                <div style="background-color: #fff3cd; padding: 15px; border-left: 4px solid #ffc107; margin: 20px 0;">
                  <p style="margin: 0; color: #856404;">
                    <strong>Action Required:</strong> This invoice is overdue. Please make payment as soon as possible to avoid any late fees or service interruption.
                  </p>
                </div>
              `
              : `
                <p>Please ensure payment is made by the due date to avoid any late fees.</p>
              `
            }

            <p>
              If you have already made this payment, please disregard this reminder.
              If you have any questions or need to discuss payment arrangements,
              please contact our accounts team.
            </p>

            <p>
              Thank you for your prompt attention to this matter.
            </p>

            <p>
              Best regards,<br />
              Accounts Team
            </p>
          </div>

          <div style="background-color: #f3f4f6; padding: 15px; text-align: center;">
            <p style="font-size: 12px; color: #666; margin: 0;">
              This is an automated reminder. Please do not reply.
            </p>
          </div>

        </div>
      `,
    };

    await transporter.sendMail(mailOptions);
    return true;
  } catch (error) {
    console.error("Error sending invoice reminder email:", error);
    return false;
  }
};

export const sendCustomerInvoiceEmail = async (
  customer: {
    name: string;
    email: string;
  },
  invoice: {
    invoiceNumber: string;
    outstandingBalance: number;
    paymentStatus: "paid" | "pending" | "cancelled" | "failed" | "refunded";
    createdAt: Date;
    dueDate: Date;
  },
  pdfBytes: Uint8Array,
  currency?: {
    currencySymbol: string;
    currencyCode: string;
    exchangeRate: number;
  },
  financialStatementPdfBytes?: Uint8Array
): Promise<boolean> => {
  try {
    const symbol = currency?.currencySymbol;
    const code = currency?.currencyCode;
    const exchangeRate = currency?.exchangeRate || 1;
    const outstandingBalance = (invoice.outstandingBalance * exchangeRate).toFixed(2)

    const attachments = [
      {
        filename: `invoice-${invoice.invoiceNumber}.pdf`,
        content: Buffer.from(pdfBytes),
        contentType: "application/pdf",
      },
    ];

    // Add financial statement PDF if provided
    if (financialStatementPdfBytes) {
      attachments.push({
        filename: `financial-statement-${invoice.invoiceNumber}.pdf`,
        content: Buffer.from(financialStatementPdfBytes),
        contentType: "application/pdf",
      });
    }

    const mailOptions = {
      from: process.env.SMTP_FROM || "noreply@yourcompany.com",
      to: customer.email,
      subject: `Invoice ${invoice.invoiceNumber} - ${
        invoice.paymentStatus === "paid" ? "Paid" : "Payment Due"
      }`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">

          <div style="background-color: #4f46e5; padding: 20px; color: #fff;">
            <h2 style="margin: 0;">Invoice ${invoice.invoiceNumber}</h2>
          </div>

          <div style="padding: 20px; background-color: #ffffff;">
            <p>Dear ${customer.name},</p>

            <p>
              Please find attached your invoice${financialStatementPdfBytes ? ' and financial statement' : ''}.
            </p>

            <p><strong>Invoice Details:</strong></p>

            <ul>
              <li><strong>Invoice Number:</strong> ${invoice.invoiceNumber}</li>
              <li><strong>Date:</strong> ${new Date(invoice.createdAt).toLocaleDateString()}</li>
              <li><strong>Due Date:</strong> ${new Date(invoice.dueDate).toLocaleDateString()}</li>
              <li><strong>Status:</strong> ${invoice.paymentStatus}</li>
            </ul>

            ${
              invoice.paymentStatus !== "paid"
                ? `
                  <p>
                    <strong>
                      Amount Due: ${symbol}${outstandingBalance} ${code}
                    </strong>
                  </p>
                  <p>
                    Please make payment by
                    ${new Date(invoice.dueDate).toLocaleDateString()}.
                  </p>
                `
                : `
                  <p>
                    <strong>This invoice has been paid. Thank you!</strong>
                  </p>
                `
            }

            <p>
              If you have any questions, please contact our support team.
            </p>

            <p>
              Best regards,<br />
              Your Company Name
            </p>
          </div>

          <div style="background-color: #f3f4f6; padding: 15px; text-align: center;">
            <p style="font-size: 12px; color: #666; margin: 0;">
              This is an automated email. Please do not reply.
            </p>
          </div>

        </div>
      `,
      attachments: attachments,
    };

    await transporter.sendMail(mailOptions);
    return true;
  } catch (error) {
    console.error("Error sending invoice email:", error);
    return false;
  }
};
