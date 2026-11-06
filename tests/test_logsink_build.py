"""Stage-two packaging seam: public placeholder -> local write-only config."""
import io
import json
from pathlib import Path
import subprocess
import sys
import tempfile
import unittest
import zipfile

ROOT = Path(__file__).resolve().parents[1]
ENDPOINT = 'https://example.invalid/LIUBAI_LOG_ENDPOINT_PLACEHOLDER'
WRITE_KEY = 'LIUBAI_WRITE_KEY_PLACEHOLDER_20261105'


def archive(files):
    buf = io.BytesIO()
    with zipfile.ZipFile(buf, 'w') as z:
        for name, data in files.items():
            z.writestr(name, data)
    return buf.getvalue()


class LogsinkBuildTest(unittest.TestCase):
    def test_public_build_can_be_configured_locally_without_business_changes(self):
        cfg = json.loads((ROOT / 'entry/src/main/config.json').read_text())
        self.assertEqual(cfg['app']['bundleName'], 'liubai.nexus.by71x')
        self.assertEqual(cfg['app']['version'], {'code': 8, 'name': '0.2.6'})
        prepare = ROOT / 'scripts/prepare-logsink.py'
        configure = ROOT / 'scripts/configure-logsink-app.py'
        self.assertTrue(prepare.is_file(), 'Missing credential-free CI generator')
        self.assertTrue(configure.is_file(), 'Missing local-only config transformer')
        with tempfile.TemporaryDirectory() as tmp:
            base = Path(tmp)
            common = base / 'project/entry/src/main/js/MainAbility/common'
            common.mkdir(parents=True)
            p = subprocess.run([sys.executable, str(prepare), '--project', str(base/'project')], capture_output=True)
            self.assertEqual(p.returncode, 0, p.stderr.decode())
            stub = (common/'log-config.js').read_text()
            self.assertIn(ENDPOINT, stub)
            self.assertIn(WRITE_KEY, stub)
            self.assertIn('0.2.6', stub)
            second = subprocess.run([sys.executable, str(prepare), '--project', str(base/'project')], capture_output=True)
            self.assertNotEqual(second.returncode, 0, 'Must refuse existing runtime config')
            app_js = ('var cfg=' + json.dumps({'endpoint':ENDPOINT, 'key':WRITE_KEY, 'app':'liubai', 'ver':'0.2.6'}) + ';\nconsole.info("business");').encode()
            mapping = json.dumps({'sources':['common/log-config.js'], 'sourcesContent':[stub]}).encode()
            files = {'config.json':json.dumps(cfg).encode(), 'assets/js/MainAbility/app.js':app_js,
                     'assets/js/MainAbility/app.js.map':mapping, 'assets/js/MainAbility/pages/index/index.js':b'console.info("unchanged");',
                     'business.bin':b'original-business-resource'}
            src = base/'ci.app'; dst = base/'configured.app'
            src.write_bytes(archive({'entry-default.hap':archive(files), 'pack.info':b'unchanged'}))
            runtime = base/'runtime.json'
            runtime.write_text(json.dumps({'endpoint':'https://unit.invalid/receive','write_key':'test-write-side-0123456789','read_key':'test-read-side-9876543210'}))
            report = base/'report.json'
            p = subprocess.run([sys.executable, str(configure), str(src), str(dst), '--runtime-config',str(runtime),'--report',str(report)], capture_output=True)
            self.assertEqual(p.returncode, 0, p.stderr.decode())
            self.assertNotIn(b'test-write-side', p.stdout+p.stderr)
            with zipfile.ZipFile(dst) as z:
                self.assertEqual(z.read('pack.info'), b'unchanged')
                with zipfile.ZipFile(io.BytesIO(z.read('entry-default.hap'))) as hap:
                    after = {n:hap.read(n) for n in hap.namelist()}
            for name in files:
                if name not in ('assets/js/MainAbility/app.js','assets/js/MainAbility/app.js.map'):
                    self.assertEqual(after[name], files[name], name)
            self.assertIn(b'test-write-side-0123456789', after['assets/js/MainAbility/app.js'])
            self.assertIn(b'https://unit.invalid/receive', after['assets/js/MainAbility/app.js'])
            self.assertFalse(any(b'test-read-side' in data for data in after.values()))
            self.assertTrue(json.loads(report.read_text())['all_other_files_identical'])
            # A release bytecode must never be configured by patching only JS.
            files['assets/js/MainAbility/app.js.bc'] = b'bytecode'
            src.write_bytes(archive({'entry-default.hap':archive(files)}))
            p = subprocess.run([sys.executable, str(configure), str(src), str(base/'bad.app'),'--runtime-config',str(runtime)], capture_output=True)
            self.assertNotEqual(p.returncode, 0)
            self.assertFalse((base/'bad.app').exists())


if __name__ == '__main__':
    unittest.main()
