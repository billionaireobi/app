# from django.db import models
# from django.contrib.auth.models import User
# import uuid
# from django.utils import timezone 
# from django.core.validators import MinValueValidator


# # create events
# class passwordreset(models.Model):
#     user=models.ForeignKey(User, on_delete=models.CASCADE)
#     reset_id=models.UUIDField(default=uuid.uuid4, unique=True,editable=False)
#     created_when=models.DateTimeField(auto_now_add=True)
    
#     def __str__(self):
#         return f"password reset for{self.user.username} at {self.created_when}"
    

from django.db import models
from django.contrib.auth.models import User
import uuid
from django.utils import timezone 
from django.core.validators import MinValueValidator

class passwordreset(models.Model):
    user = models.ForeignKey(User, on_delete=models.CASCADE)
    reset_id = models.UUIDField(default=uuid.uuid4, unique=True, editable=False)
    created_when = models.DateTimeField(auto_now_add=True)
    
    def __str__(self):
        return f"Password reset for {self.user.username} at {self.created_when}"
    
    class Meta:
        db_table = 'password_reset'
        ordering = ['-created_when']  # Most recent first
        
    def is_expired(self, minutes=10):
        """Check if the reset token has expired"""
        from datetime import timedelta
        expiration_time = self.created_when + timedelta(minutes=minutes)
        return timezone.now() > expiration_time
    
    @classmethod
    def cleanup_expired(cls, minutes=10):
        """Remove all expired reset tokens"""
        from datetime import timedelta
        expiration_time = timezone.now() - timedelta(minutes=minutes)
        expired_tokens = cls.objects.filter(created_when__lt=expiration_time)
        count = expired_tokens.count()
        expired_tokens.delete()
        return count