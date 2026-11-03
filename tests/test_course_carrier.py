#!/usr/bin/env python3
"""Carrier assembly uses an explicitly pinned real course artifact, never arbitrary APPs."""
import importlib.util
import io
import json
from pathlib import Path
import tempfile
import unittest
import zipfile


def archive(records):
    stream = io.BytesIO()
    with zipfile.ZipFile(stream, 'w', zipfile.ZIP_DEFLATED) as target:
        for name, data in records.items():
            target.writestr(name, data)
    return stream.getvalue()


class CourseCarrierTests(unittest.TestCase):
    def module(self):
        source = Path(__file__).parents[1] / 'scripts/course_carrier.py'
        spec = importlib.util.spec_from_file_location('course_carrier', source)
        assert spec is not None and spec.loader is not None
        module = importlib.util.module_from_spec(spec)
        spec.loader.exec_module(module)
        return module

    def fixture(self, directory):
        module = self.module()
        # Synthetic container records only exercise the packer; they are not delivery artifacts.
        config = {'app': {'bundleName': 'com.hcbiu.elcton', 'apiVersion': {'compatible': 40000010, 'target': 60101024}}, 'module': {'deviceType': ['liteWearable'], 'abilities': [{'name': '.MainAbility', 'iconId': 1}], 'mainAbility': '.MainAbility', 'distro': {'moduleName': 'entry'}}}
        product = json.loads(json.dumps(config))
        product['app']['bundleName'] = 'com.hcbiu.liubai'
        product['module']['abilities'][0]['iconId'] = 2
        compiled_records = {'config.json': json.dumps(product).encode(), 'assets/js/MainAbility/app.js': b'LB2 compiled synthetic test only', 'assets/js/MainAbility/pages/index/index.js': b'LB2 new ViewModel()'}
        base = archive({'entry-default.hap': archive({'config.json': json.dumps(config).encode(), 'assets/js/MainAbility/app.js': b'course synthetic test only'}), 'pack.info': b'course synthetic test metadata', 'pac.json': b'course synthetic test metadata'})
        compiled = archive({'entry-default.hap': archive(compiled_records), 'pack.info': b'product synthetic test metadata', 'pac.json': b'product synthetic test metadata'})
        base_path = Path(directory) / 'base.app'
        compiler_path = Path(directory) / 'compiler.app'
        base_path.write_bytes(base)
        compiler_path.write_bytes(compiled)
        setattr(module, 'BASE_SHA', module.sha(base))  # Test-only substitution; real CLI retains exact production pin.
        return module, base_path, compiler_path, compiled_records

    def test_unknown_base_bytes_are_rejected(self):
        with tempfile.TemporaryDirectory() as temporary:
            module, base, compiler, _ = self.fixture(temporary)
            base.write_bytes(base.read_bytes() + b'changed')
            with self.assertRaises(AssertionError):
                module.compose(base, compiler, Path(temporary) / 'output.app')

    def test_all_product_records_survive_byte_identically(self):
        with tempfile.TemporaryDirectory() as temporary:
            module, base, compiler, expected = self.fixture(temporary)
            output = Path(temporary) / 'output.app'
            module.compose(base, compiler, output)
            with zipfile.ZipFile(output) as outer:
                self.assertEqual(outer.read('pack.info'), b'product synthetic test metadata')
                with zipfile.ZipFile(io.BytesIO(outer.read('entry-default.hap'))) as inner:
                    self.assertEqual(set(inner.namelist()), set(expected))
                    for name, value in expected.items():
                        self.assertEqual(inner.read(name), value)
            report = json.loads(output.with_suffix('.course-provenance.json').read_text())
            self.assertTrue(report['noClanderCarrier'])
            self.assertEqual(set(report['fileRecords']), set(expected))

    def test_ability_abi_drift_is_rejected(self):
        with tempfile.TemporaryDirectory() as temporary:
            module, base, compiler, expected = self.fixture(temporary)
            config = json.loads(expected['config.json'])
            config['module']['abilities'][0]['name'] = '.WrongAbility'
            expected['config.json'] = json.dumps(config).encode()
            compiler.write_bytes(archive({'entry-default.hap': archive(expected), 'pack.info': b'product', 'pac.json': b'product'}))
            with self.assertRaises(AssertionError):
                module.compose(base, compiler, Path(temporary) / 'output.app')


if __name__ == '__main__':
    unittest.main()
