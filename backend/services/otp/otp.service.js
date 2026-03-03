/**
 * OTP Service
 * Handles generation, storage, and verification of OTP codes
 */

import crypto from 'crypto';
import { client, getTenantCollections } from '../../config/db.js';
import { devLog, devError } from '../../utils/logger.js';

const OTP_COLLECTION = 'otps';
const OTP_EXPIRY_MINUTES = 10;
const OTP_LENGTH = 6;

/**
 * Generate a random OTP code
 */
function generateOTP() {
  const digits = '0123456789';
  let otp = '';
  for (let i = 0; i < OTP_LENGTH; i++) {
    otp += digits[Math.floor(Math.random() * 10)];
  }
  return otp;
}

/**
 * Store OTP in database
 */
async function storeOTP(companyId, email, otp, type = 'email_change') {
  const db = client.db(companyId);
  const collection = db.collection(OTP_COLLECTION);

  // Delete any existing OTPs for this email and type
  await collection.deleteMany({ email, type });

  // Store new OTP with expiry
  const expiresAt = new Date(Date.now() + OTP_EXPIRY_MINUTES * 60 * 1000);

  await collection.insertOne({
    email,
    otp,
    type,
    expiresAt,
    createdAt: new Date(),
    used: false
  });

  devLog(`[OTP Service] OTP stored for ${email}, type: ${type}, expires: ${expiresAt}`);
}

/**
 * Verify OTP
 */
async function verifyOTP(companyId, email, otp, type = 'email_change') {
  const db = client.db(companyId);
  const collection = db.collection(OTP_COLLECTION);

  const record = await collection.findOne({
    email,
    otp,
    type,
    used: false,
    expiresAt: { $gt: new Date() }
  });

  if (!record) {
    devError(`[OTP Service] Invalid or expired OTP for ${email}, type: ${type}`);
    return { valid: false, message: 'Invalid or expired OTP' };
  }

  // Mark OTP as used
  await collection.updateOne(
    { _id: record._id },
    { $set: { used: true, usedAt: new Date() } }
  );

  devLog(`[OTP Service] OTP verified for ${email}, type: ${type}`);
  return { valid: true, message: 'OTP verified successfully' };
}

/**
 * Clean up expired OTPs
 */
async function cleanupExpiredOTPs(companyId) {
  const db = client.db(companyId);
  const collection = db.collection(OTP_COLLECTION);

  const result = await collection.deleteMany({
    expiresAt: { $lt: new Date() }
  });

  devLog(`[OTP Service] Cleaned up ${result.deletedCount} expired OTPs`);
}

/**
 * Send OTP to email
 */
async function sendOTPEmail(email, otp, type = 'email_change') {
  const { sendEmail } = await import('../../utils/emailer.js');

  const subject = type === 'email_change'
    ? 'Verify Your Email Address - Email Change Request'
    : 'Verify Your Email Address';

  const html = `
    <div style="font-family: Arial, sans-serif; margin: 0; padding: 0; background: #f4f4f4;">
      <table width="100%" cellpadding="0" cellspacing="0" style="background: #f4f4f4; padding: 20px;">
        <tr>
          <td align="center">
            <table width="600" cellpadding="0" cellspacing="0" style="background: #ffffff; padding: 40px; border-radius: 8px;">
              <tr>
                <td align="center">
                  <h2 style="color: #333;">Email Verification</h2>
                  <p style="font-size: 16px; color: #666;">Your verification code is:</p>
                  <div style="background: #f0f0f0; padding: 20px; margin: 20px 0; border-radius: 8px;">
                    <span style="font-size: 32px; font-weight: bold; color: #6c4eff; letter-spacing: 5px;">${otp}</span>
                  </div>
                  <p style="font-size: 14px; color: #666;">This code will expire in ${OTP_EXPIRY_MINUTES} minutes.</p>
                  <p style="font-size: 14px; color: #666;">If you didn't request this change, please ignore this email.</p>
                  <p style="font-size: 12px; color: #ccc;">Please do not reply to this email.</p>
                </td>
              </tr>
            </table>
          </td>
        </tr>
      </table>
    </div>
  `;

  try {
    await sendEmail({
      to: email,
      subject,
      html
    });
    devLog(`[OTP Service] OTP email sent to ${email}`);
    return { success: true };
  } catch (error) {
    devError(`[OTP Service] Failed to send OTP email:`, error);
    return { success: false, error: error.message };
  }
}

/**
 * Complete OTP flow: generate, store, and send
 */
async function sendOTP(companyId, email, type = 'email_change') {
  // Generate OTP
  const otp = generateOTP();

  // Store in database
  await storeOTP(companyId, email, otp, type);

  // Send email
  const result = await sendOTPEmail(email, otp, type);

  return {
    success: result.success,
    message: result.success
      ? `OTP sent to ${email}. Valid for ${OTP_EXPIRY_MINUTES} minutes.`
      : 'Failed to send OTP. Please try again.',
    error: result.error
  };
}

export default {
  generateOTP,
  storeOTP,
  verifyOTP,
  cleanupExpiredOTPs,
  sendOTP
};
