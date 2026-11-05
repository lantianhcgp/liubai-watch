"""Whole-package Install-34 byte gate; fixtures are synthetic ZIP unit inputs."""
import contextlib
import importlib.util
import io
import json
from pathlib import Path
import unittest
import zipfile

ROOT = Path(__file__).resolve().parents[1]
spec = importlib.util.spec_from_file_location('app_verifier_regexp', ROOT / 'scripts/verify-app.py')
assert spec is not None and spec.loader is not None
verifier = importlib.util.module_from_spec(spec)
spec.loader.exec_module(verifier)


def archive(files):
    stream = io.BytesIO()
    with zipfile.ZipFile(stream, 'w') as z:
        for name, data in files.items():
            z.writestr(name, data)
    return stream.getvalue()


def fixture(extra=None):
    cfg = json.loads((ROOT / 'entry/src/main/config.json').read_text())
    files = {'config.json': json.dumps(cfg).encode(), 'assets/js/MainAbility/app.js': b'var app=1;'}
    for page in verifier.EXPECTED:
        files['assets/js/MainAbility/' + page + '.js'] = b'var page=1;'
    files.update(extra or {})
    return archive(files)


class WholePackageRegexpTest(unittest.TestCase):
    def verify(self, inner):
        with contextlib.redirect_stdout(io.StringIO()):
            return verifier.verify(archive({'entry-default.hap': inner}))

    def test_every_packaged_js_location_rejects_test_calls(self):
        targets = ['assets/js/MainAbility/app.js', 'assets/js/MainAbility/common/deep/util.js',
                   'assets/js/OtherAbility/hidden.js', 'assets/js/root.js']
        targets += ['assets/js/MainAbility/' + p + '.js' for p in verifier.EXPECTED]
        for member in targets:
            with self.subTest(member=member):
                with self.assertRaises(AssertionError) as error:
                    self.verify(fixture({member: b'/x/.test(value); /y/.test(value);'}))
                self.assertIn(member, str(error.exception))
                self.assertIn('2', str(error.exception))

    def test_failure_lists_all_members_and_exact_counts(self):
        a = 'assets/js/MainAbility/pages/read/read.js'
        b = 'assets/js/MainAbility/common/deep/util.js'
        with self.assertRaises(AssertionError) as error:
            self.verify(fixture({a: b'x.test(y);', b: b'x.test(y);x.test(y);x.test(y);'}))
        self.assertIn(a + ' (1)', str(error.exception))
        self.assertIn(b + ' (3)', str(error.exception))

    def test_scan_is_byte_exact_and_allows_other_regex_and_maps(self):
        result = self.verify(fixture({'assets/js/MainAbility/common/url.js': b'var p=/^https:\\/\\//; p.exec(url);',
                                     'assets/js/MainAbility/app.js.map': b'.test(',
                                     'rawfile/tool.js': b'.test('}))
        self.assertEqual(result[0]['js_scan'], {'members': 9, 'test_call_count': 0})

    def test_every_inner_hap_is_scanned(self):
        member = 'assets/js/SecondAbility/nested/helper.js'
        with contextlib.redirect_stdout(io.StringIO()):
            with self.assertRaises(AssertionError) as error:
                verifier.verify(archive({'entry-default.hap': fixture(), 'second.hap': fixture({member: b'.test('})}))
        self.assertIn(member, str(error.exception))


if __name__ == '__main__':
    unittest.main()
