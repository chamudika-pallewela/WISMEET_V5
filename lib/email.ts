import nodemailer from 'nodemailer';
import { format } from 'date-fns';

// Email configuration
const emailConfig = {
  host: process.env.EMAIL_HOST || 'smtp.gmail.com',
  port: parseInt(process.env.EMAIL_PORT || '587'),
  secure: false, // true for 465, false for other ports
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
};

// Create transporter
const createTransporter = () => {
  return nodemailer.createTransport(emailConfig);
};

// Google Meet-style Email Templates
const createInvitationEmail = (meetingData: {
  title: string;
  hostName: string;
  startTime: Date;
  endTime: Date;
  description?: string;
  meetingLink: string;
  guestEmail: string;
}) => {
  const formattedDate = format(meetingData.startTime, 'EEEE, MMMM d, yyyy');
  const formattedStartTime = format(meetingData.startTime, 'h:mm a');
  const formattedEndTime = format(meetingData.endTime, 'h:mm a');
  const duration = Math.round((meetingData.endTime.getTime() - meetingData.startTime.getTime()) / (1000 * 60));

  return {
    from: `"WISMeet" <${process.env.EMAIL_FROM || process.env.EMAIL_USER}>`,
    to: meetingData.guestEmail,
    subject: `Meeting invitation: ${meetingData.title}`,
    html: `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Meeting Invitation</title>
        <style>
          body { 
            font-family: 'Google Sans', 'Roboto', Arial, sans-serif; 
            line-height: 1.6; 
            color: #202124; 
            margin: 0; 
            padding: 0; 
            background-color: #f8f9fa;
          }
          .container { 
            max-width: 600px; 
            margin: 0 auto; 
            background-color: white;
            box-shadow: 0 1px 3px rgba(0,0,0,0.12);
          }
          .header { 
            background-color: #1a73e8; 
            color: white; 
            padding: 32px 24px; 
            text-align: center;
          }

          .header h1 { 
            margin: 0 0 8px 0; 
            font-size: 24px; 
            font-weight: 400;
          }
          .header p { 
            margin: 0; 
            font-size: 14px; 
            opacity: 0.9;
          }
          .content { 
            padding: 32px 24px; 
          }
          .meeting-title { 
            font-size: 20px; 
            font-weight: 500; 
            color: #202124; 
            margin: 0 0 24px 0;
          }
          .meeting-details { 
            background-color: #f8f9fa; 
            padding: 20px; 
            border-radius: 8px; 
            margin: 24px 0; 
            border: 1px solid #e8eaed;
          }
          .detail-row { 
            display: flex; 
            align-items: center; 
            margin-bottom: 12px;
          }
          .detail-row:last-child { 
            margin-bottom: 0; 
          }
          .detail-icon { 
            width: 20px; 
            height: 20px; 
            margin-right: 12px; 
            color: #5f6368;
          }
          .detail-text { 
            font-size: 14px; 
            color: #202124;
          }
          .join-button { 
            display: inline-block; 
            background-color: #1a73e8; 
            color: white !important; 
            padding: 12px 24px; 
            text-decoration: none; 
            border-radius: 4px; 
            font-weight: 500; 
            font-size: 14px; 
            margin: 24px 0;
            text-align: center;
            min-width: 120px;
          }
          .join-button:hover { 
            background-color: #1557b0; 
            color: white !important; 
          }
          .link-text { 
            margin-top: 16px; 
            color: #5f6368; 
            font-size: 12px;
            word-break: break-all;
          }
          .link-text a { 
            color: #1a73e8; 
            text-decoration: none;
          }
          .footer { 
            text-align: center; 
            margin-top: 32px; 
            color: #5f6368; 
            font-size: 12px; 
            padding: 24px;
            border-top: 1px solid #e8eaed;
          }
          .footer p { 
            margin: 4px 0; 
          }
          .description { 
            margin: 16px 0; 
            color: #5f6368; 
            font-size: 14px;
          }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>Meeting invitation</h1>
            <p>${meetingData.hostName} invited you to a meeting</p>
          </div>
          
          <div class="content">
            <h2 class="meeting-title">${meetingData.title}</h2>
            
            <div class="meeting-details">
              <div class="detail-row">
                <div class="detail-icon">📅</div>
                <div class="detail-text">${formattedDate}</div>
              </div>
              <div class="detail-row">
                <div class="detail-icon">🕐</div>
                <div class="detail-text">${formattedStartTime} - ${formattedEndTime} (${duration} minutes)</div>
              </div>
              <div class="detail-row">
                <div class="detail-icon">👤</div>
                <div class="detail-text">${meetingData.hostName}</div>
              </div>
            </div>
            
            ${meetingData.description ? `
            <div class="description">
              <strong>Description:</strong><br>
              ${meetingData.description}
            </div>
            ` : ''}
            
            <div style="text-align: center;">
              <a href="${meetingData.meetingLink}" class="join-button">
                Join meeting
              </a>
            </div>
            
            <div class="link-text">
              Or copy and paste this link into your browser:<br>
              <a href="${meetingData.meetingLink}">${meetingData.meetingLink}</a>
            </div>
          </div>
          
          <div class="footer">
            <p>This invitation was sent from WISMeet</p>
            <p>If you have any questions, please contact the meeting host</p>
          </div>
        </div>
      </body>
      </html>
    `,
    text: `
Meeting invitation: ${meetingData.title}

${meetingData.hostName} invited you to a meeting.

Meeting Details:
- Title: ${meetingData.title}
- Date: ${formattedDate}
- Time: ${formattedStartTime} - ${formattedEndTime} (${duration} minutes)
- Host: ${meetingData.hostName}
${meetingData.description ? `- Description: ${meetingData.description}` : ''}

Join the meeting by clicking this link: ${meetingData.meetingLink}

If you have any questions, please contact the meeting host.

Best regards,
WISMeet
    `
  };
};

// Enhanced mortgage meeting summary email template
const createMortgageSummaryEmail = (summaryData: {
  clientName: string;
  advisorName: string;
  meetingDate: Date;
  summary: string;
  keyPoints: string[];
  actionItems: string[];
  nextSteps: string[];
  meetingType: string;
  clientEmail: string;
  advisorEmail: string;
  mortgageData?: any; // Enhanced mortgage-specific data
  conversationQuality?: any; // Conversation completeness data
}) => {
  const formattedDate = format(summaryData.meetingDate, 'EEEE, MMMM d, yyyy');
  const formattedTime = format(summaryData.meetingDate, 'h:mm a');

  // Extract mortgage data for display
  const propertyDetails = summaryData.mortgageData?.propertyDetails || {};
  const personalBackground = summaryData.mortgageData?.personalBackground || {};
  const employmentDetails = summaryData.mortgageData?.employmentDetails || {};
  const financialInformation = summaryData.mortgageData?.financialInformation || {};
  const conversationQuality = summaryData.conversationQuality || {};

  return {
    from: `"WISMeet Mortgage Assistant" <${process.env.EMAIL_FROM || process.env.EMAIL_USER}>`,
    to: [summaryData.clientEmail, summaryData.advisorEmail],
    subject: `Mortgage Meeting Summary - ${summaryData.meetingType} - ${formattedDate}`,
    html: `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Mortgage Meeting Summary</title>
        <style>
          body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 700px; margin: 0 auto; padding: 20px; }
          .header { background: linear-gradient(135deg, #2c3e50 0%, #3498db 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
          .content { background: #f8f9fa; padding: 30px; border-radius: 0 0 10px 10px; }
          .summary-section { background: white; padding: 25px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #3498db; }
          .key-points { background: #e8f4fd; padding: 20px; border-radius: 8px; margin: 15px 0; }
          .action-items { background: #fff3cd; padding: 20px; border-radius: 8px; margin: 15px 0; }
          .next-steps { background: #d1ecf1; padding: 20px; border-radius: 8px; margin: 15px 0; }
          .footer { text-align: center; margin-top: 30px; color: #666; font-size: 14px; }
          .highlight { background: #fff3cd; padding: 10px; border-radius: 5px; margin: 10px 0; }
          .urgent { background: #f8d7da; border-left: 4px solid #dc3545; }
          .important { background: #d4edda; border-left: 4px solid #28a745; }
          .data-section { background: #f8f9fa; padding: 15px; border-radius: 8px; margin: 10px 0; border-left: 4px solid #6c757d; }
          .data-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 15px; margin: 10px 0; }
          .data-item { background: white; padding: 10px; border-radius: 5px; border-left: 3px solid #3498db; }
          .quality-indicator { display: inline-block; padding: 5px 10px; border-radius: 15px; font-size: 12px; font-weight: bold; }
          .quality-excellent { background: #d4edda; color: #155724; }
          .quality-good { background: #fff3cd; color: #856404; }
          .quality-poor { background: #f8d7da; color: #721c24; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>📋 Mortgage Meeting Summary</h1>
            <p>${summaryData.meetingType} - ${formattedDate} at ${formattedTime}</p>
            ${conversationQuality.completeness ? `
              <div style="margin-top: 15px;">
                <span class="quality-indicator ${conversationQuality.completeness >= 80 ? 'quality-excellent' : conversationQuality.completeness >= 60 ? 'quality-good' : 'quality-poor'}">
                  Conversation Completeness: ${conversationQuality.completeness}%
                </span>
              </div>
            ` : ''}
          </div>
          
          <div class="content">
            <div class="summary-section">
              <h2>📝 Meeting Summary</h2>
              <p>${summaryData.summary}</p>
            </div>
            
            ${Object.keys(propertyDetails).length > 0 ? `
              <div class="data-section">
                <h3>🏠 Property Details</h3>
                <div class="data-grid">
                  ${propertyDetails.type && propertyDetails.type !== 'unknown' ? `<div class="data-item"><strong>Type:</strong> ${propertyDetails.type}</div>` : ''}
                  ${propertyDetails.priceRange ? `<div class="data-item"><strong>Price Range:</strong> £${propertyDetails.priceRange}</div>` : ''}
                  ${propertyDetails.depositAmount ? `<div class="data-item"><strong>Deposit:</strong> £${propertyDetails.depositAmount}</div>` : ''}
                  ${propertyDetails.firstTimeBuyer !== undefined ? `<div class="data-item"><strong>First Time Buyer:</strong> ${propertyDetails.firstTimeBuyer ? 'Yes' : 'No'}</div>` : ''}
                  ${propertyDetails.currentLender ? `<div class="data-item"><strong>Current Lender:</strong> ${propertyDetails.currentLender}</div>` : ''}
                  ${propertyDetails.outstandingBalance ? `<div class="data-item"><strong>Outstanding Balance:</strong> £${propertyDetails.outstandingBalance}</div>` : ''}
                </div>
              </div>
            ` : ''}
            
            ${Object.keys(personalBackground).length > 0 ? `
              <div class="data-section">
                <h3>👤 Personal Background</h3>
                <div class="data-grid">
                  ${personalBackground.maritalStatus ? `<div class="data-item"><strong>Marital Status:</strong> ${personalBackground.maritalStatus}</div>` : ''}
                  ${personalBackground.jointApplication !== undefined ? `<div class="data-item"><strong>Joint Application:</strong> ${personalBackground.jointApplication ? 'Yes' : 'No'}</div>` : ''}
                  ${personalBackground.ages ? `<div class="data-item"><strong>Age:</strong> ${personalBackground.ages.applicant}${personalBackground.ages.partner ? ` (Partner: ${personalBackground.ages.partner})` : ''}</div>` : ''}
                  ${personalBackground.children !== undefined ? `<div class="data-item"><strong>Children:</strong> ${personalBackground.children}</div>` : ''}
                  ${personalBackground.nationality ? `<div class="data-item"><strong>Nationality:</strong> ${personalBackground.nationality}</div>` : ''}
                  ${personalBackground.visaStatus ? `<div class="data-item"><strong>Visa Status:</strong> ${personalBackground.visaStatus}</div>` : ''}
                </div>
              </div>
            ` : ''}
            
            ${Object.keys(employmentDetails).length > 0 ? `
              <div class="data-section">
                <h3>💼 Employment Details</h3>
                <div class="data-grid">
                  ${employmentDetails.type && employmentDetails.type !== 'unknown' ? `<div class="data-item"><strong>Type:</strong> ${employmentDetails.type}</div>` : ''}
                  ${employmentDetails.annualIncome ? `<div class="data-item"><strong>Annual Income:</strong> £${employmentDetails.annualIncome}</div>` : ''}
                  ${employmentDetails.bonuses ? `<div class="data-item"><strong>Bonuses:</strong> £${employmentDetails.bonuses}</div>` : ''}
                  ${employmentDetails.companyStructure ? `<div class="data-item"><strong>Company Structure:</strong> ${employmentDetails.companyStructure}</div>` : ''}
                  ${employmentDetails.dayRate ? `<div class="data-item"><strong>Day Rate:</strong> £${employmentDetails.dayRate}</div>` : ''}
                  ${employmentDetails.ir35Status ? `<div class="data-item"><strong>IR35 Status:</strong> ${employmentDetails.ir35Status}</div>` : ''}
                </div>
              </div>
            ` : ''}
            
            ${Object.keys(financialInformation).length > 0 ? `
              <div class="data-section">
                <h3>💰 Financial Information</h3>
                <div class="data-grid">
                  ${financialInformation.creditCardBalances ? `<div class="data-item"><strong>Credit Card Balances:</strong> £${financialInformation.creditCardBalances}</div>` : ''}
                  ${financialInformation.loanPayments ? `<div class="data-item"><strong>Loan Payments:</strong> £${financialInformation.loanPayments}</div>` : ''}
                  ${financialInformation.creditIssues && financialInformation.creditIssues.length > 0 ? `<div class="data-item"><strong>Credit Issues:</strong> ${financialInformation.creditIssues.join(', ')}</div>` : ''}
                  ${financialInformation.issuesResolved !== undefined ? `<div class="data-item"><strong>Issues Resolved:</strong> ${financialInformation.issuesResolved ? 'Yes' : 'No'}</div>` : ''}
                </div>
              </div>
            ` : ''}
            
            <div class="key-points">
              <h3>🔑 Key Points Discussed</h3>
              <ul>
                ${summaryData.keyPoints.map(point => `<li>${point}</li>`).join('')}
              </ul>
            </div>
            
            <div class="action-items">
              <h3>✅ Action Items</h3>
              <ul>
                ${summaryData.actionItems.map(item => `<li>${item}</li>`).join('')}
              </ul>
            </div>
            
            <div class="next-steps">
              <h3>🚀 Next Steps</h3>
              <ul>
                ${summaryData.nextSteps.map(step => `<li>${step}</li>`).join('')}
              </ul>
            </div>
            
            ${conversationQuality.missingSections && conversationQuality.missingSections.length > 0 ? `
              <div class="urgent">
                <h3>⚠️ Missing Information</h3>
                <p>The following sections need to be completed in the next call:</p>
                <ul>
                  ${conversationQuality.missingSections.map((section: string) => `<li>${section}</li>`).join('')}
                </ul>
              </div>
            ` : ''}
            
            ${conversationQuality.recommendations && conversationQuality.recommendations.length > 0 ? `
              <div class="important">
                <h3>💡 Recommendations</h3>
                <ul>
                  ${conversationQuality.recommendations.map((rec: string) => `<li>${rec}</li>`).join('')}
                </ul>
              </div>
            ` : ''}
            
            <div class="highlight">
              <h3>👥 Meeting Participants</h3>
              <p><strong>Client:</strong> ${summaryData.clientName}</p>
              <p><strong>Advisor:</strong> ${summaryData.advisorName}</p>
              ${conversationQuality.callbackTime ? `<p><strong>Callback Time:</strong> ${conversationQuality.callbackTime}</p>` : ''}
            </div>
          </div>
          
          <div class="footer">
            <p>This summary was automatically generated by WISMeet Mortgage Assistant</p>
            <p>For questions or corrections, please contact your mortgage advisor</p>
            <p style="margin-top: 20px; font-size: 12px; color: #999;">
              This email contains confidential mortgage information. Please handle with appropriate care.
            </p>
          </div>
        </div>
      </body>
      </html>
    `,
    text: `
Mortgage Meeting Summary - ${summaryData.meetingType}

Date: ${formattedDate} at ${formattedTime}
Client: ${summaryData.clientName}
Advisor: ${summaryData.advisorName}
${conversationQuality.completeness ? `Conversation Completeness: ${conversationQuality.completeness}%` : ''}

MEETING SUMMARY:
${summaryData.summary}

${Object.keys(propertyDetails).length > 0 ? `
PROPERTY DETAILS:
${propertyDetails.type && propertyDetails.type !== 'unknown' ? `Type: ${propertyDetails.type}` : ''}
${propertyDetails.priceRange ? `Price Range: £${propertyDetails.priceRange}` : ''}
${propertyDetails.depositAmount ? `Deposit: £${propertyDetails.depositAmount}` : ''}
${propertyDetails.firstTimeBuyer !== undefined ? `First Time Buyer: ${propertyDetails.firstTimeBuyer ? 'Yes' : 'No'}` : ''}
${propertyDetails.currentLender ? `Current Lender: ${propertyDetails.currentLender}` : ''}
` : ''}

${Object.keys(personalBackground).length > 0 ? `
PERSONAL BACKGROUND:
${personalBackground.maritalStatus ? `Marital Status: ${personalBackground.maritalStatus}` : ''}
${personalBackground.jointApplication !== undefined ? `Joint Application: ${personalBackground.jointApplication ? 'Yes' : 'No'}` : ''}
${personalBackground.ages ? `Age: ${personalBackground.ages.applicant}${personalBackground.ages.partner ? ` (Partner: ${personalBackground.ages.partner})` : ''}` : ''}
${personalBackground.nationality ? `Nationality: ${personalBackground.nationality}` : ''}
` : ''}

${Object.keys(employmentDetails).length > 0 ? `
EMPLOYMENT DETAILS:
${employmentDetails.type && employmentDetails.type !== 'unknown' ? `Type: ${employmentDetails.type}` : ''}
${employmentDetails.annualIncome ? `Annual Income: £${employmentDetails.annualIncome}` : ''}
${employmentDetails.dayRate ? `Day Rate: £${employmentDetails.dayRate}` : ''}
` : ''}

KEY POINTS DISCUSSED:
${summaryData.keyPoints.map(point => `• ${point}`).join('\n')}

ACTION ITEMS:
${summaryData.actionItems.map(item => `• ${item}`).join('\n')}

NEXT STEPS:
${summaryData.nextSteps.map(step => `• ${step}`).join('\n')}

${conversationQuality.missingSections && conversationQuality.missingSections.length > 0 ? `
MISSING INFORMATION:
${conversationQuality.missingSections.map((section: string) => `• ${section}`).join('\n')}
` : ''}

${conversationQuality.callbackTime ? `Callback Time: ${conversationQuality.callbackTime}` : ''}

This summary was automatically generated by WISMeet Mortgage Assistant.
For questions or corrections, please contact your mortgage advisor.

Best regards,
WISMeet Team
    `
  };
};

// Send invitation email
export const sendInvitationEmail = async (meetingData: {
  title: string;
  hostName: string;
  startTime: Date;
  endTime: Date;
  description?: string;
  meetingLink: string;
  guestEmail: string;
}) => {
  try {
    const transporter = createTransporter();
    const emailContent = createInvitationEmail(meetingData);
    
    const result = await transporter.sendMail(emailContent);
    
    return {
      success: true,
      messageId: result.messageId,
      guestEmail: meetingData.guestEmail
    };
  } catch (error) {
    console.error('Error sending invitation email:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      guestEmail: meetingData.guestEmail
    };
  }
};

// Send mortgage meeting summary email
export const sendMortgageSummaryEmail = async (summaryData: {
  clientName: string;
  advisorName: string;
  meetingDate: Date;
  summary: string;
  keyPoints: string[];
  actionItems: string[];
  nextSteps: string[];
  meetingType: string;
  clientEmail: string;
  advisorEmail: string;
  mortgageData?: any; // Enhanced mortgage-specific data
  conversationQuality?: any; // Conversation completeness data
}) => {
  try {
    console.log('📧 Attempting to send mortgage summary email...');
    console.log('📧 Email configuration:', {
      host: process.env.EMAIL_HOST || 'smtp.gmail.com',
      port: process.env.EMAIL_PORT || '587',
      user: process.env.EMAIL_USER ? '***configured***' : '❌ NOT CONFIGURED',
      pass: process.env.EMAIL_PASS ? '***configured***' : '❌ NOT CONFIGURED',
      from: process.env.EMAIL_FROM || process.env.EMAIL_USER || '❌ NOT CONFIGURED'
    });
    console.log('📧 Recipients:', [summaryData.clientEmail, summaryData.advisorEmail]);
    console.log('📧 Enhanced data:', {
      hasMortgageData: !!summaryData.mortgageData,
      conversationQuality: summaryData.conversationQuality?.completeness || 'N/A'
    });
    
    const transporter = createTransporter();
    const emailContent = createMortgageSummaryEmail(summaryData);
    
    console.log('📧 Sending email...');
    const result = await transporter.sendMail(emailContent);
    console.log('✅ Email sent successfully:', result.messageId);
    
    return {
      success: true,
      messageId: result.messageId,
      recipients: [summaryData.clientEmail, summaryData.advisorEmail]
    };
  } catch (error) {
    console.error('❌ Error sending mortgage summary email:', error);
    console.error('❌ Error details:', {
      message: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined
    });
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      recipients: [summaryData.clientEmail, summaryData.advisorEmail]
    };
  }
};

// Send multiple invitation emails
export const sendBulkInvitationEmails = async (meetingData: {
  title: string;
  hostName: string;
  startTime: Date;
  endTime: Date;
  description?: string;
  meetingLink: string;
  guestEmails: string[];
}) => {
  const results = [];
  
  for (const guestEmail of meetingData.guestEmails) {
    const result = await sendInvitationEmail({
      ...meetingData,
      guestEmail
    });
    results.push(result);
  }
  
  return results;
};

// Send summary email to multiple recipients
export const sendSummaryEmail = async (
  toEmails: string[],
  subject: string,
  htmlContent: string
) => {
  try {
    const transporter = createTransporter();
    
    const result = await transporter.sendMail({
      from: `"WISMeet" <${process.env.EMAIL_FROM || process.env.EMAIL_USER}>`,
      to: toEmails.join(', '),
      subject,
      html: htmlContent
    });
    
    return {
      success: true,
      messageId: result.messageId,
      recipients: toEmails
    };
  } catch (error) {
    console.error('Error sending summary email:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      recipients: toEmails
    };
  }
};

// Verify email configuration
export const verifyEmailConfig = async () => {
  try {
    console.log('🔍 Verifying email configuration...');
    console.log('🔍 Environment variables:', {
      EMAIL_HOST: process.env.EMAIL_HOST || 'smtp.gmail.com (default)',
      EMAIL_PORT: process.env.EMAIL_PORT || '587 (default)',
      EMAIL_USER: process.env.EMAIL_USER ? '***configured***' : '❌ NOT CONFIGURED',
      EMAIL_PASS: process.env.EMAIL_PASS ? '***configured***' : '❌ NOT CONFIGURED',
      EMAIL_FROM: process.env.EMAIL_FROM || process.env.EMAIL_USER || '❌ NOT CONFIGURED'
    });
    
    const transporter = createTransporter();
    await transporter.verify();
    console.log('✅ Email configuration verified successfully');
    return { success: true };
  } catch (error) {
    console.error('❌ Email configuration error:', error);
    console.error('❌ Error details:', {
      message: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined
    });
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    };
  }
};

// Test function for mortgage summary email
export const testMortgageSummaryEmail = async () => {
  const testSummaryData = {
    clientName: 'John Smith',
    advisorName: 'Sarah Johnson',
    meetingDate: new Date(),
    summary: 'Discussed mortgage options for a $350,000 home purchase with 20% down payment. Client has good credit score of 720 and qualifies for 6.5% APR on a 30-year fixed-rate mortgage.',
    keyPoints: [
      'Home purchase price: $350,000',
      'Down payment: $70,000 (20%)',
      'Credit score: 720',
      'Loan type: 30-year fixed-rate',
      'Interest rate: 6.5% APR',
      'Monthly payment: $1,770 (P&I)'
    ],
    actionItems: [
      'Provide W-2s from past 2 years',
      'Submit recent pay stubs',
      'Provide bank statements (last 3 months)',
      'Complete loan application',
      'Schedule credit check'
    ],
    nextSteps: [
      'Submit all required documentation within 7 days',
      'Complete loan application by end of week',
      'Follow up on credit check results',
      'Schedule closing within 30-45 days'
    ],
    meetingType: 'Mortgage Consultation',
    clientEmail: 'john.smith@example.com',
    advisorEmail: 'sarah.johnson@mortgagecompany.com'
  };

  return await sendMortgageSummaryEmail(testSummaryData);
}; 