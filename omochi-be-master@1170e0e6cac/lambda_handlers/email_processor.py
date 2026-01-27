import json
import logging
import os
import sys
from typing import Dict, Any, List, Optional

# Add Django project to path
sys.path.insert(0, '/var/task')
sys.path.insert(0, '/opt')

# Set up Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'omochi.settings')

import django
django.setup()

from django.core.mail import send_mail
from django.conf import settings

logger = logging.getLogger(__name__)


def handler(event: Dict[str, Any], context: Any) -> Dict[str, Any]:
    """
    Lambda handler for processing email messages from SQS queue.
    
    Args:
        event: SQS event containing email messages
        context: Lambda context
        
    Returns:
        Dict with processing results
    """
    logger.info(f"Processing {len(event.get('Records', []))} email messages")
    
    successful_messages = []
    failed_messages = []
    
    for record in event.get('Records', []):
        try:
            # Parse the SQS message
            message_body = json.loads(record['body'])
            
            # Extract email data
            email_type = message_body.get('type')
            email_data = message_body.get('data', {})
            
            # Process the email based on type
            result = process_email(email_type, email_data)
            
            if result['success']:
                successful_messages.append(record['messageId'])
                logger.info(f"Successfully processed email: {record['messageId']}")
            else:
                failed_messages.append({
                    'messageId': record['messageId'],
                    'error': result['error']
                })
                logger.error(f"Failed to process email {record['messageId']}: {result['error']}")
                
        except Exception as e:
            logger.error(f"Error processing message {record.get('messageId', 'unknown')}: {str(e)}")
            failed_messages.append({
                'messageId': record.get('messageId', 'unknown'),
                'error': str(e)
            })
    
    # Return processing results
    return {
        'statusCode': 200,
        'body': json.dumps({
            'successful': len(successful_messages),
            'failed': len(failed_messages),
            'successful_messages': successful_messages,
            'failed_messages': failed_messages
        })
    }


def process_email(email_type: str, email_data: Dict[str, Any]) -> Dict[str, Any]:
    """
    Process emails using pre-generated content from backend.
    
    Args:
        email_type: Type of email to send (for logging purposes)
        email_data: Pre-generated email data with subject, content, recipients, etc.
        
    Returns:
        Dict with success status and error if any
    """
    try:
        return send_email_with_content(email_data)
        
    except Exception as e:
        return {
            'success': False,
            'error': str(e)
        }


def send_email_with_content(data: Dict[str, Any]) -> Dict[str, Any]:
    """
    Send email using pre-generated content.
    
    Args:
        data: Email data containing recipient, subject, content, cc, bcc
        
    Returns:
        Dict with success status and error if any
    """
    try:
        recipient_email = data['recipient_email']
        subject = data['subject']
        html_content = data['html_content']
        plain_content = data['plain_content']
        cc = data.get('cc', [])
        bcc = data.get('bcc', [])
        
        # Prepare recipient lists
        recipient_list = [recipient_email]
        
        send_mail(
            subject=subject,
            message=plain_content,
            from_email=settings.DEFAULT_FROM_EMAIL,
            recipient_list=recipient_list,
            html_message=html_content,
            cc=cc if cc else None,
            bcc=bcc if bcc else None,
            fail_silently=False
        )
        
        logger.info(f"Email sent successfully to {recipient_email}, CC: {cc}, BCC: {bcc}")
        return {'success': True}
        
    except Exception as e:
        logger.error(f"Failed to send email: {str(e)}")
        return {'success': False, 'error': str(e)}
