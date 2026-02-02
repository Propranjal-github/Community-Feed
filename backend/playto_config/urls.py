from django.contrib import admin
from django.urls import path, include, re_path
from django.views.generic import TemplateView

urlpatterns = [
    path('admin/', admin.site.urls),
    # Mount the backend app URLs under /api/
    path('api/', include('backend.urls')),
    
    # CATCH-ALL: Serve React Frontend
    # This must be last. It matches any path that wasn't matched above.
    re_path(r'^.*$', TemplateView.as_view(template_name='index.html')),
]
