# This Source Code Form is subject to the terms of the Mozilla Public
# License, v. 2.0. If a copy of the MPL was not distributed with this
# file, You can obtain one at http://mozilla.org/MPL/2.0/.

import sqlalchemy
from sqlalchemy.sql import select
from mozpool.db import model, base

class Methods(base.MethodsBase):

    def add(self, request_id, device_name):
        """
        Add a new device request, for the given request (by ID) and device (by
        name).  Raises NotFound if no such device exists.  Returns True on
        success, or False on failure (usually because the device is already
        tied to a request)
        """
        res = self.db.execute(select(
                [model.devices.c.id],
                model.devices.c.name==device_name))
        device_id = self.singleton(res)

        try:
            self.db.execute(model.device_requests.insert(),
                        {'request_id': request_id, 'device_id': device_id})
        except sqlalchemy.exc.IntegrityError:
            return False
        return True

    def clear(self, request_id):
        self.db.execute(model.device_requests.delete().where(
                model.device_requests.c.request_id==request_id))

    def get_by_device(self, device_name):
        """
        Return the request id connected to the given device name, or None if
        there is no connection.
        """
        res = self.db.execute(select(
                [model.device_requests.c.request_id],
                from_obj=[model.device_requests.join(model.devices)]).where(
                model.devices.c.name==device_name))
        return self.singleton(res, missing_ok=True)

