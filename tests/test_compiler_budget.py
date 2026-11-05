"""CI compilation mode and unchanged byte-budget regression gates."""
import contextlib
import importlib.util
import io
import json
import os
from pathlib import Path
import subprocess
import tempfile
import unittest
import zipfile

ROOT = Path(__file__).resolve().parents[1]


def archive(files):
    stream = io.BytesIO()
    with zipfile.ZipFile(stream, 'w') as z:
        for name, data in files.items():
            z.writestr(name, data)
    return stream.getvalue()


class CompilerBudgetTest(unittest.TestCase):
    def test_build_preserves_v1_release_mode_and_real_verifier(self):
        # Exercise the actual shell script; adapters only capture its tool calls.
        with tempfile.TemporaryDirectory() as tmp:
            base = Path(tmp)
            log = base / 'calls.txt'
            for tool in ('ohpm', 'hvigorw', 'python3'):
                path = base / tool
                path.write_text('#!/bin/sh\nprintf "%s %s\\n" "' + tool + '" "$*" >> "$CALL_LOG"\n')
                path.chmod(0o755)
            env = dict(os.environ, PATH=str(base) + os.pathsep + os.environ['PATH'], CALL_LOG=str(log))
            p = subprocess.run(['bash', str(ROOT / 'scripts/build.sh')], env=env, capture_output=True)
            self.assertEqual(p.returncode, 0, p.stderr.decode())
            calls = log.read_text().splitlines()
            compile_calls = [c for c in calls if c.startswith('hvigorw ')]
            self.assertEqual(len(compile_calls), 1)
            self.assertIn('-p buildMode=release', compile_calls[0])
            self.assertNotIn('buildMode=debug', compile_calls[0])
            self.assertTrue(any(c.startswith('python3 scripts/verify-app.py --sanitize ') for c in calls))

    def test_actual_verifier_retains_zero_and_48k_boundary(self):
        spec = importlib.util.spec_from_file_location('compiled_verifier', ROOT / 'scripts/verify-app.py')
        assert spec is not None and spec.loader is not None
        module = importlib.util.module_from_spec(spec)
        spec.loader.exec_module(module)
        cfg = json.loads((ROOT / 'entry/src/main/config.json').read_text())
        for size, valid in ((0, False), (49152, True), (49153, False)):
            with self.subTest(size=size):
                files = {'config.json': json.dumps(cfg).encode(), 'assets/js/MainAbility/app.js': b'var app=1;'}
                for page in module.EXPECTED:
                    files['assets/js/MainAbility/' + page + '.js'] = b'x' * (size if page == 'pages/edit/edit' else 1)
                data = archive({'entry-default.hap': archive(files)})
                capture = io.StringIO()
                with contextlib.redirect_stdout(capture):
                    if valid:
                        result = module.verify(data)
                        self.assertEqual(result[0]['pages'][2]['bytes'], size)
                    else:
                        with self.assertRaisesRegex(AssertionError, 'Empty/over-budget compiled page'):
                            module.verify(data)
                self.assertIn('"bytes": ' + str(size), capture.getvalue())


if __name__ == '__main__':
    unittest.main()
