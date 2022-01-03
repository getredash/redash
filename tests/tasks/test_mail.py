# from flask_mail import Mail
# mail = Mail()

config = {}
config.update('MAIL_SERVER', '127.0.0.1')
config.update('MAIL_USERNAME')
config.update('MAIL_PASSWORD')
config.update('MAIL_PORT', 25)
config.update('MAIL_USE_TLS', False)
config.update('MAIL_USE_SSL', False)
print(config)
# mail.init_mail(config)

