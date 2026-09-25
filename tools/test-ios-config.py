"""Generated-project tests; no personal project or workout data touched."""
import pathlib, plistlib, subprocess, sys, tempfile, unittest, xml.etree.ElementTree as ET
REPO = pathlib.Path(sys.argv.pop(1) if len(sys.argv) > 1 else ".").resolve()
SCRIPT = REPO / "tools/ios-config.py"

class BounceInstall(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory(prefix="showup-ios-bounce-")
        self.addCleanup(self.tmp.cleanup)
        self.root = pathlib.Path(self.tmp.name)
        self.app = self.root / "ios/App/App"
        self.app.mkdir(parents=True)
        self.ad = self.app / "AppDelegate.swift"
        self.original = "import UIKit\nimport Capacitor\nclass AppDelegate { let keepMe = true }\n"
        self.ad.write_text(self.original)
        (self.app / "Info.plist").write_bytes(plistlib.dumps({"CFBundleIdentifier": "test.preserve"}))
        pbx = self.root / "ios/App/App.xcodeproj/project.pbxproj"
        pbx.parent.mkdir()
        pbx.write_text('TARGETED_DEVICE_FAMILY = "1,2";\nPRODUCT_BUNDLE_IDENTIFIER = test.preserve;\n')
        self.sb = self.app / "Base.lproj/Main.storyboard"
        self.sb.parent.mkdir()
        self.story('customClass="CAPBridgeViewController" customModule="Capacitor"')

    def story(self, attrs):
        self.sb.write_text('<document><scenes><scene><objects><viewController id="main" '+attrs+
                           '><view key="view"/></viewController></objects></scene></scenes></document>')

    def install(self, success=True):
        p = subprocess.run([sys.executable, str(SCRIPT), str(self.root)], capture_output=True, text=True)
        self.assertEqual(p.returncode == 0, success, p.stdout + p.stderr)
        return p

    def check(self):
        vc = ET.parse(self.sb).find(".//viewController")
        self.assertEqual(vc.get("customClass"), "ShowUpViewController")
        self.assertEqual(vc.get("customModule"), "App")
        self.assertEqual(vc.get("customModuleProvider"), "target")
        text = self.ad.read_text()
        self.assertEqual(text.count("class ShowUpViewController:"), 1)
        self.assertIn("webView?.scrollView.bounces = true", text)
        self.assertIn("webView?.scrollView.alwaysBounceVertical = true", text)
        self.assertIn("override func viewDidAppear", text)
        self.assertIn("super.capacitorDidLoad()", text)
        self.assertIn("super.viewDidAppear(animated)", text)
        self.assertIn("[ShowUp] Native scroll bounce:", text)
        self.assertIn("let keepMe = true", text)
        self.assertEqual(plistlib.loads((self.app / "Info.plist").read_bytes())["CFBundleIdentifier"], "test.preserve")

    def test_attribute_variants(self):
        for attrs in ['customClass="CAPBridgeViewController" customModule="Capacitor"',
                      'customModule="Capacitor" id2="keep"\n customClass="CAPBridgeViewController"',
                      "customClass = 'CAPBridgeViewController'",
                      'customModuleProvider="target" customClass="ShowUpViewController" customModule="Wrong"']:
            with self.subTest(attrs=attrs):
                self.story(attrs)
                self.install()
                self.check()

    def test_repeat_is_byte_identical(self):
        self.install()
        before = {p: p.read_bytes() for p in self.root.rglob("*") if p.is_file()}
        self.install()
        self.assertEqual(before, {p: p.read_bytes() for p in before})

    def test_upgrade_legacy_generated_controller(self):
        self.ad.write_text(self.original + """
// ShowUp: ShowUpViewController (tools/ios-config.py)
class ShowUpViewController: CAPBridgeViewController {
    override func capacitorDidLoad() {
        super.capacitorDidLoad()
        webView?.scrollView.bounces = true
        webView?.scrollView.alwaysBounceVertical = true
    }
}
class KeepCustomCode { let untouched = true }
""")
        self.install()
        self.check()
        self.assertIn("class KeepCustomCode { let untouched = true }", self.ad.read_text())
        self.install()
        self.check()

    def test_missing_swift_fails_loudly(self):
        self.ad.unlink()
        self.assertIn("missing", self.install(False).stderr)

    def test_missing_storyboard_fails_loudly(self):
        self.sb.unlink()
        self.assertIn("missing", self.install(False).stderr)

    def test_unknown_controller_is_not_overwritten(self):
        self.story('customClass="MyCustomController"')
        before = self.sb.read_bytes()
        self.install(False)
        self.assertEqual(self.sb.read_bytes(), before)
        self.assertEqual(self.ad.read_text(), self.original)

    def test_unowned_swift_is_not_overwritten(self):
        self.ad.write_text(self.original + "class ShowUpViewController: CAPBridgeViewController {}")
        before = self.ad.read_bytes()
        self.install(False)
        self.assertEqual(self.ad.read_bytes(), before)

if __name__ == "__main__":
    result = unittest.TextTestRunner(verbosity=2).run(unittest.defaultTestLoader.loadTestsFromTestCase(BounceInstall))
    if result.wasSuccessful():
        print("PASS native bounce: storyboard variants, upgrade, idempotency, missing files and custom-code safety")
    sys.exit(0 if result.wasSuccessful() else 1)
