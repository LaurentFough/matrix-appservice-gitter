"use strict";

// Optionally try to load qrusage but don't depend on it
var qrusage;
try {
    qrusage = require("qrusage");
}
catch (e) {}

function Metrics() {
    // Only attempt to load these dependencies if metrics are enabled
    var Prometheus = require("prometheus-client");

    var client = this._client = new Prometheus();

    this._gauges = []; // just a list, order doesn't matter
    this._counters = {};

    // Register some built-in process-wide metrics

    this.addGauge("process_mem", "memory usage in bytes",
        function(gauge) {
            var usage = process.memoryUsage();

            Object.keys(usage).forEach((key) => {
                gauge.set({type: key}, usage[key]);
            });
        }
    );

    // Node versions >= 6.2.0 have cpuUsage natively
    var cpuUsage = process.cpuUsage ||
        // otherwise, see if we can load it out of qrusage
        (qrusage && qrusage.cpuUsage);

    if (cpuUsage) {
        this.addGauge("process_cpu", "CPU usage in microseconds",
            function(gauge) {
                var cpuusage = cpuUsage();

                gauge.set({type: "user"}, cpuusage.user);
                gauge.set({type: "system"}, cpuusage.system);
            }
        );
    }
    else {
        console.log("Unable to report cpuUsage in this version");
    }

    this.refresh();
};

Metrics.prototype.refresh = function() {
    this._gauges.forEach((i) => i.refresh());
};

Metrics.prototype.addGauge = function(name, help, refresh) {
    var gauge = this._client.newGauge({
        namespace: "bridge",
        name: name,
        help: help,
    });

    this._gauges.push({
        gauge: gauge,
        refresh: function() { refresh(gauge) },
    });
};

Metrics.prototype.addCounter = function(name, help) {
    this._counters[name] = this._client.newCounter({
        namespace: "bridge",
        name: name,
        help: help,
    });
};

Metrics.prototype.incCounter = function(name, labels) {
    if (!this._counters[name]) {
        console.log("TODO: missing metric " + name);
        return;
    }

    this._counters[name].increment(labels);
};

Metrics.prototype.addAppServicePath = function(bridge) {
    var metricsFunc = this._client.metricsFunc();

    bridge.addAppServicePath({
        method: "GET",
        path: "/metrics",
        handler: (req, res) => {
            this.refresh();
            return metricsFunc(req, res);
        },
    });
};

module.exports = Metrics;
