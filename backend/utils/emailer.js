import transporter from "../config/email.js";

/**
 * Generic send email function for OTP and other emails
 */
export const sendEmail = async ({ to, subject, html, text }) => {
  try {
    const mailOptions = {
      from: `"ManageRTC" <noreply@manage-rtc.com>`,
      to,
      subject,
      html,
      text
    };

    await transporter.sendMail(mailOptions);
    console.log(`✅ Email sent to ${to}`);
    return { success: true };
  } catch (error) {
    console.error(`❌ Failed to send email to ${to}:`, error.message);
    throw error;
  }
};

export const sendCredentialsEmail = async ({
  to,
  companyName,
  password,
  loginLink,
}) => {
  try {
    const mailOptions = {
      from: `"ManageRTC" <noreply@manage-rtc.com>`,
      to,
      subject: `[${companyName}] Your login credentials`,
      html: `
        <div style="font-family: Arial, sans-serif; margin: 0; padding: 0; background: #f4f4f4;">
          <table width="100%" cellpadding="0" cellspacing="0" style="background: #f4f4f4; padding: 20px;">
            <tr>
              <td align="center">
                <table width="600" cellpadding="0" cellspacing="0" style="background: #ffffff; padding: 40px; border-radius: 8px;">
                  <tr>
                    <td align="center">
                      <h2 style="color: #333;">Welcome to Amasqis.ai</h2>
                      <p style="font-size: 16px; color: #666;">Your company has been successfully registered and verified</p>
                      <p style="font-size: 16px; color: #666;">Here are your company admin login details:</p>
                      <table cellpadding="8" cellspacing="0" width="100%" style="margin: 20px 0;">
                        <tr>
                          <td style="text-align: right; font-weight: bold; width: 30%;">Email:</td>
                          <td style="text-align: left;">${to}</td>
                        </tr>
                        <tr>
                          <td style="text-align: right; font-weight: bold;">Password:</td>
                          <td style="text-align: left;">${password}</td>
                        </tr>
                      </table>
                      <a href="${loginLink}" style="display: inline-block; background: #6c4eff; color: #fff; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-size: 16px; margin-top: 20px;">
                        Log In Now
                      </a>
                      <p style="margin-top: 30px; font-size: 14px; color: #888;">
                        If the button doesn’t work, <a href="${loginLink}" style="color: #6c4eff;">click here</a>.
                      </p>
                      <p style="font-size: 12px; color: #ccc;">Please do not reply to this email.</p>
                      <p style="font-size: 10px; color: #ccc;"><a href="https://www.amasqis.ai">Amasqis.ai</a></p>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
          </table>
        </div>`,
    };

    await transporter.sendMail(mailOptions);
    console.log(`✅ Email sent to ${to}`);
  } catch (error) {
    console.error(`❌ Failed to send email to ${to}:`, error.message);
    // Optionally throw or return an error object
    throw new Error("Email sending failed");
  }
};

export const sendEmployeeCredentialsEmail = async ({
  to,
  password,
  userName,
  loginLink,
  firstName,
  lastName,
  companyName = 'ManageRTC',
}) => {
  try {
    const displayName = firstName && lastName ? `${firstName} ${lastName}` : userName || to;

    const mailOptions = {
      from: `"ManageRTC" <noreply@manage-rtc.com>`,
      to,
      subject: `Welcome to ${companyName} - Your Login Credentials`,
      html: `
        <div style="font-family: Arial, sans-serif; margin: 0; padding: 0; background: #f4f4f4;">
          <table width="100%" cellpadding="0" cellspacing="0" style="background: #f4f4f4; padding: 20px;">
            <tr>
              <td align="center">
                <table width="600" cellpadding="0" cellspacing="0" style="background: #ffffff; padding: 40px; border-radius: 8px;">
                  <tr>
                    <td align="center">
                      <h2 style="color: #333;">Welcome to ${companyName}</h2>

                      <p style="font-size: 16px; color: #666;">
                        Hi ${displayName},
                      </p>

                      <p style="font-size: 16px; color: #666;">
                        Your employee account has been created successfully.
                      </p>

                      <p style="font-size: 16px; color: #666;">
                        Here are your login details:
                      </p>

                      <table cellpadding="8" cellspacing="0" width="100%" style="margin: 20px 0; background: #f9f9f9; border-radius: 4px;">
                        <tr>
                          <td style="text-align: right; font-weight: bold; width: 35%; color: #555; padding: 12px;">Email/Username:</td>
                          <td style="text-align: left; padding: 12px;">${to}</td>
                        </tr>
                        <tr>
                          <td style="text-align: right; font-weight: bold; color: #555; padding: 12px;">Password:</td>
                          <td style="text-align: left; padding: 12px; font-family: monospace; font-size: 14px; background: #fff; border-radius: 3px;">${password}</td>
                        </tr>
                      </table>

                      <div style="margin-top: 30px;">
                        <a href="${loginLink}" style="display: inline-block; background: #6c4eff; color: #fff; padding: 14px 28px; text-decoration: none; border-radius: 6px; font-size: 16px; font-weight: 500;">
                          Log In Now
                        </a>
                      </div>

                      <p style="margin-top: 30px; font-size: 14px; color: #888;">
                        If the button doesn't work, <a href="${loginLink}" style="color: #6c4eff;">click here</a> to login.
                      </p>

                      <p style="font-size: 13px; color: #999; margin-top: 20px;">
                        For security reasons, we recommend changing your password after first login.
                      </p>

                      <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;">

                      <p style="font-size: 12px; color: #ccc;">Please do not reply to this email.</p>
                      <p style="font-size: 11px; color: #ccc;">
                        © ${new Date().getFullYear()} ${companyName}. All rights reserved.
                      </p>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
          </table>
        </div>`,
    };

    await transporter.sendMail(mailOptions);
    console.log(`✅ Employee credentials email sent to ${to}`);
  } catch (error) {
    console.error(`❌ Failed to send employee email to ${to}:`, error.message);
    throw new Error("Employee email sending failed");
  }
};

export const sendPasswordChangedEmail = async ({
  to,
  firstName,
  lastName,
  companyName = 'ManageRTC',
}) => {
  try {
    const displayName = firstName && lastName ? `${firstName} ${lastName}` : to;
    const changedAt = new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata', dateStyle: 'medium', timeStyle: 'short' });

    const mailOptions = {
      from: `"ManageRTC" <noreply@manage-rtc.com>`,
      to,
      subject: `[${companyName}] Your password has been changed`,
      html: `
        <div style="font-family: Arial, sans-serif; margin: 0; padding: 0; background: #f4f4f4;">
          <table width="100%" cellpadding="0" cellspacing="0" style="background: #f4f4f4; padding: 20px;">
            <tr>
              <td align="center">
                <table width="600" cellpadding="0" cellspacing="0" style="background: #ffffff; padding: 40px; border-radius: 8px;">
                  <tr>
                    <td align="center">
                      <div style="background: #fff3cd; border: 1px solid #ffc107; border-radius: 8px; padding: 16px; margin-bottom: 24px;">
                        <span style="font-size: 28px;">🔒</span>
                      </div>
                      <h2 style="color: #333; margin-bottom: 8px;">Password Changed</h2>
                      <p style="font-size: 16px; color: #666;">Hi ${displayName},</p>
                      <p style="font-size: 15px; color: #666;">
                        Your password for your <strong>${companyName}</strong> account has been successfully changed.
                      </p>
                      <table cellpadding="8" cellspacing="0" width="100%" style="margin: 20px 0; background: #f9f9f9; border-radius: 4px;">
                        <tr>
                          <td style="text-align: right; font-weight: bold; width: 35%; color: #555; padding: 12px;">Account:</td>
                          <td style="text-align: left; padding: 12px;">${to}</td>
                        </tr>
                        <tr>
                          <td style="text-align: right; font-weight: bold; color: #555; padding: 12px;">Changed at:</td>
                          <td style="text-align: left; padding: 12px;">${changedAt} (IST)</td>
                        </tr>
                      </table>
                      <p style="font-size: 14px; color: #e53e3e; background: #fff5f5; border-radius: 6px; padding: 12px; margin-top: 16px;">
                        <strong>⚠ If you did not make this change</strong>, please contact your HR or system administrator immediately.
                      </p>
                      <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;">
                      <p style="font-size: 12px; color: #ccc;">Please do not reply to this email.</p>
                      <p style="font-size: 11px; color: #ccc;">© ${new Date().getFullYear()} ${companyName}. All rights reserved.</p>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
          </table>
        </div>`,
    };

    await transporter.sendMail(mailOptions);
    console.log(`✅ Password changed notification sent to ${to}`);
  } catch (error) {
    console.error(`❌ Failed to send password changed email to ${to}:`, error.message);
    // Non-fatal — don't throw, just log
  }
};
