from datetime import datetime
from django.contrib.auth import logout
from django.shortcuts import redirect


class SessionTimeoutMiddleware:
    """
    Logs out authenticated users after 30 minutes of inactivity.
    Last-activity timestamp is stored in the session.
    """
    TIMEOUT = 30 * 60  # 30 minutes in seconds

    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        if request.user.is_authenticated:
            last_str = request.session.get('_last_activity')
            if last_str:
                try:
                    last = datetime.fromisoformat(last_str)
                    elapsed = (datetime.now() - last).total_seconds()
                    if elapsed > self.TIMEOUT:
                        logout(request)
                        return redirect('/login/user/?to=1')
                except (ValueError, TypeError):
                    pass
            # Refresh last-activity on every authenticated request
            request.session['_last_activity'] = datetime.now().isoformat()

        return self.get_response(request)
