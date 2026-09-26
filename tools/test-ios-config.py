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
        pbx.write_text('/* Debug */ buildSettings = {\n\t\t\t\tINFOPLIST_FILE = App/Info.plist;\n\t\t\t\tTARGETED_DEVICE_FAMILY = "1,2";\n'
                       '\t\t\t\tPRODUCT_BUNDLE_IDENTIFIER = test.preserve;\n\t\t\t};\n'
                       '/* Release */ buildSettings = {\n\t\t\t\tINFOPLIST_FILE = App/Info.plist;\n\t\t\t\tTARGETED_DEVICE_FAMILY = "1,2";\n\t\t\t};\n')
        self.pbx = pbx
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

    def test_self_closing_controller(self):
        # Capacitor's real scene tag is self-closing (v4.6.133)
        self.sb.write_text('<document><scenes><scene><objects><viewController id="BYZ-38-t0r" '
                           'customClass="CAPBridgeViewController" customModule="Capacitor" sceneMemberID="viewController"/>'
                           '<placeholder id="x" sceneMemberID="firstResponder"/></objects></scene></scenes></document>')
        self.install()
        self.check()
        self.assertIn('sceneMemberID="viewController" customClass="ShowUpViewController" customModule="App" customModuleProvider="target"/>',
                      self.sb.read_text())
        before = self.sb.read_bytes()
        self.install()
        self.assertEqual(self.sb.read_bytes(), before)

    def test_repairs_tag_broken_by_4_6_132(self):
        # the exact tag v4.6.120-v4.6.132 wrote on the Mac; cap sync never regenerates it
        self.sb.write_text('<document><scenes><scene><objects><viewController id="BYZ-38-t0r" sceneMemberID="viewController"/ '
                           'customClass="ShowUpViewController" customModule="App" customModuleProvider="target">'
                           '<placeholder id="x" sceneMemberID="firstResponder"/></objects></scene></scenes></document>')
        with self.assertRaises(ET.ParseError):
            ET.parse(self.sb)
        self.install()
        self.check()                                   # parses, and the class is set
        text = self.sb.read_text()
        self.assertIn('<viewController id="BYZ-38-t0r" sceneMemberID="viewController" customClass="ShowUpViewController" '
                      'customModule="App" customModuleProvider="target"/>', text)
        self.assertNotRegex(text, r'/\s+custom')

    def test_programmatic_scene_controller(self):
        scene = self.app / "SceneDelegate.swift"
        scene.write_text("import UIKit\nimport Capacitor\nclass SceneDelegate {\n    func go() {\n"
                         "        window?.rootViewController = CAPBridgeViewController( )\n        let other = CAPBridgeViewController()\n    }\n}\n")
        self.install()
        text = scene.read_text()
        self.assertIn("window?.rootViewController = ShowUpViewController()", text)
        self.assertIn("let other = CAPBridgeViewController()", text)   # only the root assignment
        before = scene.read_bytes()
        self.install()
        self.assertEqual(scene.read_bytes(), before)

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

    def health(self, ent_rel="App/App.entitlements"):
        pl = plistlib.loads((self.app / "Info.plist").read_bytes())
        self.assertIn("never reads", pl["NSHealthUpdateUsageDescription"])
        self.assertNotIn("NSHealthShareUsageDescription", pl)
        ent = plistlib.loads((self.root / "ios/App" / ent_rel).read_bytes())
        self.assertIs(ent["com.apple.developer.healthkit"], True)
        self.assertEqual(ent["com.apple.developer.healthkit.access"], [])
        pbx = self.pbx.read_text()
        self.assertEqual(pbx.count("CODE_SIGN_ENTITLEMENTS = " + ent_rel + ";"), 2)
        text = self.ad.read_text()
        self.assertEqual(text.count("import HealthKit"), 1)
        self.assertEqual(text.count("class ShowUpHealthPlugin: CAPPlugin, CAPBridgedPlugin"), 1)
        self.assertEqual(text.count("bridge?.registerPluginInstance(ShowUpHealthPlugin())"), 1)
        self.assertEqual(text.count("class ShowUpAwakePlugin: CAPPlugin, CAPBridgedPlugin"), 1)          # v4.6.136
        self.assertEqual(text.count("bridge?.registerPluginInstance(ShowUpAwakePlugin())"), 1)
        self.assertEqual(text.count("class ShowUpChromePlugin: CAPPlugin, CAPBridgedPlugin"), 1)         # v4.6.143
        self.assertEqual(text.count("class ShowUpApplePlugin: CAPPlugin, CAPBridgedPlugin"), 1)          # v4.6.145
        self.assertEqual(text.count("bridge?.registerPluginInstance(ShowUpApplePlugin())"), 1)
        self.assertEqual(text.count("import AuthenticationServices"), 1)
        self.assertEqual(text.count("bridge?.registerPluginInstance(ShowUpChromePlugin())"), 1)
        self.assertIn("underPageBackgroundColor = c", text)
        self.assertIn("UIApplication.shared.isIdleTimerDisabled = on", text)
        self.assertIn('public let jsName = "ShowUpHealth"', text)
        self.assertIn("requestAuthorization(toShare: shareTypes, read: nil)", text)
        self.assertNotRegex(text, r"read:\s*\[|HKSampleQuery|HKStatisticsQuery|execute\(")   # write-only

    def test_health_installed_write_only(self):
        self.install()
        self.health()

    def test_health_merges_existing_entitlements(self):
        pbx = self.pbx.read_text().replace("INFOPLIST_FILE = App/Info.plist;",
                                           "INFOPLIST_FILE = App/Info.plist;\n\t\t\t\tCODE_SIGN_ENTITLEMENTS = App/Custom.entitlements;")
        self.pbx.write_text(pbx)
        (self.app / "Custom.entitlements").write_bytes(plistlib.dumps({"com.apple.developer.applesignin": ["Default"]}))
        self.install()
        self.health("App/Custom.entitlements")
        ent = plistlib.loads((self.app / "Custom.entitlements").read_bytes())
        self.assertEqual(ent["com.apple.developer.applesignin"], ["Default"])
        self.assertFalse((self.app / "App.entitlements").exists())

    def test_apple_signin_follows_the_flag(self):                     # v4.6.145
        self.install()
        pl = plistlib.loads((self.app / "Info.plist").read_bytes())
        ent = plistlib.loads((self.app / "App.entitlements").read_bytes())
        self.assertIs(pl["ShowUpAppleSignIn"], False)
        self.assertNotIn("com.apple.developer.applesignin", ent)     # a personal team could not sign it
        (self.root / "ios-flags.json").write_text('{"appleSignIn": true}')
        self.install()
        pl = plistlib.loads((self.app / "Info.plist").read_bytes())
        ent = plistlib.loads((self.app / "App.entitlements").read_bytes())
        self.assertIs(pl["ShowUpAppleSignIn"], True)
        self.assertEqual(ent["com.apple.developer.applesignin"], ["Default"])
        self.assertIs(ent["com.apple.developer.healthkit"], True)
        before = (self.app / "App.entitlements").read_bytes()
        self.install()
        self.assertEqual((self.app / "App.entitlements").read_bytes(), before)

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
        print("PASS native bounce + Apple Health: storyboard variants, upgrade, idempotency, missing files, custom-code safety, write-only HealthKit, entitlement merge")
    sys.exit(0 if result.wasSuccessful() else 1)
