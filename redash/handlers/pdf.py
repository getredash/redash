import tempfile
import os
import urlparse

from flask import request, send_file
from redash import models
from redash.permissions import require_access, view_only, require_permission
from redash.serializers import serialize_dashboard
from redash.handlers.base import BaseResource, get_object_or_404
from redash import settings

class DashboardPdfDownload(BaseResource):
    def get(self, dashboard_slug=None):
        "dashboard = get_object_or_404(models.Dashboard.get_by_slug_and_org, dashboard_slug, self.current_org)"

        self.record_event({
            'action': 'download_pdf',
            'object_type': 'dashboard',
        })
        snap_url = urlparse.urlparse(settings.SNAP_URL)
        print("Download static response for dashboard: " + dashboard_slug)
        dashboard = get_object_or_404(models.Dashboard.get_by_id_and_org, dashboard_slug, self.current_org)

        new_file, filename = tempfile.mkstemp()

        print(filename)
        os.write(new_file, "this is some content")
        os.close(new_file)

        response = send_file(filename, as_attachment=True, attachment_filename="test.txt")
        return response
