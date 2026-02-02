from django.contrib import admin
from .models import Post, Comment, KarmaTransaction, Like

@admin.register(Post)
class PostAdmin(admin.ModelAdmin):
    list_display = ('author', 'likes_count', 'created_at')

@admin.register(Comment)
class CommentAdmin(admin.ModelAdmin):
    list_display = ('author', 'post', 'likes_count', 'created_at')

@admin.register(KarmaTransaction)
class KarmaAdmin(admin.ModelAdmin):
    list_display = ('user', 'amount', 'source_type', 'created_at')
    list_filter = ('source_type', 'created_at')

admin.site.register(Like)