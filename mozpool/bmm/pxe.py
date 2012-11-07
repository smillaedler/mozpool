# This Source Code Form is subject to the terms of the Mozilla Public
# License, v. 2.0. If a copy of the MPL was not distributed with this
# file, You can obtain one at http://mozilla.org/MPL/2.0/.

import os
from mozpool import config
from mozpool.db import data

def _get_device_config_path(device_name):
    """
    Get the path where the PXE boot symlink should be placed
    for a specific device.
    """
    mac_address = data.mac_with_dashes(data.device_mac_address(device_name))
    symlink_dir = os.path.join(config.get('paths', 'tftp_root'), "pxelinux.cfg")
    return os.path.join(symlink_dir, "01-" + mac_address)

def set_pxe(device_name, pxe_config_name, config_data):
    """
    Set up the PXE configuration for the device as directed.  Note that this does *not*
    reboot the device.
    """
    image_details = data.pxe_config_details(pxe_config_name)['details']
    pxe_config_contents = image_details['contents']

    # Set the config in the database before writing to disk.
    data.set_device_config(device_name, pxe_config_name, config_data)

    # Write out the config file
    device_config_path = _get_device_config_path(device_name)
    device_config_dir = os.path.dirname(device_config_path)
    os.makedirs(device_config_dir)

    open(device_config_path, "w").write(pxe_config_contents)

def clear_pxe(device_name):
    """Remove symlink for this device's MAC address from TFTP."""
    tftp_symlink = _get_device_config_path(device_name)
    if os.path.exists(tftp_symlink):
        os.unlink(tftp_symlink)
