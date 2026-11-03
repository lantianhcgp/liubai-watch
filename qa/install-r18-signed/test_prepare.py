import importlib.util
import io
import hashlib
import json
from pathlib import Path
import tempfile
import unittest
import zipfile
import base64

HERE = Path(__file__).resolve().parent


def sha(blob):
    return hashlib.sha256(blob).hexdigest()


def app_bytes(records):
    inner = io.BytesIO()
    with zipfile.ZipFile(inner, 'w') as z:
        for name, blob in records.items():
            z.writestr(name, blob)
    outer = io.BytesIO()
    with zipfile.ZipFile(outer, 'w') as z:
        z.writestr('entry-default.hap', inner.getvalue())
        z.writestr('pack.info', b'compiler metadata preserved')
    return outer.getvalue()


class SignedPayloadPreparation(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        spec = importlib.util.spec_from_file_location('signed_prepare', HERE / 'prepare.py')
        assert spec and spec.loader
        cls.m = importlib.util.module_from_spec(spec)
        spec.loader.exec_module(cls.m)

    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.addCleanup(self.temp.cleanup)
        self.root = Path(self.temp.name)
        before = {'app': {'bundleName': 'com.hcbiu.liubai', 'version': {'code': 1, 'name': '0.1.0'}}}
        self.source = {'config.json': json.dumps(before).encode(), 'assets/test.js': b'production bytes'}
        after = dict(before, app=dict(before['app'], bundleName='liubai.nexus.by71x'))
        self.signed = dict(self.source, **{'config.json': json.dumps(after, separators=(',', ':')).encode()})
        self.app = self.root / 'original.app'
        self.app.write_bytes(app_bytes(self.source))
        self.fixture = {'schema': 1, 'compilerAppSha256': sha(self.app.read_bytes()),
                        'signedHapSha256': 'a' * 64, 'bundle': 'liubai.nexus.by71x',
                        'signedConfigBase64': base64.b64encode(self.signed['config.json']).decode(),
                        'records': {n: {'bytes': len(b), 'sha256': sha(b)} for n, b in self.signed.items()}}

    def test_workflow_runs_prepared_signed_records_not_the_unsigned_input(self):
        workflow = (HERE.parents[1] / '.github/workflows/r17-official.yml').read_text()
        self.assertIn('qa/install-r18-signed/test_prepare.py', workflow)
        self.assertIn('qa/install-r18-signed/prepare.py --compiler', workflow)
        self.assertIn('--app _signed/exact-native.app --restart', workflow)
        self.assertIn('signed-native-input-proof.json', workflow)
        self.assertIn('e326666830c385df13fdb67d591280fed79e224d3a329b67ef449c1c2e986a9c', workflow)

    def test_reconstructs_exact_signed_records_and_preserves_outer_metadata(self):
        output = self.root / 'actual-signed-payload.app'
        proof = self.m.prepare(self.app, self.fixture, output)
        self.assertTrue(proof['signedRecordsByteExact'])
        self.assertEqual(self.m.records(output.read_bytes())[1], self.signed)
        with zipfile.ZipFile(output) as z:
            self.assertEqual(z.read('pack.info'), b'compiler metadata preserved')

    def test_wrong_compiler_digest_blocks_output(self):
        self.fixture['compilerAppSha256'] = '0' * 64
        output = self.root / 'blocked.app'
        with self.assertRaises(AssertionError):
            self.m.prepare(self.app, self.fixture, output)
        self.assertFalse(output.exists())

    def test_a_changed_non_config_record_cannot_be_reconstructed(self):
        self.fixture['records']['assets/test.js']['sha256'] = '0' * 64
        output = self.root / 'blocked.app'
        with self.assertRaises(AssertionError):
            self.m.prepare(self.app, self.fixture, output)
        self.assertFalse(output.exists())

    def test_config_version_change_is_not_allowed(self):
        changed = json.loads(self.signed['config.json'])
        changed['app']['version']['code'] = 0
        self.fixture['signedConfigBase64'] = base64.b64encode(json.dumps(changed).encode()).decode()
        output = self.root / 'blocked.app'
        with self.assertRaises(AssertionError):
            self.m.prepare(self.app, self.fixture, output)
        self.assertFalse(output.exists())

    def test_malformed_hap_identifier_is_rejected(self):
        self.fixture['signedHapSha256'] = 'not-a-sha256'
        with self.assertRaises(AssertionError):
            self.m.prepare(self.app, self.fixture, self.root / 'blocked.app')


if __name__ == '__main__':
    unittest.main()
