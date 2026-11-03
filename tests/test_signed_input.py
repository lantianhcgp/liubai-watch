"""Synthetic ZIP fixtures test the signed-resource gate, not a native installation."""
import base64
import hashlib
import importlib.util
import io
import json
from pathlib import Path
import tempfile
import unittest
import zipfile

ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / 'qa/signed_input.py'


def sha(blob):
    return hashlib.sha256(blob).hexdigest()


def app_bytes(records):
    inner = io.BytesIO()
    with zipfile.ZipFile(inner, 'w') as hap:
        for name, blob in records.items():
            hap.writestr(name, blob)
    outer = io.BytesIO()
    with zipfile.ZipFile(outer, 'w') as app:
        app.writestr('entry-default.hap', inner.getvalue())
        app.writestr('pack.info', b'synthetic compiler metadata')
    return outer.getvalue()


class SignedInputGate(unittest.TestCase):
    def setUp(self):
        temp = tempfile.TemporaryDirectory()
        self.addCleanup(temp.cleanup)
        self.root = Path(temp.name)
        before = {'app': {'bundleName': 'com.hcbiu.liubai', 'version': {'code': 2, 'name': '0.2.0'}}}
        self.source = {'config.json': json.dumps(before).encode(), 'assets/test.js': b'synthetic code bytes'}
        after = dict(before, app=dict(before['app'], bundleName='liubai.nexus.by71x'))
        self.signed = dict(self.source, **{'config.json': json.dumps(after, separators=(',', ':')).encode()})
        self.app = self.root / 'compiler.app'
        self.app.write_bytes(app_bytes(self.source))
        self.fixture = {
            'schema': 1, 'compilerAppSha256': sha(self.app.read_bytes()),
            'signedHapSha256': 'a' * 64, 'bundle': 'liubai.nexus.by71x',
            'signedConfigBase64': base64.b64encode(self.signed['config.json']).decode(),
            'records': {name: {'bytes': len(blob), 'sha256': sha(blob)} for name, blob in self.signed.items()}
        }

    def load(self):
        self.assertTrue(SOURCE.is_file(), 'Byte-exact signed-resource gate has not been implemented')
        spec = importlib.util.spec_from_file_location('signed_input_gate', SOURCE)
        assert spec and spec.loader
        module = importlib.util.module_from_spec(spec)
        spec.loader.exec_module(module)
        return module

    def blocked(self):
        output = self.root / 'blocked.app'
        module = self.load()
        with self.assertRaises((AssertionError, ValueError)):
            module.prepare(self.app, self.fixture, output)
        self.assertFalse(output.exists())

    def test_exact_signed_records_and_outer_metadata_are_preserved(self):
        module = self.load()
        output = self.root / 'exact.app'
        proof = module.prepare(self.app, self.fixture, output)
        self.assertTrue(proof['signedRecordsByteExact'])
        self.assertFalse(proof['signedEnvelopeInstallationTested'])
        self.assertEqual(module.records(output.read_bytes())[1], self.signed)
        with zipfile.ZipFile(output) as app:
            self.assertEqual(app.read('pack.info'), b'synthetic compiler metadata')
        self.assertEqual(proof['nativeInputAppSha256'], sha(output.read_bytes()))

    def test_wrong_compiler_hash_blocks_output(self):
        self.fixture['compilerAppSha256'] = '0' * 64
        self.blocked()

    def test_non_config_drift_blocks_output(self):
        self.fixture['records']['assets/test.js']['sha256'] = '0' * 64
        self.blocked()

    def test_changed_version_is_not_a_permitted_signing_change(self):
        changed = json.loads(self.signed['config.json'])
        changed['app']['version']['code'] = 0
        self.fixture['signedConfigBase64'] = base64.b64encode(json.dumps(changed).encode()).decode()
        self.blocked()

    def test_missing_or_added_record_blocks_output(self):
        self.fixture['records']['unexpected.js'] = {'bytes': 0, 'sha256': sha(b'')}
        self.blocked()

    def test_malformed_identifiers_are_not_normalized(self):
        self.fixture['signedHapSha256'] = 'not-a-sha'
        self.blocked()

    def test_path_traversal_is_rejected(self):
        malicious = dict(self.source, **{'../outside.js': b'synthetic'})
        self.app.write_bytes(app_bytes(malicious))
        self.fixture['compilerAppSha256'] = sha(self.app.read_bytes())
        self.blocked()

    def test_native_driver_checks_the_expected_exact_install_identity(self):
        module = self.load()
        validate = getattr(module, 'validate_native_identity', None)
        self.assertTrue(callable(validate), 'Explicit native identity validation is missing')
        assert callable(validate)
        signed = {'app': {'bundleName': 'liubai.nexus.by71x'}, 'module': {'package': 'com.hcbiu.liubai'}}
        validate(signed, 'liubai.nexus.by71x')
        with self.assertRaises((AssertionError, ValueError)):
            validate(signed, 'com.hcbiu.liubai')
        with self.assertRaises((AssertionError, ValueError)):
            validate(signed, 'liubai.nexus.by71x extra')
        signed['module']['package'] = 'different'
        with self.assertRaises((AssertionError, ValueError)):
            validate(signed, 'liubai.nexus.by71x')

    def test_workflow_takes_explicit_build_source_and_signed_fixture_then_runs_exact_input(self):
        workflow = (ROOT / '.github/workflows/cold-pinned.yml').read_text()
        self.assertIn('signed_fixture:', workflow)
        self.assertIn('source_sha:', workflow)
        self.assertIn('run-id: ${{ inputs.build_run }}', workflow)
        self.assertIn('qa/signed_input.py --compiler', workflow)
        self.assertIn('--app _signed/exact-native.app', workflow)
        self.assertIn('--expected-bundle "$BUNDLE"', workflow)
        self.assertIn('signed-native-input-proof.json', workflow)
        self.assertNotIn('run-id: 41625160288', workflow)

    def test_existing_output_is_not_overwritten(self):
        module = self.load()
        output = self.root / 'existing.app'
        output.write_bytes(b'do not overwrite')
        with self.assertRaises((AssertionError, ValueError)):
            module.prepare(self.app, self.fixture, output)
        self.assertEqual(output.read_bytes(), b'do not overwrite')


if __name__ == '__main__':
    unittest.main()
