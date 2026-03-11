
from django.contrib import admin
from django.urls import path,include
from  . import settings
from django.shortcuts import redirect
from django.conf.urls.static import static
urlpatterns = [
    path('secure-panel/shell/', admin.site.urls),
    path('', include('store.urls')),
    path('administration/',include('administration.urls')),
    path('api/', include('androidapk.urls')),
] + static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)


handler404 = 'store.views.custom_404'
handler403 = 'store.views.custom_403'
handler500 = 'store.views.custom_500'
