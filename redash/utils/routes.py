from werkzeug.routing import BaseConverter


class SlugConverter(BaseConverter):
    def to_python(self, value):
        # This is ay workaround for when we enable multi-org and some files are being called by the index rule:
        # for path in settings.STATIC_ASSETS_PATHS:
        #     full_path = safe_join(path, value)
        #     if os.path.isfile(full_path):
        #         raise ValidationError()

        return value

    def to_url(self, value):
        return value
