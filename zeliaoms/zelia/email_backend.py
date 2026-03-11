# email_backend.py
import smtplib
import ssl
from django.core.mail.backends.smtp import EmailBackend

class CustomEmailBackend(EmailBackend):
    def open(self):
        if self.connection:
            return False
        connection_class = smtplib.SMTP_SSL if self.use_ssl else smtplib.SMTP
        try:
            self.connection = connection_class(
                self.host, self.port, local_hostname=self.local_hostname,
                timeout=self.timeout)
            
            self.connection.ehlo()
            if self.use_tls:
                context = ssl._create_unverified_context()
                self.connection.starttls(context=context)
                self.connection.ehlo()

            if self.username and self.password:
                self.connection.login(self.username, self.password)
            return True
        except Exception:
            if self.connection:
                try:
                    self.connection.close()
                except Exception:
                    pass
            self.connection = None
            raise
