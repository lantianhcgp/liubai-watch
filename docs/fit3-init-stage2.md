# S67 Stage 2: FIT3 initialization candidate T

This is a candidate, not a confirmed device fix. It keeps bundle
`liubai.nexus.by71x`, version `0.2.6` / code `8`, existing seven pages,
all validation and write fences. No user data is cleared.

## Changes

- The actual application selects `Store.setSerialReads(true)` before init.
  Dual catalog/index generations are read in order, with a 50 ms continuation.
  Native failure/corruption still fails closed where appropriate. A logical
  timeout never permits a second native read over a retained operation.
- Init has its own sliding 10 s owner watchdog. Each native operation renews
  its deadline. Page readiness registration/state observation additionally
  checks the wall clock, without releasing native ownership or write fences.
- Duplicate app creation shares the existing owner instead of restarting
  logging/readiness. Existing destroy and cancellation boundaries remain.
- Repetitive probes/device/focus and successful I/O details are aggregated
  before the pinned capacity-24 logger. Error records, store terminal states,
  application notification, and business `S/*` milestones remain individual.
- Measured device dimensions are forwarded from already-read business locals.
  No additional page getter is executed. `device_ready=1` only identifies
  measured geometry; standalone `ready=1` identifies an observed true field
  or a milestone following a successful business-ready assignment.
- `S/build.fit3.T` identifies the new candidate, independent of unchanged
  version fields. Historical S logs cannot satisfy T device acceptance.

## Executed gates before push

Node 343/343, Python 18/18, no skip. The original 331 tests remain byte-identical;
12 additional tests cover lost I/O/all timers, owner sharing, serialized reads,
bounded logging, getter-safe geometry and exact readiness evidence.
The original S SDK APP passed the upstream hmlwsim VM four scenarios;
that result did not reproduce or uniquely identify the native FIT3 fault.

CI, signed-byte checks and a compiled-APP host execution will be recorded in the
Documents delivery report, not inferred from source tests. The host is V8,
not JerryScript, and does not prove native memory, transport or power-loss safety.

## Acceptance

Only new T watch-origin logs containing `S/store.ready`, `L/app.notify.ready`,
standalone `ready=1` and measured nonzero `w/h`, plus the user's confirmation
that storage waiting, delayed history and blank editing all disappeared,
complete this task. No automatic installation/uninstallation or data reset.
Configured APP/HAP contains an extractable write-only key: local delivery only,
never a public release artifact. Public CI contains placeholders only.
