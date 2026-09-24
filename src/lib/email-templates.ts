export type EmailTemplateType = 'acknowledged' | 'resolved';

export interface EmailContent {
  subject: string;
  body: string;
}

export function getEmailTemplate(type: EmailTemplateType, ticketId: string): EmailContent {
  const displayTicketId = ticketId || 'N/A';

  if (type === 'resolved') {
    return {
      subject: `Fault Resolved - Ticket ID: ${displayTicketId}`,
      body: `Dear Sir/Ma,
      
We are pleased to inform you that the issue reported under Ticket ID: ${displayTicketId} has been resolved.
If you continue to experience any problems or have further questions, please let us know.
Thank you for your patience and cooperation.

Kind regards, Favour
ODI MinXray Support`,
    };
  }

  // Default: Acknowledged / In Progress
  return {
    subject: `Complaint Logged - Ticket ID: ${displayTicketId}`,
    body: `Dear sir/ma, 

Your complaint has been logged under Ticket ID: ${displayTicketId} The issue has been diagnosed, and our technical team is currently working on it.
We’ll keep you updated on the progress.
Thank you for your patience.


Kind regards, Favour
ODI MinXray Support`,
  };
}
