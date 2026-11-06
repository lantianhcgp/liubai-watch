"""Whole-package zero-regexp gate; synthetic ZIPs only, not SDK evidence."""
import contextlib
import importlib.util
import io
import json
from pathlib import Path
import unittest
from unittest.mock import patch
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
                   'assets/js/OtherAbility/hidden.js', 'assets/js/root.js', 'rawfile/tool.js', 'root.js']
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

    def test_all_regex_literals_are_rejected_even_when_never_called(self):
        patterns = [b'/x/', b'/\\s/g', b'/\\s+/g', b'/^\\s+|\\s+$/g',
                    b'/\\d{4}/', b'/\\S/', b'/[!-~]/', b'/[\\/]/', b'/a\\/b/g', b'/\\u0061/i']
        shapes = [lambda p: b'var unused=' + p + b';',
                  lambda p: b'function f(){return ' + p + b';}',
                  lambda p: b'if (ok) ' + p + b'.exec(value);',
                  lambda p: b'while (ok) ' + p + b'.exec(value);',
                  lambda p: b'if (ok) {} ' + p + b'.exec(value);']
        for pattern in patterns:
            for shape in shapes:
                with self.subTest(pattern=pattern, shape=shape(pattern)):
                    member = 'assets/js/OtherAbility/deep/helper.js'
                    with self.assertRaises(AssertionError) as error:
                        self.verify(fixture({member: shape(pattern)}))
                    self.assertIn(member, str(error.exception))
                    self.assertIn('regexp', str(error.exception).lower())

    def test_split_replace_match_search_and_exec_cannot_evade_literal_gate(self):
        for method in [b'split', b'replace', b'match', b'search', b'exec']:
            member = 'assets/js/MainAbility/pages/edit/edit.js'
            with self.subTest(method=method):
                with self.assertRaises(AssertionError):
                    self.verify(fixture({member: b'value.' + method + b'(/\\s/);'}))
        # Computed method name is not a bypass: the literal remains an AST node.
        with self.assertRaises(AssertionError):
            self.verify(fixture({'rawfile/tool.js': b'var r=/x/; r["te"+"st"](value);'}))

    def test_regexp_constructor_and_alias_references_are_rejected(self):
        probes = [b'var r=new RegExp("x");', b'var r=RegExp("x");',
                  b'var R=RegExp;var r=new R("x");', b'var r=new this.RegExp("x");',
                  b'var r=new this["RegExp"]("x");', b'var R=this["Reg"+"Exp"];',
                  b'var r=new R\\u0065gExp("x");']
        for code in probes:
            with self.subTest(code=code):
                with self.assertRaises(AssertionError) as error:
                    self.verify(fixture({'root.js': code}))
                self.assertIn('root.js', str(error.exception))
                self.assertIn('regexp', str(error.exception).lower())

    def test_strings_comments_urls_division_and_maps_are_not_regex_literals(self):
        code = (b'var url="https://host/path"; var escaped="https:\\/\\/host";'
                b'var example="/\\\\s+/g"; var note="RegExp";'
                b'var x=12/3/2; x/=2; var y=(8+4)/3;'
                b'if(x) { x=x/2; } var f=function(){return 4;};var z=f()/2;'
                b'var o={x:4};var k=o.x/2; // /\\s/g new RegExp("x")\n'
                b'/* var r=/[!-~]/; */\n')
        result = self.verify(fixture({'assets/js/MainAbility/common/url.js': code,
                                     'assets/js/MainAbility/app.js.map': b'.test( /x/ new RegExp("x")',
                                     'rawfile/tool.js': b'var pure=1;'}))
        scan = result[0]['js_scan']
        self.assertEqual(scan['members'], 10)
        self.assertEqual(scan['test_call_count'], 0)
        self.assertEqual(scan['regexp_literal_count'], 0)
        self.assertEqual(scan['regexp_reference_count'], 0)
        self.assertEqual(scan['parser'], 'acorn@8.19.0/es5')

    def test_syntax_errors_non_es5_and_bad_utf8_fail_closed(self):
        for code in [b'var x=/unterminated', b'var x = ;', b'let x=1;', b'var f=()=>1;',
                     b'var x=1;\xff', b'var x=`template`;']:
            with self.subTest(code=code):
                with self.assertRaises(AssertionError) as error:
                    self.verify(fixture({'root.js': code}))
                self.assertIn('root.js', str(error.exception))

    def test_parser_failure_cannot_silently_fall_back_to_text_scan(self):
        with patch('subprocess.run', side_effect=OSError('parser unavailable')):
            with self.assertRaises(AssertionError) as error:
                self.verify(fixture())
        self.assertIn('parser', str(error.exception).lower())

    def test_failure_reports_all_regex_members_and_literal_locations(self):
        a, b = 'root.js', 'rawfile/tool.js'
        with self.assertRaises(AssertionError) as error:
            self.verify(fixture({a: b'var x=/a/;\nvar y=/b/g;', b: b'var z=/[!-~]/;'}))
        message = str(error.exception)
        self.assertIn(a, message)
        self.assertIn(b, message)
        self.assertIn('1:', message)
        self.assertIn('2:', message)

    def test_outer_app_js_is_also_scanned(self):
        with contextlib.redirect_stdout(io.StringIO()):
            with self.assertRaises(AssertionError) as error:
                verifier.verify(archive({'entry-default.hap': fixture(), 'outer.js': b'var r=/x/;'}))
        self.assertIn('outer.js', str(error.exception))

    def test_every_inner_hap_is_scanned(self):
        member = 'assets/js/SecondAbility/nested/helper.js'
        with contextlib.redirect_stdout(io.StringIO()):
            with self.assertRaises(AssertionError) as error:
                verifier.verify(archive({'entry-default.hap': fixture(), 'second.hap': fixture({member: b'var r=/x/;'})}))
        self.assertIn(member, str(error.exception))

    def test_source_mapping_comment_cannot_hide_newline_injection(self):
        member = 'assets/js/MainAbility/pages/read/read.js'
        code = b'var x=1;\n//# sourceMappingURL=read.js.map\nvar hidden=/\\s/;'
        with self.assertRaises(AssertionError):
            self.verify(fixture({member: code}))


if __name__ == '__main__':
    unittest.main()
