import nodemailer from 'nodemailer';
import { Tenant, Payment } from '@shared/schema';

// Configure nodemailer transporter
// In production, you would use real email service credentials
const transporter = nodemailer.createTransport({
  host: process.env.EMAIL_HOST || 'smtp.ethereal.email', // Ethereal for development
  port: parseInt(process.env.EMAIL_PORT || '587'),
  secure: process.env.EMAIL_SECURE === 'true',
  auth: {
    user: process.env.EMAIL_USER || '',
    pass: process.env.EMAIL_PASSWORD || '',
  },
});

// Function to create an Ethereal test account for development if no credentials provided
async function createTestAccount() {
  if (!process.env.EMAIL_USER || !process.env.EMAIL_PASSWORD) {
    try {
      const testAccount = await nodemailer.createTestAccount();
      
      console.log('Created test email account:');
      console.log('- Email: ', testAccount.user);
      console.log('- Password: ', testAccount.pass);
      console.log('- SMTP Host: smtp.ethereal.email');
      console.log('- SMTP Port: 587');
      
      // Update the transporter with test credentials
      transporter.options.auth = {
        user: testAccount.user,
        pass: testAccount.pass
      };
      
      return testAccount;
    } catch (error) {
      console.error('Failed to create test email account:', error);
    }
  }
  return null;
}

// Create test account on module initialization if needed
createTestAccount();

/**
 * Sends a payment reminder email to a tenant
 * 
 * @param tenant The tenant to send the reminder to
 * @param lastPayment The tenant's last payment, if any
 * @param additionalMessage Optional additional message to include
 * @returns Object containing success status and message or error information
 */
export async function sendPaymentReminder(
  tenant: Tenant, 
  lastPayment: Payment | null,
  additionalMessage?: string
): Promise<{ success: boolean; messageId?: string; previewUrl?: string; error?: string }> {
  if (!tenant.email) {
    return { 
      success: false, 
      error: 'Tenant has no email address' 
    };
  }

  try {
    const currentDate = new Date();
    const formattedDate = currentDate.toLocaleDateString('de-DE', { 
      day: '2-digit', 
      month: '2-digit', 
      year: 'numeric'
    });
    
    // Construct the email
    const mailOptions = {
      from: process.env.EMAIL_FROM || '"Property Manager" <no-reply@property-manager.com>',
      to: tenant.email,
      subject: 'Rent Payment Reminder',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <div style="background-color: #f5f5f5; padding: 20px; text-align: center;">
            <h1 style="color: #333; margin: 0;">Rent Payment Reminder</h1>
          </div>
          
          <div style="padding: 20px; border: 1px solid #ddd; background-color: #fff;">
            <p>Dear ${tenant.firstName} ${tenant.lastName},</p>
            
            <p>This is a friendly reminder about your rent payment for the property at <strong>Property #${tenant.propertyId}</strong>.</p>
            
            ${lastPayment ? 
              `<p>Our records show that your last payment of <strong>€${lastPayment.amount}</strong> was received on <strong>${new Date(lastPayment.date).toLocaleDateString('de-DE')}</strong>.</p>` : 
              `<p>Our records show that we haven't received any payments yet.</p>`
            }
            
            <p>According to our records, your rent payment for the current month is due. Please arrange for payment at your earliest convenience.</p>
            
            ${additionalMessage ? `<p>${additionalMessage}</p>` : ''}
            
            <p>If you have already made the payment, please disregard this message. If you're experiencing any issues with your payment, please contact us.</p>
            
            <p>Thank you for your prompt attention to this matter.</p>
            
            <p>Best regards,<br>Your Property Management Team</p>
          </div>
          
          <div style="font-size: 12px; color: #777; text-align: center; margin-top: 20px;">
            <p>This is an automated message sent on ${formattedDate}.</p>
          </div>
        </div>
      `
    };

    // Send the email
    const info = await transporter.sendMail(mailOptions);

    return {
      success: true,
      messageId: info.messageId,
      // Include preview URL for development (Ethereal)
      previewUrl: nodemailer.getTestMessageUrl(info)
    };
  } catch (error) {
    console.error('Error sending payment reminder:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error sending email'
    };
  }
}

/**
 * Generates and sends a monthly late payment report to a landlord
 * 
 * @param userEmail The landlord's email address
 * @param latePayments Array of tenants with late payments
 * @returns Object containing success status and message or error information
 */
export async function sendMonthlyLatePaymentReport(
  userEmail: string,
  latePayments: Array<{ tenant: Tenant; lastPayment: Payment | null }>
): Promise<{ success: boolean; messageId?: string; previewUrl?: string; error?: string }> {
  if (!userEmail) {
    return { 
      success: false, 
      error: 'No recipient email address provided' 
    };
  }

  try {
    const currentDate = new Date();
    const formattedDate = currentDate.toLocaleDateString('de-DE', { 
      day: '2-digit', 
      month: '2-digit', 
      year: 'numeric'
    });
    
    // Create a table of late payments
    let latePaymentsTable = '';
    
    if (latePayments.length > 0) {
      latePaymentsTable = `
        <table style="width: 100%; border-collapse: collapse; margin-top: 20px; margin-bottom: 20px;">
          <thead>
            <tr style="background-color: #f2f2f2;">
              <th style="padding: 10px; border: 1px solid #ddd; text-align: left;">Tenant Name</th>
              <th style="padding: 10px; border: 1px solid #ddd; text-align: left;">Property</th>
              <th style="padding: 10px; border: 1px solid #ddd; text-align: left;">Email</th>
              <th style="padding: 10px; border: 1px solid #ddd; text-align: left;">Last Payment Date</th>
              <th style="padding: 10px; border: 1px solid #ddd; text-align: left;">Last Payment Amount</th>
            </tr>
          </thead>
          <tbody>
            ${latePayments.map(({ tenant, lastPayment }) => `
              <tr>
                <td style="padding: 10px; border: 1px solid #ddd;">${tenant.firstName} ${tenant.lastName}</td>
                <td style="padding: 10px; border: 1px solid #ddd;">Property #${tenant.propertyId}</td>
                <td style="padding: 10px; border: 1px solid #ddd;">${tenant.email || 'N/A'}</td>
                <td style="padding: 10px; border: 1px solid #ddd;">${lastPayment ? new Date(lastPayment.date).toLocaleDateString('de-DE') : 'No payments'}</td>
                <td style="padding: 10px; border: 1px solid #ddd;">${lastPayment ? `€${lastPayment.amount}` : 'N/A'}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      `;
    } else {
      latePaymentsTable = '<p style="margin: 20px 0; font-style: italic;">No late payments to report. All tenants are current with their payments.</p>';
    }
    
    // Construct the email
    const mailOptions = {
      from: process.env.EMAIL_FROM || '"Property Manager" <no-reply@property-manager.com>',
      to: userEmail,
      subject: 'Monthly Late Payment Report - ' + currentDate.toLocaleString('default', { month: 'long', year: 'numeric' }),
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 800px; margin: 0 auto;">
          <div style="background-color: #f5f5f5; padding: 20px; text-align: center;">
            <h1 style="color: #333; margin: 0;">Monthly Late Payment Report</h1>
            <p style="margin: 10px 0 0;">${currentDate.toLocaleString('default', { month: 'long', year: 'numeric' })}</p>
          </div>
          
          <div style="padding: 20px; border: 1px solid #ddd; background-color: #fff;">
            <p>Here is your monthly report of tenants with late or missing rent payments:</p>
            
            ${latePaymentsTable}
            
            <p>Total late payments: <strong>${latePayments.length}</strong></p>
            
            <p>You can log in to your dashboard to send payment reminders or take further action.</p>
          </div>
          
          <div style="font-size: 12px; color: #777; text-align: center; margin-top: 20px;">
            <p>This report was generated on ${formattedDate}.</p>
          </div>
        </div>
      `
    };

    // Send the email
    const info = await transporter.sendMail(mailOptions);

    return {
      success: true,
      messageId: info.messageId,
      // Include preview URL for development (Ethereal)
      previewUrl: nodemailer.getTestMessageUrl(info)
    };
  } catch (error) {
    console.error('Error sending monthly late payment report:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error sending email'
    };
  }
}