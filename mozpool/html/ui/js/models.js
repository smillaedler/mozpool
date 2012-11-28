/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

// NOTE: all top-level models appear as attributes of window, using the
// lower-cased name.  So the Devices instance is window.devices.

// db-backed models

var UpdateableCollection = Backbone.Collection.extend({
    responseAttr: '',  // override
    refreshInterval: 30000,

    initialize: function (args) {
        _.bindAll(this, 'update', 'parse');

        // keep track of whether we're updating *now*, and whether an update
        // has been requested.  The timeoutId is the window.setTimeout
        // identifier for the periodic updates.  callWhenUpdated keeps a list
        // of functions to call when the current update is complete.
        this.updating = false;
        this.updateRequested = false;
        this.timeoutId = null;
        this.callWhenUpdated = [];
    },

    parse: function(response) {
        var self = this;
        var old_ids = self.map(function(b) { return b.get('id'); });
        var new_ids = _.map(response[self.responseAttr],
                            function (b) { return b.id; });

        // calculate added and removed elements from differences
        _.each(_.difference(old_ids, new_ids), function (id) {
            self.remove(self.get(id));
        });
        _.each(_.difference(new_ids, old_ids), function (id) {
            var attrs = response[self.responseAttr][_.indexOf(new_ids, id)];
            self.push(new self.model(attrs));
        });

        // then any updates to the individual models that haven't been added or
        // removed
        _.each(_.intersection(new_ids, old_ids), function (id) {
            var attrs = response[self.responseAttr][_.indexOf(new_ids, id)];
            var model = self.get(id);
            model.set(attrs);
        });

        // this just instructs the fetch/add to not anything else:
        return [];
    },

    // request that the collection be updated soon.
    update: function(next) {
        this.updateRequested = true;
        if (!this.updating) {
            this._startUpdate();
        }
        if (next) {
            this.callWhenUpdated.push(next);
        }
    },

    _startUpdate: function() {
        var self = this;

        if (this.timeoutId) {
            window.clearTimeout(this.timeoutId);
            this.timeoutId = null;
        }
        this.updating = true;
        this.updateRequested = false;

        this.fetch({
            add: true,
            success: function() {
                var calls = self.callWhenUpdated;
                self.callWhenUpdated = [];
                _.each(calls, function(c) { c(); });

                self.updating = false;
                if (self.updateRequested) {
                    self._startUpdate();
                } else {
                    // schedule to update again after refreshInterval
                    self.timeoutId = window.setTimeout(self.update, self.refreshInterval);
                }
            },
            error: function(jqxhr, response) {
                show_error('AJAX Error while fetching ' + name + ': ' + response.statusText);
                // this error is pretty much terminal...
            }
        });
    }
});

var Device = Backbone.Model.extend({
    // in addition to all of the attributes from the REST API, this has a
    // 'selected' attribute that is local to the client
    initialize: function(args) {
        this.set('selected', false);
    }
});

var DeviceNames = UpdateableCollection.extend({
    // only sets the 'id' attribute of the Device model to the device name
    url: '/api/device/list/',
    model: Device,
    responseAttr: 'devices',

    initialize: function() {
        UpdateableCollection.prototype.initialize.call(this);
        this.push(new this.model({id: 'any'}));
    },

    parse: function(response) {
        var self = this;
        var old_ids = self.map(function(b) { return b.get('id'); });
        var new_ids = response[self.responseAttr];
        new_ids.push('any');

        _.each(_.difference(old_ids, new_ids), function (id) {
            self.remove(self.get(id));
        });

        _.each(_.difference(new_ids, old_ids), function (id) {
            var attrs = {id: id};
            self.push(new self.model(attrs));
        });

        // this just instructs the fetch/add to not anything else:
        return [];
    },
});

var Devices = UpdateableCollection.extend({
    url: '/api/device/list/?details=true',
    model: Device,
    responseAttr: 'devices'
});

var Request = Backbone.Model.extend({
    initialize: function(args) {
        this.set('selected', false);
    }
});

var Requests = UpdateableCollection.extend({
    url: function() {
        return '/api/request/list/' + (this.includeClosed ? '?include_closed=1'
                                                          : '');
    },
    model: Request,
    responseAttr: 'requests',
    includeClosed: false
});

var PxeConfig = Backbone.Model.extend({
});

var PxeConfigs = Backbone.Collection.extend({
    url: '/api/bmm/pxe_config/list/?active_only=1',
    model: PxeConfig,
    parse: function(response) {
        return $.map(response.pxe_configs, function(name, id) { return { name: name, id: id }; });
    }
});

var LogLine = Backbone.Model.extend({
});

var Log = Backbone.Collection.extend({
    model: LogLine,
    url: null,
    parse: function(response) {
        return response.log;
    }
});

// client-only models

var SelectedPxeConfig = Backbone.Model.extend({
    // currently-selected boot image in the <select>; name can be '' when no
    // image is selected
    initialize: function (args) {
        this.set('name', '');
    }
});

var CurrentB2gBase = Backbone.Model.extend({
    // current URL in the input box
    initialize: function (args) {
        this.set('b2gbase', '');
    }
});

var CurrentForceState = Backbone.Model.extend({
    // current URL in the input box
    initialize: function (args) {
        this.set('state', '');
    }
});

var CurrentRenewDuration = Backbone.Model.extend({
    initialize: function(args) {
        this.set('duration', '');
    }
});

var CurrentRequestDuration = Backbone.Model.extend({
    initialize: function(args) {
        this.set('duration', '');
    }
});

var CurrentRequestAssignee = Backbone.Model.extend({
    initialize: function(args) {
        this.set('assignee', '');
    }
});

var SelectedRequestedDevice = Backbone.Model.extend({
    // currently-selected requested device in the <select>; name can be '' when
    // no image is selected
    initialize: function (args) {
        this.set('name', 'any');
    }
});

var SelectedRequestAction = Backbone.Model.extend({
    initialize: function (args) {
        this.set('action', '');
    }
});

var DeviceJob = Backbone.Model.extend({
    initialize: function (args) {
        this.device = args.device;
        this.set('job_type', args.job_type);
        this.set('job_args', args.job_args);
        this.set('device_name', this.device.get('name'));
    },

    job_subject: function() {
        return 'device ' + this.get('device_name');
    }
});

var RequestJob = Backbone.Model.extend({
    initialize: function (args) {
        this.request = args.request;
        this.set('job_type', args.job_type);
        this.set('job_args', args.job_args);
        this.set('request_id', this.request ? this.request.get('id') : 0);
    },

    job_subject: function() {
        return 'request ' + this.get('request_id');
    }
});

var JobQueue = Backbone.Collection.extend({
    model: null,  // override after creation
});
