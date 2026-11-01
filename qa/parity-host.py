#!/usr/bin/env python3
"""Independent loopback host for the unmodified approved V3 and a real .app.
No application records are invented here; @system.file goes to isolated disk.
"""
import argparse
from functools import partial
from http.server import ThreadingHTTPServer
import importlib.util
import os
from pathlib import Path
from urllib.parse import urlsplit

BASE = Path(__file__).resolve().parent
spec = importlib.util.spec_from_file_location('liubai_isolated_host', BASE / 'serve-sim.py')
host = importlib.util.module_from_spec(spec)
spec.loader.exec_module(host)
APP = None
APP_INDEX = BASE / '.parity-artifact-path'
APPROVED = Path('/storage/emulated/0/Documents/watch-notes-concept-2026-11-01/approved-v3/留白-网页效果稿-v3.html')

class Handler(host.Handler):
    def do_GET(self):
        if not self.allowed():
            return self.send_bytes(b'Forbidden', 'text/plain', 403)
        route = urlsplit(self.path).path
        if route == '/__baseline':
            return self.send_bytes(APPROVED.read_bytes(), 'text/html; charset=utf-8')
        if route == '/__artifact':
            selected = Path(APP_INDEX.read_text().strip()) if APP_INDEX.exists() else APP
            if not selected or not selected.is_file() or selected.suffix != '.app':
                return self.send_bytes(b'Actual build artifact missing', 'text/plain', 503)
            return self.send_bytes(selected.read_bytes(), 'application/octet-stream')
        return super().do_GET()

if __name__ == '__main__':
    parser = argparse.ArgumentParser()
    parser.add_argument('--port', type=int, default=8792)
    parser.add_argument('--app', type=Path, required=True)
    args = parser.parse_args()
    APP = args.app.resolve()
    assert APP.is_file() and APP.suffix == '.app', 'A real compiler .app is required'
    assert APPROVED.is_file() and host.SIM.is_dir(), 'Approved baseline/simulator unavailable'
    server = ThreadingHTTPServer(('127.0.0.1', args.port), partial(Handler, directory=str(host.SIM)))
    print('Independent V3 parity host http://127.0.0.1:' + str(args.port), flush=True)
    server.serve_forever()
