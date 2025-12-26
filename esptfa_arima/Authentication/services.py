

def register_user(username, password, first_name, last_name, email):
    user = User.objects.create_user(username, email, password)
    user.first_name = first_name
    user.last_name = last_name
    user.save()
    return user