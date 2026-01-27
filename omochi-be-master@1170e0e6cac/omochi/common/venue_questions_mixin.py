"""
Shared mixin for venue questions validation logic
"""
from django.utils.translation import gettext_lazy as _
from rest_framework import serializers


class VenueQuestionsValidationMixin:
    """
    Mixin to provide shared venue questions validation logic for both orders and reservations
    """
    
    def _validate_venue_questions_logic(self, venue, venue_questions_data, order_type=None):
        """
        Validate venue questions based on venue settings
        
        Args:
            venue: Venue instance
            venue_questions_data: List of question answers from request
            order_type: Optional order type (for orders: 'DINE_IN'/'TAKEOUT', for reservations: None)
        """
        # For orders: venue questions are only required for DINE_IN orders
        if order_type is not None and order_type != 'DINE_IN':
            # For TAKEOUT orders, simply ignore venue questions (no validation error)
            return
        
        # For reservations or DINE_IN orders: check if venue has questions enabled
        if venue.enable_order_questions:
            venue_questions = venue.questions.all().order_by('ordinal', 'created_at')
            
            if not venue_questions_data and venue_questions.exists():
                raise serializers.ValidationError(
                    {
                        "venue_questions": _(
                            "Reservations can only be made if you agree with the terms of the venue, and answer all the questions from the venue."
                        )
                    }
                )
            
            # Check if the number of questions matches
            if len(venue_questions_data) != venue_questions.count():
                raise serializers.ValidationError(
                    {
                        "venue_questions": _(
                            "The list of questions has been updated. Please try again."
                        )
                    }
                )
            
            # Create mapping of question IDs for validation
            venue_question_ids = set(str(q.id) for q in venue_questions)
            provided_question_ids = set()
            
            for index, question_data in enumerate(venue_questions_data):
                question_id = str(question_data.get('question_id'))
                answer = question_data.get('answer', '').strip()
                
                # Require all answers to be non-empty
                if not answer:
                    raise serializers.ValidationError(
                        {
                            "venue_questions": _(
                                "Reservations can only be made if you agree with the terms of the venue, and answer all the questions from the venue."
                            )
                        }
                    )
                
                provided_question_ids.add(question_id)
                
                # Check if this question ID exists in venue questions
                if question_id not in venue_question_ids:
                    raise serializers.ValidationError(
                        {
                            "venue_questions": _(
                                f"The list of questions has been updated. Please try again."
                            )
                        }
                    )
            
            # Check if all required questions are answered
            if provided_question_ids != venue_question_ids:
                missing_ids = venue_question_ids - provided_question_ids
                raise serializers.ValidationError(
                    {
                        "venue_questions": _(
                            f"The list of questions has been updated. Please try again."
                        )
                    }
                )
        else:
            # If venue doesn't have order questions enabled, simply ignore venue questions (no validation error)
            return
            
    def _create_venue_questions(self, parent_obj, venue, venue_questions_data, question_model_class):
        """
        Create venue question answers for either order or reservation
        
        Args:
            parent_obj: Order or Reservation instance
            venue: Venue instance
            venue_questions_data: List of question answers from request
            question_model_class: OrderQuestion or ReservationQuestion model class
        """
        if venue_questions_data and venue:
            venue_questions_dict = {str(q.id): q for q in venue.questions.all()}
            
            for index, question_data in enumerate(venue_questions_data):
                question_id = str(question_data['question_id'])
                venue_question = venue_questions_dict[question_id]
                
                # Determine the parent field name based on model
                if question_model_class.__name__ == 'OrderQuestion':
                    parent_field = 'order'
                else:  # ReservationQuestion
                    parent_field = 'reservation'
                
                question_model_class.objects.create(
                    **{parent_field: parent_obj},
                    question=venue_question.question,  # Store original Japanese text
                    question_en=venue_question.question_en or '',  # Store English text
                    answer=question_data['answer'],
                    answer_en=question_data.get('answer_en', ''),
                    order_index=index,  # Use array index as order_index
                )