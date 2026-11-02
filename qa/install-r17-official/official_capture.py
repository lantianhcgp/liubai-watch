#!/usr/bin/env python3
"""Unmodified signed r16 payload on Huawei's native Lite Simulator.
No page jumps, browser VM, injected $app/$vm, timers or storage replacements.
Artifacts retain full logs, command messages, raw frames and source hashes.
"""
import argparse
import hashlib
import json
from pathlib import Path, PurePosixPath
import re
import shutil
import socket
import subprocess
import threading
import time
import zipfile

SDK_COMMIT = 'aa3a315a766f6dd4983ad8dad9eed2c948c6faba'

def sha(data):
    return hashlib.sha256(data).hexdigest()

def launch_args(bundle, name, page, prefix, port, setting):
    return ['-refresh', 'region', '-projectID', prefix, '-ts', '/tmp/' + prefix + '_trace',
            '-j', str(bundle), '-s', prefix, '-cpm', 'false', '-device', 'liteWearable',
            '-shape', 'rect', '-sd', '320', '-pjId', prefix, '-bn', name,
            '-hs', '524288', '-f', str(setting), '-ilt', 'true',
            '-or', '412', '484', '-cr', '412', '484', '-lws', str(port), '-url', page]

def verified_records(archive, provenance):
    proof = json.loads(provenance.read_text())
    assert sha(archive.read_bytes()) == proof['archiveSha256'], 'Archive digest mismatch'
    with zipfile.ZipFile(archive) as z:
        assert len(z.namelist()) == len(set(z.namelist())), 'Duplicate archive record'
        records = {n: z.read(n) for n in z.namelist()}
    assert len(records) == proof['recordCount']
    assert set(records) == set(proof['records'])
    for n, b in records.items():
        p = PurePosixPath(n)
        assert not p.is_absolute() and '..' not in p.parts, n
        assert len(b) == proof['records'][n]['bytes'] and sha(b) == proof['records'][n]['sha256'], n
    return records

def error_lines(text):
    return [line.strip() for line in text.splitlines() if re.search(
        r'ACELite\]\[ERROR|\[Console Error\]|out.of.memory|\bFATAL\b|Open font path failed|Launch.*abnormal',
        line, re.IGNORECASE)]

def native_gate(text, frames, alive):
    return bool(alive and frames and 'Get first render buffer' in text and not error_lines(text))

class CommandPipe:
    def __init__(self, prefix):
        self.path = Path('/tmp/' + prefix + '_commandPipe')
        self.stop = threading.Event()
        self.messages = []
        self.connections = []
        if self.path.exists():
            self.path.unlink()
        self.socket = socket.socket(socket.AF_UNIX, socket.SOCK_STREAM)
        self.socket.bind(str(self.path))
        self.socket.listen(2)
        self.socket.settimeout(0.2)
        self.thread = threading.Thread(target=self.receive, daemon=True)
        self.thread.start()

    def receive(self):
        while not self.stop.is_set():
            try:
                conn, _ = self.socket.accept()
            except socket.timeout:
                continue
            except OSError:
                break
            self.connections.append(conn)
            conn.settimeout(0.2)
            pending = b''
            while not self.stop.is_set():
                try:
                    b = conn.recv(65536)
                except socket.timeout:
                    continue
                except OSError:
                    break
                if not b:
                    break
                pending += b
                while b'\0' in pending:
                    msg, pending = pending.split(b'\0', 1)
                    if msg:
                        self.messages.append(msg.decode('utf-8', 'replace'))
            conn.close()

    def close(self):
        self.stop.set()
        self.socket.close()
        for c in self.connections:
            try:
                c.shutdown(socket.SHUT_RDWR)
                c.close()
            except OSError:
                pass
        self.thread.join(timeout=2)
        if self.path.exists():
            self.path.unlink()


def tcp_ready(port):
    try:
        with socket.create_connection(('127.0.0.1', port), timeout=0.15):
            return True
    except OSError:
        return False


def decode_frames(sim, raw, directory, name):
    if not raw.exists() or raw.stat().st_size < 40:
        return [], ''
    result = subprocess.run(['python3', str(sim / 'decode.py'), str(raw), str(directory / name)],
                            capture_output=True, text=True, timeout=30)
    rows = []
    from PIL import Image
    for p in sorted(directory.glob(name + '_*.*')):
        if p.suffix not in ['.jpg', '.png']:
            continue
        with Image.open(p) as im:
            im.load()
            colors = im.convert('RGB')
            extrema = colors.getextrema()
            rows.append({'path': p.name, 'size': list(im.size), 'sha256': sha(p.read_bytes()),
                         'extrema': extrema})
    return rows, result.stdout + result.stderr


def run_one(sim, out, label, app_root, sequence):
    sim = sim.resolve()
    out = out.resolve()
    app_root = app_root.resolve()
    bundle = app_root / 'assets/js/MainAbility'
    manifest = json.loads((bundle / 'manifest.json').read_text())
    config = json.loads((app_root / 'config.json').read_text())
    page = manifest['pages'][0]  # never prefer index over real first page
    name = config['app']['bundleName']
    engine = sim / 'sdk/openharmony/previewer/liteWearable/bin/Simulator'
    assert engine.is_file()
    engine.chmod(engine.stat().st_mode | 0o111)
    prefix = 'lb' + str(sequence) + '_' + str(int(time.time()))
    port = 39270 + sequence
    setting_data = json.loads((sim / 'app/ci_setting.json').read_text())
    for v in setting_data.get('setting', {}).values():
        if 'Language' in v:
            v['Language']['args']['Language'] = 'zh-CN'
    setting = out / (label + '.setting.json')
    setting.write_text(json.dumps(setting_data))
    args = launch_args(bundle, name, page, prefix, port, setting)
    cmd = CommandPipe(prefix)
    engine_log = out / (label + '.engine.log')
    websocket_log = out / (label + '.websocket.log')
    raw = out / (label + '.wsbin')
    proc = ws = None
    engine_handle = engine_log.open('wb')
    ws_handle = websocket_log.open('wb')
    started = time.monotonic()
    natural_rc = None
    alive = False
    try:
        proc = subprocess.Popen([str(engine)] + args, cwd=engine.parent,
                                stdout=engine_handle, stderr=subprocess.STDOUT)
        deadline = time.monotonic() + 9
        ready = False
        while time.monotonic() < deadline:
            if proc.poll() is not None:
                break
            if tcp_ready(port):
                ready = True
                break
            cmd.stop.wait(0.08)
        if ready:
            ws = subprocess.Popen(['node', str(sim / 'ws_client.js'), str(port), str(raw), '14000'],
                                  stdout=ws_handle, stderr=subprocess.STDOUT)
            ws.wait(timeout=18)
        elif proc.poll() is None:
            raise RuntimeError('Official engine image websocket did not become ready')
        natural_rc = proc.poll()
        alive = natural_rc is None
    except Exception as e:
        (out / (label + '.driver-error.txt')).write_text(repr(e) + '\n')
        natural_rc = proc.poll() if proc else None
        alive = False
    finally:
        if ws and ws.poll() is None:
            ws.terminate()
            try:
                ws.wait(timeout=2)
            except subprocess.TimeoutExpired:
                ws.kill()
                ws.wait(timeout=2)
        if proc and proc.poll() is None:
            proc.terminate()
            try:
                proc.wait(timeout=3)
            except subprocess.TimeoutExpired:
                proc.kill()
                proc.wait(timeout=3)
        engine_handle.close()
        ws_handle.close()
        cmd.close()
    text = engine_log.read_text(errors='replace')
    frames, decoding = decode_frames(sim, raw, out, label)
    (out / (label + '.decode.log')).write_text(decoding)
    (out / (label + '.command-messages.json')).write_text(json.dumps(cmd.messages, indent=2) + '\n')
    row = {'label': label, 'bundleName': name, 'firstPage': page, 'heapBytes': 524288,
           'window': [412, 484], 'args': args, 'engineSha256': sha(engine.read_bytes()),
           'durationSeconds': round(time.monotonic() - started, 2), 'naturalReturncode': natural_rc,
           'aliveAtCaptureEnd': alive, 'rendered': 'Get first render buffer' in text,
           'frames': frames, 'errors': error_lines(text), 'allErrorsRetained': True,
           'noInputOrStorageSimulationInjected': True,
           'log': engine_log.name, 'websocketLog': websocket_log.name,
           'commandMessageCount': len(cmd.messages),
           'cleanup': {'engineStopped': bool(proc and proc.poll() is not None),
                       'websocketStopped': ws is None or ws.poll() is not None,
                       'commandThreadStopped': not cmd.thread.is_alive(),
                       'commandPipeRemoved': not cmd.path.exists(),
                       'imagePortClosed': not tcp_ready(port)}}
    row['nativeGate'] = native_gate(text, frames, alive)
    (out / (label + '.result.json')).write_text(json.dumps(row, ensure_ascii=False, indent=2) + '\n')
    print(json.dumps(row, ensure_ascii=False), flush=True)
    return row


def main():
    p = argparse.ArgumentParser()
    p.add_argument('--sim', type=Path, required=True)
    p.add_argument('--out', type=Path, required=True)
    p.add_argument('--only', choices=['all', 'r16'], default='all')
    a = p.parse_args()
    here = Path(__file__).parent
    a.out.mkdir(parents=True, exist_ok=True)
    records = verified_records(here / 'r16-exact-payload.zip', here / 'payload-provenance.json')
    root = a.sim / 'apps/liubai-r16-official'
    assert not root.exists(), 'Do not reuse previous storage or extracted payload directories'
    for name, data in records.items():
        q = root / name
        q.parent.mkdir(parents=True, exist_ok=True)
        q.write_bytes(data)
    assert all((root / n).read_bytes() == b for n, b in records.items())
    r16 = run_one(a.sim, a.out, 'r16-cold', root, 1)
    control = run_one(a.sim, a.out, 'elcton-control', a.sim / 'apps/elcton', 2) if a.only == 'all' else None
    report = {'scope': 'Huawei native official Lite Simulator (DevEco 26 lane), not a FIT3 firmware verification.',
              'sdkCommit': SDK_COMMIT, 'payloadProvenance': json.loads((here / 'payload-provenance.json').read_text()),
              'coldStartWithoutManualPageJump': True, 'r16': r16, 'control': control,
              'r16NativeGate': r16['nativeGate'],
              'cleanupOk': all(all(r['cleanup'].values()) for r in [r16, control] if r)}
    (a.out / 'official-report.json').write_text(json.dumps(report, ensure_ascii=False, indent=2) + '\n')
    assert report['cleanupOk'], 'Owned native engine or socket was not stopped'
    if not report['r16NativeGate']:
        raise SystemExit(1)

if __name__ == '__main__':
    main()
