import logging
import traceback
import base64
from django.http import JsonResponse
from django.core.exceptions import ValidationError
from rest_framework import status
from rest_framework.serializers import ValidationError as DRFValidationError
from django.http import HttpResponse

logger = logging.getLogger('omochi')

class GlobalErrorHandlerMiddleware:
    """
    Middleware to catch and handle all unhandled exceptions in the application.
    Provides a consistent error response format and logs errors properly.
    """
    
    def __init__(self, get_response):
        self.get_response = get_response
        
    def __call__(self, request):
        try:
            response = self.get_response(request)
            return response
        except Exception as e:
            return self.handle_exception(request, e)
    
    def process_exception(self, request, exception):
        """
        Django middleware exception handler - this is called when an exception occurs
        in the view or in a middleware above this one.
        """
        return self.handle_exception(request, exception)
            
    def handle_exception(self, request, exception):
        """
        Handle any unhandled exception and return a consistent error response.
        Also logs the error with appropriate detail.
        """
        # Get the full traceback
        error_traceback = traceback.format_exc()
        
        # Capture request parameters and body
        request_params = dict(request.GET)
        request_body = None
        
        # Try to get request body content
        try:
            if request.body:
                try:
                    if hasattr(request, '_body'):
                        request_body = request._body.decode('utf-8')
                    else:
                        request_body = request.body.decode('utf-8')
                except UnicodeDecodeError:
                    # If body contains binary data, encode as base64
                    request_body = f"<binary> (base64): {base64.b64encode(request.body).decode('ascii')}"
                except Exception as body_e:
                    request_body = f"<Error reading body: {str(body_e)}>"
        except Exception as e:
            # Handle case where body has already been read (like in DRF)
            request_body = f"<Body already consumed: {str(e)}>"

        # Check if this is a validation error that should return 400 Bad Request
        if isinstance(exception, (ValidationError, DRFValidationError)):            
            # Extract the error message(s) from the validation error
            if isinstance(exception, ValidationError):
                # Django ValidationError can have messages as a list
                if hasattr(exception, 'messages'):
                    error_messages = exception.messages
                else:
                    error_messages = [str(exception)]
                    
                # If it's a single message, use it directly
                if len(error_messages) == 1:
                    error_message = error_messages[0]
                else:
                    error_message = error_messages
            else:
                # DRF ValidationError
                error_message = str(exception)
            
            error_response = {
                'error': 'Bad Request',
                'message': error_message,
            }
            return JsonResponse(error_response, status=status.HTTP_400_BAD_REQUEST)

        logger.info("Request body: %s", request_body)
        
        # Log the exception with traceback for all other errors
        logger.error(
            f"Unhandled exception in {request.method} {request.path}: {str(exception)}",
            extra={
                'exception_type': exception.__class__.__name__,
                'exception_message': str(exception),
                'request_path': request.path,
                'request_method': request.method,
                'request_params': request_params,
                'request_body': request_body,
                'user_id': getattr(request.user, 'id', None),
                'traceback': error_traceback
            }
        )
        
        error_response = {
            'error': 'Internal Server Error',
            'message': 'An unexpected error occurred. Please try again later.',
        }
        return JsonResponse(error_response, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
