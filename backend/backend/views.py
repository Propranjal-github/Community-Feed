from rest_framework import viewsets, status, views, permissions, mixins, filters
from rest_framework.response import Response
from rest_framework.decorators import action
from django.db import transaction, IntegrityError
from django.db.models import Sum, F, Prefetch, OuterRef, Exists, Count
from django.core.cache import cache
from django.utils import timezone
from django.middleware.csrf import get_token
from django.contrib.auth.models import User
from django.contrib.auth import authenticate, login, logout
from datetime import timedelta
import logging

from .models import Post, Comment, Like, KarmaTransaction
from .serializers import PostSerializer, CommentSerializer, UserSerializer

logger = logging.getLogger(__name__)

def get_actual_user(request):
    """
    Returns the authenticated user, or creates/retrieves a Guest User based on the session.
    """
    if request.user.is_authenticated:
        return request.user
    
    try:
        if not request.session.session_key:
            request.session.create()
    except Exception as e:
        logger.error(f"Session creation failed: {e}")
        return User(username="Guest_Error", id=-1)
    
    guest_username = f"Guest_{request.session.session_key[:6]}"
    user, created = User.objects.get_or_create(username=guest_username)
    return user

class LikeMixin:
    """
    Shared logic for liking Posts and Comments.
    """
    def _perform_like(self, request, post_id=None, comment_id=None, karma_value=0):
        user = get_actual_user(request)
        if user.id == -1:
             return Response({'error': 'System busy, try again later.'}, status=503)
        
        target_model = Post if post_id else Comment
        target_id = post_id if post_id else comment_id

        with transaction.atomic():
            try:
                target = target_model.objects.select_related('author').get(id=target_id)
                
                if target.author.id == user.id:
                    return Response(
                        {'error': 'You cannot vote on your own content.'}, 
                        status=status.HTTP_400_BAD_REQUEST
                    )

                lookup = {'user': user}
                if post_id:
                    lookup['post_id'] = post_id
                else:
                    lookup['comment_id'] = comment_id

                existing_like = Like.objects.filter(**lookup).select_for_update().first()
                
                if existing_like:
                    existing_like.delete()
                    target_model.objects.filter(id=target_id).update(likes_count=F('likes_count') - 1)
                    KarmaTransaction.objects.create(
                        user=target.author,
                        amount=-karma_value,
                        source_type='POST' if post_id else 'COMMENT',
                        source_id=target_id
                    )
                    status_msg = 'unliked'
                else:
                    if post_id:
                        Like.objects.create(user=user, post_id=post_id)
                    else:
                        Like.objects.create(user=user, comment_id=comment_id)
                    
                    target_model.objects.filter(id=target_id).update(likes_count=F('likes_count') + 1)
                    KarmaTransaction.objects.create(
                        user=target.author,
                        amount=karma_value,
                        source_type='POST' if post_id else 'COMMENT',
                        source_id=target_id
                    )
                    status_msg = 'liked'

                target.refresh_from_db()
                return Response({'status': status_msg, 'newLikes': target.likes_count})

            except IntegrityError:
                return Response({'error': 'Race condition detected'}, status=status.HTTP_409_CONFLICT)
            except Exception as e:
                logger.error(f"Like failed: {e}")
                return Response({'error': 'Database error'}, status=500)


class PostViewSet(LikeMixin, viewsets.ModelViewSet):
    serializer_class = PostSerializer
    permission_classes = [permissions.AllowAny]
    pagination_class = None # CLIENT-SIDE PAGINATION: Disable DRF pagination

    filter_backends = [filters.SearchFilter, filters.OrderingFilter]
    search_fields = ['content', 'author__username']
    ordering_fields = ['created_at', 'likes_count']
    ordering = ['-created_at'] 

    def get_queryset(self):
        user = self.request.user
        
        has_liked_subquery = Like.objects.filter(
            post=OuterRef('pk'),
            user=user
        ) if user.is_authenticated else Like.objects.none()

        return Post.objects.select_related('author').prefetch_related(
            'comments', 
            'comments__author'
        ).annotate(
            hasLiked=Exists(has_liked_subquery),
            comment_count_annotated=Count('comments', distinct=True)
        )
    
    def list(self, request, *args, **kwargs):
        """
        Custom list method to enforce a hard limit for the MVP.
        Returns a flat array (client-side pagination).
        """
        queryset = self.filter_queryset(self.get_queryset())
        
        # Hard limit: Fetch top 200 posts. 
        queryset = queryset[:200]
        
        serializer = self.get_serializer(queryset, many=True)
        return Response(serializer.data)

    def perform_create(self, serializer):
        user = get_actual_user(self.request)
        serializer.save(author=user)

    @action(detail=True, methods=['post'])
    def like(self, request, pk=None):
        return self._perform_like(request, post_id=pk, karma_value=5)


class CommentViewSet(LikeMixin, mixins.CreateModelMixin, viewsets.GenericViewSet):
    queryset = Comment.objects.all()
    serializer_class = CommentSerializer
    permission_classes = [permissions.AllowAny]

    def perform_create(self, serializer):
        user = get_actual_user(self.request)
        serializer.save(author=user)

    @action(detail=True, methods=['post'])
    def like(self, request, pk=None):
        return self._perform_like(request, comment_id=pk, karma_value=1)


class UserViewSet(viewsets.ViewSet):
    permission_classes = [permissions.AllowAny]

    @action(detail=False, methods=['get'])
    def me(self, request):
        csrf_token = get_token(request)
        user = get_actual_user(request)
        serializer = UserSerializer(user)
        return Response({
            'isAuthenticated': user.id != -1, 
            'user': serializer.data,
            'csrfToken': csrf_token
        })

    @action(detail=False, methods=['post'])
    def signup(self, request):
        username = request.data.get('username')
        password = request.data.get('password')

        if not username or not password:
            return Response({'error': 'Username and password required'}, status=400)
        
        if User.objects.filter(username=username).exists():
            return Response({'error': 'Username already taken'}, status=400)
        
        try:
            user = User.objects.create_user(username=username, password=password)
            login(request, user) # Auto login
            return Response(UserSerializer(user).data)
        except Exception as e:
            return Response({'error': str(e)}, status=400)

    @action(detail=False, methods=['post'])
    def login(self, request):
        username = request.data.get('username')
        password = request.data.get('password')
        
        user = authenticate(username=username, password=password)
        if user:
            login(request, user)
            return Response(UserSerializer(user).data)
        
        return Response({'error': 'Invalid credentials'}, status=401)

    @action(detail=False, methods=['post'])
    def logout(self, request):
        logout(request)
        return Response({'status': 'logged out'})


class LeaderboardView(views.APIView):
    def get(self, request):
        cache_key = 'leaderboard_data_v1'
        cached_data = cache.get(cache_key)

        if cached_data:
            return Response(cached_data)

        try:
            time_threshold = timezone.now() - timedelta(hours=24)

            leaders = KarmaTransaction.objects.filter(
                created_at__gte=time_threshold
            ).values(
                'user__username', 
                'user__id'
            ).annotate(
                score=Sum('amount')
            ).order_by('-score')[:5]

            data = [
                {
                    'user': {
                        'id': l['user__id'], 
                        'username': l['user__username'],
                        'avatarUrl': f"https://picsum.photos/seed/{l['user__id']}/200"
                    },
                    'score': l['score'],
                    'rank': idx + 1,
                    'previousRank': 0 
                }
                for idx, l in enumerate(leaders)
            ]
            
            cache.set(cache_key, data, 60)
            return Response(data)
            
        except Exception as e:
            logger.error(f"Leaderboard calc failed: {e}")
            return Response([])
