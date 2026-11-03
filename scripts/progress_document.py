#!/usr/bin/env python3
"""Milestone-driven progress document; cron ticks observe, never invent progress."""
import argparse
from contextlib import contextmanager
from datetime import datetime, timezone
import fcntl
import hashlib
import json
import os
from pathlib import Path
import shutil
import tempfile
import xml.etree.ElementTree as ET

TERMINAL = {'completed', 'cancelled', 'paused'}


def timestamp(now=None):
    return now or datetime.now().astimezone()


@contextmanager
def locked(state):
    state = Path(state).resolve()
    state.parent.mkdir(parents=True, exist_ok=True)
    # Android shared storage does not implement flock (ENOSYS). Keep the lock
    # in app-private TMPDIR while state and user-facing document stay Documents.
    lock_dir = Path(tempfile.gettempdir()) / 'hermes-progress-locks'
    lock_dir.mkdir(parents=True, exist_ok=True)
    name = hashlib.sha256(str(state).encode()).hexdigest() + '.lock'
    with (lock_dir / name).open('a') as handle:
        fcntl.flock(handle, fcntl.LOCK_EX)
        yield


def atomic_write(path, text):
    path = Path(path)
    path.parent.mkdir(parents=True, exist_ok=True)
    with tempfile.NamedTemporaryFile('w', encoding='utf-8', dir=path.parent,
                                     prefix='.' + path.name, delete=False) as handle:
        handle.write(text)
        handle.flush()
        os.fsync(handle.fileno())
        temp = Path(handle.name)
    try:
        os.replace(temp, path)
    finally:
        if temp.exists():
            temp.unlink()


def observe(sources):
    facts = {}
    for name, value in sources.items():
        path = Path(value)
        if not path.is_file():
            facts[name] = '证据尚未生成'
            continue
        try:
            if name == 'native':
                r = json.loads(path.read_text())
                facts[name] = {'ok': r.get('ok'), 'actions': len(r.get('first', {}).get('steps', [])),
                               'restartOk': r.get('restart', {}).get('ok'),
                               'appSha256': r.get('input', {}).get('appSha256')}
            elif name == 'regression':
                tests = list(ET.parse(path).getroot().iter('testcase'))
                facts[name] = {'tests': len(tests), 'failures': sum(
                    t.find('failure') is not None or t.find('error') is not None for t in tests)}
            else:
                r = json.loads(path.read_text())
                facts[name] = {k: r[k] for k in ['ok', 'scope', 'signedProvenanceOk', 'visualReviewed'] if k in r}
        except (ValueError, OSError, ET.ParseError):
            facts[name] = '证据暂不可解析，不能据此宣称通过'
    return facts


def render(s, now):
    age = max(0, int((now - datetime.fromisoformat(s['last_progress_at'])).total_seconds() // 60))
    stale = f'{age} 分钟未记录新进展' if age >= 15 else '实际进展在最近 15 分钟内已更新'
    lines = [f'# {s["title"]} — 进度', '', f'任务状态：{s["status"]}',
             f'当前环节：{s["phase"]}', f'最后实际进展：{s["last_progress_at"]}',
             f'最后兜底巡检：{s["last_checked_at"]}', f'巡检提示：{stale}', '',
             '更新规则：关键进展立即更新；每 15 分钟纯脚本兜底。巡检不等于任务自动推进。',
             '验收边界：编译成功≠视觉通过；模拟器通过≠真机通过。尚无证据的事项均为未验收。',
             '', '## 当前待验收/待交付']
    lines += [f'- [ ] {x}' for x in s['pending']] or ['- 当前委派范围已完成；真机边界见下方事件。']
    lines += ['', '## 已记录进展（按实际发生顺序）']
    for event in s['events']:
        lines.append(f'- {event["at"]}：{event["text"]}')
        if event['evidence']:
            lines.append(f'  证据：{event["evidence"]}')
    lines += ['', '## 兜底读取的原始证据（不会自动提升验收状态）']
    for name, fact in s.get('observations', {}).items():
        lines.append(f'- {name}：{json.dumps(fact, ensure_ascii=False)}')
    lines += ['', '## 证据来源']
    lines += [f'- {name}：{path}' for name, path in s.get('sources', {}).items()]
    return '\n'.join(lines) + '\n'


def publish(state, s, now):
    doc = Path(s['document'])
    text = render(s, now)
    if doc.exists() and doc.read_text() != text:
        backup = doc.parent / '.backup' / (doc.name + '.previous')
        backup.parent.mkdir(parents=True, exist_ok=True)
        shutil.copyfile(doc, backup)
    atomic_write(state, json.dumps(s, ensure_ascii=False, indent=2) + '\n')
    atomic_write(doc, text)


def load(state):
    s = json.loads(Path(state).read_text())
    if s.get('schema') != 1 or not all(k in s for k in ['document', 'events', 'pending', 'last_progress_at']):
        raise ValueError('Invalid progress snapshot')
    return s


def initialize(state, document, title, phase, pending, now=None, sources=None):
    now = timestamp(now)
    with locked(state):
        if Path(state).exists():
            raise FileExistsError('Progress snapshot already exists; update instead')
        s = {'schema': 1, 'title': title, 'document': str(Path(document).resolve()),
             'phase': phase, 'status': 'active', 'pending': list(pending),
             'last_progress_at': now.isoformat(), 'last_checked_at': now.isoformat(),
             'events': [{'at': now.isoformat(), 'text': '开始本轮持续验收并启用进度文档', 'evidence': ''}],
             'sources': dict(sources or {})}
        s['observations'] = observe(s['sources'])
        publish(state, s, now)


def record(state, text, evidence='', phase=None, pending=None, status=None, now=None):
    now = timestamp(now)
    if status is not None and status not in TERMINAL | {'active', 'blocked'}:
        raise ValueError('Invalid progress status')
    with locked(state):
        s = load(state)
        s['last_progress_at'] = now.isoformat()
        s['last_checked_at'] = now.isoformat()
        if phase is not None:
            s['phase'] = phase
        if pending is not None:
            s['pending'] = list(pending)
        if status is not None:
            s['status'] = status
        s['events'].append({'at': now.isoformat(), 'text': text, 'evidence': evidence})
        s['observations'] = observe(s.get('sources', {}))
        publish(state, s, now)


def refresh(state, now=None):
    now = timestamp(now)
    with locked(state):
        s = load(state)
        if s['status'] in TERMINAL:
            return False
        s['last_checked_at'] = now.isoformat()
        s['observations'] = observe(s.get('sources', {}))
        publish(state, s, now)
        return True


def main():
    p = argparse.ArgumentParser(description=__doc__)
    p.add_argument('--state', type=Path, required=True)
    sub = p.add_subparsers(dest='command', required=True)
    init = sub.add_parser('init')
    init.add_argument('--document', type=Path, required=True)
    init.add_argument('--title', required=True)
    init.add_argument('--phase', required=True)
    init.add_argument('--pending', action='append', default=[])
    init.add_argument('--source', action='append', default=[])
    update = sub.add_parser('update')
    update.add_argument('--event', required=True)
    update.add_argument('--evidence', default='')
    update.add_argument('--phase')
    update.add_argument('--pending', action='append')
    update.add_argument('--status', choices=sorted(TERMINAL | {'active', 'blocked'}))
    sub.add_parser('tick')
    a = p.parse_args()
    if a.command == 'init':
        initialize(a.state, a.document, a.title, a.phase, a.pending,
                   sources=dict(x.split('=', 1) for x in a.source))
    elif a.command == 'update':
        record(a.state, a.event, a.evidence, a.phase, a.pending, a.status)
    else:
        refresh(a.state)


if __name__ == '__main__':
    main()
