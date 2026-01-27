import logging
from typing import Dict, Any, Optional, List

from django.conf import settings

from omochi.common.email_templates import email_template_service

logger = logging.getLogger(__name__)


class DirectEmailService:
    """
    Service for sending emails directly using Django's email backend without SQS.
    """
    
    def send_email(
        self,
        email_type: str,
        recipient_email: str,
        data: Dict[str, Any],
        cc: Optional[List[str]] = None,
        bcc: Optional[List[str]] = None
    ) -> bool:
        """
        Send email directly using Django's email backend.
        
        Args:
            email_type: Type of email (order_confirmation, welcome, etc.)
            recipient_email: Email address of recipient
            data: Email data dictionary
            cc: List of CC email addresses
            bcc: List of BCC email addresses
            
        Returns:
            bool: True if email sent successfully, False otherwise
        """
        try:
            # Generate email content using template service
            email_content = email_template_service.generate_email_content(email_type, data)
            
            # Create EmailMessage object instead of using send_mail since send_mail doesn't support cc
            from django.core.mail import EmailMultiAlternatives
            email_message = EmailMultiAlternatives(
                subject=email_content['subject'],
                body=email_content['plain_content'],
                from_email=settings.DEFAULT_FROM_EMAIL,
                to=[recipient_email],
                bcc=bcc or email_content.get('bcc', []),
                cc=cc or email_content.get('cc', [])
            )
            if email_content['html_content']:
                email_message.attach_alternative(email_content['html_content'], 'text/html')
            email_message.send(fail_silently=False)
            
            logger.info(f"Email sent directly to {recipient_email}, CC: {cc}, BCC: {bcc}")
            return True
            
        except Exception as e:
            logger.error(f"Failed to send email: {str(e)}")
            return False

    def send_welcome_email(
        self,
        recipient_email: str,
        user_name: str,
        cc: Optional[List[str]] = None,
        bcc: Optional[List[str]] = None
    ) -> bool:
        """Send welcome email to new users."""
        return self.send_email(
            email_type='welcome',
            recipient_email=recipient_email,
            data={'user_name': user_name},
            cc=cc,
            bcc=bcc
        )

    def send_password_reset_email(
        self,
        recipient_email: str,
        reset_link: str,
        user_name: str,
        cc: Optional[List[str]] = None,
        bcc: Optional[List[str]] = None,
        language: str = 'ja'
    ) -> bool:
        """Send password reset email. Supports multilingual and uses global timeout."""
        timeout = getattr(settings, 'PASSWORD_RESET_TOKEN_LIFETIME', 10)  # minutes
        return self.send_email(
            email_type='password_reset',
            recipient_email=recipient_email,
            data={
                'reset_link': reset_link,
                'user_name': user_name,
                'language': language,
                'timeout': timeout,
            },
            cc=cc,
            bcc=bcc
        )

    def send_invoice_email(
        self,
        recipient_email: str,
        invoice_data: Dict[str, Any],
        cc: Optional[List[str]] = None,
        bcc: Optional[List[str]] = None
    ) -> bool:
        """Send invoice email."""
        # Automatically include BCC email from settings if not already present
        invoice_bcc_email = getattr(settings, 'INVOICE_BCC_EMAIL', None)
        if invoice_bcc_email:
            if bcc is None:
                bcc = [invoice_bcc_email]
            elif invoice_bcc_email not in bcc:
                bcc.append(invoice_bcc_email)
        
        return self.send_email(
            email_type='invoice',
            recipient_email=recipient_email,
            data={'invoice': invoice_data},
            cc=cc,
            bcc=bcc
        )

    def send_bulk_emails(
        self,
        email_type: str,
        recipients: list,
        data: Dict[str, Any],
        cc: Optional[List[str]] = None,
        bcc: Optional[List[str]] = None
    ) -> Dict[str, int]:
        """
        Send bulk emails directly.
        
        Args:
            email_type: Type of email
            recipients: List of recipient email addresses
            data: Common data for all emails
            cc: List of CC email addresses (applied to all emails)
            bcc: List of BCC email addresses (applied to all emails)
            
        Returns:
            Dict with success and failure counts
        """
        success_count = 0
        failure_count = 0
        
        for recipient_email in recipients:
            success = self.send_email(
                email_type=email_type,
                recipient_email=recipient_email,
                data=data,
                cc=cc,
                bcc=bcc
            )
            
            if success:
                success_count += 1
            else:
                failure_count += 1
        
        logger.info(f"Bulk email results: {success_count} successful, {failure_count} failed")
        return {
            'success': success_count,
            'failed': failure_count
        }


# Global instance
email_service = DirectEmailService()
