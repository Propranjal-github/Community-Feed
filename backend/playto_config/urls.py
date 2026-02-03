from django.contrib import admin
from django.urls import path, include

urlpatterns = [
    path('admin/', admin.site.urls),
    # Mount the backend app URLs under /api/
    path('api/', include('backend.urls')),
]
