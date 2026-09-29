'use client';

import * as React from 'react';
import { useState, useMemo, useEffect } from 'react';
import type { FaultReport, SystemReport } from '@/lib/types';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
  DialogClose,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { useFaultReportMutations } from '@/lib/data';
import { useRTDBList } from '@/firebase';
import { normalizeSystemNumber } from '@/lib/utils';
import { getEmailTemplate, DEFAULT_SENDER_EMAIL, DEFAULT_SENDER_NAME, type EmailTemplateType } from '@/lib/email-templates';
import { 
  Mail, 
  Copy, 
  Check, 
  ExternalLink, 
  Send, 
  Loader2, 
  Ticket,
  CheckCircle2,
  AlertCircle,
  ShieldCheck,
} from 'lucide-react';
import { format } from 'date-fns';

interface SendEmailDialogProps {
  report: FaultReport;
  children: React.ReactNode;
}

export function SendEmailDialog({ report, children }: SendEmailDialogProps) {
  const { toast } = useToast();
  const { updateFaultReport } = useFaultReportMutations();
  const { data: systems } = useRTDBList<SystemReport>('systemReports');

  const [isOpen, setIsOpen] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [copiedTicket, setCopiedTicket] = useState(false);
  const [copiedBody, setCopiedBody] = useState(false);

  // Determine initial template based on report status
  const defaultTemplateType: EmailTemplateType = report.status === 'Resolved' ? 'resolved' : 'acknowledged';
  const [templateType, setTemplateType] = useState<EmailTemplateType>(defaultTemplateType);

  const ticketId = report.ticketId || report.id || 'N/A';

  // Find recipient email from report or matched system report
  const matchedSystem = useMemo(() => {
    if (!systems || !report.systemNumber) return null;
    const norm = normalizeSystemNumber(report.systemNumber);
    return systems.find(s => normalizeSystemNumber(s.productSystemId) === norm);
  }, [systems, report.systemNumber]);

  const [recipientEmail, setRecipientEmail] = useState('');
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');

  // Sync state when dialog opens or report/template changes
  useEffect(() => {
    if (isOpen) {
      setErrorMessage(null);
      const initialEmail = report.radiographerEmail || matchedSystem?.operatorEmail || '';
      setRecipientEmail(initialEmail);
      const initialType: EmailTemplateType = report.status === 'Resolved' ? 'resolved' : 'acknowledged';
      setTemplateType(initialType);
      const tpl = getEmailTemplate(initialType, ticketId);
      setSubject(tpl.subject);
      setBody(tpl.body);
    }
  }, [isOpen, report, matchedSystem, ticketId]);

  const handleTemplateChange = (type: EmailTemplateType) => {
    setTemplateType(type);
    const tpl = getEmailTemplate(type, ticketId);
    setSubject(tpl.subject);
    setBody(tpl.body);
  };

  const handleCopyTicket = async () => {
    try {
      await navigator.clipboard.writeText(ticketId);
      setCopiedTicket(true);
      toast({ title: 'Ticket ID Copied', description: `Copied: ${ticketId}` });
      setTimeout(() => setCopiedTicket(false), 2000);
    } catch {
      toast({ title: 'Copy Failed', description: 'Could not copy to clipboard.', variant: 'destructive' });
    }
  };

  const handleCopyBody = async () => {
    try {
      await navigator.clipboard.writeText(`Subject: ${subject}\n\n${body}`);
      setCopiedBody(true);
      toast({ title: 'Email Copied', description: 'Full email content copied to clipboard.' });
      setTimeout(() => setCopiedBody(false), 2000);
    } catch {
      toast({ title: 'Copy Failed', description: 'Could not copy to clipboard.', variant: 'destructive' });
    }
  };

  const handleOpenMailto = () => {
    if (!recipientEmail || !recipientEmail.includes('@')) {
      toast({
        title: 'Recipient Email Required',
        description: 'Please enter a valid recipient email address first.',
        variant: 'destructive',
      });
      return;
    }
    const mailtoUrl = `mailto:${encodeURIComponent(recipientEmail)}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    window.open(mailtoUrl, '_blank');
  };

  const handleSendEmail = async () => {
    if (!recipientEmail || !recipientEmail.includes('@')) {
      toast({
        title: 'Invalid Recipient Email',
        description: 'Please provide a valid recipient email address.',
        variant: 'destructive',
      });
      return;
    }

    setIsSending(true);
    setErrorMessage(null);

    try {
      const response = await fetch('/api/send-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          to: recipientEmail,
          subject,
          body,
          ticketId,
          reportId: report.id,
        }),
      });

      const responseText = await response.text();
      let result: any = null;
      try {
        result = JSON.parse(responseText);
      } catch {
        if (!response.ok) {
          throw new Error(
            response.status === 404
              ? 'API endpoint (/api/send-email) was not found (404). Please ensure the Next.js app on Vercel is deployed with serverless functions enabled.'
              : `Server error (${response.status} ${response.statusText}): Please check Vercel deployment logs.`
          );
        }
        throw new Error('Received non-JSON response from server.');
      }

      if (!response.ok || !result?.success) {
        throw new Error(result?.error || 'Failed to dispatch email.');
      }

      // Record email sent status on report in RTDB
      await updateFaultReport(report.id, {
        radiographerEmail: recipientEmail,
        emailSent: true,
        lastEmailSentAt: new Date().toISOString(),
      });

      toast({
        title: 'Email Sent Successfully',
        description: `Notification for Ticket ${ticketId} sent from ${DEFAULT_SENDER_EMAIL} to ${recipientEmail}.`,
      });
      setIsOpen(false);
    } catch (err: any) {
      const errText = err.message || 'An unexpected error occurred.';
      setErrorMessage(errText);
      toast({
        title: 'Failed to Send Email Directly',
        description: errText,
        variant: 'destructive',
      });
    } finally {
      setIsSending(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="sm:max-w-xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center justify-between pr-6">
            <DialogTitle className="flex items-center gap-2 text-base">
              <Mail className="h-5 w-5 text-primary" />
              Send Email Notification
            </DialogTitle>
            <Badge variant="outline" className="font-mono text-xs gap-1">
              <Ticket className="h-3 w-3 text-muted-foreground" />
              {ticketId}
            </Badge>
          </div>
          <DialogDescription className="text-xs">
            Send an official email notification to the radiographer for this fault ticket.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* Sender Information Banner */}
          <div className="flex items-center justify-between p-2.5 rounded-lg bg-primary/5 border border-primary/20 text-xs">
            <div className="flex items-center gap-2">
              <ShieldCheck className="h-4 w-4 text-primary shrink-0" />
              <div className="space-y-0.5">
                <span className="text-muted-foreground">Sending from: </span>
                <strong className="text-foreground font-semibold">{DEFAULT_SENDER_EMAIL}</strong>
                <span className="text-muted-foreground ml-1">({DEFAULT_SENDER_NAME})</span>
              </div>
            </div>
            <Badge variant="secondary" className="text-[10px] font-mono">
              Verified Sender
            </Badge>
          </div>

          {/* Previous Sent Status Notice */}
          {report.emailSent && report.lastEmailSentAt && (
            <div className="flex items-center gap-2 p-2.5 rounded-lg bg-green-500/10 border border-green-500/20 text-green-700 dark:text-green-400 text-xs">
              <CheckCircle2 className="h-4 w-4 shrink-0" />
              <span>
                Email previously sent on{' '}
                <strong>
                  {format(new Date(report.lastEmailSentAt), 'PPp')}
                </strong>
              </span>
            </div>
          )}

          {/* Error Notice with Quick Action */}
          {errorMessage && (
            <div className="p-3 rounded-lg bg-destructive/10 border border-destructive/20 text-destructive text-xs space-y-2">
              <div className="flex items-start gap-2">
                <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
                <div className="flex-1 font-medium leading-relaxed">
                  {errorMessage}
                </div>
              </div>
              <div className="pt-1 flex items-center justify-between border-t border-destructive/20">
                <span className="text-[11px] opacity-90">You can still send directly via your local mail client:</span>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={handleOpenMailto}
                  className="h-7 text-xs gap-1 border-destructive/30 hover:bg-destructive/10"
                >
                  <ExternalLink className="h-3 w-3" />
                  Open in Mail App
                </Button>
              </div>
            </div>
          )}

          {/* Template Switcher */}
          <div className="space-y-1.5">
            <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
              Response Template
            </Label>
            <div className="grid grid-cols-2 gap-2">
              <Button
                type="button"
                variant={templateType === 'acknowledged' ? 'default' : 'outline'}
                size="sm"
                onClick={() => handleTemplateChange('acknowledged')}
                className="text-xs justify-center font-medium"
              >
                1. Complaint Logged
              </Button>
              <Button
                type="button"
                variant={templateType === 'resolved' ? 'default' : 'outline'}
                size="sm"
                onClick={() => handleTemplateChange('resolved')}
                className="text-xs justify-center font-medium"
              >
                2. Issue Resolved
              </Button>
            </div>
          </div>

          {/* Recipient Field */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                Recipient Email
              </Label>
              {report.radiographerName && (
                <span className="text-[11px] text-muted-foreground">
                  Radiographer: <strong>{report.radiographerName}</strong>
                </span>
              )}
            </div>
            <Input
              type="email"
              placeholder="radiographer@email.com"
              value={recipientEmail}
              onChange={(e) => setRecipientEmail(e.target.value)}
              className="text-sm"
            />
          </div>

          {/* Subject Field */}
          <div className="space-y-1.5">
            <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
              Subject Line
            </Label>
            <Input
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              className="text-sm font-medium"
            />
          </div>

          {/* Email Body */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                Email Message Body
              </Label>
              <div className="flex gap-1.5">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={handleCopyTicket}
                  className="h-6 px-2 text-[10px] gap-1"
                >
                  {copiedTicket ? <Check className="h-3 w-3 text-green-500" /> : <Copy className="h-3 w-3" />}
                  Copy Ticket ID
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={handleCopyBody}
                  className="h-6 px-2 text-[10px] gap-1"
                >
                  {copiedBody ? <Check className="h-3 w-3 text-green-500" /> : <Copy className="h-3 w-3" />}
                  Copy Body
                </Button>
              </div>
            </div>
            <Textarea
              value={body}
              onChange={(e) => setBody(e.target.value)}
              rows={8}
              className="text-xs font-mono resize-none leading-relaxed"
            />
          </div>
        </div>

        <DialogFooter className="flex flex-col sm:flex-row gap-2 sm:justify-between pt-2 border-t">
          <div className="flex gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleOpenMailto}
              className="text-xs gap-1.5"
            >
              <ExternalLink className="h-3.5 w-3.5" />
              Open in Mail App
            </Button>
          </div>
          <div className="flex gap-2 justify-end">
            <DialogClose asChild>
              <Button type="button" variant="ghost" size="sm">
                Cancel
              </Button>
            </DialogClose>
            <Button
              type="button"
              size="sm"
              onClick={handleSendEmail}
              disabled={isSending}
              className="gap-1.5 font-bold"
            >
              {isSending ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Sending...
                </>
              ) : (
                <>
                  <Send className="h-4 w-4" />
                  Send Email
                </>
              )}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
