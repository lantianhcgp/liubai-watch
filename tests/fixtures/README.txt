QA source fixture provenance

hmlwsim-sensor-panel.js is an unchanged testing copy of:
https://github.com/kqakqakqa/hmlwsim/blob/2b28919fc14ea25eaed46f895817d58e481a8657/js/sensor-panel.js
SHA-256: d60208f2674677e7afbfe7cf897c5b94a3b6ba495df471b6f3942a55885622a4

The fixed upstream tree contains index.html, js and css, but no LICENSE file.
No license or ownership is implied by this fixture. It is used only to reproduce
QA device-control initialization behavior in tests and is never imported by the
watch application or included in its APP/HAP.

The test's DeviceFeatureDisplay object is an explicit VM test double; actual
browser acceptance sets the real SensorPanel controls and reads real getDeviceInfo,
without patching the app's Device API or page data.
