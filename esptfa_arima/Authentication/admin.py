from django.contrib import admin
from django.contrib.auth.models import User
from django.contrib.auth.admin import UserAdmin as BaseUserAdmin

from .models import Teacher, Student

# Customize standard User admin to show most recent users at the top
admin.site.unregister(User)

@admin.register(User)
class UserAdmin(BaseUserAdmin):
    ordering = ('-date_joined',)

admin.site.register(Teacher)
admin.site.register(Student)