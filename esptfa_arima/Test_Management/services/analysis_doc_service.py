from Test_Management.models import TestDraft, IdempotencyKey
from django.contrib.auth.models import User

def get_or_create_draft(idempotency_key: str, user: User):
    try:
        # Check if this idempotency key has been used by this user before
        ik = IdempotencyKey.objects.filter(idempotency_key=idempotency_key, user=user).first()

        if ik:
            # Return the associated draft
            return TestDraft.objects.filter(test_draft_id=ik.returned_draft_key).first()

        # Create a new draft if not exists
        # Initializing with empty dict for test_content if not provided
        draft = TestDraft.objects.create(user=user, test_content={})
        
        # Record the idempotency key and link it to the draft
        IdempotencyKey.objects.create(
            idempotency_key=idempotency_key, 
            user=user, 
            returned_draft_key=draft.test_draft_id
        )

        return draft
    except Exception:
        return None
