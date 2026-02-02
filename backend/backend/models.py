from django.db import models
from django.contrib.auth.models import User

class Post(models.Model):
    author = models.ForeignKey(User, on_delete=models.CASCADE, related_name='posts')
    content = models.TextField()
    created_at = models.DateTimeField(auto_now_add=True, db_index=True)
    likes_count = models.IntegerField(default=0)

    def __str__(self):
        return f"Post by {self.author.username} at {self.created_at}"

class Comment(models.Model):
    post = models.ForeignKey(Post, on_delete=models.CASCADE, related_name='comments')
    author = models.ForeignKey(User, on_delete=models.CASCADE)
    parent = models.ForeignKey('self', null=True, blank=True, on_delete=models.CASCADE, related_name='replies')
    content = models.TextField()
    created_at = models.DateTimeField(auto_now_add=True)
    likes_count = models.IntegerField(default=0)

    class Meta:
        indexes = [models.Index(fields=['post', 'created_at'])]

class KarmaTransaction(models.Model):
    SOURCE_TYPES = (('POST', 'Post'), ('COMMENT', 'Comment'))

    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='karma_transactions')
    amount = models.IntegerField()
    source_type = models.CharField(max_length=10, choices=SOURCE_TYPES)
    source_id = models.CharField(max_length=255) 
    created_at = models.DateTimeField(auto_now_add=True, db_index=True)

class Like(models.Model):
    user = models.ForeignKey(User, on_delete=models.CASCADE)
    post = models.ForeignKey(Post, null=True, blank=True, on_delete=models.CASCADE)
    comment = models.ForeignKey(Comment, null=True, blank=True, on_delete=models.CASCADE)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = [
            ('user', 'post'),
            ('user', 'comment'),
        ]
        constraints = [
            models.CheckConstraint(
                condition=(models.Q(post__isnull=False) & models.Q(comment__isnull=True)) |
                      (models.Q(post__isnull=True) & models.Q(comment__isnull=False)),
                name='like_target_exclusive'
            )
        ]