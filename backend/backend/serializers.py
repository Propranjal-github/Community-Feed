from rest_framework import serializers
from .models import Post, Comment, User

class UserSerializer(serializers.ModelSerializer):
    avatarUrl = serializers.SerializerMethodField()

    class Meta:
        model = User
        fields = ['id', 'username', 'avatarUrl'] 

    def get_avatarUrl(self, obj):
        if obj.id == -1: return ""
        return f"https://picsum.photos/seed/{obj.id}/200"

class CommentSerializer(serializers.ModelSerializer):
    author = UserSerializer(read_only=True)
    likes = serializers.IntegerField(source='likes_count', read_only=True)
    hasLiked = serializers.BooleanField(default=False, read_only=True)
    createdAt = serializers.DateTimeField(source='created_at', read_only=True)
    
    # Write fields (Input)
    postId = serializers.PrimaryKeyRelatedField(
        source='post', 
        queryset=Post.objects.all(), 
        write_only=True
    )
    parentId = serializers.PrimaryKeyRelatedField(
        source='parent', 
        queryset=Comment.objects.all(), 
        allow_null=True, 
        required=False,
        write_only=True
    )

    # Read fields (Output)
    parentIdRead = serializers.PrimaryKeyRelatedField(source='parent', read_only=True)
    postIdRead = serializers.PrimaryKeyRelatedField(source='post', read_only=True)

    class Meta:
        model = Comment
        fields = ['id', 'postId', 'parentId', 'postIdRead', 'parentIdRead', 'author', 'content', 'likes', 'hasLiked', 'createdAt']

    def to_representation(self, instance):
        ret = super().to_representation(instance)
        ret['parentId'] = ret.pop('parentIdRead')
        ret['postId'] = ret.pop('postIdRead')
        return ret
    
    def validate_content(self, value):
        # SAFETY FIX: Prevent massive payloads
        if not value.strip():
            raise serializers.ValidationError("Content cannot be empty")
        if len(value) > 500:
            raise serializers.ValidationError("Comment cannot exceed 500 characters")
        return value

    def validate(self, data):
        # SAFETY FIX: Infinite Recursion Protection
        # Ensure a comment cannot be its own parent (Cycle Detection)
        if self.instance and 'parent' in data:
            parent = data['parent']
            if parent and parent.id == self.instance.id:
                raise serializers.ValidationError({"parentId": "A comment cannot reply to itself."})
        return data

class PostSerializer(serializers.ModelSerializer):
    author = UserSerializer(read_only=True)
    comments = CommentSerializer(many=True, read_only=True)
    likes = serializers.IntegerField(source='likes_count', read_only=True)
    hasLiked = serializers.BooleanField(default=False, read_only=True)
    
    # Use the annotated field from the viewset to avoid N+1 queries
    commentCount = serializers.IntegerField(source='comment_count_annotated', read_only=True)
    
    createdAt = serializers.DateTimeField(source='created_at', read_only=True)

    class Meta:
        model = Post
        fields = ['id', 'author', 'content', 'likes', 'hasLiked', 'commentCount', 'comments', 'createdAt']

    def validate_content(self, value):
        # SAFETY FIX: Prevent massive payloads
        if not value.strip():
            raise serializers.ValidationError("Content cannot be empty")
        if len(value) > 1000:
            raise serializers.ValidationError("Post cannot exceed 1000 characters")
        return value
