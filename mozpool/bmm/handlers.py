# This Source Code Form is subject to the terms of the Mozilla Public
# License, v. 2.0. If a copy of the MPL was not distributed with this
# file, You can obtain one at http://mozilla.org/MPL/2.0/.

import templeton
from mozpool.db import data
from mozpool.bmm import api

# URLs go here. "/api/" will be automatically prepended to each.
urls = (
  "/device/([^/]+)/power-cycle/?", "power_cycle",
  "/device/([^/]+)/ping/?", "ping",
  "/device/([^/]+)/clear-pxe/?", "clear_pxe",
  "/bmm/pxe_config/list/?", "pxe_config_list",
  "/bmm/pxe_config/([^/]+)/details/?", "pxe_config_details",
)

class power_cycle:
    @templeton.handlers.json_response
    def POST(self, device_name):
        # TODO: verify we own this device
        args, body = templeton.handlers.get_request_parms()
        if 'pxe_config' in body:
            api.set_pxe(device_name, body['pxe_config'],
                    body.get('boot_config', ''))
        else:
            api.clear_pxe(device_name)
        # start the power cycle and ignore the result
        api.start_powercycle(device_name, lambda *args : None)
        return {}

class ping:
    @templeton.handlers.json_response
    def GET(self, device_name):
        # TODO: verify we own this device
        return { 'success' : api.ping(device_name) }

class clear_pxe:
    @templeton.handlers.json_response
    def POST(self, device_name):
        # TODO: verify we own this device
        api.clear_pxe(device_name)
        return {}

class pxe_config_list:
    @templeton.handlers.json_response
    def GET(self):
        return data.list_pxe_configs()

class pxe_config_details:
    @templeton.handlers.json_response
    def GET(self, id):
        return data.pxe_config_details(id)
